import { FastifyInstance } from 'fastify';
import * as orderController from './order.controller';

export const registerOrderRoutes = async (app: FastifyInstance) => {
  app.post('/api/orders', orderController.createOrder);
  app.post('/api/orders/:id/execute', orderController.executeOrder);
  app.get('/api/orders/:id', orderController.getOrder);
  app.get('/api/orders/user/:wallet', orderController.getUserOrders);
};
