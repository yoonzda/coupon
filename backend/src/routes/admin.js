const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { authenticate, authorize } = require('../middleware/auth');
const pool = require('../config/database');
const settlementService = require('../services/settlementService');
const { hashPhone } = require('../utils/crypto');
const { recordAuditLog, getClientIp } = require('../middleware/auditLogger');
const smsService = require('../services/smsService');

// ── 대시보드 통계 ─────────────────────────────────
router.get('/dashboard', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [[couponStats]] = await pool.execute(
      `SELECT
         COUNT(*) AS total_issued,
         SUM(face_value) AS total_face_value,
         SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS total_used,
         SUM(CASE WHEN status = 'used' THEN face_value ELSE 0 END) AS total_used_value
       FROM coupons`
    );
    const [[merchantStats]] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM merchants`
    );
    const [dailyTrend] = await pool.execute(
      `SELECT DATE(scanned_at) AS date, COUNT(*) AS count, SUM(amount) AS total
       FROM coupon_transactions
       WHERE scanned_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(scanned_at)
       ORDER BY date ASC`
    );
    const [fdsAlerts] = await pool.execute(
      `SELECT * FROM fds_alerts WHERE resolved = 0 ORDER BY detected_at DESC LIMIT 10`
    );

    const recovery_rate = couponStats.total_issued > 0
      ? ((couponStats.total_used / couponStats.total_issued) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: { couponStats: { ...couponStats, recovery_rate }, merchantStats, dailyTrend, fdsAlerts },
    });
  } catch (err) { next(err); }
});

// ── 대시보드 요약 통계 (index.html용) ───────────────
router.get('/stats/summary', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [[txStats]] = await pool.execute(
      `SELECT COALESCE(SUM(amount), 0) AS totalAmount, COUNT(*) AS txCount
       FROM coupon_transactions
       WHERE DATE_FORMAT(scanned_at, '%Y-%m') = ?`, [ym]
    );
    const [[{ userCount }]] = await pool.execute(
      `SELECT COUNT(*) AS userCount FROM users`
    );
    const [[{ merchantCount }]] = await pool.execute(
      `SELECT COUNT(*) AS merchantCount FROM merchants WHERE status = 'approved'`
    );
    const [[{ fdsCount }]] = await pool.execute(
      `SELECT COUNT(*) AS fdsCount FROM fds_alerts WHERE resolved = 0`
    );
    const [[{ couponIssued }]] = await pool.execute(
      `SELECT COUNT(*) AS couponIssued FROM coupons`
    );
    const [[{ couponUsed }]] = await pool.execute(
      `SELECT COUNT(*) AS couponUsed FROM coupons WHERE status = 'used'`
    );
    let todayVisitors = 0;
    let yesterdayVisitors = 0;
    let todayDau = 0;
    let realtimeVisitors = 0;

    try {
      const [[visRow]] = await pool.execute(
        `SELECT COUNT(DISTINCT visitor_id) AS cnt FROM visitor_logs WHERE created_at >= CURDATE()`
      );
      todayVisitors = Number(visRow?.cnt || 0);

      const [[yestRow]] = await pool.execute(
        `SELECT COUNT(DISTINCT visitor_id) AS cnt FROM visitor_logs WHERE created_at >= CURDATE() - INTERVAL 1 DAY AND created_at < CURDATE()`
      );
      yesterdayVisitors = Number(yestRow?.cnt || 0);

      const [[dauRow]] = await pool.execute(
        `SELECT COUNT(DISTINCT user_id) AS cnt FROM (
           SELECT user_id FROM user_login_logs WHERE login_at >= CURDATE()
           UNION
           SELECT user_id FROM visitor_logs WHERE created_at >= CURDATE() AND user_id IS NOT NULL
         ) t`
      );
      todayDau = Number(dauRow?.cnt || 0);

      const [[rtRow]] = await pool.execute(
        `SELECT COUNT(DISTINCT visitor_id) AS cnt FROM visitor_logs WHERE created_at >= NOW() - INTERVAL 10 MINUTE`
      );
      realtimeVisitors = Number(rtRow?.cnt || 0);
    } catch (e) {
      // visitor_logs 테이블이 없거나 초기 상태인 경우 fallback
    }

    res.json({
      success: true,
      totalAmount: Number(txStats.totalAmount),
      txCount: txStats.txCount,
      userCount,
      merchantCount,
      fdsCount,
      couponIssued,
      couponUsed,
      todayVisitors,
      yesterdayVisitors,
      todayDau,
      realtimeVisitors,
    });
  } catch (err) { next(err); }
});

// ── 최근 FDS 알림 (대시보드 테이블용) ───────────────
router.get('/fds/recent', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.id, f.rule_id, f.description, f.detected_at, f.resolved,
              m.name AS merchant_name, u.nickname
       FROM fds_alerts f
       LEFT JOIN merchants m ON f.merchant_id = m.id
       LEFT JOIN users u ON f.user_id = u.id
       ORDER BY f.detected_at DESC LIMIT 10`
    );
    // 배열을 직접 반환 (프론트에서 배열로 처리)
    res.json(rows);
  } catch (err) { next(err); }
});


