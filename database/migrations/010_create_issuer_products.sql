USE ongjin_coupon_db;

-- ── 1. 발행처별 복수 상품 관리 테이블 ──
CREATE TABLE IF NOT EXISTS issuer_products (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issuer_id     INT UNSIGNED NOT NULL,
  product_name  VARCHAR(100) NOT NULL,
  price         INT UNSIGNED NOT NULL,
  display_order INT DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issuer_id) REFERENCES issuers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 기존 issuers 테이블의 product_name, product_price 데이터 이관 (중복 방지)
INSERT INTO issuer_products (issuer_id, product_name, price, display_order)
SELECT id, product_name, product_price, 1
FROM issuers
WHERE product_name IS NOT NULL AND product_name != ''
  AND NOT EXISTS (
    SELECT 1 FROM issuer_products WHERE issuer_products.issuer_id = issuers.id
  );
