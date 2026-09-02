import express, { Request, Response } from 'express';
import { z } from 'zod';
import { AgentDecisionService } from '../services/agent-decision.service';

const router = express.Router();

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
  recommendedDelay: z.number().int('Delay must be an integer (in minutes)').min(0).default(0),
  confidence: z.number().min(0).max(100),
  model: z.string().min(1, 'Model name is required'),
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = createAgentDecisionSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const decision = await AgentDecisionService.createAgentDecision(validationResult.data);

    res.status(201).json({
      message: 'Agent decision recorded successfully',
      data: decision
    });

  } catch (error: any) {
    console.error('Error creating agent decision:', error);

    if (error.message === 'CASE_NOT_FOUND') {
      res.status(404).json({ error: 'Recovery case not found' });
      return;
    }

    if (error.message.startsWith('INVALID_CASE_STATUS:')) {
      const status = error.message.split(':')[1];
      res.status(400).json({ 
        error: `Cannot create agent decision. The recovery case is already ${status}.` 
      });
      return;
    }

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while recording agent decision' });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = req.query.merchant_id as string;
    const recoveryCaseId = req.query.recovery_case_id as string;

    if (!merchantId) {
      res.status(400).json({ 
        error: 'merchant_id is a required query parameter' 
      });
      return;
    }

    const decisions = await AgentDecisionService.getAgentDecisions(merchantId, recoveryCaseId);

    res.status(200).json({ data: decisions });

  } catch (error: any) {
    console.error('Error fetching agent decisions:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching decisions' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const decisionId = String(req.params.id);

    const decision = await AgentDecisionService.getAgentDecisionById(decisionId);

    if (!decision) {
       res.status(404).json({ error: 'Agent decision not found' });
       return;
    }

    res.status(200).json({ data: decision });
  } catch (error: any) {
    console.error('Error fetching specific agent decision:', error);
    
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Agent Decision ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching the agent decision' });
  }
});

export default router;
