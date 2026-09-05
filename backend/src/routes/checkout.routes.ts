import express, { Request, Response } from 'express';
const Razorpay = require('razorpay');
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

router.post('/create-order', async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, currency = 'INR', merchant_id } = req.body;
    
    if (!amount || !merchant_id) {
      res.status(400).json({ error: 'Missing amount or merchant_id' });
      return;
    }

    const options = {
      amount: amount * 100, // Razorpay works in smallest currency unit (paise)
      currency,
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
