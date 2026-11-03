const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const { generateOTP, hashPhone } = require('../utils/crypto');
const { saveOTP, verifyOTP } = require('../services/otpService');
const { sendSMS } = require('../services/smsService');
const { findOrCreateSocialUser, resolveSocialNickname, isPlaceholderNickname, recordUserLogin, syncUnifiedWalletByPhoneHash } = require('../services/authService');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const pool = require('../config/database');


const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10분
  max: 10, // 동일 IP 기준 10분당 10회 (공용 Wi-Fi 및 연속 로그인 테스트 배려)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'OTP 요청 한도 초과. 10분 후 다시 시도해 주세요.' },
});

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10, // 1분당 10회 검증 시도 허용
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '인증 시도 횟수 초과. 1분 후 다시 시도해 주세요.' },
});

// ── JWT 발급 헬퍼 ─────────────────────────────────
function issueTokens(payload) {
  const secret = process.env.JWT_SECRET || 'ongjin_local_jwt_secret_key_12345';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || secret;
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('보안 오류: 운영 환경에서는 JWT_SECRET 환경변수가 반드시 설정되어야 합니다.');
  }

  const isMerchant = payload.role === 'merchant';
  const accessExpiresIn = isMerchant ? '12h' : (process.env.JWT_EXPIRES_IN || '2h');
  const refreshExpiresIn = isMerchant ? '12h' : (process.env.JWT_REFRESH_EXPIRES_IN || '90d');

  const accessToken = jwt.sign(payload, secret, {
    expiresIn: accessExpiresIn,
  });
  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: refreshExpiresIn,
  });
  return { accessToken, refreshToken };
}

// ── 관광객 프로필 포맷터 (식별 닉네임 정제 및 자동 치유) ────
async function formatTouristProfile(user, dbPool) {
  let displayName = user.nickname;
  let providerLabel = '간편로그인';

  if (user.social_provider === 'phone') {
    providerLabel = '휴대폰 간편로그인';
    displayName = user.nickname || user.provider_id;
  } else {
    const defaultLabels = {
      kakao: '카카오 간편로그인',
      naver: '네이버 간편로그인',
      google: '구글 로그인',
    };
    providerLabel = defaultLabels[user.social_provider] || '간편로그인';

    // 닉네임이 없거나 임시 식별값(네이버회원#xxxx 등)인 경우 자연스러운 호칭으로 치유
    if (isPlaceholderNickname(displayName)) {
      const fixedName = resolveSocialNickname(null, user.email, user.social_provider);
      displayName = fixedName;
      if (dbPool && user.id) {
        dbPool.execute('UPDATE users SET nickname = ? WHERE id = ?', [fixedName, user.id]).catch(() => {});
      }
    }
  }

  const formattedDisplay = displayName && displayName.endsWith('님') ? displayName : `${displayName || '회원'}님`;
  const unifiedPhone = user.phone || (user.social_provider === 'phone' ? user.provider_id : null);

  return {
    id: user.id,
    nickname: displayName,
    display_name: formattedDisplay,
    raw_name: displayName,
    social_provider: user.social_provider,
    provider_label: providerLabel,
    email: user.email || null,
    phone: unifiedPhone,
    needs_phone_link: !unifiedPhone,
    coupon_balance: user.coupon_balance ?? 0,
    role: user.role,
    status: user.status || 'active',
    created_at: user.created_at || null,
  };
}

// ════════════════════════════════════════════════
// 소셜 OAuth (관광객)
// ════════════════════════════════════════════════

// OAuth 키 유효성 확인 헬퍼
function isConfigured(key) {
  return key && !key.includes('dummy') && !key.includes('your_') && key.trim().length > 5;
}

