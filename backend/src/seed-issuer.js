const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function run() {
  try {
    // 1. 기존 테스트 계정 및 배정 클렌징 (안전하게 username 매칭 삭제)
    const [existing] = await db.query("SELECT id FROM issuers WHERE username IN ('issuer01', 'issuer02')");
    const ids = existing.map(r => r.id);
    
    if (ids.length > 0) {
      await db.query("DELETE FROM issuer_allocations WHERE issuer_id IN (?)", [ids]);
      await db.query("DELETE FROM issuers WHERE id IN (?)", [ids]);
      console.log('[SEED] Cleansed existing test issuers and allocations.');
    }

    const defaultPass = 'issuer1234';
    const hash = await bcrypt.hash(defaultPass, 10);

    // 2. 발행처 1 생성 (인천항 연안여객터미널 안내소 - 10,000원권 100장 배정)
    const name1 = '인천항 연안여객터미널 안내소';
    const username1 = 'issuer01';
    const [res1] = await db.query(
      'INSERT INTO issuers (name, username, password_hash) VALUES (?, ?, ?)',
      [name1, username1, hash]
    );
    const id1 = res1.insertId;
    await db.query(
      'INSERT INTO issuer_allocations (issuer_id, face_value, total_count, issued_count) VALUES (?, ?, ?, ?)',
      [id1, 10000, 100, 0]
    );
    console.log(`[SEED] Created Issuer 1: username=${username1}, password=${defaultPass}, allocation=10,000 KRW x 100`);

    // 3. 발행처 2 생성 (대부도 여객선 대합실 - 5,000원권 200장 배정)
    const name2 = '대부도 여객선 대합실';
    const username2 = 'issuer02';
    const [res2] = await db.query(
      'INSERT INTO issuers (name, username, password_hash) VALUES (?, ?, ?)',
      [name2, username2, hash]
    );
    const id2 = res2.insertId;
    await db.query(
      'INSERT INTO issuer_allocations (issuer_id, face_value, total_count, issued_count) VALUES (?, ?, ?, ?)',
      [id2, 5000, 200, 0]
    );
    console.log(`[SEED] Created Issuer 2: username=${username2}, password=${defaultPass}, allocation=5,000 KRW x 200`);

  } catch (err) {
    console.error('[SEED] Error seeding clean issuer data:', err);
  } finally {
    process.exit(0);
  }
}

run();
