const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'nolan_db', password: 'password', port: 5432 });
async function run() {
  const client = await pool.connect();
  const res = await client.query("SELECT status, count(*) FROM recovery_actions GROUP BY status");
  console.log(res.rows);
  client.release();
  await pool.end();
}
run();
