SET NAMES utf8mb4;
USE ongjin_coupon_db;

-- 1. 기존 테스트 계정 및 배정 클렌징
DELETE FROM issuers WHERE username IN ('issuer01', 'issuer02');

-- 2. 발행처 생성 (비밀번호: issuer1234)
INSERT INTO issuers (id, name, username, password_hash) VALUES
(1, '인천항 연안여객터미널 안내소', 'issuer01', '$2a$10$Iva1saEu69xqQa4uKG4FouGqCVAPtBi0yRPmyAyYfT0rVXJKkNfqu'),
(2, '대부도 여객선 대합실', 'issuer02', '$2a$10$Iva1saEu69xqQa4uKG4FouGqCVAPtBi0yRPmyAyYfT0rVXJKkNfqu');

-- 3. 쿠폰 배정 생성
INSERT INTO issuer_allocations (issuer_id, face_value, total_count, issued_count) VALUES
(1, 10000, 100, 0),
(2, 5000, 200, 0);
