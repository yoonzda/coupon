const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../config/database');
const logger = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');

// 로그인 속도 제한 (10분 10회)
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { success: false, message: '로그인 시도 횟수를 초과했습니다. 잠시 후 재시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── POST /api/auth/issuer/login ──
router.post('/login', loginLimiter, async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });
  }

  try {
    const [[issuer]] = await pool.execute(
      `SELECT id, username, password_hash, name FROM issuers WHERE username = ? LIMIT 1`,
      [username]
    );

    if (!issuer) {
      logger.warn(`[IssuerAuth] 존재하지 않는 발행처 로그인 시도: ${username} [${req.ip}]`);
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isMatch = await bcrypt.compare(password, issuer.password_hash);
    if (!isMatch) {
      logger.warn(`[IssuerAuth] 비밀번호 불일치: ${username} [${req.ip}]`);
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 토큰 발급 (role: 'issuer')
    const token = jwt.sign(
      { id: issuer.id, role: 'issuer', name: issuer.name, username: issuer.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    logger.info(`[IssuerAuth] 로그인 성공: ${username} [${req.ip}]`);
    res.json({
      success: true,
      token,
      issuer: { id: issuer.id, username: issuer.username, name: issuer.name },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/issuer/me ──
router.get('/me', authenticate, authorize('issuer'), async (req, res) => {
  try {
    const [[issuer]] = await pool.execute(
      `SELECT id, username, name FROM issuers WHERE id = ?`,
      [req.user.id]
    );
    if (!issuer) return res.status(404).json({ success: false, message: '발행처 정보를 찾을 수 없습니다.' });

    // 서버의 LAN IP 구하기
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = 'localhost';
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      for (const iface of interfaces) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ipAddress = iface.address;
          break;
        }
      }
    }

    res.json({ success: true, issuer, serverIp: ipAddress });
  } catch (err) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// ── GET /api/auth/issuer/allocations ──
router.get('/allocations', authenticate, authorize('issuer'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, face_value, total_count, issued_count, created_at 
       FROM issuer_allocations 
       WHERE issuer_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/issuer/verify-password ──
router.post('/verify-password', authenticate, authorize('issuer'), async (req, res, next) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: '비밀번호를 입력해주세요.' });
  }

  try {
    const [[issuer]] = await pool.execute(
      `SELECT password_hash FROM issuers WHERE id = ? LIMIT 1`,
      [req.user.id]
    );

    if (!issuer) {
      return res.status(404).json({ success: false, message: '발행처 정보를 찾을 수 없습니다.' });
    }

    const isMatch = await bcrypt.compare(password, issuer.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '비밀번호가 올바르지 않습니다.' });
    }

    res.json({ success: true, message: '비밀번호 검증 성공' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/issuer/change-password ──
router.post('/change-password', authenticate, authorize('issuer'), async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
  }

  try {
    const [[issuer]] = await pool.execute(
      `SELECT password_hash FROM issuers WHERE id = ? LIMIT 1`,
      [req.user.id]
    );

    if (!issuer) {
      return res.status(404).json({ success: false, message: '발행처 정보를 찾을 수 없습니다.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, issuer.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '현재 비밀번호가 올바르지 않습니다.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.execute(
      `UPDATE issuers SET password_hash = ? WHERE id = ?`,
      [hashedPassword, req.user.id]
    );

    logger.info(`[IssuerAuth] 비밀번호 변경 완료: id=${req.user.id}, username=${req.user.username}`);
    res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/issuer/stats ──
router.get('/stats', authenticate, authorize('issuer'), async (req, res, next) => {
  const { filter } = req.query; // 'hourly', 'daily', 'monthly', 'yearly'
  const issuerId = req.user.id;

  try {
    // 1. 발행처의 배정 ID 목록 조회
    const [allocations] = await pool.execute(
      `SELECT id FROM issuer_allocations WHERE issuer_id = ?`,
      [issuerId]
    );

    if (allocations.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const allocationIds = allocations.map(a => a.id);
    const placeholders = allocationIds.map(() => '?').join(',');

    let rows = [];
    if (filter === 'hourly') {
      const range = req.query.range;
      let dateFilter = '';
      let queryParams = [...allocationIds];

      if (range === 'today') {
        dateFilter = `AND DATE(CONVERT_TZ(issued_at, '+00:00', '+09:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+09:00'))`;
      } else if (range === '7days') {
        dateFilter = `AND CONVERT_TZ(issued_at, '+00:00', '+09:00') >= DATE_SUB(DATE(CONVERT_TZ(NOW(), '+00:00', '+09:00')), INTERVAL 6 DAY)`;
      } else if (range === '30days') {
        dateFilter = `AND CONVERT_TZ(issued_at, '+00:00', '+09:00') >= DATE_SUB(DATE(CONVERT_TZ(NOW(), '+00:00', '+09:00')), INTERVAL 29 DAY)`;
      } else if (range === 'all') {
        dateFilter = '';
      } else {
        // 특정 날짜 선택 또는 기본값 (오늘)
        let targetDate = req.query.date;
        if (!targetDate) {
          const kstOffset = 9 * 60 * 60 * 1000;
          const kstDate = new Date(Date.now() + kstOffset);
          targetDate = kstDate.toISOString().split('T')[0];
        }
        dateFilter = `AND DATE(CONVERT_TZ(issued_at, '+00:00', '+09:00')) = ?`;
        queryParams.push(targetDate);
      }

      const query = `
        SELECT HOUR(CONVERT_TZ(issued_at, '+00:00', '+09:00')) as hour_val, COUNT(*) as count
        FROM coupons
        WHERE issuer_allocation_id IN (${placeholders})
          ${dateFilter}
        GROUP BY HOUR(CONVERT_TZ(issued_at, '+00:00', '+09:00'))
        ORDER BY hour_val ASC
      `;
      [rows] = await pool.execute(query, queryParams);
      
      const hourlyData = [];
      for (let h = 0; h <= 23; h++) {
        const found = rows.find(r => r.hour_val === h);
        hourlyData.push({
          label: `${String(h).padStart(2, '0')}시`,
          count: found ? found.count : 0
        });
      }
      return res.json({ success: true, data: hourlyData });

    } else if (filter === 'daily') {
      const monthParam = req.query.month;
      if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
        const [yearStr, monthStr] = monthParam.split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const numDays = new Date(year, month, 0).getDate();

        const query = `
          SELECT DAY(CONVERT_TZ(issued_at, '+00:00', '+09:00')) as day_val, COUNT(*) as count
          FROM coupons
          WHERE issuer_allocation_id IN (${placeholders})
            AND YEAR(CONVERT_TZ(issued_at, '+00:00', '+09:00')) = ?
            AND MONTH(CONVERT_TZ(issued_at, '+00:00', '+09:00')) = ?
          GROUP BY DAY(CONVERT_TZ(issued_at, '+00:00', '+09:00'))
          ORDER BY day_val ASC
        `;
        [rows] = await pool.execute(query, [...allocationIds, year, month]);

        const dailyData = [];
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstNow = new Date(Date.now() + kstOffset);
        const todayStr = kstNow.toISOString().split('T')[0];

        for (let d = 1; d <= numDays; d++) {
          const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const found = rows.find(r => r.day_val === d);
          const isToday = (dayStr === todayStr);
          dailyData.push({
            label: `${month}/${d}`,
            count: found ? found.count : 0,
            isToday
          });
        }
        return res.json({ success: true, data: dailyData });
      } else {
        // 최근 30일간 일별 발급 추이 (기본값)
        const query = `
          SELECT DATE_FORMAT(CONVERT_TZ(issued_at, '+00:00', '+09:00'), '%Y-%m-%d') as raw_date, COUNT(*) as count
          FROM coupons
          WHERE issuer_allocation_id IN (${placeholders})
            AND CONVERT_TZ(issued_at, '+00:00', '+09:00') >= DATE_SUB(DATE(CONVERT_TZ(NOW(), '+00:00', '+09:00')), INTERVAL 29 DAY)
          GROUP BY raw_date
          ORDER BY raw_date ASC
        `;
        [rows] = await pool.execute(query, allocationIds);

        const dailyData = [];
        const kstOffset = 9 * 60 * 60 * 1000;
        const todayKst = new Date(Date.now() + kstOffset);
        for (let i = 29; i >= 0; i--) {
          const d = new Date(todayKst.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = d.toISOString().split('T')[0];
          const parts = dateStr.split('-');
          const mVal = parseInt(parts[1], 10);
          const dVal = parseInt(parts[2], 10);

          const found = rows.find(r => r.raw_date === dateStr);
          dailyData.push({
            label: `${mVal}/${dVal}`,
            count: found ? found.count : 0,
            isToday: i === 0
          });
        }
        return res.json({ success: true, data: dailyData });
      }

    } else if (filter === 'monthly') {
      let targetYear = parseInt(req.query.year, 10);
      if (!targetYear || isNaN(targetYear)) {
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(Date.now() + kstOffset);
        targetYear = kstDate.getUTCFullYear();
      }
      
      const query = `
        SELECT MONTH(CONVERT_TZ(issued_at, '+00:00', '+09:00')) as month_val, COUNT(*) as count
        FROM coupons
        WHERE issuer_allocation_id IN (${placeholders})
          AND YEAR(CONVERT_TZ(issued_at, '+00:00', '+09:00')) = ?
        GROUP BY MONTH(CONVERT_TZ(issued_at, '+00:00', '+09:00'))
        ORDER BY month_val ASC
      `;
      [rows] = await pool.execute(query, [...allocationIds, targetYear]);

      const monthlyData = [];
      for (let m = 1; m <= 12; m++) {
        const found = rows.find(r => r.month_val === m);
        monthlyData.push({
          label: `${m}월`,
          count: found ? found.count : 0
        });
      }
      return res.json({ success: true, data: monthlyData });

    } else if (filter === 'yearly') {
      // 2026년(출시 년도)부터 년별 발급 추이
      const query = `
        SELECT YEAR(CONVERT_TZ(issued_at, '+00:00', '+09:00')) as year_val, COUNT(*) as count
        FROM coupons
        WHERE issuer_allocation_id IN (${placeholders})
          AND YEAR(CONVERT_TZ(issued_at, '+00:00', '+09:00')) >= 2026
        GROUP BY YEAR(CONVERT_TZ(issued_at, '+00:00', '+09:00'))
        ORDER BY year_val ASC
      `;
      [rows] = await pool.execute(query, allocationIds);

      const yearlyData = [];
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstDate = new Date(Date.now() + kstOffset);
      const currentYear = kstDate.getUTCFullYear();
      const startYear = 2026;
      for (let y = startYear; y <= currentYear; y++) {
        const found = rows.find(r => r.year_val === y);
        yearlyData.push({
          label: `${y}년`,
          count: found ? found.count : 0
        });
      }
      return res.json({ success: true, data: yearlyData });
    } else if (filter === 'cumulative') {
      // 출시일자 또는 첫 발행시점부터 오늘까지의 일별 누적 추이
      const query = `
        SELECT DATE_FORMAT(CONVERT_TZ(issued_at, '+00:00', '+09:00'), '%Y-%m-%d') as raw_date, COUNT(*) as count
        FROM coupons
        WHERE issuer_allocation_id IN (${placeholders})
        GROUP BY raw_date
        ORDER BY raw_date ASC
      `;
      [rows] = await pool.execute(query, allocationIds);

      const cumulativeData = [];
      let runningTotal = 0;

      if (rows.length > 0) {
        const kstOffset = 9 * 60 * 60 * 1000;
        const firstDateStr = rows[0].raw_date;
        const todayStr = new Date(Date.now() + kstOffset).toISOString().split('T')[0];

        const start = new Date(firstDateStr);
        const end = new Date(todayStr);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const found = rows.find(r => r.raw_date === dateStr);
          if (found) {
            runningTotal += found.count;
          }
          const parts = dateStr.split('-');
          cumulativeData.push({
            label: `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`,
            count: runningTotal
          });
        }
      } else {
        const kstOffset = 9 * 60 * 60 * 1000;
        const todayStr = new Date(Date.now() + kstOffset).toISOString().split('T')[0];
        const parts = todayStr.split('-');
        cumulativeData.push({
          label: `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`,
          count: 0
        });
      }
      return res.json({ success: true, data: cumulativeData });
    } else {
      return res.status(400).json({ success: false, message: '유효하지 않은 필터입니다.' });
    }

  } catch (err) {
    next(err);
  }
});

module.exports = router;