// ── 가맹점 승인/반려/삭제(제재) ───────────────────────────────
router.patch('/merchants/:id/status', authenticate, authorize('admin'), async (req, res, next) => {
  const { status, reason } = req.body; // 'approved' | 'rejected' | 'suspended', 'reason' (반려/제재 사유)
  if (!['approved', 'rejected', 'suspended'].includes(status)) {
    return res.status(400).json({ success: false, message: '유효하지 않은 상태값입니다.' });
  }
  if ((status === 'rejected' || status === 'suspended') && (!reason || !String(reason).trim())) {
    return res.status(400).json({ success: false, message: status === 'suspended' ? '삭제(제재) 사유를 입력해주세요.' : '반려 사유를 입력해주세요.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. 가맹점 정보 조회 (알림용)
    const [[merchant]] = await connection.execute(
      `SELECT phone, name, status AS prev_status FROM merchants WHERE id = ? FOR UPDATE`,
      [req.params.id]
    );

    if (!merchant) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '가맹점을 찾을 수 없습니다.' });
    }

    const cleanReason = (status === 'rejected' || status === 'suspended') ? String(reason).trim() : null;

    // 2. 상태 업데이트
    await connection.execute(
      `UPDATE merchants SET 
        status = ?, 
        rejection_reason = ?,
        approved_at = ${status === 'approved' ? 'NOW()' : 'NULL'}, 
        approved_by = ?
       WHERE id = ?`,
      [status, cleanReason, req.user.id, req.params.id]
    );

    await connection.commit();

    // 감사 로그 기록
    const statusLabel = status === 'approved' ? '승인(복구)' : status === 'suspended' ? '삭제(제재/숨김)' : '반려';
    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminName: req.user.name,
      adminRole: req.user.role,
      actionType: status === 'suspended' ? 'DELETE' : 'UPDATE',
      pageUrl: '/admin/merchants.html',
      pageTitle: '가맹점 관리',
      targetResource: 'merchants',
      targetId: String(req.params.id),
      actionDetail: `가맹점 '${merchant.name}' 상태 변경 (${statusLabel})${cleanReason ? ' - 사유: ' + cleanReason : ''}`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('[AuditLog Error]', err));

    // 3. 알림 전송 (신규 승인/반려 시에만 발송, 제재/숨김이나 제재 복구 시에는 자동 발송 제외)
    if ((status === 'approved' && merchant.prev_status === 'pending') || status === 'rejected') {
      const notificationService = require('../services/notificationService');
      notificationService.sendMerchantStatusNotification(
        merchant.phone, 
        merchant.name, 
        status, 
        cleanReason
      ).catch(err => console.error('[Notification Async Error]', err));
    }

    res.json({
      success: true,
      message: status === 'suspended'
        ? `'${merchant.name}' 가맹점이 삭제(제재) 처리되어 일반 목록 및 사용자 화면에서 제외되었습니다.`
        : `가맹점 ${statusLabel} 처리가 완료되었습니다.`
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// 도서 권역별 대표 위경도 매핑 (도서 방문/직접 등록 시 위치 보정)
const ISLAND_COORDS = {
  '백령면': { lat: 37.972, lng: 124.683 },
  '대청면': { lat: 37.828, lng: 124.710 },
  '연평면': { lat: 37.665, lng: 125.698 },
  '덕적면': { lat: 37.228, lng: 126.157 },
  '자월면': { lat: 37.259, lng: 126.301 },
  '영흥면': { lat: 37.255, lng: 126.501 },
  '북도면': { lat: 37.525, lng: 126.435 }
};

// ── 담당 공무원 가맹점 직접 등록 및 즉시 승인 ─────────────────
router.post('/merchants/direct', authenticate, authorize('admin'), async (req, res, next) => {
  const {
    name,
    ownerName,
    phone,
    storePhone,
    businessNo,
    category,
    island,
    address,
    businessHours,
    bankName,
    accountNo,
    immediateApprove = true,
    businessCertImage,
    bankbookImage,
    images
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: '상점명을 입력해주세요.' });
  }
  if (!ownerName || !ownerName.trim()) {
    return res.status(400).json({ success: false, message: '대표자 성명을 입력해주세요.' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ success: false, message: '대표자 휴대전화번호를 입력해주세요.' });
  }
  if (!address || !address.trim()) {
    return res.status(400).json({ success: false, message: '사업장 소재지 주소를 입력해주세요.' });
  }

  const cleanPhone = phone.replace(/[^0-9-]/g, '').trim();
  const phoneDigits = cleanPhone.replace(/\D/g, '');
  if (phoneDigits.length < 9) {
    return res.status(400).json({ success: false, message: '올바른 전화번호 형식을 입력해주세요.' });
  }

  try {
    const phoneHash = hashPhone(phoneDigits);

    // 중복 등록 여부 확인
    const [existing] = await pool.execute(
      'SELECT id, name, status FROM merchants WHERE phone_hash = ? LIMIT 1',
      [phoneHash]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `해당 연락처로 이미 등록된 가맹점이 있습니다. (상호명: ${existing[0].name}, 상태: ${existing[0].status === 'approved' ? '승인완료' : '심사중'})`
      });
    }

    // 도서 권역 대표 좌표 자동 설정
    let lat = 37.228, lng = 126.157; // 기본값 덕적도
    const searchTarget = `${island || ''} ${address}`;
    for (const [isl, coords] of Object.entries(ISLAND_COORDS)) {
      if (searchTarget.includes(isl) || searchTarget.includes(isl.replace('면', ''))) {
        lat = coords.lat;
        lng = coords.lng;
        break;
      }
    }

    const isApproved = immediateApprove === true || immediateApprove === 'true';
    const status = isApproved ? 'approved' : 'pending';
    const approvedAt = isApproved ? new Date() : null;
    const approvedBy = isApproved ? req.user.id : null;

    let imagesJson = null;
    if (Array.isArray(images)) {
      imagesJson = JSON.stringify(images);
    } else if (typeof images === 'string' && images.trim()) {
      imagesJson = images.trim();
    }

    const [result] = await pool.execute(
      `INSERT INTO merchants (
        name, owner_name, phone, phone_hash, store_phone,
        business_no, category, address, lat, lng,
        business_hours, bank_name, account_no,
        business_cert_image, bankbook_image, images,
        status, approved_at, approved_by, registered_by, applied_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', NOW())`,
      [
        name.trim(),
        ownerName.trim(),
        cleanPhone,
        phoneHash,
        storePhone?.trim() || null,
        businessNo?.trim() || null,
        category?.trim() || '음식점',
        address.trim(),
        lat,
        lng,
        businessHours?.trim() || null,
        bankName?.trim() || null,
        accountNo?.trim() || null,
        businessCertImage || null,
        bankbookImage || null,
        imagesJson,
        status,
        approvedAt,
        approvedBy
      ]
    );

    const insertId = result.insertId;

    // 감사 로그 기록
    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminName: req.user.name,
      adminRole: req.user.role,
      actionType: 'CREATE',
      pageUrl: '/admin/merchants.html',
      pageTitle: '가맹점 관리',
      targetResource: 'merchants',
      targetId: String(insertId),
      actionDetail: `담당 공무원 가맹점 직접 등록 (상호명: ${name.trim()}, 대표자: ${ownerName.trim()}, 상태: ${status === 'approved' ? '즉시 승인 완료' : '승인 대기'})`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('[AuditLog Error]', err));

    // 가맹점 알림 전송 (승인 또는 접수 대기)
    const notificationService = require('../services/notificationService');
    if (isApproved) {
      notificationService.sendMerchantStatusNotification(
        cleanPhone,
        name.trim(),
        'approved'
      ).catch(err => console.error('[Notification Async Error] 가맹점 승인 알림 실패:', err));
    } else {
      notificationService.sendMerchantApplicationReceivedNotification(
        cleanPhone,
        name.trim()
      ).catch(err => console.error('[Notification Async Error] 가맹점 접수 알림 실패:', err));
    }

    res.json({
      success: true,
      message: isApproved
        ? `'${name.trim()}' 가맹점이 직접 등록 및 즉시 승인 처리되었습니다.`
        : `'${name.trim()}' 가맹점이 승인 대기 상태로 등록되었습니다.`,
      data: {
        id: insertId,
        name: name.trim(),
        status,
        phone: cleanPhone
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── 가맹점 목록 (고속 경량화: 대용량 이미지 바이너리 제외) ───────────────────────
router.get('/merchants', authenticate, authorize('admin'), async (req, res, next) => {
  const { status = 'all', page = 1, limit = 1000 } = req.query;
  const numLimit = Math.max(1, Math.min(1000, parseInt(limit, 10) || 1000));
  const numOffset = Math.max(0, (Math.max(1, parseInt(page, 10) || 1) - 1) * numLimit);
  try {
    const whereClause = (status && status !== 'all') ? 'WHERE status = ?' : '';
    const queryParams = (status && status !== 'all') ? [status, numLimit, numOffset] : [numLimit, numOffset];

    const [rows] = await pool.query(
      `SELECT 
         id, name, phone, username, business_no, address, category, description,
         lat, lng, status, rejection_reason, applied_at, approved_at, approved_by, registered_by,
         owner_name, store_phone, business_hours, bank_name, account_no, staff_pin_enabled,
         CASE WHEN business_cert_image IS NOT NULL AND business_cert_image != '' THEN 1 ELSE 0 END AS has_business_cert,
         CASE WHEN bankbook_image IS NOT NULL AND bankbook_image != '' THEN 1 ELSE 0 END AS has_bankbook,
         CASE WHEN images IS NOT NULL AND images != '' AND images != '[]' THEN 1 ELSE 0 END AS has_images
       FROM merchants
       ${whereClause}
       ORDER BY applied_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    // 가맹점 상태별 통계 카운트 일괄 집계 (삭제/제재된 가맹점은 전체 카운트에서 제외하고 반려/중지 탭에 합산)
    const [[counts]] = await pool.query(
      `SELECT 
         SUM(CASE WHEN status != 'suspended' THEN 1 ELSE 0 END) AS total,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN status IN ('rejected', 'suspended') THEN 1 ELSE 0 END) AS rejected
       FROM merchants`
    );

    res.json({
      success: true,
      data: rows,
      summary: {
        all: Number(counts?.total || 0),
        pending: Number(counts?.pending || 0),
        approved: Number(counts?.approved || 0),
        rejected: Number(counts?.rejected || 0)
      }
    });
  } catch (err) { next(err); }
});

// ── 가맹점 단건 상세 조회 ──────────────────────────────
router.get('/merchants/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [[merchant]] = await pool.execute(
      `SELECT * FROM merchants WHERE id = ?`,
      [req.params.id]
    );
    if (!merchant) {
      return res.status(404).json({ success: false, message: '가맹점을 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: merchant });
  } catch (err) { next(err); }
});

// ── 가맹점 입점 증빙서류 및 가게 이미지 수정/업로드 ─────────────────
router.put('/merchants/:id/documents', authenticate, authorize('admin'), async (req, res, next) => {
  const { id } = req.params;
  const { businessCertImage, bankbookImage, images } = req.body;

  try {
    const [[merchant]] = await pool.execute(
      'SELECT id, name, business_cert_image, bankbook_image, images FROM merchants WHERE id = ? LIMIT 1',
      [id]
    );

    if (!merchant) {
      return res.status(404).json({ success: false, message: '가맹점을 찾을 수 없습니다.' });
    }

    const updates = [];
    const params = [];

    if (businessCertImage !== undefined) {
      updates.push('business_cert_image = ?');
      params.push(businessCertImage || null);
    }
    if (bankbookImage !== undefined) {
      updates.push('bankbook_image = ?');
      params.push(bankbookImage || null);
    }
    if (images !== undefined) {
      let imagesJson = null;
      if (Array.isArray(images)) {
        imagesJson = JSON.stringify(images);
      } else if (typeof images === 'string' && images.trim()) {
        imagesJson = images.trim();
      }
      updates.push('images = ?');
      params.push(imagesJson);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '변경할 서류 또는 이미지 데이터가 없습니다.' });
    }

    params.push(id);
    await pool.execute(
      `UPDATE merchants SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // 감사 로그 기록
    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminName: req.user.name,
      adminRole: req.user.role,
      actionType: 'UPDATE',
      pageUrl: `/admin/detail-merchant.html?id=${id}`,
      pageTitle: '가맹점 상세 정보',
      targetResource: 'merchants',
      targetId: String(id),
      actionDetail: `'${merchant.name}' 가맹점 증빙서류/가게 이미지 관리자 업데이트`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('[AuditLog Error]', err));

    res.json({
      success: true,
      message: '증빙서류 및 가게 이미지가 성공적으로 저장되었습니다.'
    });
  } catch (err) {
    next(err);
  }
});

// ── 가맹점 기본 정보 및 정산/계정 정보 수정 ─────────────────────────
router.put('/merchants/:id', authenticate, authorize('admin'), async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    ownerName,
    phone,
    storePhone,
    businessNo,
    category,
    address,
    island,
    businessHours,
    bankName,
    accountNo,
    description,
    username,
    password
  } = req.body;

  try {
    const [[merchant]] = await pool.execute(
      'SELECT * FROM merchants WHERE id = ? LIMIT 1',
      [id]
    );

    if (!merchant) {
      return res.status(404).json({ success: false, message: '가맹점을 찾을 수 없습니다.' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name ? name.trim() : '');
    }
    if (ownerName !== undefined) {
      updates.push('owner_name = ?');
      params.push(ownerName ? ownerName.trim() : null);
    }
    if (phone !== undefined && phone.trim()) {
      const cleanPhone = phone.replace(/[^0-9-]/g, '').trim();
      const phoneDigits = cleanPhone.replace(/\D/g, '');
      const phoneHash = hashPhone(phoneDigits);

      // 본인 외 다른 가맹점과 연락처 중복 여부 확인
      const [dup] = await pool.execute(
        'SELECT id, name FROM merchants WHERE phone_hash = ? AND id != ? LIMIT 1',
        [phoneHash, id]
      );
      if (dup.length > 0) {
        return res.status(409).json({
          success: false,
          message: `해당 연락처로 이미 등록된 다른 가맹점이 있습니다. (상호명: ${dup[0].name})`
        });
      }

      updates.push('phone = ?', 'phone_hash = ?');
      params.push(cleanPhone, phoneHash);
    }
    if (storePhone !== undefined) {
      updates.push('store_phone = ?');
      params.push(storePhone ? storePhone.trim() : null);
    }
    if (businessNo !== undefined) {
      updates.push('business_no = ?');
      params.push(businessNo ? businessNo.trim() : null);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category ? category.trim() : '음식점');
    }
    if (address !== undefined && address.trim()) {
      updates.push('address = ?');
      params.push(address.trim());

      // 도서 권역 대표 좌표 자동 갱신
      const searchTarget = `${island || ''} ${address}`;
      for (const [isl, coords] of Object.entries(ISLAND_COORDS)) {
        if (searchTarget.includes(isl) || searchTarget.includes(isl.replace('면', ''))) {
          updates.push('lat = ?', 'lng = ?');
          params.push(coords.lat, coords.lng);
          break;
        }
      }
    }
    if (businessHours !== undefined) {
      updates.push('business_hours = ?');
      params.push(businessHours ? businessHours.trim() : null);
    }
    if (bankName !== undefined) {
      updates.push('bank_name = ?');
      params.push(bankName ? bankName.trim() : null);
    }
    if (accountNo !== undefined) {
      updates.push('account_no = ?');
      params.push(accountNo ? accountNo.trim() : null);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description ? description.trim() : null);
    }
    if (username !== undefined && username.trim()) {
      const cleanUser = username.trim();
      const [dupUser] = await pool.execute(
        'SELECT id, name FROM merchants WHERE username = ? AND id != ? LIMIT 1',
        [cleanUser, id]
      );
      if (dupUser.length > 0) {
        return res.status(409).json({
          success: false,
          message: `해당 아이디('${cleanUser}')는 이미 다른 가맹점에서 사용 중입니다.`
        });
      }
      updates.push('username = ?');
      params.push(cleanUser);
    }
    if (password && password.trim()) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash(password.trim(), 10);
      updates.push('password_hash = ?');
      params.push(hash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '수정할 정보가 없습니다.' });
    }

    params.push(id);
    await pool.execute(
      `UPDATE merchants SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // 감사 로그 기록
    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminName: req.user.name,
      adminRole: req.user.role,
      actionType: 'UPDATE',
      pageUrl: `/admin/detail-merchant.html?id=${id}`,
      pageTitle: '가맹점 상세 정보',
      targetResource: 'merchants',
      targetId: String(id),
      actionDetail: `'${merchant.name}' 가맹점 기본/정산 정보 관리자 수정`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('[AuditLog Error]', err));

    res.json({
      success: true,
      message: '가맹점 정보가 성공적으로 수정되었습니다.'
    });
  } catch (err) {
    next(err);
  }
});

// ── 가맹점 개별 문자(SMS/LMS) 직접 발송 ────────────────────────────
router.post('/merchants/:id/sms', authenticate, authorize('admin'), async (req, res, next) => {
  const { id } = req.params;
  const { message, title } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ success: false, message: '발송할 문자 내용을 입력해주세요.' });
  }

  try {
    const [[merchant]] = await pool.execute(
      `SELECT id, name, owner_name, phone, username FROM merchants WHERE id = ?`,
      [id]
    );

    if (!merchant) {
      return res.status(404).json({ success: false, message: '가맹점 정보를 찾을 수 없습니다.' });
    }

    if (!merchant.phone || !String(merchant.phone).trim()) {
      return res.status(400).json({ success: false, message: '해당 가맹점에 등록된 연락처가 없습니다.' });
    }

    const cleanReceiver = String(merchant.phone).replace(/\D/g, '');
    if (cleanReceiver.length < 10 || cleanReceiver.length > 11) {
      return res.status(400).json({ success: false, message: `등록된 전화번호(${merchant.phone})가 유효한 휴대폰 번호 형식이 아닙니다.` });
    }

    const smsTitle = title && String(title).trim() ? title.trim() : `[옹진관광] ${merchant.name} 가맹점 안내`;
    const result = await smsService.sendSMS(cleanReceiver, message.trim(), smsTitle);

    // 발송 이력 기록 (notification_queue)
    try {
      await pool.execute(
        `INSERT INTO notification_queue (type, recipient, message, template_id, status, created_at, sent_at)
         VALUES ('SMS', ?, ?, 'DIRECT_MERCHANT', 'sent', NOW(), NOW())`,
        [cleanReceiver, message.trim()]
      );
    } catch (e) {
      console.warn('[notification_queue insert failed]', e.message);
    }

    // 관리자 감사 로그 기록
    await recordAuditLog(
      req.user.id,
      'MERCHANT_SMS_SEND',
      `가맹점 '${merchant.name}'(${smsService.maskPhone(cleanReceiver)}) 문자 발송: ${smsTitle}`,
      getClientIp(req)
    );

    res.json({
      success: true,
      message: result.mock
        ? '개발 모의 발송되었습니다. (알리고 환경변수 연동 시 실제 전송됩니다)'
        : `'${merchant.name}' (${merchant.phone}) 번호로 문자가 성공적으로 발송되었습니다.`,
      data: result,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        phone: merchant.phone,
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || '문자 발송 중 오류가 발생했습니다.'
    });
  }
});

// ── 정산 목록 조회 (실시간 쿠폰 결제 트랜잭션 + 정산 테이블 통합) ─────
router.get('/settlements', authenticate, authorize('admin'), async (req, res, next) => {
  const { period } = req.query; // 'YYYY-MM'
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return res.status(400).json({ success: false, message: 'period 파라미터가 필요합니다. (예: 2026-09)' });
  }
  try {
    // 1. 해당 월 coupon_transactions 결제 내역 가맹점별 실시간 집계 (취소된 거래 제외)
    const [txRows] = await pool.execute(
      `SELECT 
         ct.merchant_id,
         m.name AS merchant_name,
         m.business_no,
         m.owner_name,
         m.bank_name,
         m.account_no,
         COUNT(ct.id) AS tx_count,
         COALESCE(SUM(ct.amount), 0) AS total_amount,
         MAX(ct.scanned_at) AS last_scanned_at
       FROM coupon_transactions ct
       JOIN merchants m ON ct.merchant_id = m.id
       WHERE DATE_FORMAT(ct.scanned_at, '%Y-%m') = ?
         AND COALESCE(ct.is_cancelled, 0) = 0
       GROUP BY ct.merchant_id, m.name, m.business_no, m.owner_name, m.bank_name, m.account_no
       HAVING total_amount > 0`,
      [period]
    );

    // 2. 해당 월 settlements 테이블에 이미 등록/생성된 정산 데이터 조회
    const [settlementRows] = await pool.execute(
      `SELECT s.*, m.name AS merchant_name, m.business_no, m.owner_name, m.bank_name, m.account_no
       FROM settlements s
       JOIN merchants m ON s.merchant_id = m.id
       WHERE s.period = ?`,
      [period]
    );

    const settlementMap = new Map();
    for (const s of settlementRows) {
      settlementMap.set(Number(s.merchant_id), s);
    }

    // 3. 실시간 결제 데이터와 정산 데이터 병합
    const mergedList = [];
    const processedMerchantIds = new Set();

    for (const tx of txRows) {
      const mId = Number(tx.merchant_id);
      processedMerchantIds.add(mId);

      const existingSettlement = settlementMap.get(mId);
      if (existingSettlement) {
        mergedList.push({
          id: existingSettlement.id,
          merchant_id: mId,
          merchant_name: tx.merchant_name,
          business_no: tx.business_no,
          owner_name: tx.owner_name || existingSettlement.owner_name,
          bank_name: tx.bank_name || existingSettlement.bank_name,
          account_no: tx.account_no || existingSettlement.account_no,
          period,
          total_amount: Number(existingSettlement.status === 'transferred' ? existingSettlement.total_amount : tx.total_amount),
          tx_count: Number(tx.tx_count),
          status: existingSettlement.status,
          file_path: existingSettlement.file_path,
          generated_at: existingSettlement.generated_at,
          last_scanned_at: tx.last_scanned_at
        });
      } else {
        // 아직 정산 파일이 생성되지 않은 실시간 결제 건 -> 'pending' (정산 대기) 상태로 노출
        mergedList.push({
          id: null,
          merchant_id: mId,
          merchant_name: tx.merchant_name,
          business_no: tx.business_no,
          owner_name: tx.owner_name,
          bank_name: tx.bank_name,
          account_no: tx.account_no,
          period,
          total_amount: Number(tx.total_amount),
          tx_count: Number(tx.tx_count),
          status: 'pending',
          file_path: null,
          generated_at: null,
          last_scanned_at: tx.last_scanned_at
        });
      }
    }

    // coupon_transactions에는 없지만 과거에 수동/배치로 settlements에만 남아있는 건 추가
    for (const s of settlementRows) {
      const mId = Number(s.merchant_id);
      if (!processedMerchantIds.has(mId)) {
        mergedList.push({
          id: s.id,
          merchant_id: mId,
          merchant_name: s.merchant_name,
          business_no: s.business_no,
          owner_name: s.owner_name,
          bank_name: s.bank_name,
          account_no: s.account_no,
          period,
          total_amount: Number(s.total_amount),
          tx_count: 0,
          status: s.status,
          file_path: s.file_path,
          generated_at: s.generated_at,
          last_scanned_at: null
        });
      }
    }

    // 금액 큰 순서대로 정렬
    mergedList.sort((a, b) => b.total_amount - a.total_amount);

    res.json({ success: true, data: mergedList });
  } catch (err) { next(err); }
});

// ── 정산 파일 일괄 생성 (실제 XML 파일 저장 연동) ───────
router.post('/settlements/generate', authenticate, authorize('admin'), async (req, res, next) => {
  // 클라이언트 전달 period 우선 수신, 미전달 시 전월 기본값
  let { period } = req.body || {};
  if (period) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      return res.status(400).json({ success: false, message: '올바른 정산 기간 형식(YYYY-MM)이 아닙니다.' });
    }
  } else {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    period = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 해당 기간 쿠폰 사용 내역 집계 (승인된 가맹점 대상)
    const [merchants] = await connection.execute(
      `SELECT ct.merchant_id, m.name AS merchant_name,
              SUM(ct.amount) AS total_amount, COUNT(*) AS tx_count
       FROM coupon_transactions ct
       JOIN merchants m ON ct.merchant_id = m.id
       WHERE DATE_FORMAT(ct.scanned_at, '%Y-%m') = ?
         AND COALESCE(ct.is_cancelled, 0) = 0
         AND m.status = 'approved'
       GROUP BY ct.merchant_id, m.name
       HAVING total_amount > 0`,
      [period]
    );

    if (merchants.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: `${period} 정산 대상 내역이 없습니다.` });
    }

    const createdIds = [];
    for (const m of merchants) {
      // 이미 지급완료('transferred')된 건은 덮어쓰지 않도록 방어
      const [insertRes] = await connection.execute(
        `INSERT INTO settlements (merchant_id, period, total_amount, status, generated_at)
         VALUES (?, ?, ?, 'pending', NOW())
         ON DUPLICATE KEY UPDATE 
           total_amount = IF(status = 'transferred', total_amount, VALUES(total_amount)),
           generated_at = IF(status = 'transferred', generated_at, NOW())`,
        [m.merchant_id, period, m.total_amount]
      );
      const settlementId = insertRes.insertId || (
        await connection.execute(`SELECT id FROM settlements WHERE merchant_id = ? AND period = ?`, [m.merchant_id, period])
      )[0][0]?.id;

      if (settlementId) createdIds.push(settlementId);
    }

    await connection.commit();
    connection.release();
    const isConnectionReleased = true;

    // 각 정산 건별 격리 스토리지에 XML 파일 생성
    for (const sId of createdIds) {
      try {
        await settlementService.generateSettlementFile(sId);
      } catch (fileErr) {
        console.warn(`[Settlement File Gen Warning] ID ${sId}:`, fileErr.message);
      }
    }

    // 감사 로그 기록
    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminName: req.user.name,
      adminRole: req.user.role,
      actionType: 'CREATE',
      pageUrl: '/admin/settlement.html',
      pageTitle: '정산 관리',
      targetResource: 'settlements',
      actionDetail: `${period} 가맹점 정산 파일 일괄 생성 (${merchants.length}개 가맹점, 정산건수: ${createdIds.length}건)`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('[AuditLog Error]', err));

    res.json({ success: true, message: `${period} 정산 및 파일 ${createdIds.length}건 생성 완료` });
  } catch (err) {
    try { await connection.rollback(); } catch (_) {}
    next(err);
  } finally {
    try { connection.release(); } catch (_) {}
  }
});

// ── 정산 파일 안전 다운로드 API (보호 스토리지 스트림 및 감사 로깅) ───────────
router.get('/settlements/download/:filename', authenticate, authorize('admin'), async (req, res, next) => {
  const { filename } = req.params;

  // 1. 엄격한 화이트리스트 정규표현식 검증 (settlement_{id}_{YYYY-MM}.xml 또는 settlement_batch_{YYYY-MM}.xml) 및 Path Traversal 방어
  const FILE_PATTERN = /^settlement(_batch)?_(\d+_)?\d{4}-\d{2}\.xml$/;
  if (!filename || !FILE_PATTERN.test(filename) || path.basename(filename) !== filename) {
    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminName: req.user.name,
      adminRole: req.user.role,
      actionType: 'EXPORT',
      pageUrl: req.originalUrl,
      pageTitle: '정산 관리',
      targetResource: 'settlements',
      actionDetail: `[SECURITY_ALERT] Path Traversal 비정상 파라미터 차단: ${filename}`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('[AuditLog Error]', err));

    return res.status(400).json({ success: false, message: '유효하지 않은 파일 경로 형식입니다.' });
  }

  const baseDir = path.resolve(__dirname, '../../storage/settlements');
  const safePath = path.resolve(baseDir, filename);

  if (!safePath.startsWith(baseDir)) {
    return res.status(403).json({ success: false, message: '접근 권한이 없는 디렉터리입니다.' });
  }

  try {
    await fs.access(safePath);

    // 2. 파일 다운로드 감사 로그 기록 (금융 데이터 유출 추적성 확보)
    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminName: req.user.name,
      adminRole: req.user.role,
      actionType: 'EXPORT',
      pageUrl: req.originalUrl,
      pageTitle: '정산 관리',
      targetResource: 'settlements',
      targetId: filename,
      actionDetail: `정산 XML 파일 다운로드 성공: ${filename}`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('[AuditLog Error]', err));

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.download(safePath, filename);
  } catch (err) {
    return res.status(404).json({ success: false, message: '정산 파일을 찾을 수 없습니다.' });
  }
});

// ── 정산 상태 개별 변경 API (지급완료 처리 등) ───────────────
router.patch('/settlements/:id/status', authenticate, authorize('admin'), async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body; // 'transferred', 'file_generated', 'pending'
  const ALLOWED_STATUS = ['pending', 'file_generated', 'transferred'];
  if (!status || !ALLOWED_STATUS.includes(status)) {
    return res.status(400).json({ success: false, message: '유효한 상태값이 아닙니다.' });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE settlements SET status = ? WHERE id = ?`,
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '정산 데이터를 찾을 수 없습니다.' });
    }

    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminName: req.user.name,
      adminRole: req.user.role,
      actionType: 'UPDATE',
      pageUrl: '/admin/settlement.html',
      pageTitle: '정산 관리',
      targetResource: 'settlements',
      targetId: String(id),
      actionDetail: `정산 ID ${id} 상태를 '${status}'(으)로 변경`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('[AuditLog Error]', err));

    res.json({ success: true, message: '정산 상태가 변경되었습니다.' });
  } catch (err) { next(err); }
});

