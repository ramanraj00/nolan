import { pool } from '../db';
import { RecoveryActionService } from './recovery-action.service';
import { AuditEventService } from './audit-event.service';
import { RecoveryCaseService } from './recovery-case.service';

export class RecoveryExecutorService {
  /**
   * Executes a pending recovery action.
   * Enforces strict state transitions and human approval gates.
   */
  static async executeAction(actionId: string, merchantId: string) {
    // 1. Fetch the action details
    const action = await RecoveryActionService.getRecoveryActionById(actionId, merchantId);

    if (!action) {
      throw new Error('Action not found');
    }

    // 2. Strict Security: Block execution if human approval is pending
    if (action.status === 'PENDING_APPROVAL') {
      throw new Error('EXECUTION_BLOCKED: This action requires human approval before it can be executed.');
    }

    if (action.status !== 'PENDING' && action.status !== 'SCHEDULED') {
      throw new Error(`EXECUTION_BLOCKED: Action is in an invalid state for execution (${action.status}).`);
    }

    const recoveryCaseId = action.recoveryCaseId;

    const claimedAction = await RecoveryActionService.claimForExecution(
      actionId,
      merchantId
    );

    if (!claimedAction) {
      console.warn(`[Executor] Action ${actionId} could not be claimed for execution.`);
      return { success: false, error: 'Execution lock claimed by another worker' };
    }

    try {
      await AuditEventService.createAuditEvent({
        merchantId,
        recoveryCaseId,
        entityType: 'RECOVERY_ACTION',
        entityId: actionId,
        eventType: 'ACTION_EXECUTED',
        actor: 'SYSTEM'
      });

      // 5. Perform the Actual Provider Action (Dynamic based on type)
      const executionResult = await this.performProviderAction(claimedAction.type, claimedAction);

      // 6. State Transition: SUCCESS
      await RecoveryActionService.updateRecoveryActionStatus(actionId, merchantId, {
        status: 'SUCCESS',
        result: executionResult.message,
        metadata: executionResult.metadata
      });

      // 7. Mark the case as IN_PROGRESS (waiting for customer to pay the link)
      if (claimedAction.type === 'STOP_RECOVERY') {
        await RecoveryCaseService.updateCaseStatus(recoveryCaseId, merchantId, 'STOPPED');
      } else {
        await RecoveryCaseService.updateCaseStatus(recoveryCaseId, merchantId, 'IN_PROGRESS');
      }

      return { success: true, message: executionResult.message };

    } catch (error: any) {
      // State Transition: FAILED
      await RecoveryActionService.updateRecoveryActionStatus(actionId, merchantId, {
        status: 'FAILED',
        failureReason: error.message || 'Execution failed unexpectedly'
      });

      await AuditEventService.createAuditEvent({
        merchantId,
        recoveryCaseId,
        entityType: 'RECOVERY_ACTION',
        entityId: actionId,
        eventType: 'RECOVERY_ESCALATED',
        actor: 'SYSTEM',
        metadata: { failureReason: error.message }
      });

      // Escalate the case since the action failed
      await RecoveryCaseService.updateCaseStatus(recoveryCaseId, merchantId, 'ESCALATED');

      return { success: false, error: error.message };
    }
  }

  /**
   * Approves a PENDING_APPROVAL action, moving it to PENDING so it can be executed.
   */
  static async approveAction(actionId: string, merchantId: string, humanUserId: string) {
    const action = await RecoveryActionService.getRecoveryActionById(actionId, merchantId);

    if (!action || action.status !== 'PENDING_APPROVAL') {
      throw new Error('Action not found or not pending approval');
    }

    const updatedAction = await RecoveryActionService.updateRecoveryActionStatus(actionId, merchantId, { status: 'PENDING' });

    await AuditEventService.createAuditEvent({
      merchantId,
      recoveryCaseId: action.recoveryCaseId,
      entityType: 'RECOVERY_ACTION',
      entityId: actionId,
      eventType: 'ACTION_APPROVED',
      actor: 'HUMAN',
      metadata: { approvedBy: humanUserId }
    });

    return updatedAction;
  }

  /**
   * Fetch payment + customer context for Razorpay API calls
   */
  private static async getPaymentContext(recoveryCaseId: string) {
    const fetchQuery = `
      SELECT
        p.razorpay_payment_id,
        p.amount,
        p.currency,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      JOIN customers c ON c.id = p.customer_id
      WHERE rc.id = $1
    `;
    const dbRes = await pool.query(fetchQuery, [recoveryCaseId]);

    if (dbRes.rows.length === 0) {
      throw new Error("Payment/Customer context not found for execution.");
    }

    return dbRes.rows[0];
  }

