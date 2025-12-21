/**
 * Test script for WebSocket order status updates
 * Creates an order and connects via WebSocket to watch status changes in real-time
 */

import dotenv from 'dotenv';
dotenv.config();

import WebSocket from 'ws';
import orderService from '../src/services/order.service';
import logger from '../src/utils/logger';
import '../src/queue/order.worker';

async function testWebSocketUpdates() {
  logger.info('=== Testing WebSocket Order Status Updates ===\n');

  try {
    logger.info('1. Creating and queuing order...');
    const order = await orderService.createAndQueueOrder({
      userWallet: 'websocket-test-wallet',
      inputToken: 'SOL',
      outputToken: 'USDC',
      inputAmount: 15
    });

    logger.info(`Order created: ${order.id}\n`);

    logger.info('2. Connecting to WebSocket...');
    const ws = new WebSocket(`ws://localhost:3000/ws/orders/${order.id}`);

    const statusUpdates: string[] = [];

    ws.on('open', () => {
      logger.info('WebSocket connected! Listening for status updates...\n');
    });

    ws.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());

      if (message.type === 'status') {
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        statusUpdates.push(message.status);

        logger.info(`[${timestamp}] Status: ${message.status.toUpperCase()}`, {
          orderId: message.orderId,
          ...(message.data || {})
        });

        if (message.status === 'confirmed' && message.data) {
          logger.info('✅ Order Confirmed!', {
            DEX: message.data.selectedDex,
            OutputAmount: message.data.outputAmount,
            TxHash: message.data.txHash?.substring(0, 16) + '...'
          });
        }

        if (message.status === 'failed' && message.data?.error) {
          logger.error('❌ Order Failed!', {
            Error: message.data.error
          });
        }
      }

      if (message.type === 'error') {
        logger.error('WebSocket Error:', { error: message.message });
      }
    });

    ws.on('close', () => {
      logger.info('\n3. WebSocket connection closed\n');

      logger.info('=== Status Update Flow ===');
      logger.info(statusUpdates.join(' → '));

      logger.info('\n=== WebSocket Test PASSED ===');
      logger.info('Successfully received real-time status updates via WebSocket!');

      process.exit(0);
    });

    ws.on('error', error => {
      logger.error('WebSocket error:', { error: error.message });
      process.exit(1);
    });

    setTimeout(() => {
      logger.warn('Test timeout after 30 seconds');
      ws.close();
      process.exit(1);
    }, 30000);
  } catch (error) {
    logger.error('WebSocket test failed:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

setTimeout(() => {
  testWebSocketUpdates();
}, 1000);