// ── 해당 기간 정산 내역 일괄 지급완료 처리 API ─────────────
router.post('/settlements/mark-transferred', authenticate, authorize('admin'), async (req, res, next) => {
  const { period } = req.body;
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return res.status(400).json({ success: false, message: 'period 파라미터가 올바르지 않습니다.' });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE settlements SET status = 'transferred' WHERE period = ? AND status != 'transferred'`,
      [period]
    );

    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminName: req.user.name,
      adminRole: req.user.role,
      actionType: 'UPDATE',
      pageUrl: '/admin/settlement.html',
      pageTitle: '정산 관리',
      targetResource: 'settlements',
      actionDetail: `${period} 정산 대상 ${result.affectedRows}건 일괄 지급완료 처리`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('[AuditLog Error]', err));

    res.json({ 
      success: true, 
      message: `${period} 기간 정산 ${result.affectedRows}건이 지급완료 처리되었습니다.` 
    });
  } catch (err) { next(err); }
});

// ── 전체 가맹점 정산 내역 CSV 일괄 다운로드 (UTF-8 BOM 포함) ───
router.get('/settlements/export-csv', authenticate, authorize('admin'), async (req, res, next) => {
  const { period } = req.query;
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return res.status(400).json({ success: false, message: 'period 파라미터가 필요합니다.' });
  }

  try {
    // 실시간 결제 데이터와 정산 데이터 조회
    const [txRows] = await pool.execute(
      `SELECT 
         ct.merchant_id,
         m.name AS merchant_name,
         m.business_no,
         m.owner_name,
         m.bank_name,
         m.account_no,
         COUNT(ct.id) AS tx_count,
         COALESCE(SUM(ct.amount), 0) AS total_amount
       FROM coupon_transactions ct
       JOIN merchants m ON ct.merchant_id = m.id
       WHERE DATE_FORMAT(ct.scanned_at, '%Y-%m') = ?
         AND COALESCE(ct.is_cancelled, 0) = 0
       GROUP BY ct.merchant_id, m.name, m.business_no, m.owner_name, m.bank_name, m.account_no
       HAVING total_amount > 0`,
      [period]
    );

    const [settlementRows] = await pool.execute(
      `SELECT s.*, m.name AS merchant_name, m.business_no, m.owner_name, m.bank_name, m.account_no
       FROM settlements s
       JOIN merchants m ON s.merchant_id = m.id
       WHERE s.period = ?`,
      [period]
    );

    const settlementMap = new Map();
    for (const s of settlementRows) {
      settlementMap.set(Number(s.merchant_id), s);
    }

    const mergedList = [];
    const processedMerchantIds = new Set();

    for (const tx of txRows) {
      const mId = Number(tx.merchant_id);
      processedMerchantIds.add(mId);
      const existing = settlementMap.get(mId);

      mergedList.push({
        merchant_name: tx.merchant_name,
        business_no: tx.business_no || '',
        owner_name: tx.owner_name || existing?.owner_name || '',
        bank_name: tx.bank_name || existing?.bank_name || '',
        account_no: tx.account_no || existing?.account_no || '',
        period,
        tx_count: Number(tx.tx_count),
        total_amount: Number(existing && existing.status === 'transferred' ? existing.total_amount : tx.total_amount),
        status: existing ? (existing.status === 'transferred' ? '지급완료' : (existing.status === 'file_generated' ? '파일생성됨' : '정산대기')) : '정산대기'
      });
    }

    for (const s of settlementRows) {
      const mId = Number(s.merchant_id);
      if (!processedMerchantIds.has(mId)) {
        mergedList.push({
          merchant_name: s.merchant_name,
          business_no: s.business_no || '',
          owner_name: s.owner_name || '',
          bank_name: s.bank_name || '',
          account_no: s.account_no || '',
          period,
          tx_count: 0,
          total_amount: Number(s.total_amount),
          status: s.status === 'transferred' ? '지급완료' : (s.status === 'file_generated' ? '파일생성됨' : '정산대기')
        });
      }
    }

    mergedList.sort((a, b) => b.total_amount - a.total_amount);

    // CSV 생성 (엑셀 한글 깨짐 방지: UTF-8 BOM \uFEFF 필수)
    const headers = ['가맹점명', '사업자등록번호', '대표자명', '입금은행', '계좌번호', '정산기간', '결제건수', '총정산금액(원)', '정산상태'];
    const escapeCsv = (val) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines = [headers.join(',')];
    for (const item of mergedList) {
      csvLines.push([
        escapeCsv(item.merchant_name),
        escapeCsv(item.business_no),
        escapeCsv(item.owner_name),
        escapeCsv(item.bank_name),
        escapeCsv(item.account_no),
        escapeCsv(item.period),
        escapeCsv(item.tx_count),
        escapeCsv(item.total_amount),
        escapeCsv(item.status)
      ].join(','));
    }

    const csvContent = '\uFEFF' + csvLines.join('\r\n');
    const filename = `옹진군_정산내역_${period}.csv`;

    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminName: req.user.name,
      adminRole: req.user.role,
      actionType: 'EXPORT',
      pageUrl: req.originalUrl,
      pageTitle: '정산 관리',
      targetResource: 'settlements',
      actionDetail: `${period} 전체 가맹점 정산 CSV 다운로드 (${mergedList.length}건)`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('[AuditLog Error]', err));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(csvContent);
  } catch (err) { next(err); }
});

// ── FDS 알림 목록 조회 ──────────────────────────────
router.get('/fds', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.*, m.name as merchant_name, u.nickname as user_nickname,
              COALESCE(a.name, a.username) as resolved_by_name
       FROM fds_alerts f
       LEFT JOIN merchants m ON f.merchant_id = m.id
       LEFT JOIN users u ON f.user_id = u.id
       LEFT JOIN admins a ON f.resolved_by = a.id
       ORDER BY f.detected_at DESC LIMIT 50`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── FDS 알림 상세 및 거래 히스토리 조회 ─────────────
router.get('/fds/:id/details', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT f.*, 
              m.name AS merchant_name, m.island AS merchant_island, m.category AS merchant_category, m.address AS merchant_address, m.phone AS merchant_phone,
              u.nickname AS user_nickname, u.role AS user_role,
              COALESCE(a.name, a.username) AS resolved_by_name
       FROM fds_alerts f
       LEFT JOIN merchants m ON f.merchant_id = m.id
       LEFT JOIN users u ON f.user_id = u.id
       LEFT JOIN admins a ON f.resolved_by = a.id
       WHERE f.id = ?`,
      [req.params.id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: '알림을 찾을 수 없습니다.' });
    }
    const alert = rows[0];

    // 관련 결제 히스토리 조회 (탐지 시점 전후 20분 내의 연관 결제만 조회하여 과거 무관 거래 제외)
    let transactions = [];
    if (alert.user_id) {
      const [txRows] = await pool.execute(
        `SELECT ct.id, ct.coupon_id, ct.merchant_id, ct.amount, ct.scanned_at,
                m.name AS merchant_name, m.category AS merchant_category, m.island AS merchant_island, m.address AS merchant_address,
                c.coupon_type, c.face_value
         FROM coupon_transactions ct
         LEFT JOIN merchants m ON ct.merchant_id = m.id
         LEFT JOIN coupons c ON ct.coupon_id = c.id
         WHERE ct.user_id = ?
           AND ct.scanned_at BETWEEN DATE_SUB(?, INTERVAL 20 MINUTE) AND DATE_ADD(?, INTERVAL 5 MINUTE)
         ORDER BY ct.scanned_at ASC`,
        [alert.user_id, alert.detected_at, alert.detected_at]
      );
      if (txRows.length > 0) {
        transactions = txRows;
      } else {
        const [fallbackRows] = await pool.execute(
          `SELECT ct.id, ct.coupon_id, ct.merchant_id, ct.amount, ct.scanned_at,
                  m.name AS merchant_name, m.category AS merchant_category, m.island AS merchant_island, m.address AS merchant_address,
                  c.coupon_type, c.face_value
           FROM coupon_transactions ct
           LEFT JOIN merchants m ON ct.merchant_id = m.id
           LEFT JOIN coupons c ON ct.coupon_id = c.id
           WHERE ct.user_id = ?
           ORDER BY ct.scanned_at DESC LIMIT 2`,
          [alert.user_id]
        );
        transactions = fallbackRows.reverse();
      }
    } else if (alert.merchant_id) {
      const [txRows] = await pool.execute(
        `SELECT ct.id, ct.coupon_id, ct.merchant_id, ct.amount, ct.scanned_at,
                m.name AS merchant_name, m.category AS merchant_category, m.island AS merchant_island, m.address AS merchant_address,
                c.coupon_type, c.face_value
         FROM coupon_transactions ct
         LEFT JOIN merchants m ON ct.merchant_id = m.id
         LEFT JOIN coupons c ON ct.coupon_id = c.id
         WHERE ct.merchant_id = ?
           AND ct.scanned_at BETWEEN DATE_SUB(?, INTERVAL 20 MINUTE) AND DATE_ADD(?, INTERVAL 5 MINUTE)
         ORDER BY ct.scanned_at DESC LIMIT 10`,
        [alert.merchant_id, alert.detected_at, alert.detected_at]
      );
      transactions = txRows;
    }

    res.json({
      success: true,
      data: {
        alert,
        transactions
      }
    });
  } catch (err) { next(err); }
});

// ── FDS 알림 해결 (소명 메모 포함) ─────────────────
router.patch('/fds/:id/resolve', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { note } = req.body || {};
    await pool.execute(
      `UPDATE fds_alerts 
       SET resolved = 1, resolved_at = NOW(), resolved_by = ?, resolution_note = ? 
       WHERE id = ?`,
      [req.user.id, note ? String(note).trim() : null, req.params.id]
    );
    res.json({ success: true, message: '이상거래 의심 건이 확인 완료 처리되었습니다.' });
  } catch (err) { next(err); }
});

// ── 실제 통계 및 지표 집계 API ───────────────────────
router.get('/statistics', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    // 1. 총 발행량 및 총 액면가
    const [[issuedRow]] = await pool.execute(
      `SELECT COUNT(*) as total_count, COALESCE(SUM(face_value), 0) as total_amount FROM coupons`
    );

    // 2. 누적 쿠폰 사용량 및 결제 금액
    const [[usedRow]] = await pool.execute(
      `SELECT COUNT(*) as total_count, COALESCE(SUM(amount), 0) as total_amount FROM coupon_transactions`
    );

    // 3. 누적 정산 완료액
    const [[settledRow]] = await pool.execute(
      `SELECT COALESCE(SUM(total_amount), 0) as settled_amount FROM settlements WHERE status IN ('file_generated', 'completed')`
    );

    // 4. 활성 가맹점 수
    const [[merchantRow]] = await pool.execute(
      `SELECT COUNT(*) as active_count FROM merchants WHERE status = 'approved'`
    );

    // 5. Top 5 가맹점 매출 순
    const [topMerchants] = await pool.execute(
      `SELECT m.id, m.name, COALESCE(m.category, '일반') as category,
              COALESCE(SUM(ct.amount), 0) as total_revenue,
              COUNT(ct.id) as tx_count
       FROM merchants m
       LEFT JOIN coupon_transactions ct ON m.id = ct.merchant_id
       WHERE m.status = 'approved'
       GROUP BY m.id, m.name, m.category
       ORDER BY total_revenue DESC, tx_count DESC
       LIMIT 5`
    );

    // 6. 최근 6개월 월별 발행/사용 추이
    const [monthlyTrend] = await pool.execute(
      `SELECT DATE_FORMAT(scanned_at, '%m월') as month_label,
              COUNT(*) as used_count,
              COALESCE(SUM(amount), 0) as used_amount
       FROM coupon_transactions
       WHERE scanned_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY month_label
       ORDER BY month_label ASC`
    );

    // 7. 지역별 비중 (덕적면 / 자월면 / 기타)
    const [regionShare] = await pool.execute(
      `SELECT 
         CASE 
           WHEN address LIKE '%덕적%' THEN '덕적면'
           WHEN address LIKE '%자월%' THEN '자월면'
           WHEN address LIKE '%백령%' THEN '백령면'
           WHEN address LIKE '%영흥%' THEN '영흥면'
           ELSE '기타'
         END as region_name,
         COUNT(*) as merchant_count
       FROM merchants
       WHERE status = 'approved'
       GROUP BY region_name`
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalIssuedCount: Number(issuedRow.total_count || 0),
          totalIssuedAmount: Number(issuedRow.total_amount || 0),
          totalUsedCount: Number(usedRow.total_count || 0),
          totalUsedAmount: Number(usedRow.total_amount || 0),
          settledAmount: Number(settledRow.settled_amount || 0),
          activeMerchantCount: Number(merchantRow.active_count || 0),
        },
        topMerchants,
        monthlyTrend,
        regionShare
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── 쿠폰(난수) 일괄 발행 (OOM DoS 방어 적용) ───────────
const crypto = require('crypto');
const { hashCouponCode } = require('../utils/crypto');

router.post('/coupons/generate', authenticate, authorize('admin'), async (req, res, next) => {
  const { issuer, type, quantity } = req.body;
  const numQty = parseInt(quantity, 10);

  if (!issuer || !type || isNaN(numQty) || numQty < 1) {
    return res.status(400).json({ success: false, message: '발행처, 권종, 수량을 올바르게 입력해주세요.' });
  }

  // OOM 및 메모리 고갈 공격 방어
  if (numQty > 5000) {
    return res.status(400).json({ success: false, message: '1회 최대 발행 수량은 5,000장입니다.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. 대상 발행처 및 배정(issuer_allocations) 확인
    let issuerId = null;
    let issuerName = issuer;
    const [foundIssuers] = await connection.execute(
      `SELECT id, name FROM issuers WHERE id = ? OR name = ? LIMIT 1`,
      [issuer, issuer]
    );
    if (foundIssuers.length > 0) {
      issuerId = foundIssuers[0].id;
      issuerName = foundIssuers[0].name;
    }

    let allocId = null;
    if (issuerId) {
      const [allocs] = await connection.execute(
        `SELECT id, total_count, issued_count FROM issuer_allocations 
         WHERE issuer_id = ? AND face_value = ? 
         ORDER BY id ASC LIMIT 1 FOR UPDATE`,
        [issuerId, type]
      );
      if (allocs.length > 0) {
        allocId = allocs[0].id;
        await connection.execute(
          `UPDATE issuer_allocations SET issued_count = issued_count + ? WHERE id = ?`,
          [numQty, allocId]
        );
      } else {
        const [newAlloc] = await connection.execute(
          `INSERT INTO issuer_allocations (issuer_id, face_value, total_count, issued_count)
           VALUES (?, ?, ?, ?)`,
          [issuerId, type, Math.max(numQty, 1000), numQty]
        );
        allocId = newAlloc.insertId;
      }
    }

    const newCoupons = [];
    const values = [];
    
    // 난수 생성 로직: OJC-랜덤8자리
    for (let i = 0; i < numQty; i++) {
      const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
      const code = `OJC-${randomStr}`;
      const codeHash = hashCouponCode(code);
      
      newCoupons.push({ code, faceValue: type, issuer: issuerName, barcodeType: 'CODE128' });
      values.push([codeHash, type, issuerName, issuerId, allocId]);
    }

    await connection.query(
      `INSERT INTO paper_coupons (random_code_hash, face_value, issued_by_location, issuer_id, issuer_allocation_id) VALUES ?`,
      [values]
    );

    await connection.commit();
    res.json({ success: true, message: `${numQty}장 발행 완료`, data: newCoupons });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// ── 관리자 디지털 쿠폰 즉시 발급 (시연 및 직접 지급) ──
router.post('/coupons/issue-instant', authenticate, authorize('admin'), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { issuerId, faceValue, touristName } = req.body;
    const numFaceValue = parseInt(faceValue, 10) || 5000;
    const targetTouristName = (touristName || '관리자 시연/민원 발급').trim();

    await connection.beginTransaction();

    // 1. 관광객 유저 확인 또는 생성
    let userId = null;
    const [existingUsers] = await connection.execute(
      `SELECT id FROM users WHERE nickname = ? LIMIT 1`,
      [targetTouristName]
    );

    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      await connection.execute(
        `UPDATE users SET coupon_balance = coupon_balance + ? WHERE id = ?`,
        [numFaceValue, userId]
      );
    } else {
      const dummyProviderId = `admin_issue_${Date.now()}`;
      const [userResult] = await connection.execute(
        `INSERT INTO users (social_provider, provider_id, nickname, email, coupon_balance) VALUES ('kakao', ?, ?, ?, ?)`,
        [dummyProviderId, targetTouristName, `test_${Date.now()}@ongjin.go.kr`, numFaceValue]
      );
      userId = userResult.insertId;
    }

    // 2. 배정 확인 (선택된 발행처가 있으면 해당 배정의 issued_count 증가)
    let allocId = null;
    if (issuerId) {
      const [allocs] = await connection.execute(
        `SELECT id, total_count, issued_count FROM issuer_allocations 
         WHERE issuer_id = ? AND face_value = ? 
         ORDER BY id DESC LIMIT 1`,
        [issuerId, numFaceValue]
      );
      if (allocs.length > 0) {
        allocId = allocs[0].id;
        await connection.execute(
          `UPDATE issuer_allocations SET issued_count = issued_count + 1 WHERE id = ?`,
          [allocId]
        );
      } else {
        const [fallbackAllocs] = await connection.execute(
          `SELECT id, total_count, issued_count FROM issuer_allocations WHERE issuer_id = ? ORDER BY id DESC LIMIT 1`,
          [issuerId]
        );
        if (fallbackAllocs.length > 0) {
          allocId = fallbackAllocs[0].id;
          await connection.execute(
            `UPDATE issuer_allocations SET issued_count = issued_count + 1 WHERE id = ?`,
            [allocId]
          );
        }
      }
    }

    // 3. 고유 쿠폰 코드 생성
    const rawCode = `OJC-D${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const codeHash = hashCouponCode(rawCode);
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1년(365일) 유효

    const [couponResult] = await connection.execute(
      `INSERT INTO coupons (code_hash, coupon_type, face_value, issued_to, status, issued_by, expires_at, issuer_allocation_id)
       VALUES (?, 'digital', ?, ?, 'available', ?, ?, ?)`,
      [codeHash, numFaceValue, userId, req.user.id, expiresAt, allocId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `[${targetTouristName}] 님에게 ${numFaceValue.toLocaleString()}원 디지털 쿠폰(#${couponResult.insertId})이 발급되었습니다.`,
      data: {
        couponId: couponResult.insertId,
        code: rawCode,
        faceValue: numFaceValue,
        touristName: targetTouristName,
        expiresAt
      }
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// ── 관리자 계정 목록 ──────────────────────────────
router.get('/managers', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, username, name, role, created_at FROM admins ORDER BY created_at ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── 관리자 계정 등록 ──────────────────────────────
router.post('/managers', authenticate, authorize('admin'), async (req, res, next) => {
  if (req.user.adminRole !== 'super') {
    return res.status(403).json({ success: false, message: '최고 관리자만 접근 가능합니다.' });
  }

  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
  }

  try {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute(
      `INSERT INTO admins (username, password_hash, name, role) VALUES (?, ?, ?, ?)`,
      [username, hashedPassword, name, role]
    );
    res.json({ success: true, message: '관리자가 등록되었습니다.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '이미 존재하는 아이디입니다.' });
    }
    next(err);
  }
});

// ── 관리자 계정 다중 삭제 ───────────────────────────
router.delete('/managers', authenticate, authorize('admin'), async (req, res, next) => {
  if (req.user.adminRole !== 'super') {
    return res.status(403).json({ success: false, message: '최고 관리자만 접근 가능합니다.' });
  }

  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: '삭제할 관리자를 선택해주세요.' });
  }

  // 본인 계정 삭제 방지
  if (ids.includes(req.user.id)) {
    return res.status(400).json({ success: false, message: '본인 계정은 삭제할 수 없습니다.' });
  }

  try {
    const placeholders = ids.map(() => '?').join(',');
    await pool.execute(
      `DELETE FROM admins WHERE id IN (${placeholders})`,
      ids
    );
    res.json({ success: true, message: '선택한 관리자가 삭제되었습니다.' });
  } catch (err) { next(err); }
});

// ── 관리자 개별 정보 조회 (수정용) ────────────────────
router.get('/managers/:id', authenticate, authorize('admin'), async (req, res, next) => {
  if (req.user.adminRole !== 'super') {
    return res.status(403).json({ success: false, message: '최고 관리자만 접근 가능합니다.' });
  }
  try {
    const [[manager]] = await pool.execute(
      `SELECT id, username, name, role FROM admins WHERE id = ?`,
      [req.params.id]
    );
    if (!manager) {
      return res.status(404).json({ success: false, message: '관리자를 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: manager });
  } catch (err) { next(err); }
});

// ── 관리자 정보 수정 ──────────────────────────────────
router.put('/managers/:id', authenticate, authorize('admin'), async (req, res, next) => {
  if (req.user.adminRole !== 'super') {
    return res.status(403).json({ success: false, message: '최고 관리자만 접근 가능합니다.' });
  }
  const { name, role, password } = req.body;
  if (!name || !role) {
    return res.status(400).json({ success: false, message: '이름과 권한을 입력해주세요.' });
  }
  try {
    if (password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.execute(
        `UPDATE admins SET name = ?, role = ?, password_hash = ? WHERE id = ?`,
        [name, role, hashedPassword, req.params.id]
      );
    } else {
      await pool.execute(
        `UPDATE admins SET name = ?, role = ? WHERE id = ?`,
        [name, role, req.params.id]
      );
    }
    res.json({ success: true, message: '관리자 정보가 수정되었습니다.' });
  } catch (err) { next(err); }
});

// ── 관광객 회원 목록 조회 ───────────────────────────────────
router.get('/users', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { status } = req.query; // 'all' | 'active' | 'withdrawn'

    let whereClause = "WHERE u.role = 'tourist'";
    const params = [];
    if (status === 'active') {
      whereClause += " AND u.status = 'active'";
    } else if (status === 'withdrawn') {
      whereClause += " AND u.status = 'withdrawn'";
    }

    const [rows] = await pool.execute(
      `SELECT 
         u.id, u.social_provider, u.provider_id, u.nickname, u.email, u.phone_hash, 
         u.coupon_balance, u.status, u.withdrawn_at, u.withdrawn_reason, 
         u.last_login_at, u.last_login_ip, u.login_count, u.created_at,
         COALESCE(c.avail_count, 0) AS available_coupon_count,
         COALESCE(c.avail_amount, 0) AS available_coupon_amount,
         COALESCE(c.used_count, 0) AS used_coupon_count,
         COALESCE(c.total_count, 0) AS total_coupon_count
       FROM users u
       LEFT JOIN (
         SELECT 
           issued_to,
           COUNT(*) AS total_count,
           SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS avail_count,
           SUM(CASE WHEN status = 'available' THEN face_value ELSE 0 END) AS avail_amount,
           SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS used_count
         FROM coupons
         GROUP BY issued_to
       ) c ON u.id = c.issued_to
       ${whereClause}
       ORDER BY u.created_at DESC`,
      params
    );

    // 전체 요약 통계 계산을 위한 카운트 조회
    const [[summaryRow]] = await pool.execute(
      `SELECT 
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) AS withdrawn
       FROM users 
       WHERE role = 'tourist'`
    );

    const [[couponHolderRow]] = await pool.execute(
      `SELECT COUNT(DISTINCT issued_to) AS withCoupons
       FROM coupons 
       WHERE status = 'available' AND issued_to IS NOT NULL`
    );

    const providerNames = {
      phone: '휴대폰',
      kakao: '카카오',
      naver: '네이버',
      google: '구글'
    };

    const mapped = rows.map(u => {
      let nickname = u.nickname;
      let phone_last4 = null;
      const providerLabel = providerNames[u.social_provider] || u.social_provider;

      if (!nickname || nickname === '미연동 계정') {
        if (u.social_provider === 'phone' && u.provider_id) {
          nickname = u.provider_id;
        } else if (u.email) {
          nickname = u.email;
        } else {
          nickname = `${providerLabel} 회원`;
        }
      }

      const clean = (nickname || '').replace(/[^0-9]/g, '');
      if (clean.startsWith('010') && clean.length >= 10) {
        const part1 = clean.substring(0, 3);
        const part3 = clean.substring(clean.length - 4);
        nickname = `${part1}-****-${part3}`;
        phone_last4 = part3;
      }

      return {
        ...u,
        nickname,
        phone_last4,
        provider_label: providerLabel,
        available_coupon_count: Number(u.available_coupon_count || 0),
        available_coupon_amount: Number(u.available_coupon_amount || 0),
        used_coupon_count: Number(u.used_coupon_count || 0),
        total_coupon_count: Number(u.total_coupon_count || 0),
        login_count: Number(u.login_count || 0),
      };
    });

    res.json({ 
      success: true, 
      summary: {
        total: Number(summaryRow.total || 0),
        active: Number(summaryRow.active || 0),
        withdrawn: Number(summaryRow.withdrawn || 0),
        withCoupons: Number(couponHolderRow.withCoupons || 0),
      },
      data: mapped 
    });
  } catch (err) { next(err); }
});

// ── 관광객 회원 단건 상세 조회 ──────────────────────────────
router.get('/users/:id', authenticate, authorize('admin'), async (req, res, next) => {
  const userId = req.params.id;
  try {
    const [rows] = await pool.execute(
      `SELECT 
         u.id, u.social_provider, u.provider_id, u.nickname, u.email, u.phone_hash, 
         u.coupon_balance, u.status, u.withdrawn_at, u.withdrawn_reason, 
         u.last_login_at, u.last_login_ip, u.login_count, u.created_at,
         COALESCE(c.avail_count, 0) AS available_coupon_count,
         COALESCE(c.avail_amount, 0) AS available_coupon_amount,
         COALESCE(c.used_count, 0) AS used_coupon_count,
         COALESCE(c.used_amount, 0) AS used_coupon_amount,
         COALESCE(c.expired_count, 0) AS expired_coupon_count,
         COALESCE(c.total_count, 0) AS total_coupon_count
       FROM users u
       LEFT JOIN (
         SELECT 
           issued_to,
           COUNT(*) AS total_count,
           SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS avail_count,
           SUM(CASE WHEN status = 'available' THEN face_value ELSE 0 END) AS avail_amount,
           SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS used_count,
           SUM(CASE WHEN status = 'used' THEN face_value ELSE 0 END) AS used_amount,
           SUM(CASE WHEN status IN ('expired', 'cancelled') THEN 1 ELSE 0 END) AS expired_count
         FROM coupons
         GROUP BY issued_to
       ) c ON u.id = c.issued_to
       WHERE u.id = ? AND u.role = 'tourist'
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '회원을 찾을 수 없습니다.' });
    }

    const u = rows[0];
    const providerNames = {
      phone: '휴대폰',
      kakao: '카카오',
      naver: '네이버',
      google: '구글'
    };

    let nickname = u.nickname;
    let phone_last4 = null;
    const providerLabel = providerNames[u.social_provider] || u.social_provider;

    if (!nickname || nickname === '미연동 계정') {
      if (u.social_provider === 'phone' && u.provider_id) {
        nickname = u.provider_id;
      } else if (u.email) {
        nickname = u.email;
      } else {
        nickname = `${providerLabel} 회원`;
      }
    }

    const clean = (nickname || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('010') && clean.length >= 10) {
      const part1 = clean.substring(0, 3);
      const part3 = clean.substring(clean.length - 4);
      nickname = `${part1}-****-${part3}`;
      phone_last4 = part3;
    }

    res.json({
      success: true,
      data: {
        ...u,
        nickname,
        phone_last4,
        provider_label: providerLabel,
        available_coupon_count: Number(u.available_coupon_count || 0),
        available_coupon_amount: Number(u.available_coupon_amount || 0),
        used_coupon_count: Number(u.used_coupon_count || 0),
        used_coupon_amount: Number(u.used_coupon_amount || 0),
        expired_coupon_count: Number(u.expired_coupon_count || 0),
        total_coupon_count: Number(u.total_coupon_count || 0),
        login_count: Number(u.login_count || 0),
      }
    });
  } catch (err) { next(err); }
});

// ── 관광객 회원 접속 기록(로그) 목록 조회 ──────────────────
router.get('/users/:id/login-logs', authenticate, authorize('admin'), async (req, res, next) => {
  const userId = req.params.id;
  try {
    const [rows] = await pool.execute(
      `SELECT id, provider, ip_address, user_agent, login_at 
       FROM user_login_logs 
       WHERE user_id = ? 
       ORDER BY login_at DESC 
       LIMIT 50`,
      [userId]
    );

    const providerNames = {
      phone: '휴대폰',
      kakao: '카카오',
      naver: '네이버',
      google: '구글'
    };

    const mapped = rows.map(l => ({
      ...l,
      provider_label: providerNames[l.provider] || l.provider
    }));

    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

// ── 관광객 회원 탈퇴 처리 (소프트 삭제 및 쿠폰 취소) ───────────
router.delete('/users/:id', authenticate, authorize('admin'), async (req, res, next) => {
  const userId = req.params.id;
  const { reason } = req.body || {};

  try {
    // 1. 해당 회원이 보유한 유효 쿠폰 취소 처리
    await pool.execute(
      `UPDATE coupons SET status = 'cancelled' WHERE issued_to = ? AND status = 'available'`,
      [userId]
    );

    // 2. 회원 상태를 withdrawn으로 소프트 탈퇴 처리
    const [result] = await pool.execute(
      `UPDATE users 
       SET status = 'withdrawn', 
           withdrawn_at = NOW(), 
           withdrawn_reason = ?, 
           coupon_balance = 0 
       WHERE id = ? AND role = 'tourist'`,
      [reason || '관리자 탈퇴 처리', userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '해당 회원을 찾을 수 없거나 이미 탈퇴되었습니다.' });
    }
    
    res.json({ success: true, message: '회원이 안전하게 탈퇴 처리되었습니다.' });
  } catch (err) { next(err); }
});

// ── 관광객 회원 탈퇴 복구 처리 ─────────────────────────────
router.patch('/users/:id/restore', authenticate, authorize('admin'), async (req, res, next) => {
  const userId = req.params.id;

  try {
    // 1. 회원 상태 정상 복구
    const [result] = await pool.execute(
      `UPDATE users 
       SET status = 'active', 
           withdrawn_at = NULL, 
           withdrawn_reason = NULL 
       WHERE id = ? AND role = 'tourist'`,
      [userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '해당 회원을 찾을 수 없습니다.' });
    }

    // 2. 탈퇴 시 취소되었던 유효 쿠폰(기한 남은 것)을 다시 사용 가능 상태로 복구
    await pool.execute(
      `UPDATE coupons 
       SET status = 'available' 
       WHERE issued_to = ? AND status = 'cancelled' AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );

    // 3. 복구된 쿠폰 잔액 동기화
    const [[balRow]] = await pool.execute(
      `SELECT COALESCE(SUM(face_value), 0) AS total_bal FROM coupons WHERE issued_to = ? AND status = 'available'`,
      [userId]
    );
    await pool.execute(
      `UPDATE users SET coupon_balance = ? WHERE id = ?`,
      [balRow.total_bal, userId]
    );
    
    res.json({ success: true, message: '회원 계정 및 보유 쿠폰이 정상 상태로 복구되었습니다.' });
  } catch (err) { next(err); }
});

// ── 관광객 회원 쿠폰 내역 조회 ─────────────────────────
router.get('/users/:id/coupons', authenticate, authorize('admin'), async (req, res, next) => {
  const userId = req.params.id;
  try {
    const [rows] = await pool.execute(
      `SELECT c.id, c.code_hash, c.coupon_type, c.face_value, c.status, c.issued_at, c.used_at,
              COALESCE(i.name, i_direct.name, pc.issued_by_location, '옹진군 관광과') AS issuer_name,
              m.name AS merchant_name
       FROM coupons c
       LEFT JOIN issuer_allocations ia ON c.issuer_allocation_id = ia.id
       LEFT JOIN issuers i ON ia.issuer_id = i.id
       LEFT JOIN paper_coupons pc ON c.code_hash = pc.random_code_hash
       LEFT JOIN issuers i_direct ON (pc.issuer_id = i_direct.id) 
                                  OR (pc.terminal_id IS NOT NULL AND pc.terminal_id = i_direct.terminal_id)
                                  OR (pc.issued_by_location IS NOT NULL AND pc.issued_by_location = i_direct.name)
       LEFT JOIN coupon_transactions ct ON c.id = ct.coupon_id AND COALESCE(ct.is_cancelled, 0) = 0
       LEFT JOIN merchants m ON ct.merchant_id = m.id
       WHERE c.issued_to = ?
       ORDER BY c.issued_at DESC`,
      [userId]
    );

    // 단체 공유 링크 수령 정보 병합 (본인/대리, 링크/쿠폰번호) — 공유 테이블이 없어도 목록은 정상 응답
    if (rows.length > 0) {
      try {
        const [claims] = await pool.execute(
          `SELECT csc.coupon_id, csc.claim_type, csc.source, csc.bundle_id, b.issued_by_location AS share_location
           FROM coupon_share_claims csc
           LEFT JOIN coupon_share_bundles b ON b.id = csc.bundle_id
           WHERE csc.user_id = ?`,
          [userId]
        );
        const claimMap = new Map(claims.map(r => [Number(r.coupon_id), r]));
        rows.forEach(r => {
          const cl = claimMap.get(Number(r.id));
          r.share_claim_type = cl ? cl.claim_type : null;
          r.share_source = cl ? cl.source : null;
          r.share_bundle_id = cl ? cl.bundle_id : null;
        });
      } catch (_) { }
    }

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── 1. 발행처 목록 및 배정 현황 조회 (실시간 발급 수량 정합성 보장) ──
router.get('/issuers', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [issuers] = await pool.execute(
      `SELECT id, username, name, terminal_id, created_at FROM issuers ORDER BY created_at ASC`
    );

    // 1. 배정 레코드 조회
    const [allocations] = await pool.execute(
      `SELECT id, issuer_id, face_value, total_count, issued_count, created_at 
       FROM issuer_allocations ORDER BY created_at ASC`
    );

    // 2. 디지털 쿠폰 발급 집계 (coupons.issuer_allocation_id 기준)
    const [digitalStats] = await pool.execute(
      `SELECT issuer_allocation_id, COUNT(*) AS cnt 
       FROM coupons 
       WHERE issuer_allocation_id IS NOT NULL 
       GROUP BY issuer_allocation_id`
    );
    const digitalMap = new Map();
    digitalStats.forEach(r => digitalMap.set(r.issuer_allocation_id, Number(r.cnt)));

    // 3. 지류 쿠폰 발급 집계 (paper_coupons.issuer_allocation_id 기준)
    const [paperAllocStats] = await pool.execute(
      `SELECT issuer_allocation_id, COUNT(*) AS cnt 
       FROM paper_coupons 
       WHERE issuer_allocation_id IS NOT NULL 
       GROUP BY issuer_allocation_id`
    );
    const paperAllocMap = new Map();
    paperAllocStats.forEach(r => paperAllocMap.set(r.issuer_allocation_id, Number(r.cnt)));

    // 4. 레거시/과거 지류 쿠폰 중 allocation_id가 아직 없는 건들 (issuer_id + face_value 기준)
    const [unallocatedPaper] = await pool.execute(
      `SELECT pc.issuer_id, pc.face_value, COUNT(*) AS cnt 
       FROM paper_coupons pc
       WHERE pc.issuer_allocation_id IS NULL AND pc.issuer_id IS NOT NULL
       GROUP BY pc.issuer_id, pc.face_value`
    );
    const unallocatedMap = new Map();
    unallocatedPaper.forEach(r => {
      unallocatedMap.set(`${r.issuer_id}_${r.face_value}`, Number(r.cnt));
    });

    // 5. 각 배정별 실제 발급 수량 산출 및 동기화
    for (const alloc of allocations) {
      const dCnt = digitalMap.get(alloc.id) || 0;
      const pCnt = paperAllocMap.get(alloc.id) || 0;
      const unallocKey = `${alloc.issuer_id}_${alloc.face_value}`;
      const uCnt = unallocatedMap.get(unallocKey) || 0;

      // 미매핑 지류 쿠폰이 있으면 해당 배정으로 자동 연계 업데이트
      if (uCnt > 0) {
        await pool.execute(
          `UPDATE paper_coupons SET issuer_allocation_id = ? 
           WHERE issuer_allocation_id IS NULL AND issuer_id = ? AND face_value = ?`,
          [alloc.id, alloc.issuer_id, alloc.face_value]
        );
        unallocatedMap.delete(unallocKey);
      }

      const totalActualIssued = Math.max(alloc.issued_count, dCnt + pCnt + uCnt);
      if (totalActualIssued !== alloc.issued_count) {
        alloc.issued_count = totalActualIssued;
        await pool.execute(
          `UPDATE issuer_allocations SET issued_count = ? WHERE id = ?`,
          [totalActualIssued, alloc.id]
        );
      }
    }

    // 6. 아직 배정 레코드가 없는데 지류 쿠폰이 발급된 발행처/권종의 경우 배정 자동 생성
    for (const [key, cnt] of unallocatedMap.entries()) {
      if (cnt > 0) {
        const [issuerIdStr, faceValStr] = key.split('_');
        const issuerId = parseInt(issuerIdStr, 10);
        const faceVal = parseInt(faceValStr, 10);
        
        const [insertRes] = await pool.execute(
          `INSERT INTO issuer_allocations (issuer_id, face_value, total_count, issued_count)
           VALUES (?, ?, ?, ?)`,
          [issuerId, faceVal, Math.max(1000, cnt * 2), cnt]
        );
        const newAllocId = insertRes.insertId;

        await pool.execute(
          `UPDATE paper_coupons SET issuer_allocation_id = ? 
           WHERE issuer_allocation_id IS NULL AND issuer_id = ? AND face_value = ?`,
          [newAllocId, issuerId, faceVal]
        );

        allocations.push({
          id: newAllocId,
          issuer_id: issuerId,
          face_value: faceVal,
          total_count: Math.max(1000, cnt * 2),
          issued_count: cnt,
          created_at: new Date()
        });
      }
    }

    res.json({ success: true, data: { issuers, allocations } });
  } catch (err) { next(err); }
});

// ── 2. 신규 발행처 등록 ──
router.post('/issuers', authenticate, authorize('admin'), async (req, res, next) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ success: false, message: '아이디, 비밀번호, 발행처명을 모두 입력해주세요.' });
  }
  try {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute(
      `INSERT INTO issuers (username, password_hash, name) VALUES (?, ?, ?)`,
      [username, hashedPassword, name]
    );
    res.json({ success: true, message: '발행처가 등록되었습니다.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '이미 존재하는 발행처 아이디입니다.' });
    }
    next(err);
  }
});

// ── 2.5 단일 발행처 상세 조회 ──
router.get('/issuers/:id', authenticate, authorize('admin'), async (req, res, next) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT id, username, name, created_at FROM issuers WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '존재하지 않는 발행처입니다.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ── 2.6 발행처 정보 수정 ──
router.put('/issuers/:id', authenticate, authorize('admin'), async (req, res, next) => {
  const { id } = req.params;
  const { name, password } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: '기관명을 입력해주세요.' });
  }
  try {
    if (password) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.execute(
        `UPDATE issuers SET name = ?, password_hash = ? WHERE id = ?`,
        [name, hashedPassword, id]
      );
    } else {
      await pool.execute(
        `UPDATE issuers SET name = ? WHERE id = ?`,
        [name, id]
      );
    }
    res.json({ success: true, message: '발행처 정보가 수정되었습니다.' });
  } catch (err) { next(err); }
});

