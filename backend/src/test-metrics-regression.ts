import express from 'express';
import metricsRoutes from './routes/metrics.routes';
import { pool } from './db';

const app = express();
app.use(express.json());
app.use('/api/metrics', metricsRoutes);

async function testRegression() {
  console.log('--- STARTING COMPREHENSIVE METRICS REGRESSION TEST ---');

  // 1. Setup Mock Merchant
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Regression Merchant', 'reg${Date.now()}@test.com', 'acc_reg_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_reg_1', 'Reg Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  // 2. Insert 6 Payments
  const p1 = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason) VALUES ($1, $2, 'p1_${Date.now()}', 1000, 'INR', 'FAILED', 'bank_error') RETURNING id;`, [merchantId, customerId]);
  const p2 = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason) VALUES ($1, $2, 'p2_${Date.now()}', 2000, 'INR', 'FAILED', 'bank_error') RETURNING id;`, [merchantId, customerId]);
  const p3 = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason) VALUES ($1, $2, 'p3_${Date.now()}', 3000, 'INR', 'FAILED', 'insufficient_funds') RETURNING id;`, [merchantId, customerId]);
  const p4 = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason) VALUES ($1, $2, 'p4_${Date.now()}', 4000, 'INR', 'FAILED', 'insufficient_funds') RETURNING id;`, [merchantId, customerId]);
  const p5 = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason) VALUES ($1, $2, 'p5_${Date.now()}', 5000, 'INR', 'FAILED', 'insufficient_funds') RETURNING id;`, [merchantId, customerId]);
  const p6 = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason) VALUES ($1, $2, 'p6_${Date.now()}', 6000, 'INR', 'FAILED', NULL) RETURNING id;`, [merchantId, customerId]);

  // 3. Insert 6 Recovery Cases
  const rc1 = await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status, recovered_at, recovery_probability) VALUES ($1, $2, 1000, 'RECOVERED', CURRENT_TIMESTAMP, 0.90) RETURNING id;`, [merchantId, p1.rows[0].id]);
  const rc2 = await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status, recovered_at, recovery_probability) VALUES ($1, $2, 2000, 'RECOVERED', CURRENT_TIMESTAMP - INTERVAL '1 day', 0.80) RETURNING id;`, [merchantId, p2.rows[0].id]);
  const rc3 = await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status, recovery_probability) VALUES ($1, $2, 3000, 'OPEN', 0.70) RETURNING id;`, [merchantId, p3.rows[0].id]);
  const rc4 = await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status, recovery_probability) VALUES ($1, $2, 4000, 'IN_PROGRESS', 0.60) RETURNING id;`, [merchantId, p4.rows[0].id]);
  const rc5 = await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status, recovery_probability) VALUES ($1, $2, 5000, 'ESCALATED', 0.50) RETURNING id;`, [merchantId, p5.rows[0].id]);
  const rc6 = await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status, recovery_probability) VALUES ($1, $2, 6000, 'UNRECOVERABLE', 0.40) RETURNING id;`, [merchantId, p6.rows[0].id]);

  // 4. Insert 2 Agent Decisions
  const ad1 = await pool.query(`INSERT INTO agent_decisions (recovery_case_id, diagnosis, recommended_action, recommended_delay, confidence, reasoning, recovery_probability, model) VALUES ($1, 'Test', 'RETRY_PAYMENT', 24, 0.85, 'Test', 0.80, 'mock_model') RETURNING id;`, [rc3.rows[0].id]);
  const ad2 = await pool.query(`INSERT INTO agent_decisions (recovery_case_id, diagnosis, recommended_action, recommended_delay, confidence, reasoning, recovery_probability, model) VALUES ($1, 'Test', 'RETRY_PAYMENT', 24, 0.95, 'Test', 0.80, 'mock_model') RETURNING id;`, [rc4.rows[0].id]);

  // 5. Insert 2 Policy Decisions
  const pd1 = await pool.query(`INSERT INTO policy_decisions (recovery_case_id, agent_decision_id, action, allowed, requires_approval, reason, rule) VALUES ($1, $2, 'RETRY_PAYMENT', true, false, 'Allowed', 'allow') RETURNING id;`, [rc3.rows[0].id, ad1.rows[0].id]);
  const pd2 = await pool.query(`INSERT INTO policy_decisions (recovery_case_id, agent_decision_id, action, allowed, requires_approval, reason, rule) VALUES ($1, $2, 'RETRY_PAYMENT', false, true, 'Denied', 'deny') RETURNING id;`, [rc4.rows[0].id, ad2.rows[0].id]);

  // 6. Insert 3 Recovery Actions
  await pool.query(`INSERT INTO recovery_actions (recovery_case_id, policy_decision_id, type, status) VALUES ($1, $2, 'RETRY_PAYMENT', 'SUCCESS');`, [rc3.rows[0].id, pd1.rows[0].id]);
  
  // Note: One policy decision can spawn multiple retry actions conceptually, or we can make a dummy policy to not violate unique constraints!
  // Our schema says policy_decision_id is UNIQUE. So I'll create a 3rd policy decision for the pending action!
  const pd3 = await pool.query(`INSERT INTO policy_decisions (recovery_case_id, agent_decision_id, action, allowed, requires_approval, reason, rule) VALUES ($1, $2, 'RETRY_PAYMENT', true, false, 'Allowed2', 'allow2') RETURNING id;`, [rc4.rows[0].id, ad2.rows[0].id]);
  await pool.query(`INSERT INTO recovery_actions (recovery_case_id, policy_decision_id, type, status) VALUES ($1, $2, 'RETRY_PAYMENT', 'FAILED');`, [rc4.rows[0].id, pd2.rows[0].id]);
  await pool.query(`INSERT INTO recovery_actions (recovery_case_id, policy_decision_id, type, status) VALUES ($1, $2, 'RETRY_PAYMENT', 'PENDING');`, [rc4.rows[0].id, pd3.rows[0].id]);

  console.log('✅ Injected Massive Test Graph!');

  const server = app.listen(8020, async () => {
    try {
      console.log('⏳ Server listening on 8020...');
      const response = await fetch(`http://localhost:8020/api/metrics/${merchantId}`);
      const apiData = await response.json();

      console.log('📊 COMPLETE JSON PAYLOAD:');
      console.log(JSON.stringify(apiData, null, 2));

      // ---------------------------------------------------------
      // ASSERTIONS
      // ---------------------------------------------------------
      
      // 1. Root Keys
      const keys = Object.keys(apiData);
      const expectedKeys = ['summary', 'recoveryCasesByStatus', 'recoveryTrend', 'failedPaymentsByReason', 'aiPerformance', 'policyPerformance', 'actionPerformance'];
      for (const k of expectedKeys) {
        if (!keys.includes(k)) throw new Error(`Missing root key: ${k}`);
      }

      // 2. Summary Block
      const sum = apiData.summary;
      if (sum.totalRevenueAtRisk !== 21000) throw new Error(`sum.totalRevenueAtRisk expected 21000, got ${sum.totalRevenueAtRisk}`);
      if (sum.recoveredRevenue !== 3000) throw new Error(`sum.recoveredRevenue expected 3000, got ${sum.recoveredRevenue}`);
      if (sum.recoveryRate !== 14.29) throw new Error(`sum.recoveryRate expected 14.29, got ${sum.recoveryRate}`);
      if (sum.failedPayments !== 6) throw new Error(`sum.failedPayments expected 6, got ${sum.failedPayments}`);
      if (sum.recoveryCases !== 6) throw new Error(`sum.recoveryCases expected 6, got ${sum.recoveryCases}`);
      if (sum.recoveredRevenueToday !== 1000) throw new Error(`sum.recoveredRevenueToday expected 1000, got ${sum.recoveredRevenueToday}`);
      if (sum.averageRecoveryProbability !== 65.00) throw new Error(`sum.averageRecoveryProbability expected 65.00, got ${sum.averageRecoveryProbability}`);

      // 3. Status Breakdown
      const status = apiData.recoveryCasesByStatus;
      if (status.RECOVERED !== 2) throw new Error('Status RECOVERED wrong');
      if (status.OPEN !== 1) throw new Error('Status OPEN wrong');
      if (status.IN_PROGRESS !== 1) throw new Error('Status IN_PROGRESS wrong');
      if (status.ESCALATED !== 1) throw new Error('Status ESCALATED wrong');
      if (status.UNRECOVERABLE !== 1) throw new Error('Status UNRECOVERABLE wrong');
      if (status.STOPPED !== 0) throw new Error('Status STOPPED wrong');

      // 4. Failed Payments By Reason
      const reasons = apiData.failedPaymentsByReason;
      if (reasons.BANK_ERROR !== 2) throw new Error('Reason BANK_ERROR wrong');
      if (reasons.INSUFFICIENT_FUNDS !== 3) throw new Error('Reason INSUFFICIENT_FUNDS wrong');
      if (reasons.UNKNOWN !== 1) throw new Error('Reason UNKNOWN wrong');

      // 5. AI Performance
      const ai = apiData.aiPerformance;
      if (ai.totalDecisions !== 2) throw new Error('AI totalDecisions wrong');
      if (ai.averageConfidence !== 90.00) throw new Error('AI averageConfidence wrong');

      // 6. Policy Performance
      // We inserted 3 policies! 1 allowed, 1 rejected/req_approval, 1 allowed.
      // Total = 3, allowed = 2, rejected = 1, approvalRequired = 1
      const pol = apiData.policyPerformance;
      if (pol.totalEvaluations !== 3) throw new Error('Policy totalEvaluations wrong');
      if (pol.allowed !== 2) throw new Error('Policy allowed wrong');
      if (pol.rejected !== 1) throw new Error('Policy rejected wrong');
      if (pol.approvalRequired !== 1) throw new Error('Policy approvalRequired wrong');

      // 7. Action Performance
      const act = apiData.actionPerformance;
      if (act.totalActions !== 3) throw new Error('Action totalActions wrong');
      if (act.successful !== 1) throw new Error('Action successful wrong');
      if (act.failed !== 1) throw new Error('Action failed wrong');
      if (act.cancelled !== 0) throw new Error('Action cancelled wrong');

      // 8. Recovery Trend Length
      if (!Array.isArray(apiData.recoveryTrend) || apiData.recoveryTrend.length !== 7) throw new Error('Trend is not array of 7');

      console.log('✅ REGRESSION VERIFIED! All deeply nested Math logic holds up beautifully.');
      console.log('🏆 END TO END METRICS REGRESSION TEST PASSED!');
      server.close();
      process.exit(0);

    } catch (e: any) {
      console.error(e);
      server.close();
      process.exit(1);
    }
  });
}

testRegression().catch(e => {
  console.error(e);
  process.exit(1);
});

