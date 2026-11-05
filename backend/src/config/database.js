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

      // coupons 테이블에 active_qr_token, active_qr_expires_at 추가
      const couponCols = [
        { name: 'active_qr_token', type: 'VARCHAR(64) NULL' },
        { name: 'active_qr_expires_at', type: 'DATETIME NULL' }
      ];
      for (const col of couponCols) {
        try {
          await conn.execute(`ALTER TABLE coupons ADD COLUMN ${col.name} ${col.type}`);
          logger.info(`✅ DB 스키마 업데이트 성공 (coupons.${col.name} 추가)`);
        } catch (err) {}
      }

      // issuer_products 테이블 생성 및 데이터 이관
      try {
        await conn.execute(`
          CREATE TABLE IF NOT EXISTS issuer_products (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            issuer_id INT UNSIGNED NOT NULL,
            product_name VARCHAR(100) NOT NULL,
            price INT UNSIGNED NOT NULL,
            off_season_price INT UNSIGNED NULL DEFAULT NULL,
            display_order INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (issuer_id) REFERENCES issuers(id) ON DELETE CASCADE
          ) ENGINE=InnoDB;
        `);
        try {
          await conn.execute(`
            ALTER TABLE issuer_products
            ADD COLUMN off_season_price INT UNSIGNED NULL DEFAULT NULL AFTER price
          `);
        } catch (_) {}

        // 옹진군 4대 실제 발행처 초기 마이그레이션 (구버전 더미 발행처가 남아있거나 주소가 미반영된 경우 1회 갱신)
        const [legacyCheck] = await conn.execute(
          `SELECT id, name, address FROM issuers WHERE name IN ('인천항 연안여객터미널 안내소', '대부도 여객선 대합실', '덕적도자연휴양림') OR (name = '소야랑' AND (address IS NULL OR address LIKE '%자월면%'))`
        );
        if (legacyCheck.length > 0) {
          const bcrypt = require('bcryptjs');
          const pwHash = await bcrypt.hash('1234', 10);

          const targetIssuers = [
            {
              id: 1,
              username: '자월달빛천문대',
              name: '자월달빛천문대',
              phone: '032-899-3300',
              address: '인천광역시 옹진군 자월면 자월서로 396-35',
              product_name: '투영관',
              product_price: 2000,
              products: [
                { name: '투영관', price: 2000, offSeasonPrice: null, order: 1 },
                { name: '관측실', price: 3000, offSeasonPrice: null, order: 2 }
              ]
            },
            {
              id: 2,
              username: '장골해수욕장 야영장',
              name: '장골해수욕장 야영장',
              phone: '032-899-3800',
              address: '인천광역시 옹진군 자월면 자월서로 101번길 13',
              product_name: '야영장 이용',
              product_price: 10000,
              products: [
                { name: '야영장 이용', price: 10000, offSeasonPrice: null, order: 1 }
              ]
            },
            {
              id: 3,
              username: '소야랑',
              name: '소야랑',
              phone: '032-899-3810',
              address: '인천광역시 옹진군 덕적면 소야로 188-14',
              product_name: '시설 이용',
              product_price: 5000,
              products: [
                { name: '시설 이용', price: 5000, offSeasonPrice: null, order: 1 }
              ]
            },
            {
              id: 4,
              username: '덕적도 자연휴양림',
              name: '덕적도 자연휴양림',
              phone: '032-899-3600',
              address: '인천광역시 옹진군 덕적면 덕적남로 220',
              product_name: '휴양림 및 야영데크 이용',
              product_price: 10000,
              products: [
                { name: '휴양림 및 야영데크 이용', price: 10000, offSeasonPrice: 5000, order: 1 }
              ]
            }
          ];

          for (const t of targetIssuers) {
            await conn.execute(
              `INSERT INTO issuers (id, username, password_hash, name, phone, address, product_name, product_price)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 username = VALUES(username),
                 password_hash = VALUES(password_hash),
                 name = VALUES(name),
                 phone = VALUES(phone),
                 address = VALUES(address),
                 product_name = VALUES(product_name),
                 product_price = VALUES(product_price)`,
              [t.id, t.username, pwHash, t.name, t.phone, t.address, t.product_name, t.product_price]
            );

            await conn.execute(`DELETE FROM issuer_products WHERE issuer_id = ?`, [t.id]);
            for (const p of t.products) {
              await conn.execute(
                `INSERT INTO issuer_products (issuer_id, product_name, price, off_season_price, display_order)
                 VALUES (?, ?, ?, ?, ?)`,
                [t.id, p.name, p.price, p.offSeasonPrice, p.order]
              );
            }
          }

          // 불필요한 미사용 배정 정리 및 4개 발행처 권종별 배정 정렬
          await conn.execute(`DELETE FROM issuer_allocations WHERE id IN (4, 6) AND issued_count = 0`);
          await conn.execute(`UPDATE issuer_allocations SET issuer_id = 1, face_value = 2000, total_count = 100 WHERE id = 1`);
          await conn.execute(`UPDATE issuer_allocations SET issuer_id = 1, face_value = 3000, total_count = 100 WHERE id = 9`);
          await conn.execute(`UPDATE issuer_allocations SET issuer_id = 2, face_value = 10000, total_count = 30 WHERE id = 2`);
          await conn.execute(`UPDATE issuer_allocations SET issuer_id = 3, face_value = 5000, total_count = 60 WHERE id = 5`);
          await conn.execute(`UPDATE issuer_allocations SET issuer_id = 4, face_value = 10000, total_count = 30 WHERE id = 8`);
          await conn.execute(`UPDATE issuer_allocations SET issuer_id = 4, face_value = 5000, total_count = 60 WHERE id = 10`);

          logger.info('✅ 옹진군 4개 발행처(자월달빛천문대, 장골해수욕장 야영장, 소야랑, 덕적도 자연휴양림) 및 초기 비밀번호(1234) 마이그레이션 완료');
        }
      } catch (err) {
        logger.info(`ℹ️ DB 스키마 업데이트 스킵: ${err.message}`);
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

      // users 테이블에 onboarding_done 추가 (회원 첫 접속 온보딩 여부)
      try {
        await conn.execute(`
          ALTER TABLE users
          ADD COLUMN onboarding_done TINYINT(1) NOT NULL DEFAULT 0
        `);
        logger.info('✅ DB 스키마 업데이트 성공 (users.onboarding_done 추가)');
      } catch (_) {}

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
