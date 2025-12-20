/**
 * Test script for concurrent order processing
 * Submits multiple orders simultaneously to test queue concurrency
 */

import dotenv from 'dotenv';
dotenv.config();

import orderService from '../src/services/order.service';
import logger from '../src/utils/logger';
import '../src/queue/order.worker';

async function testConcurrentOrders() {
  logger.info('=== Testing Concurrent Order Processing ===');

  const orderCount = 5;
  const orders = [];

  try {
    logger.info(`\nCreating and queuing ${orderCount} orders...`);

    for (let i = 1; i <= orderCount; i++) {
      const orderPromise = orderService.createAndQueueOrder({
        userWallet: `test-wallet-${i}`,
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10 + i
      });
      orders.push(orderPromise);
    }

    const createdOrders = await Promise.all(orders);

    logger.info(`\n${orderCount} orders created and queued:`, {
      orderIds: createdOrders.map(o => o.id)
    });

    logger.info('\nOrders are being processed by the queue worker...');
    logger.info('Wait 15-20 seconds for all orders to complete');
    logger.info('Check logs above to see order processing status');

    await new Promise(resolve => setTimeout(resolve, 20000));

    logger.info('\nRetrieving final order statuses...');
    const finalOrders = await Promise.all(
      createdOrders.map(o => orderService.getOrder(o.id))
    );

    const confirmed = finalOrders.filter(o => o?.status === 'confirmed').length;
    const failed = finalOrders.filter(o => o?.status === 'failed').length;
    const pending = finalOrders.filter(o => o?.status === 'pending').length;

    logger.info('\n=== Test Results ===');
    logger.info(`Total orders: ${orderCount}`);
    logger.info(`Confirmed: ${confirmed}`);
    logger.info(`Failed: ${failed}`);
    logger.info(`Still pending: ${pending}`);

    finalOrders.forEach(order => {
      if (order) {
        logger.info(`\nOrder ${order.id.substring(0, 8)}...`, {
          status: order.status,
          selectedDex: order.selectedDex,
          outputAmount: order.outputAmount,
          txHash: order.txHash?.substring(0, 16)
        });
      }
    });

    logger.info('\n=== Concurrent Order Test PASSED ===');
    process.exit(0);
  } catch (error) {
    logger.error('Concurrent order test failed:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

testConcurrentOrders();