// 카카오
router.get('/kakao', (req, res, next) => {
  if (!isConfigured(process.env.KAKAO_CLIENT_ID)) {
    return res.redirect('/tourist/index.html?error=kakao');
  }
  passport.authenticate('kakao', { session: false })(req, res, next);
});
router.get('/kakao/callback',
  (req, res, next) => {
    passport.authenticate('kakao', { session: false, failureRedirect: '/tourist/index.html?error=kakao' })(req, res, next);
  },
  async (req, res) => {
    if (req.user && req.user.id) {
      await recordUserLogin(req.user.id, 'kakao', req);
    }
    const tokens = issueTokens({ id: req.user.id, role: 'tourist' });
    res.redirect(`/tourist/auth-callback.html?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
  }
);

// 네이버
router.get('/naver', (req, res, next) => {
  if (!isConfigured(process.env.NAVER_CLIENT_ID)) {
    return res.redirect('/tourist/index.html?error=naver');
  }
  passport.authenticate('naver', { session: false })(req, res, next);
});
router.get('/naver/callback',
  (req, res, next) => {
    passport.authenticate('naver', { session: false, failureRedirect: '/tourist/index.html?error=naver' })(req, res, next);
  },
  async (req, res) => {
    if (req.user && req.user.id) {
      await recordUserLogin(req.user.id, 'naver', req);
    }
    const tokens = issueTokens({ id: req.user.id, role: 'tourist' });
    res.redirect(`/tourist/auth-callback.html?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
  }
);

// 구글
router.get('/google', (req, res, next) => {
  if (!isConfigured(process.env.GOOGLE_CLIENT_ID)) {
    return res.redirect('/tourist/index.html?error=google');
  }
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })(req, res, next);
});
router.get('/google/callback',
  (req, res, next) => {
    passport.authenticate('google', { session: false, failureRedirect: '/tourist/index.html?error=google' })(req, res, next);
  },
  async (req, res) => {
    if (req.user && req.user.id) {
      await recordUserLogin(req.user.id, 'google', req);
    }
    const tokens = issueTokens({ id: req.user.id, role: 'tourist' });
    res.redirect(`/tourist/auth-callback.html?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
  }
);

// ════════════════════════════════════════════════
// 가맹점 Zero-Password (상점명 + 전화번호 + OTP)
// ════════════════════════════════════════════════

// OTP 요청 (가맹점 사전 검증 포함)
router.post('/merchant/otp/send',
  otpLimiter,
  [
    body('phone').matches(/^01[0-9]{8,9}$/).withMessage('올바른 휴대폰 번호를 입력해 주세요.'),
    body('shopName').optional().trim(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, shopName } = req.body;
    try {
      const phoneHash = hashPhone(phone);

      // 1. 등록된 가맹점인지 및 승인 상태 사전 검증 (SMS 비용 공격 및 오인 락다운 방어)
      const [merchants] = await pool.execute(
        'SELECT id, name, status, rejection_reason FROM merchants WHERE phone_hash = ? LIMIT 1',
        [phoneHash]
      );

      if (merchants.length === 0) {
        return res.status(404).json({
          success: false,
          message: '등록되지 않은 가맹점 연락처입니다. 먼저 입점 신청을 진행해 주세요.'
        });
      }

      const merchant = merchants[0];
      if (merchant.status === 'pending') {
        return res.status(403).json({
          success: false,
          message: '가맹점 입점 심사가 진행 중입니다. 군청 승인 완료 후 문자가 발송되며 이후 로그인이 가능합니다.'
        });
      }
      if (merchant.status === 'rejected') {
        return res.status(403).json({
          success: false,
          message: `가맹점 입점이 반려되었습니다. (사유: ${merchant.rejection_reason || '서류 보완 필요'})`
        });
      }
      if (merchant.status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: '이용이 일시 정지된 가맹점입니다. 옹진군 관리자에게 문의해 주세요.'
        });
      }

      const otp = generateOTP();
      await saveOTP(phoneHash, otp);
      await sendSMS(phone, `[옹진관광] 가맹점 인증번호는 [${otp}]입니다. 3분 내 입력해 주세요.`);
      logger.info(`OTP 발송 성공 — 상점: ${shopName || merchant.name} [${phoneHash.slice(0, 8)}...]`);
      res.json({ success: true, message: '인증번호가 발송되었습니다.' });
    } catch (err) {
      next(err);
    }
  }
);

// OTP 검증 + JWT 발급
router.post('/merchant/otp/verify',
  verifyLimiter,
  [
    body('phone').matches(/^01[0-9]{8,9}$/).withMessage('올바른 휴대폰 번호를 입력해 주세요.'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('6자리 숫자를 입력해 주세요.'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, otp } = req.body;
    try {
      const phoneHash = hashPhone(phone);
      const merchant = await verifyOTP(phoneHash, otp);
      if (!merchant) {
        return res.status(401).json({ success: false, message: '인증번호가 일치하지 않거나 유효시간(3분)이 만료되었습니다.' });
      }
      const tokens = issueTokens({ id: merchant.id, role: 'merchant', shopName: merchant.name });
      res.json({
        success: true,
        token: tokens.accessToken,
        refresh: tokens.refreshToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        merchant: {
          id: merchant.id,
          name: merchant.name,
          username: merchant.username || merchant.name
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 가맹점 아이디/비밀번호 로그인 ──
router.post('/merchant/login',
  [
    body('username').trim().notEmpty().withMessage('아이디를 입력해 주세요.'),
    body('password').notEmpty().withMessage('비밀번호를 입력해 주세요.')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, password } = req.body;
    const pool = require('../config/database');
    const bcrypt = require('bcryptjs');
    try {
      const cleanIdent = String(username || '').trim();
      const cleanDigits = cleanIdent.replace(/\D/g, '');
      const storeIdMatch = cleanIdent.match(/^store(\d+)$/i);
      const storeIdParam = storeIdMatch ? parseInt(storeIdMatch[1], 10) : -1;

      const [merchants] = await pool.execute(
        `SELECT id, name, username, password_hash, status
         FROM merchants
         WHERE username = ?
            OR name = ?
            OR id = ?
            OR (? != '' AND (REPLACE(phone, '-', '') = ? OR REPLACE(COALESCE(store_phone, ''), '-', '') = ?))
         LIMIT 1`,
        [cleanIdent, cleanIdent, storeIdParam, cleanDigits, cleanDigits, cleanDigits]
      );

      const merchant = merchants[0];
      if (!merchant) {
        return res.status(401).json({ success: false, message: '등록되지 않은 가맹점 아이디이거나 비밀번호가 틀립니다.' });
      }

      if (merchant.status !== 'approved') {
        return res.status(403).json({ success: false, message: '아직 승인 대기 중이거나 정지된 가맹점 계정입니다.' });
      }

      let match = false;
      if (merchant.password_hash) {
        match = await bcrypt.compare(password, merchant.password_hash);
      }
      if (!match) {
        return res.status(401).json({ success: false, message: '등록되지 않은 가맹점 아이디이거나 비밀번호가 틀립니다.' });
      }

      const tokens = issueTokens({ id: merchant.id, role: 'merchant' });
      res.json({
        success: true,
        token: tokens.accessToken,
        refresh: tokens.refreshToken,
        merchant: {
          id: merchant.id,
          name: merchant.name,
          username: merchant.username || merchant.name,
          status: merchant.status
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ════════════════════════════════════════════════
// 가맹점 직원 스캔 전용 모드 (4자리 PIN 간편 로그인)
// ════════════════════════════════════════════════
router.post('/merchant/staff-login',
  verifyLimiter,
  [
    body('identifier').trim().notEmpty().withMessage('매장 번호 또는 대표자 휴대폰 번호를 입력해 주세요.'),
    body('pin').matches(/^\d{4}$/).withMessage('4자리 숫자 PIN 번호를 입력해 주세요.')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    }

    const { identifier, pin } = req.body;
    const bcrypt = require('bcryptjs');

    try {
      let merchant = null;
      const cleanIdent = identifier.trim();
      const cleanDigits = cleanIdent.replace(/[^0-9]/g, '');

      // 1) 순수 숫자 1~6자리: 매장 ID로 먼저 조회 시도
      if (/^\d{1,6}$/.test(cleanIdent)) {
        const [rows] = await pool.execute(
          `SELECT id, name, username, phone, status, staff_pin_hash, staff_pin_enabled FROM merchants WHERE id = ? LIMIT 1`,
          [parseInt(cleanIdent, 10)]
        );
        if (rows.length > 0) merchant = rows[0];
      }

      // 2) 매장 ID로 못 찾았거나 전화번호 형태(9자리 이상 숫자): 대표자 휴대폰 해시로 조회
      if (!merchant && cleanDigits.length >= 9) {
        const phoneHash = hashPhone(cleanDigits);
        const [rows] = await pool.execute(
          `SELECT id, name, username, phone, status, staff_pin_hash, staff_pin_enabled FROM merchants WHERE phone_hash = ? LIMIT 1`,
          [phoneHash]
        );
        if (rows.length > 0) merchant = rows[0];
      }

      // 3) 상호명 또는 아이디로 조회
      if (!merchant) {
        const [rows] = await pool.execute(
          `SELECT id, name, username, phone, status, staff_pin_hash, staff_pin_enabled FROM merchants WHERE name = ? OR username = ? LIMIT 1`,
          [cleanIdent, cleanIdent]
        );
        if (rows.length > 0) merchant = rows[0];
      }

      if (!merchant) {
        return res.status(404).json({
          success: false,
          message: '일치하는 가맹점을 찾을 수 없습니다. 매장 번호 또는 대표자 번호를 확인해 주세요.'
        });
      }

      if (merchant.status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: '아직 승인 대기 중이거나 정지된 가맹점입니다.'
        });
      }

      if (!merchant.staff_pin_enabled || !merchant.staff_pin_hash) {
        return res.status(403).json({
          success: false,
          message: `'${merchant.name}' 가맹점은 직원 간편 PIN 로그인이 설정되지 않았습니다. 점주님께 설정을 요청해 주세요.`
        });
      }

      const match = await bcrypt.compare(pin, merchant.staff_pin_hash);
      if (!match) {
        return res.status(401).json({
          success: false,
          message: '직원 PIN 번호 4자리가 일치하지 않습니다.'
        });
      }

      // 직원 전용 토큰 발급 (role: 'merchant_staff')
      const tokens = issueTokens({
        id: merchant.id,
        role: 'merchant_staff',
        shopName: merchant.name,
        isStaff: true
      });

      logger.info(`[Staff Login] 가맹점 직원 로그인 성공 — 상점: ${merchant.name} (ID: ${merchant.id})`);

      res.json({
        success: true,
        token: tokens.accessToken,
        refresh: tokens.refreshToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        merchant: {
          id: merchant.id,
          name: merchant.name,
          username: merchant.username || merchant.name,
          role: 'merchant_staff',
          isStaff: true
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/test-tourist-login (개발/테스트용 - 운영 환경 차단) ──
router.post('/test-tourist-login', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: '운영 환경에서는 테스트 로그인을 사용할 수 없습니다.' });
  }

  const pool = require('../config/database');
  try {
    // 테스트용 관광객 유저가 DB에 있는지 확인
    let [users] = await pool.execute(
      `SELECT id, nickname, role FROM users WHERE role = 'tourist' LIMIT 1`
    );

    let user = users[0];

    // 없으면 새로 삽입
    if (!user) {
      const [insertResult] = await pool.execute(
        `INSERT INTO users (nickname, role, coupon_balance) VALUES (?, 'tourist', 0)`,
        ['옹진여행자(테스트)']
      );
      user = { id: insertResult.insertId, nickname: '옹진여행자(테스트)', role: 'tourist' };
    }

    const tokens = issueTokens({ id: user.id, role: 'tourist' });
    res.json({
      success: true,
      token: tokens.accessToken,
      refresh: tokens.refreshToken,
      user
    });
  } catch (err) {
    next(err);
  }
});

// ── 관광객 휴대폰 OTP 발송 (Rate Limit 적용) ──
router.post('/tourist/otp/send',
  otpLimiter,
  [
    body('phone').matches(/^01[0-9]{8,9}$/).withMessage('올바른 휴대폰 번호를 입력해 주세요.')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone } = req.body;
    try {
      const otp = generateOTP();
      const phoneHash = hashPhone(phone);
      await saveOTP(phoneHash, otp);
      
      // 실제 SMS 발송 시도
      await sendSMS(phone, `[옹진관광] 인증번호는 [${otp}]입니다. 3분 내 입력해 주세요.`);
      
      // 개발 환경이거나 NHN Cloud 미세팅 상태 시 프론트에서 자동 입력/확인할 수 있게 OTP 제공
      const appKey = process.env.NHN_SMS_APP_KEY;
      const isDev = !appKey || appKey.includes('YOUR_') || process.env.NODE_ENV !== 'production';
      
      logger.info(`관광객 OTP 발송 — 휴대폰: ${phone} (${phoneHash.slice(0, 8)}...) [DEV_OTP: ${otp}]`);
      
      res.json({
        success: true,
        message: '인증번호가 발송되었습니다.',
        devOtp: isDev ? otp : null
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 관광객 휴대폰 OTP 검증 & 로그인 (Rate Limit 적용) ──
router.post('/tourist/otp/verify',
  verifyLimiter,
  [
    body('phone').matches(/^01[0-9]{8,9}$/).withMessage('올바른 휴대폰 번호를 입력해 주세요.'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('인증번호 6자리를 입력해 주세요.')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, otp } = req.body;
    const pool = require('../config/database');
    try {
      const phoneHash = hashPhone(phone);
      
      // 1. OTP 검증
      const [sessions] = await pool.execute(
        `SELECT * FROM otp_sessions
         WHERE phone_hash = ? AND otp_code = ? AND expires_at > NOW() AND used = 0
         LIMIT 1`,
        [phoneHash, otp]
      );

      if (sessions.length === 0) {
        return res.status(401).json({ success: false, message: '인증번호가 일치하지 않거나 만료되었습니다.' });
      }

      // 2. 사용 처리
      await pool.execute(
        `UPDATE otp_sessions SET used = 1 WHERE id = ?`,
        [sessions[0].id]
      );

      // 3. 사용자 조회 또는 신규 생성 (소셜 연동 대신 휴대폰 번호 기반 가입)
      const formattedPhone = phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
      
      let [users] = await pool.execute(
        `SELECT id, nickname, role, simple_pin FROM users WHERE social_provider = 'phone' AND provider_id = ? LIMIT 1`,
        [formattedPhone]
      );

      let user = users[0];

      if (!user) {
        // 닉네임으로 휴대폰 번호(예: 010-1234-5678)를 저장하여 관리자 화면에 그대로 보이도록 함
        const [insertResult] = await pool.execute(
          `INSERT INTO users (social_provider, provider_id, phone, nickname, phone_hash, coupon_balance, role)
           VALUES ('phone', ?, ?, ?, ?, 0, 'tourist')`,
          [formattedPhone, formattedPhone, formattedPhone, phoneHash]
        );
        user = {
          id: insertResult.insertId,
          nickname: formattedPhone,
          display_name: `${formattedPhone}님`,
          phone: formattedPhone,
          social_provider: 'phone',
          provider_label: '휴대폰 간편로그인',
          role: 'tourist',
          hasPin: false
        };
      } else {
        // phone 컬럼 보정 및 문자인증 성공 시 PIN 실패 카운트/잠금 초기화
        await pool.execute('UPDATE users SET phone = ?, phone_hash = ?, pin_fail_count = 0, pin_locked_until = NULL WHERE id = ?', [formattedPhone, phoneHash, user.id]).catch(() => {});
        user = {
          id: user.id,
          nickname: user.nickname || formattedPhone,
          display_name: `${user.nickname || formattedPhone}님`,
          phone: formattedPhone,
          social_provider: 'phone',
          provider_label: '휴대폰 간편로그인',
          role: 'tourist',
          hasPin: !!user.simple_pin
        };
      }

      // 4. 동일 휴대폰 번호 해시(phone_hash) 계정 간 쿠폰 지갑 잔액 동기화 및 로그인 기록 갱신
      await syncUnifiedWalletByPhoneHash(user.id, phoneHash);
      await recordUserLogin(user.id, 'phone', req);

      // 5. JWT 토큰 발급
      const tokens = issueTokens({ id: user.id, role: 'tourist' });
      res.json({
        success: true,
        token: tokens.accessToken,
        refresh: tokens.refreshToken,
        hasPin: user.hasPin,
        user
      });

    } catch (err) {
      next(err);
    }
  }
);

// ── 관광객 로그인 후 휴대폰 번호 연동 (소셜 로그인 계정에 전화번호 추가) ──
router.post('/tourist/link-phone',
  authenticate,
  verifyLimiter,
  [
    body('phone').matches(/^01[0-9]{8,9}$/).withMessage('올바른 휴대폰 번호를 입력해 주세요.'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('인증번호 6자리를 입력해 주세요.')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { phone, otp } = req.body;
    // 관광객 토큰만 허용 (가맹점/관리자 토큰으로 users 행이 잘못 갱신되는 것 방지)
    if (!req.user || (req.user.role && req.user.role !== 'tourist')) {
      return res.status(403).json({ success: false, message: '관광객 계정만 휴대폰 번호를 연동할 수 있습니다.' });
    }
    try {
      const cleanDigits = phone.replace(/\D/g, '');
      const formattedPhone = cleanDigits.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
      const phoneHash = hashPhone(cleanDigits);

      // 1. OTP 검증
      const [sessions] = await pool.execute(
        `SELECT * FROM otp_sessions
         WHERE phone_hash = ? AND otp_code = ? AND expires_at > NOW() AND used = 0
         LIMIT 1`,
        [phoneHash, otp]
      );
      if (sessions.length === 0) {
        return res.status(401).json({ success: false, message: '인증번호가 일치하지 않거나 만료되었습니다.' });
      }
      await pool.execute(`UPDATE otp_sessions SET used = 1 WHERE id = ?`, [sessions[0].id]);

      // 2. 현재 로그인 사용자(req.user.id)에 휴대폰 번호 연동 및 통합 지갑 동기화
      await pool.execute(
        `UPDATE users SET phone = ?, phone_hash = ? WHERE id = ?`,
        [formattedPhone, phoneHash, req.user.id]
      );
      await syncUnifiedWalletByPhoneHash(req.user.id, phoneHash);

      logger.info(`[Auth] 관광객 휴대폰 번호 연동 완료: user=${req.user.id} (${phoneHash.slice(0, 8)}...)`);

      res.json({
        success: true,
        message: '휴대폰 번호가 성공적으로 연동되었습니다.',
        data: { phone: formattedPhone }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 관광객 휴대폰 번호 가입 및 PIN 설정 여부 조회 ──
router.post('/tourist/check-phone',
  [
    body('phone').matches(/^01[0-9]{8,9}$/).withMessage('올바른 휴대폰 번호를 입력해 주세요.')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: '올바른 휴대폰 번호를 입력해 주세요.' });
    }

    const { phone } = req.body;
    try {
      const formattedPhone = phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
      const [users] = await pool.execute(
        `SELECT id, simple_pin, pin_fail_count, pin_locked_until 
         FROM users 
         WHERE social_provider = 'phone' AND provider_id = ? 
         LIMIT 1`,
        [formattedPhone]
      );

      if (users.length === 0) {
        return res.json({
          success: true,
          registered: false,
          hasPin: false,
          isLocked: false
        });
      }

      const user = users[0];
      const isLocked = Boolean(user.pin_locked_until && new Date(user.pin_locked_until) > new Date());

      res.json({
        success: true,
        registered: true,
        hasPin: Boolean(user.simple_pin),
        isLocked: isLocked,
        failCount: user.pin_fail_count || 0
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 관광객 4자리 간편비밀번호(PIN) 로그인 (Rate Limit 적용) ──
router.post('/tourist/pin/login',
  verifyLimiter,
  [
    body('phone').matches(/^01[0-9]{8,9}$/).withMessage('올바른 휴대폰 번호를 입력해 주세요.'),
    body('pin').matches(/^[0-9]{4}$/).withMessage('4자리 숫자 비밀번호를 입력해 주세요.')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { phone, pin } = req.body;
    const bcrypt = require('bcryptjs');

    try {
      const formattedPhone = phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
      const [users] = await pool.execute(
        `SELECT id, nickname, role, simple_pin, pin_fail_count, pin_locked_until, status 
         FROM users 
         WHERE social_provider = 'phone' AND provider_id = ? 
         LIMIT 1`,
        [formattedPhone]
      );

      if (users.length === 0 || !users[0].simple_pin) {
        return res.status(400).json({
          success: false,
          needOtp: true,
          message: '등록된 간편 비밀번호가 없습니다. 문자인증으로 로그인해 주세요.'
        });
      }

      const user = users[0];

      // 탈퇴 계정 확인
      if (user.status === 'withdrawn') {
        return res.status(403).json({
          success: false,
          message: '탈퇴 처리된 계정입니다. 고객센터에 문의해 주세요.'
        });
      }

      // 5회 이상 실패 잠금 상태 확인
      if (user.pin_locked_until && new Date(user.pin_locked_until) > new Date()) {
        return res.status(429).json({
          success: false,
          needOtp: true,
          message: '비밀번호 5회 연속 오류로 일시 잠금되었습니다. 문자인증으로 로그인해 주세요.'
        });
      }

      // 비밀번호 검증
      const isMatch = await bcrypt.compare(pin, user.simple_pin);
      if (!isMatch) {
        const nextFailCount = (user.pin_fail_count || 0) + 1;
        if (nextFailCount >= 5) {
          await pool.execute(
            `UPDATE users SET pin_fail_count = ?, pin_locked_until = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?`,
            [nextFailCount, user.id]
          );
          return res.status(401).json({
            success: false,
            needOtp: true,
            message: '비밀번호가 5회 연속 일치하지 않아 잠금되었습니다. 문자인증으로 로그인해 주세요.'
          });
        } else {
          await pool.execute(
            `UPDATE users SET pin_fail_count = ? WHERE id = ?`,
            [nextFailCount, user.id]
          );
          return res.status(401).json({
            success: false,
            message: `간편 비밀번호가 일치하지 않습니다. (오류 ${nextFailCount}/5회)`
          });
        }
      }

      // 로그인 성공: 실패 횟수 및 잠금 초기화
      await pool.execute(
        `UPDATE users SET pin_fail_count = 0, pin_locked_until = NULL WHERE id = ?`,
        [user.id]
      );

      // 접속 기록 갱신
      await recordUserLogin(user.id, 'phone', req);

      const touristUser = {
        id: user.id,
        nickname: user.nickname || formattedPhone,
        display_name: `${user.nickname || formattedPhone}님`,
        phone: formattedPhone,
        social_provider: 'phone',
        provider_label: '휴대폰 간편로그인',
        role: 'tourist',
        hasPin: true
      };

      const tokens = issueTokens({ id: user.id, role: 'tourist' });
      res.json({
        success: true,
        token: tokens.accessToken,
        refresh: tokens.refreshToken,
        hasPin: true,
        user: touristUser
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 관광객 4자리 간편비밀번호(PIN) 설정 및 변경 (로그인 인증 필요) ──
router.post('/tourist/pin/set',
  authenticate,
  [
    body('pin').matches(/^[0-9]{4}$/).withMessage('4자리 숫자 비밀번호를 입력해 주세요.')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { pin } = req.body;
    const bcrypt = require('bcryptjs');

    try {
      const hashedPin = await bcrypt.hash(pin, 10);
      await pool.execute(
        `UPDATE users SET simple_pin = ?, pin_fail_count = 0, pin_locked_until = NULL WHERE id = ?`,
        [hashedPin, req.user.id]
      );

      logger.info(`관광객 간편비밀번호 등록/변경 성공 — userId: ${req.user.id}`);

      res.json({
        success: true,
        message: '간편 비밀번호 4자리가 안전하게 등록되었습니다.'
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── JWT 토큰 갱신 (Silent Refresh) ──
router.post('/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh Token이 필요합니다.')
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { refreshToken } = req.body;
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'ongjin_local_jwt_refresh_secret_key_12345';
    const pool = require('../config/database');

    try {
      // 1. Refresh Token 검증
      const decoded = jwt.verify(refreshToken, refreshSecret);
      
      // 2. 유저 / 가맹점 존재 여부 재확인
      let userExists = false;
      let userData = null;
      if (decoded.role === 'merchant') {
        const [rows] = await pool.execute(
          `SELECT id, name, username, status FROM merchants WHERE id = ? LIMIT 1`,
          [decoded.id]
        );
        if (rows.length > 0 && rows[0].status === 'approved') {
          userExists = true;
          userData = { id: rows[0].id, name: rows[0].name, username: rows[0].username, role: 'merchant' };
        }
      } else if (decoded.role === 'tourist') {
        const [rows] = await pool.execute(
          `SELECT id, nickname, role, social_provider, provider_id, email, phone, phone_hash, coupon_balance, created_at FROM users WHERE id = ? LIMIT 1`,
          [decoded.id]
        );
        if (rows.length > 0) {
          userExists = true;
          userData = await formatTouristProfile(rows[0], pool);
        }
      }

      if (!userExists) {
        return res.status(401).json({ success: false, message: '유효하지 않은 계정 세션입니다.' });
      }

      // 3. 신규 토큰 발급
      const tokens = issueTokens({ id: decoded.id, role: decoded.role });
      
      res.json({
        success: true,
        token: tokens.accessToken,
        refresh: tokens.refreshToken,
        user: userData
      });
    } catch (err) {
      logger.warn(`JWT Refresh failed: ${err.message}`);
      res.status(401).json({ success: false, message: '세션이 만료되었거나 유효하지 않은 리프레시 토큰입니다.' });
    }
  }
);

// ── 내 프로필 정보 조회 (GET /api/auth/me) ──
router.get('/me', authenticate, async (req, res, next) => {
  const pool = require('../config/database');
  try {
    const { id, role } = req.user;
    if (role === 'tourist') {
      const [users] = await pool.execute(
        `SELECT id, social_provider, provider_id, nickname, email, phone, phone_hash, coupon_balance, role, created_at
         FROM users WHERE id = ? LIMIT 1`,
        [id]
      );
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: '회원 정보를 찾을 수 없습니다.' });
      }
      const formattedUser = await formatTouristProfile(users[0], pool);
      return res.json({
        success: true,
        user: formattedUser
      });
    } else if (role === 'merchant') {
      const [merchants] = await pool.execute(
        `SELECT id, name, username, phone, status, category, address FROM merchants WHERE id = ? LIMIT 1`,
        [id]
      );
      if (merchants.length === 0) {
        return res.status(404).json({ success: false, message: '가맹점 정보를 찾을 수 없습니다.' });
      }
      const m = merchants[0];
      return res.json({
        success: true,
        user: {
          id: m.id,
          name: m.name,
          username: m.username,
          phone: m.phone,
          role: 'merchant',
          display_name: `${m.name} 사장님`,
          provider_label: '가맹점 계정'
        }
      });
    } else if (role === 'admin') {
      const [admins] = await pool.execute(
        `SELECT id, username, name, role FROM admins WHERE id = ? LIMIT 1`,
        [id]
      );
      if (admins.length === 0) {
        return res.status(404).json({ success: false, message: '관리자 정보를 찾을 수 없습니다.' });
      }
      const a = admins[0];
      return res.json({
        success: true,
        user: {
          id: a.id,
          name: a.name,
          username: a.username,
          role: a.role,
          display_name: `${a.name} 관리자님`,
          provider_label: '관리자 계정'
        }
      });
    }
    return res.status(400).json({ success: false, message: '유효하지 않은 계정 유형입니다.' });
  } catch (err) {
    next(err);
  }
});

// ── 관광객 회원 직접 탈퇴 (DELETE /api/auth/withdraw, POST /api/auth/withdraw) ──
const handleTouristWithdraw = async (req, res, next) => {
  const pool = require('../config/database');
  try {
    const { id, role } = req.user;
    if (role !== 'tourist') {
      return res.status(403).json({ success: false, message: '관광객 회원만 직접 탈퇴할 수 있습니다.' });
    }

    // 1. 해당 회원이 보유한 유효(사용 가능) 쿠폰 취소 처리 (회수/무효화)
    await pool.execute(
      `UPDATE coupons SET status = 'cancelled' WHERE issued_to = ? AND status = 'available'`,
      [id]
    );

    // 2. 관광객 회원 소프트 탈퇴 처리 (상태를 withdrawn으로 전환, 쿠폰 잔액 0, 탈퇴 일시/사유 보존)
    const [result] = await pool.execute(
      `UPDATE users 
       SET status = 'withdrawn', 
           withdrawn_at = NOW(), 
           withdrawn_reason = '관광객 직접 탈퇴',
           coupon_balance = 0 
       WHERE id = ? AND role = 'tourist'`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '회원 정보를 찾을 수 없거나 이미 탈퇴되었습니다.' });
    }

    logger.info(`관광객 회원 직접 탈퇴 완료 [user_id: ${id}]`);
    res.json({
      success: true,
      message: '회원 탈퇴가 안전하게 완료되었습니다. 그동안 옹진 관광쿠폰를 이용해 주셔서 감사합니다.'
    });
  } catch (err) {
    next(err);
  }
};

router.delete('/withdraw', authenticate, handleTouristWithdraw);
router.post('/withdraw', authenticate, handleTouristWithdraw);


// ── 가맹점 입점 신청 ──
router.post('/merchant/apply',
  async (req, res, next) => {
    const {
      ownerName,
      phone,
      shopName,
      storePhone,
      category,
      address,
      images, // array or stringified JSON
      businessHours,
      businessNo,
      businessCertImage,
      bankName,
      accountNo,
      bankbookImage,
      username,
      password,
      lat,
      lng
    } = req.body;

    if (!ownerName || !phone || !shopName || !address || !category || !username || !password) {
      return res.status(400).json({ success: false, message: '필수 정보를 모두 입력해 주세요.' });
    }

    const pool = require('../config/database');
    const bcrypt = require('bcryptjs');
    
    try {
      // 1. 아이디 중복 체크
      const [existingUser] = await pool.execute(
        `SELECT id FROM merchants WHERE username = ? LIMIT 1`,
        [username]
      );
      if (existingUser.length > 0) {
        return res.status(400).json({ success: false, message: '이미 존재하는 아이디입니다.' });
      }

      // 2. 전화번호 중복 체크
      const phoneHash = hashPhone(phone.replace(/\D/g, ''));
      const [existingPhone] = await pool.execute(
        `SELECT id FROM merchants WHERE phone_hash = ? LIMIT 1`,
        [phoneHash]
      );
      if (existingPhone.length > 0) {
        return res.status(400).json({ success: false, message: '이미 등록된 휴대폰 번호입니다.' });
      }

      // 3. 비밀번호 해싱
      const passwordHash = await bcrypt.hash(password, 10);

      // 4. 이미지 및 필드 포맷
      const formattedPhone = phone.replace(/\D/g, '').replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
      const formattedStorePhone = storePhone ? storePhone.replace(/\D/g, '').replace(/(\d{2,3})(\d{3,4})(\d{4})/, '$1-$2-$3') : null;
      const imagesJson = Array.isArray(images) ? JSON.stringify(images) : images || null;

      // 5. DB 저장
      await pool.execute(
        `INSERT INTO merchants (
          name, owner_name, phone, phone_hash, store_phone, category, address, images,
          business_hours, business_no, business_cert_image, bank_name, account_no, bankbook_image,
          username, password_hash, status, applied_at, lat, lng
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), ?, ?)`,
        [
          shopName, ownerName, formattedPhone, phoneHash, formattedStorePhone, category, address, imagesJson,
          businessHours, businessNo, businessCertImage, bankName, accountNo, bankbookImage,
          username, passwordHash, lat || null, lng || null
        ]
      );

      // 6. 가맹점 입점 신청 접수 알림 전송 (비동기)
      const notificationService = require('../services/notificationService');
      notificationService.sendMerchantApplicationReceivedNotification(formattedPhone, shopName)
        .catch(err => logger.error('[Notification Async Error] 가맹점 신청 접수 알림 발송 실패:', err));

      res.json({ success: true, message: '입점 신청이 완료되었습니다.' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
