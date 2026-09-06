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

      // Validate Razorpay capture data before mutating local payment state
      if (
        parseInt(payment.amount) !== parseInt(String(data.amount)) ||
        payment.currency !== data.currency
      ) {
        throw new Error('Captured payment data mismatch');
      }

      // 2. Update Payment to CAPTURED (if in a valid prior state)
      const paymentUpdateRes = await client.query(
        `
          UPDATE payments
          SET status = 'CAPTURED'
          WHERE id = $1
            AND status IN ('FAILED', 'AUTHORIZED', 'CREATED')
        `,
        [payment.id]
      );

      if (paymentUpdateRes.rowCount === 0) {
        if (payment.status === 'CAPTURED') {
          // Duplicate payment.captured webhook — safe idempotent no-op.
        } else {
          throw new Error(
            `Invalid payment state transition: ${payment.status} -> CAPTURED`
          );
        }
      }

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

      // 6. Case -> RECOVERED
      const caseUpdateRes = await client.query(
        `
          UPDATE recovery_cases
          SET
            status = 'RECOVERED',
            recovered_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
            AND status IN (
              'OPEN',
              'ANALYZING',
              'ACTION_PENDING',
              'IN_PROGRESS',
              'ESCALATED'
            )
        `,
        [recoveryCase.id]
      );

      if (caseUpdateRes.rowCount === 0) {
        if (recoveryCase.status === 'RECOVERED') {
          // Duplicate payment.captured webhook — safe idempotent no-op.
          await client.query('COMMIT');
          return;
        } else {
          throw new Error(
            `Invalid recovery case transition: ${recoveryCase.status} -> RECOVERED`
          );
        }
      }

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

  /**
   * Handle a payment captured via a Nolan Recovery Link.
   * Uses recovery_case_id from payment link notes to directly mark the case as RECOVERED.
   */
  static async handleRecoveryLinkPayment(data: {
    merchantId: string;
    recoveryCaseId: string;
    recoveryActionId?: string;
    razorpayPaymentId: string;
    amount: number | string;
    currency: string;
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Check if recovery case exists and is not already recovered
      const caseRes = await client.query(
        'SELECT * FROM recovery_cases WHERE id = $1 AND merchant_id = $2',
        [data.recoveryCaseId, data.merchantId]
      );

      if (caseRes.rows.length === 0) {
        console.warn(`[PaymentRecovery] Recovery case ${data.recoveryCaseId} not found.`);
        await client.query('ROLLBACK');
        return;
      }

      const recoveryCase = caseRes.rows[0];

      if (recoveryCase.status === 'RECOVERED') {
        // Already recovered — idempotent
        await client.query('COMMIT');
        return;
      }

      // 2. Mark case as RECOVERED
      await client.query(
        `UPDATE recovery_cases
         SET status = 'RECOVERED', recovered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status IN ('OPEN', 'ANALYZING', 'ACTION_PENDING', 'IN_PROGRESS', 'ESCALATED')`,
        [data.recoveryCaseId]
      );

      // 3. Mark recovery actions as SUCCESS
      await client.query(
        `UPDATE recovery_actions SET status = 'SUCCESS', completed_at = CURRENT_TIMESTAMP
         WHERE recovery_case_id = $1 AND status NOT IN ('SUCCESS', 'FAILED', 'CANCELLED')`,
        [data.recoveryCaseId]
      );

      // 4. Update original payment status
      await client.query(
        `UPDATE payments SET status = 'CAPTURED'
         WHERE id = $1 AND status != 'CAPTURED'`,
        [recoveryCase.payment_id]
      );

      // 5. Audit event
      await client.query(`
        INSERT INTO audit_events (
          merchant_id, recovery_case_id, entity_type, entity_id, event_type, actor, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        data.merchantId,
        data.recoveryCaseId,
        'RECOVERY_CASE',
        data.recoveryCaseId,
        'PAYMENT_RECOVERED',
        'SYSTEM',
        {
          razorpayPaymentId: data.razorpayPaymentId,
          amount: data.amount,
          currency: data.currency,
          source: 'recovery_link',
          recoveryActionId: data.recoveryActionId
        }
      ]);

      await client.query('COMMIT');

      console.log(`[PaymentRecovery] Case ${data.recoveryCaseId} marked as RECOVERED via recovery link.`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
