import { pool } from './db';
import { RecoveryCaseService } from './services/recovery-case.service';
import { AgentDecisionService } from './services/agent-decision.service';
import { PolicyDecisionService } from './services/policy-decision.service';
import { RecoveryActionService } from './services/recovery-action.service';
import { RecoveryExecutorService } from './services/recovery-executor.service';

async function testExecutorDirectFlow() {
  console.log('--- STARTING EXECUTOR DIRECT TEST ---');

  // 1. Setup Mock Data
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Executor Test Merchant', 'executor${Date.now()}@test.com', 'acc_exec_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_exec_1', 'Executor Test Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  const pRes = await pool.query(`
    INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason, attempt_count)
    VALUES ($1, $2, 'pay_exec_${Date.now()}', 1000, 'INR', 'FAILED', 'bank_error', 1)
    RETURNING id;
  `, [merchantId, customerId]);
  const paymentId = pRes.rows[0].id;

  const recoveryCase = await RecoveryCaseService.createRecoveryCase({
    merchantId: merchantId,
    paymentId: paymentId
  });

  // 2. Mock Decisions (Force SEND_PAYMENT_REMINDER)
  const agentDecision = await AgentDecisionService.createAgentDecision({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    diagnosis: 'Customer forgot to pay',
    reasoning: 'Reminder usually works',
    recoveryProbability: 0.9,
    recommendedAction: 'SEND_PAYMENT_REMINDER',
    recommendedDelay: 0,
    confidence: 90, 
    model: 'mock-model'
  });

  const policy = await PolicyDecisionService.createPolicyDecision({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    agentDecisionId: agentDecision.id
  });

  // 3. Create Action
  const action = await RecoveryActionService.createRecoveryAction({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    policyDecisionId: policy.id
  });

  console.log('✅ Setup complete. Action ID:', action.id);
  console.log('⏳ Running Executor...');

  // 4. Run Executor
  const result = await RecoveryExecutorService.executeAction(action.id, merchantId);

  if (result.success) {
    console.log('✅ Executor succeeded with message:', result.message);
  } else {
    console.error('❌ Executor failed:', result.error);
    process.exit(1);
  }

  // 5. Verify DB Status
  const finalAction = await RecoveryActionService.getRecoveryActionById(action.id, merchantId);
  if (finalAction.status === 'SUCCESS') {
    console.log('✅ Action status in DB is SUCCESS!');
  } else {
    console.error('❌ Action status in DB is not SUCCESS, it is:', finalAction.status);
    process.exit(1);
  }

  process.exit(0);
}

testExecutorDirectFlow().catch(e => {
  console.error(e);
  process.exit(1);
});

