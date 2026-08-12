# @dolphjs/testing

Official testing utilities for DolphJS apps. A devDependency, not part of the runtime bundle — nothing here ships to production.

## Why this exists

Dolph's DI isn't a request-scoped container like Nest's `TestingModule`. Services are resolved **once**, the moment the module declaring their `@Component` is first imported, and cached forever in a process-wide `GlobalServiceRegistry`. That's a deliberate, simpler design — but it means "mocking a service" is really "winning a race": your mock has to be sitting in the registry *before* the component module is imported for the first time, or the real service has already been built and cached first.

Everything in this package exists to make that ordering a non-issue, and to keep tests fast by never paying for more framework machinery than a given test actually needs.

## The three tiers

Write specs at the cheapest tier that can prove the behavior. Most of your suite should be tier 1.

### 1. Service unit tests — `*.spec.ts`

Services are plain classes. `DolphServiceHandler` adds nothing but a `name` field — no decoration is required to construct one yourself. Don't touch `@dolphjs/testing` at all here; just `new` the service with mocked collaborators.

```ts
// order.service.spec.ts
import { OrderService } from './order.service';

it('rejects a negative total', async () => {
    const mockRepo = { findTotalById: jest.fn().mockResolvedValue(-5) };
    const service = new OrderService(mockRepo);

    await expect(service.getTotal('o-1')).rejects.toThrow();
});
```

### 2. Controller unit tests — `*.spec.ts`

**Prefer constructor injection over named-property injection on controllers.** `@Component` populates both the same way at boot, but only constructor injection lets a test hand in a mock via plain `new`:

```ts
// good — testable with `new OrderController(mockService)`
constructor(private readonly orderService: OrderService) { super(); }

// works at runtime, but a unit test can't set this without reaching
// past the type system: `(controller as any).OrderService = mock`
private OrderService: OrderService;
```

Route handlers that `return` their result (rather than writing to `res` directly) can be called like any other method — no Express involved:

```ts
// order.controller.spec.ts
import { OrderController } from './order.controller';

it('delegates to the service', () => {
    const mockService = { getTotal: jest.fn().mockReturnValue(99) };
    const controller = new OrderController(mockService as any);

    expect(controller.getTotal('o-1')).toEqual({ total: 99 });
});
```

### 3. Component e2e tests — `*.e2e-spec.ts`

For the routes/middleware/param-decoration path itself — real Express, real `@Component`/`@Route` metadata, mocked services underneath. Use `createTestingApp`:

```ts
// order.component.e2e-spec.ts
import request from 'supertest';
import { createTestingApp, TestingApp } from '@dolphjs/testing';
import { OrderService } from './order.service';

describe('OrderComponent', () => {
    let app: TestingApp;

    beforeAll(async () => {
        app = await createTestingApp({
            components: [() => import('./order.component').then((m) => m.OrderComponent)],
            overrides: [{ service: OrderService, useValue: { getTotal: jest.fn().mockReturnValue(77) } }],
        });
    });

    afterAll(() => app.close());

    it('serves through real routing', async () => {
        const res = await request(app.engine).get('/orders/o-1/total');
        expect(res.body.data).toEqual({ total: 77 });
    });
});
```

Two details matter here:

- **`components` takes a lazy loader, not a static import.** A top-of-file `import { OrderComponent } from './order.component'` runs `@Component` immediately, before `beforeAll` gets a chance to seed any mocks — the real `OrderService` would already be built and cached. `createTestingApp` seeds `overrides` into the registry first, *then* awaits your loader, so the import happens after the mocks are in place.
- **`app.engine` is a bare Express app — never bound to a port.** `createTestingApp` never calls `DolphFactory#start()`. `start()` binds a real socket and installs process-level `SIGTERM`/`uncaughtException`/`unhandledRejection` handlers meant for a long-running server; registering those once per spec file is exactly why a `.start()`-based suite needs `jest --forceExit --detectOpenHandles` to exit cleanly. `examples/` in this repo runs three full tiers, including a real e2e test, and exits on its own with neither flag — see `npm run test:examples`.

## Jest config gotcha

Jest's default `testMatch` picks up `*.spec.ts` and `*.test.ts`, but **not** `*.e2e-spec.ts` — there's no dot before "spec" for the pattern to match. If you use the `*.e2e-spec.ts` convention above, add it explicitly:

```js
// jest.config.js
module.exports = {
    preset: 'ts-jest',
    testMatch: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
};
```

At enterprise scale — hundreds of spec files — `ts-jest` type-checking every file on every run stops being free. Swap the transform for `@swc/jest` (or `esbuild-jest`) once compile time shows up in CI; the spec files themselves don't change.

## API

- **`TestingRegistry.override(ServiceClass, mock)`** — seed a mock directly, for cases `createTestingApp`'s `overrides` doesn't cover.
- **`TestingRegistry.get(ServiceClass)` / `.has(...)`** — read the current registry state.
- **`TestingRegistry.reset()`** — clear every cached service. Call between test files, never mid-file.
- **`createTestingApp({ components, overrides?, middlewares? })`** — see above. Returns `{ engine, get, close }`.
- **`createSqliteTestDataSource({ entities })`** — in-memory `better-sqlite3` TypeORM `DataSource`, entity classes passed directly (no glob strings, no `dolph_config.yaml`).
- **`createSqliteTestSequelize()`** — in-memory `sqlite3` Sequelize instance; call `Model.init({...}, { sequelize })` against it yourself.
- **`createMongoMemoryTestServer()`** — real ephemeral MongoDB via `mongodb-memory-server`; returns `{ uri, stop }`.

The three DB helpers lazily `require()` their driver, so an app that only uses Mongoose never resolves `typeorm`/`sequelize`, and vice versa — install only what you use.

## Development

```
npm install
npm run typecheck      # against a locally-built @dolphjs/dolph (file:../dolph/dist)
npm run test:examples   # runs examples/ — the three tiers, against the real framework
npm run build
```

`@dolphjs/dolph` is linked via `file:../dolph/dist`, not `file:../dolph` — the repo root has no `main`/`types` in its `package.json`, so a link to the repo root falls through to raw `.ts` source instead of the compiled build. Run `npm run build` in `../dolph` first if `dist/` is stale.
