import { z } from 'zod';

// ==========================================
// PAYMENT VALIDATION SCHEMA
// ==========================================
export const paymentSchema = z.object({
  
  // Required foreign keys linking this payment to a merchant and a customer
  merchantId: z.string().uuid('Invalid Merchant ID format'),
  customerId: z.string().uuid('Invalid Customer ID format'),
  
  // External payment ID from Razorpay
  razorpayPaymentId: z.string().min(1, 'Razorpay Payment ID is required'),
  
  // Financial details (Must be an integer in minor units, e.g., paise, to avoid floating point issues)
  amount: z.number().int('Amount must be an integer (in minor units, e.g., paise)').positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be a 3-letter code (e.g., INR)').default('INR'),
  
  // Status must be one of the exact specified states
  status: z.enum(['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED']),
  
  // Optional reason for failure (Extremely important for AI diagnosis context)
  failureReason: z.string().optional(),
  
  // Number of times payment was attempted
  attemptCount: z.number().int().min(1).default(1),
  
  // Timestamps (handled by database usually, but added for completeness if passed in payload)
  failedAt: z.string().datetime().optional(),
  recoveredAt: z.string().datetime().optional(),
  
});

// ==========================================
// TYPE EXPORT
// ==========================================
export type PaymentInput = z.infer<typeof paymentSchema>;

