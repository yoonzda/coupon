const db = require('../config/database');

/**
 * FDS (Fraud Detection System) 이상거래 실시간 탐지 서비스
 * 결제 완료 후 비동기로 실행되어 메인 응답 속도에 영향을 주지 않습니다.
 */
class FdsService {
  /**
   * 거래 사후 비동기 검증
   * @param {Object} txData
   * @param {number} txData.couponId
   * @param {number} txData.merchantId
   * @param {number|null} txData.userId
   * @param {number} txData.amount
   */
  async inspectTransaction({ couponId, merchantId, userId, amount }) {
    try {
      // 1. [규칙: RAPID_MERCHANT_TX] 동일 가맹점 1분 내 5회 이상 결제 발생
      const [rapidRows] = await db.execute(
        `SELECT COUNT(*) as txCount, COALESCE(SUM(amount), 0) as sumAmount
         FROM coupon_transactions
         WHERE merchant_id = ? AND scanned_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)`,
        [merchantId]
      );

      if (rapidRows[0].txCount >= 5) {
        await this.createAlert({
          ruleId: 'RAPID_MERCHANT_TX',
          couponId,
          merchantId,
          userId,
          description: `가맹점(ID: ${merchantId})에서 1분간 비정상 빈도 결제 발생 (${rapidRows[0].txCount}건, 총 ${Number(rapidRows[0].sumAmount).toLocaleString()}원)`
        });
      }

      // 2. [규칙: EXCESSIVE_AMOUNT] 1회 결제금액 5만원 초과 또는 10분 내 누적 10만원 초과
      if (amount > 50000) {
        await this.createAlert({
          ruleId: 'EXCESSIVE_AMOUNT',
          couponId,
          merchantId,
          userId,
          description: `단일 쿠폰 고액 결제 이상 징후 (결제액: ${Number(amount).toLocaleString()}원)`
        });
      } else if (userId) {
        const [sumRows] = await db.execute(
          `SELECT COALESCE(SUM(amount), 0) as userSum
           FROM coupon_transactions
           WHERE user_id = ? AND scanned_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
          [userId]
        );
        if (sumRows[0].userSum >= 100000) {
          await this.createAlert({
            ruleId: 'EXCESSIVE_AMOUNT',
            couponId,
            merchantId,
            userId,
            description: `동일 사용자(ID: ${userId}) 10분 내 누적 고액 결제 (${Number(sumRows[0].userSum).toLocaleString()}원)`
          });
        }
      }

      // 3. [규칙: IMPOSSIBLE_TRAVEL] 동일 사용자가 5분 내 다른 가맹점에서 결제
      if (userId) {
        const [otherMerchants] = await db.execute(
          `SELECT DISTINCT merchant_id
           FROM coupon_transactions
           WHERE user_id = ? AND merchant_id != ? AND scanned_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
          [userId, merchantId]
        );
        if (otherMerchants.length > 0) {
          await this.createAlert({
            ruleId: 'IMPOSSIBLE_TRAVEL',
            couponId,
            merchantId,
            userId,
            description: `동일 사용자(ID: ${userId}) 5분 내 복수 가맹점 이동 결제 징후 (가맹점 ID: ${merchantId} 및 ${otherMerchants.map(r => r.merchant_id).join(', ')})`
          });
        }
      }
    } catch (err) {
      console.error('[FDS Service Error] 이상거래 검사 중 예외 발생:', err.message);
    }

    // 4. [규칙: PROXY_BULK_USE] 단체 공유 링크로 대리 수령한 쿠폰을 동일 가맹점에서 단시간 다량 사용 (현금화 의심)
    //    기본: 10분 내 3장 이상 (FDS_PROXY_BULK_COUNT / FDS_PROXY_BULK_MINUTES 로 조정)
    if (userId) {
      try {
        const threshold = Math.max(2, parseInt(process.env.FDS_PROXY_BULK_COUNT || '3', 10) || 3);
        const minutes = Math.max(1, parseInt(process.env.FDS_PROXY_BULK_MINUTES || '10', 10) || 10);
        const [[isProxy]] = await db.execute(
          `SELECT COUNT(*) AS cnt FROM coupon_share_claims WHERE coupon_id = ? AND claim_type = 'proxy'`,
          [couponId]
        );
        if (Number(isProxy.cnt) > 0) {
          const [[bulk]] = await db.execute(
            `SELECT COUNT(*) AS cnt, COALESCE(SUM(ct.amount), 0) AS sumAmount
             FROM coupon_transactions ct
             JOIN coupon_share_claims sc ON sc.coupon_id = ct.coupon_id AND sc.claim_type = 'proxy'
             WHERE ct.user_id = ? AND ct.merchant_id = ?
               AND ct.scanned_at >= DATE_SUB(NOW(), INTERVAL ${minutes} MINUTE)`,
            [userId, merchantId]
          );
          if (Number(bulk.cnt) >= threshold) {
            // 같은 사용자·가맹점 조합은 탐지 구간 내 1회만 경고
            const [[dup]] = await db.execute(
              `SELECT COUNT(*) AS cnt FROM fds_alerts
               WHERE rule_id = 'PROXY_BULK_USE' AND user_id = ? AND merchant_id = ?
                 AND detected_at >= DATE_SUB(NOW(), INTERVAL ${minutes} MINUTE)`,
              [userId, merchantId]
            );
            if (Number(dup.cnt) === 0) {
              await this.createAlert({
                ruleId: 'PROXY_BULK_USE',
                couponId,
                merchantId,
                userId,
                description: `단체 쿠폰 대리 수령분 다량 사용 (사용자 ID: ${userId}, 가맹점 ID: ${merchantId}, ${minutes}분 내 ${bulk.cnt}장 / ${Number(bulk.sumAmount).toLocaleString()}원)`
              });
            }
          }
        }
      } catch (err) {
        console.error('[FDS Service Error] 대리 수령 다량 사용 검사 실패:', err.message);
      }
    }
  }

  /**
   * 이상거래 경고 레코드 생성
   */
  async createAlert({ ruleId, couponId, merchantId, userId, description }) {
    try {
      await db.execute(
        `INSERT INTO fds_alerts (rule_id, coupon_id, merchant_id, user_id, description, detected_at, resolved)
         VALUES (?, ?, ?, ?, ?, NOW(), 0)`,
        [ruleId, couponId || null, merchantId || null, userId || null, description]
      );
      console.warn(`🚨 [FDS ALERT DETECTED] Rule: ${ruleId} | Merchant: ${merchantId} | User: ${userId} | ${description}`);
    } catch (err) {
      console.error('[FDS Alert Insert Error]:', err.message);
    }
  }
}

module.exports = new FdsService();
