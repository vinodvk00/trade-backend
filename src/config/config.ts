import dotenv from 'dotenv';

dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'order_execution',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },

  mockDex: {
    quoteDelayMs: parseInt(process.env.MOCK_DEX_QUOTE_DELAY_MS || '200', 10),
    executionDelayMs: parseInt(process.env.MOCK_DEX_EXECUTION_DELAY_MS || '2500', 10),
    failureRate: parseFloat(process.env.MOCK_DEX_FAILURE_RATE || '0.05')
  }
};

export default config;
