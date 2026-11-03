const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../config/database');
const logger = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');

const { recordAuditLog, getClientIp } = require('../middleware/auditLogger');

// 관리자 로그인 전용 Rate Limit (10분 5회)
const adminLoginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, message: '로그인 시도 횟수를 초과했습니다. 10분 후 재시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── POST /api/admin/auth/login ─────────────────────
router.post('/login', adminLoginLimiter, async (req, res, next) => {
  const { username, password } = req.body;
  const ip = getClientIp(req);

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });
  }

  try {
    const [[admin]] = await pool.execute(
      `SELECT id, username, password_hash, name, role FROM admins WHERE username = ? LIMIT 1`,
      [username]
    );

    if (!admin) {
      logger.warn(`[AdminAuth] 존재하지 않는 계정 로그인 시도: ${username} [${ip}]`);
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      logger.warn(`[AdminAuth] 비밀번호 불일치: ${username} [${ip}]`);
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'admin', adminRole: admin.role, name: admin.name, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    logger.info(`[AdminAuth] 로그인 성공: ${username} (${admin.role}) [${ip}]`);

    // 개인정보처리시스템 접속 기록(LOGIN) 적재
    recordAuditLog({
      adminId: admin.id,
      adminUsername: admin.username,
      adminName: admin.name,
      adminRole: admin.role,
      actionType: 'LOGIN',
      pageUrl: '/admin/login.html',
      pageTitle: '관리자 로그인',
      targetResource: 'admins',
      targetId: admin.id,
      actionDetail: `관리자 시스템 로그인 성공 (${admin.name || admin.username}, 권한: ${admin.role})`,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({
      success: true,
      token,
      admin: { id: admin.id, username: admin.username, name: admin.name, role: admin.role },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/auth/logout ────────────────────
router.post('/logout', authenticate, authorize('admin'), async (req, res) => {
  try {
    const ip = getClientIp(req);
    // 개인정보처리시스템 로그아웃(LOGOUT) 기록
    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username || 'admin',
      adminName: req.user.name || '',
      adminRole: req.user.adminRole || 'operator',
      actionType: 'LOGOUT',
      pageUrl: '/admin',
      pageTitle: '관리자 로그아웃',
      targetResource: 'admins',
      targetId: req.user.id,
      actionDetail: `관리자 시스템 정상 로그아웃`,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ success: true, message: '정상적으로 로그아웃되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: '로그아웃 처리 중 오류 발생' });
  }
});

// ── GET /api/admin/auth/me (토큰 검증 + 프로필) ────
router.get('/me', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [[admin]] = await pool.execute(
      `SELECT id, username, name, role, created_at FROM admins WHERE id = ?`,
      [req.user.id]
    );
    if (!admin) return res.status(404).json({ success: false, message: '관리자 정보를 찾을 수 없습니다.' });
    res.json({ success: true, admin });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;
