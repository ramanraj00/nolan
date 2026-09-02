import { z } from 'zod';

// ==========================================
// POLICY DECISION VALIDATION SCHEMA
// ==========================================
export const policyDecisionSchema = z.object({
  
  // Links to the parent recovery case and the specific AI decision being evaluated
  recovery_case_id: z.string().uuid('Invalid Recovery Case ID format'),
  agent_decision_id: z.string().uuid('Invalid Agent Decision ID format'),
  
  // The action that the AI recommended
  action: z.string().min(1, 'Action string is required'),
  
  // The outcome from the Policy Engine
  allowed: z.boolean(),
  
  // Explanation of the outcome
  reason: z.string().min(1, 'Reason for the policy decision is required'),
  rule: z.string().min(1, 'The applied policy rule name is required'),
  
  // Does this action need manual intervention/approval?
  requires_approval: z.boolean().default(false),
  
});

// ==========================================
// TYPE EXPORT
// ==========================================
export type PolicyDecisionInput = z.infer<typeof policyDecisionSchema>;

