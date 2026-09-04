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
  throw new Error('Razorpay API Error: Validation Failed');
};

async function run() {
  try {
    const merchantId = randomUUID();
    const customerId = randomUUID();
    const paymentId = randomUUID();
    const caseId = randomUUID();
    const adId = randomUUID();

    // Setup base mock data
    await pool.query(`INSERT INTO merchants (user_id, name, email, razorpay_account_id) VALUES ($1, 'Failure Test', 'fail_${Date.now()}@t.com', 'a1')`, [merchantId]);
    await pool.query(`INSERT INTO customers (id, merchant_id, external_customer_id, name) VALUES ($1, $2, 'ext', 't')`, [customerId, merchantId]);
    await pool.query(`INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, currency, status, attempt_count) VALUES ($1, $2, $3, 'pay_fail_${Date.now()}', 100, 'INR', 'FAILED', 1)`, [paymentId, merchantId, customerId]);
    
    // Recovery case starts in ACTION_PENDING (or IN_PROGRESS, here ACTION_PENDING works)
    await pool.query(`INSERT INTO recovery_cases (id, merchant_id, payment_id, status, revenue_at_risk) VALUES ($1, $2, $3, 'OPEN', 100)`, [caseId, merchantId, paymentId]);
    await pool.query(`INSERT INTO agent_decisions (id, recovery_case_id, diagnosis, reasoning, recovery_probability, recommended_action, confidence, model) VALUES ($1, $2, 't', 't', 90, 'REQUEST_PAYMENT_METHOD_UPDATE', 90, 'mock')`, [adId, caseId]);
    
    // Create policy decision that DOES NOT require approval
    const pdRes = await pool.query(`
      INSERT INTO policy_decisions (recovery_case_id, agent_decision_id, action, allowed, reason, rule, requires_approval)
      VALUES ($1, $2, 'REQUEST_PAYMENT_METHOD_UPDATE', true, 't', 't', false)
      RETURNING id
    `, [caseId, adId]);

    const action = await RecoveryActionService.createRecoveryAction({
      merchantId,
      recoveryCaseId: caseId,
      policyDecisionId: pdRes.rows[0].id
    });

    console.log(`\n--- Test 1 & 4: Execution with Provider Failure ---`);
    const execResult = await RecoveryExecutorService.executeAction(action.id, merchantId);
    
    console.log(`Execution returned: success=${execResult.success}, error=${execResult.error}`);
    
    const dbAction = await pool.query('SELECT status, failure_reason FROM recovery_actions WHERE id = $1', [action.id]);
    const dbCase = await pool.query('SELECT status FROM recovery_cases WHERE id = $1', [caseId]);

    console.log(`Action Status: ${dbAction.rows[0].status} (Expected: FAILED)`);
    console.log(`Case Status: ${dbCase.rows[0].status} (Expected: ESCALATED)`);

    console.log(`\n--- Test 2: Failure Reason ---`);
    console.log(`failure_reason: ${dbAction.rows[0].failure_reason}`);

    console.log(`\n--- Test 3: Audit Trail ---`);
    const audits = await pool.query('SELECT event_type, actor FROM audit_events WHERE recovery_case_id = $1 ORDER BY created_at ASC', [caseId]);
    const eventTypes = audits.rows.map(r => r.event_type);
    console.log(`Event Trail: ${eventTypes.join(' -> ')}`);
    console.log(`Contains PAYMENT_RECOVERED? ${eventTypes.includes('PAYMENT_RECOVERED')}`);

    console.log(`\n--- Test 5: Second Execution Blocked ---`);
    try {
      await RecoveryExecutorService.executeAction(action.id, merchantId);
      console.error('❌ Second execution succeeded?!');
    } catch (e: any) {
      if (e.message.includes('EXECUTION_BLOCKED')) {
         console.log(`✅ Second execution blocked: ${e.message}`);
      } else {
         console.error(`❌ Second execution failed for wrong reason: ${e.message}`);
      }
    }
    
    console.log(`Total Provider Calls: ${providerCallCount} (Expected: 1)`);

  } catch (e) {
    console.error('Fatal test error:', e);
  } finally {
    process.exit(0);
  }
}

run();
