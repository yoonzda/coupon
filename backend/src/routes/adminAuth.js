const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../config/database');
const logger = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');

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

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });
  }

  try {
    const [[admin]] = await pool.execute(
      `SELECT id, username, password_hash, name, role FROM admins WHERE username = ? LIMIT 1`,
      [username]
    );

    if (!admin) {
      logger.warn(`[AdminAuth] 존재하지 않는 계정 로그인 시도: ${username} [${req.ip}]`);
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      logger.warn(`[AdminAuth] 비밀번호 불일치: ${username} [${req.ip}]`);
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'admin', adminRole: admin.role, name: admin.name, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    logger.info(`[AdminAuth] 로그인 성공: ${username} (${admin.role}) [${req.ip}]`);
    res.json({
      success: true,
      token,
      admin: { id: admin.id, username: admin.username, name: admin.name, role: admin.role },
    });
  } catch (err) {
    next(err);
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
