const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

// ── 유저 에이전트 파싱 헬퍼 ──────────────────────────────
function parseUserAgent(uaString) {
  if (!uaString) {
    return { deviceType: 'desktop', os: '기타', browser: '기타' };
  }

  const ua = uaString.toLowerCase();
  
  // 디바이스 판별
  let deviceType = 'desktop';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    deviceType = 'mobile';
  }

  // OS 판별
  let os = '기타';
  if (/windows nt 10/i.test(ua)) os = 'Windows 10/11';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // 브라우저 판별
  let browser = '기타';
  if (/kakaotalk/i.test(ua)) browser = 'KakaoTalk';
  else if (/naver/i.test(ua)) browser = 'Naver App';
  else if (/edg/i.test(ua)) browser = 'Edge';
  else if (/whale/i.test(ua)) browser = 'Whale';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return { deviceType, os, browser };
}

// ── 클라이언트 IP 추출 헬퍼 ─────────────────────────────
function extractClientIp(req) {
  const rawIp = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '';
  return typeof rawIp === 'string'
    ? rawIp.split(',')[0].trim().replace(/^::ffff:/, '')
    : '127.0.0.1';
}

// ── 토큰에서 선택적 유저 정보 복원 ───────────────────────
function extractOptionalUser(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'ongjin_local_jwt_secret_key_12345';
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch {
    return null;
  }
}

