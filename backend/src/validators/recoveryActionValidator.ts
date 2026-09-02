import { z } from 'zod';

// ==========================================
// RECOVERY ACTION VALIDATION SCHEMA
// ==========================================
export const recoveryActionSchema = z.object({
  
  // Link to the parent recovery case
  recovery_case_id: z.string().uuid('Invalid Recovery Case ID format'),
  
  // The specific type of action being executed
  type: z.enum([
    'RETRY_PAYMENT', 
    'REQUEST_PAYMENT_METHOD_UPDATE', 
    'SEND_CHECKOUT_RECOVERY', 
    'RETRY_SUBSCRIPTION', 
    'SEND_PAYMENT_REMINDER', 
    'ESCALATE_HUMAN', 
    'STOP_RECOVERY'
  ]),
  
  // Current status of the action
  status: z.enum([
    'PENDING', 
    'SCHEDULED', 
    'EXECUTING', 
    'SUCCESS', 
    'FAILED', 
    'CANCELLED'
  ]).default('PENDING'),
  
  // Timestamps (handled by backend logic, but validated if present in payload)
  scheduled_at: z.string().datetime().optional(),
  executed_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  
  // Execution details
  result: z.string().optional(),
  failure_reason: z.string().optional(),
  
  // Metadata can be any arbitrary JSON object (using unknown or a loose object type)
  metadata: z.record(z.string(), z.unknown()).optional(),
  
});

// ==========================================
// TYPE EXPORT
// ==========================================
export type RecoveryActionInput = z.infer<typeof recoveryActionSchema>;

