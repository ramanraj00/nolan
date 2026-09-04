import { pool } from '../db';

export class RecoveryActionService {
  static async createRecoveryAction(data: { merchantId: string; recoveryCaseId: string; policyDecisionId: string; }) {
    const validationQuery = `
      SELECT
        pd.allowed,
        pd.action,
        pd.requires_approval
      FROM policy_decisions pd
      JOIN recovery_cases rc ON rc.id = pd.recovery_case_id
      WHERE pd.id = $1 AND rc.id = $2 AND rc.merchant_id = $3
    `;
    const checkResult = await pool.query(validationQuery, [data.policyDecisionId, data.recoveryCaseId, data.merchantId]);

    if (checkResult.rows.length === 0) {
      throw new Error('INVALID_RELATIONSHIP');
    }

    const policy = checkResult.rows[0];

    if (policy.allowed === false) {
      throw new Error('NOT_ALLOWED');
    }

    const initialStatus = policy.requires_approval ? 'PENDING_APPROVAL' : 'PENDING';

    const insertQuery = `
      INSERT INTO recovery_actions (
        recovery_case_id,
        policy_decision_id,
        type,
        status
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        recovery_case_id as "recoveryCaseId",
        policy_decision_id as "policyDecisionId",
        type,
        status,
        scheduled_at as "scheduledAt",
        executed_at as "executedAt",
        completed_at as "completedAt",
        result,
        failure_reason as "failureReason",
        metadata,
        created_at as "createdAt";
    `;
    const values = [
      data.recoveryCaseId,
      data.policyDecisionId,
      policy.action,
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
        (error as { code?: string }).code === '23505'
      ) {
        throw new Error('RECOVERY_ACTION_ALREADY_EXISTS');
      }

      throw error;
    }
  }

  static async getRecoveryActions(merchantId: string, recoveryCaseId?: string, type?: string, status?: string) {
    let query = `
      SELECT
        ra.id,
        ra.recovery_case_id as "recoveryCaseId",
        ra.policy_decision_id as "policyDecisionId",
        ra.type,
        ra.status,
        ra.scheduled_at as "scheduledAt",
        ra.executed_at as "executedAt",
        completed_at as "completedAt",
        ra.result,
        ra.failure_reason as "failureReason",
        ra.metadata,
        ra.created_at as "createdAt"
      FROM recovery_actions ra
      JOIN recovery_cases rc ON rc.id = ra.recovery_case_id
      WHERE rc.merchant_id = $1
    `;

    const values: any[] = [merchantId];
    let paramIndex = 2;

    if (recoveryCaseId) {
      values.push(recoveryCaseId);
      query += ` AND ra.recovery_case_id = $${paramIndex++}`;
    }

    if (type) {
      values.push(type.toUpperCase());
      query += ` AND ra.type = $${paramIndex++}`;
    }

    if (status) {
      values.push(status.toUpperCase());
      query += ` AND ra.status = $${paramIndex++}`;
    }

    query += ` ORDER BY ra.created_at DESC;`;

    const dbResult = await pool.query(query, values);
    return dbResult.rows;
  }

  static async getRecoveryActionById(actionId: string, merchantId: string) {
    const query = `
      SELECT
        ra.id,
        ra.recovery_case_id as "recoveryCaseId",
        ra.policy_decision_id as "policyDecisionId",
        ra.type,
        ra.status,
        ra.scheduled_at as "scheduledAt",
        ra.executed_at as "executedAt",
        ra.completed_at as "completedAt",
        ra.result,
        ra.failure_reason as "failureReason",
        ra.metadata,
        ra.created_at as "createdAt"
      FROM recovery_actions ra
      JOIN recovery_cases rc
        ON rc.id = ra.recovery_case_id
      WHERE ra.id = $1
        AND rc.merchant_id = $2;
    `;

    const dbResult = await pool.query(query, [actionId, merchantId]);
    return dbResult.rows.length > 0 ? dbResult.rows[0] : null;
  }

  static async updateRecoveryActionStatus(
    actionId: string,
    merchantId: string,
    data: {
      status: string;
      result?: string;
      failureReason?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const validTransitions: Record<string, string[]> = {
      PENDING_APPROVAL: ['PENDING', 'CANCELLED'],
      PENDING: ['SCHEDULED', 'EXECUTING', 'CANCELLED'],
      SCHEDULED: ['EXECUTING', 'CANCELLED'],
      EXECUTING: ['SUCCESS', 'FAILED'],
      SUCCESS: [],
      FAILED: [],
      CANCELLED: []
    };

    const setClauses: string[] = ['status = $3'];
    const values: unknown[] = [actionId, merchantId, data.status];
    let paramIndex = 4;

    if (data.status === 'SCHEDULED') {
      setClauses.push('scheduled_at = CURRENT_TIMESTAMP');
    } else if (data.status === 'EXECUTING') {
      setClauses.push('executed_at = CURRENT_TIMESTAMP');
    } else if (
      data.status === 'SUCCESS' ||
      data.status === 'FAILED' ||
      data.status === 'CANCELLED'
    ) {
      setClauses.push('completed_at = CURRENT_TIMESTAMP');
    }

    if (data.result !== undefined) {
      setClauses.push(`result = $${paramIndex++}`);
      values.push(data.result);
    }

    if (data.failureReason !== undefined) {
      setClauses.push(`failure_reason = $${paramIndex++}`);
      values.push(data.failureReason);
    }

    if (data.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(data.metadata);
    }

    const currentStatuses = Object.entries(validTransitions)
      .filter(([, nextStates]) => nextStates.includes(data.status))
      .map(([currentStatus]) => currentStatus);

    if (currentStatuses.length === 0) {
      throw new Error(`INVALID_TRANSITION_TO_${data.status}`);
    }

    const updateQuery = `
      UPDATE recovery_actions
      SET ${setClauses.join(', ')}
      WHERE id = $1
        AND EXISTS (
          SELECT 1
          FROM recovery_cases rc
          WHERE rc.id = recovery_actions.recovery_case_id
            AND rc.merchant_id = $2
        )
        AND status = ANY($${paramIndex}::text[])
      RETURNING
        id,
        recovery_case_id as "recoveryCaseId",
        policy_decision_id as "policyDecisionId",
        type,
        status,
        scheduled_at as "scheduledAt",
        executed_at as "executedAt",
        completed_at as "completedAt",
        result,
        failure_reason as "failureReason",
        metadata,
        created_at as "createdAt";
    `;

    values.push(currentStatuses);

    const dbResult = await pool.query(updateQuery, values);

    if (dbResult.rows.length === 0) {
      const existsResult = await pool.query(
        `
        SELECT ra.status
        FROM recovery_actions ra
        JOIN recovery_cases rc ON rc.id = ra.recovery_case_id
        WHERE ra.id = $1 AND rc.merchant_id = $2
        `,
        [actionId, merchantId]
      );

      if (existsResult.rows.length === 0) {
        throw new Error('NOT_FOUND');
      }

      throw new Error(
        `INVALID_TRANSITION_${existsResult.rows[0].status}`
      );
    }

    return dbResult.rows[0];
  }

  static async claimForExecution(
    actionId: string,
    merchantId: string
  ) {
    const query = `
      UPDATE recovery_actions
      SET
        status = 'EXECUTING',
        executed_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND status IN ('PENDING', 'SCHEDULED')
        AND EXISTS (
          SELECT 1
          FROM recovery_cases rc
          WHERE rc.id = recovery_actions.recovery_case_id
            AND rc.merchant_id = $2
        )
      RETURNING
        id,
        recovery_case_id as "recoveryCaseId",
        policy_decision_id as "policyDecisionId",
        type,
        status,
        scheduled_at as "scheduledAt",
        executed_at as "executedAt",
        completed_at as "completedAt",
        result,
        failure_reason as "failureReason",
        metadata,
        created_at as "createdAt";
    `;

    const result = await pool.query(query, [actionId, merchantId]);

    if (result.rowCount === 0) {
      return null;
    }

    return result.rows[0];
  }
}
