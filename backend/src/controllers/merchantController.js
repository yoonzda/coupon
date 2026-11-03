const db = require('../config/database');
const { hashCouponCode } = require('../utils/crypto');
const fdsService = require('../services/fdsService');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 가맹점 쿠폰 스캔 및 결제 처리
 * - SHA-256 해시 조회 일치화
 * - 비관적 락(FOR UPDATE) 및 원자적 UPDATE로 중복/동시 결제 방지
 */
exports.scanCoupon = async (req, res) => {
  const { couponCode } = req.body;
  const merchantId = req.user.id; // JWT 미들웨어에서 추출된 가맹점 ID

  if (!couponCode) {
    return res.status(400).json({ success: false, message: '쿠폰 코드가 필요합니다.' });
  }

  let rawStr = String(couponCode).trim();
  // URL 형태(예: https://.../?claimCode=OJ-XXXX-XXXX 또는 ?code=...)인 경우 쿠폰 코드 자동 추출
  if (rawStr.includes('http://') || rawStr.includes('https://') || rawStr.includes('?')) {
    const match = rawStr.match(/(?:code|claimCode)=([A-Za-z0-9-]+)/i);
    if (match) rawStr = match[1];
  }

  let cleanCode = rawStr.trim().toUpperCase();
  const cleanAlphanumeric = cleanCode.replace(/[^A-Z0-9]/g, '');

  if (/^OJ[A-Z0-9]{8}$/.test(cleanAlphanumeric)) {
    cleanCode = `OJ-${cleanAlphanumeric.slice(2, 6)}-${cleanAlphanumeric.slice(6, 10)}`;
  } else if (/^[A-Z0-9]{8}$/.test(cleanAlphanumeric) && !cleanCode.startsWith('OJC')) {
    cleanCode = `OJ-${cleanAlphanumeric.slice(0, 4)}-${cleanAlphanumeric.slice(4, 8)}`;
  } else if (/^OJCD[A-Z0-9]{8}$/.test(cleanAlphanumeric)) {
    cleanCode = `OJC-D${cleanAlphanumeric.slice(4)}`;
  }

  const hashedCode = hashCouponCode(cleanCode);
  let connection = null;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 0. 가맹점 활성 상태 확인 (제재/삭제 처리된 가맹점 스캔 즉시 차단)
    const [mRows] = await connection.execute(
      'SELECT status, rejection_reason FROM merchants WHERE id = ? LIMIT 1',
      [merchantId]
    );
    if (mRows.length === 0 || mRows[0].status !== 'approved') {
      await connection.rollback();
      const reasonMsg = mRows[0]?.rejection_reason ? ` (사유: ${mRows[0].rejection_reason})` : '';
      return res.status(403).json({
        success: false,
        message: `이용이 제한(제재)된 가맹점 계정으로 쿠폰 결제를 처리할 수 없습니다.${reasonMsg}`
      });
    }

    // 1. 쿠폰 정보 조회 (해시 변환값 및 전달값 모두 검색하여 호환성 확보 + FOR UPDATE 비관적 락)
    const [coupons] = await connection.execute(
      'SELECT * FROM coupons WHERE code_hash = ? OR code_hash = ? FOR UPDATE',
      [hashedCode, cleanCode]
    );

    if (coupons.length === 0) {
      // ── [신규] 종이쿠폰 직접 결제 지원 ──
      // 모바일 등록 절차를 거치지 않은 미등록 종이쿠폰도 현장 가맹점에서 즉시 사용 처리
      const [papers] = await connection.execute(
        'SELECT * FROM paper_coupons WHERE random_code_hash = ? LIMIT 1 FOR UPDATE',
        [hashedCode]
      );

      if (papers.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: '유효하지 않은 쿠폰입니다.' });
      }

      const paper = papers[0];

      // 1) 키오스크 결제 취소(환불) 여부 확인
      if (paper.converted === -1 || paper.is_cancelled === 1) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: '키오스크 결제 취소(환불) 처리되어 무효화된 종이쿠폰입니다.'
        });
      }

      // 2) 이미 모바일 앱으로 전환 등록된 쿠폰인 경우
      if (paper.converted === 1) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: '모바일 앱으로 이미 등록 완료된 종이쿠폰입니다.',
          detail: '고객의 스마트폰 화면에 표시된 모바일 쿠폰(QR/바코드)을 스캔해 주세요.'
        });
      }

      // 3) 이미 종이쿠폰으로 직접 결제(사용)된 경우 (중복 결제 차단)
      if (paper.converted === 2) {
        const [prevTx] = await connection.execute(`
          SELECT ct.scanned_at, m.name as merchant_name
          FROM coupons c
          JOIN coupon_transactions ct ON ct.coupon_id = c.id
          JOIN merchants m ON ct.merchant_id = m.id
          WHERE c.code_hash = ?
          ORDER BY ct.scanned_at ASC LIMIT 1
        `, [hashedCode]);

        await connection.rollback();
        if (prevTx.length > 0) {
          const { merchant_name, scanned_at } = prevTx[0];
          const formattedDate = new Date(scanned_at).toLocaleString('ko-KR');
          return res.status(400).json({
            success: false,
            message: '이미 사용된 종이쿠폰입니다.',
            detail: `[${merchant_name}] 가맹점에서 ${formattedDate}에 이미 결제되었습니다.`
          });
        }
        return res.status(400).json({ success: false, message: '이미 사용 처리된 종이쿠폰입니다.' });
      }

      // 4) 유효기간 체크 (발급일로부터 1년)
      const issuedAt = paper.issued_at || paper.created_at || new Date();
      const expiresAt = new Date(new Date(issuedAt).getTime() + 365 * 24 * 60 * 60 * 1000);
      if (new Date() > expiresAt) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: '만료된 쿠폰입니다. (유효기간: 발급일로부터 1년)' });
      }

      // 5) 종이쿠폰 직접 결제 원자적 처리
      // A. paper_coupons 상태를 2(종이 직접 사용 완료)로 원자적 UPDATE (동시 이중결제 방지)
      const [updatePaper] = await connection.execute(
        'UPDATE paper_coupons SET converted = 2, converted_at = CURRENT_TIMESTAMP WHERE id = ? AND converted = 0',
        [paper.id]
      );
      if (updatePaper.affectedRows === 0) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: '이미 다른 단말기에서 결제 처리 중이거나 사용된 쿠폰입니다.' });
      }

      // B. 정산 및 거래 연동을 위해 coupons 테이블에 used 상태로 즉시 생성
      const [insCoupon] = await connection.execute(
        `INSERT INTO coupons (code_hash, coupon_type, face_value, issued_to, status, issued_at, used_at, expires_at, issuer_allocation_id)
         VALUES (?, 'paper', ?, NULL, 'used', ?, CURRENT_TIMESTAMP, ?, ?)`,
        [hashedCode, paper.face_value, issuedAt, expiresAt, paper.issuer_allocation_id]
      );
      const newCouponId = insCoupon.insertId;

      // C. 거래 내역(coupon_transactions) 기록
      await connection.execute(
        'INSERT INTO coupon_transactions (coupon_id, merchant_id, user_id, amount) VALUES (?, ?, NULL, ?)',
        [newCouponId, merchantId, paper.face_value]
      );

      await connection.commit();

      // FDS 이상거래 탐지 비동기 실행
      setImmediate(() => {
        fdsService.inspectTransaction({
          couponId: newCouponId,
          merchantId,
          userId: null,
          amount: paper.face_value
        }).catch(e => console.error('[FDS Error]:', e.message));
      });

      return res.json({
        success: true,
        message: '종이쿠폰 결제가 성공적으로 완료되었습니다. (회수한 종이 영수증을 파기해 주세요)',
        amount: paper.face_value,
        isPaper: true
      });
    }

    const coupon = coupons[0];

    // 2. 결제 취소(환불)된 쿠폰 체크 (최우선 차단)
    if (coupon.status === 'cancelled') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: '키오스크 결제 취소(환불) 처리되어 사용할 수 없는 쿠폰입니다.'
      });
    }

    // 3. 중복 사용 체크
    if (coupon.status === 'used') {
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
          success: false,
          message: `이미 사용된 쿠폰입니다.`,
          detail: `[${merchant_name}] 가맹점에서 ${formattedDate}에 이미 결제되었습니다.`
        });
      } else {
        return res.status(400).json({ success: false, message: '이미 사용 처리된 쿠폰입니다.' });
      }
    }

    // 4. 만료 체크
    if (coupon.status === 'expired' || (coupon.expires_at && new Date(coupon.expires_at) < new Date())) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: '만료된 쿠폰입니다.' });
    }

    // 4. 결제 처리 (원자적 조건부 UPDATE로 동시성 이중결제 방지)
    const [updateResult] = await connection.execute(
      'UPDATE coupons SET status = "used", used_at = CURRENT_TIMESTAMP WHERE id = ? AND status = "available"',
      [coupon.id]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: '이미 다른 단말기에서 결제 처리 중이거나 사용된 쿠폰입니다.' });
    }

    // - 거래 내역 기록
    await connection.execute(
      'INSERT INTO coupon_transactions (coupon_id, merchant_id, user_id, amount) VALUES (?, ?, ?, ?)',
      [coupon.id, merchantId, coupon.issued_to, coupon.face_value]
    );

    await connection.commit();

    // FDS 이상거래 실시간 탐지 (메인 응답 지연 없도록 비동기 실행)
    setImmediate(() => {
      fdsService.inspectTransaction({
        couponId: coupon.id,
        merchantId,
        userId: coupon.issued_to,
        amount: coupon.face_value
      }).catch(e => console.error('[FDS Error]:', e.message));
    });

    res.json({
      success: true,
      message: '결제가 성공적으로 완료되었습니다.',
      amount: coupon.face_value
    });

  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    console.error('Scan Error:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  } finally {
    if (connection) {
      try { connection.release(); } catch (_) {}
    }
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

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Fetch History Error:', error);
    res.status(500).json({ success: false, message: '내역을 불러오지 못했습니다.' });
  }
};

