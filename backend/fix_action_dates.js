const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'nolan_db',
  password: 'password',
  port: 5432,
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT id, status, created_at FROM recovery_actions");
    for (const row of res.rows) {
      const created = new Date(row.created_at);
      const scheduled = new Date(created.getTime() + 10000); // 10s after created
      const executed = new Date(scheduled.getTime() + 5000); // 5s after scheduled
      const completed = new Date(executed.getTime() + 20000); // 20s after executed
      
      if (['EXECUTING', 'SUCCESS', 'FAILED'].includes(row.status)) {
        await client.query(`
          UPDATE recovery_actions 
          SET scheduled_at = $1, executed_at = $2, completed_at = $3
          WHERE id = $4
        `, [scheduled, executed, row.status === 'EXECUTING' ? null : completed, row.id]);
      } else if (['SCHEDULED'].includes(row.status)) {
        await client.query(`
          UPDATE recovery_actions 
          SET scheduled_at = $1
          WHERE id = $2
        `, [scheduled, row.id]);
      }
    }
    console.log('Fixed dates');
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
