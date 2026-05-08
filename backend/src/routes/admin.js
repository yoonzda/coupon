const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const pool = require('../config/database');

// ── 대시보드 통계 ─────────────────────────────────
router.get('/dashboard', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [[couponStats]] = await pool.execute(
      `SELECT
         COUNT(*) AS total_issued,
         SUM(face_value) AS total_face_value,
         SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS total_used,
         SUM(CASE WHEN status = 'used' THEN face_value ELSE 0 END) AS total_used_value
       FROM coupons`
    );
    const [[merchantStats]] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM merchants`
    );
    const [dailyTrend] = await pool.execute(
      `SELECT DATE(scanned_at) AS date, COUNT(*) AS count, SUM(amount) AS total
       FROM coupon_transactions
       WHERE scanned_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(scanned_at)
       ORDER BY date ASC`
    );
    const [fdsAlerts] = await pool.execute(
      `SELECT * FROM fds_alerts WHERE resolved = 0 ORDER BY detected_at DESC LIMIT 10`
    );

    const recovery_rate = couponStats.total_issued > 0
      ? ((couponStats.total_used / couponStats.total_issued) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: { couponStats: { ...couponStats, recovery_rate }, merchantStats, dailyTrend, fdsAlerts },
    });
  } catch (err) { next(err); }
});

// ── 대시보드 요약 통계 (index.html용) ───────────────
router.get('/stats/summary', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [[txStats]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) AS totalAmount, COUNT(*) AS txCount
       FROM coupon_transactions
       WHERE DATE_FORMAT(scanned_at, '%Y-%m') = ?`, [ym]
    );
    const [[{ userCount }]] = await pool.execute(
      `SELECT COUNT(*) AS userCount FROM users`
    );
    const [[{ merchantCount }]] = await pool.execute(
      `SELECT COUNT(*) AS merchantCount FROM merchants WHERE status = 'approved'`
    );
    const [[{ fdsCount }]] = await pool.execute(
      `SELECT COUNT(*) AS fdsCount FROM fds_alerts WHERE resolved = 0`
    );
    const [[{ couponIssued }]] = await pool.execute(
      `SELECT COUNT(*) AS couponIssued FROM coupons`
    );
    const [[{ couponUsed }]] = await pool.execute(
      `SELECT COUNT(*) AS couponUsed FROM coupons WHERE status = 'used'`
    );

    res.json({
      success: true,
      totalAmount: Number(txStats.totalAmount),
      txCount: txStats.txCount,
      userCount,
      merchantCount,
      fdsCount,
      couponIssued,
      couponUsed,
    });
  } catch (err) { next(err); }
});

