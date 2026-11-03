const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function main() {
  try {
    const hash = await bcrypt.hash('admin1234', 10);
    const [res] = await pool.execute(
      'UPDATE admins SET password_hash = ?, name = "최고 관리자", role = "super" WHERE username = "admin"',
      [hash]
    );
    console.log('✅ admin 계정 비밀번호를 admin1234 로 업데이트 성공! (affectedRows:', res.affectedRows, ')');
  } catch (err) {
    console.error('❌ 업데이트 실패:', err);
  } finally {
    process.exit(0);
  }
}

main();
