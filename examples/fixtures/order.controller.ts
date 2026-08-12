import { DolphControllerHandler } from '@dolphjs/dolph/classes';
import { DParam, Get, Route } from '@dolphjs/dolph/decorators';
import type { Dolph } from '@dolphjs/dolph/common';
import { OrderService } from './order.service';

@Route('/orders')
export class OrderController extends DolphControllerHandler<Dolph> {
    constructor(private readonly orderService: OrderService) {
        super();
    }

    @Get('/:id/total')
    getTotal(@DParam() params: { id: string }) {
        return { total: this.orderService.getTotal(params.id) };
    }
}
