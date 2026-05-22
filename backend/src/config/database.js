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

// 연결 테스트 및 테이블 자동 보완
pool.getConnection()
  .then(async conn => {
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

    try {
      // 가맹점 3개 계정 생성/업데이트 (merchant01, merchant02, merchant03)
      const bcrypt = require('bcryptjs');
      const merchantHash = await bcrypt.hash('merchant1234', 10);
      
      // merchant01
      await conn.execute(`
        INSERT INTO merchants (id, name, phone, phone_hash, username, password_hash, status)
        VALUES (1, '백령도 해물칼국수', '010-1111-0001', SHA2(CONCAT('01011110001','local_app_salt_change_this'),256), 'merchant01', ?, 'approved')
        ON DUPLICATE KEY UPDATE username = 'merchant01', password_hash = ?, status = 'approved'
      `, [merchantHash, merchantHash]);

      // merchant02
      await conn.execute(`
        INSERT INTO merchants (id, name, phone, phone_hash, username, password_hash, status)
        VALUES (2, '연평도 꽃게직판장', '010-1111-0002', SHA2(CONCAT('01011110002','local_app_salt_change_this'),256), 'merchant02', ?, 'approved')
        ON DUPLICATE KEY UPDATE username = 'merchant02', password_hash = ?, status = 'approved'
      `, [merchantHash, merchantHash]);

      // merchant03
      await conn.execute(`
        INSERT INTO merchants (id, name, phone, phone_hash, username, password_hash, status)
        VALUES (3, '대청도 서풍받이 카페', '010-1111-0003', SHA2(CONCAT('01011110003','local_app_salt_change_this'),256), 'merchant03', ?, 'approved')
        ON DUPLICATE KEY UPDATE username = 'merchant03', password_hash = ?, status = 'approved'
      `, [merchantHash, merchantHash]);
      
      logger.info('✅ 가맹점 1, 2, 3 계정 정보 초기화 완료 (merchant01 ~ 03)');
    } catch (dbErr) {
      logger.error(`❌ 가맹점 초기 데이터 주입 실패: ${dbErr.message}`);
    }

    conn.release();
  })
  .catch(err => {
    logger.error(`❌ MySQL 연결 실패: ${err.message}`);
    process.exit(1);
  });

module.exports = pool;
