const pool = require('../config/database');
const logger = require('../utils/logger');

const OTP_TTL_SECONDS = 180; // 3분

/**
 * OTP 저장 (DB 기반, Redis 미사용 시)
 * @param {string} phoneHash
 * @param {string} otp
 */
async function saveOTP(phoneHash, otp) {
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
  await pool.execute(
    `INSERT INTO otp_sessions (phone_hash, otp_code, expires_at)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE otp_code = VALUES(otp_code), expires_at = VALUES(expires_at), used = 0`,
    [phoneHash, otp, expiresAt]
  );
}

/**
 * OTP 검증 — 유효하면 해당 가맹점 반환, 실패 시 null
 * @param {string} phoneHash
 * @param {string} otp
 * @returns {object|null} merchant
 */
async function verifyOTP(phoneHash, otp) {
  const [rows] = await pool.execute(
    `SELECT * FROM otp_sessions
     WHERE phone_hash = ? AND otp_code = ? AND expires_at > NOW() AND used = 0
     LIMIT 1`,
    [phoneHash, otp]
  );

  if (rows.length === 0) return null;

  // 사용 처리
  await pool.execute(
    `UPDATE otp_sessions SET used = 1 WHERE id = ?`,
    [rows[0].id]
  );

  // 가맹점 조회 (승인된 가맹점만 로그인 허용)
  const [merchants] = await pool.execute(
    `SELECT * FROM merchants WHERE phone_hash = ? AND status = 'approved' LIMIT 1`,
    [phoneHash]
  );

  return merchants[0] || null;
}

module.exports = { saveOTP, verifyOTP };
