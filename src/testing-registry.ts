import { GlobalServiceRegistry } from '@dolphjs/dolph';

export type Ctor<T = any> = new (...args: any[]) => T;

/**
 * Typed facade over Dolph's process-wide GlobalServiceRegistry.
 *
 * `@Component` resolves and caches every service the moment the module that
 * declares it is first imported — not per-request, per-test-run, or lazily.
 * A mock only wins if it is already sitting in the registry before that
 * import happens; otherwise the real service has already been built and
 * cached first. `createTestingApp` (see `testing-app.ts`) sequences this
 * correctly for you — reach for `TestingRegistry` directly only when you
 * need finer control (e.g. resetting between tests in the same file).
 */
export const TestingRegistry = {
    /** Seeds a mock instance so the next `@Component` resolution picks it up instead of constructing the real service. */
    override<T>(serviceClass: Ctor<T>, mockInstance: T): void {
        GlobalServiceRegistry.set(serviceClass, mockInstance);
    },

    /** Reads whatever is currently cached for this service class — the real instance or a mock. */
    get<T>(serviceClass: Ctor<T>): T | undefined {
        return GlobalServiceRegistry.get(serviceClass);
    },

    has(serviceClass: Ctor): boolean {
        return GlobalServiceRegistry.has(serviceClass);
    },

    /**
     * Clears every cached service, process-wide. Call between test files (or
     * `describe` blocks that each build their own testing app) — never mid-file
     * while another in-flight test still expects its services to be resolved.
     */
    reset(): void {
        GlobalServiceRegistry._reset();
    },
};
