require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
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
const adminLogsRouter = require('./routes/adminLogs');
const settlementRouter = require('./routes/settlement');
const mapRouter = require('./routes/map');
const issuerAuthRouter = require('./routes/issuerAuth');
const visitorStatsRouter = require('./routes/visitorStats');

const { adminAuditMiddleware } = require('./middleware/auditLogger');

// 스케줄러 & 백그라운드 워커
require('./jobs/settlementJob');
require('./jobs/notificationWorker'); // 알림 큐 워커 (비동기 SMS/알림톡 발송)

const app = express();

// Nginx 리버스 프록시 뒤에서 실제 클라이언트 IP 추출 (Rate Limit 정상 작동 필수)
app.set('trust proxy', 1);

// ── 보안 미들웨어 ──────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
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


// ── 공통 미들웨어 ─────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Passport 초기화
initPassport();
app.use(passport.initialize());

// ── 정적 파일 (Nginx에서 처리하지만 개발 및 단독 구동 지원) ───
app.use('/landing', express.static(path.join(__dirname, '../../frontend/landing')));
app.use('/shared', express.static(path.join(__dirname, '../../frontend/shared')));
app.use('/tourist', express.static(path.join(__dirname, '../../frontend/tourist')));
app.use('/merchant', express.static(path.join(__dirname, '../../frontend/merchant')));
app.use('/admin', express.static(path.join(__dirname, '../../frontend/admin')));
app.use('/issuer', express.static(path.join(__dirname, '../../frontend/issuer')));
app.use('/uploads', express.static(path.join(__dirname, '../storage/uploads')));

// ── API 라우터 ────────────────────────────────────
// 공개 지도 API (인증 불필요 - merchantRouter보다 앞서 마운트)
app.use('/api/merchant', mapRouter);
app.use('/api', mapRouter);

app.use('/api/auth', authRouter);
app.use('/auth', authRouter);
app.use('/api/coupon', couponRouter);
app.use('/api/merchant', merchantRouter);
app.use('/api/admin/auth', adminAuthRouter);  // 관리자 인증 (인증 미들웨어 없음)
app.use('/api/admin/logs', adminLogsRouter);  // 관리자 감사 로그
app.use('/api/admin', adminAuditMiddleware, adminRouter);
app.use('/api/auth/issuer', issuerAuthRouter);
app.use('/api/settlement', adminAuditMiddleware, settlementRouter);
app.use('/api/stats', visitorStatsRouter);
app.use('/api/admin/stats', adminAuditMiddleware, visitorStatsRouter);

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

// ── 비정상 종료 방어용 글로벌 비동기 예외 핸들러 (Node.js 런타임 크래시 차단) ──
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', err);
});

// ── 서버 시작 ─────────────────────────────────────
const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  logger.info(`✅ 옹진관광 쿠폰 서버 시작 — PORT ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;
