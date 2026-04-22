const crypto = require('crypto');

/**
 * 전화번호 단방향 암호화 (SHA-256 + APP_PHONE_SALT)
 * 원문은 절대 DB에 저장하지 않는다.
 * @param {string} phone - 정규화된 전화번호 (숫자만, 예: '01012345678')
 * @returns {string} hex digest
 */
function hashPhone(phone) {
  const normalized = phone.replace(/\D/g, '');
  const salt = process.env.APP_PHONE_SALT || '';
  return crypto
    .createHash('sha256')
    .update(`${normalized}${salt}`)
    .digest('hex');
}

/**
 * 쿠폰 코드 단방향 암호화 (동일 알고리즘 사용)
 * @param {string} code
 * @returns {string}
 */
function hashCouponCode(code) {
  const salt = process.env.APP_PHONE_SALT || '';
  return crypto
    .createHash('sha256')
    .update(`COUPON_${code}${salt}`)
    .digest('hex');
}

/**
 * OTP 6자리 생성
 * @returns {string}
 */
function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * 랜덤 토큰 생성 (URL-safe)
 * @param {number} bytes
 * @returns {string}
 */
function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { hashPhone, hashCouponCode, generateOTP, generateToken };
