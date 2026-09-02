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

      await AuditEventService.createAuditEvent({
        merchantId,
        recoveryCaseId,
        entityType: 'RECOVERY_ACTION',
        entityId: actionId,
        eventType: 'PAYMENT_RECOVERED',
        actor: 'SYSTEM',
        metadata: { result: executionResult.message }
      });

      // 7. Close the Recovery Case
      await RecoveryCaseService.updateCaseStatus(recoveryCaseId, merchantId, 'CLOSED_RECOVERED');

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

  /**
   * Simulates dynamic logic for contacting an external provider based on action type.
   */
  private static async performProviderAction(actionType: string, actionData: any): Promise<{ message: string }> {
    // In a real system, this would import Razorpay SDK, Email SDK, etc.
    // For MVP, we route dynamically but simulate network calls.
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        switch (actionType) {
          case 'RETRY_PAYMENT':
            // E.g., Razorpay /payments/{id}/retry
            resolve({ message: 'Payment retry succeeded via provider gateway.' });
            break;
            
          case 'REQUEST_PAYMENT_METHOD_UPDATE':
            // E.g., SendGrid email template
            resolve({ message: 'Update link emailed to customer.' });
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

