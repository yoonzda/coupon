require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const path = require('path');

const logger = require('./utils/logger');
const { initPassport } = require('./config/passport');

// 라우터
const authRouter = require('./routes/auth');
const couponRouter = require('./routes/coupon');
const merchantRouter = require('./routes/merchant');
const adminRouter = require('./routes/admin');
const adminAuthRouter = require('./routes/adminAuth');
const settlementRouter = require('./routes/settlement');
const mapRouter = require('./routes/map');

// 스케줄러
require('./jobs/settlementJob');

const app = express();

// ── 보안 미들웨어 ──────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// 전역 Rate Limit (1분 100회)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
});
app.use(globalLimiter);

// OTP 전송 전용 Strict Limit (10분 5회)
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'OTP 요청 한도 초과. 10분 후 다시 시도해 주세요.' },
});

// ── 공통 미들웨어 ─────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Passport 초기화
initPassport();
app.use(passport.initialize());

// ── 정적 파일 (Nginx에서 처리하지만 개발 편의용) ───
app.use('/tourist', express.static(path.join(__dirname, '../../frontend/tourist')));
app.use('/merchant', express.static(path.join(__dirname, '../../frontend/merchant')));
app.use('/admin', express.static(path.join(__dirname, '../../frontend/admin')));

// ── API 라우터 ────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/coupon', couponRouter);
app.use('/api/merchant', merchantRouter);
app.use('/api/admin/auth', adminAuthRouter);  // 관리자 인증 (인증 미들웨어 없음)
app.use('/api/admin', adminRouter);
app.use('/api/settlement', settlementRouter);
app.use('/api/merchant', mapRouter);  // /api/merchant/map (인증 불필요)

// OTP 라우터는 별도 limiter 적용
app.use('/api/auth/otp', otpLimiter);

// ── 헬스체크 ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 글로벌 에러 핸들러 ────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`[ERROR] ${req.method} ${req.path} — ${err.message}`);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? '서버 오류가 발생했습니다.' : err.message,
  });
});

// ── 서버 시작 ─────────────────────────────────────
const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  logger.info(`✅ 옹진관광 쿠폰 서버 시작 — PORT ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;
