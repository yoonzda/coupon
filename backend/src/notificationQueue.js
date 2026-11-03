/**
 * notificationQueue.js — 비동기 알림 큐 서비스
 *
 * 문제 원인:
 *   외부 SMS/카카오 API를 동기 호출하면 키오스크 화면이 응답 대기(2~4초) 동안 멈춤.
 *   관광지 현장에서 줄 서 있는 상황에서 치명적 UX 저하.
 *
 * 해결 전략:
 *   1. 알림 발송 요청을 DB notification_queue 테이블에 즉시 저장 (수 ms)
 *   2. 워커(notificationWorker.js)가 5초 간격으로 큐를 처리 (백그라운드)
 *   3. 실패 시 최대 3회 자동 재시도
 *
 * 의존성: Redis 불필요 — DB 큐로 충분 (트래픽 규모 고려)
 */

const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * 알림을 큐에 등록 (즉시 반환 — 비동기)
 * @param {'sms'|'kakao_alimtalk'} type
 * @param {string} recipient  - 수신자 전화번호 (숫자만, 예: '01012345678')
 * @param {string} message    - SMS 본문 또는 알림톡 변수 JSON 문자열
 * @param {string} [templateId] - 카카오 알림톡 템플릿 코드 (선택)
 * @returns {Promise<number>} insertId
 */
async function enqueue(type, recipient, message, templateId = null) {
  const cleanPhone = recipient.replace(/\D/g, '');
  const [result] = await pool.execute(
    `INSERT INTO notification_queue (type, recipient, message, template_id, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [type, cleanPhone, message, templateId]
  );
  logger.info(`[NotificationQueue] 큐 등록 완료 — type: ${type}, id: ${result.insertId}`);
  return result.insertId;
}

/**
 * 미처리(pending) 항목을 배치 조회 (워커용)
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function fetchPending(limit = 20) {
  const [rows] = await pool.execute(
    `SELECT id, type, recipient, message, template_id, retry_count
     FROM notification_queue
     WHERE status = 'pending' AND retry_count < 3
     ORDER BY created_at ASC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

/**
 * 발송 성공 처리
 */
async function markSent(id) {
  await pool.execute(
    `UPDATE notification_queue
     SET status = 'sent', sent_at = NOW()
     WHERE id = ?`,
    [id]
  );
}

/**
 * 발송 실패 처리 (재시도 카운트 증가, 3회 초과 시 failed)
 */
async function markFailed(id, errorMessage) {
  await pool.execute(
    `UPDATE notification_queue
     SET retry_count = retry_count + 1,
         last_error  = ?,
         status      = IF(retry_count >= 2, 'failed', 'pending')
     WHERE id = ?`,
    [String(errorMessage).slice(0, 500), id]
  );
}

module.exports = { enqueue, fetchPending, markSent, markFailed };