/**
 * 가맹점 결제 취소 / 환불 처리 (당일 거래 한정)
 */
exports.cancelTransaction = async (req, res) => {
  const merchantId = req.user.id;
  const transactionId = req.params.id || req.body.transactionId;
  const { reason = '고객 요청 / 착오 승인 취소' } = req.body;

  if (!transactionId) {
    return res.status(400).json({ success: false, message: '거래 ID가 필요합니다.' });
  }

  let connection = null;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. 거래 조회 및 권한/당일 여부 검증 (FOR UPDATE)
    const [txRows] = await connection.execute(
      `SELECT ct.*, c.status as coupon_status, c.face_value 
       FROM coupon_transactions ct
       JOIN coupons c ON ct.coupon_id = c.id
       WHERE ct.id = ? FOR UPDATE`,
      [transactionId]
    );

    if (txRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '해당 결제 거래를 찾을 수 없습니다.' });
    }

    const tx = txRows[0];

    // 가맹점 본인 거래인지 확인
    if (tx.merchant_id !== merchantId) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: '해당 결제를 취소할 권한이 없습니다.' });
    }

    // 이미 취소된 거래인지 확인
    if (tx.is_cancelled === 1) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: '이미 취소된 거래입니다.' });
    }

    // 당일 거래 여부 검증 (자정 이후 마감/정산 진행 방지)
    const txDate = new Date(tx.scanned_at);
    const today = new Date();
    const isToday = txDate.getFullYear() === today.getFullYear() &&
                    txDate.getMonth() === today.getMonth() &&
                    txDate.getDate() === today.getDate();

    if (!isToday) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        message: '당일 결제 건만 취소가 가능합니다.', 
        detail: '이전 날짜 거래 취소는 옹진군청 관리자에게 문의해 주세요.' 
      });
    }

    // 2. 거래 상태를 취소로 변경
    await connection.execute(
      `UPDATE coupon_transactions 
       SET is_cancelled = 1, cancelled_at = NOW(), cancel_reason = ? 
       WHERE id = ?`,
      [reason.trim(), transactionId]
    );

    // 3. 쿠폰 원장 상태를 available로 복구
    await connection.execute(
      `UPDATE coupons 
       SET status = 'available', used_at = NULL 
       WHERE id = ?`,
      [tx.coupon_id]
    );

    // 4. 회원 잔액 원복 (해당 쿠폰이 특정 회원에게 발급된 경우)
    if (tx.user_id) {
      await connection.execute(
        `UPDATE users 
         SET coupon_balance = coupon_balance + ? 
         WHERE id = ?`,
        [tx.amount, tx.user_id]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: '결제가 정상적으로 취소되었습니다. 쿠폰이 관광객에게 복구되었습니다.',
      data: {
        transactionId: Number(transactionId),
        refundedAmount: tx.amount
      }
    });

  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    console.error('Cancel Transaction Error:', error);
    res.status(500).json({ success: false, message: '결제 취소 처리 중 서버 오류가 발생했습니다.' });
  } finally {
    if (connection) {
      try { connection.release(); } catch (_) {}
    }
  }
};

