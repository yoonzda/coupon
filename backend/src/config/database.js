const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+09:00',
});

// 연결 테스트
pool.getConnection()
  .then(conn => {
    logger.info('✅ MySQL 연결 성공');
    conn.release();
  })
  .catch(err => {
    logger.error(`❌ MySQL 연결 실패: ${err.message}`);
    process.exit(1);
  });

module.exports = pool;
