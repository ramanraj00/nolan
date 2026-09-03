const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'nolan_db',
  password: 'password',
  port: 5432,
});

const names = ["James Smith", "Mary Johnson", "Michael Williams", "Patricia Brown", "John Jones", "Jennifer Garcia", "Robert Miller", "Linda Davis"];
const amounts = [120000, 45000, 8500, 24000, 150000, 7500, 32000, 99000];
const diags = ["Insufficient Funds", "Card Blocked", "Network Timeout", "Authentication Failed", "Suspected Fraud", "Issuer Declined", "Card Expired", "Daily Limit Exceeded"];
const statuses = ["IN_PROGRESS", "OPEN", "ANALYZING", "ESCALATED", "STOPPED", "RECOVERED", "ACTION_PENDING", "UNRECOVERABLE"];

async function run() {
  try {
    const res = await pool.query(`SELECT rc.id, p.id as p_id, c.id as c_id FROM recovery_cases rc JOIN payments p ON p.id = rc.payment_id JOIN customers c ON c.id = p.customer_id ORDER BY rc.created_at DESC LIMIT 8`);
    
    for(let i=0; i<8; i++) {
       const row = res.rows[i];
       if(!row) break;

       const prob = Math.floor(Math.random() * 85) + 10;
       
       await pool.query('UPDATE customers SET name = $1 WHERE id = $2', [names[i], row.c_id]);
       await pool.query('UPDATE payments SET amount = $1 WHERE id = $2', [amounts[i], row.p_id]);
       await pool.query('UPDATE recovery_cases SET diagnosis = $1, status = $2, revenue_at_risk = $3, recovery_probability = $4 WHERE id = $5', [diags[i], statuses[i], amounts[i], prob, row.id]);
    }
    console.log("DB is now PERFECT for the hackathon!");
  } catch(e) { console.error(e); }
  finally { await pool.end(); }
}
run();
