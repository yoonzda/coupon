-- =====================================================
-- 옹진관광 쿠폰 플랫폼 — 대시보드 임시 데이터
-- 개발/데모 전용 (운영 서버에서 실행 금지)
-- =====================================================
SET NAMES utf8mb4;
USE ongjin_coupon_db;

-- ── 1. 가맹점 ─────────────────────────────────────
INSERT IGNORE INTO merchants (id, name, phone_hash, business_no, address, category, lat, lng, status, applied_at, approved_at, approved_by)
VALUES
  (1, '백령도 해물칼국수', SHA2(CONCAT('01011110001','local_app_salt_change_this'),256), '123-45-67890', '인천 옹진군 백령면 진촌리 12', '음식점', 37.9724, 124.6830, 'approved', NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 28 DAY, 1),
  (2, '연평도 꽃게직판장', SHA2(CONCAT('01011110002','local_app_salt_change_this'),256), '123-45-67891', '인천 옹진군 연평면 연평리 45', '수산물', 37.6704, 125.6870, 'approved', NOW() - INTERVAL 25 DAY, NOW() - INTERVAL 23 DAY, 1),
  (3, '대청도 서풍받이 카페', SHA2(CONCAT('01011110003','local_app_salt_change_this'),256), '123-45-67892', '인천 옹진군 대청면 대청리 78', '카페', 37.8291, 124.7098, 'approved', NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 18 DAY, 1),
  (4, '소청도 민박 파도소리', SHA2(CONCAT('01011110004','local_app_salt_change_this'),256), '123-45-67893', '인천 옹진군 대청면 소청리 23', '숙박', 37.7911, 124.7381, 'approved', NOW() - INTERVAL 15 DAY, NOW() - INTERVAL 13 DAY, 1),
  (5, '덕적도 솔밭 기념품', SHA2(CONCAT('01011110005','local_app_salt_change_this'),256), '123-45-67894', '인천 옹진군 덕적면 진리 56', '기념품', 37.2284, 126.1571, 'approved', NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 8 DAY, 1),
  (6, '자월도 해수욕장 식당', SHA2(CONCAT('01011110006','local_app_salt_change_this'),256), '123-45-67895', '인천 옹진군 자월면 자월리 34', '음식점', 37.2598, 126.3012, 'pending',  NOW() - INTERVAL 3 DAY, NULL, NULL),
  (7, '이작도 낚시체험', SHA2(CONCAT('01011110007','local_app_salt_change_this'),256), '123-45-67896', '인천 옹진군 자월면 이작리 15', '체험', 37.2041, 126.3528, 'pending',  NOW() - INTERVAL 2 DAY, NULL, NULL);

-- ── 2. 관광객 사용자 ──────────────────────────────
INSERT IGNORE INTO users (id, social_provider, provider_id, nickname, email, coupon_balance, role)
VALUES
  (1, 'kakao', 'kakao_10001', '바다별', 'user01@kakao.com', 15000, 'tourist'),
  (2, 'naver', 'naver_20001', '파도소리', 'user02@naver.com', 8000,  'tourist'),
  (3, 'google', 'google_30001', '갈매기', 'user03@gmail.com', 25000, 'tourist'),
  (4, 'kakao', 'kakao_10002', '섬여행자', 'user04@kakao.com', 3000,  'tourist'),
  (5, 'naver', 'naver_20002', '해돋이', 'user05@naver.com', 50000, 'tourist'),
  (6, 'kakao', 'kakao_10003', '꽃게러버', 'user06@kakao.com', 12000, 'tourist'),
  (7, 'google', 'google_30002', '낙조감상', 'user07@gmail.com', 0,     'tourist'),
  (8, 'kakao', 'kakao_10004', '백령여행', 'user08@kakao.com', 7000,  'tourist'),
  (9, 'naver', 'naver_20003', '여름바다', 'user09@naver.com', 18000, 'tourist'),
  (10,'kakao', 'kakao_10005', '섬집아이', 'user10@kakao.com', 30000, 'tourist');

