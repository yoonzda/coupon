const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { generateSettlementFiles } = require('../jobs/settlementJob');
const pool = require('../config/database');

// 정산 파일 수동 생성 (관리자 버튼)
router.post('/generate', authenticate, authorize('admin'), async (req, res, next) => {
  const settlementService = require('../services/settlementService');
  
  // 기본적으로 전월 정산 진행
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const period = req.body.period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  try {
    // 1. 정산 레코드 생성
    const { count } = await settlementService.generateMonthlySettlement(period);
    
    // 2. 생성된 레코드들에 대해 XML 파일 생성
    const [pendingRows] = await pool.execute(
      `SELECT id FROM settlements WHERE period = ? AND status = 'pending'`,
      [period]
    );

    for (const row of pendingRows) {
      await settlementService.generateSettlementFile(row.id);
    }

    res.json({ 
      success: true, 
      message: `${period} 기간 정산 파일 ${pendingRows.length}건 생성이 완료되었습니다.` 
    });
  } catch (err) { next(err); }
});

// 정산 내역 조회
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  const { period } = req.query;
  try {
    const [rows] = await pool.execute(
      `SELECT s.*, m.name AS merchant_name
       FROM settlements s JOIN merchants m ON m.id = s.merchant_id
       ${period ? 'WHERE s.period = ?' : ''}
       ORDER BY s.generated_at DESC`,
      period ? [period] : []
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
