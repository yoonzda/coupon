USE ongjin_coupon_db;

-- ── 1. 쿠폰 지급 규정(구간별 매칭 룰) 테이블 ──
CREATE TABLE IF NOT EXISTS coupon_issuance_rules (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  min_amount    INT UNSIGNED NOT NULL,
  max_amount    INT UNSIGNED NULL,               -- NULL이면 상한 없음 (초과)
  face_value    INT UNSIGNED NOT NULL,           -- 매칭 지급 쿠폰 금액
  rule_name     VARCHAR(100) NULL,
  display_order INT DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 기본 규정 시드 데이터 등록 (중복 방지)
INSERT INTO coupon_issuance_rules (min_amount, max_amount, face_value, rule_name, display_order)
SELECT 1000, 1999, 1000, '1,000원권 기준', 1
WHERE NOT EXISTS (SELECT 1 FROM coupon_issuance_rules WHERE display_order = 1);

INSERT INTO coupon_issuance_rules (min_amount, max_amount, face_value, rule_name, display_order)
SELECT 2000, 3000, 2000, '2,000원권 기준', 2
WHERE NOT EXISTS (SELECT 1 FROM coupon_issuance_rules WHERE display_order = 2);

INSERT INTO coupon_issuance_rules (min_amount, max_amount, face_value, rule_name, display_order)
SELECT 3001, 8000, 3000, '3,000원권 기준', 3
WHERE NOT EXISTS (SELECT 1 FROM coupon_issuance_rules WHERE display_order = 3);

INSERT INTO coupon_issuance_rules (min_amount, max_amount, face_value, rule_name, display_order)
SELECT 8001, 40000, 5000, '5,000원권 기준', 4
WHERE NOT EXISTS (SELECT 1 FROM coupon_issuance_rules WHERE display_order = 4);

INSERT INTO coupon_issuance_rules (min_amount, max_amount, face_value, rule_name, display_order)
SELECT 40001, NULL, 10000, '10,000원권 기준', 5
WHERE NOT EXISTS (SELECT 1 FROM coupon_issuance_rules WHERE display_order = 5);

-- ── 2. issuers 테이블에 입장권/제품명 및 금액 컬럼 추가 ──
SET @dbname = DATABASE();
SET @tablename = "issuers";
SET @columnname = "product_name";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE issuers ADD COLUMN product_name VARCHAR(100) NULL AFTER name;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname2 = "product_price";
SET @preparedStatement2 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname2)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE issuers ADD COLUMN product_price INT UNSIGNED NULL AFTER product_name;"
));
PREPARE alterIfNotExists2 FROM @preparedStatement2;
EXECUTE alterIfNotExists2;
DEALLOCATE PREPARE alterIfNotExists2;
