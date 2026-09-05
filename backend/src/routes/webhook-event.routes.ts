import express, { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { WebhookEventService } from '../services/webhook-event.service';
import { WebhookProcessorService } from '../services/webhook-processor.service';

const router = express.Router();

const createWebhookEventSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  eventType: z.string().min(1, 'Event type is required'),
  payload: z.record(z.string(), z.unknown())
});

// ==========================================
// RECORD RAZORPAY WEBHOOK (POST Request)
// ==========================================

// ==========================================
// SIMULATE WEBHOOK FOR DEMO (POST Request)
// ==========================================
router.post('/simulate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchant_id } = req.body;
    if (!merchant_id) {
      res.status(400).json({ error: 'merchant_id is required' });
      return;
    }

    const eventTypes = ['payment.failed', 'payment.captured', 'payment.authorized', 'order.paid'];
    const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const eventId = `evt_sim_${Date.now()}`;
    const amount = Math.floor(Math.random() * 100000) + 10000;

    const payload = {
      event: randomEvent,
      merchant_id, account_id: merchant_id,
      payload: randomEvent === 'order.paid' ? {
        order: {
          entity: {
            id: `order_${Date.now()}`,
            amount,
            currency: "INR"
          }
        }
      } : {
        payment: {
          entity: { 
            id: `pay_${Date.now()}`,
            amount, 
            currency: "INR",
            error_description: "Simulated payment failure from bank",
            email: "demo@example.com",
            contact: "+919876543210"
          }
        }
      }
    };

    // Save directly to DB as if it was verified
    const event = await WebhookEventService.createWebhookEvent({
      eventId: eventId,
      eventType: randomEvent,
      payload
    });

    // Fire & Forget processor
    WebhookProcessorService.processEvent(event.id).catch(err => {
       console.error('Background processing of simulated webhook failed:', err);
    });

    res.status(200).json({
      message: 'Simulated webhook processed',
      data: event
    });
  } catch (error: any) {
    console.error('Error simulating webhook:', error);
    res.status(500).json({ error: 'Internal server error while simulating' });
  }
});

router.post('/razorpay', async (req: any, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const eventId = req.headers['x-razorpay-event-id'] || req.body?.id; // sometimes it's in the header, sometimes body.id
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'secret'; // Normally must be in .env

    if (!signature) {
      res.status(400).json({ error: 'Missing Razorpay signature' });
      return;
    }

    if (!eventId) {
      res.status(400).json({ error: 'Missing Razorpay Event ID' });
      return;
    }

    // Verify Signature using rawBody captured globally in index.ts
    const rawBody = req.rawBody || JSON.stringify(req.body); 
    const expectedSignature = crypto.createHmac('sha256', webhookSecret)
                                    .update(rawBody)
                                    .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid Razorpay signature', { expectedSignature, signature });
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // Passed Verification -> Extract Payload
    const eventType = req.body?.event;
    
    if (!eventType) {
      res.status(400).json({ error: 'Missing event type in payload' });
      return;
    }

    // Save to database
    const event = await WebhookEventService.createWebhookEvent({
      eventId: String(eventId),
      eventType: String(eventType),
      payload: req.body
    });

    // Fire & Forget processor so we respond to Razorpay quickly
    WebhookProcessorService.processEvent(event.id).catch(err => {
       console.error('Background processing of webhook failed:', err);
    });

    // 200 OK Response is critical for Razorpay to know it was received
    res.status(200).json({
      message: 'Razorpay webhook received and verified successfully',
      data: event
    });

  } catch (error: any) {
    if (error.code === '23505') {
       // Idempotency: Duplicate Event ID. Return 200 so Razorpay stops retrying.
       res.status(200).json({ 
         message: 'Webhook event already received and stored (Idempotent)',
         eventId: req.headers['x-razorpay-event-id'] || req.body?.id
       });
       return;
    }

    console.error('Error processing Razorpay webhook:', error);
    res.status(500).json({ error: 'Internal server error while processing webhook' });
  }
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
