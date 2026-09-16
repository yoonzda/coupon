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

// ── 대시보드 통계 (3단계 쿠폰 라이프사이클 & 예산 4대 지표) ─────────────────────────────────
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

// ── 대시보드 요약 통계 (index.html용 - 3단계 라이프사이클 및 예산 4대 지표) ───────────────
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
    const [[{ pendingCount }]] = await pool.execute(
      `SELECT COUNT(*) AS pendingCount FROM merchants WHERE status = 'pending'`
    );
    const [[{ fdsCount }]] = await pool.execute(
      `SELECT COUNT(*) AS fdsCount FROM fds_alerts WHERE resolved = 0`
    );

    // 3단계 쿠폰 카운트 집계
    // 1단계 [쿠폰 발급]: 발행처 결제 발생으로 생성된 쿠폰 총 수량
    // 2단계 [쿠폰 등록]: 관광객 본인인증으로 지갑 등록된 수량 (issued_to IS NOT NULL)
    // 3단계 [쿠폰 사용]: 가맹점에서 결제 사용 완료된 수량 (status = 'used')
    const [[{ stage1_issued }]] = await pool.execute(
      `SELECT COALESCE(SUM(issued_count), 0) AS stage1_issued FROM issuer_allocations`
    );
    const [[{ stage2_registered }]] = await pool.execute(
      `SELECT COUNT(*) AS stage2_registered FROM coupons WHERE issued_to IS NOT NULL`
    );
    const [[{ stage3_used }]] = await pool.execute(
      `SELECT COUNT(*) AS stage3_used FROM coupons WHERE status = 'used'`
    );

    // 예산 4대 회계 지표 계산 (기본 2,000,000원 설정)
    const [[settingRow]] = await pool.execute(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'total_budget' LIMIT 1`
    );
    const totalBudget = settingRow ? Number(settingRow.setting_value) : 2000000;

    // 3단계 사용 지출액 (실제 집행 예산)
    const [[{ executedBudget }]] = await pool.execute(
      `SELECT COALESCE(SUM(face_value), 0) AS executedBudget FROM coupons WHERE status = 'used'`
    );
    // 발행처 배정 예산 (관리자가 각 발행처에 배정한 총 금액)
    const [[{ allocatedBudget }]] = await pool.execute(
      `SELECT COALESCE(SUM(face_value * total_count), 0) AS allocatedBudget FROM issuer_allocations`
    );
    // 1단계 & 2단계 미사용 잠정 묶임 금액 (점유/예약 예산)
    const [[{ reservedBudget }]] = await pool.execute(
      `SELECT COALESCE(SUM(face_value), 0) AS reservedBudget FROM coupons WHERE status != 'used' AND status != 'expired'`
    );
    // 추가 배정 가능 잔액 (집행 가능 잔여 예산)
    const availableBudget = Math.max(0, totalBudget - Number(allocatedBudget));

    res.json({
      success: true,
      totalAmount: Number(txStats.totalAmount),
      txCount: txStats.txCount,
      userCount,
      merchantCount,
      pendingCount,
      fdsCount,
      // 3단계 파이프라인 수치
      stage1_issued: Number(stage1_issued) || 0,
      stage2_registered: Number(stage2_registered) || 0,
      stage3_used: Number(stage3_used) || 0,
      // 하위 호환 필드
      couponIssued: Number(stage2_registered) || 0,
      couponUsed: Number(stage3_used) || 0,
      // 예산 지표
      totalBudget,
      allocatedBudget: Number(allocatedBudget),
      executedBudget: Number(executedBudget),
      reservedBudget: Number(reservedBudget),
      availableBudget
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
    const [rows] = await pool.query(
      `SELECT * FROM merchants WHERE status = ? ORDER BY applied_at DESC LIMIT ? OFFSET ?`,
      [status, Number(limit), Number(offset)]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── 가맹점 단건 상세 조회 ──────────────────────────────
router.get('/merchants/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [[merchant]] = await pool.execute(
      `SELECT * FROM merchants WHERE id = ?`,
      [req.params.id]
    );
    if (!merchant) {
      return res.status(404).json({ success: false, message: '가맹점을 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: merchant });
  } catch (err) { next(err); }
});

// ── 정산 가능 연월 목록 조회 (필터용) ───────────────
router.get('/settlements/periods', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [settlementPeriods] = await pool.execute(
      `SELECT DISTINCT period AS yr_mo FROM settlements`
    );
    const [txPeriods] = await pool.execute(
      `SELECT DISTINCT DATE_FORMAT(scanned_at, '%Y-%m') AS yr_mo FROM coupon_transactions WHERE scanned_at IS NOT NULL`
    );

    const periodsSet = new Set();
    settlementPeriods.forEach(r => {
      if (r.yr_mo) periodsSet.add(r.yr_mo);
    });
    txPeriods.forEach(r => {
      if (r.yr_mo) periodsSet.add(r.yr_mo);
    });

    if (periodsSet.size === 0) {
      const now = new Date();
      const curPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevPeriod = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      periodsSet.add(curPeriod);
      periodsSet.add(prevPeriod);
    }

    const sortedPeriods = Array.from(periodsSet).sort().reverse();
    res.json({ success: true, data: sortedPeriods });
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

// ── 전체 예산 조회 ────────────────────────────────
router.get('/budget', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [settings] = await pool.execute(
      `SELECT setting_value, updated_at FROM system_settings WHERE setting_key = 'total_budget'`
    );
    const totalBudget = settings.length > 0 ? Number(settings[0].setting_value) : 0;
    const updatedAt = settings.length > 0 ? settings[0].updated_at : null;

    const [allocations] = await pool.execute(
      `SELECT SUM(face_value * total_count) AS allocated FROM issuer_allocations`
    );
    const allocatedBudget = allocations[0].allocated ? Number(allocations[0].allocated) : 0;
    const remainingBudget = totalBudget - allocatedBudget;

    // 실제 발행(발급) 완료된 쿠폰액 집계
    const [issuedRes] = await pool.execute(
      `SELECT SUM(face_value) AS issued FROM coupons`
    );
    const issuedBudget = issuedRes[0].issued ? Number(issuedRes[0].issued) : 0;

    // 실제 사용(결제) 완료된 쿠폰액 집계 (정산 대상 금액)
    const [usedRes] = await pool.execute(
      `SELECT SUM(face_value) AS used FROM coupons WHERE status = 'used'`
    );
    const usedBudget = usedRes[0].used ? Number(usedRes[0].used) : 0;

    res.json({
      success: true,
      data: {
        totalBudget,
        allocatedBudget,
        remainingBudget,
        issuedBudget,
        usedBudget,
        updatedAt
      }
    });
  } catch (err) { next(err); }
});

// ── 전체 예산 설정 ────────────────────────────────
router.post('/budget', authenticate, authorize('admin'), async (req, res, next) => {
  const { totalBudget } = req.body;
  if (totalBudget === undefined || isNaN(Number(totalBudget)) || Number(totalBudget) < 0) {
    return res.status(400).json({ success: false, message: '올바른 예산 금액을 입력해주세요.' });
  }
  try {
    const [allocations] = await pool.execute(
      `SELECT SUM(face_value * total_count) AS allocated FROM issuer_allocations`
    );
    const allocatedBudget = allocations[0].allocated ? Number(allocations[0].allocated) : 0;

    if (Number(totalBudget) < allocatedBudget) {
      return res.status(400).json({
        success: false,
        message: `설정하려는 예산 금액(${Number(totalBudget).toLocaleString()}원)이 이미 배정된 쿠폰 예산 총액(${allocatedBudget.toLocaleString()}원)보다 작을 수 없습니다.`
      });
    }

    await pool.execute(
      `INSERT INTO system_settings (setting_key, setting_value) 
       VALUES ('total_budget', ?) 
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [String(totalBudget), String(totalBudget)]
    );
    res.json({ success: true, message: '전체 예산이 설정되었습니다.' });
  } catch (err) { next(err); }
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

