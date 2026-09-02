import { z } from 'zod';

// ==========================================
// AUDIT EVENT VALIDATION SCHEMA
// ==========================================
export const auditEventSchema = z.object({
  
  // Link to merchant (always required)
  merchant_id: z.string().uuid('Invalid Merchant ID format'),
  
  // Link to recovery case (optional, as some events might precede case creation)
  recovery_case_id: z.string().uuid('Invalid Recovery Case ID format').optional(),
  
  // The exact type of event that occurred
  event_type: z.enum([
    'PAYMENT_FAILED', 
    'REVENUE_RISK_DETECTED', 
    'AI_ANALYSIS_COMPLETED', 
    'POLICY_EVALUATED', 
    'ACTION_APPROVED', 
    'ACTION_REJECTED', 
    'ACTION_EXECUTED', 
    'PAYMENT_RECOVERED', 
    'RECOVERY_ESCALATED', 
    'RECOVERY_STOPPED'
  ]),
  
  // Who or what performed the action
  actor: z.string().min(1, 'Actor is required (e.g., SYSTEM, AI_AGENT)'),
  
  // Flexible metadata object for tracking context details
  metadata: z.record(z.string(), z.unknown()).optional(),
  
});

// ==========================================
// TYPE EXPORT
// ==========================================
export type AuditEventInput = z.infer<typeof auditEventSchema>;

