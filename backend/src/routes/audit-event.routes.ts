import express, { Request, Response } from 'express';
import { z } from 'zod';
import { AuditEventService } from '../services/audit-event.service';

const router = express.Router();

const createAuditEventSchema = z.object({
  merchantId: z.string().uuid('Invalid Merchant ID format'),
  recoveryCaseId: z.string().uuid('Invalid Recovery Case ID format').optional(),
  entityType: z.enum([
    'PAYMENT',
    'RECOVERY_CASE',
    'AGENT_DECISION',
    'POLICY_DECISION',
    'RECOVERY_ACTION'
  ]).optional(),
  entityId: z.string().uuid('Invalid Entity ID format').optional(),
  eventType: z.enum([
    'PAYMENT_FAILED', 
    'REVENUE_RISK_DETECTED', 
    'AI_ANALYSIS_COMPLETED', 
    'POLICY_EVALUATED', 
    'ACTION_APPROVED', 
    'ACTION_REJECTED', 
    'ACTION_EXECUTED', 
    'PAYMENT_RECOVERED', 
    'RECOVERY_ESCALATED', 
    'RECOVERY_STOPPED'
  ]),
  actor: z.enum(['SYSTEM', 'AI_AGENT', 'POLICY_ENGINE', 'HUMAN']),
  metadata: z.record(z.string(), z.unknown()).optional()
}).refine(data => {
  const hasType = data.entityType !== undefined;
  const hasId = data.entityId !== undefined;
  return hasType === hasId;
}, {
  message: "entityType and entityId must either both be provided or both be omitted",
  path: ["entityType"]
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = createAuditEventSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid event data',
        details: validationResult.error.format(),
      });
      return;
    }

    const data = validationResult.data;
    const event = await AuditEventService.createAuditEvent(data);

    res.status(201).json({
      message: 'Audit event logged successfully',
      data: event
    });

  } catch (error: any) {
    console.error('Error logging audit event:', error);

    if (error.message === 'INVALID_RECOVERY_CASE') {
      res.status(404).json({ error: 'Recovery case not found or does not belong to this merchant' });
      return;
    }
    
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while logging audit event' });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = req.query.merchant_id as string;
    const recoveryCaseId = req.query.recovery_case_id as string;
    const eventType = req.query.event_type as string;
    const actor = req.query.actor as string;

    if (!merchantId) {
      res.status(400).json({ error: 'merchant_id is a required query parameter' });
      return;
    }

    const validEventTypes = [
      'PAYMENT_FAILED', 'REVENUE_RISK_DETECTED', 'AI_ANALYSIS_COMPLETED', 'POLICY_EVALUATED', 
      'ACTION_APPROVED', 'ACTION_REJECTED', 'ACTION_EXECUTED', 'PAYMENT_RECOVERED', 
      'RECOVERY_ESCALATED', 'RECOVERY_STOPPED'
    ];
    const validActors = ['SYSTEM', 'AI_AGENT', 'POLICY_ENGINE', 'HUMAN'];

    if (eventType && !validEventTypes.includes(eventType.toUpperCase())) {
      res.status(400).json({ error: 'Invalid event_type parameter' });
      return;
    }

    if (actor && !validActors.includes(actor.toUpperCase())) {
      res.status(400).json({ error: 'Invalid actor parameter' });
      return;
    }

    const events = await AuditEventService.getAuditEvents(merchantId, recoveryCaseId, eventType, actor);

    res.status(200).json({ data: events });

  } catch (error: any) {
    console.error('Error fetching audit events:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = String(req.params.id);
    const merchantId = req.query.merchant_id as string;

    if (!merchantId) {
      res.status(400).json({ error: 'merchant_id is required' });
      return;
    }

    const event = await AuditEventService.getAuditEventById(eventId, merchantId);

    if (!event) {
       res.status(404).json({ error: 'Audit event not found' });
       return;
    }

    res.status(200).json({ data: event });
  } catch (error: any) {
    console.error('Error fetching specific audit event:', error);
    
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Audit Event ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching the audit event' });
  }
});

export default router;
