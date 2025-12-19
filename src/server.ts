import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import config from './config/config';
import logger from './utils/logger';
import pool from './database/connection';

const buildApp = async () => {
  const app = Fastify({
    logger: false
  });

  await app.register(cors, { origin: '*' });
  await app.register(websocket);

  app.get('/health', async () => {
    try {
      await pool.query('SELECT 1');
      return { status: 'ok', database: 'connected' };
    } catch (_error) {
      return { status: 'degraded', database: 'disconnected' };
    }
  });

  return app;
};

const start = async () => {
  try {
    const app = await buildApp();
    await app.listen({ port: config.port, host: config.host });

    logger.info(`Server running at http://${config.host}:${config.port}`);
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

export { buildApp, start };
