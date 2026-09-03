const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'nolan_db',
  password: 'password',
  port: 5432,
});

const names = ["Thomas Walker", "Sarah Hall", "Matthew Allen", "Jessica Young", "Christopher Hernandez", "Karen King", "Daniel Wright", "Nancy Lopez", "Paul Hill", "Lisa Scott", "Mark Green", "Betty Adams", "Donald Baker", "Margaret Gonzalez", "George Nelson", "Sandra Carter", "Kenneth Mitchell", "Ashley Perez", "Steven Roberts", "Kimberly Turner"];
const diags = ["Insufficient Funds", "Card Blocked", "Network Timeout", "Authentication Failed", "Suspected Fraud", "Issuer Declined", "Card Expired", "Daily Limit Exceeded"];
const statuses = ["IN_PROGRESS", "OPEN", "ANALYZING", "ESCALATED", "STOPPED", "RECOVERED", "ACTION_PENDING", "UNRECOVERABLE"];

async function run() {
  try {
    const mRes = await pool.query('SELECT user_id FROM merchants');
    
    // Add 20 more cases to every merchant so pagination works everywhere!
    for (let m = 0; m < mRes.rows.length; m++) {
      const merchantId = mRes.rows[m].user_id;
      const shortM = merchantId.substring(0, 4);

      for(let i=0; i<20; i++) {
         const amount = Math.floor(Math.random() * 100000) + 1000;
         const cRes = await pool.query(`
           INSERT INTO customers (merchant_id, external_customer_id, name, email) 
           VALUES ($1, $2, $3, $4) RETURNING id
         `, [merchantId, 'ext_p_' + shortM + i, names[i], 'test' + i + '@test.com']);
         
         const pRes = await pool.query(`
           INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, status, failure_reason)
           VALUES ($1, $2, $3, $4, 'FAILED', $5) RETURNING id
         `, [merchantId, cRes.rows[0].id, 'pay_' + names[i].split(' ')[0].toLowerCase() + '_' + (2000+i) + '_' + shortM, amount, diags[i % diags.length]]);

         await pool.query(`
           INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, recovery_probability, diagnosis, status)
           VALUES ($1, $2, $3, $4, $5, $6)
         `, [merchantId, pRes.rows[0].id, amount, Math.floor(Math.random() * 85) + 10, diags[i % diags.length], statuses[i % statuses.length]]);
      }
    }
    console.log("Added 20 more rows to every merchant.");
  } catch(e) { console.error(e); }
  finally { await pool.end(); }
}
run();
