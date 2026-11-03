const express = require('express');
const router = express.Router();
const nodeCrypto = require('crypto');
const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../middleware/auth');
const { kioskAuth } = require('../middleware/kioskAuth');
const pool = require('../config/database');
const { hashCouponCode, hashPhone } = require('../utils/crypto');
const notificationService = require('../services/notificationService');

// ── 단체 쿠폰 공유 링크 정책 (환경변수로 조정 가능) ──
// 일행: 1인 1장 / 구매자(문자 수신 번호로 로그인): 본인 포함 최대 SHARE_PROXY_MAX장
// 구매자 대리 수령(본인 몫 1장 제외)은 최근 30일 누적 SHARE_PROXY_MONTHLY_MAX장까지
const SHARE_PROXY_MAX = Math.max(1, parseInt(process.env.SHARE_PROXY_MAX || '5', 10) || 5);
const SHARE_PROXY_MONTHLY_MAX = Math.max(0, parseInt(process.env.SHARE_PROXY_MONTHLY_MAX || '10', 10) || 0);
const SHARE_LINK_DAYS = Math.max(1, parseInt(process.env.SHARE_LINK_DAYS || '30', 10) || 30);
const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{10,40}$/;

function generateShareToken() {
  return nodeCrypto.randomBytes(12).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildShareUrl(baseUrl, token) {
  return `${baseUrl}/tourist/share.html?t=${token}`;
}

// 한국시간 기준 'M/D' (문자 안내용)
function fmtMonthDayKST(date) {
  const parts = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' })
    .formatToParts(new Date(date));
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  return `${m}/${d}`;
}

// 단체 공유 링크 안내 문자 (가족 규모: 구매자가 전부 받을 수 있음 / 단체: 공유 유도)
function makeShareSmsText({ count, amount, url, expiresAt, proxyMax }) {
  const cap = Math.min(proxyMax, count);
  const head = `[옹진관광] 옹진관광쿠폰 ${count}장(총 ${amount.toLocaleString()}원)이 발급되었습니다.\n`;
  const body = count <= proxyMax
    ? `아래 링크에서 쿠폰을 받으세요.\n- 구매자: 최대 ${cap}장까지 직접 받기\n- 일행: 링크를 공유하면 1인 1장씩 받기\n`
    : `아래 링크를 일행분들께 공유해 주세요.\n- 일행: 1인 1장씩 받기\n- 구매자: 본인 포함 최대 ${cap}장까지 받기\n`;
  return head + body +
    `${url}\n` +
    `※ ${fmtMonthDayKST(expiresAt)}까지 받지 않은 쿠폰은 소멸됩니다.\n` +
    `(쿠폰 유효기간: 등록일로부터 1년)`;
}

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

// 내 쿠폰 목록 조회 (동일 휴대폰 번호(phone_hash)로 연동된 휴대폰·카카오·네이버 계정 쿠폰 통합 조회)
router.get('/my', authenticate, authorize('tourist'), async (req, res, next) => {
  try {
    const [userRows] = await pool.execute(
      `SELECT id, phone, phone_hash, social_provider, provider_id FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );
    let myPhoneHash = userRows[0]?.phone_hash || null;
    if (!myPhoneHash && userRows[0]?.social_provider === 'phone' && userRows[0]?.provider_id) {
      const digits = String(userRows[0].provider_id).replace(/\D/g, '');
      if (digits.length >= 10) myPhoneHash = hashPhone(digits);
    }

    let query = `
      SELECT c.id, c.code_hash, c.coupon_type, c.face_value, c.status, c.issued_at, c.expires_at, c.used_at,
             COALESCE(i.name, pc.issued_by_location, '옹진군청') AS issuer_name,
             m.name AS used_merchant_name
      FROM coupons c
      LEFT JOIN issuer_allocations ia ON c.issuer_allocation_id = ia.id
      LEFT JOIN issuers i ON ia.issuer_id = i.id
      LEFT JOIN paper_coupons pc ON c.code_hash = pc.random_code_hash
      LEFT JOIN coupon_transactions ct ON c.id = ct.coupon_id
      LEFT JOIN merchants m ON ct.merchant_id = m.id
    `;
    const params = [req.user.id];
    if (myPhoneHash) {
      query += ` WHERE (c.issued_to = ? OR c.issued_to IN (SELECT id FROM users WHERE phone_hash = ?)) ORDER BY c.issued_at DESC`;
      params.push(myPhoneHash);
    } else {
      query += ` WHERE c.issued_to = ? ORDER BY c.issued_at DESC`;
    }

    const [coupons] = await pool.execute(query, params);
    res.json({ success: true, data: coupons, coupons });
  } catch (err) { next(err); }
});

// 쿠폰 QR 결제용 토큰(code_hash) 조회 (동일 휴대폰 번호 통합 지갑 보유자 허용)
router.post('/:id/use-qr', authenticate, authorize('tourist'), async (req, res, next) => {
  const couponId = req.params.id;
  try {
    const [userRows] = await pool.execute(
      `SELECT id, phone_hash, social_provider, provider_id FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );
    let myPhoneHash = userRows[0]?.phone_hash || null;
    if (!myPhoneHash && userRows[0]?.social_provider === 'phone' && userRows[0]?.provider_id) {
      const digits = String(userRows[0].provider_id).replace(/\D/g, '');
      if (digits.length >= 10) myPhoneHash = hashPhone(digits);
    }

    let query = `SELECT id, code_hash, status FROM coupons WHERE id = ?`;
    const params = [couponId, req.user.id];
    if (myPhoneHash) {
      query += ` AND (issued_to = ? OR issued_to IN (SELECT id FROM users WHERE phone_hash = ?)) LIMIT 1`;
      params.push(myPhoneHash);
    } else {
      query += ` AND issued_to = ? LIMIT 1`;
    }

    const [rows] = await pool.execute(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '유효한 쿠폰을 찾을 수 없습니다.' });
    }
    res.json({ success: true, qrToken: rows[0].code_hash });
  } catch (err) { next(err); }
});

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