// ── 관리자 계정 목록 ──────────────────────────────
router.get('/managers', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, username, name, role, created_at FROM admins ORDER BY created_at ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── 관리자 계정 등록 ──────────────────────────────
router.post('/managers', authenticate, authorize('admin'), async (req, res, next) => {
  if (req.user.adminRole !== 'super') {
    return res.status(403).json({ success: false, message: '최고 관리자만 접근 가능합니다.' });
  }

  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
  }

  try {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute(
      `INSERT INTO admins (username, password_hash, name, role) VALUES (?, ?, ?, ?)`,
      [username, hashedPassword, name, role]
    );
    res.json({ success: true, message: '관리자가 등록되었습니다.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '이미 존재하는 아이디입니다.' });
    }
    next(err);
  }
});

// ── 관리자 계정 다중 삭제 ───────────────────────────
router.delete('/managers', authenticate, authorize('admin'), async (req, res, next) => {
  if (req.user.adminRole !== 'super') {
    return res.status(403).json({ success: false, message: '최고 관리자만 접근 가능합니다.' });
  }

  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: '삭제할 관리자를 선택해주세요.' });
  }

  // 본인 계정 삭제 방지
  if (ids.includes(req.user.id)) {
    return res.status(400).json({ success: false, message: '본인 계정은 삭제할 수 없습니다.' });
  }

  try {
    const placeholders = ids.map(() => '?').join(',');
    await pool.execute(
      `DELETE FROM admins WHERE id IN (${placeholders})`,
      ids
    );
    res.json({ success: true, message: '선택한 관리자가 삭제되었습니다.' });
  } catch (err) { next(err); }
});

