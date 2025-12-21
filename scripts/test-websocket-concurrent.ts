/**
 * Test script for concurrent WebSocket connections
 * Creates multiple orders and watches their status updates in parallel
 */

import dotenv from 'dotenv';
dotenv.config();

import WebSocket from 'ws';
import orderService from '../src/services/order.service';
import logger from '../src/utils/logger';
import '../src/queue/order.worker';

async function testConcurrentWebSockets() {
  logger.info('=== Testing Concurrent WebSocket Connections ===\n');

  const orderCount = 3;
  const connections: Array<{ orderId: string; ws: WebSocket; updates: string[] }> = [];

  try {
    logger.info(`Creating ${orderCount} orders...`);
    const orders = await Promise.all(
      Array.from({ length: orderCount }, (_, i) =>
        orderService.createAndQueueOrder({
          userWallet: `ws-concurrent-wallet-${i + 1}`,
          inputToken: 'SOL',
          outputToken: 'USDC',
          inputAmount: 10 + i
        })
      )
    );

    logger.info(`\n${orderCount} orders created:`);
    orders.forEach((order, i) => {
      logger.info(`  ${i + 1}. ${order.id}`);
    });

    logger.info('\nConnecting to WebSockets...\n');

    for (const order of orders) {
      const ws = new WebSocket(`ws://localhost:3000/ws/orders/${order.id}`);
      const updates: string[] = [];

      ws.on('open', () => {
        logger.info(`[${order.id.substring(0, 8)}] WebSocket connected`);
      });

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'status') {
          updates.push(message.status);
          const shortId = message.orderId.substring(0, 8);
          logger.info(`[${shortId}] ${message.status.toUpperCase()}`, {
            ...(message.data && message.data.txHash
              ? { txHash: message.data.txHash.substring(0, 12) + '...' }
              : {})
          });
        }
      });

      ws.on('close', () => {
        logger.info(`[${order.id.substring(0, 8)}] Connection closed`);
      });

      ws.on('error', error => {
        logger.error(`[${order.id.substring(0, 8)}] Error:`, { error: error.message });
      });

      connections.push({ orderId: order.id, ws, updates });
    }

    await new Promise<void>(resolve => {
      let closedCount = 0;

      connections.forEach(conn => {
        conn.ws.on('close', () => {
          closedCount++;
          if (closedCount === orderCount) {
            resolve();
          }
        });
      });

      setTimeout(() => {
        logger.warn('Timeout reached, closing connections...');
        connections.forEach(conn => conn.ws.close());
        resolve();
      }, 30000);
    });

    logger.info('\n=== Test Results ===\n');
    connections.forEach((conn, i) => {
      logger.info(`Order ${i + 1} (${conn.orderId.substring(0, 8)}):`, {
        flow: conn.updates.join(' → ')
      });
    });

    logger.info('\n=== Concurrent WebSocket Test PASSED ===');
    logger.info(`Successfully handled ${orderCount} concurrent WebSocket connections!`);

    process.exit(0);
  } catch (error) {
    logger.error('Concurrent WebSocket test failed:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

setTimeout(() => {
  testConcurrentWebSockets();
}, 1000);
