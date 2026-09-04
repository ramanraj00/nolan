import { pool } from '../db';
import { WebhookEventService } from './webhook-event.service';
import { PaymentService } from './payment.service';
import { RecoveryOrchestratorService } from './recovery-orchestrator.service';
import { CustomerService } from './customer.service';
import { PaymentRecoveryService } from './payment-recovery.service';

export class WebhookProcessorService {
  /**
   * Reads a raw webhook event from the database, identifies what it means,
   * maps the Razorpay specific data to our unified schemas, and returns
   * the normalized output. (Later to be wired into Orchestrator).
   */
  static async processEvent(webhookEventId: string) {
    const event = await WebhookEventService.getWebhookEventById(webhookEventId);
    
    if (!event) {
      throw new Error('Webhook event not found');
    }

    if (event.processed) {
      return { status: 'already_processed', eventId: event.eventId };
    }

    const payload = event.payload;
    const accountId = payload?.account_id;
    const eventType = payload?.event;
    
    if (!accountId || !eventType) {
      throw new Error('Invalid Razorpay payload format (missing account_id or event)');
    }

    // 1. Identify Merchant
    let merchantId = event.merchantId;
    if (!merchantId) {
      // Find merchant by razorpay_account_id
      const merchantQuery = `SELECT user_id as id FROM merchants WHERE razorpay_account_id = $1 LIMIT 1;`;
      const merchantRes = await pool.query(merchantQuery, [accountId]);
      
      if (merchantRes.rows.length === 0) {
        throw new Error(`Merchant not found for Razorpay Account ID: ${accountId}`);
      }
      merchantId = merchantRes.rows[0].id;

      // Update the webhook event with the identified merchant
      await pool.query(`UPDATE webhook_events SET merchant_id = $1 WHERE id = $2`, [merchantId, webhookEventId]);
    }

    // 2. Identify Event Data based on type
    let normalizedData: any = {
      merchantId,
      eventType,
      rawEventId: event.eventId
    };

    if (eventType === 'payment.failed') {
      const paymentEntity = payload?.payload?.payment?.entity;
      if (!paymentEntity) {
        throw new Error('Payment entity missing in payment.failed event payload');
      }
      
      const externalCustomerId = paymentEntity.customer_id || paymentEntity.email || 'guest_' + paymentEntity.id;
      
      // Find or Create Customer
      let customerRes = await pool.query(`SELECT id FROM customers WHERE merchant_id = $1 AND external_customer_id = $2`, [merchantId, externalCustomerId]);
      let customerId: string;
      if (customerRes.rows.length === 0) {
        const newCustomer = await CustomerService.createCustomer({
          merchant_id: merchantId,
          external_customer_id: externalCustomerId,
          name: paymentEntity.contact ? 'User ' + paymentEntity.contact : 'Unknown Customer',
          email: paymentEntity.email || null,
          phone: paymentEntity.contact || null
        });
        customerId = newCustomer.id;
      } else {
        customerId = customerRes.rows[0].id;
      }

      // Create Payment Record
      let paymentRecord;
      try {
        paymentRecord = await PaymentService.createPayment({
          merchantId: merchantId,
          customerId: customerId,
          razorpayPaymentId: paymentEntity.id,
          amount: paymentEntity.amount,
          currency: paymentEntity.currency,
          status: 'FAILED',
          failureReason: paymentEntity.error_description || paymentEntity.error_reason || 'Unknown',
          attemptCount: 1
        });
      } catch (err: any) {
        if (err.code === '23505') {
          // If payment already exists, fetch it
          const existingRes = await pool.query(`SELECT * FROM payments WHERE razorpay_payment_id = $1`, [paymentEntity.id]);
          paymentRecord = {
            id: existingRes.rows[0].id,
            merchantId,
            customerId,
            amount: existingRes.rows[0].amount,
            currency: existingRes.rows[0].currency,
            failureReason: existingRes.rows[0].failure_reason,
            attemptCount: existingRes.rows[0].attempt_count
          };
        } else {
          throw err;
        }
      }

      // Trigger the Recovery Orchestrator Pipeline
      await RecoveryOrchestratorService.processFailedPayment({
        id: paymentRecord.id,
        merchantId: merchantId,
        customerId: customerId,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        failureReason: paymentRecord.failureReason,
        attemptCount: paymentRecord.attemptCount
      });

      normalizedData.payment = {
        razorpayPaymentId: paymentEntity.id,
        amount: paymentEntity.amount,
        status: 'FAILED',
        orchestratorTriggered: true
      };
    } else if (eventType === 'payment.captured') {
      const paymentEntity = payload?.payload?.payment?.entity;
      if (!paymentEntity) {
        throw new Error(`Payment entity missing in payment.captured payload`);
      }

      normalizedData.payment = {
        razorpayPaymentId: paymentEntity.id,
        amount: paymentEntity.amount,
        currency: paymentEntity.currency,
        status: 'CAPTURED',
        email: paymentEntity.email,
        contact: paymentEntity.contact
      };

      await PaymentRecoveryService.handlePaymentCaptured({
        merchantId,
        razorpayPaymentId: paymentEntity.id,
        amount: paymentEntity.amount,
        currency: paymentEntity.currency,
      });

    } else if (eventType === 'payment.authorized') {
      const paymentEntity = payload?.payload?.payment?.entity;
      if (!paymentEntity) {
        throw new Error(`Payment entity missing in payment.authorized payload`);
      }

      normalizedData.payment = {
        razorpayPaymentId: paymentEntity.id,
        amount: paymentEntity.amount,
        currency: paymentEntity.currency,
        status: 'AUTHORIZED',
        email: paymentEntity.email,
        contact: paymentEntity.contact
      };
    } else {
      normalizedData.unsupported = true;
    }

    // 3. Mark as processed
    await pool.query(`UPDATE webhook_events SET processed = true, processed_at = CURRENT_TIMESTAMP WHERE id = $1`, [webhookEventId]);

    return {
      status: 'processed',
      data: normalizedData
    };
  }
}

