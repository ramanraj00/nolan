import { pool } from '../db';
import { AuditEventService } from './audit-event.service';

export class PaymentRecoveryService {
  static async handlePaymentCaptured(data: {
    merchantId: string;
    razorpayPaymentId: string;
    amount: number | string;
    currency: string;
  }) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Find local Payment
      const paymentRes = await client.query(
        'SELECT * FROM payments WHERE razorpay_payment_id = $1 AND merchant_id = $2',
        [data.razorpayPaymentId, data.merchantId]
      );

      if (paymentRes.rows.length === 0) {
        // No local payment found, nothing to recover
        await client.query('ROLLBACK');
        return;
      }

      const payment = paymentRes.rows[0];

      // 2. Update Payment to CAPTURED
      await client.query(
        'UPDATE payments SET status = $1 WHERE id = $2',
        ['CAPTURED', payment.id]
      );

      // 3. Find active RecoveryCase for that payment
      const caseRes = await client.query(
        'SELECT * FROM recovery_cases WHERE payment_id = $1 AND merchant_id = $2',
        [payment.id, data.merchantId]
      );

      if (caseRes.rows.length === 0) {
        // No recovery case -> normal payment update only
        await client.query('COMMIT');
        return;
      }

      const recoveryCase = caseRes.rows[0];

      // 5. Case already RECOVERED -> return (idempotent)
      if (recoveryCase.status === 'RECOVERED') {
        await client.query('COMMIT');
        return;
      }

      // Amount/Currency Verification
      if (
        parseInt(payment.amount) !== parseInt(String(data.amount)) ||
        payment.currency !== data.currency
      ) {
        throw new Error('Captured payment data mismatch');
      }

      // 6. Case -> RECOVERED
      await client.query(
        'UPDATE recovery_cases SET status = $1, recovered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['RECOVERED', recoveryCase.id]
      );

      // 7. Ensure related RecoveryAction is SUCCESS
      await client.query(
        'UPDATE recovery_actions SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE recovery_case_id = $2 AND status != $1',
        ['SUCCESS', recoveryCase.id]
      );

      // 8. PAYMENT_RECOVERED audit create inside transaction
      await client.query(`
        INSERT INTO audit_events (
          merchant_id, recovery_case_id, entity_type, entity_id, event_type, actor, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        data.merchantId,
        recoveryCase.id,
        'RECOVERY_CASE',
        recoveryCase.id,
        'PAYMENT_RECOVERED',
        'SYSTEM',
        { 
          razorpayPaymentId: data.razorpayPaymentId,
          amount: data.amount,
          currency: data.currency,
          source: 'payment.captured'
        }
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
