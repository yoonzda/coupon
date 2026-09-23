USE ongjin_coupon_db;

ALTER TABLE issuers 
ADD COLUMN phone VARCHAR(50) NULL AFTER name,
ADD COLUMN address VARCHAR(255) NULL AFTER phone;
