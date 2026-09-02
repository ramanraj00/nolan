import express, { Request, Response } from 'express';
import { pool } from '../db';
import { z } from 'zod';

const router = express.Router();

// Specific schema for creating a recovery case (client should only send IDs)
const createRecoveryCaseSchema = z.object({
  merchantId: z.string().uuid('Invalid Merchant ID format'),
  paymentId: z.string().uuid('Invalid Payment ID format'),
});

// ==========================================
// CREATE RECOVERY CASE (POST Request)
// ==========================================
// Purpose: Tell the system that a payment is at risk, so the recovery process can begin.
// Flow: Validate Input -> Find Payment -> Verify Merchant -> Check FAILED status -> Check Duplicate -> Create Case
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate incoming data (Client ONLY provides merchantId and paymentId)
    // We intentionally don't use the full model schema because client shouldn't dictate status/revenue at risk.
    const validationResult = createRecoveryCaseSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const { merchantId, paymentId } = validationResult.data;

    // 2. Fetch the payment and strictly verify it belongs to this exact merchant
    // This enforces merchant isolation. If the payment exists but belongs to a different merchant,
    // we return "Payment not found" (same as if it didn't exist) to avoid leaking data cross-tenant.
    const paymentCheckQuery = `
      SELECT id, merchant_id, status, amount 
      FROM payments 
      WHERE id = $1 AND merchant_id = $2
    `;
    const paymentCheck = await pool.query(paymentCheckQuery, [paymentId, merchantId]);

    if (paymentCheck.rows.length === 0) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const payment = paymentCheck.rows[0];

    // 3. Ensure the payment is actually FAILED
    // A captured or refunded payment doesn't need revenue recovery
    if (payment.status !== 'FAILED') {
      res.status(400).json({ error: 'Payment is not eligible for recovery (Status must be FAILED)' });
      return;
    }

    // 4. Initialize and Create the Recovery Case
    // Backend takes over: setting revenue_at_risk from payment.amount, and initial state.
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
      merchantId, 
      paymentId, 
      payment.amount, 
      initialProbability, 
      initialStatus
    ];

    const dbResult = await pool.query(insertQuery, values);

    // 5. Return the newly created case
    res.status(201).json({
      message: 'Recovery case opened successfully',
      data: dbResult.rows[0],
    });

  } catch (error: any) {
    console.error('Error creating recovery case:', error);

    // Handle invalid UUID error from PostgreSQL
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    // Handle unique constraint (Duplicate Case for the same Payment)
    // We added UNIQUE(payment_id) in the database schema.
    if (error.code === '23505') {
       res.status(409).json({ error: 'A recovery case already exists for this payment' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while creating recovery case' });
  }
});

// ==========================================
// VIEW RECOVERY CASES WITH FILTERS (GET Request)
// ==========================================
// Purpose: Fetch all recovery cases for a specific merchant.
// Mandatory: ?merchant_id=UUID (Ensures tenant isolation)
// Optional: ?status=OPEN (Filters cases by their state)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchant_id = req.query.merchant_id as string;
    const status = req.query.status as string;

    // 1. Enforce strict isolation (merchant_id is mandatory)
    if (!merchant_id) {
      res.status(400).json({ 
        error: 'merchant_id is required as a query parameter (e.g., /recovery-cases?merchant_id=uuid)' 
      });
      return;
    }

    // 2. Build dynamic SQL query with parameters
    // We join the 'payments' table and use json_build_object to construct 
    // a nested "payment" property. This immediately gives the dashboard the context it needs!
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
        json_build_object(
          'amount', p.amount,
          'currency', p.currency,
          'failureReason', p.failure_reason
        ) as payment
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      WHERE rc.merchant_id = $1
    `;
    
    const values: any[] = [merchant_id];

    // 3. Apply optional status filter dynamically
    if (status) {
      // API-level validation for safe status values based on DB constraint
      const allowedStatuses = [
        'OPEN', 'ANALYZING', 'ACTION_PENDING', 'IN_PROGRESS', 
        'RECOVERED', 'ESCALATED', 'STOPPED', 'UNRECOVERABLE'
      ];
      const upperStatus = status.toUpperCase();
      
      if (!allowedStatuses.includes(upperStatus)) {
        res.status(400).json({ error: 'Invalid status parameter provided' });
        return;
      }
      
      values.push(upperStatus);
      query += ` AND rc.status = $2`;
    }

    // 4. Order by newest first
    query += ` ORDER BY rc.created_at DESC;`;

    // 5. Execute query
    const dbResult = await pool.query(query, values);

    // 6. Return standard data payload
    res.status(200).json({ data: dbResult.rows });
  } catch (error: any) {
    console.error('Error fetching recovery cases:', error);

    // Handle invalid UUID error from PostgreSQL
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid merchant_id format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching recovery cases' });
  }
});

// ==========================================
// VIEW A SPECIFIC RECOVERY CASE (GET Request)
// ==========================================
// Purpose: Fetch a single recovery case by its UUID.
// Example: GET /recovery-cases/case-uuid
// Note: Kept simple for now. Later this will be enriched with AgentDecision, PolicyDecision, etc.
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const caseId = String(req.params.id);

    // 1. Fetch specific case dynamically
    // Consistent with the list view, we join the payment context.
    // Other rich contexts (Audit, Agent Decisions) will be added later.
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
        json_build_object(
          'amount', p.amount,
          'currency', p.currency,
          'failureReason', p.failure_reason
        ) as payment
      FROM recovery_cases rc
      JOIN payments p ON p.id = rc.payment_id
      WHERE rc.id = $1;
    `;
    
    // 2. Execute query
    const dbResult = await pool.query(query, [caseId]);

    // 3. Handle non-existent case
    if (dbResult.rows.length === 0) {
       res.status(404).json({ error: 'Recovery case not found' });
       return;
    }

    // 4. Return the specific case
    res.status(200).json({ data: dbResult.rows[0] });
  } catch (error: any) {
    console.error('Error fetching specific recovery case:', error);
    
    // Handle invalid UUID error from PostgreSQL
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Recovery Case ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching the recovery case' });
  }
});

export default router;
