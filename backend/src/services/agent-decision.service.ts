import { pool } from '../db';

export class AgentDecisionService {
  static async createAgentDecision(data: {
    merchantId: string;
    recoveryCaseId: string;
    diagnosis: string;
    reasoning: string;
    recoveryProbability: number;
    recommendedAction: string;
    recommendedDelay: number;
    confidence: number;
    model: string;
  }) {
    const caseCheckQuery = `
      SELECT id, status 
      FROM recovery_cases 
      WHERE id = $1 AND merchant_id = $2
    `;
    const caseCheck = await pool.query(caseCheckQuery, [data.recoveryCaseId, data.merchantId]);

    if (caseCheck.rows.length === 0) {
      throw new Error('CASE_NOT_FOUND');
    }

    const recoveryCase = caseCheck.rows[0];

    const invalidStatuses = ['RECOVERED', 'STOPPED', 'UNRECOVERABLE'];
    if (invalidStatuses.includes(recoveryCase.status)) {
      throw new Error(`INVALID_CASE_STATUS:${recoveryCase.status}`);
    }

    const allowedActions = [
      'RETRY_PAYMENT',
      'REQUEST_PAYMENT_METHOD_UPDATE',
      'SEND_PAYMENT_REMINDER',
      'SEND_CHECKOUT_RECOVERY',
      'ESCALATE_HUMAN',
      'STOP_RECOVERY'
    ];

    if (!allowedActions.includes(data.recommendedAction)) {
      throw new Error('INVALID_AI_RECOMMENDATION');
    }

    const insertQuery = `
      INSERT INTO agent_decisions (
        recovery_case_id,
        diagnosis,
        reasoning,
        recovery_probability,
        recommended_action,
        recommended_delay,
        confidence,
        model
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id, 
        recovery_case_id as "recoveryCaseId",
        diagnosis,
        reasoning,
        recovery_probability as "recoveryProbability",
        recommended_action as "recommendedAction",
        recommended_delay as "recommendedDelay",
        confidence,
        model,
        created_at as "createdAt";
    `;
    const values = [
      data.recoveryCaseId,
      data.diagnosis,
      data.reasoning,
      data.recoveryProbability,
      data.recommendedAction,
      data.recommendedDelay,
      data.confidence,
      data.model
    ];

    const dbResult = await pool.query(insertQuery, values);
    return dbResult.rows[0];
  }

  static async getAgentDecisions(merchantId: string, recoveryCaseId?: string) {
    let query = `
      SELECT 
        ad.id, 
        ad.recovery_case_id as "recoveryCaseId",
        ad.diagnosis,
        ad.reasoning,
        ad.recovery_probability as "recoveryProbability",
        ad.recommended_action as "recommendedAction",
        ad.recommended_delay as "recommendedDelay",
        ad.confidence,
        ad.model,
        ad.created_at as "createdAt"
      FROM agent_decisions ad
      JOIN recovery_cases rc ON rc.id = ad.recovery_case_id
      WHERE rc.merchant_id = $1
    `;
    
    const values: any[] = [merchantId];

    if (recoveryCaseId) {
      values.push(recoveryCaseId);
      query += ` AND ad.recovery_case_id = $2`;
    }

    query += ` ORDER BY ad.created_at DESC;`;
    
    const dbResult = await pool.query(query, values);
    return dbResult.rows;
  }

  static async getAgentDecisionById(decisionId: string) {
    const query = `
      SELECT 
        id, 
        recovery_case_id as "recoveryCaseId",
        diagnosis,
        reasoning,
        recovery_probability as "recoveryProbability",
        recommended_action as "recommendedAction",
        recommended_delay as "recommendedDelay",
        confidence,
        model,
        created_at as "createdAt"
      FROM agent_decisions
      WHERE id = $1;
    `;
    
    const dbResult = await pool.query(query, [decisionId]);
    return dbResult.rows.length > 0 ? dbResult.rows[0] : null;
  }
}
