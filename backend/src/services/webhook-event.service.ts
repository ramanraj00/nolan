import { pool } from '../db';

export class WebhookEventService {
  static async createWebhookEvent(data: { eventId: string; eventType: string; payload: any }) {
    let merchantId = (data.payload as any)?.merchant_id;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (merchantId && !uuidRegex.test(merchantId)) {
      merchantId = null;
    } else {
      merchantId = merchantId || null;
    }

    const insertQuery = `
      INSERT INTO webhook_events (
        merchant_id,
        event_id,
        event_type,
        payload,
        processed
      )
      VALUES ($1, $2, $3, $4, false)
      RETURNING 
        id, 
        merchant_id as "merchantId",
        event_id as "eventId",
        event_type as "eventType",
        payload,
        processed,
        processed_at as "processedAt",
        created_at as "createdAt";
    `;

    const values = [merchantId, data.eventId, data.eventType, data.payload];

    const dbResult = await pool.query(insertQuery, values);
    return dbResult.rows[0];
  }

  static async getWebhookEvents(merchantId: string, eventType?: string, processed?: boolean) {
    let query = `
      SELECT 
        id, 
        merchant_id as "merchantId",
        event_id as "eventId",
        event_type as "eventType",
        payload,
        processed,
        processed_at as "processedAt",
        created_at as "createdAt"
      FROM webhook_events
      WHERE merchant_id = $1
    `;
    
    const values: any[] = [merchantId];
    let paramIndex = 2;

    if (eventType) {
      values.push(eventType);
      query += ` AND event_type = $${paramIndex++}`;
    }

    if (processed !== undefined) {
      values.push(processed);
      query += ` AND processed = $${paramIndex++}`;
    }

    query += ` ORDER BY created_at DESC;`;
    
    const dbResult = await pool.query(query, values);
    return dbResult.rows;
  }

  static async claimWebhookEvent(webhookEventId: string) {
    const query = `
      UPDATE webhook_events
      SET processing_started_at = CURRENT_TIMESTAMP,
          processing_attempts = processing_attempts + 1
      WHERE id = $1
        AND processed = false
        AND (
          processing_started_at IS NULL
          OR processing_started_at < CURRENT_TIMESTAMP - INTERVAL '10 minutes'
        )
      RETURNING
        id,
        merchant_id as "merchantId",
        event_id as "eventId",
        event_type as "eventType",
        payload,
        processed,
        processed_at as "processedAt",
        processing_started_at as "processingStartedAt",
        processing_attempts as "processingAttempts",
        created_at as "createdAt";
    `;

    const dbResult = await pool.query(query, [webhookEventId]);

    return dbResult.rows.length > 0 ? dbResult.rows[0] : null;
  }

  static async getWebhookEventById(id: string) {
    const query = `
      SELECT 
        id, 
        merchant_id as "merchantId",
        event_id as "eventId",
        event_type as "eventType",
        payload,
        processed,
        processed_at as "processedAt",
        created_at as "createdAt"
      FROM webhook_events
      WHERE id = $1;
    `;
    
    const dbResult = await pool.query(query, [id]);
    return dbResult.rows.length > 0 ? dbResult.rows[0] : null;
  }
}
