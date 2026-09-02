import { z } from 'zod';

// ==========================================
// RECOVERY CASE VALIDATION SCHEMA
// ==========================================
export const recoveryCaseSchema = z.object({
  
  // Required foreign keys linking this case to a merchant and a specific failed payment
  merchant_id: z.string().uuid('Invalid Merchant ID format'),
  payment_id: z.string().uuid('Invalid Payment ID format'),
  
  // Financial metrics for the recovery
  revenue_at_risk: z.number().positive('Revenue at risk must be a positive number'),
  recovery_probability: z.number().min(0).max(100).default(0), // Assuming probability is a percentage 0-100
  
  // Detailed diagnosis of why the payment failed and how it can be recovered
  diagnosis: z.string().optional(),
  
  // Status must be one of the exact specified states
  status: z.enum([
    'OPEN', 
    'ANALYZING', 
    'ACTION_PENDING', 
    'IN_PROGRESS', 
    'RECOVERED', 
    'ESCALATED', 
    'STOPPED', 
    'UNRECOVERABLE'
  ]).default('OPEN'),
  
  // Timestamps (typically handled by DB, included if passed in payload)
  recovered_at: z.string().datetime().optional(),
  closed_at: z.string().datetime().optional(),
  
});

// ==========================================
// TYPE EXPORT
// ==========================================
export type RecoveryCaseInput = z.infer<typeof recoveryCaseSchema>;

