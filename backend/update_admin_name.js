const pool = require('./backend/src/config/database');

async function fixDb() {
  try {
    const [result] = await pool.execute(
      `UPDATE admins SET name = '누리아이' WHERE username = 'admin'`
    );
    console.log('Updated admin name to 누리아이:', result.affectedRows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
fixDb();
