const db = require('../config/db');

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

    // 1. 쿠폰 정보 조회 (SHA-256 해시 비교)
    // 실제 운영 시에는 crypto.createHash('sha256').update(couponCode + salt).digest('hex') 필요
    // 여기서는 단순화를 위해 평문 또는 매칭되는 해시를 찾는다고 가정
    const [coupons] = await connection.execute(
      'SELECT * FROM coupons WHERE code_hash = ?',
      [couponCode]
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
