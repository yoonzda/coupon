const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const { authenticate, authorize } = require('../middleware/auth');
const pool = require('../config/database');
const { hashPhone } = require('../utils/crypto');
const bcrypt = require('bcryptjs');

// ── 공개 API: 가맹점 입점 신청 (인증 불필요) ─────────────────────
router.post('/apply', async (req, res, next) => {
  const { name, phone, businessNo, address, category } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: '상점명과 연락처는 필수 항목입니다.' });
  }

  try {
    const phoneHash = hashPhone(phone);
    // 중복 신청 체크
    const [existing] = await pool.execute(
      'SELECT id, status FROM merchants WHERE phone_hash = ? LIMIT 1',
      [phoneHash]
    );
    if (existing.length > 0) {
      const statusText = existing[0].status === 'approved' ? '이미 승인된 가맹점입니다.' : '이미 신청 접수되어 심사 중입니다.';
      return res.status(409).json({ success: false, message: statusText });
    }

    await pool.execute(
      `INSERT INTO merchants (name, phone, phone_hash, business_no, address, category, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [name.trim(), phone.trim(), phoneHash, businessNo || null, address || null, category || null]
    );

    // 가맹점 입점 신청 접수 알림 전송 (비동기)
    const notificationService = require('../services/notificationService');
    notificationService.sendMerchantApplicationReceivedNotification(phone.trim(), name.trim())
      .catch(err => console.error('[Notification Async Error] 가맹점 신청 접수 알림 발송 실패:', err));

    res.json({ success: true, message: '가맹점 입점 신청이 성공적으로 접수되었습니다. 심사 후 승인 안내 문자가 발송됩니다.' });
  } catch (err) {
    next(err);
  }
});

// ── 가맹점 전용 API (인증 필수) ───────────────────────────
router.use(authenticate);

// ── [직원 & 점주 공통 허용] 쿠폰 스캔 및 당일 거래 내역 ─────────────
router.post('/scan', authorize('merchant', 'merchant_staff'), merchantController.scanCoupon);
router.get('/transactions', authorize('merchant', 'merchant_staff'), merchantController.getTransactions);
router.post('/transactions/:id/cancel', authorize('merchant', 'merchant_staff'), merchantController.cancelTransaction);

// 매장 기본 정보 조회 (직원 모드에서도 매장 상호명 표기용)
router.get('/basic-info', authorize('merchant', 'merchant_staff'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, category, address, phone FROM merchants WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '가맹점 정보를 찾을 수 없습니다.' });
    }
    res.json({
      success: true,
      data: {
        ...rows[0],
        role: req.user.role,
        isStaff: req.user.role === 'merchant_staff'
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── [직원 & 점주 공통 허용] 관광객 쿠폰 사용 요청 실시간 조회 및 승인/거절 ──
router.get('/use-requests', authorize('merchant', 'merchant_staff'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, merchant_id, user_id, user_phone, coupon_ids, coupon_count, total_amount, status, requested_at, processed_at
       FROM coupon_usage_requests
       WHERE merchant_id = ?
         AND status = 'pending'
         AND requested_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
       ORDER BY requested_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/use-requests/:id/approve', authorize('merchant', 'merchant_staff'), async (req, res, next) => {
  const requestId = req.params.id;
  const merchantId = req.user.id;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 0. 가맹점 상태 확인
    const [mRows] = await connection.execute(
      `SELECT id, name, status FROM merchants WHERE id = ? LIMIT 1`,
      [merchantId]
    );
    if (mRows.length === 0 || mRows[0].status !== 'approved') {
      await connection.rollback();
      return res.status(403).json({ success: false, message: '승인된 가맹점만 쿠폰 결제를 처리할 수 있습니다.' });
    }

    // 1. 요청 잠금 조회
    const [reqRows] = await connection.execute(
      `SELECT * FROM coupon_usage_requests WHERE id = ? AND merchant_id = ? FOR UPDATE`,
      [requestId, merchantId]
    );
    if (reqRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '해당 쿠폰 사용 요청을 찾을 수 없습니다.' });
    }

    const usageReq = reqRows[0];
    if (usageReq.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: '이미 처리되었거나 취소된 요청입니다.' });
    }

    let couponIds = [];
    try {
      couponIds = Array.isArray(usageReq.coupon_ids) ? usageReq.coupon_ids : JSON.parse(usageReq.coupon_ids || '[]');
    } catch (_) {
      couponIds = [];
    }

    if (couponIds.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: '요청에 포함된 쿠폰 정보가 올바르지 않습니다.' });
    }

    const placeholders = couponIds.map(() => '?').join(',');
    const [coupons] = await connection.execute(
      `SELECT id, face_value, issued_to, status, expires_at FROM coupons WHERE id IN (${placeholders}) FOR UPDATE`,
      couponIds
    );

    const availCoupons = coupons.filter(c => c.status === 'available' && (!c.expires_at || new Date(c.expires_at) > new Date()));
    if (availCoupons.length !== couponIds.length) {
      await connection.execute(
        `UPDATE coupon_usage_requests SET status = 'cancelled', processed_at = NOW(), reject_reason = '쿠폰 상태 변경됨' WHERE id = ?`,
        [requestId]
      );
      await connection.commit();
      return res.status(409).json({ success: false, message: '고객의 쿠폰이 이미 사용되었거나 만료되어 승인할 수 없습니다.' });
    }

    let totalApprovedAmount = 0;
    for (const c of availCoupons) {
      const [upd] = await connection.execute(
        `UPDATE coupons SET status = 'used', used_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'available'`,
        [c.id]
      );
      if (upd.affectedRows === 0) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: '동시 결제가 감지되어 처리를 중단했습니다.' });
      }

      await connection.execute(
        `INSERT INTO coupon_transactions (coupon_id, merchant_id, user_id, amount) VALUES (?, ?, ?, ?)`,
        [c.id, merchantId, c.issued_to, c.face_value]
      );

      if (c.issued_to) {
        await connection.execute(
          `UPDATE users SET coupon_balance = GREATEST(0, coupon_balance - ?) WHERE id = ?`,
          [c.face_value, c.issued_to]
        );
      }

      totalApprovedAmount += Number(c.face_value || 0);
    }

    await connection.execute(
      `UPDATE coupon_usage_requests SET status = 'approved', processed_at = NOW() WHERE id = ?`,
      [requestId]
    );

    await connection.commit();

    // FDS 비동기 검사
    const fdsService = require('../services/fdsService');
    for (const c of availCoupons) {
      setImmediate(() => {
        fdsService.inspectTransaction({
          couponId: c.id,
          merchantId,
          userId: c.issued_to,
          amount: c.face_value
        }).catch(() => {});
      });
    }

    res.json({
      success: true,
      message: `${availCoupons.length}장 (${totalApprovedAmount.toLocaleString()}원) 쿠폰 사용이 승인되었습니다.`,
      data: {
        requestId: Number(requestId),
        couponCount: availCoupons.length,
        totalAmount: totalApprovedAmount
      }
    });
  } catch (err) {
    await connection.rollback().catch(() => {});
    next(err);
  } finally {
    connection.release();
  }
});

router.post('/use-requests/:id/reject', authorize('merchant', 'merchant_staff'), async (req, res, next) => {
  const requestId = req.params.id;
  const merchantId = req.user.id;
  const reason = (req.body && req.body.reason) ? String(req.body.reason).trim() : '가맹점 거절';

  try {
    const [result] = await pool.execute(
      `UPDATE coupon_usage_requests
       SET status = 'rejected', processed_at = NOW(), reject_reason = ?
       WHERE id = ? AND merchant_id = ? AND status = 'pending'`,
      [reason, requestId, merchantId]
    );
    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: '이미 처리되었거나 취소된 요청입니다.' });
    }
    res.json({ success: true, message: '쿠폰 사용 요청을 거절했습니다.' });
  } catch (err) {
    next(err);
  }
});

// ── [점주 마스터 전용] 민감 정보 및 매장 관리 ───────────────────────
// 대시보드 요약 정보 조회 (매출 통계/정산 현황 포함)
router.get('/summary', authorize('merchant'), merchantController.getDashboardSummary);

// 매장 정보 관리 & 사진 업로드
router.get('/my-store', authorize('merchant'), merchantController.getMyStoreInfo);
router.put('/my-store', authorize('merchant'), merchantController.updateMyStoreInfo);
router.post('/upload-image', authorize('merchant'), merchantController.uploadStoreImage);

// 메뉴 관리 CRUD
router.get('/menus', authorize('merchant'), merchantController.getMenus);
router.post('/menus', authorize('merchant'), merchantController.createMenu);
router.put('/menus/:id', authorize('merchant'), merchantController.updateMenu);
router.delete('/menus/:id', authorize('merchant'), merchantController.deleteMenu);

// ── [점주 마스터 전용] 직원용 4자리 간편 PIN 관리 ─────────────────────
// 직원 PIN 설정 상태 조회
router.get('/staff-pin', authorize('merchant'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, phone, staff_pin_hash, staff_pin_enabled FROM merchants WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '가맹점을 찾을 수 없습니다.' });
    }
    const m = rows[0];
    res.json({
      success: true,
      data: {
        storeId: m.id,
        storeName: m.name,
        phone: m.phone,
        hasPin: Boolean(m.staff_pin_hash),
        enabled: Boolean(m.staff_pin_enabled)
      }
    });
  } catch (err) {
    next(err);
  }
});

// 직원 PIN 설정/변경/활성화 토글
router.put('/staff-pin', authorize('merchant'), async (req, res, next) => {
  const { pin, enabled } = req.body;
  try {
    if (req.body.reset === true || req.body.action === 'reset') {
      await pool.execute(
        'UPDATE merchants SET staff_pin_hash = NULL, staff_pin_enabled = 0 WHERE id = ?',
        [req.user.id]
      );
      return res.json({
        success: true,
        message: '직원 PIN 번호가 초기화(삭제)되었습니다.',
        hasPin: false,
        enabled: false
      });
    }

    if (enabled === false) {
      await pool.execute(
        'UPDATE merchants SET staff_pin_enabled = 0 WHERE id = ?',
        [req.user.id]
      );
      return res.json({
        success: true,
        message: '직원 PIN 로그인이 비활성화되었습니다.',
        enabled: false
      });
    }

    if (!pin) {
      if (enabled === true) {
        const [rows] = await pool.execute('SELECT staff_pin_hash FROM merchants WHERE id = ?', [req.user.id]);
        if (!rows[0]?.staff_pin_hash) {
          return res.status(400).json({ success: false, message: '먼저 4자리 PIN 번호를 설정해 주세요.' });
        }
        await pool.execute('UPDATE merchants SET staff_pin_enabled = 1 WHERE id = ?', [req.user.id]);
        return res.json({
          success: true,
          message: '직원 PIN 로그인이 활성화되었습니다.',
          enabled: true
        });
      }
      return res.status(400).json({ success: false, message: '설정할 4자리 PIN 번호를 입력해 주세요.' });
    }

    const pinStr = String(pin).trim();
    if (!/^\d{4}$/.test(pinStr)) {
      return res.status(400).json({ success: false, message: 'PIN 번호는 4자리 숫자여야 합니다.' });
    }

    const pinHash = await bcrypt.hash(pinStr, 10);
    await pool.execute(
      'UPDATE merchants SET staff_pin_hash = ?, staff_pin_enabled = 1 WHERE id = ?',
      [pinHash, req.user.id]
    );

    res.json({
      success: true,
      message: '직원 전용 4자리 PIN 번호가 안전하게 설정되었습니다.',
      enabled: true
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