/**
 * 가맹점 대시보드 요약 정보 조회 (오늘 결제액, 건수, 당월 누적, 최근 거래)
 */
exports.getDashboardSummary = async (req, res) => {
  const merchantId = req.user.id;

  try {
    // 1. 가맹점 정보 조회
    const [merchants] = await db.execute(
      `SELECT id, name, owner_name, category, address, phone, store_phone, status FROM merchants WHERE id = ? LIMIT 1`,
      [merchantId]
    );
    const merchant = merchants[0] || {};

    // 2. 오늘 결제 금액 및 건수 (취소된 거래 제외)
    const [todayRows] = await db.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) AS today_amount,
        COUNT(*) AS today_count
      FROM coupon_transactions
      WHERE merchant_id = ?
        AND DATE(scanned_at) = CURDATE()
        AND COALESCE(is_cancelled, 0) = 0
    `, [merchantId]);

    // 3. 이번 달 누적 결제 금액 (취소된 거래 제외)
    const [monthRows] = await db.execute(`
      SELECT 
        COALESCE(SUM(amount), 0) AS month_amount
      FROM coupon_transactions
      WHERE merchant_id = ?
        AND YEAR(scanned_at) = YEAR(CURDATE())
        AND MONTH(scanned_at) = MONTH(CURDATE())
        AND COALESCE(is_cancelled, 0) = 0
    `, [merchantId]);

    // 4. 최근 5건 거래 목록
    const [recentRows] = await db.execute(`
      SELECT ct.id, ct.coupon_id, ct.amount, ct.scanned_at, c.coupon_type
      FROM coupon_transactions ct
      LEFT JOIN coupons c ON ct.coupon_id = c.id
      WHERE ct.merchant_id = ?
      ORDER BY ct.scanned_at DESC
      LIMIT 5
    `, [merchantId]);

    res.json({
      success: true,
      data: {
        merchant,
        todayAmount: Number(todayRows[0].today_amount || 0),
        todayCount: Number(todayRows[0].today_count || 0),
        monthAmount: Number(monthRows[0].month_amount || 0),
        recentTransactions: recentRows
      }
    });
  } catch (error) {
    console.error('Dashboard Summary Error:', error);
    res.status(500).json({ success: false, message: '대시보드 데이터를 불러오지 못했습니다.' });
  }
};

/**
 * ── 가맹점 매장 정보 및 메뉴 목록 조회 ──
 */
exports.getMyStoreInfo = async (req, res) => {
  const merchantId = req.user.id;

  try {
    const [merchants] = await db.execute(
      `SELECT id, name, owner_name, category, address, phone, store_phone, description, images, business_hours, lat, lng, status
       FROM merchants WHERE id = ? LIMIT 1`,
      [merchantId]
    );

    if (merchants.length === 0) {
      return res.status(404).json({ success: false, message: '가맹점 정보를 찾을 수 없습니다.' });
    }

    const store = merchants[0];
    let parsedImages = [];
    if (store.images) {
      if (Array.isArray(store.images)) {
        parsedImages = store.images;
      } else {
        try {
          parsedImages = JSON.parse(store.images);
        } catch (e) {
          parsedImages = [];
        }
      }
    }
    store.images = parsedImages;

    const [menus] = await db.execute(
      `SELECT id, merchant_id, name, price, description, image_url, is_signature, sort_order, created_at, updated_at
       FROM merchant_menus
       WHERE merchant_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [merchantId]
    );

    res.json({
      success: true,
      data: {
        store,
        menus
      }
    });
  } catch (error) {
    console.error('Get My Store Info Error:', error);
    res.status(500).json({ success: false, message: '매장 정보를 불러오지 못했습니다.' });
  }
};

