const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 도서/면별 대표 좌표 폴백 헬퍼
function resolveCoordinates(m) {
  if (m.lat && m.lng && !isNaN(Number(m.lat)) && !isNaN(Number(m.lng)) && Number(m.lat) !== 0) {
    return { lat: Number(m.lat), lng: Number(m.lng) };
  }
  const addr = (m.address || '') + ' ' + (m.name || '');
  if (addr.includes('백령')) return { lat: 37.9724, lng: 124.6830 };
  if (addr.includes('대청') || addr.includes('소청')) return { lat: 37.8291, lng: 124.7098 };
  if (addr.includes('연평')) return { lat: 37.6704, lng: 125.6870 };
  if (addr.includes('소야')) return { lat: 37.2206, lng: 126.1732 };
  if (addr.includes('덕적')) return { lat: 37.2283, lng: 126.1439 };
  if (addr.includes('자월') || addr.includes('이작') || addr.includes('승봉')) return { lat: 37.2511, lng: 126.3107 };
  if (addr.includes('영흥') || addr.includes('선재')) return { lat: 37.2536, lng: 126.4950 };
  if (addr.includes('신도') || addr.includes('시도') || addr.includes('모도') || addr.includes('장봉') || addr.includes('북도')) return { lat: 37.5372, lng: 126.4178 };
  return { lat: 37.2283, lng: 126.1439 }; // 기본 덕적면 진리 도로 위
}

// 주소/상호명 기반 도서명 판정 헬퍼
function resolveIslandName(m) {
  const addr = (m.address || '') + ' ' + (m.name || '');
  if (addr.includes('백령')) return '백령도';
  if (addr.includes('대청')) return '대청도';
  if (addr.includes('소청')) return '소청도';
  if (addr.includes('연평')) return '연평도';
  if (addr.includes('덕적') || addr.includes('소야')) return '덕적도';
  if (addr.includes('자월') || addr.includes('이작') || addr.includes('승봉')) return '자월도';
  if (addr.includes('영흥') || addr.includes('선재')) return '영흥도';
  if (addr.includes('신도') || addr.includes('시도') || addr.includes('모도') || addr.includes('장봉') || addr.includes('북도')) return '북도면';
  return '옹진군';
}

// 지도에서 사용할 승인된 가맹점 목록 (인증 불필요)
router.get('/map', async (req, res, next) => {
  const { q, lite } = req.query;
  const isLite = lite === '1' || lite === 'true';
  try {
    let sql = isLite
      ? `SELECT id, name, address, category, lat, lng, phone, store_phone, description, business_hours
         FROM merchants WHERE status = 'approved'`
      : `SELECT id, name, address, category, lat, lng, phone, store_phone, description, business_hours, images
         FROM merchants WHERE status = 'approved'`;
    const params = [];
    if (q) {
      sql += ` AND (name LIKE ? OR address LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ' LIMIT 200';
    const [rows] = await pool.execute(sql, params);

    if (rows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const menuMap = {};
    if (!isLite) {
      const merchantIds = rows.map(r => r.id);
      const placeholders = merchantIds.map(() => '?').join(',');
      const [menuRows] = await pool.execute(
        `SELECT id, merchant_id, name, price, description, image_url, is_signature, sort_order
         FROM merchant_menus
         WHERE merchant_id IN (${placeholders})
         ORDER BY sort_order ASC, id ASC`,
        merchantIds
      );

      for (const menu of menuRows) {
        if (!menuMap[menu.merchant_id]) {
          menuMap[menu.merchant_id] = [];
        }
        menuMap[menu.merchant_id].push(menu);
      }
    }

    // 결과 매핑 및 좌표 폴백 적용
    const result = rows.map(m => {
      let parsedImages = [];
      if (!isLite && m.images) {
        if (Array.isArray(m.images)) {
          parsedImages = m.images;
        } else {
          try {
            parsedImages = JSON.parse(m.images);
          } catch (e) {
            parsedImages = [];
          }
        }
      }

      const coords = resolveCoordinates(m);
      const islandName = resolveIslandName(m);
      const effectivePhone = m.store_phone || m.phone || '032-899-2114';
      const mainThumb = (parsedImages.length > 0 && typeof parsedImages[0] === 'string' && parsedImages[0].trim())
        ? parsedImages[0].trim()
        : null;

      if (isLite) {
        return {
          id: m.id,
          name: m.name,
          address: m.address,
          category: m.category,
          lat: coords.lat,
          lng: coords.lng,
          island_name: islandName,
          phone: effectivePhone,
          description: m.description,
          business_hours: m.business_hours
        };
      }

      return {
        ...m,
        lat: coords.lat,
        lng: coords.lng,
        island_name: islandName,
        phone: effectivePhone,
        images: parsedImages,
        image_url: mainThumb,
        menus: menuMap[m.id] || []
      };
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// 단일 가맹점 상세 정보 조회 (인증 불필요)
router.get('/map/detail/:id', async (req, res, next) => {
  const merchantId = req.params.id;
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, address, category, lat, lng, phone, store_phone, description, business_hours, images
       FROM merchants WHERE id = ? AND status = 'approved' LIMIT 1`,
      [merchantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '가맹점을 찾을 수 없습니다.' });
    }

    const merchant = rows[0];
    let parsedImages = [];
    if (merchant.images) {
      if (Array.isArray(merchant.images)) {
        parsedImages = merchant.images;
      } else {
        try {
          parsedImages = JSON.parse(merchant.images);
        } catch (e) {
          parsedImages = [];
        }
      }
    }
    const coords = resolveCoordinates(merchant);
    merchant.lat = coords.lat;
    merchant.lng = coords.lng;
    merchant.island_name = resolveIslandName(merchant);
    merchant.phone = merchant.store_phone || merchant.phone || '032-899-2114';
    merchant.images = parsedImages;
    merchant.image_url = (parsedImages.length > 0 && typeof parsedImages[0] === 'string' && parsedImages[0].trim())
      ? parsedImages[0].trim()
      : null;

    const [menus] = await pool.execute(
      `SELECT id, merchant_id, name, price, description, image_url, is_signature, sort_order
       FROM merchant_menus
       WHERE merchant_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [merchantId]
    );
    merchant.menus = menus;

    res.json({ success: true, data: merchant });
  } catch (err) { next(err); }
});

module.exports = router;
