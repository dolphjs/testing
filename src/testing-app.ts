import 'reflect-metadata';
import { DolphFactory, GlobalServiceRegistry } from '@dolphjs/dolph';
import type { Express, RequestHandler } from 'express';
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
    /** Bare Express app — hand it straight to supertest. No port is bound, no server is started. */
    engine: Express;
    /** Reads a service instance (real or mocked) straight off the registry, for direct assertions. */
    get<T>(serviceClass: Ctor<T>): T | undefined;
    /** Clears the process-wide registry. Call in `afterAll`/`afterEach` for isolation from the next test. */
    close(): void;
}

const isLoader = (ref: ComponentRef): ref is () => Promise<Ctor | { default: Ctor }> =>
    typeof ref === 'function' && ref.prototype === undefined;

/**
 * Builds an isolated Dolph app for tests, without ever calling `DolphFactory#start()`.
 *
 * `start()` binds a real OS port and installs process-level `SIGTERM` /
 * `uncaughtException` / `unhandledRejection` handlers meant for a long-running
 * server — registering those once per spec file leaks across every other file
 * that runs in the same Jest worker, which is exactly why the framework's own
 * suite has to run with `--forceExit --detectOpenHandles`. `engine()` returns
 * the plain Express app; supertest drives it directly with no listener to leak.
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

    return {
        engine: factory.engine(),
        get: (serviceClass) => GlobalServiceRegistry.get(serviceClass),
        close: () => GlobalServiceRegistry._reset(),
    };
}
