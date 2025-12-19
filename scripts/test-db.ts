import pool from '../src/database/connection';
import logger from '../src/utils/logger';

async function testConnection() {
  try {
    logger.info('Testing database connection...');

    const result = await pool.query('SELECT NOW() as current_time, version()');
    logger.info('✅ Database connected successfully');
    logger.info('Current time:', result.rows[0].current_time);
    logger.info('PostgreSQL version:', result.rows[0].version);

    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'orders'
      );
    `);

    if (tableCheck.rows[0].exists) {
      logger.info('✅ Orders table exists');

      const count = await pool.query('SELECT COUNT(*) FROM orders');
      logger.info(`Total orders in database: ${count.rows[0].count}`);
    } else {
      logger.warn('⚠️  Orders table does not exist. Run init.sql');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
