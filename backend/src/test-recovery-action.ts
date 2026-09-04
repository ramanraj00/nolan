import { pool } from './db';
import { RecoveryCaseService } from './services/recovery-case.service';
import { AgentDecisionService } from './services/agent-decision.service';
import { PolicyDecisionService } from './services/policy-decision.service';
import { RecoveryActionService } from './services/recovery-action.service';

async function testRecoveryActionFlow() {
  console.log('--- STARTING RECOVERY ACTION FLOW TEST ---');

  // 1. Setup Mock Data
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Action Test Merchant', 'action${Date.now()}@test.com', 'acc_action_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_action_1', 'Action Test Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  const pRes = await pool.query(`
    INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason, attempt_count)
    VALUES ($1, $2, 'pay_action_${Date.now()}', 1000, 'INR', 'FAILED', 'bank_error', 1)
    RETURNING id;
  `, [merchantId, customerId]);
  const paymentId = pRes.rows[0].id;

  const recoveryCase = await RecoveryCaseService.createRecoveryCase({
    merchantId: merchantId,
    paymentId: paymentId
  });

  console.log('✅ Setup Mock Data');

  // 2. Mock Agent Decisions
  const highConfidenceDecision = await AgentDecisionService.createAgentDecision({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    diagnosis: 'Temporary network failure',
    reasoning: 'Retry usually works',
    recoveryProbability: 0.9,
    recommendedAction: 'RETRY_PAYMENT',
    recommendedDelay: 0,
    confidence: 90, // High confidence -> Allowed
    model: 'mock-model'
  });

  const lowConfidenceDecision = await AgentDecisionService.createAgentDecision({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    diagnosis: 'Unknown bank rejection',
    reasoning: 'Not sure if it will work',
    recoveryProbability: 0.1,
    recommendedAction: 'RETRY_PAYMENT',
    recommendedDelay: 0,
    confidence: 40, // Low confidence -> Denied
    model: 'mock-model'
  });

  // 3. Mock Policy Decisions
  const allowedPolicy = await PolicyDecisionService.createPolicyDecision({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    agentDecisionId: highConfidenceDecision.id
  });

  const rejectedPolicy = await PolicyDecisionService.createPolicyDecision({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    agentDecisionId: lowConfidenceDecision.id
  });

  // 4. Test Action Creation for Allowed Policy
  try {
    const action = await RecoveryActionService.createRecoveryAction({
      merchantId: merchantId,
      recoveryCaseId: recoveryCase.id,
      policyDecisionId: allowedPolicy.id
    });
    console.log('✅ Recovery Action created successfully for ALLOWED policy (Status:', action.status + ')');
    
    // Status Flow Test
    await RecoveryActionService.updateRecoveryActionStatus(action.id, merchantId, { status: 'SCHEDULED' });
    console.log('✅ Transitioned to SCHEDULED');
    
    await RecoveryActionService.updateRecoveryActionStatus(action.id, merchantId, { status: 'EXECUTING' });
    console.log('✅ Transitioned to EXECUTING');
    
    await RecoveryActionService.updateRecoveryActionStatus(action.id, merchantId, { status: 'SUCCESS', result: 'Recovered' });
    console.log('✅ Transitioned to SUCCESS');

  } catch (error: any) {
    console.error('❌ Failed to create action for allowed policy:', error.message);
    process.exit(1);
  }

  // 5. Test Action Creation for Rejected Policy
  try {
    await RecoveryActionService.createRecoveryAction({
      merchantId: merchantId,
      recoveryCaseId: recoveryCase.id,
      policyDecisionId: rejectedPolicy.id
    });
    console.error('❌ FATAL: Action was created for a REJECTED policy!');
    process.exit(1);
  } catch (error: any) {
    if (error.message === 'NOT_ALLOWED') {
      console.log('✅ Properly blocked Action creation for REJECTED policy! (Threw NOT_ALLOWED)');
    } else {
      console.error('❌ Threw wrong error for rejected policy:', error.message);
      process.exit(1);
    }
  }

  console.log('✅ All Recovery Action flow tests passed successfully!');
  process.exit(0);
}

testRecoveryActionFlow().catch(e => {
  console.error(e);
  process.exit(1);
});

