const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { recordAuditLog, getClientIp } = require('../middleware/auditLogger');
const logger = require('../utils/logger');

/**
 * 1. POST /api/admin/logs/activity
 * 페이지 체류 시간 및 화면 이동 이벤트 수집 (navigator.sendBeacon 대응)
 * 헤더 또는 본문(body)에 전달된 JWT 토큰을 해석하여 관리자 정보를 매핑
 */
router.post('/activity', async (req, res) => {
  try {
    let payload = req.body;
    // sendBeacon으로 text/plain 전달되었을 경우 파싱
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        payload = {};
      }
    }

    const { pageUrl, pageTitle, durationSeconds, token } = payload || {};
    let admin = null;

    // 인증 토큰 확인 (Authorization 헤더 우선, 없으면 body.token)
    let authToken = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.split(' ')[1];
    } else if (token) {
      authToken = token;
    }

    if (authToken) {
      try {
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
        if (decoded && (decoded.role === 'admin' || decoded.adminRole)) {
          admin = decoded;
        }
      } catch (err) {
        // 만료된 토큰이거나 유효하지 않은 경우 무시
      }
    }

    if (!admin) {
      // 인증되지 않은 요청은 무시 (204 No Content)
      return res.status(204).end();
    }

    const duration = parseInt(durationSeconds, 10) || 0;
    const currentUrl = pageUrl || '/admin';
    const currentTitle = pageTitle || '관리자 페이지';

    if (duration === 0) {
      // 1) 페이지 최초 진입: 최근 10초 이내에 동일 페이지 진입 로그가 이미 있다면 중복 삽입 방지
      const [recentEnters] = await pool.query(
        `SELECT id FROM admin_audit_logs 
         WHERE admin_id = ? AND page_url = ? AND action_type = 'PAGE_VIEW' 
           AND created_at >= DATE_SUB(NOW(), INTERVAL 10 SECOND) 
         ORDER BY id DESC LIMIT 1`,
        [admin.id, currentUrl]
      );

      if (recentEnters && recentEnters.length > 0) {
        return res.status(200).json({ success: true, duplicate: true });
      }

      await recordAuditLog({
        adminId: admin.id,
        adminUsername: admin.username || 'admin',
        adminName: admin.name || '',
        adminRole: admin.adminRole || admin.role || 'operator',
        actionType: 'PAGE_VIEW',
        pageUrl: currentUrl,
        pageTitle: currentTitle,
        targetResource: 'page',
        targetId: null,
        actionDetail: `페이지 접속: ${currentTitle}`,
        durationSeconds: 0,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || ''
      });

      return res.status(200).json({ success: true });
    }

    // 2) 페이지 체류 시간(이탈/중간 갱신):
    // 최근 1시간 이내에 생성된 해당 관리자/해당 페이지의 최신 PAGE_VIEW 로그를 찾아 duration 및 detail 갱신
    const detailMsg = `페이지 체류 [${duration}초]: ${currentTitle}`;

    const [recentLogs] = await pool.query(
      `SELECT id FROM admin_audit_logs 
       WHERE admin_id = ? AND page_url = ? AND action_type = 'PAGE_VIEW' 
         AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) 
       ORDER BY id DESC LIMIT 1`,
      [admin.id, currentUrl]
    );

    if (recentLogs && recentLogs.length > 0) {
      const targetLogId = recentLogs[0].id;
      await pool.query(
        `UPDATE admin_audit_logs 
         SET duration_seconds = ?, action_detail = ?, page_title = ? 
         WHERE id = ?`,
        [duration, detailMsg, currentTitle, targetLogId]
      );
      return res.status(200).json({ success: true, updated: true });
    }

    // 만약 최근 진입 로그가 없으면 신규 기록
    await recordAuditLog({
      adminId: admin.id,
      adminUsername: admin.username || 'admin',
      adminName: admin.name || '',
      adminRole: admin.adminRole || admin.role || 'operator',
      actionType: 'PAGE_VIEW',
      pageUrl: currentUrl,
      pageTitle: currentTitle,
      targetResource: 'page',
      targetId: null,
      actionDetail: detailMsg,
      durationSeconds: duration,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || ''
    });

    res.status(200).json({ success: true });
  } catch (err) {
    logger.error(`[AdminLogs] 활동 로그 수신 오류: ${err.message}`);
    res.status(204).end();
  }
});

