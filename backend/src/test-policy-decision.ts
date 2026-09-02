import { pool } from './db';
import { RecoveryCaseService } from './services/recovery-case.service';
import { AgentDecisionService } from './services/agent-decision.service';
import { PolicyDecisionService } from './services/policy-decision.service';

async function testPolicyDecisionFlow() {
  console.log('--- STARTING POLICY DECISION FLOW TEST ---');

  // 1. Setup Data
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Policy Test Merchant', 'policy${Date.now()}@test.com', 'acc_policy_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_policy_1', 'Policy Test Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  const pRes = await pool.query(`
    INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason, attempt_count)
    VALUES ($1, $2, 'pay_policy_${Date.now()}', 1000, 'INR', 'FAILED', 'bank_error', 1)
    RETURNING id;
  `, [merchantId, customerId]);
  const paymentId = pRes.rows[0].id;

  const recoveryCase = await RecoveryCaseService.createRecoveryCase({
    merchantId: merchantId,
    paymentId: paymentId
  });

  console.log('✅ Setup Mock Data');

  // 2. Test 1: Allowed Policy
  const highConfidenceDecision = await AgentDecisionService.createAgentDecision({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    diagnosis: 'Temporary network failure',
    reasoning: 'Retry usually works',
    recoveryProbability: 0.9,
    recommendedAction: 'RETRY_PAYMENT',
    recommendedDelay: 0,
    confidence: 90, // High confidence
    model: 'mock-model'
  });

  const policy1 = await PolicyDecisionService.createPolicyDecision({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    agentDecisionId: highConfidenceDecision.id
  });

  if (policy1.allowed === true && policy1.rule === 'default_allow') {
    console.log('✅ Policy 1 (High Confidence): ALLOWED');
  } else {
    console.error('❌ Policy 1 Failed');
    process.exit(1);
  }

  // 3. Test 2: Rejected Policy (Low Confidence)
  const lowConfidenceDecision = await AgentDecisionService.createAgentDecision({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    diagnosis: 'Unknown bank rejection',
    reasoning: 'Not sure if it will work',
    recoveryProbability: 0.1,
    recommendedAction: 'RETRY_PAYMENT',
    recommendedDelay: 0,
    confidence: 40, // Low confidence
    model: 'mock-model'
  });

  const policy2 = await PolicyDecisionService.createPolicyDecision({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    agentDecisionId: lowConfidenceDecision.id
  });

  if (policy2.allowed === false && policy2.rule === 'low_confidence_deny') {
    console.log('✅ Policy 2 (Low Confidence): REJECTED');
  } else {
    console.error('❌ Policy 2 Failed');
    process.exit(1);
  }

  console.log('✅ Both Policy Engine rules executed perfectly!');
  process.exit(0);
}

testPolicyDecisionFlow().catch(e => {
  console.error(e);
  process.exit(1);
});

