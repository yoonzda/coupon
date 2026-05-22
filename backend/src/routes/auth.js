const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const { generateOTP, hashPhone } = require('../utils/crypto');
const { saveOTP, verifyOTP } = require('../services/otpService');
const { sendSMS } = require('../services/smsService');
const { findOrCreateSocialUser } = require('../services/authService');
const logger = require('../utils/logger');

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'OTP 요청 한도 초과. 10분 후 다시 시도해 주세요.' },
});

// ── JWT 발급 헬퍼 ─────────────────────────────────
function issueTokens(payload) {
  const secret = process.env.JWT_SECRET || 'ongjin_local_jwt_secret_key_12345';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'ongjin_local_jwt_refresh_secret_key_12345';
  const accessToken = jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
}

// ════════════════════════════════════════════════
// 소셜 OAuth (관광객)
// ════════════════════════════════════════════════

// 카카오
router.get('/kakao',
  passport.authenticate('kakao', { session: false })
);
router.get('/kakao/callback',
  passport.authenticate('kakao', { session: false, failureRedirect: '/tourist/login.html?error=kakao' }),
  (req, res) => {
    const tokens = issueTokens({ id: req.user.id, role: 'tourist' });
    // 프론트로 리다이렉트 (토큰을 쿼리로 전달 → 프론트에서 localStorage 저장)
    res.redirect(`/tourist/auth-callback.html?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
  }
);

// 네이버
router.get('/naver',
  passport.authenticate('naver', { session: false })
);
router.get('/naver/callback',
  passport.authenticate('naver', { session: false, failureRedirect: '/tourist/login.html?error=naver' }),
  (req, res) => {
    const tokens = issueTokens({ id: req.user.id, role: 'tourist' });
    res.redirect(`/tourist/auth-callback.html?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
  }
);

// 구글
router.get('/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/tourist/login.html?error=google' }),
  (req, res) => {
    const tokens = issueTokens({ id: req.user.id, role: 'tourist' });
    res.redirect(`/tourist/auth-callback.html?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
  }
);

// ════════════════════════════════════════════════
// 가맹점 Zero-Password (상점명 + 전화번호 + OTP)
// ════════════════════════════════════════════════

// OTP 요청
router.post('/merchant/otp/send',
  otpLimiter,
  [
    body('phone').matches(/^01[0-9]{8,9}$/).withMessage('올바른 휴대폰 번호를 입력해 주세요.'),
    body('shopName').trim().notEmpty().withMessage('상점명을 입력해 주세요.'),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { phone, shopName } = req.body;
    try {
      const otp = generateOTP();
      const phoneHash = hashPhone(phone);
      await saveOTP(phoneHash, otp);
      await sendSMS(phone, `[옹진관광] 인증번호는 [${otp}]입니다. 3분 내 입력해 주세요.`);
      logger.info(`OTP 발송 — 상점: ${shopName} [${phoneHash.slice(0, 8)}...]`);
      res.json({ success: true, message: 'OTP가 발송되었습니다.' });
    } catch (err) {
      next(err);
    }
  }
);

// OTP 검증 + JWT 발급
router.post('/merchant/otp/verify',
  [
    body('phone').matches(/^01[0-9]{8,9}$/),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
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
        return res.status(401).json({ success: false, message: '인증번호가 틀렸거나 만료되었습니다.' });
      }
      const tokens = issueTokens({ id: merchant.id, role: 'merchant' });
      res.json({ success: true, ...tokens });
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
      const [merchants] = await pool.execute(
        `SELECT id, name, username, password_hash, status FROM merchants WHERE username = ? LIMIT 1`,
        [username]
      );

      const merchant = merchants[0];
      if (!merchant) {
        return res.status(401).json({ success: false, message: '등록되지 않은 가맹점 아이디이거나 비밀번호가 틀립니다.' });
      }

      if (merchant.status !== 'approved') {
        return res.status(403).json({ success: false, message: '아직 승인 대기 중이거나 정지된 가맹점 계정입니다.' });
      }

      const match = await bcrypt.compare(password, merchant.password_hash);
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
          username: merchant.username
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/test-tourist-login (개발/테스트용) ──
router.post('/test-tourist-login', async (req, res, next) => {
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

// ── 관광객 휴대폰 OTP 발송 ──
router.post('/tourist/otp/send',
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
      const isDev = !appKey || process.env.NODE_ENV === 'development';
      
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

// ── 관광객 휴대폰 OTP 검증 & 로그인 ──
router.post('/tourist/otp/verify',
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
        `SELECT id, nickname, role FROM users WHERE social_provider = 'phone' AND provider_id = ? LIMIT 1`,
        [formattedPhone]
      );

      let user = users[0];

      if (!user) {
        // 닉네임으로 휴대폰 번호(예: 010-1234-5678)를 저장하여 관리자 화면에 그대로 보이도록 함
        const [insertResult] = await pool.execute(
          `INSERT INTO users (social_provider, provider_id, nickname, phone_hash, coupon_balance, role)
           VALUES ('phone', ?, ?, ?, 0, 'tourist')`,
          [formattedPhone, formattedPhone, phoneHash]
        );
        user = { id: insertResult.insertId, nickname: formattedPhone, role: 'tourist' };
      }

      // 4. JWT 토큰 발급
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
          `SELECT id, nickname, role FROM users WHERE id = ? LIMIT 1`,
          [decoded.id]
        );
        if (rows.length > 0) {
          userExists = true;
          userData = { id: rows[0].id, nickname: rows[0].nickname, role: rows[0].role };
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

module.exports = router;