// ── 2.7 발행처 삭제 (쿠폰 재배정 및 연계 DB 무결성 고려) ──
router.delete('/issuers/:id', authenticate, authorize('admin'), async (req, res, next) => {
  const { id } = req.params;
  const targetReassignId = req.body?.reassignIssuerId || req.query?.reassignIssuerId;
  const isForce = req.body?.force === true || req.query?.force === 'true';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. 해당 발행처 존재 여부 확인
    const [[issuer]] = await connection.execute(
      `SELECT id, name FROM issuers WHERE id = ?`,
      [id]
    );
    if (!issuer) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '존재하지 않는 발행처입니다.' });
    }

    // 2. 배정 내역 조회
    const [allocations] = await connection.execute(
      `SELECT id, face_value, total_count, issued_count FROM issuer_allocations WHERE issuer_id = ?`,
      [id]
    );

    if (allocations.length > 0) {
      // 2-A: 다른 발행처로 재배정(이관) 후 삭제 요청인 경우
      if (targetReassignId && targetReassignId != id) {
        const [[targetIssuer]] = await connection.execute(
          `SELECT id, name FROM issuers WHERE id = ?`,
          [targetReassignId]
        );
        if (!targetIssuer) {
          await connection.rollback();
          return res.status(400).json({ success: false, message: '재배정할 대상 발행처를 찾을 수 없습니다.' });
        }

        // 배정 내역의 issuer_id를 대상 발행처로 이관
        await connection.execute(
          `UPDATE issuer_allocations SET issuer_id = ? WHERE issuer_id = ?`,
          [targetReassignId, id]
        );
      }
      // 2-B: 강제 정리 삭제 (미발행 배정 회수 및 연계 쿠폰 안전 분리)
      else if (isForce) {
        // 이미 발급된 쿠폰들의 issuer_allocation_id를 NULL로 안전하게 변경 (결제/정산 등 과거 이력 무결성 보존)
        const allocIds = allocations.map(a => a.id);
        if (allocIds.length > 0) {
          await connection.execute(
            `UPDATE coupons SET issuer_allocation_id = NULL WHERE issuer_allocation_id IN (${allocIds.map(() => '?').join(',')})`,
            allocIds
          );
          // 배정 내역 삭제
          await connection.execute(
            `DELETE FROM issuer_allocations WHERE issuer_id = ?`,
            [id]
          );
        }
      }
      // 2-C: 옵션 없이 요청된 경우 (안내 정보와 함께 선택 모달 띄우도록 반환)
      else {
        await connection.rollback();
        const totalCount = allocations.reduce((sum, a) => sum + (a.total_count || 0), 0);
        const issuedCount = allocations.reduce((sum, a) => sum + (a.issued_count || 0), 0);
        return res.status(400).json({
          success: false,
          hasAllocations: true,
          totalCount,
          issuedCount,
          remainingCount: totalCount - issuedCount,
          message: `해당 발행처에 배정된 쿠폰 내역(${totalCount}장, 잔여 ${totalCount - issuedCount}장)이 존재합니다.`
        });
      }
    }

    // 3. 발행처 삭제 실행
    await connection.execute(
      `DELETE FROM issuers WHERE id = ?`,
      [id]
    );

    await connection.commit();
    res.json({ success: true, message: `${issuer.name} 발행처가 성공적으로 삭제되었습니다.` });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// ── 3. 발행처 쿠폰 배정 등록 ──
