import { pool } from '../db';

// ==========================================
// 1. RECOVERY ACTION TYPESCRIPT INTERFACE
// ==========================================
// This interface defines the shape of a RecoveryAction object.
// It records the actual action taken based on the AI's decision 
// and the policy engine's approval.
export interface RecoveryAction {
  id: string;                      // Unique internal ID for the action (UUID)
  recovery_case_id: string;        // ID of the related recovery case (Foreign Key)
  type: 'RETRY_PAYMENT' | 'REQUEST_PAYMENT_METHOD_UPDATE' | 'SEND_CHECKOUT_RECOVERY' | 'RETRY_SUBSCRIPTION' | 'SEND_PAYMENT_REMINDER' | 'ESCALATE_HUMAN' | 'STOP_RECOVERY';
  status: 'PENDING' | 'SCHEDULED' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  scheduled_at?: Date;             // Timestamp of when the action is scheduled to run
  executed_at?: Date;              // Timestamp of when the action actually started
  completed_at?: Date;             // Timestamp of when the action finished
  result?: string;                 // Detailed outcome of the action (e.g., successful API response)
  failure_reason?: string;         // Reason if the action failed to execute
  metadata?: any;                  // JSON field for storing any arbitrary/dynamic data related to the action
}

// ==========================================
// 2. CREATE TABLE FUNCTION
// ==========================================
// This function creates the 'recovery_actions' table in the database.
export const createRecoveryActionTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS recovery_actions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recovery_case_id UUID NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
      type VARCHAR(100) NOT NULL CHECK (type IN (
        'RETRY_PAYMENT', 
        'REQUEST_PAYMENT_METHOD_UPDATE', 
        'SEND_CHECKOUT_RECOVERY', 
        'RETRY_SUBSCRIPTION', 
        'SEND_PAYMENT_REMINDER', 
        'ESCALATE_HUMAN', 
        'STOP_RECOVERY'
      )),
      status VARCHAR(50) NOT NULL CHECK (status IN (
        'PENDING', 
        'SCHEDULED', 
        'EXECUTING', 
        'SUCCESS', 
        'FAILED', 
        'CANCELLED'
      )),
      scheduled_at TIMESTAMP,
      executed_at TIMESTAMP,
      completed_at TIMESTAMP,
      result TEXT,
      failure_reason TEXT,
      metadata JSONB
    );
  `;
  
  await pool.query(query);
  console.log("Recovery Action table is ready!");
};

