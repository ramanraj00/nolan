import { pool } from '../db';
import { AuditEvent } from '../models/auditevent';

export class AuditEventService {
  static async createAuditEvent(data: {
    merchantId: string;
    recoveryCaseId?: string;
    entityType?: AuditEvent['entity_type'];
    entityId?: string;
    eventType: AuditEvent['event_type'];
    actor: AuditEvent['actor'];
    metadata?: Record<string, unknown>;
  }) {
    if (data.recoveryCaseId) {
      const caseCheckQuery = `
        SELECT id FROM recovery_cases
        WHERE id = $1 AND merchant_id = $2
      `;
      const caseCheckResult = await pool.query(caseCheckQuery, [data.recoveryCaseId, data.merchantId]);
      
      if (caseCheckResult.rows.length === 0) {
        throw new Error('INVALID_RECOVERY_CASE');
      }
    }

    const insertQuery = `
      INSERT INTO audit_events (
        merchant_id,
        recovery_case_id,
        entity_type,
        entity_id,
        event_type,
        actor,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, 
        merchant_id as "merchantId",
        recovery_case_id as "recoveryCaseId",
        entity_type as "entityType",
        entity_id as "entityId",
        event_type as "eventType",
        actor,
        metadata,
        created_at as "createdAt";
    `;

    const values = [
      data.merchantId,
      data.recoveryCaseId || null,
      data.entityType || null,
      data.entityId || null,
      data.eventType,
      data.actor,
      data.metadata || null
    ];

    const dbResult = await pool.query(insertQuery, values);
    return dbResult.rows[0];
  }

  static async getAuditEvents(merchantId: string, recoveryCaseId?: string, eventType?: string, actor?: string) {
    let query = `
      SELECT 
        id, 
        merchant_id as "merchantId",
        recovery_case_id as "recoveryCaseId",
        entity_type as "entityType",
        entity_id as "entityId",
        event_type as "eventType",
        actor,
        metadata,
        created_at as "createdAt"
      FROM audit_events
      WHERE merchant_id = $1
    `;
    
    const values: unknown[] = [merchantId];
    let paramIndex = 2;

    if (recoveryCaseId) {
      values.push(recoveryCaseId);
      query += ` AND recovery_case_id = $${paramIndex++}`;
    }

    if (eventType) {
      values.push(eventType.toUpperCase());
      query += ` AND event_type = $${paramIndex++}`;
    }

    if (actor) {
      values.push(actor.toUpperCase());
      query += ` AND actor = $${paramIndex++}`;
    }

    query += ` ORDER BY created_at ASC;`;
    
    const dbResult = await pool.query(query, values);
    return dbResult.rows;
  }

  static async getAuditEventById(eventId: string, merchantId: string) {
    const query = `
      SELECT 
        id, 
        merchant_id as "merchantId",
        recovery_case_id as "recoveryCaseId",
        entity_type as "entityType",
        entity_id as "entityId",
        event_type as "eventType",
        actor,
        metadata,
        created_at as "createdAt"
      FROM audit_events
      WHERE id = $1
        AND merchant_id = $2;
    `;
    
    const dbResult = await pool.query(query, [eventId, merchantId]);
    return dbResult.rows.length > 0 ? dbResult.rows[0] : null;
  }
}