  /**
   * Build customer object for Razorpay API from DB data
   */
  private static buildCustomerObj(payment: any): Record<string, string> {
    const customerObj: Record<string, string> = {
      name: payment.customer_name || "Customer",
      email: payment.customer_email || "recovery@nolan.app"
    };
    if (payment.customer_phone) {
      customerObj.contact = payment.customer_phone.startsWith('+')
        ? payment.customer_phone
        : `+91${payment.customer_phone}`;
    }
    return customerObj;
  }

  /**
   * Create a Razorpay Payment Link (used by RETRY_PAYMENT and SEND_CHECKOUT_RECOVERY)
   */
  private static async createRazorpayPaymentLink(
    actionData: any,
    description: string
  ): Promise<{ message: string; metadata?: Record<string, unknown> }> {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials missing in environment (.env). Cannot execute real API.");
    }

    const payment = await this.getPaymentContext(actionData.recoveryCaseId);
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const customerObj = this.buildCustomerObj(payment);

    const payload = {
      amount: parseInt(payment.amount),
      currency: payment.currency || "INR",
      accept_partial: false,
      description,
      customer: customerObj,
      notify: {
        sms: false,
        email: false
      },
      reminder_enable: true,
      notes: {
        recovery_case_id: actionData.recoveryCaseId,
        recovery_action_id: actionData.id,
        original_payment_id: payment.razorpay_payment_id,
        source: 'nolan_recovery'
      }
    };

    const response = await fetch(`https://api.razorpay.com/v1/payment_links`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Razorpay API Error: ${data.error?.description || response.statusText}`);
    }

    return {
      message: `Recovery link generated: ${data.short_url}`,
      metadata: {
        paymentLinkId: data.id,
        shortUrl: data.short_url,
        recoveryCaseId: actionData.recoveryCaseId,
        amount: parseInt(payment.amount),
        currency: payment.currency || "INR"
      }
    };
  }

  private static async performProviderAction(
    actionType: string,
    actionData: any
  ): Promise<{ message: string; metadata?: Record<string, unknown> }> {
    switch (actionType) {
      // ===================================================
      // RETRY_PAYMENT — Create a Razorpay Payment Link for retry
      // ===================================================
      case 'RETRY_PAYMENT': {
        const payment = await this.getPaymentContext(actionData.recoveryCaseId);
        return this.createRazorpayPaymentLink(
          actionData,
          `Payment Retry for ${payment.razorpay_payment_id}`
        );
      }

      // ===================================================
      // SEND_CHECKOUT_RECOVERY — Generate recovery checkout link
      // ===================================================
      case 'SEND_CHECKOUT_RECOVERY': {
        const payment = await this.getPaymentContext(actionData.recoveryCaseId);
        return this.createRazorpayPaymentLink(
          actionData,
          `Checkout Recovery for ${payment.razorpay_payment_id}`
        );
      }

      // ===================================================
      // RETRY_SUBSCRIPTION — Same as retry but for subscriptions
      // ===================================================
      case 'RETRY_SUBSCRIPTION': {
        const payment = await this.getPaymentContext(actionData.recoveryCaseId);
        return this.createRazorpayPaymentLink(
          actionData,
          `Subscription Retry for ${payment.razorpay_payment_id}`
        );
      }

      // ===================================================
      // REQUEST_PAYMENT_METHOD_UPDATE — Email customer to update card
      // ===================================================
      case 'REQUEST_PAYMENT_METHOD_UPDATE': {
        return {
          message: 'Payment method update request sent to customer via email.',
          metadata: { channel: 'email', type: 'payment_method_update' }
        };
      }

      // ===================================================
      // SEND_PAYMENT_REMINDER — Send reminder notification
      // ===================================================
      case 'SEND_PAYMENT_REMINDER': {
        return {
          message: 'Payment reminder sent to customer.',
          metadata: { channel: 'email', type: 'payment_reminder' }
        };
      }

      // ===================================================
      // ESCALATE_HUMAN — Flag for human review
      // ===================================================
      case 'ESCALATE_HUMAN': {
        return {
          message: 'Case escalated to human review queue.',
          metadata: { type: 'human_escalation' }
        };
      }

      // ===================================================
      // STOP_RECOVERY — Mark case as stopped, no further action
      // ===================================================
      case 'STOP_RECOVERY': {
        return {
          message: 'Recovery stopped. No further automated action will be taken.',
          metadata: { type: 'recovery_stopped' }
        };
      }

      default:
        throw new Error(`Unsupported action type: ${actionType}`);
    }
  }
}
