import { pool } from '../db';

// ==========================================
// 1. AUDIT EVENT TYPESCRIPT INTERFACE
// ==========================================
// This interface defines the shape of an AuditEvent object.
// It acts as the ultimate timeline/log of everything that happened.
// 
// Example Timeline:
// 10:31 -> PAYMENT_FAILED
// 10:31 -> REVENUE_RISK_DETECTED
// 10:32 -> AI_ANALYSIS_COMPLETED
// 10:32 -> POLICY_APPROVED
// 16:32 -> RETRY_EXECUTED
// 16:33 -> PAYMENT_RECOVERED
//
export interface AuditEvent {
  id: string;                      // Unique internal ID for the event (UUID)
  merchant_id: string;             // ID of the merchant (Foreign Key)
  recovery_case_id?: string;       // ID of the recovery case (Optional, as some events might happen before a case is created)
  event_type: 'PAYMENT_FAILED' | 'REVENUE_RISK_DETECTED' | 'AI_ANALYSIS_COMPLETED' | 'POLICY_EVALUATED' | 'ACTION_APPROVED' | 'ACTION_REJECTED' | 'ACTION_EXECUTED' | 'PAYMENT_RECOVERED' | 'RECOVERY_ESCALATED' | 'RECOVERY_STOPPED';
  actor: string;                   // Who performed the action (e.g., 'SYSTEM', 'AI_AGENT', 'POLICY_ENGINE', 'HUMAN')
  metadata?: any;                  // JSON object storing extra details (like old status, new status, timestamps, etc.)
  created_at: Date;                // Timestamp of when the event occurred
}

// ==========================================
// 2. CREATE TABLE FUNCTION
// ==========================================
// This function creates the 'audit_events' table in the database.
export const createAuditEventTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS audit_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID NOT NULL REFERENCES merchants(user_id) ON DELETE CASCADE,
      recovery_case_id UUID REFERENCES recovery_cases(id) ON DELETE CASCADE,
      event_type VARCHAR(100) NOT NULL CHECK (event_type IN (
        'PAYMENT_FAILED', 
        'REVENUE_RISK_DETECTED', 
        'AI_ANALYSIS_COMPLETED', 
        'POLICY_EVALUATED', 
        'ACTION_APPROVED', 
        'ACTION_REJECTED', 
        'ACTION_EXECUTED', 
        'PAYMENT_RECOVERED', 
        'RECOVERY_ESCALATED', 
        'RECOVERY_STOPPED'
      )),
      actor VARCHAR(100) NOT NULL,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await pool.query(query);
  console.log("Audit Event table is ready!");
};

