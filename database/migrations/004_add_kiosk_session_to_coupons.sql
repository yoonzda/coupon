USE ongjin_coupon_db;

-- coupons 테이블에 kiosk_session_id 컬럼 추가 (비접촉 완료 상태 폴링을 위한 세션 식별자)
ALTER TABLE coupons 
ADD COLUMN kiosk_session_id VARCHAR(50) NULL AFTER issuer_allocation_id;
