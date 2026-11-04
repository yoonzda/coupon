const cron = require('node-cron');
const pool = require('../config/database');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * 정산 XML 파일 생성 (은행 표준 대량이체 포맷 기준)
 * 실제 은행 API 계약 후 전송 로직 추가
 */
async function generateSettlementFiles() {
  const period = getPrevMonth(); // 'YYYY-MM'
  logger.info(`[정산] ${period} 정산 파일 생성 시작`);

  try {
    // 전월 정산 대상 가맹점 집계
    const [rows] = await pool.execute(
      `SELECT m.id AS merchant_id, m.name, SUM(ct.amount) AS total_amount
       FROM coupon_transactions ct
       JOIN merchants m ON m.id = ct.merchant_id
       WHERE DATE_FORMAT(ct.scanned_at, '%Y-%m') = ?
         AND m.status = 'approved'
       GROUP BY m.id, m.name
       HAVING total_amount > 0`,
      [period]
    );

    if (rows.length === 0) {
      logger.info(`[정산] ${period} — 정산 대상 없음`);
      return;
    }

    // XML 생성
    const xml = buildSettlementXML(rows, period);
    const outputDir = path.join(__dirname, '../../../storage/settlements');
    fs.mkdirSync(outputDir, { recursive: true });
    const fileName = `settlement_${period}.xml`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, xml, 'utf8');

    // DB 기록
    for (const row of rows) {
      await pool.execute(
        `INSERT INTO settlements (merchant_id, period, total_amount, status, generated_at, file_path)
         VALUES (?, ?, ?, 'file_generated', NOW(), ?)
         ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount), status = 'file_generated',
           generated_at = NOW(), file_path = VALUES(file_path)`,
        [row.merchant_id, period, row.total_amount, filePath]
      );
    }

    logger.info(`[정산] ${period} — ${rows.length}개 가맹점 XML 생성 완료: ${filePath}`);
  } catch (err) {
    logger.error(`[정산] 파일 생성 오류: ${err.message}`);
  }
}

function getPrevMonth() {
  const now = new Date();
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  return `${y}-${String(m).padStart(2, '0')}`;
}

function buildSettlementXML(rows, period) {
  const items = rows.map(r =>
    `  <Transfer>
    <MerchantId>${r.merchant_id}</MerchantId>
    <MerchantName><![CDATA[${r.name}]]></MerchantName>
    <Period>${period}</Period>
    <Amount>${r.total_amount}</Amount>
  </Transfer>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Settlements>
  <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
  <Period>${period}</Period>
  <Count>${rows.length}</Count>
${items}
</Settlements>`;
}

// ── 스케줄 등록 (매월 1일 00:00 KST) ─────────────
const schedule = process.env.SETTLEMENT_CRON || '0 0 1 * *';
cron.schedule(schedule, generateSettlementFiles, {
  timezone: 'Asia/Seoul',
});

logger.info(`[정산 스케줄러] 등록 완료 (${schedule})`);

module.exports = { generateSettlementFiles };
