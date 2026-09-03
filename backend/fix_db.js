const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'nolan_db',
  password: 'password',
  port: 5432,
});

const foreignNames = [
  "John Smith", "Sarah Connor", "Bruce Wayne", "Clark Kent", 
  "Tony Stark", "Steve Rogers", "Natasha Romanoff", "Peter Parker",
  "Wanda Maximoff", "Stephen Strange", "Thor Odinson", "Carol Danvers"
];

const methods = ["Credit Card", "Debit Card", "UPI", "NetBanking", "Wallet"];
const gateways = ["Razorpay", "Stripe", "PayPal", "Braintree"];

async function fixDB() {
  try {
    // 1. Alter table to add new fields (columns)
    await pool.query(`
      ALTER TABLE payments 
      ADD COLUMN IF NOT EXISTS gateway VARCHAR(50) DEFAULT 'Razorpay',
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'Credit Card';
    `);

    const casesRes = await pool.query('SELECT rc.id as rc_id, rc.merchant_id, p.id as pay_id, p.customer_id FROM recovery_cases rc JOIN payments p ON p.id = rc.payment_id');
    
    let counter = 1000;

    for (let i = 0; i < casesRes.rows.length; i++) {
      const row = casesRes.rows[i];
      
      // Create a brand NEW customer for EVERY payment so names are always different
      const newName = foreignNames[i % foreignNames.length];
      const custRes = await pool.query(`
        INSERT INTO customers (merchant_id, external_customer_id, name, email) 
        VALUES ($1, $2, $3, $4) RETURNING id
      `, [row.merchant_id, 'ext_cust_' + Math.random().toString(36).substring(7), newName, newName.replace(' ', '.').toLowerCase() + '@example.com']);
      
      const newCustId = custRes.rows[0].id;
      
      // Make payment ID look clean like pay_8A9B2C
      const cleanPayId = 'pay_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const gateway = gateways[Math.floor(Math.random() * gateways.length)];
      const method = methods[Math.floor(Math.random() * methods.length)];

      await pool.query(`
        UPDATE payments 
        SET customer_id = $1, razorpay_payment_id = $2, gateway = $3, payment_method = $4
        WHERE id = $5
      `, [newCustId, cleanPayId, gateway, method, row.pay_id]);

    }
    
    console.log("DB Fixed: Assigned new distinct customers, clean pay IDs, and added Gateway & Method fields.");

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

fixDB();
