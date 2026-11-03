/**
 * notificationWorker.js — 알림 큐 워커
 *
 * 5초마다 notification_queue 테이블을 폴링하여
 * pending 상태의 알림을 실제 발송한다.
 * app.js에서 require하면 자동 시작된다.
 */

const { fetchPending, markSent, markFailed } = require('../services/notificationQueue');
const { sendSMS } = require('../services/smsService');
const logger = require('../utils/logger');

const POLL_INTERVAL_MS = 5000; // 5초

async function processQueue() {
  let items;
  try {
    items = await fetchPending(20);
  } catch (err) {
    logger.error(`[NotificationWorker] 큐 조회 실패: ${err.message}`);
    return;
  }

  for (const item of items) {
    try {
      if (item.type === 'sms') {
        await sendSMS(item.recipient, item.message);
      } else if (item.type === 'kakao_alimtalk') {
        // 카카오 알림톡 연동 시 여기서 kakaoService.sendAlimtalk() 호출
        // 현재는 SMS 폴백으로 처리
        logger.warn(`[NotificationWorker] kakao_alimtalk 미연동 — SMS 폴백 처리 (id: ${item.id})`);
        await sendSMS(item.recipient, item.message);
      }
      await markSent(item.id);
      logger.info(`[NotificationWorker] 발송 완료 — id: ${item.id}, type: ${item.type}`);
    } catch (err) {
      await markFailed(item.id, err.message);
      logger.warn(`[NotificationWorker] 발송 실패 (재시도 예정) — id: ${item.id}: ${err.message}`);
    }
  }
}

// 워커 시작
const workerTimer = setInterval(processQueue, POLL_INTERVAL_MS);

// Graceful Shutdown: 프로세스 종료 시 타이머 정리
process.on('SIGTERM', () => clearInterval(workerTimer));
process.on('SIGINT',  () => clearInterval(workerTimer));

logger.info(`✅ [NotificationWorker] 알림 큐 워커 시작 (폴링 간격: ${POLL_INTERVAL_MS / 1000}초)`);

module.exports = { processQueue };
