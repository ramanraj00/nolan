import express, { Request, Response } from 'express';
import { pool } from '../db';
import { z } from 'zod';

const router = express.Router();

// Client should ONLY send IDs. The Policy Engine computes the rest.
const createPolicyDecisionSchema = z.object({
  merchantId: z.string().uuid('Invalid Merchant ID format'),
  recoveryCaseId: z.string().uuid('Invalid Recovery Case ID format'),
  agentDecisionId: z.string().uuid('Invalid Agent Decision ID format')
});

// ==========================================
// RUN POLICY ENGINE (POST Request)
// ==========================================
// Purpose: Evaluate an AgentDecision against Merchant rules to decide if it's ALLOWED or DENIED.
// Note: This route simulates a rules engine evaluating the state.
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate payload
    const validationResult = createPolicyDecisionSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const { merchantId, recoveryCaseId, agentDecisionId } = validationResult.data;

    // 2. Multi-table validation and Isolation Check
    // We join agent_decisions, recovery_cases, and payments to ensure:
    // a) All data exists and is properly related.
    // b) AgentDecision belongs to RecoveryCase.
    // c) RecoveryCase belongs to Merchant.
    // d) We fetch rich context (like payment attempts) for the Policy Engine.
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
    const checkResult = await pool.query(validationQuery, [agentDecisionId, recoveryCaseId, merchantId]);

    if (checkResult.rows.length === 0) {
      res.status(404).json({ 
        error: 'Invalid relationship. Decision or Case not found, or Merchant does not own this data.' 
      });
      return;
    }

    const context = checkResult.rows[0];

    // 3. RUN POLICY ENGINE (Track 3 MVP Ruleset)
    let allowed = true;
    let reason = 'Action passed all policy checks';
    let rule = 'default_allow';
    let requiresApproval = false;

    const MAX_ATTEMPTS = 3;
    const terminalStatuses = ['RECOVERED', 'STOPPED', 'UNRECOVERABLE'];

    // Rule A: Max Attempt Limit Check
    if (context.attempt_count >= MAX_ATTEMPTS) {
      allowed = false;
      reason = `Maximum payment retry limit (${MAX_ATTEMPTS}) reached. Risk limits prevent further automation.`;
      rule = 'max_retry_limit_deny';
    }
    // Rule B: Terminal Case Check
    else if (terminalStatuses.includes(context.case_status)) {
      allowed = false;
      reason = 'Cannot execute actions on a case in a terminal state';
      rule = 'terminal_state_deny';
    }
    // Rule C: Low Confidence Check
    else if (context.confidence < 50) {
      allowed = false;
      reason = 'AI confidence is below the safe threshold of 50%';
      rule = 'low_confidence_deny';
    }
    // Rule D: Escalation requires manual approval
    else if (context.recommended_action === 'ESCALATE_HUMAN') {
      allowed = true; // Allowed to proceed to queue
      requiresApproval = true;
      reason = 'Action is permitted only through human approval.';
      rule = 'human_escalation_review';
    }

    // 4. Record the Policy Decision
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
      recoveryCaseId,
      agentDecisionId,
      context.recommended_action, // Copied from AgentDecision
      allowed,
      reason,
      rule,
      requiresApproval
    ];

    const dbResult = await pool.query(insertQuery, values);

    // 5. Return the evaluation
    res.status(201).json({
      message: 'Policy evaluation completed',
      data: dbResult.rows[0]
    });

  } catch (error: any) {
    console.error('Error evaluating policy:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while evaluating policy' });
  }
});

// ==========================================
// VIEW POLICY DECISIONS (GET Request)
// ==========================================
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = req.query.merchant_id as string;
    const recoveryCaseId = req.query.recovery_case_id as string;
    const agentDecisionId = req.query.agent_decision_id as string;
    const allowedParam = req.query.allowed as string;

    if (!merchantId) {
      res.status(400).json({ error: 'merchant_id is a required query parameter' });
      return;
    }

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

    if (allowedParam) {
      const normalizedAllowed = allowedParam.toLowerCase();
      if (normalizedAllowed !== 'true' && normalizedAllowed !== 'false') {
        res.status(400).json({ error: 'allowed parameter must be strictly true or false' });
        return;
      }
      
      const isAllowed = normalizedAllowed === 'true';
      values.push(isAllowed);
      query += ` AND pd.allowed = $${paramIndex++}`;
    }

    query += ` ORDER BY pd.created_at DESC;`;
    
    const dbResult = await pool.query(query, values);

    res.status(200).json({ data: dbResult.rows });

  } catch (error: any) {
    console.error('Error fetching policy decisions:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// VIEW SPECIFIC POLICY DECISION (GET Request)
// ==========================================
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const decisionId = String(req.params.id);

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

    if (dbResult.rows.length === 0) {
       res.status(404).json({ error: 'Policy decision not found' });
       return;
    }

    res.status(200).json({ data: dbResult.rows[0] });
  } catch (error: any) {
    console.error('Error fetching specific policy decision:', error);
    
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Policy Decision ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

