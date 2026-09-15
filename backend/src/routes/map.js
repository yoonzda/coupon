const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 지도 및 쿠폰 사용처에서 사용할 승인된 가맹점 목록
router.get('/map', async (req, res, next) => {
  const { q } = req.query;
  try {
    let sql = `SELECT id, name, owner_name, phone, address, category, lat, lng
               FROM merchants WHERE status = 'approved'`;
    const params = [];
    if (q) {
      sql += ` AND (name LIKE ? OR address LIKE ? OR owner_name LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY id DESC LIMIT 200';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;