// =========================================================
// [공개 API] POST /api/stats/track — 방문 핑 수집
// =========================================================
router.post('/track', async (req, res) => {
  try {
    const { visitorId, pageUrl, pageTitle, referrer } = req.body || {};
    if (!visitorId || !pageUrl) {
      return res.status(200).json({ success: false, message: 'Invalid payload' });
    }

    const ip = extractClientIp(req);
    const uaString = req.headers['user-agent'] || '';
    const { deviceType, os, browser } = parseUserAgent(uaString);

    const user = extractOptionalUser(req);
    const userId = user?.id || null;
    const userRole = user?.role || (userId ? 'tourist' : 'guest');
    const userIdentifier = user?.name || user?.nickname || user?.username || (userId ? `회원#${userId}` : null);

    // 테이블 존재 여부 안전 체크 및 비동기 저장
    await pool.execute(
      `INSERT INTO visitor_logs 
        (visitor_id, user_id, user_role, user_identifier, page_url, page_title, referrer, ip_address, user_agent, device_type, os, browser, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        String(visitorId).substring(0, 64),
        userId,
        userRole,
        userIdentifier ? String(userIdentifier).substring(0, 100) : null,
        String(pageUrl).substring(0, 255),
        pageTitle ? String(pageTitle).substring(0, 255) : null,
        referrer ? String(referrer).substring(0, 500) : null,
        ip,
        uaString.substring(0, 500),
        deviceType,
        os,
        browser
      ]
    );

    res.json({ success: true });
  } catch (err) {
    // 트래킹 실패가 메인 앱 동작을 방해하지 않도록 에러 로깅 후 200 반환
    logger.warn(`[Stats Track Error] ${err.message}`);
    res.json({ success: false });
  }
});

// =========================================================
// [관리자 API] GET /api/admin/stats/visitors/summary
// 대시보드 및 상세 페이지 공통 핵심 지표 요약
// =========================================================
router.get('/visitors/summary', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    // 1. 오늘 & 어제 전체 방문자(UV) 및 페이지뷰(PV)
    const [[todayVisits]] = await pool.execute(
      `SELECT 
         COUNT(DISTINCT visitor_id) AS todayUv,
         COUNT(*) AS todayPv
       FROM visitor_logs 
       WHERE created_at >= CURDATE()`
    );

    const [[yesterdayVisits]] = await pool.execute(
      `SELECT 
         COUNT(DISTINCT visitor_id) AS yesterdayUv,
         COUNT(*) AS yesterdayPv
       FROM visitor_logs 
       WHERE created_at >= CURDATE() - INTERVAL 1 DAY AND created_at < CURDATE()`
    );

    // 2. 오늘 & 어제 회원 로그인/활동(DAU)
    // user_login_logs와 visitor_logs의 회원 ID를 결합하여 정확한 실 활동 회원 산출
    const [[todayMembers]] = await pool.execute(
      `SELECT COUNT(DISTINCT user_id) AS todayDau
       FROM (
         SELECT user_id FROM user_login_logs WHERE login_at >= CURDATE()
         UNION
         SELECT user_id FROM visitor_logs WHERE created_at >= CURDATE() AND user_id IS NOT NULL
       ) AS combined_today_users`
    );

    const [[yesterdayMembers]] = await pool.execute(
      `SELECT COUNT(DISTINCT user_id) AS yesterdayDau
       FROM (
         SELECT user_id FROM user_login_logs WHERE login_at >= CURDATE() - INTERVAL 1 DAY AND login_at < CURDATE()
         UNION
         SELECT user_id FROM visitor_logs WHERE created_at >= CURDATE() - INTERVAL 1 DAY AND created_at < CURDATE() AND user_id IS NOT NULL
       ) AS combined_yesterday_users`
    );

    // 3. 실시간 활성 접속자 (최근 10분 이내 활동)
    const [[realtimeRow]] = await pool.execute(
      `SELECT COUNT(DISTINCT visitor_id) AS realtimeCount
       FROM visitor_logs
       WHERE created_at >= NOW() - INTERVAL 10 MINUTE`
    );

    // 4. 금월 누적 방문자 (UV)
    const [[monthVisits]] = await pool.execute(
      `SELECT COUNT(DISTINCT visitor_id) AS monthUv, COUNT(*) AS monthPv
       FROM visitor_logs
       WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
    );

    // 5. 모바일 접속 비율 (%)
    const [[deviceRatio]] = await pool.execute(
      `SELECT 
         COUNT(*) AS totalCount,
         SUM(CASE WHEN device_type = 'mobile' THEN 1 ELSE 0 END) AS mobileCount
       FROM visitor_logs
       WHERE created_at >= CURDATE() - INTERVAL 7 DAY`
    );
    const totalCount = Number(deviceRatio.totalCount || 0);
    const mobileCount = Number(deviceRatio.mobileCount || 0);
    const mobileRate = totalCount > 0 ? ((mobileCount / totalCount) * 100).toFixed(1) : 0;

    // 전일 대비 증감율 계산
    const calcRate = (current, previous) => {
      const cur = Number(current || 0);
      const prev = Number(previous || 0);
      if (prev === 0) return cur > 0 ? '+100%' : '0%';
      const diff = (((cur - prev) / prev) * 100).toFixed(1);
      return diff > 0 ? `+${diff}%` : `${diff}%`;
    };

    res.json({
      success: true,
      data: {
        todayUv: Number(todayVisits.todayUv || 0),
        todayPv: Number(todayVisits.todayPv || 0),
        yesterdayUv: Number(yesterdayVisits.yesterdayUv || 0),
        yesterdayPv: Number(yesterdayVisits.yesterdayPv || 0),
        uvGrowthRate: calcRate(todayVisits.todayUv, yesterdayVisits.yesterdayUv),
        pvGrowthRate: calcRate(todayVisits.todayPv, yesterdayVisits.yesterdayPv),
        todayDau: Number(todayMembers.todayDau || 0),
        yesterdayDau: Number(yesterdayMembers.yesterdayDau || 0),
        dauGrowthRate: calcRate(todayMembers.todayDau, yesterdayMembers.yesterdayDau),
        realtimeCount: Number(realtimeRow.realtimeCount || 0),
        monthUv: Number(monthVisits.monthUv || 0),
        monthPv: Number(monthVisits.monthPv || 0),
        mobileRate: Number(mobileRate)
      }
    });
  } catch (err) {
    next(err);
  }
});

