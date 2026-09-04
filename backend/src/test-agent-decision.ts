import { pool } from './db';
import { RecoveryCaseService } from './services/recovery-case.service';
import { AgentDecisionService } from './services/agent-decision.service';
import { AiAgentService } from './services/ai-agent.service';

async function testAgentDecisionFlow() {
  console.log('--- STARTING AGENT DECISION FLOW TEST ---');

  // 1. Create Mock Merchant & Payment
  const mRes = await pool.query(`
    INSERT INTO merchants (name, email, razorpay_account_id)
    VALUES ('Agent Test Merchant', 'agent${Date.now()}@test.com', 'acc_agent_123')
    RETURNING user_id;
  `);
  const merchantId = mRes.rows[0].user_id;

  const cRes = await pool.query(`
    INSERT INTO customers (merchant_id, external_customer_id, name)
    VALUES ($1, 'cust_agent_1', 'Agent Test Customer')
    RETURNING id;
  `, [merchantId]);
  const customerId = cRes.rows[0].id;

  const pRes = await pool.query(`
    INSERT INTO payments (merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason)
    VALUES ($1, $2, 'pay_agent_${Date.now()}', 1000, 'INR', 'FAILED', 'bank_network_error')
    RETURNING id, amount, currency, failure_reason;
  `, [merchantId, customerId]);
  const payment = pRes.rows[0];

  console.log('✅ Setup Mock Data');

  // 2. Create Recovery Case
  const recoveryCase = await RecoveryCaseService.createRecoveryCase({
    merchantId: merchantId,
    paymentId: payment.id
  });
  console.log('✅ Created Recovery Case:', recoveryCase.id);

  // 3. Mock AI Analysis
  const mockAiRecommendation = await AiAgentService.analyzeFailure(payment, { id: customerId } as any, recoveryCase.id);
  console.log('✅ Generated Mock AI Decision');

  // 4. Create Agent Decision
  const agentDecision = await AgentDecisionService.createAgentDecision({
    merchantId: merchantId,
    recoveryCaseId: recoveryCase.id,
    diagnosis: mockAiRecommendation.diagnosis,
    reasoning: mockAiRecommendation.reasoning,
    recoveryProbability: mockAiRecommendation.recovery_probability,
    recommendedAction: mockAiRecommendation.recommended_action,
    recommendedDelay: mockAiRecommendation.recommended_delay,
    confidence: mockAiRecommendation.confidence,
    model: 'gemini-2.5-flash-mock'
  });
  
  console.log('✅ Inserted Agent Decision:', agentDecision.id);
  console.log('✅ Link Verified - RecoveryCase ID:', agentDecision.recoveryCaseId);

  // 5. Fetch it back to verify link
  const decisions = await AgentDecisionService.getAgentDecisions(merchantId, recoveryCase.id);
  if (decisions.length === 1 && decisions[0].id === agentDecision.id) {
    console.log('✅ Successfully fetched Agent Decision via Recovery Case Link!');
  } else {
    console.error('❌ Failed to fetch via Recovery Case link');
    process.exit(1);
  }

  process.exit(0);
}

testAgentDecisionFlow().catch(e => {
  console.error(e);
  process.exit(1);
});

