import { DolphServiceHandler } from '@dolphjs/dolph/classes';
import type { Dolph } from '@dolphjs/dolph/common';

export class OrderService extends DolphServiceHandler<Dolph> {
    constructor() {
        super('order-service' as unknown as Dolph);
    }

    getTotal(_id: string): number {
        return 0;
    }
}
