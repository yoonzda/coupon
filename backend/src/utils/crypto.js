const crypto = require('crypto');

const SECRET = process.env.APP_PHONE_SALT || 'ongjin_coupon_secure_key_2026';

/**
 * 전화번호 단방향 암호화 (SHA-256 + APP_PHONE_SALT)
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
 * 쿠폰 코드 단방향 암호화
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
 */
function generateOTP() {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * 랜덤 토큰 생성
 */
function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * 배정 ID 난수 암호화 (URL 보안 파라미터 전용)
 */
function encodeSecureToken(id) {
  try {
    const key = crypto.scryptSync(SECRET, 'ongjinsalt', 32);
    const iv = Buffer.alloc(16, 0);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(String(id), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (e) {
    return String(id);
  }
}

/**
 * 난수 암호화 복호화 (오직 검증된 AES-256 보안 토큰만 허용, 단순 숫자 ID 접근 완벽 차단)
 */
function decodeSecureToken(token) {
  if (!token) return null;
  // 단순 숫자로 접근하려는 어뷰징 시도는 보안을 위해 무조건 거부 (하위 호환 허점 전면 폐기)
  if (!isNaN(token)) return null;
  try {
    const key = crypto.scryptSync(SECRET, 'ongjinsalt', 32);
    const iv = Buffer.alloc(16, 0);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(token, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    const parsedId = parseInt(decrypted);
    return isNaN(parsedId) ? null : parsedId;
  } catch (e) {
    return null;
  }
}

module.exports = { hashPhone, hashCouponCode, generateOTP, generateToken, encodeSecureToken, decodeSecureToken };
