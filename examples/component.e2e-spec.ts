/**
 * Tier 3 — component e2e test.
 *
 * Exercises the real Express app built by `@Component`/`@Route` metadata —
 * actual routing, actual param decoration — with the service swapped for a
 * mock. `components` is passed as a *lazy loader* rather than a plain
 * import so `createTestingApp` can seed the mock into the registry before
 * `order.component.ts` (and therefore `@Component`) is ever evaluated; a
 * static top-of-file `import` would run the decorator immediately, before
 * this file's `beforeAll` gets a chance to override anything.
 */
import request from 'supertest';
import { createTestingApp, TestingApp } from '../src';
import { OrderService } from './fixtures/order.service';

describe('OrderComponent (e2e)', () => {
    let app: TestingApp;

    beforeAll(async () => {
        const mockOrderService = { getTotal: jest.fn().mockReturnValue(77) } as unknown as OrderService;

        app = await createTestingApp({
            components: [() => import('./fixtures/order.component').then((m) => m.OrderComponent)],
            overrides: [{ service: OrderService, useValue: mockOrderService }],
        });
    });

    afterAll(() => {
        app.close();
    });

    it('serves the route through real routing metadata, backed by the mocked service', async () => {
        const res = await request(app.engine).get('/orders/o-1/total');

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ total: 77 });
        expect(app.get(OrderService)).toEqual({ getTotal: expect.any(Function) });
    });
});
