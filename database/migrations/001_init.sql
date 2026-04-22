-- =====================================================
-- 옹진관광 쿠폰 통합 플랫폼 DB 마이그레이션
-- MySQL 8.0 | charset: utf8mb4
-- =====================================================

CREATE DATABASE IF NOT EXISTS ongjin_coupon_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ongjin_coupon_db;

-- ── 관리자 (먼저 생성 — merchants FK 참조 대상) ──
CREATE TABLE IF NOT EXISTS admins (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,   -- bcrypt
  name          VARCHAR(50),
  role          ENUM('super','operator') DEFAULT 'operator',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── 관광객 (사용자) ───────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  social_provider ENUM('kakao', 'naver', 'google') NOT NULL,
  provider_id   VARCHAR(100) NOT NULL,
  nickname      VARCHAR(50),
  email         VARCHAR(100),
  phone_hash    VARCHAR(64),            -- SHA-256(phone + salt), NULL 허용
  coupon_balance INT UNSIGNED DEFAULT 0, -- 마이페이지 잔액(원)
  role          ENUM('tourist') DEFAULT 'tourist',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_social (social_provider, provider_id)
) ENGINE=InnoDB;

-- ── 가맹점 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchants (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  phone_hash    VARCHAR(64)  NOT NULL UNIQUE, -- SHA-256(phone + salt)
  business_no   VARCHAR(20),                  -- 사업자번호 (평문, 비필수)
  address       VARCHAR(200),
  category      VARCHAR(50),
  lat           DECIMAL(10,7),
  lng           DECIMAL(10,7),
  status        ENUM('pending','approved','rejected','suspended') DEFAULT 'pending',
  applied_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_at   DATETIME,
  approved_by   INT UNSIGNED,
  FOREIGN KEY (approved_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── 쿠폰 원장 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code_hash     VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256(code + salt)
  coupon_type   ENUM('digital','paper') NOT NULL,
  face_value    INT UNSIGNED NOT NULL,        -- 액면가 (원)
  issued_to     INT UNSIGNED,                 -- users.id
  status        ENUM('available','used','expired','cancelled') DEFAULT 'available',
  issued_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  issued_by     INT UNSIGNED,                 -- admins.id (발행 관리자)
  expires_at    DATETIME,
  used_at       DATETIME,
  FOREIGN KEY (issued_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (issued_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── 종이쿠폰 원장 ─────────────────────────────────
CREATE TABLE IF NOT EXISTS paper_coupons (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  random_code_hash VARCHAR(64) NOT NULL UNIQUE,
  face_value    INT UNSIGNED NOT NULL,
  converted     TINYINT(1) DEFAULT 0,         -- 디지털화 여부
  converted_by  INT UNSIGNED,                 -- users.id
  converted_at  DATETIME,
  issued_by_location VARCHAR(100),            -- 발행 장소 (예: 연안부두 안내소)
  issued_at     DATETIME DEFAULT CURRENT_TIMESTAMP, -- 발행 날짜
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (converted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── 쿠폰 사용 이력 ────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_transactions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  coupon_id     INT UNSIGNED NOT NULL,
  merchant_id   INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED,
  amount        INT UNSIGNED NOT NULL,
  scanned_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_offline    TINYINT(1) DEFAULT 0,         -- Snap & Go 오프라인 정산 여부
  offline_synced_at DATETIME,
  FOREIGN KEY (coupon_id)   REFERENCES coupons(id),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_merchant_date (merchant_id, scanned_at)
) ENGINE=InnoDB;

-- ── 정산 원장 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS settlements (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  merchant_id   INT UNSIGNED NOT NULL,
  period        CHAR(7) NOT NULL,             -- 'YYYY-MM' (전월)
  total_amount  INT UNSIGNED NOT NULL,
  status        ENUM('pending','file_generated','transferred','failed') DEFAULT 'pending',
  generated_at  DATETIME,
  file_path     VARCHAR(300),                 -- 생성된 XML 파일 경로
  transferred_at DATETIME,
  note          TEXT,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  UNIQUE KEY uq_settlement (merchant_id, period)
) ENGINE=InnoDB;

-- ── FDS 알림 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS fds_alerts (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rule_id       VARCHAR(50) NOT NULL,
  coupon_id     INT UNSIGNED,
  merchant_id   INT UNSIGNED,
  user_id       INT UNSIGNED,
  description   TEXT,
  detected_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved      TINYINT(1) DEFAULT 0,
  resolved_at   DATETIME,
  resolved_by   INT UNSIGNED,
  FOREIGN KEY (coupon_id)   REFERENCES coupons(id)   ON DELETE SET NULL,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE SET NULL,
  FOREIGN KEY (resolved_by) REFERENCES admins(id)    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ── OTP 세션 (Redis 미사용 환경 대체) ────────────
CREATE TABLE IF NOT EXISTS otp_sessions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone_hash    VARCHAR(64) NOT NULL,
  otp_code      VARCHAR(6)  NOT NULL,
  expires_at    DATETIME    NOT NULL,
  used          TINYINT(1) DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone_exp (phone_hash, expires_at)
) ENGINE=InnoDB;
