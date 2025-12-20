import { FastifyRequest, FastifyReply } from 'fastify';
import orderService from '../services/order.service';
import { ValidationError, AppError } from '../utils/errors';
import logger from '../utils/logger';

interface CreateOrderBody {
  userWallet: string;
  inputToken: string;
  outputToken: string;
  inputAmount: number;
}

interface ExecuteOrderParams {
  id: string;
}

interface GetOrderParams {
  id: string;
}

interface GetUserOrdersParams {
  wallet: string;
}

interface GetUserOrdersQuery {
  limit?: string;
}

export const createOrder = async (
  request: FastifyRequest<{ Body: CreateOrderBody }>,
  reply: FastifyReply
) => {
  try {
    const order = await orderService.createOrder(request.body);
    return reply.status(201).send({
      success: true,
      data: order
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: error.message
      });
    }

    logger.error('Failed to create order', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return reply.status(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const createAndExecuteOrder = async (
  request: FastifyRequest<{ Body: CreateOrderBody }>,
  reply: FastifyReply
) => {
  try {
    const order = await orderService.createAndQueueOrder(request.body);
    return reply.status(201).send({
      success: true,
      data: {
        orderId: order.id,
        status: order.status,
        message: 'Order queued for execution'
      }
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: error.message
      });
    }

    logger.error('Failed to create and queue order', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return reply.status(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const executeOrder = async (
  request: FastifyRequest<{ Params: ExecuteOrderParams }>,
  reply: FastifyReply
) => {
  try {
    const order = await orderService.executeOrder(request.params.id);
    return reply.status(200).send({
      success: true,
      data: order
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return reply.status(400).send({
        success: false,
        error: error.message
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: error.message
      });
    }

    logger.error('Failed to execute order', {
      orderId: request.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return reply.status(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getOrder = async (
  request: FastifyRequest<{ Params: GetOrderParams }>,
  reply: FastifyReply
) => {
  try {
    const order = await orderService.getOrder(request.params.id);

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: 'Order not found'
      });
    }

    return reply.status(200).send({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Failed to get order', {
      orderId: request.params.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return reply.status(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getUserOrders = async (
  request: FastifyRequest<{ Params: GetUserOrdersParams; Querystring: GetUserOrdersQuery }>,
  reply: FastifyReply
) => {
  try {
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;

    if (isNaN(limit) || limit <= 0 || limit > 100) {
      return reply.status(400).send({
        success: false,
        error: 'Limit must be a number between 1 and 100'
      });
    }

    const orders = await orderService.getUserOrders(request.params.wallet, limit);

    return reply.status(200).send({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    logger.error('Failed to get user orders', {
      wallet: request.params.wallet,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return reply.status(500).send({
      success: false,
      error: 'Internal server error'
    });
  }
};