// =========================================================
// [관리자 API] GET /api/admin/stats/visitors/trend
// 기간별 접속 추이 (오늘 24시간 또는 7일/30일 일별 추이)
// =========================================================
router.get('/visitors/trend', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const period = req.query.period || '7d'; // 'today', '7d', '30d', 'custom'
    const customStart = req.query.startDate;
    const customEnd = req.query.endDate;

    if (period === 'today') {
      // 00시부터 23시까지 24시간대별 집계
      const [visitHourly] = await pool.execute(
        `SELECT 
           HOUR(created_at) AS hr,
           COUNT(DISTINCT visitor_id) AS uv,
           COUNT(*) AS pv
         FROM visitor_logs
         WHERE created_at >= CURDATE()
         GROUP BY HOUR(created_at)`
      );

      const [memberHourly] = await pool.execute(
        `SELECT 
           HOUR(login_time) AS hr,
           COUNT(DISTINCT user_id) AS dau
         FROM (
           SELECT login_at AS login_time, user_id FROM user_login_logs WHERE login_at >= CURDATE()
           UNION ALL
           SELECT created_at AS login_time, user_id FROM visitor_logs WHERE created_at >= CURDATE() AND user_id IS NOT NULL
         ) t
         GROUP BY HOUR(login_time)`
      );

      const hourMap = {};
      for (let i = 0; i < 24; i++) {
        hourMap[i] = { label: `${String(i).padStart(2, '0')}시`, uv: 0, pv: 0, dau: 0 };
      }
      visitHourly.forEach(r => {
        if (hourMap[r.hr]) {
          hourMap[r.hr].uv = Number(r.uv || 0);
          hourMap[r.hr].pv = Number(r.pv || 0);
        }
      });
      memberHourly.forEach(r => {
        if (hourMap[r.hr]) {
          hourMap[r.hr].dau = Number(r.dau || 0);
        }
      });

      const series = Object.values(hourMap);
      return res.json({
        success: true,
        data: {
          labels: series.map(s => s.label),
          uv: series.map(s => s.uv),
          pv: series.map(s => s.pv),
          dau: series.map(s => s.dau),
        }
      });
    }

    // 일별 추이 (7일, 30일, 커스텀)
    let days = 7;
    if (period === '30d') days = 30;

    let whereClause = `created_at >= CURDATE() - INTERVAL ? DAY`;
    let params = [days - 1];

    if (period === 'custom' && customStart && customEnd) {
      whereClause = `DATE(created_at) >= ? AND DATE(created_at) <= ?`;
      params = [customStart, customEnd];
    }

    const [visitDaily] = await pool.execute(
      `SELECT 
         DATE_FORMAT(created_at, '%Y-%m-%d') AS dt,
         COUNT(DISTINCT visitor_id) AS uv,
         COUNT(*) AS pv
       FROM visitor_logs
       WHERE ${whereClause}
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
       ORDER BY dt ASC`,
      params
    );

    let memberWhere = `login_time >= CURDATE() - INTERVAL ? DAY`;
    let memberParams = [days - 1];
    if (period === 'custom' && customStart && customEnd) {
      memberWhere = `DATE(login_time) >= ? AND DATE(login_time) <= ?`;
      memberParams = [customStart, customEnd];
    }

    const [memberDaily] = await pool.execute(
      `SELECT 
         DATE_FORMAT(login_time, '%Y-%m-%d') AS dt,
         COUNT(DISTINCT user_id) AS dau
       FROM (
         SELECT login_at AS login_time, user_id FROM user_login_logs
         UNION ALL
         SELECT created_at AS login_time, user_id FROM visitor_logs WHERE user_id IS NOT NULL
       ) t
       WHERE ${memberWhere}
       GROUP BY DATE_FORMAT(login_time, '%Y-%m-%d')
       ORDER BY dt ASC`,
      memberParams
    );

    // 날짜별 매핑
    const dailyMap = {};
    visitDaily.forEach(r => {
      dailyMap[r.dt] = {
        label: r.dt.substring(5), // 'MM-DD'
        fullDate: r.dt,
        uv: Number(r.uv || 0),
        pv: Number(r.pv || 0),
        dau: 0
      };
    });

    memberDaily.forEach(r => {
      if (!dailyMap[r.dt]) {
        dailyMap[r.dt] = {
          label: r.dt.substring(5),
          fullDate: r.dt,
          uv: 0,
          pv: 0,
          dau: 0
        };
      }
      dailyMap[r.dt].dau = Number(r.dau || 0);
    });

    const sortedDates = Object.keys(dailyMap).sort();
    const sortedSeries = sortedDates.map(k => dailyMap[k]);

    res.json({
      success: true,
      data: {
        labels: sortedSeries.map(s => s.label),
        fullDates: sortedSeries.map(s => s.fullDate),
        uv: sortedSeries.map(s => s.uv),
        pv: sortedSeries.map(s => s.pv),
        dau: sortedSeries.map(s => s.dau),
      }
    });
  } catch (err) {
    next(err);
  }
});

