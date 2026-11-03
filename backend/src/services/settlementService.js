const pool = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class SettlementService {
  /**
   * 가맹점별 정산 데이터 생성
   * @param {string} period 'YYYY-MM' 형식
   */
  async generateMonthlySettlement(period) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. 해당 기간의 정상 승인 가맹점별 실거래 쿠폰 사용 합계 조회 (테스트 거래/가맹점 제외)
      const [transactions] = await connection.execute(
        `SELECT 
           ct.merchant_id, 
           SUM(ct.amount) as total_amount,
           COUNT(*) as transaction_count
         FROM coupon_transactions ct
         JOIN merchants m ON ct.merchant_id = m.id
         WHERE DATE_FORMAT(ct.scanned_at, '%Y-%m') = ?
           AND m.status = 'approved'
           AND m.name NOT LIKE '%테스트%'
           AND (m.business_no IS NULL OR m.business_no NOT LIKE '000-00%')
            AND COALESCE(ct.is_cancelled, 0) = 0
         GROUP BY ct.merchant_id`,
        [period]
      );

      if (transactions.length === 0) {
        throw new Error('해당 기간에 정산할 내역이 없습니다.');
      }

      const results = [];

      for (const row of transactions) {
        // 2. 이미 정산 데이터가 존재하는지 확인
        const [[existing]] = await connection.execute(
          `SELECT id FROM settlements WHERE merchant_id = ? AND period = ?`,
          [row.merchant_id, period]
        );

        if (existing) continue;

        // 3. 정산 레코드 생성
        const [res] = await connection.execute(
          `INSERT INTO settlements (merchant_id, period, total_amount, status, generated_at)
           VALUES (?, ?, ?, 'pending', NOW())`,
          [row.merchant_id, period, row.total_amount]
        );

        results.push({ merchant_id: row.merchant_id, amount: row.total_amount });
      }

      await connection.commit();
      return { success: true, count: results.length, period };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 정산용 XML 파일 생성 (가상 구현)
   */
  async generateSettlementFile(settlementId) {
    const [[settlement]] = await pool.execute(
      `SELECT s.*, m.name as merchant_name 
       FROM settlements s 
       JOIN merchants m ON s.merchant_id = m.id 
       WHERE s.id = ?`,
      [settlementId]
    );

    if (!settlement) throw new Error('정산 내역을 찾을 수 없습니다.');

    // XML 특수문자 이스케이프 함수 (XML 인젝션 방어)
    const escapeXml = (str) => String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // CDATA 탈출(]]>) 방어
    const safeMerchantName = String(settlement.merchant_name || '').replace(/\]\]>/g, ']]]]><![CDATA[>');

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<SettlementRequest>
  <Header>
    <TargetPeriod>${escapeXml(settlement.period)}</TargetPeriod>
    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
  </Header>
  <Body>
    <Merchant>
      <Id>${settlement.merchant_id}</Id>
      <Name><![CDATA[${safeMerchantName}]]></Name>
      <Amount>${settlement.total_amount}</Amount>
    </Merchant>
  </Body>
</SettlementRequest>`;

    const safePeriod = settlement.period.replace(/[^0-9-]/g, '');
    const fileName = `settlement_${settlement.merchant_id}_${safePeriod}.xml`;
    
    // 공개 public 디렉터리가 아닌 내부 보호 스토리지에 격리 저장
    const storagePath = path.join(__dirname, '../../storage/settlements');
    await fs.mkdir(storagePath, { recursive: true });
    await fs.writeFile(path.join(storagePath, fileName), xmlContent, 'utf8');

    // DB 업데이트 (다운로드 API 경로로 기록)
    const downloadPath = `/api/admin/settlements/download/${fileName}`;
    await pool.execute(
      `UPDATE settlements SET status = 'file_generated', file_path = ? WHERE id = ?`,
      [downloadPath, settlementId]
    );

    return downloadPath;
  }
}

module.exports = new SettlementService();
