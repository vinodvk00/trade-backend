import { OrderRepository } from '../database/repository';
import dexRouter from './dex-router.service';
import logger from '../utils/logger';
import { ValidationError, RoutingError, ExecutionError } from '../utils/errors';
import { Order, OrderStatus } from '../models/types';
import { addOrderToQueue } from '../queue/order.queue';
import { orderEvents } from '../queue/order.events';

export interface CreateOrderRequest {
  userWallet: string;
  inputToken: string;
  outputToken: string;
  inputAmount: number;
}

class OrderService {
  private repository: OrderRepository;

  constructor(repository?: OrderRepository) {
    this.repository = repository || new OrderRepository();
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    this.validateOrderRequest(request);

    logger.info('Creating new order', {
      userWallet: request.userWallet,
      inputToken: request.inputToken,
      outputToken: request.outputToken,
      inputAmount: request.inputAmount
    });

    const order = await this.repository.create({
      userWallet: request.userWallet,
      inputToken: request.inputToken,
      outputToken: request.outputToken,
      inputAmount: request.inputAmount
    });

    logger.info(`Order created with ID: ${order.id}`, { orderId: order.id });

    return order;
  }

  async createAndQueueOrder(request: CreateOrderRequest): Promise<Order> {
    const order = await this.createOrder(request);

    await addOrderToQueue({
      orderId: order.id,
      userWallet: order.userWallet,
      inputToken: order.inputToken,
      outputToken: order.outputToken,
      inputAmount: order.inputAmount
    });

    logger.info(`Order ${order.id} queued for execution`);

    orderEvents.emitStatusUpdate({
      orderId: order.id,
      status: OrderStatus.PENDING,
      timestamp: new Date()
    });

    return order;
  }

  async executeOrder(orderId: string): Promise<Order> {
    logger.info(`Starting order execution for ${orderId}`);

    const order = await this.repository.findById(orderId);
    if (!order) {
      throw new ValidationError(`Order ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new ValidationError(
        `Order ${orderId} is not in pending status (current: ${order.status})`
      );
    }

    try {
      await this.repository.updateStatus(orderId, OrderStatus.ROUTING);
      logger.info(`Order ${orderId} status: ROUTING`);

      const bestQuote = await dexRouter.getBestQuote(
        order.inputToken,
        order.outputToken,
        order.inputAmount
      );

      logger.info(`Best quote found for order ${orderId}`, {
        selectedDex: bestQuote.selectedQuote.dex,
        outputAmount: bestQuote.selectedQuote.outputAmount,
        priceDifference: bestQuote.priceDifferencePercent
      });

      await this.repository.updateStatus(orderId, OrderStatus.BUILDING);
      logger.info(`Order ${orderId} status: BUILDING`);

      await this.repository.updateStatus(orderId, OrderStatus.SUBMITTED);
      logger.info(`Order ${orderId} status: SUBMITTED`);

      const executionResult = await dexRouter.executeSwap(bestQuote.selectedQuote);

      logger.info(`Order ${orderId} executed successfully`, {
        txHash: executionResult.txHash,
        executedAmount: executionResult.executedAmount,
        slippage: executionResult.actualSlippage
      });

      const updatedOrder = await this.repository.updateExecution(orderId, {
        selectedDex: bestQuote.selectedQuote.dex,
        outputAmount: executionResult.executedAmount,
        txHash: executionResult.txHash,
        status: OrderStatus.CONFIRMED
      });

      if (!updatedOrder) {
        throw new ExecutionError(`Failed to update order ${orderId} after execution`);
      }

      logger.info(`Order ${orderId} confirmed`, { txHash: executionResult.txHash });

      return updatedOrder;
    } catch (error) {
      logger.error(`Order ${orderId} execution failed`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      if (error instanceof ValidationError) {
        throw error;
      }

      if (errorMessage.includes('quote') || errorMessage.includes('routing')) {
        await this.repository.updateStatus(orderId, OrderStatus.FAILED, errorMessage);
        throw new RoutingError(`Failed to route order ${orderId}: ${errorMessage}`);
      }

      await this.repository.updateStatus(orderId, OrderStatus.FAILED, errorMessage);
      throw new ExecutionError(`Failed to execute order ${orderId}: ${errorMessage}`);
    }
  }

  async getOrder(orderId: string): Promise<Order | null> {
    return await this.repository.findById(orderId);
  }

  async getUserOrders(userWallet: string, limit = 50): Promise<Order[]> {
    return await this.repository.findByUserWallet(userWallet, limit);
  }

  private validateOrderRequest(request: CreateOrderRequest): void {
    if (!request.userWallet || typeof request.userWallet !== 'string') {
      throw new ValidationError('userWallet is required and must be a string');
    }

    if (!request.inputToken || typeof request.inputToken !== 'string') {
      throw new ValidationError('inputToken is required and must be a string');
    }

    if (!request.outputToken || typeof request.outputToken !== 'string') {
      throw new ValidationError('outputToken is required and must be a string');
    }

    if (request.inputToken === request.outputToken) {
      throw new ValidationError('inputToken and outputToken must be different');
    }

    if (typeof request.inputAmount !== 'number' || request.inputAmount <= 0) {
      throw new ValidationError('inputAmount must be a positive number');
    }

    if (!Number.isFinite(request.inputAmount)) {
      throw new ValidationError('inputAmount must be a finite number');
    }
  }
}

export { OrderService };
export default new OrderService();
