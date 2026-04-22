USE ongjin_coupon_db;

-- 초기 관리자 계정 (비밀번호: admin1234 - 실제 운영 시 변경 권장)
INSERT INTO admins (username, password_hash, name, role) VALUES 
('admin', '$2b$10$7zB3E7XzN6o6jL6R7F8Y8eO5p/Z/6L7X7Z7Z7Z7Z7Z7Z7Z7Z7Z7Z7', '최고관리자', 'super');
