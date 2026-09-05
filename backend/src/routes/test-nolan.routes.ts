import express, { Request, Response } from 'express';
import { pool } from '../db';
import { WebhookProcessorService } from '../services/webhook-processor.service';
import { RecoveryCaseService } from '../services/recovery-case.service';
import { AgentDecisionService } from '../services/agent-decision.service';
import { PolicyDecisionService } from '../services/policy-decision.service';
import { RecoveryActionService } from '../services/recovery-action.service';
import { PaymentService } from '../services/payment.service';

const router = express.Router();

router.post('/simulate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchant_id, failure_reason, amount, customer_context } = req.body;
    
    if (!merchant_id || !failure_reason || !amount || !customer_context) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // 1. Create realistic customer based on context
    const customerId = `test_cust_${Date.now()}`;
    const email = `test_${Date.now()}@example.com`;
    let lifetimeValue = 1000;
    let successfulPayments = 1;
    let failedPayments = 0;

    if (customer_context === 'High Value Customer') {
      lifetimeValue = 50000;
      successfulPayments = 15;
    } else if (customer_context === 'Low Value Customer') {
      lifetimeValue = 100;
      successfulPayments = 1;
    } else if (customer_context === 'Risky Customer') {
      lifetimeValue = 0;
      successfulPayments = 0;
      failedPayments = 5;
    }

    await pool.query(
      `INSERT INTO customers (id, merchant_id, external_customer_id, name, email, lifetime_value, successful_payments, failed_payments) 
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
      [merchant_id, customerId, 'Test User', email, lifetimeValue, successfulPayments, failedPayments]
    );

    // 2. Generate a Webhook Event
    const eventId = `evt_test_${Date.now()}`;
    const paymentId = `pay_test_${Date.now()}`;
    
    const payload = {
      event: 'payment.failed',
      merchant_id,
      account_id: merchant_id,
      payload: {
        payment: {
          entity: {
            id: paymentId,
            amount: amount,
            currency: 'INR',
            email: email,
            customer_id: customerId,
            error_description: failure_reason
          }
        }
      }
    };

    const webhookRes = await pool.query(
      `INSERT INTO webhook_events (event_id, merchant_id, event_type, payload) VALUES ($1, $2, $3, $4) RETURNING id`,
      [eventId, merchant_id, 'payment.failed', payload]
    );
    const dbWebhookId = webhookRes.rows[0].id;

    // 3. Run Pipeline synchronously
    await WebhookProcessorService.processEvent(dbWebhookId);

    // 4. Fetch the generated pipeline entities to return to frontend
    // Get Payment
    const paymentRes = await pool.query(`SELECT id, status FROM payments WHERE razorpay_payment_id = $1`, [paymentId]);
    if (paymentRes.rows.length === 0) {
      throw new Error('Payment not created by pipeline');
    }
    const internalPaymentId = paymentRes.rows[0].id;

    // Get Case
    const recoveryCase = await RecoveryCaseService.getRecoveryCaseByPaymentId(internalPaymentId, merchant_id);
    if (!recoveryCase) {
      throw new Error('Recovery case not created by pipeline');
    }

    // Get AI Decision
    const aiDecisions = await AgentDecisionService.getAgentDecisions(merchant_id, recoveryCase.id);
    
    // Get Policy Decision
    const policyDecisions = await PolicyDecisionService.getPolicyDecisions(merchant_id, recoveryCase.id);
    
    // Get Action
    const actionsRes = await pool.query(`SELECT * FROM recovery_actions WHERE recovery_case_id = $1`, [recoveryCase.id]);
    const action = actionsRes.rows[0] || null;

    res.status(200).json({
      success: true,
      data: {
        payment: { id: paymentId, amount, failure_reason },
        ai: aiDecisions[0] || null,
        policy: policyDecisions[0] || null,
        action: action
      }
    });

  } catch (error: any) {
    console.error('Test simulation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