// ── 최근 FDS 알림 (대시보드 테이블용) ───────────────
router.get('/fds/recent', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.id, f.rule_id, f.description, f.detected_at, f.resolved,
              m.name AS merchant_name, u.nickname
       FROM fds_alerts f
       LEFT JOIN merchants m ON f.merchant_id = m.id
       LEFT JOIN users u ON f.user_id = u.id
       ORDER BY f.detected_at DESC LIMIT 10`
    );
    // 배열을 직접 반환 (프론트에서 배열로 처리)
    res.json(rows);
  } catch (err) { next(err); }
});


// ── 가맹점 승인/반려 ───────────────────────────────
router.patch('/merchants/:id/status', authenticate, authorize('admin'), async (req, res, next) => {
  const { status, reason } = req.body; // 'approved' | 'rejected', 'reason' (반려 시)
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: '유효하지 않은 상태값입니다.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. 가맹점 정보 조회 (알림용)
    const [[merchant]] = await connection.execute(
      `SELECT phone, name FROM merchants WHERE id = ? FOR UPDATE`,
      [req.params.id]
    );

    if (!merchant) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '가맹점을 찾을 수 없습니다.' });
    }

    // 2. 상태 업데이트
    // DB 스키마에 rejection_reason 필드가 있다고 가정 (없으면 에러 방지 위해 쿼리 구성 유의)
    await connection.execute(
      `UPDATE merchants SET 
        status = ?, 
        rejection_reason = ?,
        approved_at = ${status === 'approved' ? 'NOW()' : 'NULL'}, 
        approved_by = ?
       WHERE id = ?`,
      [status, status === 'rejected' ? reason : null, req.user.id, req.params.id]
    );

    await connection.commit();

    // 3. 알림 전송 (비동기 처리 - 응답 후 또는 별도 처리 권장되나 여기선 에러 핸들링 포함)
    const notificationService = require('../services/notificationService');
    notificationService.sendMerchantStatusNotification(
      merchant.phone, 
      merchant.name, 
      status, 
      reason
    ).catch(err => console.error('[Notification Async Error]', err));

    res.json({ success: true, message: `가맹점 ${status === 'approved' ? '승인' : '반려'} 완료` });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// ── 가맹점 목록 ───────────────────────────────────
router.get('/merchants', authenticate, authorize('admin'), async (req, res, next) => {
  const { status = 'pending', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, address, category, status, applied_at, approved_at
       FROM merchants WHERE status = ? ORDER BY applied_at DESC LIMIT ? OFFSET ?`,
      [status, Number(limit), Number(offset)]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── 정산 목록 조회 ────────────────────────────────
router.get('/settlements', authenticate, authorize('admin'), async (req, res, next) => {
  const { period } = req.query; // 'YYYY-MM'
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return res.status(400).json({ success: false, message: 'period 파라미터가 필요합니다. (예: 2026-04)' });
  }
  try {
    const [rows] = await pool.execute(
      `SELECT s.*, m.name AS merchant_name
       FROM settlements s
       JOIN merchants m ON s.merchant_id = m.id
       WHERE s.period = ?
       ORDER BY s.generated_at DESC`,
      [period]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── 정산 파일 일괄 생성 ───────────────────────────
router.post('/settlements/generate', authenticate, authorize('admin'), async (req, res, next) => {
  const now = new Date();
  // 전월 정산 기간
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const period = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 전월 쿠폰 사용 내역 집계
    const [merchants] = await connection.execute(
      `SELECT ct.merchant_id, m.name AS merchant_name,
              SUM(ct.amount) AS total_amount, COUNT(*) AS tx_count
       FROM coupon_transactions ct
       JOIN merchants m ON ct.merchant_id = m.id
       WHERE DATE_FORMAT(ct.scanned_at, '%Y-%m') = ?
       GROUP BY ct.merchant_id, m.name`,
      [period]
    );

    if (merchants.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: `${period} 정산 대상 내역이 없습니다.` });
    }

    let created = 0;
    for (const m of merchants) {
      await connection.execute(
        `INSERT INTO settlements (merchant_id, period, total_amount, status, generated_at)
         VALUES (?, ?, ?, 'file_generated', NOW())
         ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount), status = 'file_generated', generated_at = NOW()`,
        [m.merchant_id, period, m.total_amount]
      );
      created++;
    }

    await connection.commit();
    res.json({ success: true, message: `${period} 정산 파일 ${created}건 생성 완료` });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// ── FDS 알림 목록 조회 ──────────────────────────────
router.get('/fds', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.*, m.name as merchant_name, u.nickname as user_nickname 
       FROM fds_alerts f
       LEFT JOIN merchants m ON f.merchant_id = m.id
       LEFT JOIN users u ON f.user_id = u.id
       ORDER BY f.detected_at DESC LIMIT 50`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── FDS 알림 해결 ─────────────────────────────────
router.patch('/fds/:id/resolve', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await pool.execute(
      `UPDATE fds_alerts SET resolved = 1, resolved_at = NOW(), resolved_by = ? WHERE id = ?`,
      [req.user.id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── 쿠폰(난수) 일괄 발행 ───────────────────────────
const crypto = require('crypto');
const { hashCouponCode } = require('../utils/crypto');

router.post('/coupons/generate', authenticate, authorize('admin'), async (req, res, next) => {
  const { issuer, type, quantity } = req.body;
  if (!issuer || !type || !quantity || quantity < 1) {
    return res.status(400).json({ success: false, message: '발행처, 권종, 수량을 올바르게 입력해주세요.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const newCoupons = [];
    const values = [];
    
    // 난수 생성 로직: OJC-랜덤8자리
    for (let i = 0; i < quantity; i++) {
      const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
      const code = `OJC-${randomStr}`;
      const codeHash = hashCouponCode(code);
      
      newCoupons.push({ code, faceValue: type, issuer });
      values.push([codeHash, type, issuer]);
    }

    // 벌크 인서트 (mysql2 에서는 배열의 배열을 사용)
    await connection.query(
      `INSERT INTO paper_coupons (random_code_hash, face_value, issued_by_location) VALUES ?`,
      [values]
    );

    await connection.commit();

    // 생성된 쿠폰 원본 코드 반환 (이후 프론트에서 엑셀로 다운로드)
    res.json({ success: true, message: `${quantity}장 발행 완료`, data: newCoupons });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

module.exports = router;
