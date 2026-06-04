const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const pool = require('../config/database');
const { hashCouponCode } = require('../utils/crypto');

// 쿠폰 배정 정보 조회 (비로그인 상태에서도 랜딩 페이지 정보 노출용으로 허용)
router.get('/allocation-public/:id', async (req, res, next) => {
  const allocationId = req.params.id;
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
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// 내 쿠폰 목록 조회
router.get('/my', authenticate, authorize('tourist'), async (req, res, next) => {
  try {
    const [coupons] = await pool.execute(
      `SELECT c.id, c.code_hash, c.coupon_type, c.face_value, c.status, c.issued_at, c.expires_at, c.used_at,
              COALESCE(i.name, pc.issued_by_location, '옹진군청') AS issuer_name,
              m.name AS used_merchant_name
       FROM coupons c
       LEFT JOIN issuer_allocations ia ON c.issuer_allocation_id = ia.id
       LEFT JOIN issuers i ON ia.issuer_id = i.id
       LEFT JOIN paper_coupons pc ON c.code_hash = pc.random_code_hash
       LEFT JOIN coupon_transactions ct ON c.id = ct.coupon_id
       LEFT JOIN merchants m ON ct.merchant_id = m.id
       WHERE c.issued_to = ?
       ORDER BY c.issued_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: coupons });
  } catch (err) { next(err); }
});

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

// 발행처 QR 스캔을 통한 쿠폰 발급
router.post('/issue-by-qr', authenticate, authorize('tourist'), async (req, res, next) => {
  const { allocationId, kioskSessionId } = req.body;
  if (!allocationId) {
    return res.status(400).json({ success: false, message: '배정 ID가 필요합니다.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. 배정 정보 조회 (Pessimistic Lock 적용으로 동시성 문제 예방)
    const [allocations] = await connection.execute(
      `SELECT * FROM issuer_allocations WHERE id = ? FOR UPDATE`,
      [allocationId]
    );

    if (allocations.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '유효하지 않은 쿠폰 배정입니다.' });
    }

    const allocation = allocations[0];

    // 2. 수량 초과 여부 확인
    if (allocation.issued_count >= allocation.total_count) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: '이 발행처의 쿠폰 수량이 모두 소진되었습니다.' });
    }

    // 3. 중복 발급 체크용 고유 키 생성
    const rawCode = `QR_ISSUER_${req.user.id}_${allocationId}`;
    const codeHash = hashCouponCode(rawCode);

    // 이미 발급받았는지 DB 조회 또는 에러 핸들링
    const [existing] = await connection.execute(
      `SELECT id FROM coupons WHERE code_hash = ? LIMIT 1`,
      [codeHash]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: '이미 이 발행처에서 쿠폰을 발급받았습니다.' });
    }

    // 4. 쿠폰 레코드 삽입
    await connection.execute(
      `INSERT INTO coupons (code_hash, coupon_type, face_value, issued_to, status, issuer_allocation_id, kiosk_session_id)
       VALUES (?, 'digital', ?, ?, 'available', ?, ?)`,
      [codeHash, allocation.face_value, req.user.id, allocationId, kioskSessionId || null]
    );

    // 5. 발행 수량(issued_count) 1 증가
    await connection.execute(
      `UPDATE issuer_allocations SET issued_count = issued_count + 1 WHERE id = ?`,
      [allocationId]
    );

    // 6. 관광객 잔액 업데이트
    await connection.execute(
      `UPDATE users SET coupon_balance = coupon_balance + ? WHERE id = ?`,
      [allocation.face_value, req.user.id]
    );

    await connection.commit();
    res.json({
      success: true,
      message: `${allocation.face_value.toLocaleString()}원 쿠폰이 성공적으로 발급되었습니다.`,
      faceValue: allocation.face_value
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// 키오스크 비접촉 발급 완료 상태 확인 폴링 API
router.get('/kiosk-poll', async (req, res, next) => {
  const { allocationId, kioskSessionId } = req.query;
  if (!allocationId || !kioskSessionId) {
    return res.status(400).json({ success: false, message: '배정 ID와 키오스크 세션 ID가 필요합니다.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id FROM coupons 
       WHERE issuer_allocation_id = ? AND kiosk_session_id = ? AND status = 'available'
       LIMIT 1`,
      [allocationId, kioskSessionId]
    );

    if (rows.length > 0) {
      return res.json({ success: true, isIssued: true });
    }
    res.json({ success: true, isIssued: false });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
