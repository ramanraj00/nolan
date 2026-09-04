import { pool } from './db';
import { RecoveryExecutorService } from './services/recovery-executor.service';
import { RecoveryActionService } from './services/recovery-action.service';
import { PaymentRecoveryService } from './services/payment-recovery.service';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

async function getActionStatus(id: string) { return (await pool.query('SELECT status FROM recovery_actions WHERE id = $1', [id])).rows[0].status; }
async function getCaseStatus(id: string) { return (await pool.query('SELECT status FROM recovery_cases WHERE id = $1', [id])).rows[0].status; }
async function getPaymentStatus(id: string) { return (await pool.query('SELECT status FROM payments WHERE id = $1', [id])).rows[0].status; }
async function getAuditCount(caseId: string, type: string) { return parseInt((await pool.query('SELECT count(*) FROM audit_events WHERE recovery_case_id = $1 AND event_type = $2', [caseId, type])).rows[0].count, 10); }

async function run() {
  try {
    const merchantId = randomUUID();
    const customerId = randomUUID();
    const paymentId = randomUUID();
    const caseId = randomUUID();
    const adId = randomUUID();
    const rzpPayId = `pay_e2e_${Date.now()}`;

    // Setup base mock data
    await pool.query(`INSERT INTO merchants (user_id, name, email, razorpay_account_id) VALUES ($1, 'E2E Test', 'e2e_${Date.now()}@t.com', 'a1')`, [merchantId]);
    await pool.query(`INSERT INTO customers (id, merchant_id, external_customer_id, name, phone) VALUES ($1, $2, 'ext', 't', '+919876543210')`, [customerId, merchantId]);
    await pool.query(`INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, currency, status, attempt_count) VALUES ($1, $2, $3, $4, 100, 'INR', 'FAILED', 1)`, [paymentId, merchantId, customerId, rzpPayId]);
    
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

    console.log(`\n--- Phase 0: Executing Provider Action ---`);
    await RecoveryExecutorService.executeAction(action.id, merchantId);
    
    console.log(`Payment before capture: ${await getPaymentStatus(paymentId)} (Expected: FAILED)`);
    console.log(`Case before capture: ${await getCaseStatus(caseId)} (Expected: IN_PROGRESS)`);
    console.log(`Action after link: ${await getActionStatus(action.id)} (Expected: SUCCESS)`);
    console.log(`PAYMENT_RECOVERED audit: ${await getAuditCount(caseId, 'PAYMENT_RECOVERED')} (Expected: 0)`);

    console.log(`\n--- Phase 1: Simulate Actual Capture ---`);
    await PaymentRecoveryService.handlePaymentCaptured({
      merchantId,
      razorpayPaymentId: rzpPayId,
      amount: 100,
      currency: 'INR'
    });

    console.log(`\n--- Phase 2: Verify Final State ---`);
    console.log(`Payment after capture: ${await getPaymentStatus(paymentId)} (Expected: CAPTURED)`);
    console.log(`Case after capture: ${await getCaseStatus(caseId)} (Expected: RECOVERED)`);
    console.log(`Action after capture: ${await getActionStatus(action.id)} (Expected: SUCCESS)`);
    console.log(`PAYMENT_RECOVERED audit: ${await getAuditCount(caseId, 'PAYMENT_RECOVERED')} (Expected: 1)`);

    console.log(`\n--- Phase 3: Replay the Same Capture ---`);
    await PaymentRecoveryService.handlePaymentCaptured({
      merchantId,
      razorpayPaymentId: rzpPayId,
      amount: 100,
      currency: 'INR'
    });

    console.log(`\n--- Phase 4: Verify Idempotency ---`);
    console.log(`Payment status: ${await getPaymentStatus(paymentId)} (Expected: CAPTURED)`);
    console.log(`Case status: ${await getCaseStatus(caseId)} (Expected: RECOVERED)`);
    console.log(`Replay audit count: ${await getAuditCount(caseId, 'PAYMENT_RECOVERED')} (Expected: 1)`);

  } catch (e) {
    console.error('Fatal test error:', e);
  } finally {
    process.exit(0);
  }
}

run();
