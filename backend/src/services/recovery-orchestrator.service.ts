import { RecoveryCaseService } from './recovery-case.service';
import { AgentDecisionService } from './agent-decision.service';
import { PolicyDecisionService } from './policy-decision.service';
import { RecoveryActionService } from './recovery-action.service';
import { AuditEventService } from './audit-event.service';
import { AiAgentService, AiDecision } from './ai-agent.service';
import { CustomerService } from './customer.service';
import { RecoveryExecutorService } from './recovery-executor.service';

import { Payment } from './payment.service';

export class RecoveryOrchestratorService {
  /**
   * Full recovery pipeline:
   *
   * FAILED PAYMENT
   *      ↓
   * CREATE CASE
   *      ↓
   * AI ANALYSIS
   *      ↓
   * AGENT DECISION
   *      ↓
   * POLICY EVALUATION
   *      ↓
   * RECOVERY ACTION
   *      ↓
   * EXECUTION
   */
  static async processFailedPayment(payment: Payment) {
    let recoveryCase: any;

    try {
      console.log(
        `[RecoveryOrchestrator] Starting pipeline for payment ${payment.id}`
      );

      // =====================================================
      // STEP 1 — IDEMPOTENCY CHECK
      // =====================================================

      const existingCase =
        await RecoveryCaseService.getRecoveryCaseByPaymentId(
          payment.id,
          payment.merchantId
        );

      if (existingCase) {
        console.log(
          `[RecoveryOrchestrator] Recovery case already exists: ${existingCase.id}`
        );

        return {
          success: true,
          skipped: true,
          reason: 'RECOVERY_CASE_ALREADY_EXISTS',
          recoveryCaseId: existingCase.id
        };
      }

      // =====================================================
      // STEP 2 — CREATE RECOVERY CASE
      // =====================================================

      try {
        recoveryCase =
          await RecoveryCaseService.createRecoveryCase({
            merchantId: payment.merchantId,
            paymentId: payment.id
          });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '';

        if (message === 'RECOVERY_CASE_ALREADY_EXISTS') {
          const existing =
            await RecoveryCaseService.getRecoveryCaseByPaymentId(
              payment.id,
              payment.merchantId
            );

          return {
            success: true,
            skipped: true,
            reason: 'RECOVERY_CASE_ALREADY_EXISTS',
            recoveryCaseId: existing?.id
          };
        }

        throw error;
      }

      console.log(
        `[RecoveryOrchestrator] Recovery case created: ${recoveryCase.id}`
      );

      // =====================================================
      // STEP 3 — AUDIT EVENTS
      // =====================================================

      await AuditEventService.createAuditEvent({
        merchantId: payment.merchantId,
        entityType: 'PAYMENT',
        entityId: payment.id,
        eventType: 'PAYMENT_FAILED',
        actor: 'SYSTEM',
        metadata: {
          reason: payment.failureReason
        }
      });

      await AuditEventService.createAuditEvent({
        merchantId: payment.merchantId,
        recoveryCaseId: recoveryCase.id,
        entityType: 'RECOVERY_CASE',
        entityId: recoveryCase.id,
        eventType: 'REVENUE_RISK_DETECTED',
        actor: 'SYSTEM'
      });

      // =====================================================
      // STEP 4 — STATUS → ANALYZING
      // =====================================================

      await RecoveryCaseService.updateCaseStatus(
        recoveryCase.id,
        payment.merchantId,
        'ANALYZING'
      );

      console.log(
        `[RecoveryOrchestrator] Case ${recoveryCase.id} moved to ANALYZING`
      );

      // =====================================================
      // STEP 5 — FETCH CUSTOMER
      // =====================================================

      const customer =
        await CustomerService.getCustomerById(payment.customerId);

      // =====================================================
      // STEP 6 — AI ANALYSIS
      // =====================================================

      let aiRecommendation: AiDecision;
      let aiModel = 'gemini-2.5-flash';

      try {
        console.log(
          `[RecoveryOrchestrator] Calling Gemini AI for case ${recoveryCase.id}`
        );

        aiRecommendation =
          await AiAgentService.analyzeFailure(
            payment,
            customer,
            recoveryCase.id
          );

        console.log(
          '[RecoveryOrchestrator] Gemini decision:',
          aiRecommendation
        );

      } catch (aiError) {
        console.error(
          '[RecoveryOrchestrator] Gemini failed. Using deterministic fallback:',
          aiError
        );

        // =====================================================
        // DEMO / RESILIENCE FALLBACK
        // =====================================================

        const failureReason =
          payment.failureReason?.toLowerCase() || '';

        let recommendedAction:
          | 'RETRY_PAYMENT'
          | 'REQUEST_PAYMENT_METHOD_UPDATE'
          | 'SEND_CHECKOUT_RECOVERY'
          | 'RETRY_SUBSCRIPTION'
          | 'SEND_PAYMENT_REMINDER'
          | 'ESCALATE_HUMAN'
          | 'STOP_RECOVERY' =
          'RETRY_PAYMENT';

        let probability = 0.65;
        let delay = 0;

        if (
          failureReason.includes('authentication') ||
          failureReason.includes('expired') ||
          failureReason.includes('invalid')
        ) {
          recommendedAction =
            'REQUEST_PAYMENT_METHOD_UPDATE';

          probability = 0.72;
          delay = 0;

        } else if (
          failureReason.includes('insufficient') ||
          failureReason.includes('fund')
        ) {
          recommendedAction = 'RETRY_PAYMENT';

          probability = 0.68;
          delay = 1440;

        } else if (
          failureReason.includes('temporary') ||
          failureReason.includes('network')
        ) {
          recommendedAction = 'RETRY_PAYMENT';

          probability = 0.75;
          delay = 60;
        }

        aiRecommendation = {
          diagnosis:
            `Payment recovery analysis identified the failure reason as ` +
            `"${payment.failureReason || 'unknown'}". ` +
            `A recovery strategy was selected using deterministic fallback analysis.`,

          recovery_probability: probability,

          recommended_action: recommendedAction,

          recommended_delay: delay,

          confidence: 0.82,

          reasoning:
            'Fallback recovery strategy selected based on the gateway failure reason and payment context.'
        };

        aiModel = 'fallback-recovery-engine';
      }

      // =====================================================
      // STEP 7 — SAVE AI DECISION
      // =====================================================

      console.log(
        `[RecoveryOrchestrator] Saving agent decision for case ${recoveryCase.id}`
      );

      const agentDecision =
        await AgentDecisionService.createAgentDecision({
          merchantId: payment.merchantId,
          recoveryCaseId: recoveryCase.id,

          diagnosis: aiRecommendation.diagnosis,
          reasoning: aiRecommendation.reasoning,

          recoveryProbability:
            aiRecommendation.recovery_probability,

          recommendedAction:
            aiRecommendation.recommended_action,

          recommendedDelay:
            aiRecommendation.recommended_delay,

          confidence:
            aiRecommendation.confidence,

          model: aiModel
        });

      console.log(
        `[RecoveryOrchestrator] Agent decision created: ${agentDecision.id}`
      );

      await AuditEventService.createAuditEvent({
        merchantId: payment.merchantId,
        recoveryCaseId: recoveryCase.id,
        entityType: 'AGENT_DECISION',
        entityId: agentDecision.id,
        eventType: 'AI_ANALYSIS_COMPLETED',
        actor: 'AI_AGENT',
        metadata: {
          recommendedAction:
            aiRecommendation.recommended_action,

          confidence:
            aiRecommendation.confidence,

          model: aiModel
        }
      });

      // =====================================================
      // STEP 8 — POLICY EVALUATION
      // =====================================================

      console.log(
        `[RecoveryOrchestrator] Running policy engine`
      );

      const policyDecision =
        await PolicyDecisionService.createPolicyDecision({
          merchantId: payment.merchantId,
          recoveryCaseId: recoveryCase.id,
          agentDecisionId: agentDecision.id
        });

      console.log(
        `[RecoveryOrchestrator] Policy decision created: ${policyDecision.id}`
      );

      await AuditEventService.createAuditEvent({
        merchantId: payment.merchantId,
        recoveryCaseId: recoveryCase.id,
        entityType: 'POLICY_DECISION',
        entityId: policyDecision.id,
        eventType: 'POLICY_EVALUATED',
        actor: 'POLICY_ENGINE',
        metadata: {
          allowed: policyDecision.allowed,
          requiresApproval:
            policyDecision.requiresApproval,
          action: policyDecision.action
        }
      });

      // =====================================================
      // STEP 9 — STATUS → ACTION_PENDING
      // =====================================================

      await RecoveryCaseService.updateCaseStatus(
        recoveryCase.id,
        payment.merchantId,
        'ACTION_PENDING'
      );

      // =====================================================
      // STEP 10 — POLICY DENIED
      // =====================================================

      if (!policyDecision.allowed) {
        console.log(
          `[RecoveryOrchestrator] Policy denied action`
        );

        await AuditEventService.createAuditEvent({
          merchantId: payment.merchantId,
          recoveryCaseId: recoveryCase.id,
          entityType: 'POLICY_DECISION',
          entityId: policyDecision.id,
          eventType: 'ACTION_REJECTED',
          actor: 'POLICY_ENGINE',
          metadata: {
            reason: policyDecision.reason
          }
        });

        await RecoveryCaseService.updateCaseStatus(
          recoveryCase.id,
          payment.merchantId,
          'ESCALATED'
        );

        return {
          success: true,
          recoveryCaseId: recoveryCase.id,
          outcome: 'POLICY_DENIED'
        };
      }

      // =====================================================
      // STEP 11 — CREATE RECOVERY ACTION
      // =====================================================

      console.log(
        `[RecoveryOrchestrator] Creating recovery action`
      );

      const recoveryAction =
        await RecoveryActionService.createRecoveryAction({
          merchantId: payment.merchantId,
          recoveryCaseId: recoveryCase.id,
          policyDecisionId: policyDecision.id
        });

      console.log(
        `[RecoveryOrchestrator] Recovery action created: ${recoveryAction.id}`
      );

      const initialStatus =
        policyDecision.requiresApproval
          ? 'PENDING_APPROVAL'
          : 'PENDING';

      await AuditEventService.createAuditEvent({
        merchantId: payment.merchantId,
        recoveryCaseId: recoveryCase.id,
        entityType: 'RECOVERY_ACTION',
        entityId: recoveryAction.id,
        eventType:
          policyDecision.requiresApproval
            ? 'RECOVERY_ESCALATED'
            : 'ACTION_APPROVED',
        actor: 'SYSTEM',
        metadata: {
          actionStatus: initialStatus,
          action: recoveryAction.type
        }
      });

      // =====================================================
      // STEP 12 — EXECUTE ACTION
      // =====================================================

      if (!policyDecision.requiresApproval) {
        console.log(
          `[RecoveryOrchestrator] Executing action ${recoveryAction.id}`
        );

        await RecoveryExecutorService.executeAction(
          recoveryAction.id,
          payment.merchantId
        );
      } else {
        await RecoveryCaseService.updateCaseStatus(
          recoveryCase.id,
          payment.merchantId,
          'ESCALATED'
        );
      }

      console.log(
        `[RecoveryOrchestrator] Pipeline completed successfully`
      );

      return {
        success: true,
        recoveryCaseId: recoveryCase.id,
        agentDecisionId: agentDecision.id,
        policyDecisionId: policyDecision.id,
        recoveryActionId: recoveryAction.id
      };

    } catch (error) {
      console.error(
        '[RecoveryOrchestrator] PIPELINE FAILED:',
        error
      );

      // Case ko ANALYZING mein permanently mat chhodna
      if (recoveryCase?.id) {
        try {
          await RecoveryCaseService.updateCaseStatus(
            recoveryCase.id,
            payment.merchantId,
            'ESCALATED'
          );

          await AuditEventService.createAuditEvent({
            merchantId: payment.merchantId,
            recoveryCaseId: recoveryCase.id,
            entityType: 'RECOVERY_CASE',
            entityId: recoveryCase.id,
            eventType: 'RECOVERY_ESCALATED',
            actor: 'SYSTEM',
            metadata: {
              reason: 'PIPELINE_ERROR',
              error:
                error instanceof Error
                  ? error.message
                  : String(error)
            }
          });
        } catch (statusError) {
          console.error(
            '[RecoveryOrchestrator] Failed to update error status:',
            statusError
          );
        }
      }

      throw error;
    }
  }
}
