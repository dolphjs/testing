/**
 * Tier 2 — controller unit test.
 *
 * Prefer constructor injection over named-property injection on controllers
 * (`constructor(private orderService: OrderService)` rather than a bare
 * `private OrderService: OrderService` field). `@Component` populates both
 * the same way at boot, but only constructor injection lets a unit test
 * hand in a mock directly via `new` — a property-injected field stays
 * `undefined` until `@Component` runs, so testing it means reaching past
 * the type system to poke the property by hand. Route handlers that
 * `return` their result (rather than writing to `res` themselves) can be
 * called directly too, so this test never touches Express.
 */
import { DolphControllerHandler } from '@dolphjs/dolph/classes';
import { Get, Route } from '@dolphjs/dolph/decorators';
import type { Dolph } from '@dolphjs/dolph/common';

class OrderService {
    getTotal(_id: string): number {
        return 0; // replaced by the mock below in the test
    }
}

@Route('/orders')
class OrderController extends DolphControllerHandler<Dolph> {
    constructor(private readonly orderService: OrderService) {
        super();
    }

    @Get('/:id/total')
    getTotal(id: string) {
        return { total: this.orderService.getTotal(id) };
    }
}

describe('OrderController (unit)', () => {
    it('delegates to the injected service and returns its result', () => {
        const mockService: OrderService = { getTotal: jest.fn().mockReturnValue(99) } as unknown as OrderService;
        const controller = new OrderController(mockService);

        expect(controller.getTotal('o-1')).toEqual({ total: 99 });
        expect(mockService.getTotal).toHaveBeenCalledWith('o-1');
    });
});
