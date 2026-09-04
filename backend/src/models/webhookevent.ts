import { pool } from '../db';

// ==========================================
// 1. WEBHOOK EVENT TYPESCRIPT INTERFACE
// ==========================================
// This interface defines the shape of a WebhookEvent object.
// 
// Benefits of storing webhooks:
// - Webhook Idempotency: Prevents processing the same event twice using 'eventId'.
// - Debugging: Raw payload is saved, making it easy to see exactly what external providers sent.
// - Replay: If our system fails, we can easily replay and re-process past events.
//
// Examples of eventTypes: 'payment.failed', 'payment.captured', 'subscription.charged', etc.
//
export interface WebhookEvent {
  id: string;                      // Unique internal ID for our database (UUID)
  merchant_id?: string;            // ID of the merchant (Foreign Key, optional in case it cannot be parsed instantly)
  event_id: string;                // The unique event ID sent by the provider (e.g., Razorpay event ID)
  event_type: string;              // The type of the webhook event (e.g., 'payment.failed')
  payload: Record<string, unknown>;                    // The exact raw JSON payload received from the webhook
  processed: boolean;              // Boolean flag indicating if the event was successfully processed
  processed_at?: Date;             // Timestamp of when the event was processed
  processing_started_at?: Date;    // Timestamp of when the worker claimed this event for processing
  processing_attempts: number;     // Number of times processing was attempted
  created_at: Date;                // Timestamp of when the webhook was received and stored
}

// ==========================================
// 2. CREATE TABLE FUNCTION
// ==========================================
// This function creates the 'webhook_events' table in the database.
export const createWebhookEventTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS webhook_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID REFERENCES merchants(user_id) ON DELETE SET NULL,
      event_id VARCHAR(255) UNIQUE NOT NULL,
      event_type VARCHAR(255) NOT NULL,
      payload JSONB NOT NULL,
      processed BOOLEAN DEFAULT false,
      processed_at TIMESTAMP,
      processing_started_at TIMESTAMP,
      processing_attempts INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await pool.query(query);
  console.log("Webhook Event table is ready!");
};

