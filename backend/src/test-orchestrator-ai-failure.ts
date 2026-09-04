import { pool } from './db';
import { RecoveryOrchestratorService } from './services/recovery-orchestrator.service';
import { AiAgentService } from './services/ai-agent.service';
import { RecoveryExecutorService } from './services/recovery-executor.service';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

let providerCallCount = 0;
const originalPerform = (RecoveryExecutorService as any).performProviderAction;
(RecoveryExecutorService as any).performProviderAction = async (actionType: string, actionData: any) => {
  providerCallCount++;
  return { message: 'Mock success' };
};

(AiAgentService as any).analyzeFailure = async () => {
  throw new Error('AI Dependency Outage');
};

async function run() {
  try {
    const merchantId = randomUUID();
    const customerId = randomUUID();
    const paymentId = randomUUID();

    await pool.query(`INSERT INTO merchants (user_id, name, email, razorpay_account_id) VALUES ($1, 'AIFail Test', 'aifail_${Date.now()}@t.com', 'a1')`, [merchantId]);
    await pool.query(`INSERT INTO customers (id, merchant_id, external_customer_id, name) VALUES ($1, $2, 'ext', 't')`, [customerId, merchantId]);
    await pool.query(`INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, currency, status, attempt_count) VALUES ($1, $2, $3, 'pay_aifail_${Date.now()}', 100, 'INR', 'FAILED', 1)`, [paymentId, merchantId, customerId]);
    
    const paymentRes = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
    const payment = {
      ...paymentRes.rows[0],
      merchantId: paymentRes.rows[0].merchant_id,
      customerId: paymentRes.rows[0].customer_id,
      failureReason: paymentRes.rows[0].failure_reason
    };

    console.log(`\n--- Test: AI Dependency Outage ---`);
    
    try {
      await RecoveryOrchestratorService.processFailedPayment(payment);
    } catch (e: any) {
      console.log(`Orchestrator threw error: ${e.message}`);
    }

    const cases = await pool.query('SELECT id, status FROM recovery_cases WHERE payment_id = $1', [paymentId]);
    const caseId = cases.rows[0]?.id;

    let agentDecisions = 0;
    let policyDecisions = 0;
    let actions = 0;

    if (caseId) {
      agentDecisions = parseInt((await pool.query('SELECT count(*) FROM agent_decisions WHERE recovery_case_id = $1', [caseId])).rows[0].count);
      policyDecisions = parseInt((await pool.query('SELECT count(*) FROM policy_decisions WHERE recovery_case_id = $1', [caseId])).rows[0].count);
      actions = parseInt((await pool.query('SELECT count(*) FROM recovery_actions WHERE recovery_case_id = $1', [caseId])).rows[0].count);
    }

    console.log(`\n--- Results ---`);
    console.log(`Case Status: ${cases.rows[0]?.status}`);
    console.log(`AgentDecision count: ${agentDecisions}`);
    console.log(`PolicyDecision count: ${policyDecisions}`);
    console.log(`RecoveryAction count: ${actions}`);
    console.log(`Provider call count: ${providerCallCount}`);

  } catch (e) {
    console.error('Fatal test error:', e);
  } finally {
    process.exit(0);
  }
}

run();