// =========================================================
// [관리자 API] GET /api/admin/stats/visitors/breakdown
// 디바이스, 브라우저, OS 및 상위 접속 페이지 분포
// =========================================================
router.get('/visitors/breakdown', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const period = req.query.period || '7d';
    const days = period === '30d' ? 30 : (period === 'today' ? 1 : 7);

    // 1. 디바이스 분포
    const [devices] = await pool.execute(
      `SELECT 
         COALESCE(device_type, 'desktop') AS device,
         COUNT(*) AS count
       FROM visitor_logs
       WHERE created_at >= CURDATE() - INTERVAL ? DAY
       GROUP BY device_type
       ORDER BY count DESC`,
      [days - 1]
    );

    // 2. 브라우저 Top 5
    const [browsers] = await pool.execute(
      `SELECT 
         COALESCE(browser, '기타') AS name,
         COUNT(*) AS count
       FROM visitor_logs
       WHERE created_at >= CURDATE() - INTERVAL ? DAY
       GROUP BY browser
       ORDER BY count DESC
       LIMIT 5`,
      [days - 1]
    );

    // 3. OS Top 5
    const [osList] = await pool.execute(
      `SELECT 
         COALESCE(os, '기타') AS name,
         COUNT(*) AS count
       FROM visitor_logs
       WHERE created_at >= CURDATE() - INTERVAL ? DAY
       GROUP BY os
       ORDER BY count DESC
       LIMIT 5`,
      [days - 1]
    );

    // 4. 인기 방문 페이지 Top 5
    const [topPages] = await pool.execute(
      `SELECT 
         page_url,
         MAX(page_title) AS page_title,
         COUNT(*) AS pv,
         COUNT(DISTINCT visitor_id) AS uv
       FROM visitor_logs
       WHERE created_at >= CURDATE() - INTERVAL ? DAY
       GROUP BY page_url
       ORDER BY pv DESC
       LIMIT 5`,
      [days - 1]
    );

    res.json({
      success: true,
      data: {
        devices,
        browsers,
        osList,
        topPages
      }
    });
  } catch (err) {
    next(err);
  }
});

// =========================================================
// [관리자 API] GET /api/admin/stats/visitors/logs
// 최근 접속 상세 로그 (페이징, 회원/비회원 필터, 검색)
// =========================================================
router.get('/visitors/logs', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const userType = req.query.userType || 'all'; // 'all', 'member', 'guest'
    const keyword = (req.query.keyword || '').trim();

    let whereParts = ['1=1'];
    let params = [];

    if (userType === 'member') {
      whereParts.push('user_id IS NOT NULL');
    } else if (userType === 'guest') {
      whereParts.push('user_id IS NULL');
    }

    if (keyword) {
      whereParts.push('(user_identifier LIKE ? OR ip_address LIKE ? OR page_url LIKE ? OR page_title LIKE ?)');
      const kwPattern = `%${keyword}%`;
      params.push(kwPattern, kwPattern, kwPattern, kwPattern);
    }

    const whereClause = whereParts.join(' AND ');

    // 전체 건수 조회
    const [[countRow]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM visitor_logs WHERE ${whereClause}`,
      params
    );
    const total = Number(countRow.total || 0);

    // 목록 조회 (limit, offset은 상단에서 양의 정수로 검증 완료됨)
    const [rows] = await pool.execute(
      `SELECT 
         id, visitor_id, user_id, user_role, user_identifier,
         page_url, page_title, referrer, ip_address, device_type, os, browser,
         created_at
       FROM visitor_logs
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      }
    });
  } catch (err) {
    next(err);
  }
});

// =========================================================
// [관리자 API] GET /api/admin/stats/visitors/export
// 접속 로그 CSV 파일 다운로드
// =========================================================
router.get('/visitors/export', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
         id, created_at, user_role, user_identifier, ip_address,
         device_type, os, browser, page_url, page_title, referrer
       FROM visitor_logs
       ORDER BY created_at DESC
       LIMIT 5000`
    );

    let csvContent = '\uFEFF'; // Excel 한글 깨짐 방지 UTF-8 BOM
    csvContent += '로그ID,접속일시,회원구분,회원식별,IP주소,기기구분,OS,브라우저,접속페이지,페이지제목,유입경로\r\n';

    rows.forEach(r => {
      const isMember = r.user_role && r.user_role !== 'guest' ? '회원' : '비회원';
      const ident = r.user_identifier || '익명 방문자';
      const createdStr = r.created_at ? new Date(r.created_at).toISOString().replace('T', ' ').substring(0, 19) : '';

      const line = [
        r.id,
        `"${createdStr}"`,
        `"${isMember}"`,
        `"${ident.replace(/"/g, '""')}"`,
        `"${r.ip_address || ''}"`,
        `"${r.device_type || ''}"`,
        `"${r.os || ''}"`,
        `"${r.browser || ''}"`,
        `"${(r.page_url || '').replace(/"/g, '""')}"`,
        `"${(r.page_title || '').replace(/"/g, '""')}"`,
        `"${(r.referrer || '').replace(/"/g, '""')}"`
      ].join(',');

      csvContent += line + '\r\n';
    });

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ongjin_visitor_logs_${dateStr}.csv"`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
