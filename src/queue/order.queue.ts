import { Queue } from 'bullmq';
import redisConnection from './connection';
import logger from '../utils/logger';

export interface OrderJobData {
  orderId: string;
  userWallet: string;
  inputToken: string;
  outputToken: string;
  inputAmount: number;
}

export const orderQueue = new Queue<OrderJobData>('order-execution', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600
    },
    removeOnFail: {
      count: 1000,
      age: 7 * 24 * 3600
    }
  }
});

orderQueue.on('error', error => {
  logger.error('Order queue error', { error: error.message });
});

export const addOrderToQueue = async (orderData: OrderJobData): Promise<string> => {
  const job = await orderQueue.add('execute-order', orderData, {
    jobId: orderData.orderId
  });

  logger.info('Order added to queue', {
    jobId: job.id,
    orderId: orderData.orderId
  });

  return job.id || orderData.orderId;
};

export default orderQueue;
