import express from 'express';
import metricsRoutes from './routes/metrics.routes';
import { pool } from './db';

const app = express();
app.use(express.json());
app.use('/api/metrics', metricsRoutes);

async function testRecoveryStatusBreakdown() {
  console.log('--- STARTING RECOVERY STATUS BREAKDOWN TEST ---');

  // 1. Setup Mock Merchant
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Status Test Merchant', 'status${Date.now()}@test.com', 'acc_status_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_status_1', 'Status Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  // 2. Insert Scenarios
  // - 3 OPEN
  // - 2 RECOVERED
  // - 1 ESCALATED
  // - 0 UNRECOVERABLE, STOPPED, etc.
  
  const statuses = [
    'OPEN', 'OPEN', 'OPEN',
    'RECOVERED', 'RECOVERED',
    'ESCALATED'
  ];

  for (const status of statuses) {
    const p = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status) VALUES ($1, $2, 'pay_s_${Date.now()}_${Math.random()}', 1000, 'INR', 'FAILED') RETURNING id;`, [merchantId, customerId]);
    await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status) VALUES ($1, $2, 1000, $3);`, [merchantId, p.rows[0].id, status]);
  }

  console.log('✅ Setup Test Scenario (3 OPEN, 2 RECOVERED, 1 ESCALATED, others 0)');

  const server = app.listen(8011, async () => {
    try {
      console.log('⏳ Server listening on 8011...');
      const response = await fetch(`http://localhost:8011/api/metrics/${merchantId}`);
      const apiData = await response.json();

      console.log('📊 API Route Response: recoveryCasesByStatus');
      console.log(JSON.stringify(apiData.recoveryCasesByStatus, null, 2));

      const breakdown = apiData.recoveryCasesByStatus;

      // Asserts
      if (!breakdown || typeof breakdown !== 'object') {
         console.error('❌ breakdown object is missing!');
         process.exit(1);
      }

      if (breakdown.OPEN !== 3) {
         console.error('❌ OPEN count mismatch! Expected 3, got', breakdown.OPEN);
         process.exit(1);
      }

      if (breakdown.RECOVERED !== 2) {
         console.error('❌ RECOVERED count mismatch! Expected 2, got', breakdown.RECOVERED);
         process.exit(1);
      }

      if (breakdown.ESCALATED !== 1) {
         console.error('❌ ESCALATED count mismatch! Expected 1, got', breakdown.ESCALATED);
         process.exit(1);
      }

      // Check empty states
      if (breakdown.UNRECOVERABLE !== 0 || breakdown.STOPPED !== 0 || breakdown.IN_PROGRESS !== 0 || breakdown.ANALYZING !== 0 || breakdown.ACTION_PENDING !== 0) {
         console.error('❌ Zero-count statuses mismatch! Expected 0 for unused states.');
         process.exit(1);
      }

      // Ensure total keys is exactly 8
      if (Object.keys(breakdown).length !== 8) {
         console.error('❌ Breakdown object does not have exactly 8 keys! Missing a status?');
         process.exit(1);
      }

      console.log('✅ recoveryCasesByStatus perfectly calculated with 0-filled mapping!');
      console.log('🏆 RECOVERY STATUS BREAKDOWN TEST PASSED!');
      server.close();
      process.exit(0);

    } catch (e: any) {
      console.error(e);
      server.close();
      process.exit(1);
    }
  });
}

testRecoveryStatusBreakdown().catch(e => {
  console.error(e);
  process.exit(1);
});

