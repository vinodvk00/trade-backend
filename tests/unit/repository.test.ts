import { OrderRepository } from '../../src/database/repository';
import { OrderStatus } from '../../src/models/types';
import * as connection from '../../src/database/connection';

jest.mock('../../src/database/connection');
jest.mock('uuid', () => ({
  v7: jest.fn(() => 'test-uuid-123')
}));

describe('Order Repository', () => {
  let repository: OrderRepository;

  beforeEach(() => {
    repository = new OrderRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new order with pending status', async () => {
      const mockOrder = {
        id: 'test-id-123',
        user_wallet: 'wallet123',
        input_token: 'SOL',
        output_token: 'USDC',
        input_amount: '10',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      };

      (connection.query as jest.Mock).mockResolvedValue({
        rows: [mockOrder]
      });

      const result = await repository.create({
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10
      });

      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.userWallet).toBe('wallet123');
      expect(result.inputToken).toBe('SOL');
      expect(result.outputToken).toBe('USDC');
      expect(result.inputAmount).toBe(10);
    });

    it('should generate UUID for new order', async () => {
      const mockOrder = {
        id: 'test-uuid-123',
        user_wallet: 'wallet123',
        input_token: 'SOL',
        output_token: 'USDC',
        input_amount: '10',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      };

      (connection.query as jest.Mock).mockResolvedValue({
        rows: [mockOrder]
      });

      const result = await repository.create({
        userWallet: 'wallet123',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10
      });

      expect(result.id).toBe('test-uuid-123');
      expect(typeof result.id).toBe('string');
    });
  });

  describe('findById', () => {
    it('should return order when found', async () => {
      const mockOrder = {
        id: 'order-123',
        user_wallet: 'wallet123',
        input_token: 'SOL',
        output_token: 'USDC',
        input_amount: '10',
        status: 'confirmed',
        tx_hash: 'abc123',
        created_at: new Date(),
        updated_at: new Date()
      };

      (connection.query as jest.Mock).mockResolvedValue({
        rows: [mockOrder]
      });

      const result = await repository.findById('order-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('order-123');
      expect(result?.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should return null when order not found', async () => {
      (connection.query as jest.Mock).mockResolvedValue({
        rows: []
      });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      const mockOrder = {
        id: 'order-123',
        user_wallet: 'wallet123',
        input_token: 'SOL',
        output_token: 'USDC',
        input_amount: '10',
        status: 'routing',
        created_at: new Date(),
        updated_at: new Date()
      };

      (connection.query as jest.Mock).mockResolvedValue({
        rows: [mockOrder]
      });

      const result = await repository.updateStatus('order-123', OrderStatus.ROUTING);

      expect(result?.status).toBe(OrderStatus.ROUTING);
      expect(connection.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders'),
        expect.arrayContaining([OrderStatus.ROUTING, null, 'order-123'])
      );
    });

    it('should update order status with error message', async () => {
      const mockOrder = {
        id: 'order-123',
        user_wallet: 'wallet123',
        input_token: 'SOL',
        output_token: 'USDC',
        input_amount: '10',
        status: 'failed',
        error: 'Swap failed',
        created_at: new Date(),
        updated_at: new Date()
      };

      (connection.query as jest.Mock).mockResolvedValue({
        rows: [mockOrder]
      });

      const result = await repository.updateStatus('order-123', OrderStatus.FAILED, 'Swap failed');

      expect(result?.status).toBe(OrderStatus.FAILED);
      expect(result?.error).toBe('Swap failed');
    });
  });

  describe('updateExecution', () => {
    it('should update order with execution details', async () => {
      const mockOrder = {
        id: 'order-123',
        user_wallet: 'wallet123',
        input_token: 'SOL',
        output_token: 'USDC',
        input_amount: '10',
        output_amount: '100',
        selected_dex: 'Raydium',
        tx_hash: 'abc123',
        status: 'confirmed',
        created_at: new Date(),
        updated_at: new Date()
      };

      (connection.query as jest.Mock).mockResolvedValue({
        rows: [mockOrder]
      });

      const result = await repository.updateExecution('order-123', {
        selectedDex: 'Raydium',
        outputAmount: 100,
        txHash: 'abc123',
        status: OrderStatus.CONFIRMED
      });

      expect(result?.selectedDex).toBe('Raydium');
      expect(result?.outputAmount).toBe(100);
      expect(result?.txHash).toBe('abc123');
      expect(result?.status).toBe(OrderStatus.CONFIRMED);
    });
  });
});