/**
 * 2. GET /api/admin/logs
 * 관리자 업무 감사 로그 목록 검색 및 페이징 조회
 */
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { adminId, username, actionType, startDate, endDate, keyword } = req.query;

    const conditions = [];
    const params = [];

    if (adminId) {
      conditions.push('admin_id = ?');
      params.push(adminId);
    }
    if (username) {
      conditions.push('admin_username LIKE ?');
      params.push(`%${username}%`);
    }
    if (actionType && actionType !== 'ALL') {
      conditions.push('action_type = ?');
      params.push(actionType);
    }
    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(`${endDate} 23:59:59`);
    }
    if (keyword) {
      conditions.push('(action_detail LIKE ? OR page_title LIKE ? OR ip_address LIKE ? OR page_url LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 총 카운트
    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM admin_audit_logs ${whereClause}`,
      params
    );

    // 데이터 조회 (시큐어코딩: LIMIT/OFFSET 바인드 파라미터 적용)
    const [rows] = await pool.query(
      `SELECT id, admin_id, admin_username, admin_name, admin_role, action_type,
              page_url, page_title, target_resource, target_id, action_detail,
              duration_seconds, ip_address, user_agent, created_at
       FROM admin_audit_logs
       ${whereClause}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 3. GET /api/admin/logs/stats
 * 관리자 감사 통계 요약 (오늘 접속자, 액션 수, 평균 체류시간 등)
 */
router.get('/stats', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    // 오늘 전체 업무 건수
    const [[todayStats]] = await pool.execute(
      `SELECT 
         COUNT(*) AS todayTotalActions,
         COUNT(DISTINCT admin_username) AS todayActiveAdmins,
         COALESCE(SUM(CASE WHEN action_type = 'LOGIN' THEN 1 ELSE 0 END), 0) AS todayLogins,
         COALESCE(SUM(CASE WHEN action_type IN ('CREATE', 'UPDATE', 'DELETE') THEN 1 ELSE 0 END), 0) AS todayModifications,
         COALESCE(AVG(CASE WHEN action_type = 'PAGE_VIEW' AND duration_seconds > 0 THEN duration_seconds ELSE NULL END), 0) AS avgDurationSeconds
       FROM admin_audit_logs
       WHERE created_at >= CURDATE()`
    );

    // 최근 7일간 일자별 작업 건수 추이
    const [dailyTrend] = await pool.execute(
      `SELECT 
         DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
         COUNT(*) AS count,
         COUNT(DISTINCT admin_username) AS admins
       FROM admin_audit_logs
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
       ORDER BY date ASC`
    );

    res.json({
      success: true,
      stats: {
        todayTotalActions: todayStats.todayTotalActions || 0,
        todayActiveAdmins: todayStats.todayActiveAdmins || 0,
        todayLogins: todayStats.todayLogins || 0,
        todayModifications: todayStats.todayModifications || 0,
        avgDurationSeconds: Math.round(todayStats.avgDurationSeconds || 0),
        dailyTrend
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 4. GET /api/admin/logs/export
 * 감사 로그 CSV 다운로드 (개인정보 보호법 제출 및 감사 규격)
 */
router.get('/export', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { adminId, username, actionType, startDate, endDate } = req.query;

    const conditions = [];
    const params = [];

    if (adminId) {
      conditions.push('admin_id = ?');
      params.push(adminId);
    }
    if (username) {
      conditions.push('admin_username LIKE ?');
      params.push(`%${username}%`);
    }
    if (actionType && actionType !== 'ALL') {
      conditions.push('action_type = ?');
      params.push(actionType);
    }
    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(`${endDate} 23:59:59`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT id, created_at, admin_username, admin_name, admin_role,
              action_type, page_title, page_url, target_resource, target_id,
              duration_seconds, ip_address, action_detail
       FROM admin_audit_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 5000`,
      params
    );

    // CSV 파일 헤더 구성 (BOM 추가하여 엑셀 한글 깨짐 방지)
    const headers = [
      '로그번호', '발생일시', '관리자아이디', '관리자성명', '권한등급',
      '행위구분', '페이지명', '접속URL', '대상리소스', '대상식별자',
      '체류시간(초)', '접속IP', '상세작업내역'
    ];

    const formatCsvField = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    for (const r of rows) {
      const line = [
        r.id,
        r.created_at ? new Date(r.created_at).toISOString().replace('T', ' ').substring(0, 19) : '',
        r.admin_username,
        r.admin_name,
        r.admin_role,
        r.action_type,
        r.page_title,
        r.page_url,
        r.target_resource,
        r.target_id,
        r.duration_seconds,
        r.ip_address,
        r.action_detail
      ].map(formatCsvField).join(',');
      csvContent += line + '\n';
    }

    // 감사로그 다운로드 자체도 EXPORT 감사로그로 남김
    recordAuditLog({
      adminId: req.user.id,
      adminUsername: req.user.username || 'admin',
      adminName: req.user.name || '',
      adminRole: req.user.adminRole || 'super',
      actionType: 'EXPORT',
      pageUrl: '/admin/managers.html',
      pageTitle: '관리자 감사 로그',
      targetResource: 'admin_audit_logs',
      targetId: null,
      actionDetail: `감사 로그 CSV 다운로드 (건수: ${rows.length}건)`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || ''
    });

    const timestamp = new Date().toISOString().substring(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="admin_audit_logs_${timestamp}.csv"`);
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
