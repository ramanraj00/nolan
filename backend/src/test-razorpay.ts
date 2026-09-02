import crypto from 'crypto';

const webhookSecret = 'secret';
const payload = {
  event: 'payment.failed',
  contains: ['payment'],
  payload: {
    payment: {
      entity: {
        id: 'pay_xyz',
        amount: 500,
        currency: 'INR',
        status: 'failed',
        error_description: 'insufficient_funds',
        notes: {
          merchant_id: 'merchant_123'
        }
      }
    }
  },
  created_at: Math.floor(Date.now() / 1000)
};

const rawBody = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

async function testWebhook() {
  console.log('Sending webhook with signature:', signature);
  
  const res = await fetch('http://localhost:8000/api/webhook-events/razorpay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signature,
      'x-razorpay-event-id': 'evt_fixed_123'
    },
    body: rawBody
  });

  const data = await res.json();
  console.log('Response:', res.status, data);
}

testWebhook().catch(console.error);
