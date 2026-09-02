import express, { Request, Response } from 'express';
import { z } from 'zod';
import { PolicyDecisionService } from '../services/policy-decision.service';

const router = express.Router();

const createPolicyDecisionSchema = z.object({
  merchantId: z.string().uuid('Invalid Merchant ID format'),
  recoveryCaseId: z.string().uuid('Invalid Recovery Case ID format'),
  agentDecisionId: z.string().uuid('Invalid Agent Decision ID format')
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = createPolicyDecisionSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const decision = await PolicyDecisionService.createPolicyDecision(validationResult.data);

    res.status(201).json({
      message: 'Policy evaluation completed',
      data: decision
    });

  } catch (error: any) {
    console.error('Error evaluating policy:', error);

    if (error.message === 'RELATIONSHIP_NOT_FOUND') {
      res.status(404).json({ 
        error: 'Invalid relationship. Decision or Case not found, or Merchant does not own this data.' 
      });
      return;
    }

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while evaluating policy' });
  }
});

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

    let allowed: boolean | undefined = undefined;
    if (allowedParam) {
      const normalizedAllowed = allowedParam.toLowerCase();
      if (normalizedAllowed !== 'true' && normalizedAllowed !== 'false') {
        res.status(400).json({ error: 'allowed parameter must be strictly true or false' });
        return;
      }
      allowed = normalizedAllowed === 'true';
    }

    const decisions = await PolicyDecisionService.getPolicyDecisions(
      merchantId, 
      recoveryCaseId, 
      agentDecisionId, 
      allowed
    );

    res.status(200).json({ data: decisions });

  } catch (error: any) {
    console.error('Error fetching policy decisions:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const decisionId = String(req.params.id);

    const decision = await PolicyDecisionService.getPolicyDecisionById(decisionId);

    if (!decision) {
       res.status(404).json({ error: 'Policy decision not found' });
       return;
    }

    res.status(200).json({ data: decision });
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
