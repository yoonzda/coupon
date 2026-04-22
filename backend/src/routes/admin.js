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

module.exports = router;
