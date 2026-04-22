const axios = require('axios');
const logger = require('../utils/logger');

const NHN_BASE_URL = 'https://api-sms.cloud.toast.com';

/**
 * NHN Cloud SMS 발송
 * @param {string} to   - 수신번호 (01012345678)
 * @param {string} text - 메시지 본문
 */
async function sendSMS(to, text) {
  const appKey    = process.env.NHN_SMS_APP_KEY;
  const secretKey = process.env.NHN_SMS_SECRET_KEY;
  const sender    = process.env.NHN_SMS_SENDER;

  if (!appKey || !secretKey || !sender) {
    // 개발 환경에서는 콘솔 출력으로 대체
    logger.warn(`[SMS_DEV] TO: ${to} | ${text}`);
    return;
  }

  try {
    const res = await axios.post(
      `${NHN_BASE_URL}/sms/v3.0/appKeys/${appKey}/sender/sms`,
      {
        body: text,
        sendNo: sender,
        recipientList: [{ internationalRecipientNo: `82${to.slice(1)}` }],
      },
      { headers: { 'X-Secret-Key': secretKey } }
    );
    logger.info(`SMS 발송 완료 → ${to} | resultCode: ${res.data?.header?.resultCode}`);
  } catch (err) {
    logger.error(`SMS 발송 실패 → ${to} | ${err.message}`);
    throw new Error('SMS 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  }
}

module.exports = { sendSMS };
