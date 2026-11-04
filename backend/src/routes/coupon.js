const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const pool = require('../config/database');
const { hashPhone, hashCouponCode, decodeSecureToken, encodeSecureToken, generateToken } = require('../utils/crypto');

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
    const data = {
      ...rows[0],
      secure_token: encodeSecureToken(rows[0].id),
      coupon_count: 1,
      already_claimed: false,
      breakdown: [{ face_value: Number(rows[0].face_value), count: 1 }],
      validity_text: '발급일로부터 1년간 유효'
    };

    // 키오스크 세션이 지정되어 있으면 세션 전체 쿠폰 금액, 권종별 수량 및 수령 여부 반영
    if (kioskSessionId && kioskSessionId !== 'undefined') {
      const [sessionCoupons] = await pool.execute(
        `SELECT id, face_value, issued_to, status FROM coupons WHERE kiosk_session_id = ? ORDER BY face_value ASC, id ASC`,
        [kioskSessionId]
      );
      if (sessionCoupons.length > 0) {
        const totalFace = sessionCoupons.reduce((sum, c) => sum + Number(c.face_value || 0), 0);
        const unclaimed = sessionCoupons.filter(c => c.issued_to === null && c.status === 'available');
        const usedAny = sessionCoupons.some(c => c.status === 'used');
        const mapByFace = new Map();
        for (const c of sessionCoupons) {
          const fv = Number(c.face_value || 0);
          mapByFace.set(fv, (mapByFace.get(fv) || 0) + 1);
        }
        data.face_value = totalFace;
        data.coupon_count = sessionCoupons.length;
        data.unclaimed_count = unclaimed.length;
        data.already_claimed = unclaimed.length === 0;
        data.already_used = usedAny;
        data.breakdown = Array.from(mapByFace.entries()).map(([face_value, count]) => ({ face_value, count }));
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

// ── 관광객 → 가맹점 사장님 쿠폰 사용 요청 (비대면 원클릭 승인 요청) ──
router.post('/use-request', authenticate, authorize('tourist'), async (req, res, next) => {
  const { merchantId, couponIds } = req.body;
  if (!merchantId) {
    return res.status(400).json({ success: false, message: '사용할 가맹점을 선택해 주세요.' });
  }

  try {
    // 1. 가맹점 확인
    const [mRows] = await pool.execute(
      `SELECT id, name, status FROM merchants WHERE id = ? LIMIT 1`,
      [merchantId]
    );
    if (mRows.length === 0 || mRows[0].status !== 'approved') {
      return res.status(404).json({ success: false, message: '현재 쿠폰 사용이 가능한 가맹점이 아닙니다.' });
    }
    const merchant = mRows[0];

    // 2. 관광객 정보 및 보유 쿠폰 확인
    const [userRows] = await pool.execute(
      `SELECT id, nickname, phone, phone_hash, social_provider, provider_id FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );
    if (userRows.length === 0) {
      return res.status(401).json({ success: false, message: '사용자 정보를 찾을 수 없습니다.' });
    }
    const u = userRows[0];
    const userPhone = u.phone || (u.social_provider === 'phone' ? u.provider_id : u.nickname) || '관광객';
    let myPhoneHash = u.phone_hash || null;
    if (!myPhoneHash && u.social_provider === 'phone' && u.provider_id) {
      const digits = String(u.provider_id).replace(/\D/g, '');
      if (digits.length >= 10) myPhoneHash = hashPhone(digits);
    }

    let availQuery = `SELECT id, face_value, status, expires_at FROM coupons WHERE status = 'available' AND (expires_at IS NULL OR expires_at > NOW())`;
    const availParams = [req.user.id];
    if (myPhoneHash) {
      availQuery += ` AND (issued_to = ? OR issued_to IN (SELECT id FROM users WHERE phone_hash = ?)) ORDER BY issued_at ASC`;
      availParams.push(myPhoneHash);
    } else {
      availQuery += ` AND issued_to = ? ORDER BY issued_at ASC`;
    }

    const [availCoupons] = await pool.execute(availQuery, availParams);
    if (availCoupons.length === 0) {
      return res.status(400).json({ success: false, message: '사용 가능한 쿠폰이 없습니다.' });
    }

    let selectedCoupons = [];
    if (Array.isArray(couponIds) && couponIds.length > 0) {
      const idSet = new Set(couponIds.map(id => Number(id)));
      selectedCoupons = availCoupons.filter(c => idSet.has(Number(c.id)));
    } else {
      selectedCoupons = [availCoupons[0]];
    }

    if (selectedCoupons.length === 0) {
      return res.status(400).json({ success: false, message: '선택한 쿠폰을 사용할 수 없습니다.' });
    }

    const targetIds = selectedCoupons.map(c => Number(c.id));
    const totalAmount = selectedCoupons.reduce((sum, c) => sum + Number(c.face_value || 0), 0);

    // 기존 대기 중인 요청이 있으면 취소 처리 후 신규 생성
    await pool.execute(
      `UPDATE coupon_usage_requests SET status = 'cancelled', processed_at = NOW() WHERE user_id = ? AND status = 'pending'`,
      [req.user.id]
    );

    const [ins] = await pool.execute(
      `INSERT INTO coupon_usage_requests (merchant_id, user_id, user_phone, coupon_ids, coupon_count, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [merchant.id, req.user.id, userPhone, JSON.stringify(targetIds), targetIds.length, totalAmount]
    );

    res.json({
      success: true,
      message: `'${merchant.name}' 사장님께 쿠폰 사용 요청을 보냈습니다.`,
      data: {
        requestId: ins.insertId,
        merchantId: merchant.id,
        merchantName: merchant.name,
        couponCount: targetIds.length,
        totalAmount,
        status: 'pending'
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── 관광객 쿠폰 사용 요청 상태 조회 (실시간 승인 확인용) ──
router.get('/use-request/:id', authenticate, authorize('tourist'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.id, r.merchant_id, r.coupon_count, r.total_amount, r.status, r.requested_at, r.processed_at, r.reject_reason,
              m.name AS merchant_name
       FROM coupon_usage_requests r
       JOIN merchants m ON r.merchant_id = m.id
       WHERE r.id = ? AND r.user_id = ?
       LIMIT 1`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '사용 요청 내역을 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── 관광객 쿠폰 사용 요청 취소 ──
router.post('/use-request/:id/cancel', authenticate, authorize('tourist'), async (req, res, next) => {
  try {
    const [result] = await pool.execute(
      `UPDATE coupon_usage_requests
       SET status = 'cancelled', processed_at = NOW()
       WHERE id = ? AND user_id = ? AND status = 'pending'`,
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(400).json({ success: false, message: '이미 처리되었거나 취소할 수 없는 요청입니다.' });
    }
    res.json({ success: true, message: '쿠폰 사용 요청이 취소되었습니다.' });
  } catch (err) {
    next(err);
  }
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

    // 1. 키오스크 세션(1단계 기발급 쿠폰)이 존재하는 경우: 해당 세션 쿠폰 전체를 사용자 지갑에 귀속(2단계 등록)
    if (kioskSessionId && kioskSessionId !== 'undefined') {
      const [sessionCoupons] = await connection.execute(
        `SELECT * FROM coupons WHERE kiosk_session_id = ? FOR UPDATE`,
        [kioskSessionId]
      );

      if (sessionCoupons.length > 0) {
        if (sessionCoupons.some(c => c.status === 'used')) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: '이미 가맹점에서 사용 처리된 쿠폰입니다.'
          });
        }

        const alreadyRegistered = sessionCoupons.every(c => c.issued_to !== null);
        if (alreadyRegistered) {
          await connection.rollback();
          const isMine = sessionCoupons[0].issued_to === req.user.id;
          return res.status(400).json({ 
            success: false, 
            message: isMine ? '이미 내 지갑에 수령 완료된 쿠폰입니다.' : '이미 다른 기기에서 수령 완료되어 만료된 QR 코드입니다.' 
          });
        }

        const pendingCoupons = sessionCoupons.filter(c => c.issued_to === null && c.status === 'available');
        const totalAmount = pendingCoupons.reduce((sum, c) => sum + Number(c.face_value), 0);

        await connection.execute(
          `UPDATE coupons SET issued_to = ? WHERE kiosk_session_id = ? AND issued_to IS NULL AND status = 'available'`,
          [req.user.id, kioskSessionId]
        );

        const paperHashes = pendingCoupons.filter(c => c.coupon_type === 'paper' && c.code_hash).map(c => c.code_hash);
        if (paperHashes.length > 0) {
          const phPlaceholders = paperHashes.map(() => '?').join(',');
          await connection.execute(
            `UPDATE paper_coupons SET converted = 1, converted_by = ?, converted_at = NOW() WHERE random_code_hash IN (${phPlaceholders})`,
            [req.user.id, ...paperHashes]
          );
        }

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

// 키오스크 실시간 폴링용 상태 체크 API (단일 세션 및 복수 세션 일괄 조회 지원)
router.get('/kiosk-poll', async (req, res, next) => {
  const { allocationId, token, kioskSessionId, kioskSessionIds } = req.query;

  try {
    if (kioskSessionIds && String(kioskSessionIds).trim()) {
      const sids = String(kioskSessionIds)
        .split(',')
        .map(s => s.trim())
        .filter(s => s && s !== 'undefined');

      if (sids.length === 0) {
        return res.json({ success: true, sessions: {}, registeredCount: 0, totalCount: 0, allRegistered: false });
      }

      const placeholders = sids.map(() => '?').join(',');
      const [rows] = await pool.execute(
        `SELECT c.kiosk_session_id, c.id, c.status, c.issued_to, u.nickname, u.provider_id
         FROM coupons c
         LEFT JOIN users u ON c.issued_to = u.id
         WHERE c.kiosk_session_id IN (${placeholders})`,
        sids
      );

      const sessions = {};
      let registeredCount = 0;
      for (const sid of sids) {
        const matched = rows.filter(r => r.kiosk_session_id === sid);
        const regRow = matched.find(r => r.issued_to !== null || r.status === 'used');
        const isRegistered = !!regRow;
        const phone = regRow
          ? (regRow.nickname || regRow.provider_id || (regRow.status === 'used' ? '가맹점 사용완료' : String(regRow.issued_to)))
          : null;
        sessions[sid] = { isIssued: isRegistered, isRegistered, phone };
        if (isRegistered) registeredCount++;
      }

      return res.json({
        success: true,
        sessions,
        registeredCount,
        totalCount: sids.length,
        allRegistered: registeredCount === sids.length
      });
    }

    if (!kioskSessionId || kioskSessionId === 'undefined') {
      return res.json({ success: true, isIssued: false, isRegistered: false, phone: null });
    }

    const [rows] = await pool.execute(
      `SELECT c.id, c.status, c.issued_to, u.nickname, u.provider_id 
       FROM coupons c 
       LEFT JOIN users u ON c.issued_to = u.id 
       WHERE c.kiosk_session_id = ?`,
      [kioskSessionId]
    );

    const totalCount = rows.length;
    const regRows = rows.filter(r => r.issued_to !== null || r.status === 'used');
    const isRegistered = totalCount > 0 && regRows.length === totalCount;
    const firstReg = regRows[0] || null;
    const phone = firstReg ? (firstReg.nickname || firstReg.provider_id || String(firstReg.issued_to || '')) : null;

    res.json({
      success: true,
      isIssued: isRegistered,
      isRegistered,
      registeredCount: regRows.length,
      totalCount,
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
