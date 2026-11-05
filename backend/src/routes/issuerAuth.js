const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { hashCouponCode, generateToken, encodeSecureToken } = require('../utils/crypto');
const { authenticate, authorize } = require('../middleware/auth');

// 로그인 속도 제한 (10분 10회)
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { success: false, message: '로그인 시도 횟수를 초과했습니다. 잠시 후 재시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 성수기 판별 헬퍼 (한국시간 기준 7월 15일 ~ 8월 24일)
function isPeakSeasonKST() {
  const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const month = kstDate.getUTCMonth() + 1;
  const day = kstDate.getUTCDate();
  return (month === 7 && day >= 15) || (month === 8 && day <= 24);
}

// ── GET /api/auth/issuer/list (발행처 로그인 드롭다운용 공개 목록) ──
router.get('/list', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, address FROM issuers ORDER BY id ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/issuer/login ──
router.post('/login', loginLimiter, async (req, res, next) => {
  const { name, username, password } = req.body;
  const loginKey = (name || username || '').trim();

  if (!loginKey || !password) {
    return res.status(400).json({ success: false, message: '발행처를 선택하고 비밀번호를 입력해주세요.' });
  }

  try {
    const [[issuer]] = await pool.execute(
      `SELECT id, username, password_hash, name FROM issuers WHERE name = ? OR username = ? LIMIT 1`,
      [loginKey, loginKey]
    );

    if (!issuer) {
      logger.warn(`[IssuerAuth] 존재하지 않는 발행처 로그인 시도: ${loginKey} [${req.ip}]`);
      return res.status(401).json({ success: false, message: '발행처 정보 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isMatch = await bcrypt.compare(password, issuer.password_hash);
    if (!isMatch) {
      logger.warn(`[IssuerAuth] 비밀번호 불일치: ${loginKey} [${req.ip}]`);
      return res.status(401).json({ success: false, message: '발행처 정보 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 토큰 발급 (role: 'issuer')
    const token = jwt.sign(
      { id: issuer.id, role: 'issuer', name: issuer.name, username: issuer.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    logger.info(`[IssuerAuth] 로그인 성공: ${issuer.name} [${req.ip}]`);
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

// ── GET /api/auth/issuer/allocations (발행처 쿠폰 발급 현황 요약) ──
router.get('/allocations', authenticate, authorize('issuer'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, face_value, total_count, issued_count, created_at 
       FROM issuer_allocations 
       WHERE issuer_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    const [[stats]] = await pool.execute(
      `SELECT
         COUNT(c.id) AS total_issued_count,
         COALESCE(SUM(c.face_value), 0) AS total_issued_amount,
         COALESCE(SUM(CASE WHEN DATE(c.issued_at) = CURDATE() THEN 1 ELSE 0 END), 0) AS today_issued_count
       FROM coupons c
       JOIN issuer_allocations ia ON c.issuer_allocation_id = ia.id
       WHERE ia.issuer_id = ?`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: rows,
      summary: {
        todayCount: Number(stats?.today_issued_count || 0),
        totalIssuedCount: Number(stats?.total_issued_count || 0),
        totalIssuedAmount: Number(stats?.total_issued_amount || 0)
      }
    });
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

// ── GET /api/auth/issuer/inventory ──
router.get('/inventory', authenticate, authorize('issuer'), async (req, res, next) => {
  try {
    // 1. 배정 현황
    const [allocations] = await pool.execute(
      `SELECT id, face_value, total_count, issued_count, 
              (total_count - issued_count) AS remaining_count
       FROM issuer_allocations
       WHERE issuer_id = ?
       ORDER BY face_value ASC`,
      [req.user.id]
    );

    // 2. 등록된 상품 목록 (issuer_products)
    let [products] = await pool.execute(
      `SELECT id, product_name, price, off_season_price, display_order 
       FROM issuer_products 
       WHERE issuer_id = ? 
       ORDER BY display_order ASC, id ASC`,
      [req.user.id]
    );

    // 상품이 issuer_products에 없을 경우 issuers 테이블 레거시 컬럼 폴백
    if (products.length === 0) {
      const [[issuerRow]] = await pool.execute(
        `SELECT product_name, product_price FROM issuers WHERE id = ?`,
        [req.user.id]
      );
      if (issuerRow && issuerRow.product_name) {
        products = [{
          id: 0,
          product_name: issuerRow.product_name,
          price: issuerRow.product_price || 0,
          off_season_price: null,
          display_order: 1
        }];
      }
    }

    // 3. 쿠폰 지급 규정 (coupon_issuance_rules)
    const [rules] = await pool.execute(
      `SELECT min_amount, max_amount, face_value, rule_name 
       FROM coupon_issuance_rules 
       ORDER BY display_order ASC`
    );

    // 현재 시기에 따라 성수기/비수기 금액 자동 결정 (화면에 성수기/비수기 문구 노출 없음)
    const peakSeason = isPeakSeasonKST();

    const productsWithRule = products.map(p => {
      const hasSeasonalPrice = p.off_season_price !== null && p.off_season_price !== undefined && Number(p.off_season_price) > 0;
      const activePrice = hasSeasonalPrice
        ? (peakSeason ? Number(p.price) : Number(p.off_season_price))
        : Number(p.price);

      const matchedFaceValue = activePrice;
      const alloc = allocations.find(a => Number(a.face_value) === matchedFaceValue);
      return {
        id: p.id,
        product_name: p.product_name,
        price: activePrice,
        coupon_face_value: matchedFaceValue,
        allocation_id: alloc ? alloc.id : null,
        display_order: p.display_order
      };
    });

    res.json({ 
      success: true, 
      data: allocations, // 기존 호환용
      allocations,
      products: productsWithRule,
      rules,
      serverIp: (() => {
        const os = require('os');
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
          for (const iface of nets[name] || []) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
          }
        }
        return 'localhost';
      })()
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/issuer/issue ──
router.post('/issue', authenticate, authorize('issuer'), async (req, res, next) => {
  const { allocationId, count, items, distributionType, deliveryMethod, phones } = req.body;

  if (!['bundle', 'individual'].includes(distributionType)) {
    return res.status(400).json({ success: false, message: '수령 방식을 선택해주세요.' });
  }
  if (!['kakao', 'sms', 'paper', 'qr'].includes(deliveryMethod)) {
    return res.status(400).json({ success: false, message: '발급 수단을 선택해주세요.' });
  }

  // 다중 품목 또는 단일 배정 항목 정규화
  let issueItems = [];
  if (Array.isArray(items) && items.length > 0) {
    issueItems = items
      .map(it => ({
        allocationId: it.allocationId ? parseInt(it.allocationId, 10) : null,
        faceValue: parseInt(it.faceValue || it.face_value || 0, 10),
        count: parseInt(it.count || it.quantity || 0, 10),
        productName: it.productName || it.product_name || '',
        productPrice: parseInt(it.productPrice || it.price || 0, 10)
      }))
      .filter(it => it.count > 0 && it.faceValue > 0);
  } else if (allocationId && count) {
    const numCount = parseInt(count, 10);
    if (numCount > 0) {
      issueItems = [{
        allocationId: parseInt(allocationId, 10),
        faceValue: 0, // DB 조회 후 채움
        count: numCount,
        productName: '',
        productPrice: 0
      }];
    }
  }

  if (issueItems.length === 0) {
    return res.status(400).json({ success: false, message: '발급할 상품 및 수량을 1개 이상 선택해주세요.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 발행처 정보 조회
    const [[issuer]] = await connection.execute(
      `SELECT id, name, username FROM issuers WHERE id = ?`,
      [req.user.id]
    );
    const issuerName = issuer ? issuer.name : '발행처';

    const issuedCoupons = [];
    const kioskSessionId = generateToken(16);
    let primaryAllocationId = null;
    let totalCouponAmount = 0;
    let totalProductPrice = 0;

    for (const item of issueItems) {
      let targetAlloc = null;

      if (item.allocationId) {
        const [rows] = await connection.execute(
          `SELECT * FROM issuer_allocations WHERE id = ? AND issuer_id = ? FOR UPDATE`,
          [item.allocationId, req.user.id]
        );
        if (rows.length > 0) {
          targetAlloc = rows[0];
        }
      }

      // faceValue 기반으로 배정 매칭 또는 없으면 자동 생성/보충 (수량 제한 없음)
      if (!targetAlloc && item.faceValue > 0) {
        const [rows] = await connection.execute(
          `SELECT * FROM issuer_allocations WHERE issuer_id = ? AND face_value = ? ORDER BY id ASC LIMIT 1 FOR UPDATE`,
          [req.user.id, item.faceValue]
        );
        if (rows.length > 0) {
          targetAlloc = rows[0];
        } else {
          // 해당 권종의 배정 레코드가 없으면 넉넉한 수량으로 신규 생성
          const [insertAlloc] = await connection.execute(
            `INSERT INTO issuer_allocations (issuer_id, face_value, total_count, issued_count) VALUES (?, ?, 10000, 0)`,
            [req.user.id, item.faceValue]
          );
          targetAlloc = {
            id: insertAlloc.insertId,
            issuer_id: req.user.id,
            face_value: item.faceValue,
            total_count: 10000,
            issued_count: 0
          };
        }
      }

      if (!targetAlloc) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: `권종 정보를 찾을 수 없습니다.` });
      }

      // 수량 제한 제거: 잔여량이 부족할 경우 발행처 배정 한도를 자동 증액
      const remaining = targetAlloc.total_count - targetAlloc.issued_count;
      if (remaining < item.count) {
        const additional = Math.max(1000, item.count * 10);
        await connection.execute(
          `UPDATE issuer_allocations SET total_count = total_count + ? WHERE id = ?`,
          [additional, targetAlloc.id]
        );
        targetAlloc.total_count += additional;
      }

      if (!primaryAllocationId) {
        primaryAllocationId = targetAlloc.id;
      }

      const itemFaceValue = Number(targetAlloc.face_value);
      totalCouponAmount += itemFaceValue * item.count;
      totalProductPrice += (item.productPrice || 0) * item.count;

      // 쿠폰 개별 발급 생성
      for (let i = 0; i < item.count; i++) {
        const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
        const timestampPart = Date.now().toString(36).toUpperCase().slice(-4);
        const serialCode = `ONG-${Math.floor(itemFaceValue / 1000)}K-${timestampPart}-${randomSuffix}`;
        const codeHash = hashCouponCode(serialCode);

        // QR 개별 출력일 경우 쿠폰마다 고유 세션 ID 생성, 일괄 출력일 경우 전체 공유 세션 ID 사용
        const couponSessionId = (distributionType === 'individual') ? generateToken(16) : kioskSessionId;
        const couponSecureToken = encodeSecureToken(targetAlloc.id);
        const couponQrUrl = `/tourist/landing.html?token=${couponSecureToken}&kioskSessionId=${couponSessionId}`;

        if (deliveryMethod === 'paper') {
          await connection.execute(
            `INSERT INTO paper_coupons (random_code_hash, face_value, issued_by_location) VALUES (?, ?, ?)`,
            [codeHash, itemFaceValue, issuerName]
          );
        }

        const couponType = deliveryMethod === 'paper' ? 'paper' : 'digital';
        const [insertRes] = await connection.execute(
          `INSERT INTO coupons (code_hash, coupon_type, face_value, issued_to, status, issuer_allocation_id, kiosk_session_id, expires_at)
           VALUES (?, ?, ?, NULL, 'available', ?, ?, DATE_ADD(NOW(), INTERVAL 1 YEAR))`,
          [codeHash, couponType, itemFaceValue, targetAlloc.id, couponSessionId]
        );

        const couponIndex = issuedCoupons.length;
        const targetPhone = (Array.isArray(phones) && phones[couponIndex]) ? phones[couponIndex] : null;

        issuedCoupons.push({
          id: insertRes.insertId,
          serialCode,
          faceValue: itemFaceValue,
          productName: item.productName || '',
          issuerName,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          kioskSessionId: couponSessionId,
          qrUrl: couponQrUrl,
          phone: targetPhone
        });
      }

      // 배정 발행 수량 업데이트
      await connection.execute(
        `UPDATE issuer_allocations SET issued_count = issued_count + ? WHERE id = ?`,
        [item.count, targetAlloc.id]
      );
    }

    await connection.commit();

    logger.info(`[IssuerAuth] 쿠폰 복수/단일 발급 완료: issuer=${req.user.username}, 총권종금액=${totalCouponAmount}, 발행수량=${issuedCoupons.length}, 방식=${deliveryMethod}`);

    const secureToken = encodeSecureToken(primaryAllocationId);
    const qrUrl = `/tourist/landing.html?token=${secureToken}&kioskSessionId=${kioskSessionId}`;

    // 문자(SMS) 또는 알림톡(Kakao) 수령 선택 시 수신 번호로 쿠폰 등록 링크 발송 (비동기 큐)
    if ((deliveryMethod === 'sms' || deliveryMethod === 'kakao') && Array.isArray(phones) && phones.length > 0) {
      const notificationService = require('../services/notificationService');
      const os = require('os');
      let lanIp = 'localhost';
      const nets = os.networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const iface of nets[name] || []) {
          if (iface.family === 'IPv4' && !iface.internal) {
            lanIp = iface.address;
            break;
          }
        }
        if (lanIp !== 'localhost') break;
      }
      const rawOrigin = process.env.APP_BASE_URL || req.headers.origin || `${req.protocol}://${req.get('host')}`;
      const baseUrl = rawOrigin.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/i, `//${lanIp}`);
      const issuedAt = new Date();

      if (distributionType === 'bundle') {
        const primaryPhone = phones.find(p => p && String(p).replace(/\D/g, '').length >= 10);
        if (primaryPhone) {
          notificationService.sendKioskCouponNotification(
            primaryPhone,
            totalCouponAmount,
            `${baseUrl}${qrUrl}`,
            { count: issuedCoupons.length, issuerName, issuedAt }
          ).catch(err => logger.error('[IssuerAuth SMS Error]', err));
        }
      } else {
        for (const c of issuedCoupons) {
          if (c.phone && String(c.phone).replace(/\D/g, '').length >= 10) {
            notificationService.sendKioskCouponNotification(
              c.phone,
              c.faceValue,
              `${baseUrl}${c.qrUrl}`,
              { count: 1, issuerName, issuedAt }
            ).catch(err => logger.error('[IssuerAuth SMS Error]', err));
          }
        }
      }
    }

    res.json({
      success: true,
      message: '쿠폰이 성공적으로 발행되었습니다.',
      data: {
        allocationId: primaryAllocationId,
        count: issuedCoupons.length,
        totalAmount: totalCouponAmount,
        totalProductPrice,
        items: issueItems,
        distributionType,
        deliveryMethod,
        kioskSessionId,
        qrUrl,
        coupons: issuedCoupons,
      }
    });

  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

module.exports = router;
