import dotenv from 'dotenv';

dotenv.config();

function validateRequiredEnvVars() {
  const requiredVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'REDIS_HOST',
    'REDIS_PORT'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    const isProduction = process.env.NODE_ENV === 'production';
    const message = `Missing required environment variables: ${missing.join(', ')}`;

    if (isProduction) {
      throw new Error(message);
    } else {
      console.warn(`⚠️  WARNING: ${message}`);
      console.warn('⚠️  Using default values. Set these in .env for production!');
    }
  }
}

validateRequiredEnvVars();

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

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10)
  },

  mockDex: {
    quoteDelayMs: parseInt(process.env.MOCK_DEX_QUOTE_DELAY_MS || '200', 10),
    executionDelayMs: parseInt(process.env.MOCK_DEX_EXECUTION_DELAY_MS || '2500', 10),
    failureRate: parseFloat(process.env.MOCK_DEX_FAILURE_RATE || '0.05')
  }
};

export default config;
