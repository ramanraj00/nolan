import express, { Request, Response } from 'express';
import { z } from 'zod';
import { WebhookEventService } from '../services/webhook-event.service';

const router = express.Router();

const createWebhookEventSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  eventType: z.string().min(1, 'Event type is required'),
  payload: z.record(z.string(), z.unknown())
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = createWebhookEventSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid webhook payload structure',
        details: validationResult.error.format(),
      });
      return;
    }

    const data = validationResult.data;
    const event = await WebhookEventService.createWebhookEvent(data);

    res.status(201).json({
      message: 'Webhook event recorded successfully',
      data: event
    });

  } catch (error: any) {
    if (error.code === '23505') {
       res.status(200).json({ 
         message: 'Webhook event already received and stored',
         eventId: req.body.eventId
       });
       return;
    }

    console.error('Error recording webhook event:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid UUID format provided during merchant extraction' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while recording webhook' });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = req.query.merchant_id as string;
    const eventType = req.query.event_type as string;
    const processedParam = req.query.processed as string;

    if (!merchantId) {
      res.status(400).json({ error: 'merchant_id is a required query parameter' });
      return;
    }

    let processed: boolean | undefined = undefined;
    if (processedParam) {
      const normalizedProcessed = processedParam.toLowerCase();
      if (normalizedProcessed !== 'true' && normalizedProcessed !== 'false') {
        res.status(400).json({ error: 'processed parameter must be strictly true or false' });
        return;
      }
      processed = normalizedProcessed === 'true';
    }

    const events = await WebhookEventService.getWebhookEvents(merchantId, eventType, processed);

    res.status(200).json({ data: events });

  } catch (error: any) {
    console.error('Error fetching webhook events:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const event = await WebhookEventService.getWebhookEventById(id);

    if (!event) {
       res.status(404).json({ error: 'Webhook event not found' });
       return;
    }

    res.status(200).json({ data: event });
  } catch (error: any) {
    console.error('Error fetching specific webhook event:', error);
    
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Webhook Event ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching webhook event' });
  }
});

export default router;
