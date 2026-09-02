import { pool } from './db';
import { RecoveryCaseService } from './services/recovery-case.service';
import { AiAgentService } from './services/ai-agent.service';
import dotenv from 'dotenv';
dotenv.config();

async function testRealAiAgent() {
  console.log('--- STARTING REAL AI AGENT TEST ---');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ FATAL: GEMINI_API_KEY is missing from your .env file!');
    console.log('To pass this test, please add GEMINI_API_KEY to backend/.env and run the test again.');
    process.exit(1);
  }

  // 1. Setup Mock Data
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Real AI Merchant', 'realai${Date.now()}@test.com', 'acc_realai_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name, lifetime_value, failed_payments, successful_payments)
    VALUES ($1, 'cust_realai_1', 'Real AI Customer', 15000.50, 1, 5)
    RETURNING *;
  `, [merchantId]);
  const customer = cRes.rows[0];

  const pRes = await pool.query(`
    INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason, attempt_count)
    VALUES ($1, $2, 'pay_realai_${Date.now()}', 5000, 'INR', 'FAILED', 'insufficient_funds', 1)
    RETURNING *;
  `, [merchantId, customer.id]);
  const payment = pRes.rows[0];

  const recoveryCase = await RecoveryCaseService.createRecoveryCase({
    merchantId: merchantId,
    paymentId: payment.id
  });

  console.log('✅ Setup Mock Data');
  console.log('⏳ Connecting to Real Gemini 2.5 Flash AI Model...');

  // 2. Call Real AI
  try {
    const aiDecision = await AiAgentService.analyzeFailure(payment, customer, recoveryCase.id);
    
    console.log('✅ Received Structured Output from Real AI!');
    console.log('--- AI DIAGNOSIS ---');
    console.log(JSON.stringify(aiDecision, null, 2));

    if (aiDecision.recommended_action && typeof aiDecision.confidence === 'number') {
      console.log('✅ Structured Output Zod Validation Passed!');
    } else {
      console.error('❌ Invalid Schema Returned');
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ AI Agent Failed:', err.message);
    process.exit(1);
  }

  console.log('✅ Real AI integration perfectly connected and verified!');
  process.exit(0);
}

testRealAiAgent().catch(e => {
  console.error(e);
  process.exit(1);
});

