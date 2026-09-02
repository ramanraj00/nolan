import { pool } from '../db';

/**
 * What is `pool`?
 * A Connection Pool (`pool`) is a cache of database connections maintained 
 * so that the connections can be reused when future requests to the database are required.
 * Instead of opening a new connection for every query, the backend borrows an existing 
 * connection from the pool, which significantly improves performance and scalability.
 * We have configured this in `db.ts` using the PostgreSQL `pg` library.
 */

// ==========================================
// 1. MERCHANT TYPESCRIPT INTERFACE
// ==========================================
// This interface defines the shape of a Merchant object in TypeScript.
export interface Merchant {
  user_id: string;               // Unique ID for each merchant (UUID)
  name: string;                  // Full name of the merchant
  email: string;                 // Merchant's email address
  razorpay_account_id: string;   // Associated Razorpay account ID
  status: 'active' | 'inactive' | 'suspended'; // Current account status
  created_at: Date;              // Timestamp of when the record was created
  updated_at: Date;              // Timestamp of when the record was last updated
}

// ==========================================
// 2. CREATE TABLE FUNCTION
// ==========================================
// This function creates the 'merchants' table in the database if it doesn't already exist.
export const createMerchantTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS merchants (
      user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      razorpay_account_id VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  // `pool.query` executes the SQL query on the PostgreSQL database
  await pool.query(query);
  console.log("Merchant table is ready!");
};