// 쿠폰 코드 정제 (URL 또는 일반 코드 형태에서 코드 추출 및 하이픈 자동 정규화)
function extractCouponCode(rawInput) {
  if (!rawInput) return '';
  let str = String(rawInput).trim();
  if (str.includes('http://') || str.includes('https://') || str.includes('?')) {
    try {
      const parsed = new URL(str, 'http://localhost');
      const paramCode = parsed.searchParams.get('code') || parsed.searchParams.get('claimCode');
      if (paramCode) str = paramCode;
    } catch (e) {
      const match = str.match(/(?:code|claimCode)=([A-Za-z0-9-]+)/i);
      if (match) str = match[1];
    }
  }

  str = str.trim().toUpperCase();
  const clean = str.replace(/[^A-Z0-9]/g, '');

  // 1. OJ로 시작하는 10자리 영숫자 (예: OJ1AE38D84) -> OJ-1AE3-8D84
  if (/^OJ[A-Z0-9]{8}$/.test(clean)) {
    return `OJ-${clean.slice(2, 6)}-${clean.slice(6, 10)}`;
  }
  // 2. 사용자가 OJ 접두사를 생략하고 8자리 코드만 입력한 경우 (예: 1AE38D84) -> OJ-1AE3-8D84
  if (/^[A-Z0-9]{8}$/.test(clean) && !str.startsWith('OJC')) {
    return `OJ-${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
  }
  // 3. 디지털 쿠폰 (예: OJCD1A2B3C4) -> OJC-D1A2B3C4
  if (/^OJCD[A-Z0-9]{8}$/.test(clean)) {
    return `OJC-D${clean.slice(4)}`;
  }

  return str;
}

// ── 키오스크 종이쿠폰 발권 API ──────────────────────────────────────────────
// [보안] 발행처별 API Key 인증 (kioskAuth 미들웨어) + 멱등성 보장
// [멱등성] X-Idempotency-Key 헤더: 키오스크가 네트워크 재시도 시 동일 키를 보내면
//          이미 발행된 쿠폰 정보를 그대로 반환하여 중복 발행을 완벽 차단한다.
// 표준 6대 권종: 1,000 / 2,000 / 3,000 / 5,000 / 8,000 / 10,000원
const ALLOWED_PAPER_FACE_VALUES = [1000, 2000, 3000, 5000, 8000, 10000];

// 옹진군 공식 조례 상품권 발행금액 기준 (공식 공문 기준표)
// 1,000원 미만: 미발행(0원) / 1,000원~1,999원: 1,000원 / 2,000~3,000원: 2,000원 / 4,000~7,000원: 3,000원 / 8,000~20,000원: 5,000원 / 20,000원초과~30,000원: 8,000원 / 30,000원초과: 10,000원
function calcCouponByPaidAmount(paidAmount) {
  const amt = Number(paidAmount) || 0;
  if (amt < 1000) return 0; // 결제 총합 1,000원 미만은 쿠폰 미발행
  if (amt < 2000) return 1000; // 결제 총합 1,000원 이상 ~ 2,000원 미만: 1,000원 쿠폰
  if (amt <= 3000) return 2000; // 2,000원 ~ 3,000원: 2,000원 쿠폰
  if (amt <= 7000) return 3000; // 3,001원 ~ 7,000원: 3,000원 쿠폰
  if (amt <= 20000) return 5000; // 7,001원 ~ 20,000원: 5,000원 쿠폰
  if (amt <= 30000) return 8000; // 20,001원 ~ 30,000원: 8,000원 쿠폰
  return 10000; // 30,001원 초과: 10,000원 쿠폰
}

// 쿠폰 1장 단위 영수증 서식 (1장당 영수증 1장 + 개별 QR 출력용, v1.1)
function makeCouponReceiptText(c, location, index, total) {
  const seq = total > 1 ? ` (${index}/${total})` : '';
  return `================================\r\n` +
    `    [ 옹진관광쿠폰 ]${seq}\r\n` +
    `================================\r\n` +
    ` 쿠폰금액 : ${c.faceValue.toLocaleString()}원${c.itemName ? ` (${c.itemName})` : ''}\r\n` +
    ` 쿠폰번호 : ${c.code}\r\n` +
    ` 발 행 처 : ${location}\r\n` +
    ` 유효기간 : 발급일로부터 1년\r\n` +
    ` 사 용 처 : 옹진관광쿠폰 전 가맹점\r\n` +
    `--------------------------------\r\n` +
    ` * 스마트폰 기본 카메라로 아래\r\n` +
    `   QR코드를 스캔하시면 모바일 지갑에\r\n` +
    `   즉시 등록되어 결제에 사용됩니다.\r\n` +
    `================================`;
}

// 영수증 프린터 전용 표준 출력 서식 생성기 (단일, 다인원, 복합 시설 상품 완벽 지원)
function makeReceiptText(coupons, location, summary) {
  const totalCount = summary.totalCount || coupons.length;
  const totalAmount = summary.totalAmount || 0;

  // 1,000원 미만 소액 결제로 쿠폰이 발행되지 않은 순수 입장권 서식
  if (totalCount === 0) {
    return `================================\r\n` +
      `     [ 옹진 관광지 입장권 ]     \r\n` +
      `================================\r\n` +
      ` 발 행 처 : ${location}\r\n` +
      ` 발권일시 : ${new Date().toLocaleString('ko-KR')}\r\n` +
      ` 결제안내 : 정상 결제 완료\r\n` +
      `--------------------------------\r\n` +
      ` * 본 입장권은 1,000원 미만 소액\r\n` +
      `   결제 건으로, 관광쿠폰 환급\r\n` +
      `   지원 대상에서 제외됩니다.\r\n` +
      `================================`;
  }

  if (totalCount === 1) {
    const c = coupons[0];
    return `================================\r\n` +
      `      [ 옹진관광쿠폰 ]      \r\n` +
      `================================\r\n` +
      ` 쿠폰금액 : ${c.faceValue.toLocaleString()}원${c.itemName ? ` (${c.itemName})` : ''}\r\n` +
      ` 쿠폰번호 : ${c.code}\r\n` +
      ` 발 행 처 : ${location}\r\n` +
      ` 유효기간 : 발급일로부터 1년\r\n` +
      ` 사 용 처 : 옹진관광쿠폰 전 가맹점\r\n` +
      `--------------------------------\r\n` +
      ` * 스마트폰 기본 카메라로 아래\r\n` +
      `   QR코드를 스캔하시면 모바일 지갑에\r\n` +
      `   즉시 등록되어 결제에 사용됩니다.\r\n` +
      `================================`;
  }

  // 복수 수량 또는 복합 상품(투영관+관측실 등) 영수증 서식
  let breakdownText = '';
  if (summary.breakdown && summary.breakdown.length > 0) {
    breakdownText = summary.breakdown
      .map(b => ` - ${b.name}: ${b.faceValue.toLocaleString()}원 × ${b.quantity}장`)
      .join('\r\n');
  } else {
    breakdownText = ` ${summary.unitFaceValue.toLocaleString()}원권 × ${totalCount}장`;
  }

  const listText = coupons
    .map((c, i) => ` ${String(i + 1).padStart(2, '0')}. ${c.code} (${c.faceValue.toLocaleString()}원${c.itemName ? ` - ${c.itemName}` : ''})`)
    .join('\r\n');

  return `================================\r\n` +
    `      [ 옹진관광쿠폰 ]      \r\n` +
    `================================\r\n` +
    ` [지급내역]\r\n` +
    `${breakdownText}\r\n` +
    ` 총 혜 택 : ${totalAmount.toLocaleString()}원 환급 지원\r\n` +
    ` 발 행 처 : ${location}\r\n` +
    ` 유효기간 : 발급일로부터 1년\r\n` +
    ` 사 용 처 : 옹진관광쿠폰 전 가맹점\r\n` +
    `--------------------------------\r\n` +
    ` [발행 쿠폰 번호 (총 ${totalCount}장)]\r\n` +
    `${listText}\r\n` +
    `--------------------------------\r\n` +
    (summary.shareMode
      // 문자 수령(공유 링크) 건: 일행 1인 1장 / 구매자 상한 적용 안내
      ? ` * 문자로 받은 링크를 일행에게\r\n` +
        `   공유하면 1인 1장씩 받을 수\r\n` +
        `   있습니다. (구매자 최대 ${summary.proxyMax}장)\r\n`
      : ` * 아래 통합 QR코드를 스캔하시면\r\n` +
        `   ${totalCount}장 모두 모바일 지갑에 일괄\r\n` +
        `   등록됩니다.\r\n`) +
    `================================`;
}

router.post(['/issue', '/issue-paper'], kioskAuth, async (req, res, next) => {
  // 멱등키: 키오스크가 생성한 고유 거래 ID (예: "KIOSK01_20260922_TXN0001")
  const idempotencyKey = req.headers['x-idempotency-key'] || req.body.transactionId;
  const { faceValue, paidAmount, eventCode, productCode, location, items } = req.body;
  const recipientPhone = req.body.recipientPhone || req.body.phone;

  // [로그] 키오스크에서 넘어온 요청 변수 기록 (logs/combined.log) - 키/전화번호는 마스킹
  try {
    const maskedBody = { ...req.body };
    ['recipientPhone', 'phone'].forEach((k) => {
      if (maskedBody[k]) maskedBody[k] = String(maskedBody[k]).replace(/\d(?=\d{4})/g, '*');
    });
    const rawKey = String(req.headers['x-kiosk-key'] || '');
    require('../utils/logger').info(
      `[KioskIssue] 요청 수신 | kiosk=${req.kiosk && req.kiosk.name} | key=${rawKey ? rawKey.slice(0, 4) + '***' : '(none)'} | ` +
      `idempotency=${req.headers['x-idempotency-key'] || '(none)'} | ` +
      `body=${JSON.stringify(maskedBody).slice(0, 2000)}`
    );
  } catch (_) { /* 로그 실패는 발권에 영향 없음 */ }

  // 발행 위치: 미들웨어에서 주입된 발행처 이름 우선, 없으면 body의 location 사용
  const issuedByLocation = req.kiosk.name || location || '옹진 관광지 키오스크';

  // ── 발권 대상 쿠폰 명세 목록 구축 ──
  const issuePlan = [];
  const breakdown = [];

  // [발권 계획 구축 로직]
  // 1. items 배열이 들어온 경우 (복합 장바구니 / 품목별 결제)
  if (Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      const itemQty = Math.max(1, parseInt(item.quantity || item.count || 1, 10));
      const itemName = item.name || item.productName || item.productCode || '관람시설 이용권';

      let itemFaceValue = 0;
      if (item.faceValue !== undefined && item.faceValue !== null && !isNaN(Number(item.faceValue))) {
        // 지정 권종이 명시된 경우 (예: { faceValue: 2000 })
        itemFaceValue = parseInt(item.faceValue, 10);
      } else {
        // 결제금액 / 인원수로 1인 단가 계산
        let itemUnitPrice = 0;
        if (item.unitPrice !== undefined && !isNaN(Number(item.unitPrice))) {
          itemUnitPrice = Number(item.unitPrice);
        } else if (item.paidAmount !== undefined && !isNaN(Number(item.paidAmount))) {
          itemUnitPrice = Number(item.paidAmount) / itemQty;
        }
        itemFaceValue = calcCouponByPaidAmount(itemUnitPrice);
      }

      if (itemFaceValue > 0) {
        breakdown.push({
          name: itemName,
          faceValue: itemFaceValue,
          quantity: itemQty,
        });
        for (let k = 0; k < itemQty; k++) {
          issuePlan.push({
            faceValue: itemFaceValue,
            itemName: itemName,
          });
        }
      } else {
        // 1인 단가 1,000원 미만 등 환급 제외 품목
        breakdown.push({
          name: `${itemName} (환급 제외)`,
          faceValue: 0,
          quantity: itemQty,
        });
      }
    }
  } else {
    // 2. 단일 결제 또는 총액 전송 방식 (paidAmount + quantity 또는 faceValue + quantity)
    const reqQty = Math.max(1, parseInt(req.body.quantity || req.body.count || 1, 10));
    let determinedValue = 0;

    if (faceValue && !isNaN(Number(faceValue))) {
      // 명시적 권종 전달 (예: faceValue: 5000, quantity: 2)
      determinedValue = parseInt(faceValue, 10);
    } else if (paidAmount !== undefined && paidAmount !== null && !isNaN(Number(paidAmount))) {
      const amt = Number(paidAmount);
      // [핵심]: 1인 단가 = 총 결제금액 / 인원수(quantity)
      const unitPaid = amt / reqQty;
      determinedValue = calcCouponByPaidAmount(unitPaid);
    }

    const defaultName = productCode || (determinedValue > 0 ? `${determinedValue.toLocaleString()}원권` : '관람시설 이용권');

    if (determinedValue > 0) {
      breakdown.push({
        name: defaultName,
        faceValue: determinedValue,
        quantity: reqQty,
      });
      for (let k = 0; k < reqQty; k++) {
        issuePlan.push({
          faceValue: determinedValue,
          itemName: defaultName,
        });
      }
    } else {
      breakdown.push({
        name: `${defaultName} (환급 제외)`,
        faceValue: 0,
        quantity: reqQty,
      });
    }
  }

  // 상한선 제한 (1회 최대 50장)
  if (issuePlan.length > 50) {
    return res.status(400).json({
      success: false,
      message: '1회 최대 발권 수량은 50장을 초과할 수 없습니다.',
    });
  }

  const totalCouponsCount = issuePlan.length;
  const totalCouponsAmount = issuePlan.reduce((acc, cur) => acc + cur.faceValue, 0);

  const baseUrl = process.env.APP_BASE_URL || 'https://ongjincoupon.kr';

  // ── 1. 멱등키가 있으면 기존 발행 이력 먼저 확인 ──
  if (idempotencyKey) {
    try {
      const [existing] = await pool.execute(
        `SELECT id, random_code_hash, face_value, issued_by_location, issued_at
         FROM paper_coupons
         WHERE kiosk_idempotency_key = ? OR kiosk_idempotency_key LIKE ?
         ORDER BY id ASC`,
        [idempotencyKey, `${idempotencyKey}#%`]
      );
      if (existing.length > 0) {
        const pc = existing[0];
        const existingCount = existing.length;
        const totalExistAmt = existing.reduce((sum, row) => sum + Number(row.face_value), 0);
        // 단체 공유 링크가 있었다면 동일 링크 반환 (공유 테이블 미존재 시 무시)
        let cachedShareUrl = null;
        try {
          const [shareRows] = await pool.execute(
            `SELECT b.token FROM paper_coupons p
             JOIN coupon_share_bundles b ON b.id = p.share_bundle_id
             WHERE p.id = ? LIMIT 1`,
            [pc.id]
          );
          if (shareRows.length > 0) cachedShareUrl = buildShareUrl(baseUrl, shareRows[0].token);
        } catch (_) { /* 공유 기능 미적용 DB */ }
        return res.json({
          success: true,
          cached: true,
          message: '이미 발행된 쿠폰입니다. (멱등성 응답)',
          data: {
            id: pc.id,
            faceValue: pc.face_value,
            location: pc.issued_by_location,
            issuedAt: pc.issued_at,
            shareUrl: cachedShareUrl,
            summary: {
              totalCount: existingCount,
              totalAmount: totalExistAmt,
            }
          },
        });
      }
    } catch (err) {
      return next(err);
    }
  }

  // ── 2. 신규 쿠폰 발행 (issuePlan 일괄 생성) ──
  const crypto = require('crypto');
  const connection = await pool.getConnection();
  let allocId = null;
  const issuerId = req.kiosk.id || null;
  const generatedCoupons = [];

  try {
    await connection.beginTransaction();

    // 발행처 배정(issuer_allocations) 카운팅 갱신 (권종별, faceValue > 0 인 것만)
    if (issuerId) {
      for (const item of breakdown) {
        if (item.faceValue > 0) {
          const [allocs] = await connection.execute(
            `SELECT id, total_count, issued_count FROM issuer_allocations
             WHERE issuer_id = ? AND face_value = ?
             ORDER BY id ASC LIMIT 1 FOR UPDATE`,
            [issuerId, item.faceValue]
          );

          if (allocs.length > 0) {
            await connection.execute(
              `UPDATE issuer_allocations SET issued_count = issued_count + ? WHERE id = ?`,
              [item.quantity, allocs[0].id]
            );
          } else {
            await connection.execute(
              `INSERT INTO issuer_allocations (issuer_id, face_value, total_count, issued_count)
               VALUES (?, ?, 1000, ?)`,
              [issuerId, item.faceValue, item.quantity]
            );
          }
        }
      }
    }

    // 문자 수령(2장 이상)이면 단체 공유 묶음 생성 → 링크 1개로 일행이 1인 1장씩 수령
    // [안전장치] 공유 테이블이 없거나 실패해도 발권은 계속 진행 (기존 일괄 등록 링크로 문자 발송)
    let shareBundle = null;
    const cleanRecipientPhone = recipientPhone ? String(recipientPhone).replace(/\D/g, '') : '';
    if (cleanRecipientPhone.length >= 10 && issuePlan.length > 1) {
      try {
        const token = generateShareToken();
        const expiresAt = new Date(Date.now() + SHARE_LINK_DAYS * 24 * 60 * 60 * 1000);
        const [bundleResult] = await connection.execute(
          `INSERT INTO coupon_share_bundles
             (token, transaction_id, issuer_id, issued_by_location, purchaser_phone_hash, purchaser_phone_masked, total_count, total_amount, proxy_max, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [token, idempotencyKey || null, issuerId, issuedByLocation, hashPhone(cleanRecipientPhone), maskPhoneDigits(cleanRecipientPhone),
            totalCouponsCount, totalCouponsAmount, SHARE_PROXY_MAX, expiresAt]
        );
        shareBundle = { id: bundleResult.insertId, token, expiresAt, url: buildShareUrl(baseUrl, token) };
      } catch (shareErr) {
        require('../utils/logger').warn(`[KioskIssue] 단체 공유 묶음 생성 실패 (기존 링크로 대체): ${shareErr.message}`);
      }
    }

    // 각 쿠폰 레코드 생성
    for (let i = 0; i < issuePlan.length; i++) {
      const plan = issuePlan[i];
      const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
      const couponCode = `OJ-${part1}-${part2}`;
      const codeHash = hashCouponCode(couponCode);
      const rowIdempotencyKey = idempotencyKey
        ? (i === 0 ? idempotencyKey : `${idempotencyKey}#${i + 1}`)
        : null;

      const [insertResult] = shareBundle
        ? await connection.execute(
          `INSERT INTO paper_coupons
             (random_code_hash, face_value, issued_by_location, kiosk_idempotency_key, terminal_id, issuer_id, issuer_allocation_id, converted, share_bundle_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
          [codeHash, plan.faceValue, issuedByLocation, rowIdempotencyKey, req.kiosk.terminalId, issuerId, allocId, shareBundle.id]
        )
        : await connection.execute(
          `INSERT INTO paper_coupons
             (random_code_hash, face_value, issued_by_location, kiosk_idempotency_key, terminal_id, issuer_id, issuer_allocation_id, converted)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
          [codeHash, plan.faceValue, issuedByLocation, rowIdempotencyKey, req.kiosk.terminalId, issuerId, allocId]
        );

      const claimUrl = `${baseUrl}/tourist/mypage.html?claimCode=${couponCode}`;
      generatedCoupons.push({
        id: insertResult.insertId,
        code: couponCode,
        faceValue: plan.faceValue,
        itemName: plan.itemName,
        claimUrl,
        qrData: claimUrl,
      });
    }

    await connection.commit();

    // N장 일괄 등록용 복합 URL 생성 (쉼표 구분)
    const allCodesStr = generatedCoupons.map(c => c.code).join(',');
    const bundleClaimUrl = allCodesStr ? `${baseUrl}/tourist/mypage.html?claimCode=${allCodesStr}` : '';

    const summaryObj = {
      totalCount: totalCouponsCount,
      totalAmount: totalCouponsAmount,
      breakdown: breakdown,
      unitFaceValue: generatedCoupons[0]?.faceValue || 0,
      shareMode: !!shareBundle,
      proxyMax: SHARE_PROXY_MAX,
    };

    const receiptText = makeReceiptText(generatedCoupons, issuedByLocation, summaryObj);

    // v1.1: 장당 영수증 문구 (키오스크가 coupons[]를 순회하며 1장씩 출력)
    generatedCoupons.forEach((c, i) => {
      c.receiptText = makeCouponReceiptText(c, issuedByLocation, i + 1, generatedCoupons.length);
    });

    // ── 3. 수신자 전화번호가 있으면 문자/알림톡 발송 (비동기 큐, 쿠폰이 1장 이상일 때만) ──
    if (recipientPhone && totalCouponsCount > 0) {
      let notiMessage = '';
      if (shareBundle) {
        // 2장 이상: 단체 공유 링크 (일행 1인 1장 / 구매자 최대 SHARE_PROXY_MAX장)
        notiMessage = makeShareSmsText({
          count: totalCouponsCount,
          amount: totalCouponsAmount,
          url: shareBundle.url,
          expiresAt: shareBundle.expiresAt,
          proxyMax: SHARE_PROXY_MAX,
        });
      } else if (totalCouponsCount === 1) {
        notiMessage = `[옹진관광] ${totalCouponsAmount.toLocaleString()}원 쿠폰이 발급되었습니다.\n아래 링크를 눌러 내 쿠폰함에 등록하세요.\n${bundleClaimUrl}\n(유효기간: 발급일로부터 1년)`;
      } else {
        // 공유 묶음 생성 실패 시 대체 문구 (기존 일괄 등록 링크)
        notiMessage = `[옹진관광] 옹진관광쿠폰 ${totalCouponsCount}장(총 ${totalCouponsAmount.toLocaleString()}원)이 발급되었습니다.\n아래 링크를 눌러 내 쿠폰함에 일괄 등록하세요.\n${bundleClaimUrl}\n(유효기간: 발급일로부터 1년)`;
      }

      const cleanPhone = recipientPhone.replace(/\D/g, '');
      const { enqueue } = require('../services/notificationQueue');
      enqueue('sms', cleanPhone, notiMessage).catch(err => {
        require('../utils/logger').error(`[Coupon] 알림 큐 등록 실패: ${err.message}`);
      });
    }

    const firstCoupon = generatedCoupons[0] || null;

    res.json({
      success: true,
      message: totalCouponsCount > 0
        ? '쿠폰이 성공적으로 발행되었습니다.'
        : '1,000원 미만 결제 건으로 관광쿠폰 환급 대상에서 제외되었습니다. (입장권 정상 발권)',
      data: {
        id: firstCoupon ? firstCoupon.id : null,
        code: firstCoupon ? firstCoupon.code : null,
        faceValue: firstCoupon ? firstCoupon.faceValue : 0,
        location: issuedByLocation,
        issuedAt: new Date().toISOString(),
        claimUrl: bundleClaimUrl,
        qrData: bundleClaimUrl,
        shareUrl: shareBundle ? shareBundle.url : null,
        receiptText: receiptText,
        summary: summaryObj,
        coupons: generatedCoupons,
      },
    });
  } catch (err) {
    await connection.rollback().catch(() => { });
    next(err);
  } finally {
    connection.release();
  }
});

