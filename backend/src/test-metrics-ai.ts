import express from 'express';
import metricsRoutes from './routes/metrics.routes';
import { pool } from './db';

const app = express();
app.use(express.json());
app.use('/api/metrics', metricsRoutes);

async function testAiPerformance() {
  console.log('--- STARTING AI PERFORMANCE METRICS TEST ---');

  // 1. Setup Mock Merchant
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('AI Test Merchant', 'ai${Date.now()}@test.com', 'acc_ai_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_ai_1', 'AI Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  // Insert 1 Payment and 1 Recovery Case to link Agent Decisions to
  const p = await pool.query(`INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason) VALUES ($1, $2, 'pay_ai_${Date.now()}', 1000, 'INR', 'FAILED', 'bank_error') RETURNING id;`, [merchantId, customerId]);
  const rc = await pool.query(`INSERT INTO recovery_cases (merchant_id, payment_id, revenue_at_risk, status) VALUES ($1, $2, 1000, 'OPEN') RETURNING id;`, [merchantId, p.rows[0].id]);
  const caseId = rc.rows[0].id;

  // Insert 3 Agent Decisions with confidence: 0.80, 0.89, 0.845
  // Average = (0.80 + 0.89 + 0.845) / 3 = 2.535 / 3 = 0.845
  // Expressed as percentage -> 84.5
  const confidences = [0.80, 0.89, 0.845];
  for (const conf of confidences) {
    await pool.query(`
      INSERT INTO agent_decisions (recovery_case_id, diagnosis, recommended_action, recommended_delay, confidence, reasoning, recovery_probability, model)
      VALUES ($1, 'Test', 'RETRY_PAYMENT', 24, $2, 'Test reasoning', 0.80, 'mock_model');
    `, [caseId, conf]);
  }

  console.log('✅ Setup Test Scenario (3 Decisions: 0.80, 0.89, 0.845)');

  const server = app.listen(8015, async () => {
    try {
      console.log('⏳ Server listening on 8015...');
      const response = await fetch(`http://localhost:8015/api/metrics/${merchantId}`);
      const apiData = await response.json();

      console.log('📊 API Route Response: aiPerformance');
      console.log(JSON.stringify(apiData.aiPerformance, null, 2));

      const ai = apiData.aiPerformance;

      // Asserts
      if (!ai || typeof ai !== 'object') {
        console.error('❌ aiPerformance is missing or not an object');
        process.exit(1);
      }

      if (ai.totalDecisions !== 3) {
        console.error('❌ totalDecisions mismatch! Expected 3, got', ai.totalDecisions);
        process.exit(1);
      }

      if (ai.averageConfidence !== 84.67) {
        console.error('❌ averageConfidence mismatch! Expected 84.67, got', ai.averageConfidence);
        process.exit(1);
      }

      console.log('✅ aiPerformance perfectly calculated with proper percentage conversion!');
      console.log('🏆 AI PERFORMANCE TEST PASSED!');
      server.close();
      process.exit(0);

    } catch (e: any) {
      console.error(e);
      server.close();
      process.exit(1);
    }
  });
}

testAiPerformance().catch(e => {
  console.error(e);
  process.exit(1);
});
