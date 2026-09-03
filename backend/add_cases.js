const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'nolan_db', password: 'password', port: 5432 });

async function add() {
  try {
    const res = await pool.query('SELECT merchant_id, customer_id FROM payments LIMIT 1');
    const { merchant_id, customer_id } = res.rows[0];

    for(let i=0; i<4; i++) {
       const payRes = await pool.query(`
         INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, status, failure_reason)
         VALUES ($1, $2, $3, $4, 'FAILED', 'Mock Failure') RETURNING id;
       `, [merchant_id, customer_id, 'pay_mock_' + Math.random().toString(36).substring(7), 50000]);

       await pool.query(`
         INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, recovery_probability, diagnosis, status)
         VALUES ($1, $2, $3, $4, $5, $6);
       `, [merchant_id, payRes.rows[0].id, 50000, 88, 'Network Timeout', 'ACTION_PENDING']);
    }
    console.log("Added 4 more cases!");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
add();
