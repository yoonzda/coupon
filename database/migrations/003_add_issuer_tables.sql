USE ongjin_coupon_db;

-- ── 1. 발행처 (안내소 등) 계정 테이블 ──
CREATE TABLE IF NOT EXISTS issuers (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL, -- bcrypt
  name          VARCHAR(100) NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── 2. 발행처별 쿠폰 금액 및 수량 배정 테이블 ──
CREATE TABLE IF NOT EXISTS issuer_allocations (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issuer_id     INT UNSIGNED NOT NULL,
  face_value    INT UNSIGNED NOT NULL,   -- 배정 쿠폰 금액 (예: 5000, 10000)
  total_count   INT UNSIGNED NOT NULL,   -- 배정 총 갯수
  issued_count  INT UNSIGNED DEFAULT 0,  -- 발급된 갯수
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issuer_id) REFERENCES issuers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 3. coupons 테이블 변경 (배정 ID 외래키 추가) ──
ALTER TABLE coupons 
ADD COLUMN issuer_allocation_id INT UNSIGNED NULL AFTER issued_by;

ALTER TABLE coupons
ADD CONSTRAINT fk_coupon_issuer_alloc 
FOREIGN KEY (issuer_allocation_id) REFERENCES issuer_allocations(id) ON DELETE SET NULL;
