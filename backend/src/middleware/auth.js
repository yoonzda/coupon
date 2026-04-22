const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * JWT 검증 미들웨어
 * Authorization: Bearer <token>
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, ... }
    next();
  } catch (err) {
    logger.warn(`JWT 검증 실패: ${err.message} [${req.ip}]`);
    return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
  }
}

/**
 * 역할 기반 접근 제어 (RBAC)
 * @param {...string} roles - 허용 역할 목록 ('tourist' | 'merchant' | 'admin')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '접근 권한이 없습니다.' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
