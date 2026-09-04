import express, { Request, Response } from 'express';
import { PolicyDecisionService } from '../services/policy-decision.service';

const router = express.Router();

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
    const merchantId = req.query.merchant_id as string;

    if (!merchantId) {
      res.status(400).json({ error: 'merchant_id is required' });
      return;
    }

    const decision = await PolicyDecisionService.getPolicyDecisionById(decisionId, merchantId);

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
