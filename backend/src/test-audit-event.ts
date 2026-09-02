import { pool } from './db';
import { RecoveryCaseService } from './services/recovery-case.service';
import { AgentDecisionService } from './services/agent-decision.service';
import { PolicyDecisionService } from './services/policy-decision.service';
import { RecoveryActionService } from './services/recovery-action.service';
import { RecoveryExecutorService } from './services/recovery-executor.service';
import { AuditEventService } from './services/audit-event.service';

async function testAuditEventFlow() {
  console.log('--- STARTING AUDIT EVENT FLOW TEST ---');

  // 1. Setup Mock Data
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Audit Test Merchant', 'audit${Date.now()}@test.com', 'acc_audit_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_audit_1', 'Audit Test Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  const pRes = await pool.query(`
    INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason, attempt_count)
    VALUES ($1, $2, 'pay_audit_${Date.now()}', 1000, 'INR', 'FAILED', 'bank_error', 1)
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
    diagnosis: 'Test Audit',
    reasoning: 'Audit Trial',
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

  const action = await RecoveryActionService.createRecoveryAction({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    policyDecisionId: policy.id
  });

  console.log('✅ Setup complete. Action ID:', action.id);
  console.log('⏳ Running Executor...');

  // 3. Run Executor (This should generate Audit Events)
  await RecoveryExecutorService.executeAction(action.id, merchantId);

  // 4. Verify Audit Events
  const auditEvents = await AuditEventService.getAuditEvents(merchantId, recoveryCase.id);
  
  const executedEvent = auditEvents.find(e => e.eventType === 'ACTION_EXECUTED' && e.entityId === action.id);
  const recoveredEvent = auditEvents.find(e => e.eventType === 'PAYMENT_RECOVERED' && e.entityId === action.id);

  if (executedEvent) {
    console.log('✅ Found Audit Event: ACTION_EXECUTED!');
  } else {
    console.error('❌ Missing Audit Event: ACTION_EXECUTED');
    process.exit(1);
  }

  if (recoveredEvent) {
    console.log('✅ Found Audit Event: PAYMENT_RECOVERED with metadata:', JSON.stringify(recoveredEvent.metadata));
  } else {
    console.error('❌ Missing Audit Event: PAYMENT_RECOVERED');
    process.exit(1);
  }

  console.log('✅ Audit Event flow perfectly connected and verified!');
  process.exit(0);
}

testAuditEventFlow().catch(e => {
  console.error(e);
  process.exit(1);
});

