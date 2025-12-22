import Fastify, { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import config from './config/config';
import logger from './utils/logger';
import pool from './database/connection';
import redisConnection from './queue/connection';
import { registerOrderRoutes } from './api/routes/order.routes';
import { registerWebSocketRoutes } from './api/routes/websocket.routes';
import { orderWorker } from './queue/order.worker';
import { orderEvents } from './queue/order.events';

const buildApp = async () => {
  const app = Fastify({
    logger: false
  });

  await app.register(cors, { origin: '*' });
  await app.register(websocket);

  app.get('/health', async (request, reply) => {
    try {
      await pool.query('SELECT 1');
      await redisConnection.ping();
      return reply.status(200).send({
        status: 'ok',
        database: 'connected',
        redis: 'connected'
      });
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return reply.status(503).send({
        status: 'degraded',
        database: 'disconnected',
        redis: 'disconnected'
      });
    }
  });

  await registerOrderRoutes(app);
  await registerWebSocketRoutes(app);

  return app;
};

async function gracefulShutdown(app: FastifyInstance, signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    await app.close();

    await orderWorker.close();

    orderEvents.removeAllListeners();

    await pool.end();

    await redisConnection.quit();

    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

const start = async () => {
  try {
    const app = await buildApp();
    await app.listen({ port: config.port, host: config.host });

    logger.info(`Server running at http://${config.host}:${config.port}`);

    process.on('SIGTERM', () => gracefulShutdown(app, 'SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown(app, 'SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', {
        promise,
        reason: reason instanceof Error ? reason.message : reason
      });
    });

    process.on('uncaughtException', error => {
      logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack
      });
      gracefulShutdown(app, 'UNCAUGHT_EXCEPTION');
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

export { buildApp, start };
