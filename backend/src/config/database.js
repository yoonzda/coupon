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

// 연결 테스트 및 테이블 자동 보완 (재시도 로직 포함)
async function initializeDatabase(retries = 10, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      logger.info('✅ MySQL 연결 성공');
      
      try {
        // users.social_provider ENUM에 'phone' 추가 허용
        await conn.execute(`
          ALTER TABLE users 
          MODIFY COLUMN social_provider ENUM('kakao', 'naver', 'google', 'phone') NOT NULL
        `);
        logger.info('✅ DB 스키마 업데이트 성공 (users.social_provider ENUM)');
      } catch (schemaErr) {
        // 이미 변경 완료되었거나 변경 불필요한 경우 무시
        logger.info(`ℹ️ DB 스키마 업데이트 스킵: ${schemaErr.message}`);
      }

      try {
        // merchants 테이블에 username, password_hash 추가
        await conn.execute(`
          ALTER TABLE merchants 
          ADD COLUMN username VARCHAR(50) NULL UNIQUE AFTER phone,
          ADD COLUMN password_hash VARCHAR(100) NULL AFTER username
        `);
        logger.info('✅ DB 스키마 업데이트 성공 (merchants.username, password_hash 추가)');
      } catch (schemaErr) {
        // 이미 존재하면 무시
      }

      try {
        // coupons 테이블에 kiosk_session_id 추가
        await conn.execute(`
          ALTER TABLE coupons 
          ADD COLUMN kiosk_session_id VARCHAR(50) NULL AFTER issuer_allocation_id
        `);
        logger.info('✅ DB 스키마 업데이트 성공 (coupons.kiosk_session_id 추가)');
      } catch (schemaErr) {
        // 이미 존재하면 무시
      }

      // merchants 테이블에 신규 입점 필드들 추가
      const columnsToAdd = [
        { name: 'owner_name', type: 'VARCHAR(100) NULL' },
        { name: 'store_phone', type: 'VARCHAR(20) NULL' },
        { name: 'images', type: 'MEDIUMTEXT NULL' },
        { name: 'business_hours', type: 'VARCHAR(100) NULL' },
        { name: 'business_cert_image', type: 'MEDIUMTEXT NULL' },
        { name: 'bank_name', type: 'VARCHAR(50) NULL' },
        { name: 'account_no', type: 'VARCHAR(50) NULL' },
        { name: 'bankbook_image', type: 'MEDIUMTEXT NULL' }
      ];

      for (const col of columnsToAdd) {
        try {
          await conn.execute(`ALTER TABLE merchants ADD COLUMN ${col.name} ${col.type}`);
          logger.info(`✅ DB 스키마 업데이트 성공 (merchants.${col.name} 추가)`);
        } catch (err) {
          // 이미 존재하면 무시
        }
      }

      // 가맹점 자동 주입 제거 완료 (사용자 요청에 의한 깔끔한 초기 상태 보장)

      conn.release();
      return;
    } catch (err) {
      logger.warn(`⚠️ MySQL 연결 시도 ${i + 1}/${retries} 실패: ${err.message}`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error(`❌ MySQL 연결 최종 실패: ${err.message}`);
        process.exit(1);
      }
    }
  }
}

initializeDatabase();

module.exports = pool;
