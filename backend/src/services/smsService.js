/**
 * smsService.js — 알리고(Aligo) SMS/LMS 발송 연동 서비스
 *
 * 알리고 API v1:
 *  - 발송: POST https://apis.aligo.in/send/
 *  - 잔여건수: POST https://apis.aligo.in/remain/
 *
 * 보안 및 운영 원칙:
 *  - 개인정보보호(PII): 로그 출력 시 수신번호 마스킹 (010-****-1234)
 *  - 키 미설정 시: 개발 모드로 동작하며 [SMS_DEV] 로그 기록 후 정상 반환 (무중단)
 *  - 타임아웃: 10초 설정으로 행(hang) 현상 방지
 */

const axios = require('axios');
const querystring = require('querystring');
const logger = require('../utils/logger');

const ALIGO_SEND_URL = 'https://apis.aligo.in/send/';
const ALIGO_REMAIN_URL = 'https://apis.aligo.in/remain/';

/**
 * 전화번호 마스킹 (PII 보호)
 */
function maskPhone(phone) {
  if (!phone) return 'UNKNOWN';
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
  } else if (clean.length === 10) {
    return clean.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3');
  }
  return clean.replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-****-$3');
}

/**
 * 전화번호 포맷팅 (01012345678 -> 010-1234-5678)
 */
function formatPhone(phone) {
  if (!phone) return '-';
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  } else if (clean.length === 10) {
    if (clean.startsWith('02')) {
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    return clean.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  } else if (clean.length === 9 && clean.startsWith('02')) {
    return clean.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
  } else if (clean.length === 8) {
    return clean.replace(/(\d{4})(\d{4})/, '$1-$2');
  }
  return phone;
}

/**
 * 알리고 연동 설정 상태 반환
 */
function getAligoConfig() {
  const apiKey   = (process.env.ALIGO_API_KEY || '').trim();
  const userId   = (process.env.ALIGO_USER_ID || '').trim();
  const sender   = (process.env.ALIGO_SENDER || '').trim();
  const testMode = (process.env.ALIGO_TEST_MODE || 'N').trim().toUpperCase() === 'Y' ? 'Y' : 'N';

  const isConfigured = Boolean(apiKey && userId && sender);

  return {
    apiKey,
    userId,
    sender,
    testMode,
    isConfigured,
    maskedApiKey: apiKey ? `${apiKey.slice(0, 4)}****************${apiKey.slice(-4)}` : '',
    maskedSender: maskPhone(sender),
  };
}

/**
 * 알리고 SMS / LMS 단건 및 다건 발송
 * @param {string} to   - 수신자 번호 (01012345678)
 * @param {string} text - 메시지 내용
 * @param {string} [title] - 장문(LMS) 전송 시 제목
 * @returns {Promise<{ success: boolean, msgId?: string, raw?: any, mock?: boolean }>}
 */
async function sendSMS(to, text, title = '[옹진 관광쿠폰]') {
  const config = getAligoConfig();
  const cleanPhone = String(to).replace(/\D/g, '');
  const masked = maskPhone(cleanPhone);

  if (!cleanPhone) {
    throw new Error('수신자 전화번호가 올바르지 않습니다.');
  }

  // API 키가 없으면 개발 모드로 처리 (서버 중단 방지)
  if (!config.isConfigured) {
    logger.warn(`[SMS_DEV] (알리고 설정 미등록) To: ${masked} | Msg: ${text}`);
    return {
      success: true,
      mock: true,
      message: '알리고 API 환경변수 미설정으로 개발 모의 발송되었습니다.',
    };
  }

  const payload = {
    key: config.apiKey,
    user_id: config.userId,
    sender: config.sender.replace(/\D/g, ''),
    receiver: cleanPhone,
    msg: text,
    title: title || '옹진관광쿠폰',
    testmode_yn: config.testMode,
  };

  try {
    const res = await axios.post(ALIGO_SEND_URL, querystring.stringify(payload), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    });

    const data = res.data || {};
    const resultCode = Number(data.result_code);

    if (resultCode === 1) {
      logger.info(
        `[Aligo SMS] 발송 성공 → To: ${masked} | msgId: ${data.msg_id} | Type: ${data.msg_type} (TestMode: ${config.testMode})`
      );
      return {
        success: true,
        msgId: data.msg_id,
        msgType: data.msg_type,
        successCnt: data.success_cnt,
        testMode: config.testMode === 'Y',
        raw: data,
      };
    } else {
      const errMsg = data.message || `알리고 오류 코드: ${resultCode}`;
      logger.error(`[Aligo SMS] 발송 실패 → To: ${masked} | Code: ${resultCode} | Msg: ${errMsg}`);
      throw new Error(`SMS 발송 실패: ${errMsg} (코드 ${resultCode})`);
    }
  } catch (err) {
    if (err.response) {
      logger.error(`[Aligo SMS] HTTP 오류 ${err.response.status} → To: ${masked}`);
    } else {
      logger.error(`[Aligo SMS] 통신 오류 → ${err.message}`);
    }
    throw err;
  }
}

/**
 * 알리고 잔여 건수 확인
 * @returns {Promise<{ success: boolean, sms: number, lms: number, mms: number, message?: string }>}
 */
async function getAligoRemain() {
  const config = getAligoConfig();

  if (!config.isConfigured) {
    return {
      success: false,
      isConfigured: false,
      message: '알리고 계정(API Key, User ID, 발신번호)이 설정되지 않았습니다.',
      sms: 0,
      lms: 0,
      mms: 0,
    };
  }

  const payload = {
    key: config.apiKey,
    user_id: config.userId,
  };

  try {
    const res = await axios.post(ALIGO_REMAIN_URL, querystring.stringify(payload), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 8000,
    });

    const data = res.data || {};
    const resultCode = Number(data.result_code);

    if (resultCode === 1) {
      return {
        success: true,
        isConfigured: true,
        sms: Number(data.SMS_CNT) || 0,
        lms: Number(data.LMS_CNT) || 0,
        mms: Number(data.MMS_CNT) || 0,
        message: data.message || '정상',
      };
    } else {
      return {
        success: false,
        isConfigured: true,
        code: resultCode,
        message: data.message || `잔여 건수 조회 실패 (코드: ${resultCode})`,
        sms: 0,
        lms: 0,
        mms: 0,
      };
    }
  } catch (err) {
    logger.error(`[Aligo SMS] 잔여 건수 조회 오류: ${err.message}`);
    return {
      success: false,
      isConfigured: true,
      message: `알리고 서버 통신 오류: ${err.message}`,
      sms: 0,
      lms: 0,
      mms: 0,
    };
  }
}

module.exports = {
  sendSMS,
  getAligoRemain,
  getAligoConfig,
  maskPhone,
  formatPhone,
};
