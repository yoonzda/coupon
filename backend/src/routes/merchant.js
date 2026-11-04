const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const { authenticate, authorize } = require('../middleware/auth');
const pool = require('../config/database');

// 모든 가맹점 API는 인증 필요
router.use(authenticate);

// 가맹점 내 정보 조회 (반려 시 재입점 양식 채우기용)
router.get('/my-info', async (req, res, next) => {
  const merchantId = req.user.id;
  try {
    const [merchants] = await pool.execute(
      `SELECT id, name, owner_name, phone, store_phone, category, address, images,
              business_hours, business_no, business_cert_image, bank_name, account_no, bankbook_image,
              username, status, rejection_reason 
       FROM merchants WHERE id = ? LIMIT 1`,
      [merchantId]
    );
    if (merchants.length === 0) {
      return res.status(404).json({ success: false, message: '가맹점 정보를 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: merchants[0] });
  } catch (err) {
    next(err);
  }
});

// 가맹점 입점 재신청
router.post('/reapply', async (req, res, next) => {
  const merchantId = req.user.id;
  const {
    ownerName,
    phone,
    shopName,
    storePhone,
    category,
    password,
    address,
    images,
    businessHours,
    businessNo,
    businessCertImage,
    bankName,
    accountNo,
    bankbookImage,
    lat,
    lng
  } = req.body;

  if (!ownerName || !phone || !shopName || !address || !category) {
    return res.status(400).json({ success: false, message: '필수 정보를 모두 입력해 주세요.' });
  }

  const { hashPhone } = require('../utils/crypto');
  try {
    // 1. 현재 가맹점 조회 및 기존 번호 확인
    const [current] = await pool.execute(
      'SELECT id, phone FROM merchants WHERE id = ? LIMIT 1',
      [merchantId]
    );

    if (current.length === 0) {
      return res.status(404).json({ success: false, message: '가맹점 정보를 찾을 수 없습니다.' });
    }

    const phoneHash = hashPhone(phone.replace(/\D/g, ''));

    // 2. 전화번호 변경된 경우에만 중복 체크
    const formattedPhone = phone.replace(/\D/g, '').replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
    if (formattedPhone !== current[0].phone) {
      const [existingPhone] = await pool.execute(
        `SELECT id FROM merchants WHERE phone_hash = ? AND id != ? LIMIT 1`,
        [phoneHash, merchantId]
      );
      if (existingPhone.length > 0) {
        return res.status(400).json({ success: false, message: '이미 등록된 휴대폰 번호입니다.' });
      }
    }

    const formattedStorePhone = storePhone ? storePhone.replace(/\D/g, '').replace(/(\d{2,3})(\d{3,4})(\d{4})/, '$1-$2-$3') : null;
    const imagesJson = Array.isArray(images) ? JSON.stringify(images) : images || null;

    // 3. 업데이트 수행 (상태를 pending으로 복구, 반려 사유는 null로 리셋)
    const bcrypt = require('bcryptjs');
    const hasNewPassword = typeof password === 'string' && password.trim().length > 0;
    const newPasswordHash = hasNewPassword ? await bcrypt.hash(password.trim(), 10) : null;

    await pool.execute(
      `UPDATE merchants SET 
        name = ?,
        owner_name = ?,
        phone = ?,
        phone_hash = ?,
        store_phone = ?,
        category = ?,
        password_hash = COALESCE(?, password_hash),
        address = ?,
        images = ?,
        business_hours = ?,
        business_no = ?,
        business_cert_image = ?,
        bank_name = ?,
        account_no = ?,
        bankbook_image = ?,
        status = 'pending',
        rejection_reason = NULL,
        applied_at = NOW(),
        lat = ?,
        lng = ?
       WHERE id = ?`,
      [
        shopName, ownerName, formattedPhone, phoneHash, formattedStorePhone, category,
        newPasswordHash,
        address, imagesJson,
        businessHours, businessNo, businessCertImage, bankName, accountNo, bankbookImage,
        lat || null, lng || null,
        merchantId
      ]
    );

    res.json({ success: true, message: '재입점 신청이 완료되었습니다.' });
  } catch (err) {
    next(err);
  }
});

// ── 관광객 쿠폰 사용 요청 실시간 조회 및 승인/거절 ──
router.get('/use-requests', authorize('merchant', 'merchant_staff'), async (req, res, next) => {
  try {
    const includeProcessed = req.query.includeProcessed === '1';
    if (includeProcessed) {
      const [rows] = await pool.execute(
        `SELECT id, merchant_id, user_id, user_phone, coupon_ids, coupon_count, total_amount, status, requested_at, processed_at
         FROM coupon_usage_requests
         WHERE merchant_id = ?
           AND (
             (status = 'pending' AND requested_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE))
             OR (status IN ('approved', 'rejected', 'cancelled') AND requested_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR))
           )
         ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END ASC, requested_at DESC
         LIMIT 30`,
        [req.user.id]
      );
      return res.json({ success: true, data: rows });
    }

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

    const [mRows] = await connection.execute(
      `SELECT id, name, status FROM merchants WHERE id = ? LIMIT 1`,
      [merchantId]
    );
    if (mRows.length === 0 || mRows[0].status !== 'approved') {
      await connection.rollback();
      return res.status(403).json({ success: false, message: '승인된 가맹점만 쿠폰 결제를 처리할 수 있습니다.' });
    }

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

// 쿠폰 스캔 및 결제
router.post('/scan', merchantController.scanCoupon);

// 거래 내역 조회
router.get('/transactions', merchantController.getTransactions);

module.exports = router;
