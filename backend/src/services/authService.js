const pool = require('../config/database');
const { hashPhone } = require('../utils/crypto');

/**
 * 임시 식별자(해시, 난수, 미연동 계정) 여부 판정
 * @param {string} name 
 * @returns {boolean}
 */
function isPlaceholderNickname(name) {
  if (!name || typeof name !== 'string') return true;
  const trimmed = name.trim();
  if (!trimmed || trimmed === '미연동 계정') return true;
  // '네이버회원#xxxx', '카카오회원#xxxx', '구글회원#xxxx' 등 해시코드 형태 검출
  if (/^(네이버회원|카카오회원|구글회원|소셜회원)#/i.test(trimmed)) return true;
  return false;
}

/**
 * 소셜 로그인 사용자 표시 이름 결정
 * 우선순위: 실제 이름/닉네임 > 이메일 아이디(nuri) > 깔끔한 기본 호칭(네이버 회원)
 */
function resolveSocialNickname(rawNickname, email, provider) {
  const defaultProviderNames = {
    kakao: '카카오 회원',
    naver: '네이버 회원',
    google: '구글 회원',
    phone: '회원',
  };
  const providerLabel = defaultProviderNames[provider] || '회원';

  // 1순위: 실제 실명 또는 닉네임
  if (!isPlaceholderNickname(rawNickname)) {
    return rawNickname.trim();
  }

  // 2순위: 이메일 계정의 ID 부분 (예: nuri@nuri-i.co.kr -> nuri)
  if (email && typeof email === 'string' && email.includes('@')) {
    const emailPrefix = email.split('@')[0].trim();
    if (emailPrefix) return emailPrefix;
  }

  // 3순위: 기계적인 난수(#xxxx)를 제거한 단정한 기본 명칭
  return providerLabel;
}

/**
 * 동일 휴대폰 번호 해시(phone_hash)를 가진 모든 로그인 계정(휴대폰·카카오·네이버)의 쿠폰 잔액을 동기화
 */
async function syncUnifiedWalletByPhoneHash(userId, phoneHash) {
  if (!phoneHash) return;
  try {
    const [[balRow]] = await pool.execute(
      `SELECT COALESCE(SUM(c.face_value), 0) AS total_bal
       FROM coupons c
       WHERE c.status = 'available'
         AND (c.issued_to = ? OR c.issued_to IN (SELECT u.id FROM users u WHERE u.phone_hash = ?))`,
      [userId, phoneHash]
    );
    const totalBal = Number(balRow?.total_bal || 0);
    await pool.execute(
      `UPDATE users SET coupon_balance = ? WHERE phone_hash = ? OR id = ?`,
      [totalBal, phoneHash, userId]
    );
  } catch (err) {
    console.error('[syncUnifiedWalletByPhoneHash Error]', err);
  }
}

/**
 * 소셜 로그인 후 회원 Find-or-Create
 * @param {{ provider, providerId, nickname, email, phone }} profile
 */
async function findOrCreateSocialUser({ provider, providerId, nickname, email, phone }) {
  const effectiveNickname = resolveSocialNickname(nickname, email, provider);
  const digits = String(phone || '').replace(/\D/g, '');
  const formattedPhone = digits.length >= 10 ? digits.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3') : null;
  const phoneHash = digits.length >= 10 ? hashPhone(digits) : null;

  const [existing] = await pool.execute(
    `SELECT * FROM users WHERE social_provider = ? AND provider_id = ? LIMIT 1`,
    [provider, providerId]
  );

  if (existing.length > 0) {
    const user = existing[0];
    
    // 기존 사용자의 닉네임이 임시/해시값이거나 이메일/전화번호가 누락된 경우 자동 업그레이드
    const needNicknameUpdate = isPlaceholderNickname(user.nickname) && !isPlaceholderNickname(effectiveNickname);
    const needEmailUpdate = !user.email && email;
    const needPhoneUpdate = formattedPhone && (!user.phone || !user.phone_hash);

    if (needNicknameUpdate || needEmailUpdate || needPhoneUpdate) {
      const updatedNickname = needNicknameUpdate ? effectiveNickname : user.nickname;
      const updatedEmail = needEmailUpdate ? email : user.email;
      const updatedPhone = needPhoneUpdate ? formattedPhone : user.phone;
      const updatedPhoneHash = needPhoneUpdate ? phoneHash : user.phone_hash;
      await pool.execute(
        `UPDATE users SET nickname = ?, email = ?, phone = ?, phone_hash = ? WHERE id = ?`,
        [updatedNickname, updatedEmail, updatedPhone, updatedPhoneHash, user.id]
      );
      user.nickname = updatedNickname;
      user.email = updatedEmail;
      user.phone = updatedPhone;
      user.phone_hash = updatedPhoneHash;
    }
    if (user.phone_hash) {
      await syncUnifiedWalletByPhoneHash(user.id, user.phone_hash);
    }
    return user;
  }

  const [result] = await pool.execute(
    `INSERT INTO users (social_provider, provider_id, nickname, email, phone, phone_hash, coupon_balance, role) VALUES (?, ?, ?, ?, ?, ?, 0, 'tourist')`,
    [provider, providerId, effectiveNickname, email || null, formattedPhone, phoneHash]
  );

  if (phoneHash) {
    await syncUnifiedWalletByPhoneHash(result.insertId, phoneHash);
  }

  return {
    id: result.insertId,
    social_provider: provider,
    provider_id: providerId,
    nickname: effectiveNickname,
    email: email || null,
    phone: formattedPhone,
    phone_hash: phoneHash,
    coupon_balance: 0,
    role: 'tourist',
  };
}

/**
 * 로그인 이력 기록 및 유저 접속 정보 갱신
 * @param {number} userId 
 * @param {'kakao'|'naver'|'google'|'phone'} provider 
 * @param {object} req Express request
 */
async function recordUserLogin(userId, provider, req) {
  if (!userId) return;
  try {
    const rawIp = req?.headers?.['x-forwarded-for'] || req?.ip || req?.socket?.remoteAddress || '';
    const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim().replace(/^::ffff:/, '') : null;
    const userAgent = req?.headers?.['user-agent'] ? String(req.headers['user-agent']).substring(0, 255) : null;

    // 1. 유저 접속 정보 갱신 (탈퇴 상태였던 경우 active로 복구)
    await pool.execute(
      `UPDATE users 
       SET last_login_at = NOW(),
           last_login_ip = ?,
           login_count = COALESCE(login_count, 0) + 1,
           status = 'active',
           withdrawn_at = NULL,
           withdrawn_reason = NULL
       WHERE id = ?`,
      [clientIp, userId]
    );

    // 탈퇴 상태에서 복귀한 경우 유효 쿠폰 및 잔액 복구 동기화
    await pool.execute(
      `UPDATE coupons 
       SET status = 'available' 
       WHERE issued_to = ? AND status = 'cancelled' AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );
    const [[balRow]] = await pool.execute(
      `SELECT COALESCE(SUM(face_value), 0) AS total_bal FROM coupons WHERE issued_to = ? AND status = 'available'`,
      [userId]
    );
    await pool.execute(
      `UPDATE users SET coupon_balance = ? WHERE id = ?`,
      [balRow.total_bal, userId]
    );

    // 2. 로그인 로그 테이블에 저장
    await pool.execute(
      `INSERT INTO user_login_logs (user_id, provider, ip_address, user_agent, login_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, provider, clientIp, userAgent]
    );
  } catch (err) {
    console.error(`[recordUserLogin Error] user_id: ${userId}, provider: ${provider}`, err);
  }
}

module.exports = { findOrCreateSocialUser, isPlaceholderNickname, resolveSocialNickname, recordUserLogin, syncUnifiedWalletByPhoneHash };