/**
 * ── 가맹점 매장 정보 (소개글, 영업시간, 전화번호, 사진 목록) 수정 ──
 */
exports.updateMyStoreInfo = async (req, res) => {
  const merchantId = req.user.id;
  const { description, business_hours, store_phone, images } = req.body;

  try {
    let imagesJson = null;
    if (Array.isArray(images)) {
      imagesJson = JSON.stringify(images);
    } else if (typeof images === 'string') {
      imagesJson = images;
    }

    await db.execute(
      `UPDATE merchants
       SET description = ?,
           business_hours = ?,
           store_phone = ?,
           images = ?
       WHERE id = ?`,
      [
        description !== undefined ? description : null,
        business_hours !== undefined ? business_hours : null,
        store_phone !== undefined ? store_phone : null,
        imagesJson,
        merchantId
      ]
    );

    res.json({
      success: true,
      message: '매장 정보가 성공적으로 저장되었습니다.'
    });
  } catch (error) {
    console.error('Update Store Info Error:', error);
    res.status(500).json({ success: false, message: '매장 정보 저장 중 오류가 발생했습니다.' });
  }
};

/**
 * ── 매장 및 메뉴 이미지 파일 업로드 (Base64 Data URL 수신 및 로컬 저장) ──
 */
exports.uploadStoreImage = async (req, res) => {
  const merchantId = req.user.id;
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ success: false, message: '업로드할 이미지 데이터가 필요합니다.' });
  }

  try {
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: '유효한 이미지 형식이 아닙니다 (Base64 Data URL 필요).' });
    }

    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];

    const allowedMimes = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };

    const ext = allowedMimes[mimeType];
    if (!ext) {
      return res.status(400).json({ success: false, message: '지원되지 않는 이미지 포맷입니다 (JPG, PNG, WEBP만 허용).' });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 10 * 1024 * 1024) { // 10MB 제한
      return res.status(400).json({ success: false, message: '이미지 크기는 최대 10MB까지 가능합니다.' });
    }

    const uploadDir = path.join(__dirname, '../../storage/uploads/merchants');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const randomSuffix = crypto.randomBytes(6).toString('hex');
    const fileName = `store_${merchantId}_${Date.now()}_${randomSuffix}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    await fs.promises.writeFile(filePath, buffer);

    const imageUrl = `/uploads/merchants/${fileName}`;

    res.json({
      success: true,
      message: '이미지가 성공적으로 업로드되었습니다.',
      imageUrl
    });
  } catch (error) {
    console.error('Upload Image Error:', error);
    res.status(500).json({ success: false, message: '이미지 저장 처리 중 오류가 발생했습니다.' });
  }
};

/**
 * ── 메뉴 목록 조회 ──
 */
exports.getMenus = async (req, res) => {
  const merchantId = req.user.id;

  try {
    const [rows] = await db.execute(
      `SELECT id, merchant_id, name, price, description, image_url, is_signature, sort_order, created_at, updated_at
       FROM merchant_menus
       WHERE merchant_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [merchantId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get Menus Error:', error);
    res.status(500).json({ success: false, message: '메뉴 목록을 불러오지 못했습니다.' });
  }
};

