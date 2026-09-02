import { pool } from '../db';

export class PolicyDecisionService {
  static async createPolicyDecision(data: {
    merchantId: string;
    recoveryCaseId: string;
    agentDecisionId: string;
  }) {
    const validationQuery = `
      SELECT 
        rc.status as case_status,
        ad.recommended_action,
        ad.confidence,
        p.attempt_count
      FROM agent_decisions ad
      JOIN recovery_cases rc ON rc.id = ad.recovery_case_id
      JOIN payments p ON p.id = rc.payment_id
      WHERE ad.id = $1 AND rc.id = $2 AND rc.merchant_id = $3
    `;
    const checkResult = await pool.query(validationQuery, [data.agentDecisionId, data.recoveryCaseId, data.merchantId]);

    if (checkResult.rows.length === 0) {
      throw new Error('RELATIONSHIP_NOT_FOUND');
    }

    const context = checkResult.rows[0];

    let allowed = true;
    let reason = 'Action passed all policy checks';
    let rule = 'default_allow';
    let requiresApproval = false;

    const MAX_ATTEMPTS = 3;
    const terminalStatuses = ['RECOVERED', 'STOPPED', 'UNRECOVERABLE'];

    if (context.attempt_count >= MAX_ATTEMPTS) {
      allowed = false;
      reason = `Maximum payment retry limit (${MAX_ATTEMPTS}) reached. Risk limits prevent further automation.`;
      rule = 'max_retry_limit_deny';
    }
    else if (terminalStatuses.includes(context.case_status)) {
      allowed = false;
      reason = 'Cannot execute actions on a case in a terminal state';
      rule = 'terminal_state_deny';
    }
    else if (context.confidence < 50) {
      allowed = false;
      reason = 'AI confidence is below the safe threshold of 50%';
      rule = 'low_confidence_deny';
    }
    else if (context.recommended_action === 'ESCALATE_HUMAN') {
      allowed = true; 
      requiresApproval = true;
      reason = 'Action is permitted only through human approval.';
      rule = 'human_escalation_review';
    }

    const insertQuery = `
      INSERT INTO policy_decisions (
        recovery_case_id,
        agent_decision_id,
        action,
        allowed,
        reason,
        rule,
        requires_approval
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, 
        recovery_case_id as "recoveryCaseId",
        agent_decision_id as "agentDecisionId",
        action,
        allowed,
        reason,
        rule,
        requires_approval as "requiresApproval",
        created_at as "createdAt";
    `;
    const values = [
      data.recoveryCaseId,
      data.agentDecisionId,
      context.recommended_action,
      allowed,
      reason,
      rule,
      requiresApproval
    ];

    const dbResult = await pool.query(insertQuery, values);
    return dbResult.rows[0];
  }

  static async getPolicyDecisions(merchantId: string, recoveryCaseId?: string, agentDecisionId?: string, allowedParam?: boolean) {
    let query = `
      SELECT 
        pd.id, 
        pd.recovery_case_id as "recoveryCaseId",
        pd.agent_decision_id as "agentDecisionId",
        pd.action,
        pd.allowed,
        pd.reason,
        pd.rule,
        pd.requires_approval as "requiresApproval",
        pd.created_at as "createdAt"
      FROM policy_decisions pd
      JOIN recovery_cases rc ON rc.id = pd.recovery_case_id
      WHERE rc.merchant_id = $1
    `;
    
    const values: any[] = [merchantId];
    let paramIndex = 2;

    if (recoveryCaseId) {
      values.push(recoveryCaseId);
      query += ` AND pd.recovery_case_id = $${paramIndex++}`;
    }
    
    if (agentDecisionId) {
      values.push(agentDecisionId);
      query += ` AND pd.agent_decision_id = $${paramIndex++}`;
    }

    if (allowedParam !== undefined) {
      values.push(allowedParam);
      query += ` AND pd.allowed = $${paramIndex++}`;
    }

    query += ` ORDER BY pd.created_at DESC;`;
    
    const dbResult = await pool.query(query, values);
    return dbResult.rows;
  }

  static async getPolicyDecisionById(decisionId: string) {
    const query = `
      SELECT 
        id, 
        recovery_case_id as "recoveryCaseId",
        agent_decision_id as "agentDecisionId",
        action,
        allowed,
        reason,
        rule,
        requires_approval as "requiresApproval",
        created_at as "createdAt"
      FROM policy_decisions
      WHERE id = $1;
    `;
    
    const dbResult = await pool.query(query, [decisionId]);
    return dbResult.rows.length > 0 ? dbResult.rows[0] : null;
  }
}
