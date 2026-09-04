import { pool } from './db';
import { RecoveryOrchestratorService } from './services/recovery-orchestrator.service';
import { AiAgentService } from './services/ai-agent.service';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

let mockAiResponse: any = {};

(AiAgentService as any).analyzeFailure = async () => {
  return mockAiResponse;
};

async function checkState(paymentId: string) {
  const caseRow = await pool.query('SELECT id, status FROM recovery_cases WHERE payment_id = $1', [paymentId]);
  const caseId = caseRow.rows[0].id;
  
  const pd = await pool.query('SELECT allowed, reason FROM policy_decisions WHERE recovery_case_id = $1 ORDER BY created_at DESC LIMIT 1', [caseId]);
  const allowed = pd.rows[0]?.allowed;
  const reason = pd.rows[0]?.reason;

  const ra = await pool.query('SELECT count(*) FROM recovery_actions WHERE recovery_case_id = $1', [caseId]);
  const actionCount = parseInt(ra.rows[0].count);

  console.log(`Policy Allowed: ${allowed} (${reason})`);
  console.log(`RecoveryActions Created: ${actionCount}`);
  console.log(`Case Status: ${caseRow.rows[0].status}`);
}

async function runTest(testName: string, attemptCount: number, aiConfig: any, expectedPolicy: boolean) {
  console.log(`\n--- ${testName} ---`);
  mockAiResponse = aiConfig;

  const merchantId = randomUUID();
  const customerId = randomUUID();
  const paymentId = randomUUID();

  await pool.query(`INSERT INTO merchants (user_id, name, email, razorpay_account_id) VALUES ($1, 'Test', 't${Date.now()}@t.com', 'a1')`, [merchantId]);
  await pool.query(`INSERT INTO customers (id, merchant_id, external_customer_id, name) VALUES ($1, $2, 'ext', 't')`, [customerId, merchantId]);
  await pool.query(`INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, currency, status, attempt_count) VALUES ($1, $2, $3, 'pay_${Date.now()}', 100, 'INR', 'FAILED', $4)`, [paymentId, merchantId, customerId, attemptCount]);
  
  const paymentRes = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
  const payment = {
    ...paymentRes.rows[0],
    merchantId: paymentRes.rows[0].merchant_id,
    customerId: paymentRes.rows[0].customer_id,
    failureReason: paymentRes.rows[0].failure_reason
  };

  await RecoveryOrchestratorService.processFailedPayment(payment);
  
  await checkState(paymentId);
}

async function run() {
  try {
    // Attack 1: High confidence, but Policy denies (because attempt count is high >= 3)
    await runTest('Attack 1: High confidence AI, but Policy limits reached', 3, {
      diagnosis: 't', reasoning: 't', recovery_probability: 90, recommended_action: 'RETRY_PAYMENT', recommended_delay: 0, confidence: 90
    }, false);

    // Attack 2: Low confidence AI
    await runTest('Attack 2: Low confidence AI (< 50%)', 1, {
      diagnosis: 't', reasoning: 't', recovery_probability: 20, recommended_action: 'RETRY_PAYMENT', recommended_delay: 0, confidence: 0.40
    }, false);

    // Attack 3: Unsupported/Malicious Action
    await runTest('Attack 3: Malicious/Unsupported Action', 1, {
      diagnosis: 't', reasoning: 't', recovery_probability: 90, recommended_action: 'ISSUE_REFUND', recommended_delay: 0, confidence: 90
    }, false);

  } catch (e) {
    console.error('Test error:', e);
  } finally {
    process.exit(0);
  }
}

run();
