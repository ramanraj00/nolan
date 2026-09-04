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
    const action = await RecoveryActionService.getRecoveryActionById(actionId);
    
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

    try {
      // 3. State Transition: SCHEDULED (Optional intermediate step for tracking queuing delay)
      if (action.status === 'PENDING') {
        await RecoveryActionService.updateRecoveryActionStatus(actionId, { status: 'SCHEDULED' });
        // Event ACTION_SCHEDULED omitted as it's not in the enum
      }

      // 4. State Transition: EXECUTING
      await RecoveryActionService.updateRecoveryActionStatus(actionId, { status: 'EXECUTING' });

      await AuditEventService.createAuditEvent({
        merchantId,
        recoveryCaseId,
        entityType: 'RECOVERY_ACTION',
        entityId: actionId,
        eventType: 'ACTION_EXECUTED',
        actor: 'SYSTEM'
      });

      // 5. Perform the Actual Provider Action (Dynamic based on type)
      const executionResult = await this.performProviderAction(action.type, action);

      // 6. State Transition: SUCCESS
      await RecoveryActionService.updateRecoveryActionStatus(actionId, { 
        status: 'SUCCESS', 
        result: executionResult.message 
      });

      // 7. Mark the case as IN_PROGRESS (waiting for customer to pay the link)
      await RecoveryCaseService.updateCaseStatus(recoveryCaseId, merchantId, 'IN_PROGRESS');

      return { success: true, message: executionResult.message };

    } catch (error: any) {
      // State Transition: FAILED
      await RecoveryActionService.updateRecoveryActionStatus(actionId, { 
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
    const action = await RecoveryActionService.getRecoveryActionById(actionId);
    
    if (!action || action.status !== 'PENDING_APPROVAL') {
      throw new Error('Action not found or not pending approval');
    }

    const updatedAction = await RecoveryActionService.updateRecoveryActionStatus(actionId, { status: 'PENDING' });

    await AuditEventService.createAuditEvent({
      merchantId,
      recoveryCaseId: action.recoveryCaseId,
      entityType: 'RECOVERY_ACTION',
      entityId: actionId,
      eventType: 'ACTION_APPROVED',
      actor: 'HUMAN', // Explicitly logging the human actor
      metadata: { approvedBy: humanUserId }
    });

    return updatedAction;
  }

  private static async performProviderAction(actionType: string, actionData: any): Promise<{ message: string }> {
    if (actionType === 'RETRY_PAYMENT') {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      
      if (!keyId || !keySecret) {
         throw new Error("Razorpay credentials missing in environment (.env). Cannot execute real API.");
      }
      
      // Fetch the original payment details to recreate the charge
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
      const dbRes = await pool.query(fetchQuery, [actionData.recoveryCaseId]);
      
      if (dbRes.rows.length === 0) {
         throw new Error("Payment/Customer context not found for execution.");
      }

      const payment = dbRes.rows[0];
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      
      // Creating a Payment Link is the safest "Retry" simulation for a Hackathon 
      // without needing complex recurring tokens.
      const payload = {
        amount: parseInt(payment.amount),
        currency: payment.currency || "INR",
        accept_partial: false,
        description: `Automated Retry for failed payment ${payment.razorpay_payment_id}`,
        customer: {
          name: payment.customer_name || "Customer",
          email: payment.customer_email || "test@example.com",
          contact: payment.customer_phone || "+919999999999"
        },
        notify: {
          sms: false,
          email: false // Prevent sending actual emails to fake accounts during test
        },
        reminder_enable: true,
        notes: {
          recovery_case_id: actionData.recoveryCaseId
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

      return { message: `Successfully generated Razorpay Recovery Link: ${data.short_url}` };
    }

    // Other mocked actions
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        switch (actionType) {
          case 'REQUEST_PAYMENT_METHOD_UPDATE':
            // E.g., SendGrid email template
            resolve({ message: 'Update link emailed to customer.' });
            break;

          case 'SEND_PAYMENT_REMINDER':
            // E.g., SendGrid / Twilio Reminder
            resolve({ message: 'Payment reminder email sent successfully.' });
            break;

          case 'SEND_CHECKOUT_RECOVERY':
            // E.g., Twilio SMS
            resolve({ message: 'Abandoned checkout SMS sent.' });
            break;

          case 'ESCALATE_HUMAN':
            // Just a placeholder, usually humans don't execute automatically, 
            // but if an agent acts on an escalated case, they might mark it as done.
            resolve({ message: 'Human intervention recorded.' });
            break;

          default:
            // Dynamic fallback for unknown types
            reject(new Error(`Unsupported action type: ${actionType}`));
        }
      }, 500); // simulate 500ms network latency
    });
  }
}

