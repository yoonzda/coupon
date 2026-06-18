const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const { authenticate } = require('../middleware/auth');
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
    await pool.execute(
      `UPDATE merchants SET 
        name = ?,
        owner_name = ?,
        phone = ?,
        phone_hash = ?,
        store_phone = ?,
        category = ?,
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
        shopName, ownerName, formattedPhone, phoneHash, formattedStorePhone, category, address, imagesJson,
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

// 쿠폰 스캔 및 결제
router.post('/scan', merchantController.scanCoupon);

// 거래 내역 조회
router.get('/transactions', merchantController.getTransactions);

module.exports = router;
