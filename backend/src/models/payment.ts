import { pool } from '../db';

// ==========================================
// 1. PAYMENT TYPESCRIPT INTERFACE
// ==========================================
// This interface defines the shape of a Payment object.
// It acts as the core schema where every transaction/payment is stored.
export interface Payment {
  id: string;                      // Unique internal ID for each payment (UUID)
  merchant_id: string;             // ID of the merchant (Foreign Key)
  customer_id: string;             // ID of the customer (Foreign Key)
  razorpay_payment_id: string;     // Transaction ID from Razorpay
  amount: number;                  // Payment amount
  currency: string;                // Payment currency (e.g., 'INR', 'USD')
  status: 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED'; // Payment status
  failure_reason?: string;         // Reason for payment failure, if applicable
  attempt_count: number;           // Number of times this payment was attempted
  created_at: Date;                // Timestamp of when the record was created
  failed_at?: Date;                // Timestamp of when the payment failed
  recovered_at?: Date;             // Timestamp of when the payment was successfully recovered
}

// ==========================================
// 2. CREATE TABLE FUNCTION
// ==========================================
// This function creates the 'payments' table in the database.
export const createPaymentTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID NOT NULL REFERENCES merchants(user_id) ON DELETE CASCADE,
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      razorpay_payment_id VARCHAR(255) NOT NULL,
      amount BIGINT NOT NULL,
      currency VARCHAR(10) DEFAULT 'INR',
      status VARCHAR(50) NOT NULL CHECK (status IN ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED')),
      failure_reason TEXT,
      attempt_count INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      failed_at TIMESTAMP,
      recovered_at TIMESTAMP,
      UNIQUE(razorpay_payment_id)
    );
  `;
  
  await pool.query(query);
  console.log("Payment table is ready!");
};

