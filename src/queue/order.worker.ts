import { Worker, Job } from 'bullmq';
import redisConnection from './connection';
import { OrderJobData } from './order.queue';
import dexRouter from '../services/dex-router.service';
import { OrderRepository } from '../database/repository';
import { OrderStatus } from '../models/types';
import logger from '../utils/logger';

const repository = new OrderRepository();

const processOrder = async (job: Job<OrderJobData>) => {
  const { orderId, inputToken, outputToken, inputAmount } = job.data;

  logger.info(`Processing order ${orderId} (attempt ${job.attemptsMade + 1}/3)`, {
    orderId,
    attempt: job.attemptsMade + 1,
    jobId: job.id
  });

  try {
    await repository.updateStatus(orderId, OrderStatus.ROUTING);
    logger.info(`Order ${orderId} status: ROUTING`);

    const bestQuote = await dexRouter.getBestQuote(inputToken, outputToken, inputAmount);

    logger.info(`Best quote found for order ${orderId}`, {
      selectedDex: bestQuote.selectedQuote.dex,
      outputAmount: bestQuote.selectedQuote.outputAmount,
      priceDifference: bestQuote.priceDifferencePercent
    });

    await repository.updateStatus(orderId, OrderStatus.BUILDING);
    logger.info(`Order ${orderId} status: BUILDING`);

    await repository.updateStatus(orderId, OrderStatus.SUBMITTED);
    logger.info(`Order ${orderId} status: SUBMITTED`);

    const executionResult = await dexRouter.executeSwap(bestQuote.selectedQuote);

    logger.info(`Order ${orderId} executed successfully`, {
      txHash: executionResult.txHash,
      executedAmount: executionResult.executedAmount,
      slippage: executionResult.actualSlippage
    });

    await repository.updateExecution(orderId, {
      selectedDex: bestQuote.selectedQuote.dex,
      outputAmount: executionResult.executedAmount,
      txHash: executionResult.txHash,
      status: OrderStatus.CONFIRMED
    });

    logger.info(`Order ${orderId} confirmed`, { txHash: executionResult.txHash });

    return {
      orderId,
      status: OrderStatus.CONFIRMED,
      txHash: executionResult.txHash,
      outputAmount: executionResult.executedAmount
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    logger.error(`Order ${orderId} processing failed`, {
      error: errorMessage,
      attempt: job.attemptsMade + 1
    });

    if (job.attemptsMade >= 2) {
      await repository.updateStatus(orderId, OrderStatus.FAILED, errorMessage);
      logger.error(`Order ${orderId} permanently failed after 3 attempts`, {
        error: errorMessage
      });
    }

    throw error;
  }
};

export const orderWorker = new Worker<OrderJobData>('order-execution', processOrder, {
  connection: redisConnection,
  concurrency: 10,
  limiter: {
    max: 100,
    duration: 60000
  }
});

orderWorker.on('completed', job => {
  logger.info(`Order job completed`, {
    jobId: job.id,
    orderId: job.data.orderId
  });
});

orderWorker.on('failed', (job, error) => {
  if (job) {
    logger.error(`Order job failed`, {
      jobId: job.id,
      orderId: job.data.orderId,
      attempt: job.attemptsMade,
      error: error.message
    });
  }
});

orderWorker.on('error', error => {
  logger.error('Worker error', { error: error.message });
});

export default orderWorker;
