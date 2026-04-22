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

      // 1. 해당 기간의 가맹점별 쿠폰 사용 합계 조회
      const [transactions] = await connection.execute(
        `SELECT 
           merchant_id, 
           SUM(amount) as total_amount,
           COUNT(*) as transaction_count
         FROM coupon_transactions
         WHERE DATE_FORMAT(scanned_at, '%Y-%m') = ?
         GROUP BY merchant_id`,
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

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<SettlementRequest>
  <Header>
    <TargetPeriod>${settlement.period}</TargetPeriod>
    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
  </Header>
  <Body>
    <Merchant>
      <Id>${settlement.merchant_id}</Id>
      <Name>${settlement.merchant_name}</Name>
      <Amount>${settlement.total_amount}</Amount>
    </Merchant>
  </Body>
</SettlementRequest>`;

    const fileName = `settlement_${settlement.merchant_id}_${settlement.period}.xml`;
    const publicPath = path.join(__dirname, '../../../frontend/public/settlements');
    
    // 폴더 생성
    await fs.mkdir(publicPath, { recursive: true });
    await fs.writeFile(path.join(publicPath, fileName), xmlContent);

    // DB 업데이트
    await pool.execute(
      `UPDATE settlements SET status = 'file_generated', file_path = ? WHERE id = ?`,
      [`/settlements/${fileName}`, settlementId]
    );

    return `/settlements/${fileName}`;
  }
}

module.exports = new SettlementService();
