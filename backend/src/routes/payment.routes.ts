import express, { Request, Response } from 'express';
import { paymentSchema } from '../validators/paymentValidator';
import { PaymentService } from '../services/payment.service';

const router = express.Router();

// ==========================================
// RECORD A NEW PAYMENT (POST Request)
// ==========================================
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = paymentSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const paymentData = validationResult.data;

    const payment = await PaymentService.createPayment(paymentData);

    res.status(201).json({
      message: 'Payment recorded successfully',
      data: payment,
    });
  } catch (error: any) {
    console.error('Error creating payment:', error);

    if (error.message === 'INVALID_RELATIONSHIP') {
      res.status(404).json({ 
        error: 'Invalid relationship or inactive merchant. Customer must belong to an active Merchant.' 
      });
      return;
    }

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided for Merchant or Customer' });
       return;
    }

    if (error.code === '23505') {
       res.status(409).json({ error: 'A payment with this Razorpay Payment ID already exists' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while recording payment' });
  }
});

// ==========================================
// VIEW PAYMENTS WITH FILTERS (GET Request)
// ==========================================
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchant_id = req.query.merchant_id as string;
    const status = req.query.status as string;

    if (!merchant_id) {
      res.status(400).json({ 
        error: 'merchant_id is required as a query parameter (e.g., /payments?merchant_id=uuid)' 
      });
      return;
    }

    const payments = await PaymentService.getPaymentsByMerchant(merchant_id, status);

    res.status(200).json({ data: payments });
  } catch (error: any) {
    console.error('Error fetching payments:', error);

    if (error.message === 'INVALID_STATUS') {
      res.status(400).json({ error: 'Invalid status parameter' });
      return;
    }

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid merchant_id format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching payments' });
  }
});

// ==========================================
// VIEW A SPECIFIC PAYMENT (GET Request)
// ==========================================
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentId = String(req.params.id);

    const payment = await PaymentService.getPaymentById(paymentId);

    if (!payment) {
       res.status(404).json({ error: 'Payment not found' });
       return;
    }

    res.status(200).json({ data: payment });
  } catch (error: any) {
    console.error('Error fetching specific payment:', error);
    
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Payment ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching the payment' });
  }
});

export default router;
