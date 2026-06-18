USE ongjin_coupon_db;

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key   VARCHAR(50) PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO system_settings (setting_key, setting_value) 
VALUES ('total_budget', '0') 
ON DUPLICATE KEY UPDATE setting_value = setting_value;
