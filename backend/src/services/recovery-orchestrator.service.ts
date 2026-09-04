
import { RecoveryCaseService } from './recovery-case.service';
import { AgentDecisionService } from './agent-decision.service';
import { PolicyDecisionService } from './policy-decision.service';
import { RecoveryActionService } from './recovery-action.service';
import { AuditEventService } from './audit-event.service';
import { AiAgentService } from './ai-agent.service';
import { CustomerService } from './customer.service';
import { RecoveryExecutorService } from './recovery-executor.service';

import { Payment } from './payment.service';

export class RecoveryOrchestratorService {
  /**
   * Main entry point for processing a failed payment through the full recovery pipeline.
   * FAILED PAYMENT -> Create Recovery Case -> Analyze failure -> Agent Decision -> Policy Decision -> Allowed -> Action -> Execute -> Recovered?
   */
  static async processFailedPayment(payment: Payment) {
    const existingCase = await RecoveryCaseService.getRecoveryCaseByPaymentId(
      payment.id,
      payment.merchantId
    );

    if (existingCase) {
      return {
        success: true,
        skipped: true,
        reason: 'RECOVERY_CASE_ALREADY_EXISTS',
        recoveryCaseId: existingCase.id
      };
    }

    let recoveryCase;
    try {
      // Step 1: Create Recovery Case (Atomic IDempotency Guard)
      recoveryCase = await RecoveryCaseService.createRecoveryCase({
        merchantId: payment.merchantId,
        paymentId: payment.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'RECOVERY_CASE_ALREADY_EXISTS') {
        return {
          success: true,
          skipped: true,
          reason: 'RECOVERY_CASE_ALREADY_EXISTS'
        };
      }
      throw error;
    }

    // Step 0: Log Event (Only if we won the case creation race)
    await AuditEventService.createAuditEvent({
      merchantId: payment.merchantId,
      entityType: 'PAYMENT',
      entityId: payment.id,
      eventType: 'PAYMENT_FAILED',
      actor: 'SYSTEM',
      metadata: { reason: payment.failureReason }
    });

    await AuditEventService.createAuditEvent({
      merchantId: payment.merchantId,
      recoveryCaseId: recoveryCase.id,
      entityType: 'RECOVERY_CASE',
      entityId: recoveryCase.id,
      eventType: 'REVENUE_RISK_DETECTED',
      actor: 'SYSTEM'
    });

    // Transition to ANALYZING
    await RecoveryCaseService.updateCaseStatus(recoveryCase.id, payment.merchantId, 'ANALYZING');

    // Step 2: Fetch Customer Context
    const customer = await CustomerService.getCustomerById(payment.customerId);

    // Step 3: Analyze Failure with Real GenAI Agent
    const aiRecommendation = await AiAgentService.analyzeFailure(payment, customer, recoveryCase.id);
    
    // Step 4: Save Agent Decision
    let agentDecision;
    try {
      agentDecision = await AgentDecisionService.createAgentDecision({
        merchantId: payment.merchantId,
        recoveryCaseId: recoveryCase.id,
        diagnosis: aiRecommendation.diagnosis,
        reasoning: aiRecommendation.reasoning,
        recoveryProbability: aiRecommendation.recovery_probability,
        recommendedAction: aiRecommendation.recommended_action,
        recommendedDelay: aiRecommendation.recommended_delay,
        confidence: aiRecommendation.confidence,
        model: 'gemini-2.5-flash'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'INVALID_AI_RECOMMENDATION') {
        await RecoveryCaseService.updateCaseStatus(recoveryCase.id, payment.merchantId, 'ESCALATED');
        await AuditEventService.createAuditEvent({
          merchantId: payment.merchantId,
          recoveryCaseId: recoveryCase.id,
          entityType: 'RECOVERY_CASE',
          entityId: recoveryCase.id,
          eventType: 'RECOVERY_ESCALATED',
          actor: 'SYSTEM',
          metadata: {
            reason: 'INVALID_AI_RECOMMENDATION',
            recommendedAction: aiRecommendation.recommended_action
          }
        });
        return { success: false, reason: 'INVALID_AI_RECOMMENDATION' };
      }
      throw error;
    }

    await AuditEventService.createAuditEvent({
      merchantId: payment.merchantId,
      recoveryCaseId: recoveryCase.id,
      entityType: 'AGENT_DECISION',
      entityId: agentDecision.id,
      eventType: 'AI_ANALYSIS_COMPLETED',
      actor: 'AI_AGENT',
      metadata: { recommendedAction: aiRecommendation.recommended_action, confidence: aiRecommendation.confidence }
    });

    // Step 5: Policy Engine evaluates the AI Decision
    const policyDecision = await PolicyDecisionService.createPolicyDecision({
      merchantId: payment.merchantId,
      recoveryCaseId: recoveryCase.id,
      agentDecisionId: agentDecision.id
    });

    await AuditEventService.createAuditEvent({
      merchantId: payment.merchantId,
      recoveryCaseId: recoveryCase.id,
      entityType: 'POLICY_DECISION',
      entityId: policyDecision.id,
      eventType: 'POLICY_EVALUATED',
      actor: 'POLICY_ENGINE',
      metadata: { allowed: policyDecision.allowed, requiresApproval: policyDecision.requiresApproval }
    });

    // Transition to ACTION_PENDING
    await RecoveryCaseService.updateCaseStatus(recoveryCase.id, payment.merchantId, 'ACTION_PENDING');

    // Step 6: Enforcement (Allowed / Escalate / Execute)
    if (policyDecision.allowed) {
      const initialStatus = policyDecision.requiresApproval ? 'PENDING_APPROVAL' : 'PENDING';
      
      const recoveryAction = await RecoveryActionService.createRecoveryAction({
        merchantId: payment.merchantId,
        recoveryCaseId: recoveryCase.id,
        policyDecisionId: policyDecision.id
      });
      // RecoveryActionService determines the initial action status.

      await AuditEventService.createAuditEvent({
        merchantId: payment.merchantId,
        recoveryCaseId: recoveryCase.id,
        entityType: 'RECOVERY_ACTION',
        entityId: recoveryAction.id,
        eventType: policyDecision.requiresApproval ? 'RECOVERY_ESCALATED' : 'ACTION_APPROVED',
        actor: 'SYSTEM',
        metadata: { actionStatus: initialStatus }
      });

      // If it's PENDING (ready to execute), we trigger execution via the dedicated Executor.
      if (initialStatus === 'PENDING') {
         await RecoveryExecutorService.executeAction(recoveryAction.id, payment.merchantId);
      }

    } else {
      // Policy Denied
      await AuditEventService.createAuditEvent({
        merchantId: payment.merchantId,
        recoveryCaseId: recoveryCase.id,
        entityType: 'POLICY_DECISION',
        entityId: policyDecision.id,
        eventType: 'ACTION_REJECTED',
        actor: 'SYSTEM',
        metadata: { reason: policyDecision.reason }
      });
      
      // Update case to ESCALATED
      await RecoveryCaseService.updateCaseStatus(recoveryCase.id, payment.merchantId, 'ESCALATED');
    }
  }
}
