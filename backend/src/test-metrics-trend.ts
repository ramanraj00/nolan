import express from 'express';
import metricsRoutes from './routes/metrics.routes';
import { pool } from './db';

const app = express();
app.use(express.json());
app.use('/api/metrics', metricsRoutes);

async function testRecoveryTrend() {
  console.log('--- STARTING RECOVERY TREND METRICS TEST ---');

  // 1. Setup Mock Merchant
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Trend Test Merchant', 'trend${Date.now()}@test.com', 'acc_trend_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_trend_1', 'Trend Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  // Insert Scenarios:
  
  // A) Recovered TODAY (1000)
  const pA = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status) VALUES ($1, $2, 'pay_t_a_${Date.now()}', 1000, 'INR', 'FAILED') RETURNING id;`, [merchantId, customerId]);
  await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status, recovered_at) VALUES ($1, $2, 1000, 'RECOVERED', CURRENT_TIMESTAMP);`, [merchantId, pA.rows[0].id]);

  // B) Recovered 2 DAYS AGO (5000)
  const pB = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status) VALUES ($1, $2, 'pay_t_b_${Date.now()}', 5000, 'INR', 'FAILED') RETURNING id;`, [merchantId, customerId]);
  await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status, recovered_at) VALUES ($1, $2, 5000, 'RECOVERED', CURRENT_TIMESTAMP - INTERVAL '2 days');`, [merchantId, pB.rows[0].id]);

  // C) Recovered 10 DAYS AGO (Should not be in trend) (9999)
  const pC = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status) VALUES ($1, $2, 'pay_t_c_${Date.now()}', 9999, 'INR', 'FAILED') RETURNING id;`, [merchantId, customerId]);
  await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status, recovered_at) VALUES ($1, $2, 9999, 'RECOVERED', CURRENT_TIMESTAMP - INTERVAL '10 days');`, [merchantId, pC.rows[0].id]);

  console.log('✅ Setup Test Scenario');

  const server = app.listen(8010, async () => {
    try {
      console.log('⏳ Server listening on 8010...');
      const response = await fetch(`http://localhost:8010/api/metrics/${merchantId}`);
      const apiData = await response.json();

      console.log('📊 API Route Response: recoveryTrend');
      console.log(JSON.stringify(apiData.recoveryTrend, null, 2));

      // Asserts
      if (!Array.isArray(apiData.recoveryTrend) || apiData.recoveryTrend.length !== 7) {
        console.error('❌ recoveryTrend is not a 7-item array!');
        process.exit(1);
      }

      // Check today's value (last item in array usually since it's ASC)
      const todayString = new Date().toISOString().split('T')[0];
      const todayItem = apiData.recoveryTrend.find((t: any) => t.date === todayString);
      
      if (!todayItem || todayItem.recoveredRevenue !== 1000) {
        console.error('❌ Today recovered revenue mismatch in trend!', todayItem);
        process.exit(1);
      }

      // Check 2 days ago
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoString = twoDaysAgo.toISOString().split('T')[0];
      const twoDaysAgoItem = apiData.recoveryTrend.find((t: any) => t.date === twoDaysAgoString);

      if (!twoDaysAgoItem || twoDaysAgoItem.recoveredRevenue !== 5000) {
        console.error('❌ 2 Days Ago recovered revenue mismatch in trend!', twoDaysAgoItem);
        process.exit(1);
      }

      // Ensure 10 days ago is NOT there
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const tenDaysAgoString = tenDaysAgo.toISOString().split('T')[0];
      const tenDaysAgoItem = apiData.recoveryTrend.find((t: any) => t.date === tenDaysAgoString);

      if (tenDaysAgoItem) {
         console.error('❌ 10 Days Ago should NOT be in the trend array!', tenDaysAgoItem);
         process.exit(1);
      }

      console.log('✅ recoveryTrend perfectly calculated generating a clean 7-day array!');
      console.log('🏆 RECOVERY TREND TEST PASSED!');
      server.close();
      process.exit(0);

    } catch (e: any) {
      console.error(e);
      server.close();
      process.exit(1);
    }
  });
}

testRecoveryTrend().catch(e => {
  console.error(e);
  process.exit(1);
});

