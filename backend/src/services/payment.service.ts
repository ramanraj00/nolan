import { pool } from '../db';

export class PaymentService {
  static async createPayment(data: {
    merchantId: string;
    customerId: string;
    razorpayPaymentId: string;
    amount: number;
    currency: string;
    status: string;
    failureReason?: string;
    attemptCount: number;
  }) {
    // IMPORTANT: Verify parent existence (Merchant and Customer)
    // We check if customer exists AND if the associated merchant is strictly active.
    const parentCheckQuery = `
      SELECT c.id 
      FROM customers c
      JOIN merchants m ON m.user_id = c.merchant_id
      WHERE c.id = $1 AND c.merchant_id = $2 AND m.status != 'inactive'
    `;
    const parentCheck = await pool.query(parentCheckQuery, [data.customerId, data.merchantId]);

    if (parentCheck.rows.length === 0) {
      throw new Error('INVALID_RELATIONSHIP');
    }

    const failed_at = data.status === 'FAILED' ? new Date().toISOString() : null;

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
      data.merchantId, 
      data.customerId, 
      data.razorpayPaymentId, 
      data.amount, 
      data.currency, 
      data.status, 
      data.failureReason, 
      data.attemptCount,
      failed_at
    ];

    const dbResult = await pool.query(query, values);
    return dbResult.rows[0];
  }

  static async getPaymentsByMerchant(merchant_id: string, status?: string) {
    let query = `
      SELECT 
        p.id, 
        p.merchant_id as "merchantId", 
        p.customer_id as "customerId", 
        p.razorpay_payment_id as "razorpayPaymentId", 
        p.amount, 
        p.currency, 
        p.status, 
        p.failure_reason as "failureReason", 
        p.attempt_count as "attemptCount",
        p.created_at as "createdAt", 
        p.failed_at as "failedAt", 
        p.recovered_at as "recoveredAt",
        c.name as "customerName",
        rc.id as "recoveryCaseId"
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN recovery_cases rc ON p.id = rc.payment_id
      WHERE p.merchant_id = $1
    `;
    
    const values: any[] = [merchant_id];

    if (status) {
      const allowedStatuses = ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED'];
      const upperStatus = status.toUpperCase();
      
      if (!allowedStatuses.includes(upperStatus)) {
        throw new Error('INVALID_STATUS');
      }
      
      values.push(upperStatus);
      query += ` AND p.status = $2`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const dbResult = await pool.query(query, values);
    return dbResult.rows;
  }

  static async getPaymentById(paymentId: string) {
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
    
    const dbResult = await pool.query(query, [paymentId]);
    return dbResult.rows.length > 0 ? dbResult.rows[0] : null;
  }
}

