import { pool } from '../db';

// ==========================================
// 1. RECOVERY CASE TYPESCRIPT INTERFACE
// ==========================================
// This interface defines the shape of a RecoveryCase object.
// This is the core of the product. When a payment fails, the system creates 
// a recovery case to attempt to recover the lost revenue.
export interface RecoveryCase {
  id: string;                      // Unique internal ID for the recovery case (UUID)
  merchant_id: string;             // ID of the merchant (Foreign Key)
  payment_id: string;              // ID of the failed payment (Foreign Key)
  revenue_at_risk: number;         // Amount of revenue that is at risk of being lost
  recovery_probability: number;    // Probability score of recovering the revenue (e.g., 0.00 to 100.00)
  diagnosis?: string;              // Detailed analysis or reason for the failure
  status: 'OPEN' | 'ANALYZING' | 'ACTION_PENDING' | 'IN_PROGRESS' | 'RECOVERED' | 'ESCALATED' | 'STOPPED' | 'UNRECOVERABLE';
  created_at: Date;                // Timestamp of when the case was created
  updated_at: Date;                // Timestamp of last update
  recovered_at?: Date;             // Timestamp of when the revenue was successfully recovered
  closed_at?: Date;                // Timestamp of when the case was closed (whether successful or not)
}

// ==========================================
// 2. CREATE TABLE FUNCTION
// ==========================================
// This function creates the 'recovery_cases' table in the database.
export const createRecoveryCaseTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS recovery_cases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID NOT NULL REFERENCES merchants(user_id) ON DELETE CASCADE,
      payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      revenue_at_risk BIGINT NOT NULL,
      recovery_probability DECIMAL(5, 2) DEFAULT 0.00,
      diagnosis TEXT,
      status VARCHAR(50) NOT NULL CHECK (status IN (
        'OPEN', 
        'ANALYZING', 
        'ACTION_PENDING', 
        'IN_PROGRESS', 
        'RECOVERED', 
        'ESCALATED', 
        'STOPPED', 
        'UNRECOVERABLE'
      )),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      recovered_at TIMESTAMP,
      closed_at TIMESTAMP,
      UNIQUE(payment_id)
    );
  `;
  
  await pool.query(query);
  console.log("Recovery Case table is ready!");
};

