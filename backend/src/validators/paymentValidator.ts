import { z } from 'zod';

// ==========================================
// PAYMENT VALIDATION SCHEMA
// ==========================================
export const paymentSchema = z.object({
  
  // Required foreign keys linking this payment to a merchant and a customer
  merchant_id: z.string().uuid('Invalid Merchant ID format'),
  customer_id: z.string().uuid('Invalid Customer ID format'),
  
  // External payment ID from Razorpay
  razorpay_payment_id: z.string().min(1, 'Razorpay Payment ID is required'),
  
  // Financial details
  amount: z.number().positive('Amount must be a positive number'),
  currency: z.string().length(3, 'Currency must be a 3-letter code (e.g., INR)').default('INR'),
  
  // Status must be one of the exact specified states
  status: z.enum(['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED']),
  
  // Optional reason for failure
  failure_reason: z.string().optional(),
  
  // Number of times payment was attempted
  attempt_count: z.number().int().min(1).default(1),
  
  // Timestamps (handled by database usually, but added for completeness if passed in payload)
  failed_at: z.string().datetime().optional(),
  recovered_at: z.string().datetime().optional(),
  
});

// ==========================================
// TYPE EXPORT
// ==========================================
export type PaymentInput = z.infer<typeof paymentSchema>;

