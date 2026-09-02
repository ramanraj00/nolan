import express, { Request, Response } from 'express';
import { pool } from '../db';
import { paymentSchema } from '../validators/paymentValidator';

const router = express.Router();

// ==========================================
// RECORD A NEW PAYMENT (POST Request)
// ==========================================
// Purpose: Record a transaction strictly mapping Merchant and Customer.
// Separation of Concern: This is ONLY the record of the transaction. No recovery logic here.
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate incoming data (Zod ensures camelCase, correct types, and integer amounts)
    const validationResult = paymentSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const { 
      merchantId, 
      customerId, 
      razorpayPaymentId, 
      amount, 
      currency, 
      status, 
      failureReason, 
      attemptCount 
    } = validationResult.data;

    // 2. IMPORTANT: Verify parent existence (Merchant and Customer)
    // We check if customer exists AND if the associated merchant is strictly active.
    const parentCheckQuery = `
      SELECT c.id 
      FROM customers c
      JOIN merchants m ON m.user_id = c.merchant_id
      WHERE c.id = $1 AND c.merchant_id = $2 AND m.status != 'inactive'
    `;
    const parentCheck = await pool.query(parentCheckQuery, [customerId, merchantId]);

    if (parentCheck.rows.length === 0) {
      res.status(404).json({ 
        error: 'Invalid relationship or inactive merchant. Customer must belong to an active Merchant.' 
      });
      return;
    }

    // 3. Insert Payment into Database
    // Note: We use DB timestamps (failed_at) dynamically based on status
    const failed_at = status === 'FAILED' ? new Date().toISOString() : null;

    const query = `
      INSERT INTO payments (
        merchant_id, 
        customer_id, 
        razorpay_payment_id, 
        amount, 
        currency, 
        status, 
        failure_reason, 
        attempt_count,
        failed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        id, 
        merchant_id as "merchantId", 
        customer_id as "customerId", 
        razorpay_payment_id as "razorpayPaymentId", 
        amount, 
        currency, 
        status, 
        failure_reason as "failureReason", 
        attempt_count as "attemptCount",
        created_at as "createdAt", 
        failed_at as "failedAt", 
        recovered_at as "recoveredAt";
    `;
    const values = [
      merchantId, 
      customerId, 
      razorpayPaymentId, 
      amount, 
      currency, 
      status, 
      failureReason, 
      attemptCount,
      failed_at
    ];

    const dbResult = await pool.query(query, values);

    // 4. Return the successfully logged payment
    res.status(201).json({
      message: 'Payment recorded successfully',
      data: dbResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating payment:', error);

    // Handle invalid UUID error from PostgreSQL
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided for Merchant or Customer' });
       return;
    }

    // Handle unique constraint (duplicate razorpay payment ID)
    if (error.code === '23505') {
       res.status(409).json({ error: 'A payment with this Razorpay Payment ID already exists' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while recording payment' });
  }
});

// ==========================================
// VIEW PAYMENTS WITH FILTERS (GET Request)
// ==========================================
// Purpose: Fetch payments belonging to a specific merchant.
// Optional Filter: Filter by status (e.g., ?status=FAILED) to find all failed payments for the Revenue-at-Risk Engine.
// Example: GET /payments?merchant_id=merchant_001&status=failed
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchant_id = req.query.merchant_id as string;
    const status = req.query.status as string;

    // 1. Enforce strict isolation (merchant_id is mandatory)
    if (!merchant_id) {
      res.status(400).json({ 
        error: 'merchant_id is required as a query parameter (e.g., /payments?merchant_id=uuid)' 
      });
      return;
    }

    // 2. Build dynamic SQL query with dynamic parameters
    let query = `
      SELECT 
        id, 
        merchant_id as "merchantId", 
        customer_id as "customerId", 
        razorpay_payment_id as "razorpayPaymentId", 
        amount, 
        currency, 
        status, 
        failure_reason as "failureReason", 
        attempt_count as "attemptCount",
        created_at as "createdAt", 
        failed_at as "failedAt", 
        recovered_at as "recoveredAt"
      FROM payments
      WHERE merchant_id = $1
    `;
    
    const values: any[] = [merchant_id];

    // 3. Apply optional status filter if provided
    if (status) {
      // API-level validation for safe status values
      const allowedStatuses = ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED'];
      const upperStatus = status.toUpperCase();
      
      if (!allowedStatuses.includes(upperStatus)) {
        res.status(400).json({ error: 'Invalid status parameter' });
        return;
      }
      
      values.push(upperStatus);
      query += ` AND status = $2`;
    }

    // 4. Order by newest first
    query += ` ORDER BY created_at DESC;`;

    // 5. Execute query
    const dbResult = await pool.query(query, values);

    // 6. Return payload wrapped in "data" for API consistency
    res.status(200).json({ data: dbResult.rows });
  } catch (error: any) {
    console.error('Error fetching payments:', error);

    // Handle invalid UUID error from PostgreSQL
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid merchant_id format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching payments' });
  }
});

// ==========================================
// VIEW A SPECIFIC PAYMENT (GET Request)
// ==========================================
// Purpose: To get complete and detailed transaction details of a single payment.
// Example: GET /payments/payment_123
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentId = String(req.params.id);

    // 1. Fetch specific payment dynamically with camelCase aliases
    const query = `
      SELECT 
        id, 
        merchant_id as "merchantId", 
        customer_id as "customerId", 
        razorpay_payment_id as "razorpayPaymentId", 
        amount, 
        currency, 
        status, 
        failure_reason as "failureReason", 
        attempt_count as "attemptCount",
        created_at as "createdAt", 
        failed_at as "failedAt", 
        recovered_at as "recoveredAt"
      FROM payments
      WHERE id = $1;
    `;
    
    // 2. Execute query
    const dbResult = await pool.query(query, [paymentId]);

    // 3. Handle non-existent payment
    if (dbResult.rows.length === 0) {
       res.status(404).json({ error: 'Payment not found' });
       return;
    }

    // 4. Send back the single payment object wrapped in "data"
    res.status(200).json({ data: dbResult.rows[0] });
  } catch (error: any) {
    console.error('Error fetching specific payment:', error);
    
    // Handle invalid UUID error from PostgreSQL
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Payment ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching the payment' });
  }
});

export default router;
