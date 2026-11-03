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
    let conn = null;
    try {
      conn = await pool.getConnection();
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
        { name: 'bankbook_image', type: 'MEDIUMTEXT NULL' },
        { name: 'staff_pin_hash', type: 'VARCHAR(255) NULL' },
        { name: 'staff_pin_enabled', type: 'TINYINT(1) DEFAULT 0' }
      ];

      for (const col of columnsToAdd) {
        try {
          await conn.execute(`ALTER TABLE merchants ADD COLUMN ${col.name} ${col.type}`);
          logger.info(`✅ DB 스키마 업데이트 성공 (merchants.${col.name} 추가)`);
        } catch (_) { }
      }

      // coupon_transactions 테이블에 결제 취소 관련 컬럼 추가
      const txColumns = [
        { name: 'is_cancelled', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'cancelled_at', type: 'DATETIME NULL' },
        { name: 'cancel_reason', type: 'VARCHAR(255) NULL' }
      ];
      for (const col of txColumns) {
        try {
          await conn.execute(`ALTER TABLE coupon_transactions ADD COLUMN ${col.name} ${col.type}`);
          logger.info(`✅ DB 스키마 업데이트 성공 (coupon_transactions.${col.name} 추가)`);
        } catch (_) { }
      }

      // paper_coupons 테이블에 결제 취소 관련 컬럼 추가
      const paperColumns = [
        { name: 'is_cancelled', type: 'TINYINT(1) DEFAULT 0' },
        { name: 'cancelled_at', type: 'DATETIME NULL' },
        { name: 'cancel_reason', type: 'VARCHAR(255) NULL' }
      ];
      for (const col of paperColumns) {
        try {
          await conn.execute(`ALTER TABLE paper_coupons ADD COLUMN ${col.name} ${col.type}`);
          logger.info(`✅ DB 스키마 업데이트 성공 (paper_coupons.${col.name} 추가)`);
        } catch (_) { }
      }

      // 결제 취소 시 이미 사용된 쿠폰의 사후 회수 대상 기록
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS coupon_recoveries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          paper_coupon_id INT NOT NULL,
          coupon_id INT NULL,
          issuer_id INT NULL,
          transaction_id VARCHAR(100) NULL,
          face_value INT NOT NULL DEFAULT 0,
          reason VARCHAR(255) NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          resolved_at DATETIME NULL,
          UNIQUE KEY uq_recovery_paper (paper_coupon_id),
          KEY idx_recovery_status (status)
        ) CHARACTER SET utf8mb4
      `);

      // 단체 쿠폰 공유 링크 (일행 1인 1장 / 구매자 대리 수령 상한)
      try {
        await conn.execute(`ALTER TABLE paper_coupons ADD COLUMN share_bundle_id INT NULL`);
        logger.info('✅ DB 스키마 업데이트 성공 (paper_coupons.share_bundle_id 추가)');
      } catch (_) { }
      try {
        await conn.execute(`CREATE INDEX idx_paper_share_bundle ON paper_coupons (share_bundle_id, converted)`);
      } catch (_) { }
      try {
        // 공유 묶음: 키오스크 문자 수령(2장 이상) 1건당 1개 생성
        await conn.execute(`
          CREATE TABLE IF NOT EXISTS coupon_share_bundles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token VARCHAR(32) NOT NULL,
            transaction_id VARCHAR(128) NULL,
            issuer_id INT NULL,
            issued_by_location VARCHAR(255) NULL,
            purchaser_phone_hash CHAR(64) NOT NULL,
            purchaser_phone_masked VARCHAR(20) NULL,
            total_count INT NOT NULL DEFAULT 0,
            total_amount INT NOT NULL DEFAULT 0,
            proxy_max INT NOT NULL DEFAULT 5,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_share_token (token),
            KEY idx_share_txn (transaction_id),
            KEY idx_share_purchaser (purchaser_phone_hash)
          ) CHARACTER SET utf8mb4
        `);
        // 수령 기록: 쿠폰 1장당 1행 (claim_type = self | proxy)
        await conn.execute(`
          CREATE TABLE IF NOT EXISTS coupon_share_claims (
            id INT AUTO_INCREMENT PRIMARY KEY,
            bundle_id INT NOT NULL,
            user_id INT NOT NULL,
            claimer_phone_hash CHAR(64) NULL,
            paper_coupon_id INT NOT NULL,
            coupon_id INT NULL,
            face_value INT NOT NULL DEFAULT 0,
            claim_type VARCHAR(10) NOT NULL DEFAULT 'self',
            source VARCHAR(10) NOT NULL DEFAULT 'link',
            ip VARCHAR(64) NULL,
            user_agent VARCHAR(255) NULL,
            claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_share_claim_paper (paper_coupon_id),
            KEY idx_share_claim_bundle_user (bundle_id, user_id),
            KEY idx_share_claim_proxy (user_id, claim_type, claimed_at),
            KEY idx_share_claim_phone (claimer_phone_hash, claim_type, claimed_at),
            KEY idx_share_claim_coupon (coupon_id)
          ) CHARACTER SET utf8mb4
        `);
        // 기존(초기 버전) 테이블 보정: 컬럼이 이미 있으면 무시
        const shareAlters = [
          `ALTER TABLE coupon_share_bundles ADD COLUMN purchaser_phone_masked VARCHAR(20) NULL AFTER purchaser_phone_hash`,
          `ALTER TABLE coupon_share_claims ADD COLUMN claimer_phone_hash CHAR(64) NULL AFTER user_id`,
          `ALTER TABLE coupon_share_claims ADD COLUMN source VARCHAR(10) NOT NULL DEFAULT 'link' AFTER claim_type`,
          `CREATE INDEX idx_share_claim_phone ON coupon_share_claims (claimer_phone_hash, claim_type, claimed_at)`,
        ];
        for (const sql of shareAlters) {
          try { await conn.execute(sql); } catch (_) { }
        }
      } catch (shareErr) {
        logger.warn(`⚠️ 단체 공유 링크 테이블 생성 실패: ${shareErr.message}`);
      }

      // 관광객 → 가맹점 사장님 쿠폰 사용 요청 테이블
      try {
        await conn.execute(`
          CREATE TABLE IF NOT EXISTS coupon_usage_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            merchant_id INT NOT NULL,
            user_id INT NOT NULL,
            user_phone VARCHAR(30) DEFAULT NULL,
            coupon_ids JSON NOT NULL,
            coupon_count INT NOT NULL DEFAULT 1,
            total_amount INT NOT NULL DEFAULT 0,
            status ENUM('pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
            requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            processed_at DATETIME DEFAULT NULL,
            reject_reason VARCHAR(255) DEFAULT NULL,
            INDEX idx_merchant_status (merchant_id, status),
            INDEX idx_user_status (user_id, status)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
      } catch (reqTableErr) {
        logger.warn(`⚠️ 쿠폰 사용 요청 테이블 생성 실패: ${reqTableErr.message}`);
      }

      return;
    } catch (err) {
      logger.warn(`⚠️ MySQL 연결 시도 ${i + 1}/${retries} 실패: ${err.message}`);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error(`❌ MySQL 연결 최종 실패: ${err.message}`);
        process.exit(1);
      }
    } finally {
      if (conn) {
        try { conn.release(); } catch (_) { }
      }
    }
  }
}

initializeDatabase();

module.exports = pool;