-- ── 3. 쿠폰 ─────────────────────────────────────
INSERT IGNORE INTO coupons (id, code_hash, coupon_type, face_value, issued_to, status, issued_at, issued_by, expires_at, used_at)
VALUES
  -- 사용된 쿠폰
  (1,  SHA2(CONCAT('CODE001','local_app_salt_change_this'),256), 'digital', 10000, 1, 'used',      NOW()-INTERVAL 20 DAY, 1, NOW()+INTERVAL 10 DAY, NOW()-INTERVAL 15 DAY),
  (2,  SHA2(CONCAT('CODE002','local_app_salt_change_this'),256), 'digital', 5000,  2, 'used',      NOW()-INTERVAL 18 DAY, 1, NOW()+INTERVAL 12 DAY, NOW()-INTERVAL 14 DAY),
  (3,  SHA2(CONCAT('CODE003','local_app_salt_change_this'),256), 'digital', 15000, 3, 'used',      NOW()-INTERVAL 16 DAY, 1, NOW()+INTERVAL 14 DAY, NOW()-INTERVAL 12 DAY),
  (4,  SHA2(CONCAT('CODE004','local_app_salt_change_this'),256), 'digital', 10000, 4, 'used',      NOW()-INTERVAL 14 DAY, 1, NOW()+INTERVAL 16 DAY, NOW()-INTERVAL 10 DAY),
  (5,  SHA2(CONCAT('CODE005','local_app_salt_change_this'),256), 'digital', 20000, 5, 'used',      NOW()-INTERVAL 12 DAY, 1, NOW()+INTERVAL 18 DAY, NOW()-INTERVAL 8 DAY),
  (6,  SHA2(CONCAT('CODE006','local_app_salt_change_this'),256), 'digital', 10000, 6, 'used',      NOW()-INTERVAL 10 DAY, 1, NOW()+INTERVAL 20 DAY, NOW()-INTERVAL 6 DAY),
  (7,  SHA2(CONCAT('CODE007','local_app_salt_change_this'),256), 'digital', 5000,  7, 'used',      NOW()-INTERVAL 8 DAY,  1, NOW()+INTERVAL 22 DAY, NOW()-INTERVAL 4 DAY),
  (8,  SHA2(CONCAT('CODE008','local_app_salt_change_this'),256), 'digital', 10000, 8, 'used',      NOW()-INTERVAL 6 DAY,  1, NOW()+INTERVAL 24 DAY, NOW()-INTERVAL 3 DAY),
  (9,  SHA2(CONCAT('CODE009','local_app_salt_change_this'),256), 'digital', 15000, 9, 'used',      NOW()-INTERVAL 4 DAY,  1, NOW()+INTERVAL 26 DAY, NOW()-INTERVAL 2 DAY),
  (10, SHA2(CONCAT('CODE010','local_app_salt_change_this'),256), 'digital', 10000, 10,'used',      NOW()-INTERVAL 2 DAY,  1, NOW()+INTERVAL 28 DAY, NOW()-INTERVAL 1 DAY),
  -- 사용 가능한 쿠폰
  (11, SHA2(CONCAT('CODE011','local_app_salt_change_this'),256), 'digital', 10000, 1, 'available', NOW()-INTERVAL 1 DAY,  1, NOW()+INTERVAL 30 DAY, NULL),
  (12, SHA2(CONCAT('CODE012','local_app_salt_change_this'),256), 'digital', 5000,  2, 'available', NOW(),                 1, NOW()+INTERVAL 30 DAY, NULL),
  (13, SHA2(CONCAT('CODE013','local_app_salt_change_this'),256), 'paper',   10000, 3, 'available', NOW(),                 1, NOW()+INTERVAL 60 DAY, NULL),
  (14, SHA2(CONCAT('CODE014','local_app_salt_change_this'),256), 'digital', 20000, 4, 'available', NOW(),                 1, NOW()+INTERVAL 30 DAY, NULL),
  (15, SHA2(CONCAT('CODE015','local_app_salt_change_this'),256), 'digital', 15000, 5, 'available', NOW(),                 1, NOW()+INTERVAL 30 DAY, NULL);

-- ── 4. 쿠폰 거래 내역 (최근 30일) ────────────────
INSERT IGNORE INTO coupon_transactions (id, coupon_id, merchant_id, user_id, amount, scanned_at)
VALUES
  (1,  1,  1, 1, 10000, NOW()-INTERVAL 15 DAY),
  (2,  2,  2, 2, 5000,  NOW()-INTERVAL 14 DAY),
  (3,  3,  3, 3, 15000, NOW()-INTERVAL 12 DAY),
  (4,  4,  1, 4, 10000, NOW()-INTERVAL 10 DAY),
  (5,  5,  4, 5, 20000, NOW()-INTERVAL 8 DAY),
  (6,  6,  2, 6, 10000, NOW()-INTERVAL 7 DAY),
  (7,  7,  5, 7, 5000,  NOW()-INTERVAL 6 DAY),
  (8,  8,  1, 8, 10000, NOW()-INTERVAL 5 DAY),
  (9,  9,  3, 9, 15000, NOW()-INTERVAL 3 DAY),
  (10, 10, 2, 10,10000, NOW()-INTERVAL 1 DAY);

-- ── 5. FDS 알림 ──────────────────────────────────
INSERT IGNORE INTO fds_alerts (id, rule_id, coupon_id, merchant_id, user_id, description, detected_at, resolved)
VALUES
  (1, 'RULE-001', 3, 3, 3, '동일 쿠폰 단시간 중복 사용 의심 (30분 내 2회)', NOW()-INTERVAL 2 DAY, 0),
  (2, 'RULE-002', 5, 4, 5, '비정상 고액 결제 패턴 감지 (일평균 3배 초과)', NOW()-INTERVAL 1 DAY, 0),
  (3, 'RULE-003', 7, 5, 7, '영업시간 외 쿠폰 사용 (새벽 3시)', NOW()-INTERVAL 12 HOUR, 0);

-- 확인
SELECT '===== 임시 데이터 삽입 완료 =====' AS status;
SELECT COUNT(*) AS merchants FROM merchants;
SELECT COUNT(*) AS users FROM users;
SELECT COUNT(*) AS coupons FROM coupons;
SELECT COUNT(*) AS transactions FROM coupon_transactions;
SELECT COUNT(*) AS fds_alerts FROM fds_alerts;
