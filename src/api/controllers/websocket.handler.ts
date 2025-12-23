import { FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
import { orderEvents, OrderStatusUpdate } from '../../queue/order.events';
import orderService from '../../services/order.service';
import logger from '../../utils/logger';
import { OrderStatus } from '../../models/types';

interface OrderStatusParams {
  orderId: string;
}

export const handleOrderStatusWebSocket = async (
  socket: WebSocket,
  request: FastifyRequest<{ Params: OrderStatusParams }>
) => {
  const { orderId } = request.params;

  try {
    const order = await orderService.getOrder(orderId);

    if (!order) {
      socket.send(
        JSON.stringify({
          type: 'error',
          message: `Order ${orderId} not found`
        })
      );
      socket.close();
      return;
    }

    socket.send(
      JSON.stringify({
        type: 'status',
        orderId: order.id,
        status: order.status,
        timestamp: new Date(),
        data: {
          selectedDex: order.selectedDex,
          outputAmount: order.outputAmount,
          txHash: order.txHash,
          error: order.error
        }
      })
    );

    const statusUpdateHandler = (update: OrderStatusUpdate) => {
      try {
        if (socket.readyState !== WebSocket.OPEN) {
          return;
        }

        socket.send(
          JSON.stringify({
            type: 'status',
            orderId: update.orderId,
            status: update.status,
            timestamp: update.timestamp,
            data: update.data
          })
        );

        if (update.status === OrderStatus.CONFIRMED || update.status === OrderStatus.FAILED) {
          setTimeout(() => {
            socket.close();
          }, 100);
        }
      } catch (error) {
        logger.error(`Error sending WebSocket message`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    orderEvents.on(`order:${orderId}`, statusUpdateHandler);

    socket.on('close', () => {
      orderEvents.off(`order:${orderId}`, statusUpdateHandler);
    });

    socket.on('error', error => {
      logger.error(`WebSocket error for order ${orderId}`, {
        orderId,
        error: error.message
      });
      orderEvents.off(`order:${orderId}`, statusUpdateHandler);
    });
  } catch (error) {
    logger.error(`Error in WebSocket handler for order ${orderId}`, {
      orderId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    socket.send(
      JSON.stringify({
        type: 'error',
        message: 'Internal server error'
      })
    );
    socket.close();
  }
};