router.post('/issuers/allocations', authenticate, authorize('admin'), async (req, res, next) => {
  const { issuerId, faceValue, totalCount } = req.body;
  if (!issuerId || !faceValue || !totalCount || totalCount < 1) {
    return res.status(400).json({ success: false, message: '발행처, 배정 금액, 배정 수량을 올바르게 입력해주세요.' });
  }
  try {
    await pool.execute(
      `INSERT INTO issuer_allocations (issuer_id, face_value, total_count) VALUES (?, ?, ?)`,
      [issuerId, faceValue, totalCount]
    );
    res.json({ success: true, message: '발행처 쿠폰 배정이 완료되었습니다.' });
  } catch (err) { next(err); }
});

// ── 3.1 발행처 쿠폰 배정 수정 및 재배정(이관) ──
router.put('/issuers/allocations/:id', authenticate, authorize('admin'), async (req, res, next) => {
  const { id } = req.params;
  const { targetIssuerId, totalCount } = req.body;

  try {
    const [[allocation]] = await pool.execute(
      `SELECT * FROM issuer_allocations WHERE id = ?`,
      [id]
    );
    if (!allocation) {
      return res.status(404).json({ success: false, message: '배정 내역을 찾을 수 없습니다.' });
    }

    const updates = [];
    const params = [];

    // 배정 수량 변경 검증 (이미 발급된 수량보다 작게 줄일 수는 없음)
    if (totalCount !== undefined) {
      const newTotal = parseInt(totalCount, 10);
      if (isNaN(newTotal) || newTotal < allocation.issued_count) {
        return res.status(400).json({
          success: false,
          message: `총 배정 수량은 이미 발급된 수량(${allocation.issued_count}장) 이상이어야 합니다.`
        });
      }
      updates.push('total_count = ?');
      params.push(newTotal);
    }

    // 다른 발행처로 재배정(이관)
    if (targetIssuerId && targetIssuerId != allocation.issuer_id) {
      const [[targetIssuer]] = await pool.execute(
        `SELECT id, name FROM issuers WHERE id = ?`,
        [targetIssuerId]
      );
      if (!targetIssuer) {
        return res.status(400).json({ success: false, message: '재배정할 대상 기관을 찾을 수 없습니다.' });
      }
      updates.push('issuer_id = ?');
      params.push(targetIssuerId);
    }

    if (updates.length === 0) {
      return res.json({ success: true, message: '변경 사항이 없습니다.' });
    }

    params.push(id);
    await pool.execute(
      `UPDATE issuer_allocations SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ success: true, message: '쿠폰 배정 정보가 성공적으로 수정되었습니다.' });
  } catch (err) { next(err); }
});

// ── 3.2 발행처 쿠폰 배정 회수 및 삭제 ──
router.delete('/issuers/allocations/:id', authenticate, authorize('admin'), async (req, res, next) => {
  const { id } = req.params;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[allocation]] = await connection.execute(
      `SELECT * FROM issuer_allocations WHERE id = ?`,
      [id]
    );
    if (!allocation) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '배정 내역을 찾을 수 없습니다.' });
    }

    // 이미 발급된 쿠폰이 있는 경우: coupons.issuer_allocation_id를 NULL 처리하여 과거 사용/정산 이력 보존
    if (allocation.issued_count > 0) {
      await connection.execute(
        `UPDATE coupons SET issuer_allocation_id = NULL WHERE issuer_allocation_id = ?`,
        [id]
      );
    }

    // 배정 레코드 삭제
    await connection.execute(
      `DELETE FROM issuer_allocations WHERE id = ?`,
      [id]
    );

    await connection.commit();
    res.json({
      success: true,
      message: allocation.issued_count > 0 
        ? `미발급 잔여 쿠폰이 회수되었으며, 기존 발급 쿠폰의 거래 이력을 안전하게 보존하고 배정이 취소되었습니다.`
        : `쿠폰 배정이 성공적으로 회수(삭제)되었습니다.`
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});

// ── 4. 전체 쿠폰 상태 목록 조회 (탈퇴 회원 수령인 정보 보존 및 명확한 표기) ──
router.get('/coupons/status-list', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `(
        SELECT 
          IF(c.coupon_type = 'paper' AND pc.id IS NOT NULL, pc.id, c.id) AS id,
          c.id AS digital_id,
          pc.id AS paper_id,
          IF(c.coupon_type = 'paper' AND pc.id IS NOT NULL, CONCAT('P-', LPAD(pc.id, 5, '0')), CONCAT('D-', LPAD(c.id, 5, '0'))) AS serial_code,
          c.coupon_type, 
          c.face_value, 
          c.status, 
          c.issued_at, 
          c.used_at,
          COALESCE(u.nickname, u_pc.nickname, u_ct.nickname) AS u_nickname,
          COALESCE(u.email, u_pc.email, u_ct.email) AS u_email,
          COALESCE(u.social_provider, u_pc.social_provider, u_ct.social_provider) AS u_social_provider,
          COALESCE(u.provider_id, u_pc.provider_id, u_ct.provider_id) AS u_provider_id,
          COALESCE(u.status, u_pc.status, u_ct.status) AS u_status,
          COALESCE(i.name, ip_c.name, pc.issued_by_location, '관리자 직접발행') AS issuer_name
        FROM coupons c
        LEFT JOIN paper_coupons pc ON c.code_hash = pc.random_code_hash
        LEFT JOIN coupon_transactions ct ON c.id = ct.coupon_id
        LEFT JOIN users u ON c.issued_to = u.id
        LEFT JOIN users u_pc ON pc.converted_by = u_pc.id
        LEFT JOIN users u_ct ON ct.user_id = u_ct.id
        LEFT JOIN issuer_allocations ia ON c.issuer_allocation_id = ia.id
        LEFT JOIN issuers i ON ia.issuer_id = i.id
        LEFT JOIN issuers ip_c ON pc.issuer_id = ip_c.id
        ORDER BY c.issued_at DESC
        LIMIT 500
      )
      UNION ALL
      (
        SELECT 
          p.id AS id,
          NULL AS digital_id,
          p.id AS paper_id,
          CONCAT('P-', LPAD(p.id, 5, '0')) AS serial_code,
          'paper' AS coupon_type, 
          p.face_value, 
          IF(sb.id IS NOT NULL AND sb.expires_at < NOW(), 'expired', 'available') AS status, 
          p.issued_at, 
          p.converted_at AS used_at,
          NULL AS u_nickname, 
          NULL AS u_email,
          NULL AS u_social_provider,
          NULL AS u_provider_id,
          NULL AS u_status,
          COALESCE(ip_p.name, p.issued_by_location, '옹진 관광지 키오스크') AS issuer_name
        FROM paper_coupons p
        LEFT JOIN issuers ip_p ON p.issuer_id = ip_p.id
        LEFT JOIN coupon_share_bundles sb ON sb.id = p.share_bundle_id
        WHERE p.converted = 0
        ORDER BY p.issued_at DESC
        LIMIT 100
      )
      ORDER BY issued_at DESC, id DESC`
    );

    const providerNames = {
      phone: '휴대폰',
      kakao: '카카오',
      naver: '네이버',
      google: '구글'
    };

    const mapped = rows.map(r => {
      let touristNickname = null;
      let userStatus = r.u_status || null;

      if (r.u_nickname || r.u_provider_id || r.u_email || r.u_social_provider) {
        const providerLabel = providerNames[r.u_social_provider] || r.u_social_provider || '회원';
        let name = r.u_nickname;
        if (!name || name === '미연동 계정') {
          if (r.u_social_provider === 'phone' && r.u_provider_id) {
            name = r.u_provider_id;
          } else if (r.u_email) {
            name = r.u_email;
          } else {
            name = `${providerLabel} 회원`;
          }
        }

        const clean = (name || '').replace(/[^0-9]/g, '');
        if (clean.startsWith('010') && clean.length >= 10) {
          const part1 = clean.substring(0, 3);
          const part3 = clean.substring(clean.length - 4);
          name = `${part1}-****-${part3}`;
        }

        if (r.u_status === 'withdrawn') {
          touristNickname = `${name} (탈퇴)`;
        } else {
          touristNickname = name;
        }
      } else if (r.status === 'used') {
        // 이미 사용된 쿠폰이지만 과거 완전 삭제 등으로 사용자 외래키가 유실된 경우 보존 표기
        touristNickname = '탈퇴 회원 (사용 완료)';
        userStatus = 'withdrawn';
      } else if (r.status === 'cancelled' && r.digital_id) {
        // 탈퇴로 취소된 쿠폰이지만 외래키가 유실된 경우 보존 표기
        touristNickname = '탈퇴 회원 (회수/취소)';
        userStatus = 'withdrawn';
      }

      return {
        id: r.id,
        digital_id: r.digital_id,
        paper_id: r.paper_id,
        serial_code: r.serial_code,
        coupon_type: r.coupon_type,
        face_value: r.face_value,
        status: r.status,
        issued_at: r.issued_at,
        used_at: r.used_at,
        tourist_nickname: touristNickname,
        tourist_email: r.u_email || null,
        user_status: userStatus,
        issuer_name: r.issuer_name
      };
    });

    res.json({ success: true, data: mapped });
  } catch (err) { next(err); }
});

// ── 단체 쿠폰 공유 링크 현황 (coupons.html · 민원 대응용) ─────────
// status: OPEN(수령 중) / SOLD_OUT(전량 수령) / EXPIRED(기한 만료) / CANCELLED(결제 취소)
const SHARE_BUNDLE_STATUS_SQL = `
  CASE
    WHEN b.expires_at < NOW() THEN 'EXPIRED'
    WHEN COALESCE(s.remaining_cnt, 0) > 0 THEN 'OPEN'
    WHEN COALESCE(s.cancelled_cnt, 0) > 0 AND COALESCE(s.claimed_cnt, 0) = 0 THEN 'CANCELLED'
    ELSE 'SOLD_OUT'
  END`;
const SHARE_BUNDLE_STATS_JOIN = `
  LEFT JOIN (
    SELECT share_bundle_id,
           SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END) AS claimed_cnt,
           SUM(CASE WHEN converted = 1 THEN face_value ELSE 0 END) AS claimed_amt,
           SUM(CASE WHEN converted = -1 OR COALESCE(is_cancelled, 0) = 1 THEN 1 ELSE 0 END) AS cancelled_cnt,
           SUM(CASE WHEN converted = 0 AND COALESCE(is_cancelled, 0) = 0 THEN 1 ELSE 0 END) AS remaining_cnt,
           SUM(CASE WHEN converted = 0 AND COALESCE(is_cancelled, 0) = 0 THEN face_value ELSE 0 END) AS remaining_amt
    FROM paper_coupons
    WHERE share_bundle_id IS NOT NULL
    GROUP BY share_bundle_id
  ) s ON s.share_bundle_id = b.id
  LEFT JOIN (
    SELECT bundle_id,
           COUNT(DISTINCT user_id) AS claimer_cnt,
           SUM(CASE WHEN claim_type = 'proxy' THEN 1 ELSE 0 END) AS proxy_cnt
    FROM coupon_share_claims
    GROUP BY bundle_id
  ) cl ON cl.bundle_id = b.id`;

router.get('/share-bundles', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const status = String(req.query.status || '').toUpperCase();
    const q = String(req.query.q || '').trim().slice(0, 50);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    if (['OPEN', 'SOLD_OUT', 'EXPIRED', 'CANCELLED'].includes(status)) {
      where.push(`(${SHARE_BUNDLE_STATUS_SQL}) = ?`);
      params.push(status);
    }
    if (q) {
      // 휴대폰 끝 4자리 / 발권 장소 / 거래번호 검색
      where.push(`(b.purchaser_phone_masked LIKE ? OR b.issued_by_location LIKE ? OR b.transaction_id LIKE ?)`);
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM coupon_share_bundles b ${SHARE_BUNDLE_STATS_JOIN} ${whereSql}`,
      params
    );
    const [rows] = await pool.execute(
      `SELECT b.id, b.transaction_id, b.issued_by_location, b.purchaser_phone_masked,
              b.total_count, b.total_amount, b.proxy_max, b.expires_at, b.created_at,
              COALESCE(s.claimed_cnt, 0) AS claimed_count, COALESCE(s.claimed_amt, 0) AS claimed_amount,
              COALESCE(s.remaining_cnt, 0) AS remaining_count, COALESCE(s.remaining_amt, 0) AS remaining_amount,
              COALESCE(s.cancelled_cnt, 0) AS cancelled_count,
              COALESCE(cl.claimer_cnt, 0) AS claimer_count, COALESCE(cl.proxy_cnt, 0) AS proxy_count,
              ${SHARE_BUNDLE_STATUS_SQL} AS status
       FROM coupon_share_bundles b
       ${SHARE_BUNDLE_STATS_JOIN}
       ${whereSql}
       ORDER BY b.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    // 상단 요약 (필터 무관 전체 기준)
    const [[summary]] = await pool.execute(
      `SELECT COUNT(*) AS bundles,
              COALESCE(SUM(s.claimed_cnt), 0) AS claimed,
              COALESCE(SUM(CASE WHEN b.expires_at >= NOW() THEN s.remaining_cnt ELSE 0 END), 0) AS waiting,
              COALESCE(SUM(CASE WHEN b.expires_at < NOW() THEN s.remaining_cnt ELSE 0 END), 0) AS lapsed,
              COALESCE(SUM(CASE WHEN b.expires_at < NOW() THEN s.remaining_amt ELSE 0 END), 0) AS lapsed_amount,
              COALESCE(SUM(cl.proxy_cnt), 0) AS proxy
       FROM coupon_share_bundles b ${SHARE_BUNDLE_STATS_JOIN}`
    );

    res.json({
      success: true,
      data: rows,
      summary: {
        bundles: Number(summary.bundles),
        claimed: Number(summary.claimed),
        waiting: Number(summary.waiting),
        lapsed: Number(summary.lapsed),
        lapsedAmount: Number(summary.lapsed_amount),
        proxy: Number(summary.proxy),
      },
      pagination: { page, limit, total: Number(total), totalPages: Math.max(1, Math.ceil(Number(total) / limit)) },
    });
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ success: true, data: [], summary: null, pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    }
    next(err);
  }
});

// 단체 공유 링크 상세: 쿠폰별 수령자 / 본인·대리 / 수령 경로
router.get('/share-bundles/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: '잘못된 요청입니다.' });
    }
    const [bundles] = await pool.execute(
      `SELECT b.id, b.transaction_id, b.issued_by_location, b.purchaser_phone_masked,
              b.total_count, b.total_amount, b.proxy_max, b.expires_at, b.created_at,
              COALESCE(s.claimed_cnt, 0) AS claimed_count, COALESCE(s.remaining_cnt, 0) AS remaining_count,
              COALESCE(s.cancelled_cnt, 0) AS cancelled_count,
              ${SHARE_BUNDLE_STATUS_SQL} AS status
       FROM coupon_share_bundles b
       ${SHARE_BUNDLE_STATS_JOIN}
       WHERE b.id = ?`,
      [id]
    );
    if (bundles.length === 0) {
      return res.status(404).json({ success: false, message: '공유 링크를 찾을 수 없습니다.' });
    }

    const [items] = await pool.execute(
      `SELECT p.id AS paper_id, CONCAT('P-', LPAD(p.id, 5, '0')) AS serial_code, p.face_value,
              p.converted, COALESCE(p.is_cancelled, 0) AS is_cancelled, p.converted_at,
              csc.claim_type, csc.source, csc.claimed_at,
              u.id AS user_id, u.nickname, u.phone, u.status AS user_status,
              c.status AS coupon_status, c.used_at
       FROM paper_coupons p
       LEFT JOIN coupon_share_claims csc ON csc.paper_coupon_id = p.id
       LEFT JOIN users u ON u.id = COALESCE(csc.user_id, p.converted_by)
       LEFT JOIN coupons c ON c.id = csc.coupon_id
       WHERE p.share_bundle_id = ?
       ORDER BY p.id ASC`,
      [id]
    );

    const mask = (phone) => {
      const d = String(phone || '').replace(/\D/g, '');
      return d.length >= 10 ? `${d.slice(0, 3)}-****-${d.slice(-4)}` : null;
    };
    const bundle = bundles[0];
    const expired = new Date(bundle.expires_at) < new Date();

    res.json({
      success: true,
      data: {
        bundle,
        items: items.map(r => {
          const conv = Number(r.converted);
          return {
            paperId: r.paper_id,
            serialCode: r.serial_code,
            faceValue: Number(r.face_value),
            state: (conv === -1 || Number(r.is_cancelled) === 1) ? 'cancelled'
              : conv === 1 ? 'claimed'
                : expired ? 'lapsed' : 'waiting',
            claimType: r.claim_type || null,
            source: r.source || null,
            claimedAt: r.claimed_at || r.converted_at || null,
            userId: r.user_id || null,
            userLabel: r.user_id
              ? `${mask(r.phone) || r.nickname || `회원 #${r.user_id}`}${r.user_status === 'withdrawn' ? ' (탈퇴)' : ''}`
              : null,
            couponStatus: r.coupon_status || null,
            usedAt: r.used_at || null,
          };
        }),
      },
    });
  } catch (err) { next(err); }
});

// ── 통계 보고서 데이터 (statistics.html용) ─────────
router.get('/stats/reports', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    // 1. KPI 카드용 누적 데이터
    const [[kpiStats]] = await pool.execute(
      `SELECT
         COUNT(*) AS total_issued,
         SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) AS total_used,
         SUM(CASE WHEN status = 'used' THEN face_value ELSE 0 END) AS total_settled
       FROM coupons`
    );
    const [[activeMerchants]] = await pool.execute(
      `SELECT COUNT(*) AS count FROM merchants WHERE status = 'approved'`
    );

    // 2. 월별 발행 및 사용 추이 (최근 6개월)
    const [monthlyRows] = await pool.execute(
      `SELECT 
         DATE_FORMAT(c.issued_at, '%Y-%m') AS month,
         COUNT(*) AS issued_count,
         SUM(CASE WHEN c.status = 'used' THEN 1 ELSE 0 END) AS used_count
       FROM coupons c
       WHERE c.issued_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(c.issued_at, '%Y-%m')
       ORDER BY month ASC`
    );

    // 3. 지역별 쿠폰 소진 건수
    const [regionRows] = await pool.execute(
      `SELECT 
         m.address,
         COUNT(*) AS count
       FROM coupons c
       JOIN coupon_transactions ct ON c.id = ct.coupon_id
       JOIN merchants m ON ct.merchant_id = m.id
       WHERE c.status = 'used'
       GROUP BY m.address`
    );

    // 4. 우수 가맹점 Top 5
    const [topMerchants] = await pool.execute(
      `SELECT 
         m.name,
         m.address,
         COUNT(ct.id) AS tx_count,
         COALESCE(SUM(ct.amount), 0) AS total_amount
       FROM merchants m
       LEFT JOIN coupon_transactions ct ON m.id = ct.merchant_id
       WHERE m.status = 'approved'
       GROUP BY m.id, m.name, m.address
       ORDER BY tx_count DESC, total_amount DESC
       LIMIT 5`
    );

    // 지역 데이터 파싱 (인천 옹진군 백령면 -> 백령면 추출)
    const regionMap = {};
    for (const row of regionRows) {
      const addr = row.address || '';
      const parts = addr.split(' ');
      // '면' 또는 '구' 등으로 끝나는 단어 찾기
      const region = parts.find(p => p.endsWith('면') || p.endsWith('구') || p.endsWith('동') || p.endsWith('군') || p.endsWith('시')) || '기타';
      regionMap[region] = (regionMap[region] || 0) + row.count;
    }
    const regionData = Object.entries(regionMap).map(([name, value]) => ({ name, value }));

    res.json({
      success: true,
      data: {
        kpis: {
          totalIssued: kpiStats.total_issued || 0,
          totalUsed: kpiStats.total_used || 0,
          totalSettled: Number(kpiStats.total_settled || 0),
          activeMerchants: activeMerchants.count || 0
        },
        monthlyTrend: monthlyRows,
        regionDistribution: regionData,
        topMerchants
      }
    });
  } catch (err) { next(err); }
});

// ── 1. 관광 정책 고도화 종합 보고서 API ─────────
router.get('/stats/advanced-reports', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    // A. 관광지(발행지점/키오스크)별 방문객 및 쿠폰 발행·소진 현황
    const [spotRows] = await pool.execute(
      `SELECT 
         COALESCE(pc.issued_by_location, i.name, '옹진 관광지 키오스크') AS spot_name,
         COUNT(c.id) AS total_issued_count,
         SUM(c.face_value) AS total_issued_amount,
         SUM(CASE WHEN c.status = 'used' THEN 1 ELSE 0 END) AS total_used_count,
         SUM(CASE WHEN c.status = 'used' THEN c.face_value ELSE 0 END) AS total_used_amount,
         ROUND(SUM(CASE WHEN c.status = 'used' THEN 1 ELSE 0 END) / COUNT(c.id) * 100, 1) AS burn_rate
       FROM coupons c
       LEFT JOIN paper_coupons pc ON c.code_hash = pc.random_code_hash
       LEFT JOIN issuer_allocations ia ON c.issuer_allocation_id = ia.id
       LEFT JOIN issuers i ON ia.issuer_id = i.id
       GROUP BY spot_name
       ORDER BY total_issued_count DESC`
    );

    // B. 업종별 소비 건수 및 금액
    const [categoryRows] = await pool.execute(
      `SELECT 
         COALESCE(m.category, '기타') AS category,
         COUNT(ct.id) AS tx_count,
         COALESCE(SUM(ct.amount), 0) AS total_amount,
         ROUND(COALESCE(AVG(ct.amount), 0)) AS avg_amount
       FROM coupon_transactions ct
       JOIN merchants m ON ct.merchant_id = m.id
       GROUP BY category
       ORDER BY total_amount DESC`
    );

    // C. 4대 권역별 소비 패턴 (덕적권, 자월권, 백령·대청권, 영흥·연평권)
    const [merchantTxRows] = await pool.execute(
      `SELECT 
         m.address,
         ct.amount
       FROM coupon_transactions ct
       JOIN merchants m ON ct.merchant_id = m.id`
    );

    const zoneStats = {
      '덕적권': { name: '덕적권 (덕적·소야·굴업)', totalAmount: 0, txCount: 0 },
      '자월권': { name: '자월권 (자월·이작·승봉)', totalAmount: 0, txCount: 0 },
      '백령·대청권': { name: '백령·대청권 (백령·대청·소청)', totalAmount: 0, txCount: 0 },
      '영흥·연평권': { name: '영흥·연평권 (영흥·연평)', totalAmount: 0, txCount: 0 },
      '기타권역': { name: '기타 도서 권역', totalAmount: 0, txCount: 0 }
    };

    for (const row of merchantTxRows) {
      const addr = row.address || '';
      let zoneKey = '기타권역';
      if (addr.includes('덕적') || addr.includes('소야') || addr.includes('굴업')) zoneKey = '덕적권';
      else if (addr.includes('자월') || addr.includes('이작') || addr.includes('승봉')) zoneKey = '자월권';
      else if (addr.includes('백령') || addr.includes('대청') || addr.includes('소청')) zoneKey = '백령·대청권';
      else if (addr.includes('영흥') || addr.includes('연평')) zoneKey = '영흥·연평권';

      zoneStats[zoneKey].totalAmount += Number(row.amount || 0);
      zoneStats[zoneKey].txCount += 1;
    }

    // D. 인기 가맹점 Top 10
    const [topMerchants] = await pool.execute(
      `SELECT 
         m.id,
         m.name,
         m.category,
         m.address,
         COUNT(ct.id) AS tx_count,
         COALESCE(SUM(ct.amount), 0) AS total_amount
       FROM merchants m
       JOIN coupon_transactions ct ON m.id = ct.merchant_id
       GROUP BY m.id, m.name, m.category, m.address
       ORDER BY total_amount DESC, tx_count DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        spots: spotRows,
        categories: categoryRows,
        zones: Object.values(zoneStats),
        topMerchants
      }
    });
  } catch (err) { next(err); }
});

