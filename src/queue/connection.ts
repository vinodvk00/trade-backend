import Redis from 'ioredis';
import config from '../config/config';
import logger from '../utils/logger';

const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisConnection.on('connect', () => {
  logger.info('Redis connected', {
    host: config.redis.host,
    port: config.redis.port
  });
});

redisConnection.on('error', error => {
  logger.error('Redis connection error', { error: error.message });
});

export default redisConnection;
