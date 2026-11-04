/**
 * notificationService.js — 알림 발송 서비스 (비동기 큐 방식)
 *
 * 공통 규칙:
 *   - 모든 안내 문자 머릿말은 '[옹진관광쿠폰]'으로 통일
 *   - 쿠폰 유효기간은 '발급일로부터 1년'이며 발급일(YYYY.MM.DD)과 만료일(YYYY.MM.DD)을 함께 표기
 *   - 문의처에는 담당 부서 및 연락처(032-899-2210)를 함께 표기
 */

const { enqueue } = require('./notificationQueue');
const logger = require('../utils/logger');

const CONTACT_INFO = process.env.CONTACT_PHONE || '옹진군청 관광문화과 (032-899-2210)';

/**
 * 한국 시간(KST) 기준 YYYY.MM.DD 포맷 반환
 */
function formatDateKST(dateInput = new Date()) {
  const d = new Date(dateInput);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

/**
 * 발급일로부터 1년 뒤 날짜(YYYY.MM.DD) 반환
 */
function formatExpireDateOneYearKST(dateInput = new Date()) {
  const d = new Date(dateInput);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kst.getUTCFullYear() + 1;
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

class NotificationService {
  /**
   * 가맹점 입점 신청 접수 알림 (비동기 큐)
   * @param {string} phone - 수신 전화번호
   * @param {string} shopName - 상호명
   */
  async sendMerchantApplicationReceivedNotification(phone, shopName) {
    const title = '[옹진관광쿠폰] 가맹점 입점 신청 접수 안내';
    const message =
      `[옹진관광쿠폰] 안녕하세요, ${shopName} 사장님!\n` +
      `가맹점 입점 신청이 정상적으로 접수되었습니다.\n` +
      `담당자 확인 및 심사(영업일 기준 1~2일 소요) 후 승인 결과가 문자로 안내됩니다.\n\n` +
      `■ 신청 상호: ${shopName}\n` +
      `■ 문의: ${CONTACT_INFO}`;

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
   * 가맹점주에게 심사 상태 변경(승인/반려) 알림 (비동기 큐)
   */
  async sendMerchantStatusNotification(phone, shopName, status, reason = '') {
    const isApproved = status === 'approved';
    const title = isApproved ? '[옹진관광쿠폰] 가맹점 승인 안내' : '[옹진관광쿠폰] 가맹점 반려 안내';

    let message = '';
    if (isApproved) {
      const baseUrl = process.env.APP_BASE_URL || 'https://ongjincoupon.kr';
      message =
        `[옹진관광쿠폰] 안녕하세요, ${shopName} 사장님!\n` +
        `가맹점 입점 신청이 승인되었습니다.\n` +
        `지금부터 가맹점 로그인을 통해 서비스를 이용하실 수 있습니다.\n\n` +
        `■ 로그인 주소: ${baseUrl}/merchant\n` +
        `■ 이용 방법: 가맹점 선택 후 신청 시 설정하신 비밀번호로 로그인\n` +
        `■ 문의: ${CONTACT_INFO}`;
    } else {
      message =
        `[옹진관광쿠폰] 안녕하세요, ${shopName} 사장님.\n` +
        `가맹점 입점 신청 심사 결과 안내드립니다.\n` +
        `안타깝게도 아래 사유로 이번 신청이 반려되었습니다.\n\n` +
        `■ 반려 사유: ${reason || '상세 사유 확인 필요'}\n` +
        `■ 문의: ${CONTACT_INFO}`;
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
   * 발행처/키오스크 쿠폰 발급 알림 — 문자 전송 (비동기 큐)
   * @param {string} phone      - 수신 전화번호
   * @param {number} faceValue  - 쿠폰 총 금액
   * @param {string} claimUrl   - 쿠폰 등록 URL
   * @param {object} [options]  - 추가 정보 (count: 매수, issuerName: 발행처명, issuedAt: 발급일시)
   */
  async sendKioskCouponNotification(phone, faceValue, claimUrl, options = {}) {
    const count = options.count || 1;
    const issuerName = options.issuerName || '';
    const issuedDateStr = formatDateKST(options.issuedAt || new Date());
    const expireDateStr = formatExpireDateOneYearKST(options.issuedAt || new Date());

    const countText = count > 1 ? ` (${count}매)` : '';
    const issuerLine = issuerName ? `■ 발급처: ${issuerName}\n` : '';

    const message =
      `[옹진관광쿠폰] ${Number(faceValue).toLocaleString()}원 쿠폰${countText}이 발급되었습니다.\n` +
      `아래 링크를 눌러 내 쿠폰함에 등록해 주세요.\n` +
      `${claimUrl}\n\n` +
      issuerLine +
      `■ 발급일: ${issuedDateStr}\n` +
      `■ 유효기간: ${expireDateStr}까지 (발급일로부터 1년)\n` +
      `■ 문의: ${CONTACT_INFO}`;

    const cleanPhone = phone.replace(/\D/g, '');
    const maskedPhone = phone.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3');
    logger.info(`[Notification] 쿠폰 발급 알림 큐 등록 — To: ${maskedPhone}`);

    await enqueue('sms', cleanPhone, message);
    return { success: true, queued: true };
  }
}

module.exports = new NotificationService();