// ── 2. 쿠폰 발행 예산 관리 및 실시간 소진율 API ─────────
router.get('/budget/current', authenticate, authorize('admin'), async (req, res, next) => {
  const targetMonth = req.query.month || new Date().toISOString().substring(0, 7); // 'YYYY-MM'
  try {
    // 1. 해당 월 예산 설정 조회
    const [budgets] = await pool.execute(
      'SELECT * FROM monthly_budgets WHERE `year_month` = ? LIMIT 1',
      [targetMonth]
    );

    let budget = budgets[0];
    if (!budget) {
      // 등록된 예산이 없는 경우 기본 5,000만원으로 생성
      await pool.execute(
        'INSERT INTO monthly_budgets (`year_month`, allocated_budget, warning_threshold_percent, danger_threshold_percent, notes) VALUES (?, 50000000, 80, 95, "기본 정책 예산")',
        [targetMonth]
      );
      const [newBudgets] = await pool.execute('SELECT * FROM monthly_budgets WHERE `year_month` = ? LIMIT 1', [targetMonth]);
      budget = newBudgets[0];
    }

    // 2. 당월 실제 발행액 및 정산 사용액 집계
    const [[usageStats]] = await pool.execute(
      `SELECT 
         COALESCE(SUM(c.face_value), 0) AS monthly_issued_amount,
         COALESCE(SUM(CASE WHEN c.status = 'used' THEN c.face_value ELSE 0 END), 0) AS monthly_used_amount,
         COUNT(c.id) AS monthly_issued_count,
         SUM(CASE WHEN c.status = 'used' THEN 1 ELSE 0 END) AS monthly_used_count
       FROM coupons c
       WHERE DATE_FORMAT(c.issued_at, '%Y-%m') = ?`,
      [targetMonth]
    );

    const allocatedBudget = Number(budget.allocated_budget);
    const usedAmount = Number(usageStats.monthly_used_amount);
    const issuedAmount = Number(usageStats.monthly_issued_amount);
    const remainingBudget = Math.max(0, allocatedBudget - usedAmount);
    const burnRatePercent = allocatedBudget > 0 ? Number(((usedAmount / allocatedBudget) * 100).toFixed(1)) : 0;
    const issueRatePercent = allocatedBudget > 0 ? Number(((issuedAmount / allocatedBudget) * 100).toFixed(1)) : 0;

    // 3. 상태 판정 (safe, warning, danger)
    let status = 'safe';
    let statusMessage = '예산 집행이 정상 범위에서 안정적으로 관리되고 있습니다.';
    if (burnRatePercent >= budget.danger_threshold_percent) {
      status = 'danger';
      statusMessage = `🚨 예산 소진 위험! (소진율 ${burnRatePercent}%) — 발행 한도 제한 또는 예산 증액을 즉시 검토하세요.`;
    } else if (burnRatePercent >= budget.warning_threshold_percent) {
      status = 'warning';
      statusMessage = `⚠️ 예산 소진 주의! (소진율 ${burnRatePercent}%) — 일일 발행 속도 모니터링이 필요합니다.`;
    }

    // 4. 일평균 소진 속도 및 완전 소진 예상 D-Day 계산
    const [[recentDailyStats]] = await pool.execute(
      `SELECT 
         COALESCE(SUM(amount) / 7, 0) AS avg_daily_burn
       FROM coupon_transactions
       WHERE scanned_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    const avgDailyBurn = Math.max(10000, Number(recentDailyStats.avg_daily_burn || 500000));
    const projectedDaysLeft = remainingBudget > 0 ? Math.round(remainingBudget / avgDailyBurn) : 0;

    res.json({
      success: true,
      data: {
        yearMonth: targetMonth,
        allocatedBudget,
        issuedAmount,
        usedAmount,
        remainingBudget,
        burnRatePercent,
        issueRatePercent,
        warningThreshold: budget.warning_threshold_percent,
        dangerThreshold: budget.danger_threshold_percent,
        status,
        statusMessage,
        avgDailyBurn,
        projectedDaysLeft,
        notes: budget.notes
      }
    });
  } catch (err) { next(err); }
});

// 예산 설정 저장/업데이트 API
router.post('/budget/set', authenticate, authorize('admin'), async (req, res, next) => {
  const { yearMonth, allocatedBudget, warningThreshold = 80, dangerThreshold = 95, notes } = req.body;
  if (!yearMonth || !allocatedBudget) {
    return res.status(400).json({ success: false, message: '연월(YYYY-MM)과 배정 예산액은 필수입니다.' });
  }

  try {
    await pool.execute(
      `INSERT INTO monthly_budgets (\`year_month\`, allocated_budget, warning_threshold_percent, danger_threshold_percent, notes)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         allocated_budget = VALUES(allocated_budget),
         warning_threshold_percent = VALUES(warning_threshold_percent),
         danger_threshold_percent = VALUES(danger_threshold_percent),
         notes = VALUES(notes)`,
      [yearMonth, parseInt(allocatedBudget, 10), parseInt(warningThreshold, 10), parseInt(dangerThreshold, 10), notes || null]
    );

    res.json({ success: true, message: `${yearMonth} 예산 설정이 성공적으로 저장되었습니다.` });
  } catch (err) { next(err); }
});

// ── 3. 관광객 방문 패턴 및 동선 흐름(Flow) 분석 API ─────────
router.get('/stats/tourist-flow', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    // 관광지 매표소(출발지) ➔ 가맹점 상권(도착지) 연계 매핑
    const [flowRows] = await pool.execute(
      `SELECT 
         COALESCE(pc.issued_by_location, i.name, '옹진 관광지 매표소') AS origin_spot,
         m.name AS dest_merchant,
         COALESCE(m.category, '기타') AS dest_category,
         m.address AS dest_address,
         COUNT(ct.id) AS flow_count,
         SUM(ct.amount) AS flow_amount,
         ROUND(AVG(TIMESTAMPDIFF(MINUTE, c.issued_at, ct.scanned_at))) AS avg_duration_minutes
       FROM coupon_transactions ct
       JOIN coupons c ON ct.coupon_id = c.id
       JOIN merchants m ON ct.merchant_id = m.id
       LEFT JOIN paper_coupons pc ON c.code_hash = pc.random_code_hash
       LEFT JOIN issuer_allocations ia ON c.issuer_allocation_id = ia.id
       LEFT JOIN issuers i ON ia.issuer_id = i.id
       GROUP BY origin_spot, dest_merchant, dest_category, dest_address
       ORDER BY flow_count DESC, flow_amount DESC
       LIMIT 15`
    );

    // 전체 평균 이동 시간
    const [[avgDurationRow]] = await pool.execute(
      `SELECT 
         ROUND(AVG(TIMESTAMPDIFF(MINUTE, c.issued_at, ct.scanned_at))) AS overall_avg_minutes
       FROM coupon_transactions ct
       JOIN coupons c ON ct.coupon_id = c.id
       WHERE c.issued_at IS NOT NULL AND ct.scanned_at IS NOT NULL`
    );

    // 마케팅 타겟 인사이트 문구 자동 생성
    const insights = [];
    if (flowRows.length > 0) {
      const topFlow = flowRows[0];
      insights.push({
        type: 'top_path',
        title: '최대 이동 트래픽 경로',
        text: `관광객이 [${topFlow.origin_spot}] 방문 후 가장 많이 찾는 곳은 [${topFlow.dest_merchant}](${topFlow.dest_category})이며, 평균 ${topFlow.avg_duration_minutes || 90}분 내에 방문합니다.`
      });

      // 업종별 전환 분석
      const foodCount = flowRows.filter(r => r.dest_category === '음식점').reduce((a, b) => a + b.flow_count, 0);
      const cafeCount = flowRows.filter(r => r.dest_category === '카페').reduce((a, b) => a + b.flow_count, 0);
      const stayCount = flowRows.filter(r => r.dest_category === '숙박').reduce((a, b) => a + b.flow_count, 0);
      
      insights.push({
        type: 'category_pattern',
        title: '관광 연계 소비 업종 순위',
        text: `당일 매표 관광객의 소비는 음식점(${foodCount}건)과 카페(${cafeCount}건)에 집중되며, 체류형 숙박 소비(${stayCount}건)는 주로 주말 권역 패키지와 연계됩니다.`
      });

      insights.push({
        type: 'policy_recommendation',
        title: '옹진군 관광 마케팅 추천 제언',
        text: `매표소에서 발권 후 2시간 이내 인근 카페·음식점 방문율이 70%를 상회하므로, 관광지 티켓 바우처 뒷면에 "주변 10분 거리 추천 가맹점 3곳"을 직접 표기하면 지역 골목상권 유입 효과를 극대화할 수 있습니다.`
      });
    }

    res.json({
      success: true,
      data: {
        flows: flowRows,
        overallAvgMinutes: avgDurationRow?.overall_avg_minutes || 110,
        insights
      }
    });
  } catch (err) { next(err); }
});

