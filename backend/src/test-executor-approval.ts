import { pool } from './db';
import { RecoveryExecutorService } from './services/recovery-executor.service';
import { RecoveryActionService } from './services/recovery-action.service';
import { RecoveryCaseService } from './services/recovery-case.service';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

let providerCallCount = 0;
const originalPerform = (RecoveryExecutorService as any).performProviderAction;
(RecoveryExecutorService as any).performProviderAction = async (actionType: string, actionData: any) => {
  providerCallCount++;
  return { message: 'Mock success' };
};

async function run() {
  try {
    const merchantId = randomUUID();
    const customerId = randomUUID();
    const paymentId = randomUUID();
    const caseId = randomUUID();
    const adId = randomUUID();

    // Setup base mock data
    await pool.query(`INSERT INTO merchants (user_id, name, email, razorpay_account_id) VALUES ($1, 'Approval Test', 'appr_${Date.now()}@t.com', 'a1')`, [merchantId]);
    await pool.query(`INSERT INTO customers (id, merchant_id, external_customer_id, name) VALUES ($1, $2, 'ext', 't')`, [customerId, merchantId]);
    await pool.query(`INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, currency, status, attempt_count) VALUES ($1, $2, $3, 'pay_appr_${Date.now()}', 100, 'INR', 'FAILED', 1)`, [paymentId, merchantId, customerId]);
    await pool.query(`INSERT INTO recovery_cases (id, merchant_id, payment_id, status, revenue_at_risk) VALUES ($1, $2, $3, 'ACTION_PENDING', 100)`, [caseId, merchantId, paymentId]);
    await pool.query(`INSERT INTO agent_decisions (id, recovery_case_id, diagnosis, reasoning, recovery_probability, recommended_action, confidence, model) VALUES ($1, $2, 't', 't', 90, 'ESCALATE_HUMAN', 90, 'mock')`, [adId, caseId]);
    
    // Create policy decision that REQUIRES APPROVAL
    const pdRes = await pool.query(`
      INSERT INTO policy_decisions (recovery_case_id, agent_decision_id, action, allowed, reason, rule, requires_approval)
      VALUES ($1, $2, 'ESCALATE_HUMAN', true, 't', 't', true)
      RETURNING id
    `, [caseId, adId]);

    const action = await RecoveryActionService.createRecoveryAction({
      merchantId,
      recoveryCaseId: caseId,
      policyDecisionId: pdRes.rows[0].id
    });

    console.log(`Initial status: ${action.status}`); // Should be PENDING_APPROVAL

    console.log('\n--- Test 1: Direct Execution blocked ---');
    try {
      await RecoveryExecutorService.executeAction(action.id, merchantId);
      console.error('❌ Direct execution succeeded?!');
    } catch (e: any) {
      if (e.message.includes('requires human approval')) {
        console.log(`✅ Direct execution blocked: ${e.message}`);
      } else {
        console.error(`❌ Wrong error message: ${e.message}`);
      }
    }
    const check1 = await pool.query('SELECT status FROM recovery_actions WHERE id = $1', [action.id]);
    console.log(`Action Status remains: ${check1.rows[0].status}`);
    console.log(`Provider calls: ${providerCallCount} (Expected: 0)`);


    console.log('\n--- Test 3: Wrong merchant cannot approve ---'); // Reordering so we can still test correct approval later
    const fakeMerchant = randomUUID();
    try {
      await RecoveryExecutorService.approveAction(action.id, fakeMerchant, 'user123');
      console.error('❌ Wrong merchant approved?!');
    } catch (e: any) {
      console.log(`✅ Wrong merchant blocked: ${e.message}`);
    }


    console.log('\n--- Test 2: Valid Human Approval ---');
    await RecoveryExecutorService.approveAction(action.id, merchantId, 'human-user-99');
    console.log('✅ Approval succeeded');
    const check2 = await pool.query('SELECT status FROM recovery_actions WHERE id = $1', [action.id]);
    console.log(`Action Status is now: ${check2.rows[0].status} (Expected: PENDING)`);
    
    const audits = await pool.query('SELECT * FROM audit_events WHERE entity_id = $1 AND event_type = $2', [action.id, 'ACTION_APPROVED']);
    console.log(`Audit actor: ${audits.rows[0].actor}`);
    console.log(`Audit metadata.approvedBy: ${audits.rows[0].metadata.approvedBy}`);


    console.log('\n--- Test 4: Double Approval Blocked ---');
    try {
      await RecoveryExecutorService.approveAction(action.id, merchantId, 'human-user-99');
      console.error('❌ Double approval succeeded?!');
    } catch (e: any) {
      console.log(`✅ Double approval blocked: ${e.message}`);
    }

  } catch (e) {
    console.error('Fatal test error:', e);
  } finally {
    process.exit(0);
  }
}

run();
