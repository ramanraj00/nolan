import { pool } from './db';
import { RecoveryOrchestratorService } from './services/recovery-orchestrator.service';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

// Stub the AI agent to avoid calling the real API
import { AiAgentService } from './services/ai-agent.service';
(AiAgentService as any).analyzeFailure = async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return {
    diagnosis: 'Stub',
    reasoning: 'Stub',
    recovery_probability: 90,
    recommended_action: 'RETRY_PAYMENT',
    recommended_delay: 0,
    confidence: 90
  };
};

async function run() {
  try {
    const merchantId = randomUUID();
    const customerId = randomUUID();
    const paymentId = randomUUID();

    // 1. Setup mock data
    await pool.query(`INSERT INTO merchants (user_id, name, email, razorpay_account_id) VALUES ($1, 'Orch Test', 'orch_${Date.now()}@test.com', 'a1')`, [merchantId]);
    await pool.query(`INSERT INTO customers (id, merchant_id, external_customer_id, name) VALUES ($1, $2, 'ext_orch', 'Orch Cust')`, [customerId, merchantId]);
    await pool.query(`INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, currency, status, attempt_count) VALUES ($1, $2, $3, 'pay_orch_${Date.now()}', 100, 'INR', 'FAILED', 1)`, [paymentId, merchantId, customerId]);
    
    // Fetch real payment
    const paymentRes = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
    const payment = {
      ...paymentRes.rows[0],
      merchantId: paymentRes.rows[0].merchant_id,
      customerId: paymentRes.rows[0].customer_id,
      failureReason: paymentRes.rows[0].failure_reason
    };

    console.log(`Firing 2 concurrent processFailedPayment workers for payment ${paymentId}...`);
    
    // 2. Simultaneous calls
    const results = await Promise.allSettled([
      RecoveryOrchestratorService.processFailedPayment(payment),
      RecoveryOrchestratorService.processFailedPayment(payment)
    ]);

    console.log(`\n--- Worker Results ---`);
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled') {
        console.log(`Worker ${idx + 1}: SUCCESS`);
      } else {
        console.log(`Worker ${idx + 1}: REJECTED - ${r.reason.message}`);
      }
    });

    // 3. Count Side Effects
    const cases = await pool.query('SELECT count(*) FROM recovery_cases WHERE payment_id = $1', [paymentId]);
    let caseId = null;
    let agentDecisions = 0;
    let policyDecisions = 0;
    let actions = 0;

    if (parseInt(cases.rows[0].count) > 0) {
      const caseRow = await pool.query('SELECT id FROM recovery_cases WHERE payment_id = $1', [paymentId]);
      caseId = caseRow.rows[0].id;
      agentDecisions = parseInt((await pool.query('SELECT count(*) FROM agent_decisions WHERE recovery_case_id = $1', [caseId])).rows[0].count);
      policyDecisions = parseInt((await pool.query('SELECT count(*) FROM policy_decisions WHERE recovery_case_id = $1', [caseId])).rows[0].count);
      actions = parseInt((await pool.query('SELECT count(*) FROM recovery_actions WHERE recovery_case_id = $1', [caseId])).rows[0].count);
    }
    
    const audits = await pool.query('SELECT count(*) FROM audit_events WHERE entity_id = $1 AND event_type = $2', [paymentId, 'PAYMENT_FAILED']);

    console.log(`\n--- DB Counts ---`);
    console.log(`RecoveryCases: ${cases.rows[0].count}`);
    console.log(`AgentDecisions: ${agentDecisions}`);
    console.log(`PolicyDecisions: ${policyDecisions}`);
    console.log(`RecoveryActions: ${actions}`);
    console.log(`PAYMENT_FAILED audits: ${audits.rows[0].count}`);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
