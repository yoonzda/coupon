require('dotenv').config();
const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function main() {
  try {
    const hash = await bcrypt.hash('test1234', 10);
    const [existing] = await pool.execute('SELECT id, name FROM merchants WHERE username = ?', ['test']);
    
    if (existing.length > 0) {
      await pool.execute(
        'UPDATE merchants SET password_hash = ?, status = "approved" WHERE username = ?',
        [hash, 'test']
      );
      console.log('✅ 기존 가맹점 계정 업데이트 완료 (ID:', existing[0].id, existing[0].name, ')');
    } else {
      // 1번 가맹점(백령도 해물칼국수)의 username을 test로 설정
      const [res] = await pool.execute(
        'UPDATE merchants SET username = ?, password_hash = ?, status = "approved" WHERE id = 1',
        ['test', hash]
      );
      console.log('✅ 1번 가맹점(백령도 해물칼국수) test 계정으로 설정 완료');
    }
  } catch (err) {
    console.error('❌ 계정 생성 실패:', err);
  } finally {
    process.exit(0);
  }
}

main();
