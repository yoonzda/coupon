const pool = require('./src/config/database');
(async () => {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN status ENUM('active', 'withdrawn', 'suspended') DEFAULT 'active'`);
    console.log('Added status col');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('status col already exists');
    else throw e;
  }
  
  await pool.query(`
    INSERT IGNORE INTO users (social_provider, provider_id, nickname, email, phone_hash, coupon_balance, status) VALUES 
    ('kakao', 'k12345', '김관광', 'kimg@kakao.com', 'hash1', 50000, 'active'),
    ('naver', 'n12345', '이바다', 'lee@naver.com', 'hash2', 10000, 'active'),
    ('google', 'g12345', '박여름', 'park@gmail.com', 'hash3', 0, 'withdrawn'),
    ('kakao', 'k54321', '최서해', 'choi@kakao.com', 'hash4', 15000, 'suspended'),
    ('naver', 'n54321', '정백령', 'jung@naver.com', 'hash5', 100000, 'active')
  `);
  console.log('Added dummy users');
  process.exit(0);
})();
