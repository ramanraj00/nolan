const { Pool } = require('pg');
const crypto = require('crypto');

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
    const merchantResult = await client.query("SELECT user_id FROM merchants WHERE email = 'demo@nolan.app' LIMIT 1");
    if (!merchantResult.rows.length) return console.error("Merchant not found");
    const merchantId = merchantResult.rows[0].user_id;

    const customerResult = await client.query("SELECT id FROM customers WHERE merchant_id = $1 LIMIT 5", [merchantId]);
    const customers = customerResult.rows;

    const now = new Date();

    for (let i = 0; i < 4; i++) {
      const pid = crypto.randomUUID();
      const cid = customers[i % customers.length].id;
      const amount = Math.floor(Math.random() * 40000) + 5000;
      
      const createdAt = new Date(now.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000); // within last 10 days
      
      await client.query(`
        INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason, gateway, payment_method, attempt_count, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        pid, merchantId, cid, 'pay_demo_ref_' + i, amount, 'INR', 'REFUNDED', null, 'Razorpay', 'Credit Card', 1, createdAt
      ]);
      console.log('Inserted REFUNDED payment', pid);
    }
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
