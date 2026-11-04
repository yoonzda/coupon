const db = require('../config/database');
const { hashCouponCode } = require('../utils/crypto');

/**
 * 가맹점 쿠폰 스캔 및 결제 처리
 * - 중복 사용 방지 로직 포함
 */
exports.scanCoupon = async (req, res) => {
  const { couponCode } = req.body;
  const merchantId = req.user.id; // JWT 미들웨어에서 추출된 가맹점 ID

  if (!couponCode) {
    return res.status(400).json({ message: '쿠폰 코드가 필요합니다.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 0. 가맹점 상태 체크
    const [merchants] = await connection.execute(
      'SELECT status FROM merchants WHERE id = ?',
      [merchantId]
    );
    if (merchants.length === 0 || merchants[0].status !== 'approved') {
      await connection.rollback();
      return res.status(403).json({ message: '승인 완료된 가맹점만 결제를 처리할 수 있습니다.' });
    }

    // 1. 쿠폰 정보 조회 (바코드 일련번호 해시, 동적 QR 토큰, 또는 종이/키오스크 URL 파라미터)
    let rawInput = String(couponCode || '').trim();
    let sessionParam = '';
    try {
      if (rawInput.startsWith('http://') || rawInput.startsWith('https://') || rawInput.startsWith('/')) {
        const parsedUrl = new URL(rawInput, 'http://localhost');
        const extractedCode = parsedUrl.searchParams.get('code') || parsedUrl.searchParams.get('qrToken');
        sessionParam = parsedUrl.searchParams.get('kioskSessionId') || '';
        if (extractedCode) {
          rawInput = extractedCode.trim();
        } else if (sessionParam) {
          rawInput = sessionParam.trim();
        }
      }
    } catch (_) {}

    const cleanCode = rawInput.toUpperCase();
    const hashed = hashCouponCode(cleanCode);
    const [coupons] = await connection.execute(
      'SELECT * FROM coupons WHERE code_hash = ? OR code_hash = ? OR active_qr_token = ? OR kiosk_session_id = ? LIMIT 1 FOR UPDATE',
      [cleanCode, hashed, rawInput, sessionParam || rawInput]
    );

    if (coupons.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: '유효하지 않은 쿠폰입니다.' });
    }

    const coupon = coupons[0];

    // 2. 중복 사용 체크
    if (coupon.status === 'used') {
      // 이미 사용된 쿠폰인 경우, 이전 거래 내역 조회
      const [prevTx] = await connection.execute(`
        SELECT ct.scanned_at, m.name as merchant_name
        FROM coupon_transactions ct
        JOIN merchants m ON ct.merchant_id = m.id
        WHERE ct.coupon_id = ?
        ORDER BY ct.scanned_at ASC LIMIT 1
      `, [coupon.id]);

      await connection.rollback();

      if (prevTx.length > 0) {
        const { merchant_name, scanned_at } = prevTx[0];
        const formattedDate = new Date(scanned_at).toLocaleString('ko-KR');
        return res.status(400).json({
          message: `이미 사용된 쿠폰입니다.`,
          detail: `[${merchant_name}] 가맹점에서 ${formattedDate}에 이미 결제되었습니다.`
        });
      } else {
        return res.status(400).json({ message: '이미 사용 처리된 쿠폰입니다.' });
      }
    }

    // 3. 만료 체크
    if (coupon.status === 'expired' || (coupon.expires_at && new Date(coupon.expires_at) < new Date())) {
      await connection.rollback();
      return res.status(400).json({ message: '만료된 쿠폰입니다.' });
    }

    // 4. 결제 처리 (트랜잭션)
    // - 쿠폰 상태 변경
    await connection.execute(
      'UPDATE coupons SET status = "used", used_at = CURRENT_TIMESTAMP WHERE id = ?',
      [coupon.id]
    );

    // - 종이 쿠폰인 경우 paper_coupons 테이블도 사용/전환 완료 처리하여 중복 등록 방지
    if (coupon.coupon_type === 'paper' && coupon.code_hash) {
      await connection.execute(
        'UPDATE paper_coupons SET converted = 1, converted_at = CURRENT_TIMESTAMP WHERE random_code_hash = ?',
        [coupon.code_hash]
      );
    }

    // - 사용자에게 등록된 쿠폰이었다면 보유 잔액 차감
    if (coupon.issued_to) {
      await connection.execute(
        'UPDATE users SET coupon_balance = GREATEST(0, coupon_balance - ?) WHERE id = ?',
        [coupon.face_value, coupon.issued_to]
      );
    }

    // - 거래 내역 기록
    await connection.execute(
      'INSERT INTO coupon_transactions (coupon_id, merchant_id, user_id, amount) VALUES (?, ?, ?, ?)',
      [coupon.id, merchantId, coupon.issued_to, coupon.face_value]
    );

    await connection.commit();
    res.json({
      message: '결제가 완료되었습니다.',
      amount: coupon.face_value
    });

  } catch (error) {
    await connection.rollback();
    console.error('Scan Error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
};

/**
 * 가맹점 거래 내역 조회
 */
exports.getTransactions = async (req, res) => {
  const merchantId = req.user.id;

  try {
    // 가맹점 상태 체크
    const [merchants] = await db.execute(
      'SELECT status FROM merchants WHERE id = ? LIMIT 1',
      [merchantId]
    );
    if (merchants.length === 0 || merchants[0].status !== 'approved') {
      return res.status(403).json({ message: '승인 완료된 가맹점만 거래 내역을 볼 수 있습니다.' });
    }

    const [rows] = await db.execute(`
      SELECT ct.*, c.coupon_type
      FROM coupon_transactions ct
      JOIN coupons c ON ct.coupon_id = c.id
      WHERE ct.merchant_id = ?
      ORDER BY ct.scanned_at DESC
    `, [merchantId]);

    res.json({ data: rows });
  } catch (error) {
    console.error('Fetch History Error:', error);
    res.status(500).json({ message: '내역을 불러오지 못했습니다.' });
  }
};
