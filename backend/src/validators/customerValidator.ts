import { z } from 'zod';

// ==========================================
// CUSTOMER VALIDATION SCHEMA
// ==========================================
export const customerSchema = z.object({
  
  // Merchant ID is required to link the customer to a specific merchant
  merchant_id: z.string().uuid('Invalid Merchant ID format'),
  
  // External customer ID (e.g., from Razorpay or Stripe)
  external_customer_id: z.string().min(1, 'External Customer ID is required'),
  
  // Name is required
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  
  // Email is optional but must be valid if provided
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  
  // Phone is optional but must meet basic length requirements if provided
  phone: z.string().min(7, 'Phone number seems too short').optional().or(z.literal('')),
  
  // Financial and analytical fields (default to 0 if not provided)
  lifetime_value: z.number().min(0).default(0),
  total_payments: z.number().int().min(0).default(0),
  successful_payments: z.number().int().min(0).default(0),
  failed_payments: z.number().int().min(0).default(0),
  
});

// ==========================================
// TYPE EXPORT
// ==========================================
export type CustomerInput = z.infer<typeof customerSchema>;

