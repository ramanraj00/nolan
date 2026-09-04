import { pool } from './db';
import { RecoveryExecutorService } from './services/recovery-executor.service';
import { RecoveryActionService } from './services/recovery-action.service';
import { RecoveryCaseService } from './services/recovery-case.service';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

let providerCallCount = 0;

// Monkey-patch the performProviderAction to observe it
const originalPerform = (RecoveryExecutorService as any).performProviderAction;
(RecoveryExecutorService as any).performProviderAction = async (actionType: string, actionData: any) => {
  providerCallCount++;
  // simulate delay to maximize race window
  await new Promise(r => setTimeout(r, 500));
  return { message: 'Mock success' };
};

async function run() {
  try {
    const merchantId = randomUUID();
    const customerId = randomUUID();
    const paymentId = randomUUID();
    const caseId = randomUUID();
    const adId = randomUUID();

    // 1. Setup mock data
    await pool.query(`INSERT INTO merchants (user_id, name, email, razorpay_account_id) VALUES ($1, 'Exec Test Merchant', 'exec_${Date.now()}@test.com', 'acc_exec123')`, [merchantId]);
    await pool.query(`INSERT INTO customers (id, merchant_id, external_customer_id, name) VALUES ($1, $2, 'ext_exec', 'Exec Cust')`, [customerId, merchantId]);
    await pool.query(`INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, currency, status, attempt_count) VALUES ($1, $2, $3, 'pay_exec_${Date.now()}', 100, 'INR', 'FAILED', 1)`, [paymentId, merchantId, customerId]);
    
    await pool.query(`INSERT INTO recovery_cases (id, merchant_id, payment_id, status, revenue_at_risk) VALUES ($1, $2, $3, 'ACTION_PENDING', 100)`, [caseId, merchantId, paymentId]);
    
    await pool.query(`
      INSERT INTO agent_decisions (id, recovery_case_id, diagnosis, reasoning, recovery_probability, recommended_action, confidence, model)
      VALUES ($1, $2, 'test', 'test', 90, 'REQUEST_PAYMENT_METHOD_UPDATE', 90, 'mock')
    `, [adId, caseId]);

    const pdRes = await pool.query(`
      INSERT INTO policy_decisions (recovery_case_id, agent_decision_id, action, allowed, reason, rule)
      VALUES ($1, $2, 'REQUEST_PAYMENT_METHOD_UPDATE', true, 'test', 'test')
      RETURNING id
    `, [caseId, adId]);

    const pdId = pdRes.rows[0].id;

    // Use our trusted action service to create it (starts PENDING)
    const action = await RecoveryActionService.createRecoveryAction({
      merchantId,
      recoveryCaseId: caseId,
      policyDecisionId: pdId
    });

    console.log(`Action created. ID: ${action.id}, Initial Status: ${action.status}`);

    // 2. Fire simultaneous executeAction calls
    console.log("Firing 2 concurrent executeAction workers...");
    const results = await Promise.allSettled([
      RecoveryExecutorService.executeAction(action.id, merchantId),
      RecoveryExecutorService.executeAction(action.id, merchantId)
    ]);

    // 3. Verify results
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success === true).length;
    const gracefulBailoutCount = results.filter(r => r.status === 'fulfilled' && r.value?.success === false && r.value?.error === 'Execution lock claimed by another worker').length;
    const errorCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success && r.value?.error !== 'Execution lock claimed by another worker')).length;

    console.log('\n--- RESULTS ---');
    console.log(`Provider Calls: ${providerCallCount}`);
    console.log(`Successful Claims: ${successCount}`);
    console.log(`Graceful Bailouts: ${gracefulBailoutCount}`);
    console.log(`Errors: ${errorCount}`);

    const finalAction = await pool.query('SELECT status FROM recovery_actions WHERE id = $1', [action.id]);
    console.log(`Final Action Status: ${finalAction.rows[0].status}`);

    if (providerCallCount === 1 && successCount === 1 && gracefulBailoutCount === 1) {
      console.log('✅ PASS: Exactly 1 provider call and 1 successful claim.');
    } else {
      console.error('❌ FAIL: Concurrency violation detected.');
    }

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
