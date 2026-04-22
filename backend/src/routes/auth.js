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
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
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

module.exports = router;