// ── 관리자 개별 정보 조회 (수정용) ────────────────────
router.get('/managers/:id', authenticate, authorize('admin'), async (req, res, next) => {
  if (req.user.adminRole !== 'super') {
    return res.status(403).json({ success: false, message: '최고 관리자만 접근 가능합니다.' });
  }
  try {
    const [[manager]] = await pool.execute(
      `SELECT id, username, name, role FROM admins WHERE id = ?`,
      [req.params.id]
    );
    if (!manager) {
      return res.status(404).json({ success: false, message: '관리자를 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: manager });
  } catch (err) { next(err); }
});

// ── 관리자 정보 수정 ──────────────────────────────────
router.put('/managers/:id', authenticate, authorize('admin'), async (req, res, next) => {
  if (req.user.adminRole !== 'super') {
    return res.status(403).json({ success: false, message: '최고 관리자만 접근 가능합니다.' });
  }
  const { name, role, password } = req.body;
  if (!name || !role) {
    return res.status(400).json({ success: false, message: '이름과 권한을 입력해주세요.' });
  }
  try {
    if (password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.execute(
        `UPDATE admins SET name = ?, role = ?, password_hash = ? WHERE id = ?`,
        [name, role, hashedPassword, req.params.id]
      );
    } else {
      await pool.execute(
        `UPDATE admins SET name = ?, role = ? WHERE id = ?`,
        [name, role, req.params.id]
      );
    }
    res.json({ success: true, message: '관리자 정보가 수정되었습니다.' });
  } catch (err) { next(err); }
});

// ── 관광객 회원 목록 조회 ───────────────────────────────────
router.get('/users', authenticate, async (req, res, next) => {
  try {
    // Both super and operator can access this route
    const [rows] = await pool.execute(
      `SELECT id, social_provider, nickname, email, phone_hash, coupon_balance, created_at 
       FROM users 
       WHERE role = 'tourist' 
       ORDER BY created_at DESC`
    );

    const mapped = rows.map(u => {
      let nickname = u.nickname || '미인증';
      let phone_last4 = null;
      const clean = nickname.replace(/[^0-9]/g, '');
      if (clean.startsWith('010') && clean.length >= 10) {
        const part1 = clean.substring(0, 3);
        const part3 = clean.substring(clean.length - 4);
        nickname = `${part1}-****-${part3}`;
        phone_last4 = part3;
      }
      return {
        ...u,
        nickname,
        phone_last4
      };
    });

    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

// ── 관광객 회원 탈퇴 처리 (완전 삭제) ─────────────────────────
router.delete('/users/:id', authenticate, async (req, res, next) => {
  const userId = req.params.id;

  try {
    const [result] = await pool.execute(
      `DELETE FROM users WHERE id = ? AND role = 'tourist'`,
      [userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '해당 회원을 찾을 수 없습니다.' });
    }
    
    res.json({ success: true, message: '회원 정보가 완전히 삭제되었습니다.' });
  } catch (err) { next(err); }
});

// ── 관광객 회원 쿠폰 내역 조회 ─────────────────────────
router.get('/users/:id/coupons', authenticate, async (req, res, next) => {
  const userId = req.params.id;
  try {
    const [rows] = await pool.execute(
      `SELECT c.id, c.code_hash, c.coupon_type, c.face_value, c.status, c.issued_at, c.used_at,
              i.name AS issuer_name,
              m.name AS merchant_name
       FROM coupons c
       LEFT JOIN issuer_allocations ia ON c.issuer_allocation_id = ia.id
       LEFT JOIN issuers i ON ia.issuer_id = i.id
       LEFT JOIN coupon_transactions ct ON c.id = ct.coupon_id
       LEFT JOIN merchants m ON ct.merchant_id = m.id
       WHERE c.issued_to = ?
       ORDER BY c.issued_at DESC`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── 0.5 쿠폰 지급 규정 목록 조회 및 수정 ──
router.get('/issuance-rules', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rules] = await pool.execute(
      `SELECT id, min_amount, max_amount, face_value, rule_name, display_order 
       FROM coupon_issuance_rules ORDER BY display_order ASC, min_amount ASC`
    );
    res.json({ success: true, data: rules });
  } catch (err) { next(err); }
});

router.put('/issuance-rules', authenticate, authorize('admin'), async (req, res, next) => {
  const { rules } = req.body;
  if (!rules || !Array.isArray(rules)) {
    return res.status(400).json({ success: false, message: '규정 데이터가 올바르지 않습니다.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      const maxAmt = (r.max_amount === null || r.max_amount === '' || r.max_amount === undefined) ? null : Number(r.max_amount);
      if (r.id) {
        await connection.execute(
          `UPDATE coupon_issuance_rules 
           SET min_amount = ?, max_amount = ?, face_value = ?, rule_name = ?, display_order = ?
           WHERE id = ?`,
          [Number(r.min_amount), maxAmt, Number(r.face_value), r.rule_name || null, i + 1, r.id]
        );
      } else {
        await connection.execute(
          `INSERT INTO coupon_issuance_rules (min_amount, max_amount, face_value, rule_name, display_order)
           VALUES (?, ?, ?, ?, ?)`,
          [Number(r.min_amount), maxAmt, Number(r.face_value), r.rule_name || null, i + 1]
        );
      }
    }
    await connection.commit();
    res.json({ success: true, message: '쿠폰 지급 규정이 저장되었습니다.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// ── 1. 발행처 목록 및 배정 현황 조회 ──
router.get('/issuers', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [issuers] = await pool.execute(
      `SELECT id, username, name, product_name, product_price, created_at FROM issuers ORDER BY created_at ASC`
    );
    const [allocations] = await pool.execute(
      `SELECT id, issuer_id, face_value, total_count, issued_count, created_at 
       FROM issuer_allocations ORDER BY created_at ASC`
    );
    res.json({ success: true, data: { issuers, allocations } });
  } catch (err) { next(err); }
});

// ── 2. 신규 발행처 등록 ──
router.post('/issuers', authenticate, authorize('admin'), async (req, res, next) => {
  const { username, password, name, productName, productPrice } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ success: false, message: '아이디, 비밀번호, 발행처명을 모두 입력해주세요.' });
  }
  if (!productName || productPrice === undefined || productPrice === null || isNaN(productPrice) || Number(productPrice) < 0) {
    return res.status(400).json({ success: false, message: '입장권(제품)명과 제품 금액을 정확히 입력해주세요.' });
  }
  try {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute(
      `INSERT INTO issuers (username, password_hash, name, product_name, product_price) VALUES (?, ?, ?, ?, ?)`,
      [username, hashedPassword, name, productName, Number(productPrice)]
    );
    res.json({ success: true, message: '발행처가 등록되었습니다.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '이미 존재하는 발행처 아이디입니다.' });
    }
    next(err);
  }
});

// ── 2.5 단일 발행처 상세 조회 ──
router.get('/issuers/:id', authenticate, authorize('admin'), async (req, res, next) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT id, username, name, product_name, product_price, created_at FROM issuers WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '존재하지 않는 발행처입니다.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ── 2.6 발행처 정보 수정 ──
router.put('/issuers/:id', authenticate, authorize('admin'), async (req, res, next) => {
  const { id } = req.params;
  const { name, password, productName, productPrice } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: '기관명을 입력해주세요.' });
  }
  try {
    const updateFields = ['name = ?'];
    const updateParams = [name];

    if (productName !== undefined) {
      updateFields.push('product_name = ?');
      updateParams.push(productName);
    }
    if (productPrice !== undefined && !isNaN(productPrice)) {
      updateFields.push('product_price = ?');
      updateParams.push(Number(productPrice));
    }
    if (password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password_hash = ?');
      updateParams.push(hashedPassword);
    }

    updateParams.push(id);
    await pool.execute(
      `UPDATE issuers SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );
    res.json({ success: true, message: '발행처 정보가 수정되었습니다.' });
  } catch (err) { next(err); }
});

// ── 2.7 발행처 삭제 ──
router.delete('/issuers/:id', authenticate, authorize('admin'), async (req, res, next) => {
  const { id } = req.params;
  try {
    const [allocations] = await pool.execute(
      `SELECT id FROM issuer_allocations WHERE issuer_id = ?`,
      [id]
    );
    if (allocations.length > 0) {
      return res.status(400).json({ success: false, message: '배정된 쿠폰 내역이 존재하는 발행처는 삭제할 수 없습니다.' });
    }
    
    await pool.execute(
      `DELETE FROM issuers WHERE id = ?`,
      [id]
    );
    res.json({ success: true, message: '발행처가 삭제되었습니다.' });
  } catch (err) { next(err); }
});

// ── 3. 발행처 쿠폰 배정 ──
router.post('/issuers/allocations', authenticate, authorize('admin'), async (req, res, next) => {
  const { issuerId, faceValue, totalCount } = req.body;
  if (!issuerId || !faceValue || !totalCount || totalCount < 1) {
    return res.status(400).json({ success: false, message: '발행처, 배정 금액, 배정 수량을 올바르게 입력해주세요.' });
  }
  try {
    // 이미 다른 금액권이 배정되어 있는지 검사
    const [existing] = await pool.execute(
      `SELECT DISTINCT face_value FROM issuer_allocations WHERE issuer_id = ?`,
      [issuerId]
    );
    if (existing.length > 0 && existing.some(e => Number(e.face_value) !== Number(faceValue))) {
      return res.status(400).json({
        success: false,
        message: `이미 이 발행처에는 다른 금액권(${Number(existing[0].face_value).toLocaleString()}원)이 배정되어 있습니다. 한 발행처에는 동일한 금액권만 배정할 수 있습니다.`
      });
    }

    // 예산 초과 검사
    const [settings] = await pool.execute(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'total_budget'`
    );
    const totalBudget = settings.length > 0 ? Number(settings[0].setting_value) : 0;

    const [allocations] = await pool.execute(
      `SELECT SUM(face_value * total_count) AS allocated FROM issuer_allocations`
    );
    const allocatedBudget = allocations[0].allocated ? Number(allocations[0].allocated) : 0;
    const remainingBudget = totalBudget - allocatedBudget;

    const requestedAmount = Number(faceValue) * Number(totalCount);
    if (requestedAmount > remainingBudget) {
      return res.status(400).json({
        success: false,
        message: `신규 배정 금액 총액(${requestedAmount.toLocaleString()}원)이 남은 예산(${remainingBudget.toLocaleString()}원)을 초과합니다.`
      });
    }

    await pool.execute(
      `INSERT INTO issuer_allocations (issuer_id, face_value, total_count) VALUES (?, ?, ?)`,
      [issuerId, faceValue, totalCount]
    );
    res.json({ success: true, message: '발행처 쿠폰 배정이 완료되었습니다.' });
  } catch (err) { next(err); }
});

// ── 4. 전체 쿠폰 상태 목록 조회 (3단계 쿠폰 라이프사이클) ──
router.get('/coupons/status-list', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT c.id, c.code_hash, c.coupon_type, c.face_value, c.status, c.issued_at, c.used_at,
              COALESCE(u.nickname, u.provider_id, '- (미등록 대기)') AS tourist_phone,
              COALESCE(i.name, '발행처') AS issuer_name,
              COALESCE(m.name, '-') AS used_merchant_name,
              CASE
                WHEN c.status = 'used' THEN '3단계: 쿠폰 사용'
                WHEN c.issued_to IS NOT NULL THEN '2단계: 쿠폰 등록'
                ELSE '1단계: 쿠폰 발급'
              END AS stage_label
       FROM coupons c
       LEFT JOIN users u ON c.issued_to = u.id
       LEFT JOIN issuer_allocations ia ON c.issuer_allocation_id = ia.id
       LEFT JOIN issuers i ON ia.issuer_id = i.id
       LEFT JOIN coupon_transactions ct ON c.id = ct.coupon_id
       LEFT JOIN merchants m ON ct.merchant_id = m.id
       ORDER BY c.issued_at DESC LIMIT 200`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── 통계 보고서 데이터 (statistics.html용) ─────────
router.get('/stats/reports', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    // 1. KPI 카드용 누적 데이터
    const [[kpiStats]] = await pool.execute(
      `SELECT
         COUNT(*) AS total_issued,
         SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS total_used,
         SUM(CASE WHEN status = 'used' THEN face_value ELSE 0 END) AS total_settled
       FROM coupons`
    );
    const [[activeMerchants]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM merchants WHERE status = 'approved'`
    );

    // 2. 월별 발행 및 사용 추이 (최근 6개월)
    const [monthlyRows] = await pool.execute(
      `SELECT 
         DATE_FORMAT(c.issued_at, '%Y-%m') AS month,
         COUNT(*) AS issued_count,
         SUM(CASE WHEN c.status = 'used' THEN 1 ELSE 0 END) AS used_count
       FROM coupons c
       WHERE c.issued_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(c.issued_at, '%Y-%m')
       ORDER BY month ASC`
    );

    // 3. 지역별 쿠폰 소진 건수
    const [regionRows] = await pool.execute(
      `SELECT 
         m.address,
         COUNT(*) AS count
       FROM coupons c
       JOIN coupon_transactions ct ON c.id = ct.coupon_id
       JOIN merchants m ON ct.merchant_id = m.id
       WHERE c.status = 'used'
       GROUP BY m.address`
    );

    // 4. 우수 가맹점 Top 5
    const [topMerchants] = await pool.execute(
      `SELECT 
         m.name,
         m.address,
         COUNT(ct.id) AS tx_count,
         COALESCE(SUM(ct.amount), 0) AS total_amount
       FROM merchants m
       LEFT JOIN coupon_transactions ct ON m.id = ct.merchant_id
       WHERE m.status = 'approved'
       GROUP BY m.id, m.name, m.address
       ORDER BY tx_count DESC, total_amount DESC
       LIMIT 5`
    );

    // 지역 데이터 파싱 (인천 옹진군 백령면 -> 백령면 추출)
    const regionMap = {};
    for (const row of regionRows) {
      const addr = row.address || '';
      const parts = addr.split(' ');
      // '면' 또는 '구' 등으로 끝나는 단어 찾기
      const region = parts.find(p => p.endsWith('면') || p.endsWith('구') || p.endsWith('동') || p.endsWith('군') || p.endsWith('시')) || '기타';
      regionMap[region] = (regionMap[region] || 0) + row.count;
    }
    const regionData = Object.entries(regionMap).map(([name, value]) => ({ name, value }));

    res.json({
      success: true,
      data: {
        kpis: {
          totalIssued: kpiStats.total_issued || 0,
          totalUsed: kpiStats.total_used || 0,
          totalSettled: Number(kpiStats.total_settled || 0),
          activeMerchants: activeMerchants.count || 0
        },
        monthlyTrend: monthlyRows,
        regionDistribution: regionData,
        topMerchants
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
