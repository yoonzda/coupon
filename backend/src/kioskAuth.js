/**
 * kioskAuth.js — 발행처(키오스크) 인증 미들웨어
 *
 * 기존 단일 KIOSK_API_KEY 환경변수의 문제점:
 *   - 4개 발행처가 같은 키를 공유 → 1개 유출 시 전체 노출
 *   - 발행처별 발행 이력 추적 불가
 *
 * 개선 방향:
 *   1. 요청 헤더 X-Kiosk-Key 값을 DB의 issuers.api_key와 대조
 *   2. 인증된 발행처 정보를 req.kiosk 에 주입 (라우터에서 사용)
 *   3. 환경변수 KIOSK_API_KEY는 레거시 하위호환용으로만 유지
 */

const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * 발행처별 API Key 인증 미들웨어
 * 헤더: X-Kiosk-Key: <발행처별 64자리 hex key>
 */
async function kioskAuth(req, res, next) {
    const rawKey = req.headers['x-kiosk-key'];

    // 레거시 단일 키 하위 호환 (개발/테스트 환경)
    const legacyKey = process.env.KIOSK_API_KEY;
    if (legacyKey && rawKey === legacyKey && process.env.NODE_ENV !== 'production') {
        logger.warn('[KioskAuth] 레거시 KIOSK_API_KEY 사용 중 — 운영 전 발행처별 키로 교체 필요');
        req.kiosk = { id: null, name: 'legacy-dev', terminalId: 'DEV' };
        return next();
    }

    if (!rawKey) {
        return res.status(401).json({
            success: false,
            message: '키오스크 인증 키가 없습니다. X-Kiosk-Key 헤더를 포함하세요.',
        });
    }

    try {
        const [rows] = await pool.execute(
            `SELECT id, name, terminal_id, is_active
       FROM issuers
       WHERE api_key = ?
       LIMIT 1`,
            [rawKey]
        );

        if (rows.length === 0) {
            logger.warn(`[KioskAuth] 미등록 API 키 시도 — IP: ${req.ip}`);
            return res.status(403).json({
                success: false,
                message: '인증되지 않은 키오스크 단말기입니다.',
            });
        }

        const issuer = rows[0];

        if (!issuer.is_active) {
            logger.warn(`[KioskAuth] 비활성 발행처 접근 시도 — 발행처: ${issuer.name}`);
            return res.status(403).json({
                success: false,
                message: '비활성화된 발행처입니다. 관리자에게 문의하세요.',
            });
        }

        // 인증 성공 — 발행처 정보 주입
        req.kiosk = {
            id: issuer.id,
            name: issuer.name,
            terminalId: issuer.terminal_id || rawKey.slice(0, 8),
        };

        logger.info(`[KioskAuth] 발행처 인증 성공 — ${issuer.name} (terminal: ${req.kiosk.terminalId})`);
        next();
    } catch (err) {
        logger.error(`[KioskAuth] DB 조회 오류: ${err.message}`);
        next(err);
    }
}

module.exports = { kioskAuth };
