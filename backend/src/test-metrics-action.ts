import express from 'express';
import metricsRoutes from './routes/metrics.routes';
import { pool } from './db';

const app = express();
app.use(express.json());
app.use('/api/metrics', metricsRoutes);

async function testActionPerformance() {
  console.log('--- STARTING ACTION PERFORMANCE METRICS TEST ---');

  // 1. Setup Mock Merchant
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Action Test Merchant', 'action${Date.now()}@test.com', 'acc_action_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_action_1', 'Action Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  // Insert base payment and case
  const p = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason) VALUES ($1, $2, 'pay_act_${Date.now()}', 1000, 'INR', 'FAILED', 'bank_error') RETURNING id;`, [merchantId, customerId]);
  const rc = await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status) VALUES ($1, $2, 1000, 'OPEN') RETURNING id;`, [merchantId, p.rows[0].id]);
  const caseId = rc.rows[0].id;

  // Total Actions: 20
  // SUCCESS: 12
  // FAILED: 5
  // CANCELLED: 3
  // Let's add 2 PENDING just to prove they count towards totalActions but not the buckets
  // Wait, the requirement says: "totalActions = 20, successful=12, failed=5, cancelled=3".
  // If I add 2 PENDING, totalActions should be 22. Let's do that!

  const ad = await pool.query(`INSERT INTO agent_decisions (recovery_case_id, diagnosis, recommended_action, recommended_delay, confidence, reasoning, recovery_probability, model) VALUES ($1, 'Test', 'RETRY_PAYMENT', 24, 0.90, 'Test', 0.90, 'mock_model') RETURNING id;`, [caseId]);

  // Helper to insert action
  const insertAction = async (status: string) => {
    const pd = await pool.query(`INSERT INTO policy_decisions (recovery_case_id, agent_decision_id, action, allowed, requires_approval, reason, rule) VALUES ($1, $2, 'RETRY_PAYMENT', true, false, 'Allowed', 'allow') RETURNING id;`, [caseId, ad.rows[0].id]);
    await pool.query(`
      INSERT INTO recovery_actions (recovery_case_id, policy_decision_id, type, status)
      VALUES ($1, $2, 'RETRY_PAYMENT', $3);
    `, [caseId, pd.rows[0].id, status]);
  };

  // 12 SUCCESS
  for (let i = 0; i < 12; i++) await insertAction('SUCCESS');

  // 5 FAILED
  for (let i = 0; i < 5; i++) await insertAction('FAILED');

  // 3 CANCELLED
  for (let i = 0; i < 3; i++) await insertAction('CANCELLED');

  // 2 PENDING
  for (let i = 0; i < 2; i++) await insertAction('PENDING');

  console.log('✅ Setup Test Scenario (22 total, 12 successful, 5 failed, 3 cancelled, 2 pending)');

  const server = app.listen(8017, async () => {
    try {
      console.log('⏳ Server listening on 8017...');
      const response = await fetch(`http://localhost:8017/api/metrics/${merchantId}`);
      const apiData = await response.json();

      console.log('📊 API Route Response: actionPerformance');
      console.log(JSON.stringify(apiData.actionPerformance, null, 2));

      const act = apiData.actionPerformance;

      // Asserts
      if (!act || typeof act !== 'object') {
        console.error('❌ actionPerformance is missing or not an object');
        process.exit(1);
      }

      if (act.totalActions !== 22) {
        console.error('❌ totalActions mismatch! Expected 22, got', act.totalActions);
        process.exit(1);
      }

      if (act.successful !== 12) {
        console.error('❌ successful mismatch! Expected 12, got', act.successful);
        process.exit(1);
      }

      if (act.failed !== 5) {
        console.error('❌ failed mismatch! Expected 5, got', act.failed);
        process.exit(1);
      }

      if (act.cancelled !== 3) {
        console.error('❌ cancelled mismatch! Expected 3, got', act.cancelled);
        process.exit(1);
      }

      console.log('✅ actionPerformance perfectly aggregated avoiding mid-states in buckets!');
      console.log('🏆 ACTION PERFORMANCE TEST PASSED!');
      server.close();
      process.exit(0);

    } catch (e: any) {
      console.error(e);
      server.close();
      process.exit(1);
    }
  });
}

testActionPerformance().catch(e => {
  console.error(e);
  process.exit(1);
});
