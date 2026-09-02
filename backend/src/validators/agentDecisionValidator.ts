import { z } from 'zod';

// ==========================================
// AGENT DECISION VALIDATION SCHEMA
// ==========================================
export const agentDecisionSchema = z.object({
  
  // Link to the parent recovery case
  recovery_case_id: z.string().uuid('Invalid Recovery Case ID format'),
  
  // AI analysis and reasoning text
  diagnosis: z.string().min(1, 'Diagnosis cannot be empty'),
  reasoning: z.string().min(1, 'Reasoning cannot be empty'),
  
  // Financial and AI metrics
  recovery_probability: z.number().min(0).max(100, 'Probability must be between 0 and 100'),
  confidence: z.number().min(0).max(100, 'Confidence score must be between 0 and 100'),
  
  // AI recommendations
  recommended_action: z.string().min(1, 'Recommended action is required'),
  recommended_delay: z.number().int().min(0, 'Delay cannot be negative').default(0), // Defaults to 0 (immediate)
  
  // Information about the AI model executing the decision
  model: z.string().min(1, 'Model name is required (e.g., gpt-4)'),
  
});

// ==========================================
// TYPE EXPORT
// ==========================================
export type AgentDecisionInput = z.infer<typeof agentDecisionSchema>;

