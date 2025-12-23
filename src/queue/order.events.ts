import { EventEmitter } from 'events';
import { OrderStatus } from '../models/types';

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
    this.emit('status-update', update);
    this.emit(`order:${update.orderId}`, update);
  }
}

export const orderEvents = new OrderEventEmitter();
