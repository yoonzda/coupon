const pool = require('../config/database');

/**
 * 소셜 로그인 후 회원 Find-or-Create
 * @param {{ provider, providerId, nickname, email }} profile
 */
async function findOrCreateSocialUser({ provider, providerId, nickname, email }) {
  const [existing] = await pool.execute(
    `SELECT * FROM users WHERE social_provider = ? AND provider_id = ? LIMIT 1`,
    [provider, providerId]
  );

  if (existing.length > 0) return existing[0];

  const [result] = await pool.execute(
    `INSERT INTO users (social_provider, provider_id, nickname, email) VALUES (?, ?, ?, ?)`,
    [provider, providerId, nickname || null, email || null]
  );

  return {
    id: result.insertId,
    social_provider: provider,
    provider_id: providerId,
    nickname,
    email,
    role: 'tourist',
  };
}

module.exports = { findOrCreateSocialUser };
