import { FastifyInstance } from 'fastify';
import { handleOrderStatusWebSocket } from '../controllers/websocket.handler';

export const registerWebSocketRoutes = async (app: FastifyInstance) => {
  app.get('/ws/orders/:orderId', { websocket: true }, handleOrderStatusWebSocket);
};
