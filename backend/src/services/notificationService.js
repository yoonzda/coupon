/**
 * notificationService.js — 알림 발송 서비스 (비동기 큐 방식)
 *
 * 변경 사항:
 *   Before: sendSMS() 직접 호출 (동기) → 키오스크 응답 2~4초 지연
 *   After:  notificationQueue.enqueue() 로 즉시 큐 적재 → 응답 수 ms
 *           실제 발송은 notificationWorker.js 가 백그라운드에서 처리
 */

const { enqueue } = require('./notificationQueue');
const logger = require('../utils/logger');

class NotificationService {
  /**
   * 가맹점 입점 신청 접수 알림 (비동기 큐)
   * @param {string} phone - 수신 전화번호
   * @param {string} shopName - 상호명
   */
  async sendMerchantApplicationReceivedNotification(phone, shopName) {
    const title = '[옹진관광] 가맹점 신청 접수 안내';
    const message = `[옹진관광] 안녕하세요, ${shopName} 사장님!\n가맹점 입점 신청이 정상적으로 접수되었습니다.\n담당 공무원 서류 심사(영업일 기준 1~3일 소요) 후 승인 결과가 문자로 안내될 예정입니다.\n\n■ 신청 상호: ${shopName}\n■ 문의: 옹진관광 쿠폰 관리센터\n\n※ 매장사진과 홍보문구를 넣어주시면 쿠폰을 이용하는 관광객에게 홍보효과도 누릴수 있습니다.`;

    const maskedPhone = phone
      ? phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3')
      : 'UNKNOWN';
    logger.info(`[Notification] 가맹점 신청 접수 알림 큐 등록 — To: ${maskedPhone} / [${title}]`);

    const cleanPhone = phone.replace(/\D/g, '');
    try {
      await enqueue('sms', cleanPhone, message);
      return { success: true, queued: true };
    } catch (error) {
      logger.error('[Notification Error] 가맹점 신청 접수 알림 큐 등록 실패:', error);
      throw error;
    }
  }

  /**
   * 가맹점주에게 상태 변경 알림 (비동기 큐)
   */
  async sendMerchantStatusNotification(phone, shopName, status, reason = '') {
    const isApproved = status === 'approved';
    const title = isApproved ? '[옹진관광] 가맹점 승인 안내' : '[옹진관광] 가맹점 반려 안내';

    let message = '';
    if (isApproved) {
      const baseUrl = process.env.APP_BASE_URL || 'https://ongjincoupon.kr';
      message = `[옹진관광] 안녕하세요, ${shopName} 사장님!\n가맹점 입점 신청이 승인되었습니다.\n지금부터 가맹점 로그인을 통해 서비스를 이용하실 수 있습니다.\n\n■ 로그인 주소: ${baseUrl}/merchant\n■ 이용 방법: 아이디와 비밀번호로 로그인\n■ 문의: 옹진관광 쿠폰 관리센터`;
    } else {
      message = `[옹진관광] 안녕하세요, ${shopName} 사장님.\n가맹점 입점 신청 결과에 대해 안내드립니다.\n안타깝게도 서류 미비 등의 사유로 이번 신청은 반려되었습니다.\n\n■ 반려 사유: ${reason || '상세 사유 확인 필요'}\n■ 문의: 옹진관광 쿠폰 관리센터`;
    }

    const maskedPhone = phone
      ? phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3')
      : 'UNKNOWN';
    logger.info(`[Notification] 큐 등록 — To: ${maskedPhone} / [${title}]`);

    const cleanPhone = phone.replace(/\D/g, '');
    try {
      await enqueue('sms', cleanPhone, message);
      return { success: true, queued: true };
    } catch (error) {
      logger.error('[Notification Error] 큐 등록 실패:', error);
      throw error;
    }
  }

  /**
   * 키오스크 쿠폰 발급 알림 — 문자 전송 (비동기 큐)
   * @param {string} phone  - 수신 전화번호
   * @param {number} faceValue - 쿠폰 액면가
   * @param {string} claimUrl  - 쿠폰 등록 URL
   */
  async sendKioskCouponNotification(phone, faceValue, claimUrl) {
    const message =
      `[옹진관광] ${faceValue.toLocaleString()}원 쿠폰이 발급되었습니다.\n` +
      `아래 링크를 눌러 내 쿠폰함에 등록하세요.\n${claimUrl}\n` +
      `(유효기간: 발급일로부터 1년)`;

    const cleanPhone = phone.replace(/\D/g, '');
    const maskedPhone = phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3');
    logger.info(`[Notification] 키오스크 쿠폰 발급 알림 큐 등록 — To: ${maskedPhone}`);

    await enqueue('sms', cleanPhone, message);
    return { success: true, queued: true };
  }
}

module.exports = new NotificationService();
