import express from 'express';
import metricsRoutes from './routes/metrics.routes';
import { pool } from './db';

const app = express();
app.use(express.json());
app.use('/api/metrics', metricsRoutes);

async function testFailureReasons() {
  console.log('--- STARTING FAILURE REASONS METRICS TEST ---');

  // 1. Setup Mock Merchant
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Reason Test Merchant', 'reason${Date.now()}@test.com', 'acc_reason_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_reason_1', 'Reason Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  // Insert Scenario
  // 5 INSUFFICIENT_FUNDS
  for (let i = 0; i < 5; i++) {
    await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason) VALUES ($1, $2, 'pay_r_i_${Date.now()}_${Math.random()}', 1000, 'INR', 'FAILED', 'insufficient_funds');`, [merchantId, customerId]);
  }
  // 3 CARD_DECLINED
  for (let i = 0; i < 3; i++) {
    await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason) VALUES ($1, $2, 'pay_r_c_${Date.now()}_${Math.random()}', 1000, 'INR', 'FAILED', 'card_declined');`, [merchantId, customerId]);
  }
  // 2 NETWORK_ERROR
  for (let i = 0; i < 2; i++) {
    await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason) VALUES ($1, $2, 'pay_r_n_${Date.now()}_${Math.random()}', 1000, 'INR', 'FAILED', 'network_error');`, [merchantId, customerId]);
  }
  // 1 UNKNOWN (NULL failure_reason)
  await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason) VALUES ($1, $2, 'pay_r_u_${Date.now()}_${Math.random()}', 1000, 'INR', 'FAILED', NULL);`, [merchantId, customerId]);

  console.log('✅ Setup Test Scenario (5 insufficient_funds, 3 card_declined, 2 network_error, 1 NULL)');

  const server = app.listen(8014, async () => {
    try {
      console.log('⏳ Server listening on 8014...');
      const response = await fetch(`http://localhost:8014/api/metrics/${merchantId}`);
      const apiData = await response.json();

      console.log('📊 API Route Response: failedPaymentsByReason');
      console.log(JSON.stringify(apiData.failedPaymentsByReason, null, 2));

      const reasons = apiData.failedPaymentsByReason;

      // Asserts
      if (!reasons || typeof reasons !== 'object') {
        console.error('❌ failedPaymentsByReason is missing or not an object');
        process.exit(1);
      }

      if (reasons.INSUFFICIENT_FUNDS !== 5) {
        console.error('❌ INSUFFICIENT_FUNDS mismatch! Expected 5, got', reasons.INSUFFICIENT_FUNDS);
        process.exit(1);
      }
      if (reasons.CARD_DECLINED !== 3) {
        console.error('❌ CARD_DECLINED mismatch! Expected 3, got', reasons.CARD_DECLINED);
        process.exit(1);
      }
      if (reasons.NETWORK_ERROR !== 2) {
        console.error('❌ NETWORK_ERROR mismatch! Expected 2, got', reasons.NETWORK_ERROR);
        process.exit(1);
      }
      if (reasons.UNKNOWN !== 1) {
        console.error('❌ UNKNOWN mismatch! Expected 1, got', reasons.UNKNOWN);
        process.exit(1);
      }
      if (Object.keys(reasons).length !== 4) {
        console.error('❌ Unexpected keys found in reason mapping!');
        process.exit(1);
      }

      console.log('✅ failedPaymentsByReason perfectly calculated with UPPER casing and NULL mapping!');
      console.log('🏆 FAILURE REASONS TEST PASSED!');
      server.close();
      process.exit(0);

    } catch (e: any) {
      console.error(e);
      server.close();
      process.exit(1);
    }
  });
}

testFailureReasons().catch(e => {
  console.error(e);
  process.exit(1);
});

