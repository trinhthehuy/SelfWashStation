
import knex from 'knex';
// @ts-ignore
import knexConfig from '../../knexfile.cjs';

const environment = process.env.NODE_ENV || 'development';

/**
 * Nếu file knexfile.cjs của bạn export theo dạng module.exports = { development: {...} }
 * thì knexConfig lúc này sẽ chính là object đó.
 */
const config = knexConfig[environment];

// Khởi tạo instance của knex
const db = knex(config);

/**
 * Hàm kiểm tra kết nối Database
 */
export async function initDb() {
  try {
    // Kiểm tra kết nối bằng truy vấn đơn giản
    await db.raw('SELECT 1');
    const dbName = db.client.config.connection.database || 'Unknown DB';

    console.log(`🚀 Database connected successfully!`);
    console.log(`📦 Database Name: ${dbName}`);
    console.log(`🌍 Environment: ${environment.toUpperCase()}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    // Trong môi trường Backend, nên throw error để ứng dụng không khởi động khi DB lỗi
    throw error;
  }
}

// Export default instance để sử dụng ở các nơi khác như: import db from './db/index.ts'
export default db;
