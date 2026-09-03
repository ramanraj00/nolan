const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'nolan_db', password: 'password', port: 5432 });
async function run() {
  const client = await pool.connect();
  const res = await client.query("SELECT id FROM recovery_actions WHERE status = 'SUCCESS' LIMIT 2");
  for (let i=0; i < res.rows.length; i++) {
     await client.query("UPDATE recovery_actions SET status = 'PENDING', executed_at = NULL, completed_at = NULL, result = 'Pending availability' WHERE id = $1", [res.rows[i].id]);
  }
  console.log("Made pending actions");
  client.release();
  await pool.end();
}
run();
