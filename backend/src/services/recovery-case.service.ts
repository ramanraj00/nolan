import { pool } from '../db';

export class RecoveryCaseService {
  static async createRecoveryCase(data: { merchantId: string; paymentId: string }) {
    const paymentCheckQuery = `
      SELECT id, merchant_id, status, amount 
      FROM payments 
      WHERE id = $1 AND merchant_id = $2
    `;
    const paymentCheck = await pool.query(paymentCheckQuery, [data.paymentId, data.merchantId]);

    if (paymentCheck.rows.length === 0) {
      throw new Error('PAYMENT_NOT_FOUND');
    }

    const payment = paymentCheck.rows[0];

    if (payment.status !== 'FAILED') {
      throw new Error('PAYMENT_NOT_FAILED');
    }

    const initialStatus = 'OPEN';
    const initialProbability = 0.00;

    const insertQuery = `
      INSERT INTO recovery_cases (
        merchant_id, 
        payment_id, 
        revenue_at_risk, 
        recovery_probability, 
        diagnosis, 
        status, 
        recovered_at, 
        closed_at
      )
      VALUES ($1, $2, $3, $4, NULL, $5, NULL, NULL)
      RETURNING 
        id, 
        merchant_id as "merchantId", 
        payment_id as "paymentId", 
        revenue_at_risk as "revenueAtRisk", 
        recovery_probability as "recoveryProbability", 
        diagnosis, 
        status, 
        created_at as "createdAt", 
        updated_at as "updatedAt", 
        recovered_at as "recoveredAt", 
        closed_at as "closedAt";
    `;
    const values = [
      data.merchantId, 
      data.paymentId, 
      payment.amount, 
      initialProbability, 
      initialStatus
    ];

    try {
      const dbResult = await pool.query(insertQuery, values);
      return dbResult.rows[0];
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as any).code === '23505'
      ) {
        throw new Error('RECOVERY_CASE_ALREADY_EXISTS');
      }

