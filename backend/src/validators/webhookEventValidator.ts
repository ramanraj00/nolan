import { z } from 'zod';

// ==========================================
// WEBHOOK EVENT VALIDATION SCHEMA
// ==========================================
export const webhookEventSchema = z.object({
  
  // Link to merchant (optional, as sometimes webhooks might not immediately have a clear merchant context)
  merchant_id: z.string().uuid('Invalid Merchant ID format').optional(),
  
  // External Event ID used for Idempotency
  event_id: z.string().min(1, 'Event ID from the provider is required for idempotency'),
  
  // The type of event (e.g., payment.failed, subscription.charged)
  event_type: z.string().min(1, 'Event type is required'),
  
  // The raw JSON payload received from the external provider
  payload: z.record(z.string(), z.unknown()), // Enforces that payload is an object
  
  // Processing status
  processed: z.boolean().default(false),
  
  // Timestamps
  processed_at: z.string().datetime().optional(),
  
});

// ==========================================
// TYPE EXPORT
// ==========================================
export type WebhookEventInput = z.infer<typeof webhookEventSchema>;