/**
 * ── 메뉴 등록 ──
 */
exports.createMenu = async (req, res) => {
  const merchantId = req.user.id;
  const { name, price, description, image_url, is_signature, sort_order } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, message: '메뉴명은 필수 입력 항목입니다.' });
  }

  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ success: false, message: '올바른 가격을 입력해 주세요.' });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO merchant_menus (merchant_id, name, price, description, image_url, is_signature, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        merchantId,
        name.trim(),
        numPrice,
        description ? description.trim() : null,
        image_url || null,
        is_signature ? 1 : 0,
        sort_order !== undefined ? Number(sort_order) : 0
      ]
    );

    res.json({
      success: true,
      message: '메뉴가 성공적으로 등록되었습니다.',
      menuId: result.insertId
    });
  } catch (error) {
    console.error('Create Menu Error:', error);
    res.status(500).json({ success: false, message: '메뉴 등록 중 오류가 발생했습니다.' });
  }
};

/**
 * ── 메뉴 수정 ──
 */
exports.updateMenu = async (req, res) => {
  const merchantId = req.user.id;
  const menuId = req.params.id;
  const { name, price, description, image_url, is_signature, sort_order } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, message: '메뉴명은 필수 입력 항목입니다.' });
  }

  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ success: false, message: '올바른 가격을 입력해 주세요.' });
  }

  try {
    const [result] = await db.execute(
      `UPDATE merchant_menus
       SET name = ?,
           price = ?,
           description = ?,
           image_url = ?,
           is_signature = ?,
           sort_order = ?
       WHERE id = ? AND merchant_id = ?`,
      [
        name.trim(),
        numPrice,
        description ? description.trim() : null,
        image_url || null,
        is_signature ? 1 : 0,
        sort_order !== undefined ? Number(sort_order) : 0,
        menuId,
        merchantId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '수정할 메뉴를 찾을 수 없거나 권한이 없습니다.' });
    }

    res.json({
      success: true,
      message: '메뉴가 성공적으로 수정되었습니다.'
    });
  } catch (error) {
    console.error('Update Menu Error:', error);
    res.status(500).json({ success: false, message: '메뉴 수정 중 오류가 발생했습니다.' });
  }
};

/**
 * ── 메뉴 삭제 ──
 */
exports.deleteMenu = async (req, res) => {
  const merchantId = req.user.id;
  const menuId = req.params.id;

  try {
    const [result] = await db.execute(
      `DELETE FROM merchant_menus WHERE id = ? AND merchant_id = ?`,
      [menuId, merchantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '삭제할 메뉴를 찾을 수 없거나 권한이 없습니다.' });
    }

    res.json({
      success: true,
      message: '메뉴가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Delete Menu Error:', error);
    res.status(500).json({ success: false, message: '메뉴 삭제 중 오류가 발생했습니다.' });
  }
};

