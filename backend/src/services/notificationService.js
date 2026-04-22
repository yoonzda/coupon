/**
 * 알림 서비스 (SMS/KakaoTalk)
 */
class NotificationService {
  /**
   * 가맹점주에게 상태 변경 알림 전송
   * @param {string} phone 가맹점주 휴대폰 번호
   * @param {string} shopName 상점명
   * @param {string} status 'approved' | 'rejected'
   * @param {string} reason 반려 사유 (반려 시 필수)
   */
  async sendMerchantStatusNotification(phone, shopName, status, reason = '') {
    const isApproved = status === 'approved';
    const title = isApproved ? '[옹진관광] 가맹점 승인 안내' : '[옹진관광] 가맹점 반려 안내';
    
    let message = '';
    if (isApproved) {
      message = `안녕하세요, ${shopName} 사장님!
옹진관광 쿠폰 가맹점 신청이 승인되었습니다.
지금부터 가맹점 로그인을 통해 서비스를 이용하실 수 있습니다.

■ 로그인 주소: https://ongjin-coupon.com/merchant
■ 이용 방법: 휴대폰 번호 인증으로 즉시 로그인`;
    } else {
      message = `안녕하세요, ${shopName} 사장님.
옹진관광 쿠폰 가맹점 신청 결과에 대해 안내드립니다.
안타깝게도 서류 미비 등의 사유로 이번 신청은 반려되었습니다.

■ 반려 사유: ${reason || '상세 사유 확인 필요'}
■ 문의: 옹진관광 쿠폰 관리센터 (032-XXX-XXXX)`;
    }

    // 실제 전송 로직 (예: 알리고, 쿨에스엠에스 API 호출)
    console.log(`[Notification] To: ${phone} / Message: ${message}`);
    
    try {
      // TODO: 실제 SMS API 연동 시 아래 주석 해제 및 설정
      /*
      const result = await someSmsProvider.send({
        to: phone,
        from: '032XXXXXXX', // 발신번호
        text: message
      });
      return result;
      */
      return { success: true, mock: true };
    } catch (error) {
      console.error('[Notification Error]', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
