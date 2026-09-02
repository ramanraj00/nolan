import express, { Request, Response } from 'express';
import { z } from 'zod';
import { RecoveryActionService } from '../services/recovery-action.service';

const router = express.Router();

const createRecoveryActionSchema = z.object({
  merchantId: z.string().uuid('Invalid Merchant ID format'),
  recoveryCaseId: z.string().uuid('Invalid Recovery Case ID format'),
  policyDecisionId: z.string().uuid('Invalid Policy Decision ID format')
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = createRecoveryActionSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const data = validationResult.data;
    const action = await RecoveryActionService.createRecoveryAction(data);

    res.status(201).json({
      message: 'Recovery action queued successfully',
      data: action
    });

  } catch (error: any) {
    console.error('Error creating recovery action:', error);

    if (error.message === 'INVALID_RELATIONSHIP') {
      res.status(404).json({ 
        error: 'Invalid relationship. Policy Decision or Case not found, or Merchant does not own this data.' 
      });
      return;
    }

    if (error.message === 'NOT_ALLOWED') {
      res.status(403).json({
        error: 'Recovery action is not allowed by policy'
      });
      return;
    }

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }
    
    if (error.code === '23505') {
       res.status(409).json({ error: 'Action already exists' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while scheduling recovery action' });
  }
});

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

    const actions = await RecoveryActionService.getRecoveryActions(merchantId, recoveryCaseId, type, status);

    res.status(200).json({ data: actions });

  } catch (error: any) {
    console.error('Error fetching recovery actions:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const actionId = String(req.params.id);
    const action = await RecoveryActionService.getRecoveryActionById(actionId);

    if (!action) {
       res.status(404).json({ error: 'Recovery action not found' });
       return;
    }

    res.status(200).json({ data: action });
  } catch (error: any) {
    console.error('Error fetching specific recovery action:', error);
    
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Recovery Action ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching the recovery action' });
  }
});

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

    const data = validationResult.data;
    const action = await RecoveryActionService.updateRecoveryActionStatus(actionId, data);

    res.status(200).json({
      message: 'Recovery action status updated successfully',
      data: action
    });

  } catch (error: any) {
    console.error('Error updating recovery action:', error);
    
    if (error.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Recovery action not found' });
      return;
    }

    if (error.message && error.message.startsWith('INVALID_TRANSITION_')) {
      const currentStatus = error.message.split('_')[2];
      res.status(400).json({ 
        error: `Invalid state transition. Cannot move from ${currentStatus} to ${req.body.status}.` 
      });
      return;
    }

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Recovery Action ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while updating the recovery action' });
  }
});

export default router;
