import express, { Request, Response } from 'express';
import { pool } from '../db';
import { z } from 'zod';

const router = express.Router();

// Client provides strictly IDs. The server decides what action gets executed based on Policy.
const createRecoveryActionSchema = z.object({
  merchantId: z.string().uuid('Invalid Merchant ID format'),
  recoveryCaseId: z.string().uuid('Invalid Recovery Case ID format'),
  policyDecisionId: z.string().uuid('Invalid Policy Decision ID format')
});

// ==========================================
// TRIGGER RECOVERY ACTION (POST Request)
// ==========================================
// Purpose: Puts an approved action into the execution queue (PENDING state).
// Flow: Validate IDs -> Ensure Policy allowed the action -> Create Action.
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate incoming data
    const validationResult = createRecoveryActionSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const { merchantId, recoveryCaseId, policyDecisionId } = validationResult.data;

    // 2. Strict Cross-Table Isolation Check
    // We traverse from policy_decisions -> recovery_cases to ensure full ownership.
    const validationQuery = `
      SELECT 
        pd.allowed, 
        pd.action,
        pd.requires_approval
      FROM policy_decisions pd
      JOIN recovery_cases rc ON rc.id = pd.recovery_case_id
      WHERE pd.id = $1 AND rc.id = $2 AND rc.merchant_id = $3
    `;
    const checkResult = await pool.query(validationQuery, [policyDecisionId, recoveryCaseId, merchantId]);

    if (checkResult.rows.length === 0) {
      res.status(404).json({ 
        error: 'Invalid relationship. Policy Decision or Case not found, or Merchant does not own this data.' 
      });
      return;
    }

    const policy = checkResult.rows[0];

    // 3. ENFORCE POLICY: Block creation if policy denied it
    if (policy.allowed === false) {
      res.status(403).json({
        error: 'Recovery action is not allowed by policy'
      });
      return;
    }

    // 4. Create Recovery Action
    // Action is created in a 'PENDING' state (Queue/Scheduler will pick it up later).
    // If it requires human approval, we put it in a specific 'PENDING_APPROVAL' state.
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
      recoveryCaseId,
      policyDecisionId,
      policy.action, // Trusting the policy engine's action strictly
      initialStatus
    ];

    const dbResult = await pool.query(insertQuery, values);

    // 5. Return the created action
    res.status(201).json({
      message: 'Recovery action queued successfully',
      data: dbResult.rows[0]
    });

  } catch (error: any) {
    console.error('Error creating recovery action:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }
    
    // Catch duplicate action mapping if you ever put a unique constraint (optional)
    if (error.code === '23505') {
       res.status(409).json({ error: 'Action already exists' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while scheduling recovery action' });
  }
});

// ==========================================
// VIEW RECOVERY ACTIONS (GET Request)
// ==========================================
// Example: GET /recovery-actions?merchant_id=abc&status=SUCCESS&type=RETRY_PAYMENT
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = req.query.merchant_id as string;
    const recoveryCaseId = req.query.recovery_case_id as string;
    const type = req.query.type as string;
    const status = req.query.status as string;

    if (!merchantId) {
      res.status(400).json({ error: 'merchant_id is a required query parameter' });
      return;
    }

    // Strict ENUM validation for filters
    const validTypes = [
      'RETRY_PAYMENT', 'REQUEST_PAYMENT_METHOD_UPDATE', 'SEND_CHECKOUT_RECOVERY', 
      'RETRY_SUBSCRIPTION', 'SEND_PAYMENT_REMINDER', 'ESCALATE_HUMAN', 'STOP_RECOVERY'
    ];
    
    const validStatuses = [
      'PENDING_APPROVAL', 'PENDING', 'SCHEDULED', 'EXECUTING', 'SUCCESS', 'FAILED', 'CANCELLED'
    ];

    if (type && !validTypes.includes(type.toUpperCase())) {
      res.status(400).json({ error: 'Invalid type parameter' });
      return;
    }

    if (status && !validStatuses.includes(status.toUpperCase())) {
      res.status(400).json({ error: 'Invalid status parameter' });
      return;
    }

    let query = `
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

    res.status(200).json({ data: dbResult.rows });

  } catch (error: any) {
    console.error('Error fetching recovery actions:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// VIEW A SPECIFIC RECOVERY ACTION (GET Request)
// ==========================================
// Purpose: Fetch a single execution record by its UUID.
// Note: Auth isolation will be added via middleware later.
// Example: GET /recovery-actions/action-uuid
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const actionId = String(req.params.id);

    const query = `
      SELECT 
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
        created_at as "createdAt"
      FROM recovery_actions
      WHERE id = $1;
    `;
    
    const dbResult = await pool.query(query, [actionId]);

    if (dbResult.rows.length === 0) {
       res.status(404).json({ error: 'Recovery action not found' });
       return;
    }

    res.status(200).json({ data: dbResult.rows[0] });
  } catch (error: any) {
    console.error('Error fetching specific recovery action:', error);
    
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Recovery Action ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching the recovery action' });
  }
});

// ==========================================
// UPDATE RECOVERY ACTION STATUS (PATCH Request)
// ==========================================
// Purpose: Used by the Execution Engine / Worker (or Admin Dashboard) 
// to transition the state of an action (e.g., PENDING -> EXECUTING -> SUCCESS).
const updateRecoveryActionSchema = z.object({
  status: z.enum([
    'PENDING', 'SCHEDULED', 'EXECUTING', 'SUCCESS', 'FAILED', 'CANCELLED'
  ]),
  result: z.string().optional(),
  failureReason: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const actionId = String(req.params.id);
    const validationResult = updateRecoveryActionSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid update data',
        details: validationResult.error.format(),
      });
      return;
    }

    const { status, result, failureReason, metadata } = validationResult.data;

    // 1. Fetch current status to enforce State Machine transitions
    const fetchQuery = `SELECT status FROM recovery_actions WHERE id = $1`;
    const fetchResult = await pool.query(fetchQuery, [actionId]);
    
    if (fetchResult.rows.length === 0) {
      res.status(404).json({ error: 'Recovery action not found' });
      return;
    }
    
    const currentStatus = fetchResult.rows[0].status;

    // 2. State Machine Rules
    const validTransitions: Record<string, string[]> = {
      'PENDING_APPROVAL': ['PENDING', 'CANCELLED'],
      'PENDING': ['SCHEDULED', 'EXECUTING', 'CANCELLED'],
      'SCHEDULED': ['EXECUTING', 'CANCELLED'],
      'EXECUTING': ['SUCCESS', 'FAILED'],
      'SUCCESS': [],   // Terminal State
      'FAILED': [],    // Terminal State
      'CANCELLED': []  // Terminal State
    };

    const allowedNextStates = validTransitions[currentStatus] || [];
    
    if (!allowedNextStates.includes(status)) {
      res.status(400).json({ 
        error: `Invalid state transition. Cannot move from ${currentStatus} to ${status}.` 
      });
      return;
    }

    // Build dynamic update query
    const setClauses: string[] = ['status = $2'];
    const values: any[] = [actionId, status];
    let paramIndex = 3;

    // Dynamically manage timestamps based on status
    if (status === 'SCHEDULED') {
      setClauses.push(`scheduled_at = CURRENT_TIMESTAMP`);
    } else if (status === 'EXECUTING') {
      setClauses.push(`executed_at = CURRENT_TIMESTAMP`);
    } else if (status === 'SUCCESS' || status === 'FAILED' || status === 'CANCELLED') {
      setClauses.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    if (result !== undefined) {
      setClauses.push(`result = $${paramIndex++}`);
      values.push(result);
    }
    if (failureReason !== undefined) {
      setClauses.push(`failure_reason = $${paramIndex++}`);
      values.push(failureReason);
    }
    if (metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(metadata); // pg handles JSONB automatically
    }

    const updateQuery = `
      UPDATE recovery_actions 
      SET ${setClauses.join(', ')}
      WHERE id = $1
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

    const dbResult = await pool.query(updateQuery, values);

    if (dbResult.rows.length === 0) {
      res.status(404).json({ error: 'Recovery action not found' });
      return;
    }

    res.status(200).json({
      message: 'Recovery action status updated successfully',
      data: dbResult.rows[0]
    });

  } catch (error: any) {
    console.error('Error updating recovery action:', error);
    
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Recovery Action ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while updating the recovery action' });
  }
});

export default router;
