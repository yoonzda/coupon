const express = require('express');
const router = express.Router();
const merchantController = require('../controllers/merchantController');
const { authenticateJWT } = require('../middleware/auth'); // 인증 미들웨어

// 모든 가맹점 API는 인증 필요
router.use(authenticateJWT);

// 쿠폰 스캔 및 결제
router.post('/scan', merchantController.scanCoupon);

// 거래 내역 조회
router.get('/transactions', merchantController.getTransactions);

module.exports = router;
