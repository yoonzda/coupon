USE ongjin_coupon_db;

-- 2026년 3월 정산 테스트용 데이터 추가
-- 가맹점 1번에 대해 3월 중 사용된 쿠폰 3건 시뮬레이션
INSERT INTO coupon_transactions (coupon_id, merchant_id, user_id, amount, scanned_at) VALUES
(1, 1, 1, 10000, '2026-03-15 14:20:00'),
(2, 1, 2, 15000, '2026-03-20 11:30:00'),
(3, 1, 1, 5000, '2026-03-25 09:10:00');

-- 가맹점 2번에 대해 3월 중 사용된 쿠폰 1건 시뮬레이션
INSERT INTO coupon_transactions (coupon_id, merchant_id, user_id, amount, scanned_at) VALUES
(4, 2, 1, 30000, '2026-03-10 18:00:00');
