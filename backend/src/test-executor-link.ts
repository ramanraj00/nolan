import { pool } from './db';
import { RecoveryExecutorService } from './services/recovery-executor.service';
import { RecoveryActionService } from './services/recovery-action.service';
import { RecoveryCaseService } from './services/recovery-case.service';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const merchantId = randomUUID();
    const customerId = randomUUID();
    const paymentId = randomUUID();
    const caseId = randomUUID();
    const adId = randomUUID();

    // Setup base mock data
    await pool.query(`INSERT INTO merchants (user_id, name, email, razorpay_account_id) VALUES ($1, 'Link Test', 'link_${Date.now()}@t.com', 'a1')`, [merchantId]);
    await pool.query(`INSERT INTO customers (id, merchant_id, external_customer_id, name, phone) VALUES ($1, $2, 'ext', 't', '+919876543210')`, [customerId, merchantId]);
    await pool.query(`INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, currency, status, attempt_count) VALUES ($1, $2, $3, 'pay_link_${Date.now()}', 100, 'INR', 'FAILED', 1)`, [paymentId, merchantId, customerId]);
    
    await pool.query(`INSERT INTO recovery_cases (id, merchant_id, payment_id, status, revenue_at_risk) VALUES ($1, $2, $3, 'ACTION_PENDING', 100)`, [caseId, merchantId, paymentId]);
    await pool.query(`INSERT INTO agent_decisions (id, recovery_case_id, diagnosis, reasoning, recovery_probability, recommended_action, confidence, model) VALUES ($1, $2, 't', 't', 90, 'RETRY_PAYMENT', 90, 'mock')`, [adId, caseId]);
    
    const pdRes = await pool.query(`
      INSERT INTO policy_decisions (recovery_case_id, agent_decision_id, action, allowed, reason, rule, requires_approval)
      VALUES ($1, $2, 'RETRY_PAYMENT', true, 't', 't', false)
      RETURNING id
    `, [caseId, adId]);

    const action = await RecoveryActionService.createRecoveryAction({
      merchantId,
      recoveryCaseId: caseId,
      policyDecisionId: pdRes.rows[0].id
    });

    console.log(`\n--- Execution with Real Provider ---`);
    const execResult = await RecoveryExecutorService.executeAction(action.id, merchantId);
    
    console.log(`Execution success=${execResult.success}`);
    console.log(`Execution message=${execResult.message} error=${execResult.error}`);
    
    const dbAction = await pool.query('SELECT status, result FROM recovery_actions WHERE id = $1', [action.id]);
    const dbCase = await pool.query('SELECT status FROM recovery_cases WHERE id = $1', [caseId]);
    const dbPayment = await pool.query('SELECT status FROM payments WHERE id = $1', [paymentId]);

    console.log(`Payment Status: ${dbPayment.rows[0].status} (Expected: FAILED)`);
    console.log(`Action Status: ${dbAction.rows[0].status} (Expected: SUCCESS)`);
    console.log(`Case Status: ${dbCase.rows[0].status} (Expected: IN_PROGRESS)`);

    const audits = await pool.query('SELECT event_type FROM audit_events WHERE recovery_case_id = $1', [caseId]);
    const eventTypes = audits.rows.map(r => r.event_type);
    console.log(`Contains PAYMENT_RECOVERED audit? ${eventTypes.includes('PAYMENT_RECOVERED')}`);

  } catch (e) {
    console.error('Fatal test error:', e);
  } finally {
    process.exit(0);
  }
}

run();
