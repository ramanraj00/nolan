import { z } from 'zod';

// ==========================================
// MERCHANT VALIDATION SCHEMA
// ==========================================
// Zod is a schema declaration and validation library.
// When the frontend sends data to the backend, we use this schema to ensure
// that the incoming payload is in the correct format and contains all required fields.

export const merchantSchema = z.object({
  
  // Name must be provided and must be at least 2 characters long
  name: z.string().min(2, 'Name is required and must be at least 2 characters long'),
  
  // Email must be a valid email format (e.g., user@example.com)
  email: z.string().email('Invalid email address'),
  
  // Razorpay account ID cannot be empty
  razorpayAccountId: z.string().min(1, 'Razorpay account ID is required'),
  
  // Status must be one of the specified options. Defaults to 'active' if not provided.
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  
});

// ==========================================
// TYPE EXPORT
// ==========================================
// We automatically generate the TypeScript type from the Zod schema.
// This saves us from having to manually write an interface for the incoming payload.
export type MerchantInput = z.infer<typeof merchantSchema>;
