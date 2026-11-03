const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * 클라이언트 IP 주소 정제 (Nginx 프록시 X-Forwarded-For 우선)
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
}

/**
 * 비밀번호 등 민감정보 마스킹
 */
function sanitizePayload(data) {
  if (!data || typeof data !== 'object') return data;
  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'password_hash', 'token', 'refreshToken', 'secret'];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '***MASKED***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizePayload(sanitized[key]);
    }
  }
  return sanitized;
}

/**
 * 수동/명시적 감사 로그 기록 함수
 */
async function recordAuditLog({
  adminId = null,
  adminUsername,
  adminName = null,
  adminRole = 'operator',
  actionType,
  pageUrl = '/admin',
  pageTitle = '',
  targetResource = null,
  targetId = null,
  actionDetail = '',
  durationSeconds = 0,
  ipAddress = '127.0.0.1',
  userAgent = ''
}) {
  try {
    await pool.execute(
      `INSERT INTO admin_audit_logs 
       (admin_id, admin_username, admin_name, admin_role, action_type, page_url, page_title, target_resource, target_id, action_detail, duration_seconds, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        adminUsername || 'system',
        adminName,
        adminRole,
        actionType,
        pageUrl,
        pageTitle,
        targetResource,
        targetId ? String(targetId) : null,
        typeof actionDetail === 'object' ? JSON.stringify(actionDetail) : actionDetail,
        durationSeconds || 0,
        ipAddress,
        userAgent ? userAgent.substring(0, 500) : ''
      ]
    );
  } catch (err) {
    logger.error(`[AuditLogger] 감사 로그 적재 실패: ${err.message}`);
  }
}

/**
 * URL 패턴에 따른 리소스 및 국문 페이지명 자동 분류
 */
function inspectResource(req) {
  const path = req.originalUrl || req.url;
  let targetResource = null;
  let pageTitle = '관리자 포털';
  let pageUrl = path;

  if (path.includes('/api/admin/managers')) {
    targetResource = 'admins';
    pageTitle = '관리자 계정 관리';
    pageUrl = '/admin/managers.html';
  } else if (path.includes('/api/admin/merchants')) {
    targetResource = 'merchants';
    pageTitle = '가맹점 관리';
    pageUrl = '/admin/merchants.html';
  } else if (path.includes('/api/admin/coupons')) {
    targetResource = 'coupons';
    pageTitle = '쿠폰 관리';
    pageUrl = '/admin/coupons.html';
  } else if (path.includes('/api/admin/settlement') || path.includes('/api/settlement')) {
    targetResource = 'settlements';
    pageTitle = '정산 관리';
    pageUrl = '/admin/settlement.html';
  } else if (path.includes('/api/admin/fds')) {
    targetResource = 'fds';
    pageTitle = 'FDS 이상거래탐지';
    pageUrl = '/admin/fds.html';
  } else if (path.includes('/api/admin/issuers')) {
    targetResource = 'issuers';
    pageTitle = '쿠폰 발행처 관리';
    pageUrl = '/admin/issuers.html';
  } else if (path.includes('/api/admin/users')) {
    targetResource = 'users';
    pageTitle = '회원 관리';
    pageUrl = '/admin/users.html';
  }

  return { targetResource, pageTitle, pageUrl };
}

/**
 * 관리자 변경 API(POST, PUT, DELETE, PATCH) 자동 감지 미들웨어
 */
function adminAuditMiddleware(req, res, next) {
  // 관리자 로그 자체 수집 API는 중복 기록 방지
  if (req.originalUrl.startsWith('/api/admin/logs')) {
    return next();
  }

  // GET 조회 중 일반 조회가 아닌 대량 내보내기/엑셀 등은 별도 처리 가능
  const method = req.method.toUpperCase();
  const isStateChange = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

  if (!isStateChange) {
    return next();
  }

  // 응답 완료 시 비동기 기록
  res.on('finish', () => {
    // 2xx 성공 응답인 경우 기록 (실패한 인증 시도 등은 해당 컨트롤러에서 직접 기록)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const user = req.user;
      if (user && (user.role === 'admin' || user.adminRole)) {
        let actionType = 'UPDATE';
        if (method === 'POST') actionType = 'CREATE';
        if (method === 'DELETE') actionType = 'DELETE';

        const { targetResource, pageTitle, pageUrl } = inspectResource(req);
        const targetId = req.params?.id || req.body?.id || (Array.isArray(req.body?.ids) ? req.body.ids.join(',') : null);
        
        const cleanBody = sanitizePayload(req.body);
        let detailText = `[${method}] ${req.originalUrl}`;
        if (cleanBody && Object.keys(cleanBody).length > 0) {
          detailText += ` | Payload: ${JSON.stringify(cleanBody).substring(0, 1000)}`;
        }

        recordAuditLog({
          adminId: user.id,
          adminUsername: user.username || 'admin',
          adminName: user.name || '',
          adminRole: user.adminRole || user.role || 'operator',
          actionType,
          pageUrl,
          pageTitle,
          targetResource,
          targetId,
          actionDetail: detailText,
          durationSeconds: 0,
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] || ''
        });
      }
    }
  });

  next();
}

module.exports = {
  adminAuditMiddleware,
  recordAuditLog,
  getClientIp,
};