// ── [SMS 연동 관리] 1. 알리고 연동 상태 및 발송 통계 조회 ─────────────
router.get('/sms/status', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const config = smsService.getAligoConfig();
    const remain = await smsService.getAligoRemain();

    // 큐 발송 통계 집계
    const [[stats]] = await pool.query(
      `SELECT
         COUNT(*) AS total_count,
         COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END), 0) AS today_total,
         COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() AND status = 'sent' THEN 1 ELSE 0 END), 0) AS today_sent,
         COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() AND status = 'pending' THEN 1 ELSE 0 END), 0) AS today_pending,
         COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() AND status = 'failed' THEN 1 ELSE 0 END), 0) AS today_failed
       FROM notification_queue`
    );

    res.json({
      success: true,
      data: {
        config: {
          isConfigured: config.isConfigured,
          userId: config.userId,
          maskedApiKey: config.maskedApiKey,
          sender: config.sender,
          maskedSender: config.maskedSender,
          testMode: config.testMode,
        },
        remain: {
          sms: remain.sms || 0,
          lms: remain.lms || 0,
          mms: remain.mms || 0,
          statusMessage: remain.message || '',
        },
        stats: {
          totalCount: Number(stats.total_count) || 0,
          todayTotal: Number(stats.today_total) || 0,
          todaySent: Number(stats.today_sent) || 0,
          todayPending: Number(stats.today_pending) || 0,
          todayFailed: Number(stats.today_failed) || 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── [SMS 연동 관리] 발송 대상자 목록 및 카운트 조회 ─────────────────
router.get('/sms/targets', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    // 1. 전체 회원 중 연락처가 있는 회원 목록
    const [users] = await pool.execute(
      `SELECT id, nickname, email, social_provider, COALESCE(phone, provider_id) AS phone_val
       FROM users
       WHERE role = 'tourist' AND status = 'active'
         AND (
           (phone IS NOT NULL AND phone != '') 
           OR (social_provider = 'phone' AND provider_id IS NOT NULL AND provider_id != '')
         )
       ORDER BY id DESC`
    );

    const validUsers = [];
    const seenUserPhones = new Set();
    for (const u of users) {
      const clean = String(u.phone_val || '').replace(/\D/g, '');
      if (clean.length >= 10 && clean.length <= 11 && clean.startsWith('01')) {
        validUsers.push({
          id: u.id,
          nickname: u.nickname || '회원',
          email: u.email || '',
          social_provider: u.social_provider,
          phone: u.phone_val,
          cleanPhone: clean,
        });
        seenUserPhones.add(clean);
      }
    }

    // 2. 전체 가맹점 중 연락처가 있는 가맹점 목록
    const [merchants] = await pool.execute(
      `SELECT id, name, owner_name, phone, category
       FROM merchants
       WHERE status = 'approved' AND phone IS NOT NULL AND phone != ''
       ORDER BY id DESC`
    );

    const validMerchants = [];
    const seenMerchantPhones = new Set();
    for (const m of merchants) {
      const clean = String(m.phone || '').replace(/\D/g, '');
      if (clean.length >= 10 && clean.length <= 11 && clean.startsWith('01')) {
        validMerchants.push({
          id: m.id,
          name: m.name,
          owner_name: m.owner_name || '',
          category: m.category || '',
          phone: m.phone,
          cleanPhone: clean,
        });
        seenMerchantPhones.add(clean);
      }
    }

    res.json({
      success: true,
      data: {
        usersCount: seenUserPhones.size,
        merchantsCount: seenMerchantPhones.size,
        users: validUsers,
        merchants: validMerchants,
      }
    });
  } catch (err) {
    next(err);
  }
});

// ── [SMS 연동 관리] 통합 문자 발송 (전체회원, 전체가맹점, 개별회원, 개별가맹점, 직접입력) ──
router.post('/sms/send', authenticate, authorize('admin'), async (req, res, next) => {
  const { targetType, targetId, receiver, message, title } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ success: false, message: '발송할 메시지 내용을 입력해주세요.' });
  }

  const cleanMessage = String(message).trim();
  const defaultTitle = '[옹진 관광쿠폰]';
  const smsTitle = title && String(title).trim() ? title.trim() : defaultTitle;

  try {
    let recipients = [];

    if (targetType === 'all_users') {
      // 1. 전체 회원 (관광객)
      const [rows] = await pool.execute(
        `SELECT id, nickname, COALESCE(phone, provider_id) AS phone_val
         FROM users
         WHERE role = 'tourist' AND status = 'active'
           AND (
             (phone IS NOT NULL AND phone != '') 
             OR (social_provider = 'phone' AND provider_id IS NOT NULL AND provider_id != '')
           )`
      );

      const seen = new Set();
      for (const r of rows) {
        const clean = String(r.phone_val || '').replace(/\D/g, '');
        if (clean.length >= 10 && clean.length <= 11 && clean.startsWith('01') && !seen.has(clean)) {
          seen.add(clean);
          recipients.push({
            id: r.id,
            name: r.nickname || '회원',
            phone: r.phone_val,
            cleanPhone: clean,
            type: 'USER'
          });
        }
      }

      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: '연락처가 등록된 정상 회원이 없습니다.' });
      }

    } else if (targetType === 'all_merchants') {
      // 2. 전체 가맹점 (승인 가맹점)
      const [rows] = await pool.execute(
        `SELECT id, name, owner_name, phone, username
         FROM merchants
         WHERE status = 'approved' AND phone IS NOT NULL AND phone != ''`
      );

      const seen = new Set();
      for (const r of rows) {
        const clean = String(r.phone || '').replace(/\D/g, '');
        if (clean.length >= 10 && clean.length <= 11 && clean.startsWith('01') && !seen.has(clean)) {
          seen.add(clean);
          recipients.push({
            id: r.id,
            name: r.name,
            owner_name: r.owner_name || '',
            username: r.username || '',
            phone: r.phone,
            cleanPhone: clean,
            type: 'MERCHANT'
          });
        }
      }

      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: '연락처가 등록된 승인 가맹점이 없습니다.' });
      }

    } else if (targetType === 'user') {
      // 3. 개별 회원
      let userPhone = receiver;
      let userName = '회원';
      if (targetId) {
        const [[u]] = await pool.execute(
          `SELECT id, nickname, COALESCE(phone, provider_id) AS phone_val FROM users WHERE id = ?`,
          [targetId]
        );
        if (u) {
          userName = u.nickname || '회원';
          if (!userPhone) userPhone = u.phone_val;
        }
      }

      const clean = String(userPhone || '').replace(/\D/g, '');
      if (clean.length < 10 || clean.length > 11 || !clean.startsWith('01')) {
        return res.status(400).json({ success: false, message: '유효한 수신 회원 휴대폰 번호가 아닙니다.' });
      }

      recipients.push({
        id: targetId || null,
        name: userName,
        phone: userPhone,
        cleanPhone: clean,
        type: 'USER'
      });

    } else if (targetType === 'merchant') {
      // 4. 개별 가맹점
      let merchantPhone = receiver;
      let merchantName = '가맹점';
      if (targetId) {
        const [[m]] = await pool.execute(
          `SELECT id, name, owner_name, phone FROM merchants WHERE id = ?`,
          [targetId]
        );
        if (m) {
          merchantName = m.name;
          if (!merchantPhone) merchantPhone = m.phone;
        }
      }

      const clean = String(merchantPhone || '').replace(/\D/g, '');
      if (clean.length < 10 || clean.length > 11 || !clean.startsWith('01')) {
        return res.status(400).json({ success: false, message: '유효한 가맹점 연락처가 아닙니다.' });
      }

      recipients.push({
        id: targetId || null,
        name: merchantName,
        username: merchantUsername,
        phone: merchantPhone,
        cleanPhone: clean,
        type: 'MERCHANT'
      });

    } else if (targetType === 'excel') {
      // 5. 엑셀 업로드 대량 발송
      const uploadList = Array.isArray(req.body.recipients) ? req.body.recipients : [];
      if (uploadList.length === 0) {
        return res.status(400).json({ success: false, message: '엑셀에서 추출된 수신자 목록이 없습니다.' });
      }

      const seen = new Set();
      for (const item of uploadList) {
        const rawPhone = item.phone || item.cleanPhone;
        const clean = String(rawPhone || '').replace(/\D/g, '');
        if (clean.length >= 10 && clean.length <= 11 && clean.startsWith('01') && !seen.has(clean)) {
          seen.add(clean);
          recipients.push({
            id: null,
            name: (item.name && String(item.name).trim()) || '수신자',
            phone: rawPhone,
            cleanPhone: clean,
            type: 'EXCEL'
          });
        }
      }

      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: '엑셀 데이터 중 유효한 휴대폰 번호(010 등 10~11자리)가 없습니다.' });
      }

    } else {
      // 6. 직접 입력 (direct)
      const clean = String(receiver || '').replace(/\D/g, '');
      if (clean.length < 10 || clean.length > 11 || !clean.startsWith('01')) {
        return res.status(400).json({ success: false, message: '올바른 휴대폰 번호 10~11자리를 입력해주세요.' });
      }

      recipients.push({
        id: null,
        name: '직접입력',
        phone: receiver,
        cleanPhone: clean,
        type: 'DIRECT'
      });
    }

    // 발송 실행 및 notification_queue 기록
    let successCount = 0;
    let failCount = 0;
    let lastError = null;

    const INITIAL_PW_MAP = {
      'jw9998': 'jm999824', 'jw2519': 'jm251935', 'jw7573': 'jm757341', 'jw6661': 'jm666152',
      'jw1367': 'jm136763', 'jw4080': 'jm408074', 'jw9415': 'jm941585', 'jw3365': 'jm336596',
      'dj5794': 'dk579412', 'dj9195': 'dk919523', 'dj0050': 'dk005034', 'dj6500': 'dk650045',
      'dj1546': 'dk154656', 'dj8704': 'dk870467', 'dj9908': 'dk990878', 'dj8181': 'dk818189',
      'dj6453a': 'dk645390', 'dj6453b': 'dk645390', 'dj1164': 'dk116421', 'dj5995': 'dk599532',
      'dj5151': 'dk515143', 'dj8242': 'dk824211', 'dj9688': 'dk968822', 'dj1204': 'dk120433',
      'dj6516': 'dk6516',
      'dj7323': 'dk7323'
    };
    for (const r of recipients) {
      const personalizedMsg = cleanMessage
        .replace(/\{상호명\}/g, r.name || '가맹점')
        .replace(/\{아이디\}/g, r.username || '(휴대폰번호 인증)')
        .replace(/\{초기비밀번호\}/g, INITIAL_PW_MAP[r.username] || '(휴대폰번호 인증)');
      try {
        await smsService.sendSMS(r.cleanPhone, personalizedMsg, smsTitle);
        successCount++;

        try {
          await pool.execute(
            `INSERT INTO notification_queue (type, recipient, message, template_id, status, created_at, sent_at)
             VALUES ('sms', ?, ?, ?, 'sent', NOW(), NOW())`,
            [r.cleanPhone, personalizedMsg, `SMS_${(targetType || 'direct').toUpperCase()}`]
          );
        } catch (e) {
          console.warn('[notification_queue insert failed]', e.message);
        }
      } catch (err) {
        failCount++;
        lastError = err.message;
        try {
          await pool.execute(
            `INSERT INTO notification_queue (type, recipient, message, template_id, status, last_error, created_at)
             VALUES ('sms', ?, ?, ?, 'failed', ?, NOW())`,
            [r.cleanPhone, personalizedMsg, `SMS_${(targetType || 'direct').toUpperCase()}`, err.message]
          );
        } catch (e) {}
      }
    }

    // 관리자 감사 로그 기록
    const targetLabelMap = {
      all_users: `전체 회원(${successCount}명)`,
      all_merchants: `전체 가맹점(${successCount}개소)`,
      user: `개별 회원 '${recipients[0]?.name}'`,
      merchant: `개별 가맹점 '${recipients[0]?.name}'`,
      excel: `엑셀 업로드(${successCount}명)`,
      direct: `직접 입력 (${recipients[0]?.cleanPhone})`,
    };

    await recordAuditLog(
      req.user.id,
      'SMS_SEND',
      `문자 발송 [${targetLabelMap[targetType] || targetType}] 성공 ${successCount}건, 실패 ${failCount}건 | 제목: ${smsTitle}`,
      getClientIp(req)
    );

    if (successCount === 0 && failCount > 0) {
      return res.status(500).json({
        success: false,
        message: `문자 발송에 실패했습니다: ${lastError}`,
        total: recipients.length,
        sent: 0,
        failed: failCount,
      });
    }

    let responseMsg = '';
    if (targetType === 'all_users') {
      responseMsg = `전체 회원 총 ${successCount}명에게 문자가 성공적으로 발송되었습니다.${failCount > 0 ? ` (실패 ${failCount}건)` : ''}`;
    } else if (targetType === 'all_merchants') {
      responseMsg = `전체 가맹점 총 ${successCount}개소에 문자가 성공적으로 발송되었습니다.${failCount > 0 ? ` (실패 ${failCount}건)` : ''}`;
    } else if (targetType === 'excel') {
      responseMsg = `엑셀 업로드 대상자 총 ${successCount}명에게 문자가 성공적으로 발송되었습니다.${failCount > 0 ? ` (실패 ${failCount}건)` : ''}`;
    } else if (targetType === 'user') {
      responseMsg = `회원 '${recipients[0]?.name}' (${recipients[0]?.phone}) 님께 문자가 발송되었습니다.`;
    } else if (targetType === 'merchant') {
      responseMsg = `가맹점 '${recipients[0]?.name}' (${recipients[0]?.phone}) 대표자 번호로 문자가 발송되었습니다.`;
    } else {
      responseMsg = `'${recipients[0]?.phone}' 번호로 문자가 성공적으로 발송되었습니다.`;
    }

    res.json({
      success: true,
      message: responseMsg,
      total: recipients.length,
      sent: successCount,
      failed: failCount,
    });

  } catch (err) {
    next(err);
  }
});

