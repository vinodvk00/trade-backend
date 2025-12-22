import { orderEvents, OrderStatusUpdate } from '../../src/queue/order.events';
import { OrderStatus } from '../../src/models/types';

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'test-uuid-123')
}));

describe('WebSocket Event System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    orderEvents.removeAllListeners();
  });

  afterAll(() => {
    orderEvents.removeAllListeners();
  });

  describe('OrderEventEmitter', () => {
    it('should emit status updates to specific order listeners', done => {
      const orderId = 'test-order-123';
      const update: OrderStatusUpdate = {
        orderId,
        status: OrderStatus.ROUTING,
        timestamp: new Date()
      };

      orderEvents.on(`order:${orderId}`, receivedUpdate => {
        expect(receivedUpdate).toEqual(update);
        expect(receivedUpdate.orderId).toBe(orderId);
        expect(receivedUpdate.status).toBe(OrderStatus.ROUTING);
        done();
      });

      orderEvents.emitStatusUpdate(update);
    });

    it('should emit status updates to global status-update listener', done => {
      const orderId = 'test-order-456';
      const update: OrderStatusUpdate = {
        orderId,
        status: OrderStatus.CONFIRMED,
        timestamp: new Date(),
        data: {
          selectedDex: 'Raydium',
          outputAmount: 100,
          txHash: '0xabc123'
        }
      };

      orderEvents.on('status-update', receivedUpdate => {
        expect(receivedUpdate).toEqual(update);
        expect(receivedUpdate.data?.selectedDex).toBe('Raydium');
        expect(receivedUpdate.data?.outputAmount).toBe(100);
        expect(receivedUpdate.data?.txHash).toBe('0xabc123');
        done();
      });

      orderEvents.emitStatusUpdate(update);
    });

    it('should support multiple listeners for the same order', () => {
      const orderId = 'test-order-789';
      const update: OrderStatusUpdate = {
        orderId,
        status: OrderStatus.BUILDING,
        timestamp: new Date()
      };

      let listener1Called = false;
      let listener2Called = false;

      orderEvents.on(`order:${orderId}`, () => {
        listener1Called = true;
      });

      orderEvents.on(`order:${orderId}`, () => {
        listener2Called = true;
      });

      orderEvents.emitStatusUpdate(update);

      expect(listener1Called).toBe(true);
      expect(listener2Called).toBe(true);
    });

    it('should only notify listeners for the specific order', () => {
      const order1 = 'order-1';
      const order2 = 'order-2';

      let order1Notified = false;
      let order2Notified = false;

      orderEvents.on(`order:${order1}`, () => {
        order1Notified = true;
      });

      orderEvents.on(`order:${order2}`, () => {
        order2Notified = true;
      });

      const update: OrderStatusUpdate = {
        orderId: order1,
        status: OrderStatus.PENDING,
        timestamp: new Date()
      };

      orderEvents.emitStatusUpdate(update);

      expect(order1Notified).toBe(true);
      expect(order2Notified).toBe(false);
    });

    it('should handle failed status with error data', done => {
      const orderId = 'failed-order';
      const errorMessage = 'DEX execution failed';

      const update: OrderStatusUpdate = {
        orderId,
        status: OrderStatus.FAILED,
        timestamp: new Date(),
        data: {
          error: errorMessage
        }
      };

      orderEvents.on(`order:${orderId}`, receivedUpdate => {
        expect(receivedUpdate.status).toBe(OrderStatus.FAILED);
        expect(receivedUpdate.data?.error).toBe(errorMessage);
        done();
      });

      orderEvents.emitStatusUpdate(update);
    });

    it('should allow removing listeners', () => {
      const orderId = 'test-order';
      let callCount = 0;

      const listener = () => {
        callCount++;
      };

      orderEvents.on(`order:${orderId}`, listener);

      orderEvents.emitStatusUpdate({
        orderId,
        status: OrderStatus.PENDING,
        timestamp: new Date()
      });

      expect(callCount).toBe(1);

      orderEvents.off(`order:${orderId}`, listener);

      orderEvents.emitStatusUpdate({
        orderId,
        status: OrderStatus.ROUTING,
        timestamp: new Date()
      });

      expect(callCount).toBe(1);
    });

    it('should emit all order status transitions', done => {
      const orderId = 'status-flow-order';
      const statuses: OrderStatus[] = [];
      const expectedStatuses = [
        OrderStatus.PENDING,
        OrderStatus.ROUTING,
        OrderStatus.BUILDING,
        OrderStatus.SUBMITTED,
        OrderStatus.CONFIRMED
      ];

      orderEvents.on(`order:${orderId}`, (update: OrderStatusUpdate) => {
        statuses.push(update.status);

        if (statuses.length === expectedStatuses.length) {
          expect(statuses).toEqual(expectedStatuses);
          done();
        }
      });

      expectedStatuses.forEach(status => {
        orderEvents.emitStatusUpdate({
          orderId,
          status,
          timestamp: new Date()
        });
      });
    });

    it('should include timestamp in all updates', done => {
      const orderId = 'timestamp-order';
      const now = new Date();

      orderEvents.on(`order:${orderId}`, (update: OrderStatusUpdate) => {
        expect(update.timestamp).toBeInstanceOf(Date);
        expect(update.timestamp.getTime()).toBeGreaterThanOrEqual(now.getTime() - 1000);
        done();
      });

      orderEvents.emitStatusUpdate({
        orderId,
        status: OrderStatus.PENDING,
        timestamp: now
      });
    });

    it('should handle updates without optional data field', done => {
      const orderId = 'no-data-order';

      orderEvents.on(`order:${orderId}`, (update: OrderStatusUpdate) => {
        expect(update.orderId).toBe(orderId);
        expect(update.status).toBe(OrderStatus.PENDING);
        expect(update.data).toBeUndefined();
        done();
      });

      orderEvents.emitStatusUpdate({
        orderId,
        status: OrderStatus.PENDING,
        timestamp: new Date()
      });
    });

    it('should handle confirmed status with complete execution data', done => {
      const orderId = 'confirmed-order';
      const executionData = {
        selectedDex: 'Raydium',
        outputAmount: 99.5,
        txHash: '0xabcdef123456'
      };

      orderEvents.on(`order:${orderId}`, (update: OrderStatusUpdate) => {
        expect(update.status).toBe(OrderStatus.CONFIRMED);
        expect(update.data).toEqual(executionData);
        expect(update.data?.selectedDex).toBe('Raydium');
        expect(update.data?.outputAmount).toBe(99.5);
        expect(update.data?.txHash).toBe('0xabcdef123456');
        done();
      });

      orderEvents.emitStatusUpdate({
        orderId,
        status: OrderStatus.CONFIRMED,
        timestamp: new Date(),
        data: executionData
      });
    });
  });
});
