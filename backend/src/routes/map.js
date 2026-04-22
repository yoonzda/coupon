const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 지도에서 사용할 승인된 가맹점 목록 (인증 불필요)
router.get('/map', async (req, res, next) => {
  const { q } = req.query;
  try {
    let sql = `SELECT id, name, address, category, lat, lng
               FROM merchants WHERE status = 'approved' AND lat IS NOT NULL`;
    const params = [];
    if (q) {
      sql += ` AND (name LIKE ? OR address LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ' LIMIT 200';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
