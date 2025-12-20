/**
 * Test script for complete order flow
 * Demonstrates order creation and execution end-to-end
 */

import dotenv from 'dotenv';
dotenv.config();

import orderService from '../src/services/order.service';
import logger from '../src/utils/logger';
import { OrderStatus } from '../src/models/types';

async function testOrderFlow() {
  logger.info('=== Testing Complete Order Flow ===');

  try {
    // Create a new order
    logger.info('\n1. Creating new order...');
    const order = await orderService.createOrder({
      userWallet: 'test-wallet-123',
      inputToken: 'SOL',
      outputToken: 'USDC',
      inputAmount: 10
    });

    logger.info('Order created successfully:', {
      orderId: order.id,
      status: order.status,
      inputAmount: order.inputAmount
    });

    if (order.status !== OrderStatus.PENDING) {
      throw new Error(`Expected order status to be PENDING, got ${order.status}`);
    }

    // Execute the order
    logger.info('\n2. Executing order...');
    const executedOrder = await orderService.executeOrder(order.id);

    logger.info('Order execution completed:', {
      orderId: executedOrder.id,
      status: executedOrder.status,
      selectedDex: executedOrder.selectedDex,
      outputAmount: executedOrder.outputAmount,
      txHash: executedOrder.txHash
    });

    if (executedOrder.status !== OrderStatus.CONFIRMED) {
      throw new Error(`Expected order status to be CONFIRMED, got ${executedOrder.status}`);
    }

    if (!executedOrder.txHash) {
      throw new Error('Expected txHash to be set after execution');
    }

    // Verify we can retrieve the order
    logger.info('\n3. Retrieving order...');
    const retrievedOrder = await orderService.getOrder(order.id);

    if (!retrievedOrder) {
      throw new Error('Failed to retrieve order');
    }

    logger.info('Order retrieved successfully:', {
      orderId: retrievedOrder.id,
      status: retrievedOrder.status
    });

    // Get all orders for the user
    logger.info('\n4. Getting user orders...');
    const userOrders = await orderService.getUserOrders('test-wallet-123');

    logger.info(`Retrieved ${userOrders.length} orders for user`);

    logger.info('\n=== Order Flow Test PASSED ===');
    logger.info('\nOrder Lifecycle:');
    logger.info(`  PENDING → ROUTING → BUILDING → SUBMITTED → CONFIRMED`);
    logger.info(`\nFinal State:`);
    logger.info(`  Order ID: ${executedOrder.id}`);
    logger.info(`  Status: ${executedOrder.status}`);
    logger.info(`  DEX: ${executedOrder.selectedDex}`);
    logger.info(`  Input: ${executedOrder.inputAmount} ${executedOrder.inputToken}`);
    logger.info(`  Output: ${executedOrder.outputAmount} ${executedOrder.outputToken}`);
    logger.info(`  TX Hash: ${executedOrder.txHash}`);

    process.exit(0);
  } catch (error) {
    logger.error('Order flow test failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

testOrderFlow();
