const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const pool = require('../config/database');
const { hashCouponCode } = require('../utils/crypto');

// 내 쿠폰 목록 조회
router.get('/my', authenticate, authorize('tourist'), async (req, res, next) => {
  try {
    const [coupons] = await pool.execute(
      `SELECT id, coupon_type, face_value, status, issued_at, expires_at, used_at
       FROM coupons WHERE issued_to = ? ORDER BY issued_at DESC`,
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

module.exports = router;
