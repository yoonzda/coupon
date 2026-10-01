const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const pool = require('../config/database');
const { hashCouponCode, decodeSecureToken, encodeSecureToken, generateToken } = require('../utils/crypto');

// 쿠폰 배정 정보 조회 (암호화된 보안 토큰 또는 숫자 ID 해석)
router.get('/allocation-public/:token', async (req, res, next) => {
  const token = req.params.token;
  const { kioskSessionId } = req.query;
  const allocationId = decodeSecureToken(token);
  if (!allocationId) {
    return res.status(404).json({ success: false, message: '유효하지 않은 쿠폰 발급 정보입니다.' });
  }
  try {
    const [rows] = await pool.execute(
      `SELECT ia.id, ia.face_value, i.name as issuer_name 
       FROM issuer_allocations ia
       JOIN issuers i ON ia.issuer_id = i.id
       WHERE ia.id = ?`,
      [allocationId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '유효하지 않은 쿠폰 발급 정보입니다.' });
    }
    const data = { ...rows[0], secure_token: encodeSecureToken(rows[0].id) };

    // 키오스크 세션이 지정되어 있으면 세션 전체 쿠폰 금액 및 수량 합산 반영
    if (kioskSessionId) {
      const [sessionRows] = await pool.execute(
        `SELECT SUM(face_value) as total_face, COUNT(*) as coupon_count FROM coupons WHERE kiosk_session_id = ?`,
        [kioskSessionId]
      );
      if (sessionRows.length > 0 && sessionRows[0].total_face > 0) {
        data.face_value = Number(sessionRows[0].total_face);
        data.coupon_count = Number(sessionRows[0].coupon_count);
      }
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// 내 쿠폰 목록 조회 (두 라우터 별칭 모두 지원)
const getMyCouponsHandler = async (req, res, next) => {
  try {
    const [coupons] = await pool.execute(
      `SELECT c.id, c.code_hash, c.coupon_type, c.face_value, c.status, c.issued_at, c.expires_at, c.used_at,
              COALESCE(i.name, pc.issued_by_location, '옹진군 관광과') AS issuer_name,
              m.name AS used_merchant_name
       FROM coupons c
       LEFT JOIN issuer_allocations ia ON c.issuer_allocation_id = ia.id
       LEFT JOIN issuers i ON ia.issuer_id = i.id
       LEFT JOIN paper_coupons pc ON c.code_hash = pc.random_code_hash
       LEFT JOIN coupon_transactions ct ON c.id = ct.coupon_id
       LEFT JOIN merchants m ON ct.merchant_id = m.id
       WHERE c.issued_to = ? AND c.status = 'available'
       ORDER BY c.id DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: coupons });
  } catch (err) { next(err); }
};

router.get('/my', authenticate, authorize('tourist'), getMyCouponsHandler);
router.get('/my-coupons', authenticate, authorize('tourist'), getMyCouponsHandler);

// 종이쿠폰 디지털화 (코드 입력)
router.post('/convert-paper', authenticate, authorize('tourist'), async (req, res, next) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: '쿠폰 코드를 입력해 주세요.' });

  try {
    const codeHash = hashCouponCode(code.trim().toUpperCase());
    const [papers] = await pool.execute(
      `SELECT * FROM paper_coupons WHERE random_code_hash = ? AND converted = 0 LIMIT 1`,
      [codeHash]
    );
    if (papers.length === 0) {
      return res.status(404).json({ success: false, message: '유효하지 않은 쿠폰이거나 이미 사용된 쿠폰입니다.' });
    }
    const paper = papers[0];

    // 디지털 전환 처리
    await pool.execute(
      `UPDATE paper_coupons SET converted = 1, converted_by = ?, converted_at = NOW() WHERE id = ?`,
      [req.user.id, paper.id]
    );
    await pool.execute(
      `INSERT INTO coupons (code_hash, coupon_type, face_value, issued_to, status)
       VALUES (?, 'paper', ?, ?, 'available')`,
      [codeHash, paper.face_value, req.user.id]
    );
    await pool.execute(
      `UPDATE users SET coupon_balance = coupon_balance + ? WHERE id = ?`,
      [paper.face_value, req.user.id]
    );

    res.json({ success: true, message: `${paper.face_value.toLocaleString()}원 쿠폰이 추가되었습니다.`, faceValue: paper.face_value });
  } catch (err) { next(err); }
});

// 발행처 QR 스캔을 통한 쿠폰 발급 (동일 사용자 중복 미사용 제한 전면 해제, 스캔 시 무조건 추가 발급)
router.post('/issue-by-qr', authenticate, authorize('tourist'), async (req, res, next) => {
  const { allocationId, token, kioskSessionId } = req.body;
  const targetId = decodeSecureToken(token || allocationId);

  if (!targetId) {
    return res.status(400).json({ success: false, message: '유효하지 않거나 만료된 쿠폰 배정 정보입니다.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. 키오스크 1회성 세션 검증: 이미 누군가가 이 QR(kioskSessionId)을 찍어 발급받았다면 카카오톡 공유 어뷰징 차단
    if (kioskSessionId) {
      const [claimedCoupons] = await connection.execute(
        `SELECT id FROM coupons WHERE kiosk_session_id = ? AND issued_to IS NOT NULL LIMIT 1`,
        [kioskSessionId]
      );
      if (claimedCoupons.length > 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: '이미 발급에 사용 완료된 QR 코드입니다. 현장 키오스크의 새로 갱신된 QR 코드를 스캔해 주세요.' });
      }

      // 현장 키오스크에서 1단계로 생성된 미등록 대기 쿠폰 목록 조회
      const [pendingCoupons] = await connection.execute(
        `SELECT id, face_value FROM coupons WHERE kiosk_session_id = ? AND issued_to IS NULL`,
        [kioskSessionId]
      );

      if (pendingCoupons.length > 0) {
        const totalAmount = pendingCoupons.reduce((sum, c) => sum + Number(c.face_value), 0);

        // 2단계 쿠폰 등록: 소유자를 현재 로그인한 관광객으로 변경
        await connection.execute(
          `UPDATE coupons SET issued_to = ? WHERE kiosk_session_id = ? AND issued_to IS NULL`,
          [req.user.id, kioskSessionId]
        );

        // 관광객 잔액 업데이트
        await connection.execute(
          `UPDATE users SET coupon_balance = coupon_balance + ? WHERE id = ?`,
          [totalAmount, req.user.id]
        );

        await connection.commit();
        return res.json({ 
          success: true, 
          message: `${totalAmount.toLocaleString()}원 쿠폰(${pendingCoupons.length}장)이 지갑으로 성공적으로 발급되었습니다.`,
          count: pendingCoupons.length,
          totalAmount
        });
      }
    }

    // 2. 단일 배정 직접 발급 (폴백)
    const [allocations] = await connection.execute(
      `SELECT * FROM issuer_allocations WHERE id = ? FOR UPDATE`,
      [targetId]
    );

    if (allocations.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '유효하지 않은 쿠폰 배정입니다.' });
    }

    const allocation = allocations[0];

    // 발행처 전체 수량 초과 여부만 체크
    if (allocation.issued_count >= allocation.total_count) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: '이 발행처의 쿠폰 수량이 모두 소진되었습니다.' });
    }

    const rawCode = `QR_${allocation.id}_${req.user.id}_${Date.now()}_${generateToken(6)}`;
    const codeHash = hashCouponCode(rawCode);

    await connection.execute(
      `INSERT INTO coupons (code_hash, coupon_type, face_value, issued_to, status, issuer_allocation_id, kiosk_session_id)
       VALUES (?, 'digital', ?, ?, 'available', ?, ?)`,
      [codeHash, allocation.face_value, req.user.id, allocation.id, kioskSessionId || null]
    );

    await connection.execute(
      `UPDATE issuer_allocations SET issued_count = issued_count + 1 WHERE id = ?`,
      [allocation.id]
    );

    await connection.execute(
      `UPDATE users SET coupon_balance = coupon_balance + ? WHERE id = ?`,
      [allocation.face_value, req.user.id]
    );

    await connection.commit();
    res.json({ success: true, message: '쿠폰이 지갑으로 성공적으로 발급되었습니다.' });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// 키오스크 실시간 폴링용 상태 체크 API
router.get('/kiosk-poll', async (req, res, next) => {
  const { allocationId, token, kioskSessionId } = req.query;

  if (!kioskSessionId || kioskSessionId === 'undefined') {
    return res.json({ success: true, isIssued: false, isRegistered: false, phone: null });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT c.id, c.status, c.issued_to, u.nickname, u.provider_id 
       FROM coupons c 
       LEFT JOIN users u ON c.issued_to = u.id 
       WHERE c.kiosk_session_id = ? AND c.issued_to IS NOT NULL LIMIT 1`,
      [kioskSessionId]
    );

    const isRegistered = rows.length > 0;
    const phone = isRegistered ? (rows[0].nickname || rows[0].provider_id || String(rows[0].issued_to)) : null;

    res.json({
      success: true,
      isIssued: isRegistered,
      isRegistered,
      phone
    });
  } catch (err) {
    next(err);
  }
});

// 내 쿠폰 결제용 1회성 바코드/QR 생성 토큰 발급
router.post('/:id/use-qr', authenticate, authorize('tourist'), async (req, res, next) => {
  const couponId = req.params.id;
  try {
    const [coupons] = await pool.execute(
      `SELECT * FROM coupons WHERE id = ? AND issued_to = ? AND status = 'available' LIMIT 1`,
      [couponId, req.user.id]
    );
    if (coupons.length === 0) {
      return res.status(404).json({ success: false, message: '사용 가능한 쿠폰을 찾을 수 없습니다.' });
    }
    const coupon = coupons[0];

    const rawToken = `PAY_${coupon.id}_${req.user.id}_${Date.now()}_${generateToken(8)}`;
    const qrToken = hashCouponCode(rawToken);

    await pool.execute(
      `UPDATE coupons SET active_qr_token = ?, active_qr_expires_at = DATE_ADD(NOW(), INTERVAL 3 MINUTE) WHERE id = ?`,
      [qrToken, coupon.id]
    );

    res.json({ success: true, qrToken, couponId: coupon.id, expiresInSeconds: 180 });
  } catch (err) { next(err); }
});

// 쿠폰 개별 사용 상태 실시간 조회 (모달 자동 닫힘용)
router.get('/:id/status', authenticate, authorize('tourist'), async (req, res, next) => {
  const couponId = req.params.id;
  try {
    const [rows] = await pool.execute(
      `SELECT status FROM coupons WHERE id = ? AND issued_to = ? LIMIT 1`,
      [couponId, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '쿠폰 정보를 찾을 수 없습니다.' });
    }
    res.json({ success: true, status: rows[0].status });
  } catch (err) { next(err); }
});

module.exports = router;
