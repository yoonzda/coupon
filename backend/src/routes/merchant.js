const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const { authenticate } = require('../middleware/auth');

// 모든 가맹점 API는 인증 필요
router.use(authenticate);

// 쿠폰 스캔 및 결제
router.post('/scan', merchantController.scanCoupon);

// 거래 내역 조회
router.get('/transactions', merchantController.getTransactions);

module.exports = router;
