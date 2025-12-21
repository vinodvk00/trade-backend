import { OrderService } from '../../src/services/order.service';
import { OrderRepository } from '../../src/database/repository';
import dexRouter from '../../src/services/dex-router.service';
import { ValidationError, RoutingError, ExecutionError } from '../../src/utils/errors';
import { OrderStatus } from '../../src/models/types';

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'test-uuid-123')
}));

jest.mock('../../src/database/repository');
jest.mock('../../src/services/dex-router.service');

describe('Order Service', () => {
  let orderService: OrderService;
  let mockRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepository = new OrderRepository() as jest.Mocked<OrderRepository>;
    orderService = new OrderService(mockRepository);
  });

  describe('createOrder', () => {
    it('should create a new order with valid data', async () => {
      const request = {
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10
      };

      const mockOrder = {
        id: 'order-123',
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.create.mockResolvedValue(mockOrder);

      const result = await orderService.createOrder(request);

      expect(result).toEqual(mockOrder);
      expect(mockRepository.create).toHaveBeenCalledWith({
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10
      });
    });

    it('should throw ValidationError for missing userWallet', async () => {
      const request = {
        userWallet: '',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10
      };

      await expect(orderService.createOrder(request)).rejects.toThrow(ValidationError);
      await expect(orderService.createOrder(request)).rejects.toThrow('userWallet is required');
    });

    it('should throw ValidationError for negative inputAmount', async () => {
      const request = {
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: -10
      };

      await expect(orderService.createOrder(request)).rejects.toThrow(ValidationError);
      await expect(orderService.createOrder(request)).rejects.toThrow(
        'inputAmount must be a positive number'
      );
    });

    it('should throw ValidationError for same input and output tokens', async () => {
      const request = {
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'SOL',
        inputAmount: 10
      };

      await expect(orderService.createOrder(request)).rejects.toThrow(ValidationError);
      await expect(orderService.createOrder(request)).rejects.toThrow(
        'inputToken and outputToken must be different'
      );
    });

    it('should throw ValidationError for zero inputAmount', async () => {
      const request = {
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 0
      };

      await expect(orderService.createOrder(request)).rejects.toThrow(ValidationError);
      await expect(orderService.createOrder(request)).rejects.toThrow(
        'inputAmount must be a positive number'
      );
    });

    it('should throw ValidationError for non-finite inputAmount', async () => {
      const request = {
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: Infinity
      };

      await expect(orderService.createOrder(request)).rejects.toThrow(ValidationError);
      await expect(orderService.createOrder(request)).rejects.toThrow(
        'inputAmount must be a finite number'
      );
    });
  });

  describe('executeOrder', () => {
    it('should execute order successfully through all states', async () => {
      const orderId = 'order-123';
      const mockOrder = {
        id: orderId,
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockQuote = {
        selectedQuote: {
          dex: 'Raydium',
          inputToken: 'SOL',
          outputToken: 'USDC',
          inputAmount: 10,
          outputAmount: 100,
          price: 10,
          fee: 0.003
        },
        alternativeQuote: {
          dex: 'Meteora',
          inputToken: 'SOL',
          outputToken: 'USDC',
          inputAmount: 10,
          outputAmount: 98,
          price: 9.8,
          fee: 0.003
        },
        priceDifference: 2,
        priceDifferencePercent: 2.04
      };

      const mockExecution = {
        txHash: '0xabc123',
        executedPrice: 9.95,
        executedAmount: 99.5,
        actualSlippage: 0.5
      };

      const mockConfirmedOrder = {
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
        selectedDex: 'Raydium',
        outputAmount: 99.5,
        txHash: '0xabc123'
      };

      mockRepository.findById.mockResolvedValue(mockOrder);
      mockRepository.updateStatus.mockResolvedValue(mockOrder);
      mockRepository.updateExecution.mockResolvedValue(mockConfirmedOrder);
      (dexRouter.getBestQuote as jest.Mock).mockResolvedValue(mockQuote);
      (dexRouter.executeSwap as jest.Mock).mockResolvedValue(mockExecution);

      const result = await orderService.executeOrder(orderId);

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(result.txHash).toBe('0xabc123');
      expect(result.outputAmount).toBe(99.5);
      expect(result.selectedDex).toBe('Raydium');

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(orderId, OrderStatus.ROUTING);
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(orderId, OrderStatus.BUILDING);
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(orderId, OrderStatus.SUBMITTED);
    });

    it('should throw ValidationError if order not found', async () => {
      const orderId = 'nonexistent';
      mockRepository.findById.mockResolvedValue(null);

      await expect(orderService.executeOrder(orderId)).rejects.toThrow(ValidationError);
      await expect(orderService.executeOrder(orderId)).rejects.toThrow(
        `Order ${orderId} not found`
      );
    });

    it('should throw ValidationError if order is not in pending status', async () => {
      const orderId = 'order-123';
      const mockOrder = {
        id: orderId,
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        status: OrderStatus.CONFIRMED,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findById.mockResolvedValue(mockOrder);

      await expect(orderService.executeOrder(orderId)).rejects.toThrow(ValidationError);
      await expect(orderService.executeOrder(orderId)).rejects.toThrow('is not in pending status');
    });

    it('should handle routing error and update order to failed', async () => {
      const orderId = 'order-123';
      const mockOrder = {
        id: orderId,
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findById.mockResolvedValue(mockOrder);
      mockRepository.updateStatus.mockResolvedValue(mockOrder);
      (dexRouter.getBestQuote as jest.Mock).mockRejectedValue(
        new Error('Failed to get quote from DEX')
      );

      await expect(orderService.executeOrder(orderId)).rejects.toThrow(RoutingError);

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        orderId,
        OrderStatus.FAILED,
        expect.stringContaining('Failed to get quote')
      );
    });

    it('should handle execution error and update order to failed', async () => {
      const orderId = 'order-123';
      const mockOrder = {
        id: orderId,
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockQuote = {
        selectedQuote: {
          dex: 'Raydium',
          inputToken: 'SOL',
          outputToken: 'USDC',
          inputAmount: 10,
          outputAmount: 100,
          price: 10,
          fee: 0.003
        },
        alternativeQuote: {
          dex: 'Meteora',
          inputToken: 'SOL',
          outputToken: 'USDC',
          inputAmount: 10,
          outputAmount: 98,
          price: 9.8,
          fee: 0.003
        },
        priceDifference: 2,
        priceDifferencePercent: 2.04
      };

      mockRepository.findById.mockResolvedValue(mockOrder);
      mockRepository.updateStatus.mockResolvedValue(mockOrder);
      (dexRouter.getBestQuote as jest.Mock).mockResolvedValue(mockQuote);
      (dexRouter.executeSwap as jest.Mock).mockRejectedValue(new Error('Swap execution failed'));

      await expect(orderService.executeOrder(orderId)).rejects.toThrow(ExecutionError);

      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        orderId,
        OrderStatus.FAILED,
        expect.stringContaining('Swap execution failed')
      );
    });
  });

  describe('getOrder', () => {
    it('should return order by ID', async () => {
      const orderId = 'order-123';
      const mockOrder = {
        id: orderId,
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        status: OrderStatus.CONFIRMED,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findById.mockResolvedValue(mockOrder);

      const result = await orderService.getOrder(orderId);

      expect(result).toEqual(mockOrder);
      expect(mockRepository.findById).toHaveBeenCalledWith(orderId);
    });

    it('should return null if order not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await orderService.getOrder('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getUserOrders', () => {
    it('should return orders for a user with default limit', async () => {
      const userWallet = 'wallet123';
      const mockOrders = [
        {
          id: 'order-1',
          userWallet,
          inputToken: 'SOL',
          outputToken: 'USDC',
          inputAmount: 10,
          status: OrderStatus.CONFIRMED,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'order-2',
          userWallet,
          inputToken: 'SOL',
          outputToken: 'USDT',
          inputAmount: 5,
          status: OrderStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRepository.findByUserWallet.mockResolvedValue(mockOrders);

      const result = await orderService.getUserOrders(userWallet);

      expect(result).toEqual(mockOrders);
      expect(mockRepository.findByUserWallet).toHaveBeenCalledWith(userWallet, 50);
    });

    it('should return orders with custom limit', async () => {
      const userWallet = 'wallet123';
      mockRepository.findByUserWallet.mockResolvedValue([]);

      await orderService.getUserOrders(userWallet, 10);

      expect(mockRepository.findByUserWallet).toHaveBeenCalledWith(userWallet, 10);
    });
  });
});