// ── [SMS 연동 관리] 2. 관리자 테스트 문자 발송 ────────────────────────
router.post('/sms/test-send', authenticate, authorize('admin'), async (req, res, next) => {
  const { receiver, message, title } = req.body;

  if (!receiver || !String(receiver).trim()) {
    return res.status(400).json({ success: false, message: '수신자 전화번호를 입력해주세요.' });
  }
  if (!message || !String(message).trim()) {
    return res.status(400).json({ success: false, message: '발송할 메시지 내용을 입력해주세요.' });
  }

  const cleanReceiver = String(receiver).replace(/\D/g, '');
  if (cleanReceiver.length < 10 || cleanReceiver.length > 11) {
    return res.status(400).json({ success: false, message: '올바른 휴대폰 번호 10~11자리를 입력해주세요.' });
  }

  try {
    const result = await smsService.sendSMS(cleanReceiver, message.trim(), title || '[옹진관광] 테스트 발송');

    try {
      await pool.execute(
        `INSERT INTO notification_queue (type, recipient, message, template_id, status, created_at, sent_at)
         VALUES ('sms', ?, ?, 'DIRECT_TEST', 'sent', NOW(), NOW())`,
        [cleanReceiver, message.trim()]
      );
    } catch (e) {}

    // 감사 로그 기록
    await recordAuditLog(
      req.user.id,
      'SMS_TEST_SEND',
      `테스트 문자 발송 (${smsService.maskPhone(cleanReceiver)})`,
      getClientIp(req)
    );

    res.json({
      success: true,
      message: result.mock
        ? '개발 모의 발송되었습니다. (알리고 환경변수 등록 시 실제 발송됩니다)'
        : '테스트 문자가 성공적으로 발송되었습니다.',
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || '문자 발송 중 오류가 발생했습니다.',
    });
  }
});

// ── [SMS 연동 관리] 3. 발송 이력 (notification_queue) 페이징 조회 ─────
router.get('/sms/history', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit, 10) || 15));
    const offset = (page - 1) * limit;
    const status = (req.query.status || 'all').trim();
    const search = (req.query.search || '').trim();

    let whereClause = '1=1';
    const params = [];

    if (status !== 'all' && ['pending', 'sent', 'failed'].includes(status)) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      const cleanSearch = search.replace(/\D/g, '');
      if (cleanSearch) {
        whereClause += ' AND (recipient LIKE ? OR message LIKE ?)';
        params.push(`%${cleanSearch}%`, `%${search}%`);
      } else {
        whereClause += ' AND message LIKE ?';
        params.push(`%${search}%`);
      }
    }

    // 총 건수
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM notification_queue WHERE ${whereClause}`,
      params
    );

    // 목록 조회
    const [rows] = await pool.query(
      `SELECT id, type, recipient, message, template_id, status, retry_count, last_error, created_at, sent_at
       FROM notification_queue
       WHERE ${whereClause}
       ORDER BY id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    // 관리자 페이지: 수신번호 마스킹 해제 (전체 번호 및 하이픈 포맷 적용)
    const formattedRows = rows.map(row => {
      const formatted = smsService.formatPhone ? smsService.formatPhone(row.recipient) : row.recipient;
      return {
        ...row,
        recipient: formatted,
        recipientMasked: formatted, // 기존 필드명 호환성 보장
      };
    });

    res.json({
      success: true,
      data: {
        items: formattedRows,
        pagination: {
          total: Number(total),
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── [SMS 연동 관리] 4. 실패 건 재발송 큐 등록 ─────────────────────────
router.post('/sms/retry/:id', authenticate, authorize('admin'), async (req, res, next) => {
  const queueId = parseInt(req.params.id, 10);
  if (!queueId) {
    return res.status(400).json({ success: false, message: '유효한 알림 ID를 지정해주세요.' });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE notification_queue
       SET status = 'pending', retry_count = 0, last_error = NULL
       WHERE id = ?`,
      [queueId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '해당 알림 내역을 찾을 수 없습니다.' });
    }

    await recordAuditLog(
      req.user.id,
      'SMS_RETRY',
      `알림 재발송 큐 등록 (ID: ${queueId})`,
      getClientIp(req)
    );

    res.json({ success: true, message: '재발송 대기열에 등록되었습니다. 잠시 후 전송됩니다.' });
  } catch (err) {
    next(err);
  }
});


// ── [자월면 가맹점 계정/비밀번호 관리 전용 API] ─────────────────────────
// 1. 자월면 가맹점 목록 조회
router.get('/jawol-merchants', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, username, phone, owner_name, category, address, island, status,
              (password_hash IS NOT NULL) as has_password,
              applied_at, approved_at
       FROM merchants
       WHERE island = '자월면' OR address LIKE '%자월%'
       ORDER BY id ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// 2. 가맹점 비밀번호/아이디 변경
router.post('/jawol-merchants/:id/password', authenticate, authorize('admin'), async (req, res, next) => {
  const { password, username } = req.body;
  if (!password || !String(password).trim()) {
    return res.status(400).json({ success: false, message: '변경할 비밀번호를 입력해주세요.' });
  }
  const cleanPw = String(password).trim();
  if (cleanPw.length < 4) {
    return res.status(400).json({ success: false, message: '비밀번호는 최소 4자리 이상이어야 합니다.' });
  }

  try {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(cleanPw, 10);
    const cleanUsername = username ? String(username).trim() : null;

    if (cleanUsername) {
      await pool.execute(
        `UPDATE merchants SET password_hash = ?, username = ? WHERE id = ?`,
        [hash, cleanUsername, req.params.id]
      );
    } else {
      await pool.execute(
        `UPDATE merchants SET password_hash = ? WHERE id = ?`,
        [hash, req.params.id]
      );
    }

    const [[m]] = await pool.execute(
      `SELECT id, name, username, phone, (password_hash IS NOT NULL) as has_password FROM merchants WHERE id = ?`,
      [req.params.id]
    );

    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminName: req.user.name,
      adminRole: req.user.role,
      actionType: 'UPDATE',
      pageUrl: '/admin/jawol-merchants.html',
      pageTitle: '자월면 가맹점 계정 관리',
      targetResource: 'merchants',
      targetId: String(req.params.id),
      actionDetail: `자월면 가맹점 '${m.name}' 비밀번호 변경 적용 (아이디: ${m.username || '미설정'})`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('[AuditLog Error]', err));

    res.json({
      success: true,
      message: `'${m.name}' 비밀번호가 성공적으로 변경되었습니다.`,
      merchant: m
    });
  } catch (err) { next(err); }
});

// 3. 자월면 전체 일괄 초기화
router.post('/jawol-merchants/batch-reset', authenticate, authorize('admin'), async (req, res, next) => {
  const { pattern = 'jm{phone4}' } = req.body;
  try {
    const bcrypt = require('bcryptjs');
    const [rows] = await pool.query(
      `SELECT id, name, username, phone FROM merchants WHERE island = '자월면' OR address LIKE '%자월%'`
    );

    const updatedList = [];
    for (const m of rows) {
      const cleanPhone = (m.phone || '').replace(/\D/g, '');
      const last4 = cleanPhone.slice(-4) || '1234';
      const newPw = pattern.replace('{phone4}', last4);
      const defaultUsername = m.username || `jw${last4}`;
      const hash = await bcrypt.hash(newPw, 10);

      await pool.execute(
        `UPDATE merchants SET password_hash = ?, username = ? WHERE id = ?`,
        [hash, defaultUsername, m.id]
      );

      updatedList.push({
        id: m.id,
        name: m.name,
        username: defaultUsername,
        phone: m.phone,
        newPassword: newPw
      });
    }

    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username,
      adminName: req.user.name,
      adminRole: req.user.role,
      actionType: 'UPDATE',
      pageUrl: '/admin/jawol-merchants.html',
      pageTitle: '자월면 가맹점 계정 관리',
      targetResource: 'merchants',
      targetId: 'batch',
      actionDetail: `자월면 가맹점 전체 ${updatedList.length}개소 비밀번호 일괄 초기화 적용`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('[AuditLog Error]', err));

    res.json({
      success: true,
      message: `자월면 전체 ${updatedList.length}개 가맹점의 비밀번호가 일괄 초기화되었습니다.`,
      data: updatedList
    });
  } catch (err) { next(err); }
});

module.exports = router;


