/**
 * Tier 1 — service unit test.
 *
 * Services are plain classes (`DolphServiceHandler` adds nothing but a
 * `name` field); `@Component` only wires them into the DI registry when a
 * *component* module is decorated. That means a service never needs
 * `createTestingApp`, Express, or the registry to be unit tested — just
 * `new` it with mocked collaborators. This is the fastest tier: no
 * decoration, no reflection, no HTTP.
 */
import { DolphServiceHandler } from '@dolphjs/dolph/classes';
import type { Dolph } from '@dolphjs/dolph/common';

interface OrderRepository {
    findTotalById(id: string): Promise<number>;
}

class OrderService extends DolphServiceHandler<Dolph> {
    constructor(private readonly repo: OrderRepository) {
        super('order-service' as unknown as Dolph);
    }

    async getTotal(id: string): Promise<number> {
        const total = await this.repo.findTotalById(id);
        if (total < 0) throw new Error('negative order total');
        return total;
    }
}

describe('OrderService (unit)', () => {
    it('returns the total resolved by the repository', async () => {
        const mockRepo: OrderRepository = { findTotalById: jest.fn().mockResolvedValue(42) };
        const service = new OrderService(mockRepo);

        await expect(service.getTotal('o-1')).resolves.toBe(42);
        expect(mockRepo.findTotalById).toHaveBeenCalledWith('o-1');
    });

    it('rejects a negative total from the repository', async () => {
        const mockRepo: OrderRepository = { findTotalById: jest.fn().mockResolvedValue(-5) };
        const service = new OrderService(mockRepo);

        await expect(service.getTotal('o-2')).rejects.toThrow('negative order total');
    });
});
