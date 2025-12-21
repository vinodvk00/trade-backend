import { EventEmitter } from 'events';
import { OrderStatus } from '../models/types';
import logger from '../utils/logger';

export interface OrderStatusUpdate {
  orderId: string;
  status: OrderStatus;
  timestamp: Date;
  data?: {
    selectedDex?: string;
    outputAmount?: number;
    txHash?: string;
    error?: string;
  };
}

class OrderEventEmitter extends EventEmitter {
  emitStatusUpdate(update: OrderStatusUpdate) {
    const listenerCount = this.listenerCount(`order:${update.orderId}`);
    logger.info(`Emitting status update for order ${update.orderId}`, {
      orderId: update.orderId,
      status: update.status,
      listenerCount
    });

    this.emit('status-update', update);
    this.emit(`order:${update.orderId}`, update);
  }
}

export const orderEvents = new OrderEventEmitter();
