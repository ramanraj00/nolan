import { pool } from './db';
import { WebhookEventService } from './services/webhook-event.service';
import { WebhookProcessorService } from './services/webhook-processor.service';
import { RecoveryCaseService } from './services/recovery-case.service';
import { RecoveryActionService } from './services/recovery-action.service';
import { AuditEventService } from './services/audit-event.service';
import dotenv from 'dotenv';
dotenv.config();

async function runE2E() {
  console.log('--- STARTING ULTIMATE END-TO-END RECOVERY FLOW ---');

  const accountId = 'acc_e2e_' + Date.now();
  // 1. Setup Mock Merchant
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('E2E Merchant', 'e2e${Date.now()}@test.com', $1)
    RETURNING user_id;
  `, [accountId]);
  const merchantId = mRes.rows[0].user_id;

  // 2. Simulate Razorpay Webhook Arrival (Raw JSON)
  const webhookEventId = 'evt_e2e_' + Date.now();
  const rawWebhook = await WebhookEventService.createWebhookEvent({
    eventId: webhookEventId,
    eventType: 'payment.failed',
    payload: {
      account_id: accountId,
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_e2e_' + Date.now(),
            amount: 7500,
            currency: 'INR',
            status: 'failed',
            error_description: 'insufficient_funds',
            email: 'e2e@test.com',
            contact: '9999999999'
          }
        }
      }
    }
  });

  console.log('✅ Webhook Event Ingested! ID:', rawWebhook.id);
  console.log('⏳ Triggering Processor and Full Orchestrator Pipeline...');

  // 3. Kick off the Pipeline via Processor
  // This triggers: Processor -> Payment -> Orchestrator -> Case -> AI -> Policy -> Action -> Razorpay Execution
  await WebhookProcessorService.processEvent(rawWebhook.id);

  console.log('✅ Pipeline Execution Finished!');

  // 4. Trace the results starting from the Webhook
  const updatedWebhook = await WebhookEventService.getWebhookEventById(rawWebhook.id);
  if (!updatedWebhook.processed) {
    console.error('❌ Webhook was not marked as processed.');
    process.exit(1);
  }
  
  // Find the Payment
  const payRes = await pool.query(`SELECT id FROM payments WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT 1;`, [merchantId]);
  if (payRes.rows.length === 0) {
    console.error('❌ Payment was not created.');
    process.exit(1);
  }
  const paymentId = payRes.rows[0].id;

  // Find the Recovery Case
  const caseRes = await pool.query(`SELECT id, status FROM recovery_cases WHERE payment_id = $1;`, [paymentId]);
  if (caseRes.rows.length === 0) {
    console.error('❌ Recovery Case was not created.');
    process.exit(1);
  }
  const recoveryCase = caseRes.rows[0];
  console.log('✅ Recovery Case found. Status:', recoveryCase.status);

  // Find the Action
  const actions = await RecoveryActionService.getRecoveryActions(merchantId, recoveryCase.id);
  if (actions.length === 0) {
    console.error('❌ Recovery Action was not created. (Did Policy Engine block it?)');
    process.exit(1);
  }
  const action = actions[0];
  console.log('✅ Recovery Action created! Type:', action.type, '| Status:', action.status);

  // Find the Audit Events
  const auditEvents = await AuditEventService.getAuditEvents(merchantId, recoveryCase.id);
  console.log(`✅ Found ${auditEvents.length} Audit Events in the pipeline!`);
  
  auditEvents.forEach(e => console.log(`   -> [${e.actor}] ${e.eventType}`));

  // Final State Check
  // Since we hit Razorpay with a mock pay_e2e_XXX ID, it should gracefully fail and escalate.
  if (action.status === 'FAILED' && recoveryCase.status === 'ESCALATED') {
    console.log('✅ E2E State Machine correctly handled Razorpay failure integration!');
  } else {
    console.error('❌ State Machine mismatch. Action:', action.status, '| Case:', recoveryCase.status);
    process.exit(1);
  }

  console.log('🏆 ALL E2E PIPELINE TESTS PASSED 🏆');
  process.exit(0);
}

runE2E().catch(e => {
  console.error(e);
  process.exit(1);
});
