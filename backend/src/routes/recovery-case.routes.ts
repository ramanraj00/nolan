import express, { Request, Response } from 'express';
import { z } from 'zod';
import { RecoveryCaseService } from '../services/recovery-case.service';

const router = express.Router();

const createRecoveryCaseSchema = z.object({
  merchantId: z.string().uuid('Invalid Merchant ID format'),
  paymentId: z.string().uuid('Invalid Payment ID format'),
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = createRecoveryCaseSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const { merchantId, paymentId } = validationResult.data;

    const recoveryCase = await RecoveryCaseService.createRecoveryCase({ merchantId, paymentId });

    res.status(201).json({
      message: 'Recovery case opened successfully',
      data: recoveryCase,
    });

  } catch (error: unknown) {
    console.error('Error creating recovery case:', error);

    if ((error instanceof Error ? error.message : "Unknown error") === 'PAYMENT_NOT_FOUND') {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    if ((error instanceof Error ? error.message : "Unknown error") === 'PAYMENT_NOT_FAILED') {
      res.status(400).json({ error: 'Payment is not eligible for recovery (Status must be FAILED)' });
      return;
    }

    if ((error as { code?: string }).code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    if ((error as { code?: string }).code === '23505') {
       res.status(409).json({ error: 'A recovery case already exists for this payment' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while creating recovery case' });
  }
});

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchant_id = req.query.merchant_id as string;
    const status = req.query.status as string;

    if (!merchant_id) {
      res.status(400).json({ 
        error: 'merchant_id is required as a query parameter (e.g., /recovery-cases?merchant_id=uuid)' 
      });
      return;
    }

    const cases = await RecoveryCaseService.getRecoveryCasesByMerchant(merchant_id, status);

    res.status(200).json({ data: cases });
  } catch (error: unknown) {
    console.error('Error fetching recovery cases:', error);

    if ((error instanceof Error ? error.message : "Unknown error") === 'INVALID_STATUS') {
      res.status(400).json({ error: 'Invalid status parameter provided' });
      return;
    }

    if ((error as { code?: string }).code === '22P02') {
       res.status(400).json({ error: 'Invalid merchant_id format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching recovery cases' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const caseId = String(req.params.id);

    const merchantId = String(req.query.merchant_id || "");

    if (!merchantId) {
      res.status(400).json({ error: "merchant_id is required" });
      return;
    }

    const recoveryCase = await RecoveryCaseService.getRecoveryCaseById(caseId, merchantId);

    if (!recoveryCase) {
       res.status(404).json({ error: 'Recovery case not found' });
       return;
    }

    res.status(200).json({ data: recoveryCase });
  } catch (error: unknown) {
    console.error('Error fetching specific recovery case:', error);
    
    if ((error as { code?: string }).code === '22P02') {
       res.status(400).json({ error: 'Invalid Recovery Case ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching the recovery case' });
  }
});

export default router;