// ── 키오스크 결제 취소 및 쿠폰 무효화(Revoke) API ─────────────────────────────
// [보안] kioskAuth 미들웨어 인증
// [원자성] 가맹점 사용 여부 검증 후 종이쿠폰 및 기등록 디지털쿠폰 일괄 취소(ACID)
function makeCancelReceiptText(cancelled, used, location, reason, cancelledAt) {
  const cancelledAmount = cancelled.reduce((sum, c) => sum + Number(c.face_value || 0), 0);
  const usedAmount = used.reduce((sum, c) => sum + Number(c.face_value || 0), 0);
  const dateStr = cancelledAt ? new Date(cancelledAt).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR');

  return `================================\r\n` +
    `   [ 옹진관광쿠폰 결제취소 ]   \r\n` +
    `================================\r\n` +
    ` 취소일시 : ${dateStr}\r\n` +
    ` 발 행 처 : ${location}\r\n` +
    ` 취소사유 : ${reason || '고객 요청 결제 취소'}\r\n` +
    `--------------------------------\r\n` +
    ` [회수 및 무효화 내역]\r\n` +
    ` 취소수량 : 총 ${cancelled.length}장\r\n` +
    ` 환불금액 : 총 ${cancelledAmount.toLocaleString()}원 환급 취소\r\n` +
    `--------------------------------\r\n` +
    ` * 이미 사용된 쿠폰 ${used.length}장(${usedAmount.toLocaleString()}원)은\r\n` +
    `   취소되지 않았으며 별도 회수\r\n` +
    `   대상으로 접수되었습니다.\r\n` +
    `================================`;
}

