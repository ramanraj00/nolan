import { pool } from '../db';

// ==========================================
// 1. CUSTOMER TYPESCRIPT INTERFACE
// ==========================================
// This interface defines the shape of a Customer object.
// A Customer represents the person whose payment failed, linked to a specific Merchant.
export interface Customer {
  id: string;                      // Unique internal ID for each customer (UUID)
  merchant_id: string;             // ID of the merchant this customer belongs to (Foreign Key)
  external_customer_id: string;    // Customer ID from the external gateway (e.g., Razorpay)
  name: string;                    // Full name of the customer
  email: string;                   // Customer's email address
  phone: string;                   // Customer's phone number
  lifetime_value: number;          // Total revenue recovered/generated from this customer
  total_payments: number;          // Total number of payment attempts
  successful_payments: number;     // Number of successful payment transactions
  failed_payments: number;         // Number of failed payment transactions
  status: 'active' | 'inactive';   // Customer's current status (for soft deletes)
  created_at: Date;                // Timestamp of record creation
  updated_at: Date;                // Timestamp of last update
}

// ==========================================
// 2. CREATE TABLE FUNCTION
// ==========================================
// This function creates the 'customers' table in the database if it doesn't already exist.
export const createCustomerTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      merchant_id UUID NOT NULL REFERENCES merchants(user_id) ON DELETE CASCADE,
      external_customer_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      lifetime_value DECIMAL(10, 2) DEFAULT 0.00,
      total_payments INT DEFAULT 0,
      successful_payments INT DEFAULT 0,
      failed_payments INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(merchant_id, external_customer_id)
    );
  `;
  
  await pool.query(query);
  console.log("Customer table is ready!");
};

