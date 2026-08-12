import 'reflect-metadata';
import { createServer, Server } from 'http';
import { DolphFactory, GlobalServiceRegistry } from '@dolphjs/dolph';
import type { RequestHandler } from 'express';
import type { Ctor } from './testing-registry';

/**
 * Either the component class itself (when no override is needed — the module
 * is presumably already imported at the top of the spec file) or a lazy
 * loader (`() => import('../src/components/user/user.component')`) whose
 * import is deferred until after mocks are seeded, so `@Component` resolves
 * against the mocks instead of building the real services first.
 */
export type ComponentRef = Ctor | (() => Promise<Ctor | { default: Ctor }>);

export interface ServiceOverride<T = any> {
    service: Ctor<T>;
    useValue: T;
}

export interface TestingAppOptions {
    components: ComponentRef[];
    /** Mocks seeded into the registry before `components` are resolved. */
    overrides?: ServiceOverride[];
    /** Applied before route registration — same ordering as `DolphFactory`'s constructor. */
    middlewares?: RequestHandler[];
}

export interface TestingApp {
    /** A real, already-listening ephemeral server — hand it straight to supertest. */
    engine: Server;
    /** Reads a service instance (real or mocked) straight off the registry, for direct assertions. */
    get<T>(serviceClass: Ctor<T>): T | undefined;
    /** Closes the ephemeral server and clears the process-wide registry. Call in `afterAll`. */
    close(): Promise<void>;
}

const isLoader = (ref: ComponentRef): ref is () => Promise<Ctor | { default: Ctor }> =>
    typeof ref === 'function' && ref.prototype === undefined;

/**
 * Builds an isolated Dolph app for tests, without ever calling `DolphFactory#start()`.
 *
 * `start()` installs process-level `SIGTERM`/`uncaughtException`/`unhandledRejection`
 * handlers meant for a long-running server — registering those once per spec
 * file leaks across every other file that runs in the same Jest worker,
 * which is exactly why the framework's own suite used to need
 * `--forceExit --detectOpenHandles`.
 *
 * That said, `engine` is a real, listening server, not a bare Express app —
 * supertest binds a brand new ephemeral server on every single request when
 * handed a plain app instead of one already listening, which gets expensive
 * fast across a spec with more than a handful of requests. Binding one
 * ephemeral port here, reused for every request and closed in `close()`,
 * gets the same effect `start()` gives a real app without its process-level
 * side effects.
 */
export async function createTestingApp(options: TestingAppOptions): Promise<TestingApp> {
    const { components, overrides = [], middlewares } = options;

    // 1. Seed mocks first — see the module-level doc comment on why ordering matters.
    for (const { service, useValue } of overrides) {
        GlobalServiceRegistry.set(service, useValue);
    }

    // 2. Resolve components. Importing a loader here — for the first time in
    //    this module registry — is what triggers `@Component`, by which point
    //    the mocks above are already in place.
    const resolved: Ctor[] = [];
    for (const ref of components) {
        if (isLoader(ref)) {
            const mod = await ref();
            resolved.push('default' in mod ? mod.default : (mod as Ctor));
        } else {
            resolved.push(ref);
        }
    }

    const factory = new DolphFactory(resolved as any, middlewares);
    const server = createServer(factory.engine()).listen(0);

    return {
        engine: server,
        get: (serviceClass) => GlobalServiceRegistry.get(serviceClass),
        close: () =>
            new Promise<void>((resolve) => {
                GlobalServiceRegistry._reset();
                server.close(() => resolve());
            }),
    };
}
