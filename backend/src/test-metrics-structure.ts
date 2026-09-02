import express from 'express';
import metricsRoutes from './routes/metrics.routes';
import { pool } from './db';

const app = express();
app.use(express.json());
app.use('/api/metrics', metricsRoutes);

async function testMetricsStructure() {
  console.log('--- STARTING METRICS STRUCTURE TEST ---');

  // 1. Setup Mock Merchant
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Structure Test Merchant', 'struct${Date.now()}@test.com', 'acc_struct_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_struct_1', 'Struct Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  // Insert mock data
  const pA = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status) VALUES ($1, $2, 'pay_st_A_${Date.now()}', 1000, 'INR', 'FAILED') RETURNING id;`, [merchantId, customerId]);
  await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status, recovered_at, recovery_probability) VALUES ($1, $2, 1000, 'RECOVERED', CURRENT_TIMESTAMP, 72.50);`, [merchantId, pA.rows[0].id]);

  console.log('✅ Setup Test Data');

  const server = app.listen(8013, async () => {
    try {
      console.log('⏳ Server listening on 8013...');
      const response = await fetch(`http://localhost:8013/api/metrics/${merchantId}`);
      const apiData = await response.json();

      console.log('📊 API Route Response:');
      console.log(JSON.stringify(apiData, null, 2));

      // Assert Top-Level Structure
      if (!apiData.summary || typeof apiData.summary !== 'object') {
        console.error('❌ Missing "summary" object');
        process.exit(1);
      }
      if (!apiData.recoveryCasesByStatus || typeof apiData.recoveryCasesByStatus !== 'object') {
        console.error('❌ Missing "recoveryCasesByStatus" object');
        process.exit(1);
      }
      if (!Array.isArray(apiData.recoveryTrend)) {
        console.error('❌ Missing "recoveryTrend" array');
        process.exit(1);
      }

      // Assert Summary Fields
      const sum = apiData.summary;
      if (
        sum.totalRevenueAtRisk !== 1000 ||
        sum.recoveredRevenue !== 1000 ||
        sum.recoveryRate !== 100 ||
        sum.failedPayments !== 1 ||
        sum.recoveryCases !== 1 ||
        sum.recoveredRevenueToday !== 1000 ||
        sum.averageRecoveryProbability !== 72.5
      ) {
        console.error('❌ Summary math broke during refactor!', sum);
        process.exit(1);
      }

      // Assert Status Fields
      if (apiData.recoveryCasesByStatus.RECOVERED !== 1 || apiData.recoveryCasesByStatus.OPEN !== 0) {
        console.error('❌ Status breakdown broke during refactor!');
        process.exit(1);
      }

      // Assert Trend Array
      if (apiData.recoveryTrend.length !== 7) {
        console.error('❌ Trend array length broke during refactor!');
        process.exit(1);
      }

      console.log('✅ Payload Structure and Math precisely verified!');
      console.log('🏆 METRICS STRUCTURE TEST PASSED!');
      server.close();
      process.exit(0);

    } catch (e: any) {
      console.error(e);
      server.close();
      process.exit(1);
    }
  });
}

testMetricsStructure().catch(e => {
  console.error(e);
  process.exit(1);
});

