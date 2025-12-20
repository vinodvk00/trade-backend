import orderService from '../../src/services/order.service';
import { OrderRepository } from '../../src/database/repository';
import { OrderStatus } from '../../src/models/types';
import { Queue } from 'bullmq';

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'test-uuid-123')
}));

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({
        id: 'job-123',
        data: {}
      }),
      on: jest.fn()
    })),
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn()
    }))
  };
});

jest.mock('../../src/queue/connection', () => ({
  __esModule: true,
  default: {
    on: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG')
  }
}));

jest.mock('../../src/database/repository');

describe('Order Queue System', () => {
  let mockRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = new OrderRepository() as jest.Mocked<OrderRepository>;
  });

  describe('Queue Integration', () => {
    it('should create and queue an order', async () => {
      const mockOrder = {
        id: 'test-uuid-123',
        userWallet: 'wallet-123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.create = jest.fn().mockResolvedValue(mockOrder);

      const testOrderService = new (orderService.constructor as any)(mockRepository);
      const order = await testOrderService.createAndQueueOrder({
        userWallet: 'wallet-123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10
      });

      expect(order.id).toBe('test-uuid-123');
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(mockRepository.create).toHaveBeenCalledWith({
        userWallet: 'wallet-123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10
      });
    });

    it('should validate order before queueing', async () => {
      const testOrderService = new (orderService.constructor as any)(mockRepository);

      await expect(
        testOrderService.createAndQueueOrder({
          userWallet: '',
          inputToken: 'SOL',
          outputToken: 'USDC',
          inputAmount: 10
        })
      ).rejects.toThrow('userWallet is required');
    });

    it('should not allow same input and output tokens', async () => {
      const testOrderService = new (orderService.constructor as any)(mockRepository);

      await expect(
        testOrderService.createAndQueueOrder({
          userWallet: 'wallet-123',
          inputToken: 'SOL',
          outputToken: 'SOL',
          inputAmount: 10
        })
      ).rejects.toThrow('inputToken and outputToken must be different');
    });

    it('should not allow negative amounts', async () => {
      const testOrderService = new (orderService.constructor as any)(mockRepository);

      await expect(
        testOrderService.createAndQueueOrder({
          userWallet: 'wallet-123',
          inputToken: 'SOL',
          outputToken: 'USDC',
          inputAmount: -10
        })
      ).rejects.toThrow('inputAmount must be a positive number');
    });
  });

  describe('Queue Behavior', () => {
    it('should handle queue errors gracefully', async () => {
      const testOrderService = new (orderService.constructor as any)(mockRepository);

      mockRepository.create = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(
        testOrderService.createAndQueueOrder({
          userWallet: 'wallet-123',
          inputToken: 'SOL',
          outputToken: 'USDC',
          inputAmount: 10
        })
      ).rejects.toThrow('Database error');
    });

    it('should enforce positive amounts', async () => {
      const testOrderService = new (orderService.constructor as any)(mockRepository);

      await expect(
        testOrderService.createAndQueueOrder({
          userWallet: 'wallet-123',
          inputToken: 'SOL',
          outputToken: 'USDC',
          inputAmount: 0
        })
      ).rejects.toThrow('inputAmount must be a positive number');
    });

    it('should not allow infinite amounts', async () => {
      const testOrderService = new (orderService.constructor as any)(mockRepository);

      await expect(
        testOrderService.createAndQueueOrder({
          userWallet: 'wallet-123',
          inputToken: 'SOL',
          outputToken: 'USDC',
          inputAmount: Infinity
        })
      ).rejects.toThrow('inputAmount must be a finite number');
    });
  });

  describe('Concurrency and Rate Limiting', () => {
    it('should support concurrent order processing', async () => {
      const mockOrder1 = {
        id: 'order-1',
        userWallet: 'wallet-1',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockOrder2 = {
        id: 'order-2',
        userWallet: 'wallet-2',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 5,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.create = jest
        .fn()
        .mockResolvedValueOnce(mockOrder1)
        .mockResolvedValueOnce(mockOrder2);

      const testOrderService = new (orderService.constructor as any)(mockRepository);

      const orders = await Promise.all([
        testOrderService.createAndQueueOrder({
          userWallet: 'wallet-1',
          inputToken: 'SOL',
          outputToken: 'USDC',
          inputAmount: 10
        }),
        testOrderService.createAndQueueOrder({
          userWallet: 'wallet-2',
          inputToken: 'SOL',
          outputToken: 'USDC',
          inputAmount: 5
        })
      ]);

      expect(orders).toHaveLength(2);
      expect(orders[0].id).toBe('order-1');
      expect(orders[1].id).toBe('order-2');
      expect(mockRepository.create).toHaveBeenCalledTimes(2);
    });
  });
});
