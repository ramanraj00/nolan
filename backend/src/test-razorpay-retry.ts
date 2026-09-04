import { pool } from './db';
import { RecoveryCaseService } from './services/recovery-case.service';
import { AgentDecisionService } from './services/agent-decision.service';
import { PolicyDecisionService } from './services/policy-decision.service';
import { RecoveryActionService } from './services/recovery-action.service';
import { RecoveryExecutorService } from './services/recovery-executor.service';
import { AuditEventService } from './services/audit-event.service';
import dotenv from 'dotenv';
dotenv.config();

async function testRazorpayRetry() {
  console.log('--- STARTING ACTUAL RAZORPAY RETRY TEST ---');

  // 1. Setup Mock Data
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Razorpay Retry Merchant', 'rzretry${Date.now()}@test.com', 'acc_rzretry_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_rzretry_1', 'RZ Retry Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  const pRes = await pool.query(`
    INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason, attempt_count)
    VALUES ($1, $2, 'pay_mock_${Date.now()}', 1000, 'INR', 'FAILED', 'bank_error', 1)
    RETURNING id;
  `, [merchantId, customerId]);
  const paymentId = pRes.rows[0].id;

  const recoveryCase = await RecoveryCaseService.createRecoveryCase({
    merchantId: merchantId,
    paymentId: paymentId
  });

  // 2. Mock Agent Decision (Force RETRY_PAYMENT)
  const agentDecision = await AgentDecisionService.createAgentDecision({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    diagnosis: 'Test Retry',
    reasoning: 'Test Retry Logic',
    recoveryProbability: 0.9,
    recommendedAction: 'RETRY_PAYMENT',
    recommendedDelay: 0,
    confidence: 90, 
    model: 'mock-model'
  });

  const policy = await PolicyDecisionService.createPolicyDecision({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    agentDecisionId: agentDecision.id
  });

  const action = await RecoveryActionService.createRecoveryAction({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    policyDecisionId: policy.id
  });

  console.log('✅ Setup complete. Action ID:', action.id);
  console.log('⏳ Hitting ACTUAL Razorpay API (expecting failure due to mock pay_id/keys)...');

  // 3. Run Executor (This calls Razorpay API)
  const result = await RecoveryExecutorService.executeAction(action.id, merchantId);

  // 4. Verify Results
  console.log('Executor Result:', result);

  if (result.success === false && result.error?.includes('Razorpay API Error')) {
    console.log('✅ Correctly connected to Razorpay! Caught expected Razorpay rejection for mock payment ID.');
  } else {
    console.error('❌ Failed to connect to Razorpay or unexpected error format.');
    process.exit(1);
  }

  // 5. Verify Database State Handling
  const finalAction = await RecoveryActionService.getRecoveryActionById(action.id, merchantId);
  if (finalAction.status === 'FAILED') {
    console.log('✅ Action status gracefully updated to FAILED in DB');
  } else {
    console.error('❌ Action status not updated correctly');
    process.exit(1);
  }

  const updatedCase = await RecoveryCaseService.getRecoveryCaseById(recoveryCase.id, merchantId);
  if (updatedCase.status === 'ESCALATED') {
    console.log('✅ Recovery Case gracefully ESCALATED in DB');
  } else {
    console.error('❌ Case status not escalated correctly');
    process.exit(1);
  }

  // 6. Verify Audit Event
  const auditEvents = await AuditEventService.getAuditEvents(merchantId, recoveryCase.id);
  const failureEvent = auditEvents.find(e => e.eventType === 'RECOVERY_ESCALATED');
  
  if (failureEvent) {
    console.log('✅ Found RECOVERY_ESCALATED Audit Event!');
  } else {
    console.error('❌ Missing RECOVERY_ESCALATED Audit Event');
    process.exit(1);
  }

  console.log('✅ Razorpay Integration and Failure Handling perfectly verified!');
  process.exit(0);
}

testRazorpayRetry().catch(e => {
  console.error(e);
  process.exit(1);
});

