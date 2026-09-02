import express from 'express';
import metricsRoutes from './routes/metrics.routes';
import { pool } from './db';

const app = express();
app.use(express.json());
app.use('/api/metrics', metricsRoutes);

async function testPolicyPerformance() {
  console.log('--- STARTING POLICY PERFORMANCE METRICS TEST ---');

  // 1. Setup Mock Merchant
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Policy Test Merchant', 'policy${Date.now()}@test.com', 'acc_policy_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_policy_1', 'Policy Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  // Insert base payment, case, agent_decision
  const p = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason) VALUES ($1, $2, 'pay_pol_${Date.now()}', 1000, 'INR', 'FAILED', 'bank_error') RETURNING id;`, [merchantId, customerId]);
  const rc = await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status) VALUES ($1, $2, 1000, 'OPEN') RETURNING id;`, [merchantId, p.rows[0].id]);
  const caseId = rc.rows[0].id;

  const ad = await pool.query(`
    INSERT INTO agent_decisions (recovery_case_id, diagnosis, recommended_action, recommended_delay, confidence, reasoning, recovery_probability, model)
    VALUES ($1, 'Test', 'RETRY_PAYMENT', 24, 0.90, 'Test reasoning', 0.90, 'mock_model') RETURNING id;
  `, [caseId]);
  const agentDecisionId = ad.rows[0].id;

  // Insert Policy Decisions
  // Total: 20
  // allowed = true (15)
  // allowed = false (5)
  // requires_approval = true (3) (Wait, these 3 could be part of allowed or rejected, say we add 3 that are allowed=false and requires_approval=true)
  
  for (let i = 0; i < 15; i++) {
    await pool.query(`
      INSERT INTO policy_decisions (recovery_case_id, agent_decision_id, action, allowed, requires_approval, reason, rule)
      VALUES ($1, $2, 'RETRY_PAYMENT', true, false, 'Allowed by policy', 'default_allow');
    `, [caseId, agentDecisionId]);
  }

  for (let i = 0; i < 5; i++) {
    const reqApproval = i < 3 ? true : false; 
    await pool.query(`
      INSERT INTO policy_decisions (recovery_case_id, agent_decision_id, action, allowed, requires_approval, reason, rule)
      VALUES ($1, $2, 'RETRY_PAYMENT', false, $3, 'Rejected by policy', 'some_deny_rule');
    `, [caseId, agentDecisionId, reqApproval]);
  }

  console.log('✅ Setup Test Scenario (20 total, 15 allowed, 5 rejected, 3 require approval)');

  const server = app.listen(8016, async () => {
    try {
      console.log('⏳ Server listening on 8016...');
      const response = await fetch(`http://localhost:8016/api/metrics/${merchantId}`);
      const apiData = await response.json();

      console.log('📊 API Route Response: policyPerformance');
      console.log(JSON.stringify(apiData.policyPerformance, null, 2));

      const pol = apiData.policyPerformance;

      // Asserts
      if (!pol || typeof pol !== 'object') {
        console.error('❌ policyPerformance is missing or not an object');
        process.exit(1);
      }

      if (pol.totalEvaluations !== 20) {
        console.error('❌ totalEvaluations mismatch! Expected 20, got', pol.totalEvaluations);
        process.exit(1);
      }

      if (pol.allowed !== 15) {
        console.error('❌ allowed mismatch! Expected 15, got', pol.allowed);
        process.exit(1);
      }

      if (pol.rejected !== 5) {
        console.error('❌ rejected mismatch! Expected 5, got', pol.rejected);
        process.exit(1);
      }

      if (pol.approvalRequired !== 3) {
        console.error('❌ approvalRequired mismatch! Expected 3, got', pol.approvalRequired);
        process.exit(1);
      }

      console.log('✅ policyPerformance perfectly aggregated via chained JOINs!');
      console.log('🏆 POLICY PERFORMANCE TEST PASSED!');
      server.close();
      process.exit(0);

    } catch (e: any) {
      console.error(e);
      server.close();
      process.exit(1);
    }
  });
}

testPolicyPerformance().catch(e => {
  console.error(e);
  process.exit(1);
});
