USE ongjin_coupon_db;

-- merchants 테이블에 알림 전송을 위한 휴대폰 평문 번호와 반려 사유 컬럼 추가
ALTER TABLE merchants 
ADD COLUMN phone VARCHAR(20) AFTER name,
ADD COLUMN rejection_reason TEXT AFTER status;

-- 기존 데이터 중 phone_hash만 있는 경우를 위해 (필요 시 처리)
-- 실제 운영 환경이라면 신청 시점에 phone을 평문으로도 저장하도록 로직 수정 필요
