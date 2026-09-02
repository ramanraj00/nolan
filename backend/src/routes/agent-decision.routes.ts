import express, { Request, Response } from 'express';
import { pool } from '../db';
import { z } from 'zod';

const router = express.Router();

// Schema for synthetic/development creation of Agent Decisions
const createAgentDecisionSchema = z.object({
  merchantId: z.string().uuid('Invalid Merchant ID format'),
  recoveryCaseId: z.string().uuid('Invalid Recovery Case ID format'),
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  reasoning: z.string().min(1, 'Reasoning is required'),
  recoveryProbability: z.number().min(0).max(100),
  recommendedAction: z.enum([
    'RETRY_PAYMENT', 
    'REQUEST_PAYMENT_METHOD_UPDATE', 
    'SEND_CHECKOUT_RECOVERY', 
    'RETRY_SUBSCRIPTION', 
    'SEND_PAYMENT_REMINDER', 
    'ESCALATE_HUMAN', 
    'STOP_RECOVERY'
  ]),
  // Delay is strictly in minutes (e.g., 1440 for 24 hours). Avoids unit confusion in scheduler.
  recommendedDelay: z.number().int('Delay must be an integer (in minutes)').min(0).default(0),
  confidence: z.number().min(0).max(100),
  model: z.string().min(1, 'Model name is required'),
});

// ==========================================
// CREATE AGENT DECISION (POST Request)
// ==========================================
// Purpose: Log the AI's diagnosis and recommended action for a recovery case.
// Note: In production, this will likely be hit internally by our AI orchestrator.
// For development/MVP, we accept synthetic decisions here.
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate incoming synthetic decision
    const validationResult = createAgentDecisionSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const { 
      merchantId, 
      recoveryCaseId, 
      diagnosis, 
      reasoning, 
      recoveryProbability, 
      recommendedAction, 
      recommendedDelay, 
      confidence, 
      model 
    } = validationResult.data;

    // 2. Strict Merchant Isolation & Case Validation
    // Check if the recovery case exists AND belongs to the exact merchant.
    // If it belongs to someone else, we return a generic 404 to prevent data leakage.
    const caseCheckQuery = `
      SELECT id, status 
      FROM recovery_cases 
      WHERE id = $1 AND merchant_id = $2
    `;
    const caseCheck = await pool.query(caseCheckQuery, [recoveryCaseId, merchantId]);

    if (caseCheck.rows.length === 0) {
      res.status(404).json({ error: 'Recovery case not found' });
      return;
    }

    const recoveryCase = caseCheck.rows[0];

    // 3. Strict Business Validation: Can we create a decision for this case?
    // We explicitly BLOCK new AI decisions on completed or closed cases.
    const invalidStatuses = ['RECOVERED', 'STOPPED', 'UNRECOVERABLE'];
    if (invalidStatuses.includes(recoveryCase.status)) {
      res.status(400).json({ 
        error: `Cannot create agent decision. The recovery case is already ${recoveryCase.status}.` 
      });
      return;
    }

    // 4. Insert the Agent Decision
    // We allow multiple decisions per case (One-to-Many) preserving history.
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
      recoveryCaseId,
      diagnosis,
      reasoning,
      recoveryProbability,
      recommendedAction,
      recommendedDelay,
      confidence,
      model
    ];

    const dbResult = await pool.query(insertQuery, values);

    // 4. Return the logged decision
    res.status(201).json({
      message: 'Agent decision recorded successfully',
      data: dbResult.rows[0]
    });

  } catch (error: any) {
    console.error('Error creating agent decision:', error);

    // Handle invalid UUID error from PostgreSQL
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while recording agent decision' });
  }
});

// ==========================================
// VIEW AGENT DECISIONS (GET Request)
// ==========================================
// Purpose: Fetch AI decision history for a case, or all decisions for a merchant.
// Mandatory: ?merchant_id=UUID 
// Optional: ?recovery_case_id=UUID
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = req.query.merchant_id as string;
    const recoveryCaseId = req.query.recovery_case_id as string;

    // 1. Strict merchant isolation
    if (!merchantId) {
      res.status(400).json({ 
        error: 'merchant_id is a required query parameter' 
      });
      return;
    }

    // 2. Base query: Join with recovery_cases to ensure the case belongs to the calling merchant
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

    // 3. Optional filter for a specific recovery case
    if (recoveryCaseId) {
      values.push(recoveryCaseId);
      query += ` AND ad.recovery_case_id = $2`;
    }

    // 4. Order by newest first
    query += ` ORDER BY ad.created_at DESC;`;
    
    const dbResult = await pool.query(query, values);

    res.status(200).json({ data: dbResult.rows });

  } catch (error: any) {
    console.error('Error fetching agent decisions:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching decisions' });
  }
});

// ==========================================
// VIEW A SPECIFIC AGENT DECISION (GET Request)
// ==========================================
// Purpose: Fetch a single AI decision by its UUID.
// Note: Kept simple for now without deep joins to RecoveryCase/Payment.
// Example: GET /agent-decisions/decision-uuid
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const decisionId = String(req.params.id);

    // 1. Fetch specific decision dynamically
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
    
    // 2. Execute query
    const dbResult = await pool.query(query, [decisionId]);

    // 3. Handle non-existent decision
    if (dbResult.rows.length === 0) {
       res.status(404).json({ error: 'Agent decision not found' });
       return;
    }

    // 4. Return the specific decision
    res.status(200).json({ data: dbResult.rows[0] });
  } catch (error: any) {
    console.error('Error fetching specific agent decision:', error);
    
    // Handle invalid UUID error from PostgreSQL
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Agent Decision ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching the agent decision' });
  }
});

export default router;
