import { pool } from './db';
import { WebhookEventService } from './services/webhook-event.service';
import { WebhookProcessorService } from './services/webhook-processor.service';

async function testProcessor() {
  console.log('--- STARTING WEBHOOK PROCESSOR TEST ---');

  // 1. Create a mock merchant
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Webhook Test Merchant', 'webhook${Date.now()}@test.com', 'acc_webhook_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;
  console.log('✅ Created Merchant with acc_webhook_123:', merchantId);

  // 2. Create a mock webhook event (merchantId is initially NULL)
  const event = await WebhookEventService.createWebhookEvent({
    eventId: 'evt_processor_' + Date.now(),
    eventType: 'payment.failed',
    payload: {
      account_id: 'acc_webhook_123',
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_xyz',
            amount: 500,
            currency: 'INR',
            status: 'failed',
            error_description: 'insufficient_funds',
            email: 'cust@test.com',
            contact: '9999999999'
          }
        }
      }
    }
  });
  console.log('✅ Created Raw WebhookEvent (merchant_id is NULL):', event.id);

  // 3. Run the processor
  console.log('⏳ Running WebhookProcessorService...');
  const result = await WebhookProcessorService.processEvent(event.id);

  console.log('✅ Processor Result:');
  console.log(JSON.stringify(result, null, 2));

  if (result.data.merchantId === merchantId) {
    console.log('✅ Merchant correctly identified and linked!');
  } else {
    console.error('❌ Merchant linking failed');
  }

  if (result.data.payment.status === 'FAILED') {
    console.log('✅ Payment status correctly mapped!');
  } else {
    console.error('❌ Payment mapping failed');
  }

  // Verify DB state
  const updatedEvent = await WebhookEventService.getWebhookEventById(event.id);
  if (updatedEvent.processed === true) {
    console.log('✅ Webhook Event marked as processed in DB!');
  } else {
    console.error('❌ Webhook Event NOT marked as processed');
  }

  process.exit(0);
}

testProcessor().catch(e => {
  console.error(e);
  process.exit(1);
});

