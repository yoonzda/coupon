SET NAMES utf8mb4;
USE ongjin_coupon_db;

-- 초기 관리자 계정 (비밀번호: admin1234 - 실제 운영 시 변경 권장)
INSERT INTO admins (username, password_hash, name, role) VALUES 
('admin', '$2a$10$BMlyzeJSKJU9c8QDNlVSgOoEegP5ypiL5.JK30hv3sq4Eqp5Itn3y', '누리아이', 'super');
