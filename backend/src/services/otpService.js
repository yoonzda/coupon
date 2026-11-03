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
  
  // 1. 기존 미사용 세션 즉시 만료 처리 (중첩 유효 방지)
  await pool.execute(
    `UPDATE otp_sessions SET used = 1 WHERE phone_hash = ? AND used = 0`,
    [phoneHash]
  );

  // 2. 신규 OTP 세션 발급
  await pool.execute(
    `INSERT INTO otp_sessions (phone_hash, otp_code, expires_at, used)
     VALUES (?, ?, ?, 0)`,
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
     ORDER BY id DESC LIMIT 1`,
    [phoneHash, otp]
  );

  if (rows.length === 0) {
    logger.warn(`가맹점 OTP 검증 실패 [${phoneHash.slice(0, 8)}...]`);
    return null;
  }

  // 성공 즉시 1회용 사용 처리 (재사용 방지)
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