// [사후 회수 정책] 카드 결제 반품은 키오스크에서 먼저 완료된 상태이므로
// 쿠폰 취소는 사용 여부와 무관하게 항상 HTTP 200으로 응답한다.
// - 미사용 쿠폰: 전부 무효화 / 사용된 쿠폰: 유지 + coupon_recoveries 에 회수 대상 기록
// - result: CANCELLED(전부 취소) / PARTIAL(일부 사용) / NOT_CANCELLED(전부 사용)
router.post(['/cancel', '/cancel-kiosk'], kioskAuth, async (req, res, next) => {
  const { transactionId, codes, code, cancelReason } = req.body;
  const reason = cancelReason || '키오스크 결제 취소 (단말기 환불)';

  if (!transactionId && !codes && !code) {
    return res.status(400).json({
      success: false,
      message: '취소할 거래 ID(transactionId) 또는 쿠폰 번호(codes)를 전달해야 합니다.'
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let targetPapers = [];

    // 1. 거래 ID(멱등키) 기반 조회
    if (transactionId) {
      const [rows] = await connection.execute(
        `SELECT id, random_code_hash, face_value, converted, converted_by, is_cancelled,
                issued_by_location, issuer_id, issuer_allocation_id, kiosk_idempotency_key
         FROM paper_coupons
         WHERE kiosk_idempotency_key = ? OR kiosk_idempotency_key LIKE ?
         FOR UPDATE`,
        [transactionId, `${transactionId}#%`]
      );
      targetPapers = rows;
    }

    // 2. 쿠폰 코드 기반 보완 조회
    const rawCodes = Array.isArray(codes) ? codes : (code ? [code] : []);
    if (rawCodes.length > 0) {
      const hashes = rawCodes.map(c => hashCouponCode(extractCouponCode(c))).filter(Boolean);
      if (hashes.length > 0) {
        const placeholders = hashes.map(() => '?').join(',');
        const [rows] = await connection.execute(
          `SELECT id, random_code_hash, face_value, converted, converted_by, is_cancelled,
                  issued_by_location, issuer_id, issuer_allocation_id, kiosk_idempotency_key
           FROM paper_coupons
           WHERE random_code_hash IN (${placeholders})
           FOR UPDATE`,
          hashes
        );
        const existingIds = new Set(targetPapers.map(p => p.id));
        for (const row of rows) {
          if (!existingIds.has(row.id)) {
            targetPapers.push(row);
            existingIds.add(row.id);
          }
        }
      }
    }

    if (targetPapers.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: '해당 결제 또는 쿠폰 발행 이력을 찾을 수 없습니다.'
      });
    }

    // 3. 모바일 등록(coupons) 사용 여부 조회
    const codeHashes = targetPapers.map(p => p.random_code_hash);
    const hashPlaceholders = codeHashes.map(() => '?').join(',');
    const [digitalCoupons] = await connection.execute(
      `SELECT id, code_hash, status FROM coupons WHERE code_hash IN (${hashPlaceholders})`,
      codeHashes
    );
    const digitalByHash = new Map(digitalCoupons.map(c => [c.code_hash, c]));

    // 4. 분류: 이미 취소됨 / 사용됨(회수 대상) / 이번에 취소할 대상
    const isAlreadyCancelled = p => p.is_cancelled === 1 || p.converted === -1;
    const isUsed = p => {
      const d = digitalByHash.get(p.random_code_hash);
      return !!d && d.status === 'used';
    };
    const prevCancelled = targetPapers.filter(isAlreadyCancelled);
    const usedPapers = targetPapers.filter(p => !isAlreadyCancelled(p) && isUsed(p));
    const toCancel = targetPapers.filter(p => !isAlreadyCancelled(p) && !isUsed(p));

    const now = new Date();
    const txnId = transactionId || targetPapers[0].kiosk_idempotency_key;

    // 5. 취소 처리 (paper_coupons / coupons / issuer_allocations)
    if (toCancel.length > 0) {
      const ids = toCancel.map(p => p.id);
      const idPlaceholders = ids.map(() => '?').join(',');
      await connection.execute(
        `UPDATE paper_coupons
         SET converted = -1, is_cancelled = 1, cancelled_at = NOW(), cancel_reason = ?
         WHERE id IN (${idPlaceholders})`,
        [reason, ...ids]
      );

      const cancelHashes = toCancel.map(p => p.random_code_hash);
      const cancelHashPlaceholders = cancelHashes.map(() => '?').join(',');
      await connection.execute(
        `UPDATE coupons
         SET status = 'cancelled'
         WHERE code_hash IN (${cancelHashPlaceholders}) AND status = 'available'`,
        cancelHashes
      );

      const allocationCountMap = new Map();
      for (const p of toCancel) {
        if (p.issuer_id && p.face_value) {
          const key = `${p.issuer_id}_${p.face_value}`;
          allocationCountMap.set(key, (allocationCountMap.get(key) || 0) + 1);
        }
      }
      for (const [key, qty] of allocationCountMap.entries()) {
        const [issId, faceVal] = key.split('_');
        await connection.execute(
          `UPDATE issuer_allocations
           SET issued_count = GREATEST(0, issued_count - ?)
           WHERE issuer_id = ? AND face_value = ?`,
          [qty, issId, faceVal]
        );
      }
    }

    // 6. 사용된 쿠폰 회수 대상 기록 (중복 호출 시 1회만 기록)
    for (const p of usedPapers) {
      const d = digitalByHash.get(p.random_code_hash);
      await connection.execute(
        `INSERT IGNORE INTO coupon_recoveries
           (paper_coupon_id, coupon_id, issuer_id, transaction_id, face_value, reason, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [p.id, d ? d.id : null, p.issuer_id || null, txnId || null, Number(p.face_value || 0), reason]
      );
    }

    await connection.commit();

    // 7. 응답 구성
    const cancelledAll = [...prevCancelled, ...toCancel];
    const totalCount = targetPapers.length;
    const cancelledCount = cancelledAll.length;
    const usedCount = usedPapers.length;
    const totalRefundAmount = cancelledAll.reduce((sum, p) => sum + Number(p.face_value || 0), 0);
    const usedAmount = usedPapers.reduce((sum, p) => sum + Number(p.face_value || 0), 0);

    let result = 'CANCELLED';
    let message = '키오스크 결제 및 쿠폰 발권이 정상적으로 취소되었습니다.';
    if (usedCount > 0 && cancelledCount === 0) {
      result = 'NOT_CANCELLED';
      message = `발행된 쿠폰 ${totalCount}장이 모두 사용되어 취소할 수 없어 별도 회수 대상으로 접수되었습니다.`;
    } else if (usedCount > 0) {
      result = 'PARTIAL';
      message = `사용되지 않은 쿠폰 ${cancelledCount}장은 취소되었고, 이미 사용된 쿠폰 ${usedCount}장은 별도 회수 대상으로 접수되었습니다.`;
    }

    const cached = toCancel.length === 0 && usedCount === 0;
    if (cached) {
      message = '이미 결제 취소(환불) 처리된 거래입니다. (멱등성 응답)';
    }

    const loc = targetPapers[0].issued_by_location || req.kiosk.name || '옹진 관광지 키오스크';
    const cancelReceiptText = result === 'PARTIAL'
      ? makeCancelReceiptText(cancelledAll, usedPapers, loc, reason, now)
      : null;

    const payload = {
      success: true,
      message,
      data: {
        transactionId: txnId,
        result,
        totalCount,
        cancelledCount,
        usedCount,
        totalRefundAmount,
        usedAmount,
        cancelledAt: now.toISOString(),
        cancelReceiptText,
        coupons: targetPapers.map(p => ({
          id: p.id,
          faceValue: p.face_value,
          status: usedPapers.includes(p) ? 'used' : 'cancelled'
        }))
      }
    };
    if (cached) payload.cached = true;

    res.json(payload);

  } catch (err) {
    await connection.rollback().catch(() => { });
    next(err);
  } finally {
    connection.release();
  }
});


// ── 종이쿠폰 1장 → 모바일 쿠폰 전환 공통 로직 ──
// 전제: 호출측 트랜잭션 안에서 paper_coupons 행을 FOR UPDATE로 잠근 상태
// 반환: { digitalCouponId, faceValue } / 이미 다른 요청이 전환한 경우 null
async function convertPaperToDigital(connection, paper, codeHash, userId) {
  // 원자적 UPDATE로 동시성 경합 차단
  const [updateResult] = await connection.execute(
    `UPDATE paper_coupons 
     SET converted = 1, converted_by = ?, converted_at = NOW() 
     WHERE random_code_hash = ? AND converted = 0`,
    [userId, codeHash]
  );
  if (updateResult.affectedRows === 0) return null;

  const faceValue = paper.face_value;

  // 배정 ID 확인 및 과거 누락 데이터 자동 매핑 보정
  let allocId = paper.issuer_allocation_id || null;
  if (!allocId) {
    const [matched] = await connection.execute(
      `SELECT ia.id FROM issuer_allocations ia
       LEFT JOIN issuers i ON ia.issuer_id = i.id
       WHERE (ia.issuer_id = ? OR i.name = ? OR i.terminal_id = ?) AND ia.face_value = ?
       ORDER BY ia.id DESC LIMIT 1`,
      [paper.issuer_id || 0, paper.issued_by_location || '', paper.terminal_id || '', faceValue]
    );
    if (matched.length > 0) {
      allocId = matched[0].id;
      await connection.execute(`UPDATE paper_coupons SET issuer_allocation_id = ? WHERE id = ?`, [allocId, paper.id]);
    }
  }

  // 모바일 쿠폰함(coupons)에 디지털 쿠폰 생성 (유효기간: 등록일로부터 1년)
  const [insertResult] = await connection.execute(
    `INSERT INTO coupons (code_hash, coupon_type, face_value, issued_to, status, expires_at, issuer_allocation_id)
     VALUES (?, 'paper', ?, ?, 'available', DATE_ADD(NOW(), INTERVAL 1 YEAR), ?)`,
    [codeHash, faceValue, userId, allocId]
  );

  // 사용자 잔액 증가
  await connection.execute(
    `UPDATE users SET coupon_balance = coupon_balance + ? WHERE id = ?`,
    [faceValue, userId]
  );

  return { digitalCouponId: insertResult.insertId, faceValue };
}

// ── 종이쿠폰 모바일 앱 등록/전환 핸들러 (원자적 ACID 트랜잭션) ──
const handlePaperConversion = async (req, res, next) => {
  const { code } = req.body;
  const cleanCode = extractCouponCode(code);
  if (!cleanCode) {
    return res.status(400).json({ success: false, message: '쿠폰 번호를 입력하거나 QR을 다시 스캔해 주세요.' });
  }

  const codeHash = hashCouponCode(cleanCode);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 0. 단체 공유 묶음 소속 쿠폰이면 묶음을 먼저 잠금
    //    (공유 링크 수령과 동일한 잠금 순서: 묶음 → 쿠폰 / 쿠폰번호 직접 등록으로 수령 한도 우회 차단)
    let shareBundle = null;
    try {
      const [refs] = await connection.execute(
        `SELECT share_bundle_id FROM paper_coupons WHERE random_code_hash = ? LIMIT 1`,
        [codeHash]
      );
      if (refs.length > 0 && refs[0].share_bundle_id) {
        const [bRows] = await connection.execute(
          `SELECT * FROM coupon_share_bundles WHERE id = ? LIMIT 1 FOR UPDATE`,
          [refs[0].share_bundle_id]
        );
        shareBundle = bRows[0] || null;
      }
    } catch (shareErr) {
      // 공유 스키마가 없는 환경: 기존 종이쿠폰 등록 흐름 유지
      shareBundle = null;
    }

    // 1. 종이 쿠폰 조회 (Pessimistic Lock)
    const [papers] = await connection.execute(
      `SELECT id, face_value, converted, converted_by, converted_at, is_cancelled, issued_by_location, issuer_id, issuer_allocation_id, terminal_id
       FROM paper_coupons WHERE random_code_hash = ? LIMIT 1 FOR UPDATE`,
      [codeHash]
    );

    if (papers.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: '유효하지 않은 종이쿠폰 번호입니다. 번호를 다시 확인해 주세요.'
      });
    }

    const paper = papers[0];

    // 2-1. 결제 취소(환불)된 종이쿠폰인지 확인
    if (paper.converted === -1 || paper.is_cancelled === 1) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: '키오스크 결제 취소(환불) 처리되어 사용할 수 없는 종이쿠폰입니다.'
      });
    }

    // 2-2. 이미 모바일 앱으로 전환되었거나 가맹점에서 직접 사용된 쿠폰인지 확인
    if (paper.converted === 1) {
      await connection.rollback();
      const isMyCoupon = paper.converted_by === req.user.id;
      return res.status(400).json({
        success: false,
        message: isMyCoupon
          ? '이미 본인의 모바일 쿠폰함에 등록 완료된 쿠폰입니다.'
          : '이미 다른 사용자가 모바일 앱으로 전환 등록한 쿠폰입니다. (이중 등록 불가)'
      });
    }

    if (paper.converted === 2) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: '이미 가맹점에서 종이쿠폰으로 결제(사용) 완료된 쿠폰입니다. (모바일 등록 불가)'
      });
    }

    // 2-3. 단체 공유 묶음 쿠폰: 공유 링크와 동일한 규칙 적용 (받기 기한 / 일행 1장 / 구매자 상한 / 30일 대리 한도)
    let shareViewer = null;
    if (shareBundle) {
      if (new Date(shareBundle.expires_at) < new Date()) {
        await connection.rollback();
        return res.status(410).json({
          success: false,
          code: 'EXPIRED',
          message: '받기 기간이 지나 소멸된 단체 쿠폰입니다.'
        });
      }
      shareViewer = await computeShareViewer(connection, shareBundle, req.user.id, 1);
      if (!shareViewer) {
        await connection.rollback();
        return res.status(401).json({ success: false, message: '사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.' });
      }
      if (shareViewer.allowedCount < 1) {
        await connection.rollback();
        const code = shareViewer.blockReason || 'SOLD_OUT';
        return res.status(400).json({ success: false, code, message: SHARE_BLOCK_MESSAGES[code] });
      }
    }

    // 3~5. 원자적 전환 (동시성 경합 차단 → 모바일 쿠폰 생성 → 잔액 증가)
    const converted = await convertPaperToDigital(connection, paper, codeHash, req.user.id);
    if (!converted) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: '이미 처리 중이거나 등록된 쿠폰입니다.' });
    }

    // 단체 공유 쿠폰이면 수령 기록 남김 (FDS 대리수령 탐지 / 관리자 조회용)
    if (shareBundle) {
      await insertShareClaim(connection, {
        bundleId: shareBundle.id,
        userId: req.user.id,
        phoneHash: shareViewer.phoneHash,
        paperId: paper.id,
        couponId: converted.digitalCouponId,
        faceValue: converted.faceValue,
        claimType: shareViewer.claimedCount === 0 ? 'self' : 'proxy',
        source: 'code',
        req,
      });
    }

    const faceValue = converted.faceValue;

    await connection.commit();
    res.json({
      success: true,
      message: `${faceValue.toLocaleString()}원 쿠폰이 성공적으로 내 지갑에 등록되었습니다!`,
      data: {
        couponId: paper.id,
        paperId: paper.id,
        digitalCouponId: converted.digitalCouponId,
        faceValue,
        location: paper.issued_by_location || '옹진 관광지',
        code: cleanCode
      }
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

router.post('/register-paper', authenticate, authorize('tourist'), handlePaperConversion);
router.post('/convert-paper', authenticate, authorize('tourist'), handlePaperConversion);

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

    // 4. 쿠폰 레코드 삽입 (유효기간: 발급일로부터 1년)
    await connection.execute(
      `INSERT INTO coupons (code_hash, coupon_type, face_value, issued_to, status, expires_at, issuer_allocation_id, kiosk_session_id)
       VALUES (?, 'digital', ?, ?, 'available', DATE_ADD(NOW(), INTERVAL 1 YEAR), ?, ?)`,
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

// ══════════════════════════════════════════════════════════════════════════
// 단체 쿠폰 공유 링크 (/tourist/share.html?t=토큰)
//  - 일행: 1인 1장
//  - 구매자(로그인 번호 = 문자 수신 번호): 본인 포함 최대 bundle.proxy_max장
//  - 구매자 대리 수령분(proxy)은 최근 30일 누적 SHARE_PROXY_MONTHLY_MAX장까지
//  - 링크 만료(기본 30일) 후 받지 않은 쿠폰은 미발급 상태로 소멸
// ══════════════════════════════════════════════════════════════════════════
const SHARE_BLOCK_MESSAGES = {
  EXPIRED: '받기 기간이 지난 링크입니다.',
  SOLD_OUT: '쿠폰이 모두 소진되었습니다.',
  CANCELLED: '매표소에서 결제가 취소되어 받을 수 없는 쿠폰입니다.',
  ALREADY_CLAIMED: '이미 이 링크에서 쿠폰을 받으셨습니다. 내 쿠폰함에서 확인해 주세요.',
  PROXY_LIMIT: '구매자가 받을 수 있는 최대 수량을 모두 받으셨습니다. 남은 쿠폰은 일행에게 공유해 주세요.',
  MONTHLY_LIMIT: '최근 30일 대리 수령 한도를 초과했습니다. 남은 쿠폰은 일행에게 공유해 주세요.',
};

// 비로그인 허용 API에서 토큰이 있으면 관광객 정보만 선택적으로 해석
function getOptionalTourist(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    return decoded && decoded.role === 'tourist' ? decoded : null;
  } catch (_) {
    return null;
  }
}

function maskPhoneDigits(digits) {
  if (!digits || digits.length < 10) return null;
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

// 공유 묶음 수령 기록 1건 저장 (공유 링크 / 쿠폰번호 직접 등록 공용)
async function insertShareClaim(conn, { bundleId, userId, phoneHash, paperId, couponId, faceValue, claimType, source, req }) {
  const ip = String((req && req.ip) || '').slice(0, 64);
  const userAgent = String((req && req.headers && req.headers['user-agent']) || '').slice(0, 255);
  await conn.execute(
    `INSERT INTO coupon_share_claims
       (bundle_id, user_id, claimer_phone_hash, paper_coupon_id, coupon_id, face_value, claim_type, source, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [bundleId, userId, phoneHash || null, paperId, couponId, faceValue, claimType, source || 'link', ip, userAgent]
  );
}

// 묶음 내 쿠폰 현황 (권종별 + 합계)
async function loadShareStats(conn, bundleId) {
  const [rows] = await conn.execute(
    `SELECT face_value,
            COUNT(*) AS total,
            SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END) AS claimed,
            SUM(CASE WHEN converted = -1 OR COALESCE(is_cancelled, 0) = 1 THEN 1 ELSE 0 END) AS cancelled,
            SUM(CASE WHEN converted = 0 AND COALESCE(is_cancelled, 0) = 0 THEN 1 ELSE 0 END) AS remaining
     FROM paper_coupons
     WHERE share_bundle_id = ?
     GROUP BY face_value
     ORDER BY face_value DESC`,
    [bundleId]
  );
  const breakdown = rows.map(r => ({
    faceValue: Number(r.face_value),
    total: Number(r.total),
    claimed: Number(r.claimed),
    remaining: Number(r.remaining),
  }));
  const sum = key => rows.reduce((acc, r) => acc + Number(r[key] || 0), 0);
  return {
    breakdown,
    total: sum('total'),
    claimed: sum('claimed'),
    cancelled: sum('cancelled'),
    remaining: sum('remaining'),
  };
}

function resolveShareStatus(bundle, stats) {
  if (new Date(bundle.expires_at) < new Date()) return 'EXPIRED';
  if (stats.remaining > 0) return 'OPEN';
  if (stats.total > 0 && stats.cancelled === stats.total) return 'CANCELLED';
  if (stats.claimed === 0 && stats.cancelled > 0) return 'CANCELLED';
  return 'SOLD_OUT';
}

// 로그인 사용자 기준 수령 가능 수량 계산 (화면 표시 + 서버 검증 공용)
async function computeShareViewer(conn, bundle, userId, remaining) {
  const [users] = await conn.execute(
    `SELECT id, phone, phone_hash, social_provider FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  if (users.length === 0) return null;
  const u = users[0];
  const digits = String(u.phone || '').replace(/\D/g, '');
  const myPhoneHash = u.phone_hash || (digits.length >= 10 ? hashPhone(digits) : null);
  const isPurchaser = !!(myPhoneHash && myPhoneHash === bundle.purchaser_phone_hash);

  // 이 묶음에서 이미 받은 수량 (공유 링크 + 종이 코드 직접 등록 모두 포함)
  const [[mine]] = await conn.execute(
    `SELECT COUNT(*) AS cnt, COALESCE(SUM(face_value), 0) AS amt
     FROM paper_coupons
     WHERE share_bundle_id = ? AND converted = 1 AND converted_by = ?`,
    [bundle.id, userId]
  );
  const claimedCount = Number(mine.cnt);
  const claimedAmount = Number(mine.amt);

  let monthlyProxyLeft = 0;
  let allowedCount = 0;
  let blockReason = null;

  if (!isPurchaser) {
    allowedCount = claimedCount > 0 ? 0 : 1;
    if (claimedCount > 0) blockReason = 'ALREADY_CLAIMED';
  } else {
    // 회원 ID + 휴대폰 해시 기준 합산 (탈퇴 후 재가입으로 한도 초기화 방지)
    const [[m]] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM coupon_share_claims
       WHERE claim_type = 'proxy' AND claimed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         AND (user_id = ? OR claimer_phone_hash = ?)`,
      [userId, bundle.purchaser_phone_hash]
    );
    monthlyProxyLeft = Math.max(0, SHARE_PROXY_MONTHLY_MAX - Number(m.cnt));
    const capLeft = Math.max(0, Number(bundle.proxy_max) - claimedCount);
    const selfLeft = claimedCount === 0 ? 1 : 0;
    allowedCount = Math.min(capLeft, selfLeft + monthlyProxyLeft);
    if (allowedCount === 0) blockReason = capLeft === 0 ? 'PROXY_LIMIT' : 'MONTHLY_LIMIT';
  }

  return {
    isPurchaser,
    phoneHash: isPurchaser ? bundle.purchaser_phone_hash : myPhoneHash,
    maskedPhone: maskPhoneDigits(digits),
    hasPhone: !!(digits && digits.length >= 10),
    socialProvider: u.social_provider,
    claimedCount,
    claimedAmount,
    allowedCount: Math.min(allowedCount, remaining),
    monthlyProxyLeft,
    blockReason,
  };
}

// 공유 링크 정보 조회 (비로그인 허용, 로그인 시 수령 가능 수량 포함)
router.get('/share/:token', async (req, res, next) => {
  const { token } = req.params;
  if (!SHARE_TOKEN_RE.test(token)) {
    return res.status(404).json({ success: false, code: 'NOT_FOUND', message: '유효하지 않은 공유 링크입니다.' });
  }
  try {
    const [rows] = await pool.execute(`SELECT * FROM coupon_share_bundles WHERE token = ? LIMIT 1`, [token]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: '유효하지 않은 공유 링크입니다.' });
    }
    const bundle = rows[0];
    const stats = await loadShareStats(pool, bundle.id);
    const status = resolveShareStatus(bundle, stats);
    const tourist = getOptionalTourist(req);
    const viewerFull = tourist ? await computeShareViewer(pool, bundle, tourist.id, stats.remaining) : null;
    // 휴대폰 해시는 서버 내부용 → 응답에서 제외
    const viewer = viewerFull ? (({ phoneHash, ...rest }) => rest)(viewerFull) : null;

    res.json({
      success: true,
      data: {
        status,
        statusMessage: status === 'OPEN' ? null : SHARE_BLOCK_MESSAGES[status],
        location: bundle.issued_by_location || '옹진 관광지',
        purchaserMaskedPhone: bundle.purchaser_phone_masked,
        totalCount: stats.total,
        totalAmount: Number(bundle.total_amount),
        claimedCount: stats.claimed,
        remainingCount: stats.remaining,
        breakdown: stats.breakdown,
        expiresAt: bundle.expires_at,
        policy: { proxyMax: Number(bundle.proxy_max), monthlyProxyMax: SHARE_PROXY_MONTHLY_MAX },
        viewer: viewer && {
          ...viewer,
          blockMessage: viewer.blockReason ? SHARE_BLOCK_MESSAGES[viewer.blockReason] : null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// 공유 링크로 쿠폰 받기 (수량/한도는 서버에서 재계산하여 검증)
router.post('/share/:token/claim', authenticate, authorize('tourist'), async (req, res, next) => {
  const { token } = req.params;
  const quantity = parseInt((req.body && req.body.quantity) || 1, 10);
  if (!SHARE_TOKEN_RE.test(token)) {
    return res.status(404).json({ success: false, code: 'NOT_FOUND', message: '유효하지 않은 공유 링크입니다.' });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    return res.status(400).json({ success: false, code: 'INVALID_QUANTITY', message: '받을 수량이 올바르지 않습니다.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. 묶음 잠금 (동시 클릭 직렬화 → 1인 1장 / 상한 초과 원천 차단)
    const [rows] = await connection.execute(
      `SELECT * FROM coupon_share_bundles WHERE token = ? LIMIT 1 FOR UPDATE`,
      [token]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: '유효하지 않은 공유 링크입니다.' });
    }
    const bundle = rows[0];

    // 2. 묶음 상태 확인 (만료 / 소진 / 결제취소)
    const stats = await loadShareStats(connection, bundle.id);
    const status = resolveShareStatus(bundle, stats);
    if (status !== 'OPEN') {
      await connection.rollback();
      return res.status(status === 'EXPIRED' ? 410 : 400).json({
        success: false, code: status, message: SHARE_BLOCK_MESSAGES[status],
      });
    }

    // 3. 사용자별 수령 가능 수량 검증
    const viewer = await computeShareViewer(connection, bundle, req.user.id, stats.remaining);
    if (!viewer) {
      await connection.rollback();
      return res.status(401).json({ success: false, message: '사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.' });
    }
    if (viewer.allowedCount === 0) {
      await connection.rollback();
      const code = viewer.blockReason || 'SOLD_OUT';
      return res.status(400).json({ success: false, code, message: SHARE_BLOCK_MESSAGES[code] });
    }
    if (quantity > viewer.allowedCount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        code: 'QUANTITY_EXCEEDED',
        message: `최대 ${viewer.allowedCount}장까지 받을 수 있습니다.`,
        allowedCount: viewer.allowedCount,
      });
    }

    // 4. 남은 종이쿠폰 잠금 (quantity는 1~50 정수로 검증 완료)
    const [papers] = await connection.execute(
      `SELECT id, random_code_hash, face_value, issuer_id, issuer_allocation_id, issued_by_location, terminal_id
       FROM paper_coupons
       WHERE share_bundle_id = ? AND converted = 0 AND COALESCE(is_cancelled, 0) = 0
       ORDER BY id ASC
       LIMIT ${quantity}
       FOR UPDATE`,
      [bundle.id]
    );
    if (papers.length < quantity) {
      await connection.rollback();
      return res.status(409).json({ success: false, code: 'SOLD_OUT', message: '남은 쿠폰이 부족합니다. 화면을 새로고침해 주세요.' });
    }

    // 5. 전환 + 수령 기록 (첫 1장은 본인 몫 self, 구매자의 추가분은 대리 proxy)
    let mineSoFar = viewer.claimedCount;
    let totalAmount = 0;
    let lastCouponId = null;
    for (const paper of papers) {
      const converted = await convertPaperToDigital(connection, paper, paper.random_code_hash, req.user.id);
      if (!converted) {
        await connection.rollback();
        return res.status(409).json({ success: false, code: 'CONFLICT', message: '다른 분이 먼저 받아간 쿠폰입니다. 다시 시도해 주세요.' });
      }
      const claimType = mineSoFar === 0 ? 'self' : 'proxy';
      mineSoFar++;
      await insertShareClaim(connection, {
        bundleId: bundle.id,
        userId: req.user.id,
        phoneHash: viewer.phoneHash,
        paperId: paper.id,
        couponId: converted.digitalCouponId,
        faceValue: converted.faceValue,
        claimType,
        source: 'link',
        req,
      });
      totalAmount += Number(converted.faceValue);
      lastCouponId = converted.digitalCouponId;
    }

    const [[couponRow]] = await connection.execute(`SELECT expires_at FROM coupons WHERE id = ?`, [lastCouponId]);

    await connection.commit();

    res.json({
      success: true,
      message: `${totalAmount.toLocaleString()}원 쿠폰 ${quantity}장이 내 쿠폰함에 등록되었습니다.`,
      data: {
        claimedCount: quantity,
        totalAmount,
        remainingCount: stats.remaining - quantity,
        location: bundle.issued_by_location || '옹진 관광지',
        couponExpiresAt: couponRow ? couponRow.expires_at : null,
      },
    });
  } catch (err) {
    await connection.rollback().catch(() => { });
    next(err);
  } finally {
    connection.release();
  }
});

module.exports = router;