      throw error;
    }
  }

  static async getRecoveryCasesByMerchant(merchant_id: string, status?: string) {
    let query = `
      SELECT 
        rc.id, 
        rc.merchant_id as "merchantId", 
        rc.payment_id as "paymentId", 
        rc.revenue_at_risk as "revenueAtRisk", 
        rc.recovery_probability as "recoveryProbability", 
        rc.diagnosis, 
        rc.status, 
        rc.created_at as "createdAt", 
        rc.updated_at as "updatedAt", 
        rc.recovered_at as "recoveredAt", 
        rc.closed_at as "closedAt",
        c.name as "customerName",
        json_build_object(
          'id', p.razorpay_payment_id,
          'amount', p.amount,
          'currency', p.currency,
          'failureReason', p.failure_reason,
          'gateway', p.gateway,
          'method', p.payment_method
        ) as payment
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      JOIN customers c ON c.id = p.customer_id
      WHERE rc.merchant_id = $1
    `;
    
    const values: any[] = [merchant_id];

    if (status) {
      const allowedStatuses = [
        'OPEN', 'ANALYZING', 'ACTION_PENDING', 'IN_PROGRESS', 
        'RECOVERED', 'ESCALATED', 'STOPPED', 'UNRECOVERABLE'
      ];
      const upperStatus = status.toUpperCase();
      
      if (upperStatus !== 'ALL') {
        if (!allowedStatuses.includes(upperStatus)) {
          throw new Error('INVALID_STATUS');
        }
        values.push(upperStatus);
        query += ` AND rc.status = $2`;
      }
    }

    query += ` ORDER BY rc.created_at DESC;`;

    const dbResult = await pool.query(query, values);
    return dbResult.rows;
  }

  static async getRecoveryCaseById(caseId: string, merchantId: string) {
    const query = `
      SELECT 
        rc.id, 
        rc.merchant_id as "merchantId", 
        rc.payment_id as "paymentId", 
        rc.revenue_at_risk as "revenueAtRisk", 
        rc.recovery_probability as "recoveryProbability", 
        rc.diagnosis, 
        rc.status, 
        rc.created_at as "createdAt", 
        rc.updated_at as "updatedAt", 
        rc.recovered_at as "recoveredAt", 
        rc.closed_at as "closedAt",
        c.name as "customerName",
        json_build_object(
          'id', p.razorpay_payment_id,
          'amount', p.amount,
          'currency', p.currency,
          'failureReason', p.failure_reason,
          'gateway', p.gateway,
          'method', p.payment_method
        ) as payment,
        (
          SELECT json_build_object(
            'id', ad.id,
            'diagnosis', ad.diagnosis,
            'reasoning', ad.reasoning,
            'recoveryProbability', ad.recovery_probability,
            'recommendedAction', ad.recommended_action,
            'confidence', ad.confidence,
            'createdAt', ad.created_at
          )
          FROM agent_decisions ad WHERE ad.recovery_case_id = rc.id ORDER BY ad.created_at DESC LIMIT 1
        ) as "agentDecision",
        (
          SELECT json_build_object(
            'id', pd.id,
            'rulesEvaluated', pd.rule,
            'passed', pd.allowed,
            'reason', pd.reason,
            'createdAt', pd.created_at
          )
          FROM policy_decisions pd WHERE pd.recovery_case_id = rc.id ORDER BY pd.created_at DESC LIMIT 1
        ) as "policyDecision",
        (
          SELECT json_build_object(
            'id', ra.id,
            'type', ra.type,
            'status', ra.status,
            'result', ra.result,
            'createdAt', ra.created_at
          )
          FROM recovery_actions ra WHERE ra.recovery_case_id = rc.id ORDER BY ra.created_at DESC LIMIT 1
        ) as "recoveryAction"
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      JOIN customers c ON c.id = p.customer_id
      WHERE rc.id = $1 AND rc.merchant_id = $2;
    `;
    
    const dbResult = await pool.query(query, [caseId, merchantId]);
    return dbResult.rows.length > 0 ? dbResult.rows[0] : null;
  }
  static async updateCaseStatus(caseId: string, merchantId: string, status: string) {
    const validTransitions: Record<string, string[]> = {
      OPEN: ['ANALYZING', 'ACTION_PENDING', 'ESCALATED', 'STOPPED', 'UNRECOVERABLE'],
      ANALYZING: ['ACTION_PENDING', 'IN_PROGRESS', 'ESCALATED', 'STOPPED', 'UNRECOVERABLE'],
      ACTION_PENDING: ['IN_PROGRESS', 'ESCALATED', 'STOPPED', 'UNRECOVERABLE'],
      IN_PROGRESS: ['RECOVERED', 'ESCALATED', 'STOPPED', 'UNRECOVERABLE'],
      ESCALATED: ['IN_PROGRESS', 'RECOVERED', 'STOPPED', 'UNRECOVERABLE'],
      RECOVERED: [],
      STOPPED: [],
      UNRECOVERABLE: []
    };

    const currentStatuses = Object.entries(validTransitions)
      .filter(([, allowedStatuses]) => allowedStatuses.includes(status))
      .map(([currentStatus]) => currentStatus);

    const query = `
      UPDATE recovery_cases
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
        AND merchant_id = $3
        AND status = ANY($4::text[])
      RETURNING *;
    `;

    const dbResult = await pool.query(query, [
      status,
      caseId,
      merchantId,
      currentStatuses
    ]);

    if (dbResult.rowCount === 0) {
      const currentResult = await pool.query(
        `
          SELECT status
          FROM recovery_cases
          WHERE id = $1 AND merchant_id = $2
        `,
        [caseId, merchantId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('RECOVERY_CASE_NOT_FOUND');
      }

      throw new Error(
        `INVALID_RECOVERY_CASE_TRANSITION: ${currentResult.rows[0].status} -> ${status}`
      );
    }

    return dbResult.rows[0];
  }

  static async getRecoveryCaseByPaymentId(
    paymentId: string,
    merchantId: string
  ) {
    const query = `
      SELECT *
      FROM recovery_cases
      WHERE payment_id = $1
        AND merchant_id = $2
      LIMIT 1
    `;

    const result = await pool.query(query, [
      paymentId,
      merchantId
    ]);

    return result.rows[0] || null;
  }
}
