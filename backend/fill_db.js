const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'nolan_db',
  password: 'password',
  port: 5432,
});

const names = ["James Smith", "Mary Johnson", "Michael Williams", "Patricia Brown", "John Jones", "Jennifer Garcia", "Robert Miller", "Linda Davis"];
const amounts = [2845637, 45000, 8500, 24000, 150000, 7500, 32000, 99000];
const diags = ["Insufficient Funds", "Card Blocked", "Network Timeout", "Authentication Failed", "Suspected Fraud", "Issuer Declined", "Card Expired", "Daily Limit Exceeded"];
const statuses = ["IN_PROGRESS", "OPEN", "ANALYZING", "ESCALATED", "STOPPED", "RECOVERED", "ACTION_PENDING", "UNRECOVERABLE"];

async function run() {
  try {
    // Delete all cases, payments, customers so we have a blank slate
    await pool.query('DELETE FROM recovery_cases');
    await pool.query('DELETE FROM payments');
    await pool.query('DELETE FROM customers');

    const mRes = await pool.query('SELECT user_id FROM merchants');
    
    // For EVERY merchant, add the exact 8 cases so the UI is guaranteed to show them!
    for (let m = 0; m < mRes.rows.length; m++) {
      const merchantId = mRes.rows[m].user_id;
      const shortM = merchantId.substring(0, 4);

      for(let i=0; i<8; i++) {
         const cRes = await pool.query(`
           INSERT INTO customers (merchant_id, external_customer_id, name, email) 
           VALUES ($1, $2, $3, $4) RETURNING id
         `, [merchantId, 'ext_' + shortM + i, names[i], 'test@test.com']);
         
         const pRes = await pool.query(`
           INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, status, failure_reason)
           VALUES ($1, $2, $3, $4, 'FAILED', $5) RETURNING id
         `, [merchantId, cRes.rows[0].id, 'pay_' + names[i].split(' ')[0].toLowerCase() + '_' + (1024+i) + '_' + shortM, amounts[i], diags[i]]);

         await pool.query(`
           INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, recovery_probability, diagnosis, status)
           VALUES ($1, $2, $3, $4, $5, $6)
         `, [merchantId, pRes.rows[0].id, amounts[i], Math.floor(Math.random() * 85) + 10, diags[i], statuses[i]]);
      }
    }
    console.log("SUCCESS! Every merchant now has exactly 8 perfect cases.");
  } catch(e) { console.error(e); }
  finally { await pool.end(); }
}
run();
