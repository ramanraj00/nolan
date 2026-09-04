import { pool } from './db';
import { randomUUID } from 'crypto';

async function seed() {
  console.log("Starting demo batch seed...");
  
  // 1. Get existing merchant or create one
  let merchantRes = await pool.query(`SELECT user_id FROM merchants LIMIT 1`);
  let merchantId = merchantRes.rows[0]?.user_id;
  if (!merchantId) {
    merchantId = randomUUID();
    await pool.query(`INSERT INTO merchants (user_id, name, email, razorpay_account_id, created_at, updated_at) VALUES ($1, 'Demo Merchant', 'demo@example.com', 'rzp_demo_123', NOW(), NOW())`, [merchantId]);
  }
  console.log(`Using Merchant ID: ${merchantId}`);

  console.log("Clearing existing data...");
  await pool.query(`DELETE FROM audit_events WHERE merchant_id = $1`, [merchantId]);
  await pool.query(`DELETE FROM recovery_cases WHERE merchant_id = $1`, [merchantId]);
  await pool.query(`DELETE FROM payments WHERE merchant_id = $1`, [merchantId]);
  await pool.query(`DELETE FROM customers WHERE merchant_id = $1`, [merchantId]);

  console.log("Seeding 30 Synthetic Failed Payments & Pipeline...");

  const reasons = [
    { code: 'INSUFFICIENT_FUNDS', prob: 90, action: 'RETRY_PAYMENT' },
    { code: 'CARD_EXPIRED', prob: 95, action: 'REQUEST_PAYMENT_METHOD_UPDATE' },
    { code: 'DO_NOT_HONOR', prob: 40, action: 'ESCALATE_HUMAN' },
    { code: 'EXCEEDS_LIMIT', prob: 70, action: 'SEND_PAYMENT_REMINDER' },
    { code: 'RISK_REJECTED', prob: 10, action: 'STOP_RECOVERY' }
  ];

  for (let i = 0; i < 30; i++) {
    const daysAgo = 7 - Math.floor((i / 30) * 7); 
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    const updatedAt = new Date(createdAt.getTime() + 1000 * 60 * 60);

    // 1. Customer
    const customerId = randomUUID();
    await pool.query(
      `INSERT INTO customers (id, merchant_id, external_customer_id, name, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [customerId, merchantId, `ext_user_${i+1}`, `Demo User ${i+1}`, createdAt]
    );

    // 2. Payment (Failed originally)
    const paymentId = randomUUID();
    const amount = [99900, 149900, 199900, 499900, 999900][i % 5]; // in paise
    const reasonObj = reasons[i % reasons.length];
    
    // Outcome targeting: 11 recovered, 6 escalated, 7 failed/unrecoverable, 6 open/pending
    let targetOutcome = 'OPEN';
    if (i < 11) targetOutcome = 'RECOVERED';
    else if (i < 17) targetOutcome = 'ESCALATED';
    else if (i < 24) targetOutcome = 'FAILED';

    const rzpId = `pay_${randomUUID().substring(0, 14)}`;
    const finalPaymentStatus = targetOutcome === 'RECOVERED' ? 'CAPTURED' : 'FAILED';

    await pool.query(
      `INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, status, failure_reason, created_at, recovered_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [paymentId, merchantId, customerId, rzpId, amount, finalPaymentStatus, reasonObj.code, createdAt, targetOutcome === 'RECOVERED' ? updatedAt : null]
    );

    // 3. Recovery Case
    const caseId = randomUUID();
    const recoveredAmount = targetOutcome === 'RECOVERED' ? amount : 0;
    const prob = reasonObj.prob + (Math.random() * 10 - 5); 
    
    await pool.query(
      `INSERT INTO recovery_cases (id, merchant_id, payment_id, status, revenue_at_risk, recovered_amount, recovery_probability, diagnosis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [caseId, merchantId, paymentId, targetOutcome === 'OPEN' ? 'ACTION_PENDING' : targetOutcome, amount, recoveredAmount, Math.max(0, Math.min(100, prob)), `Detected ${reasonObj.code}`]
    );

    // 4. Agent Decision
    const decisionId = randomUUID();
    await pool.query(
      `INSERT INTO agent_decisions (id, recovery_case_id, diagnosis, reasoning, recovery_probability, recommended_action, confidence, model, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [decisionId, caseId, `Detected ${reasonObj.code}`, 'Pattern matches historical data', Math.max(0, Math.min(100, prob)), reasonObj.action, prob / 100, 'gemini-2.0-flash', createdAt]
    );

    // 5. Policy Decision
    const policyId = randomUUID();
    let pStatus = true; // allowed
    let action = reasonObj.action;
    
    if (targetOutcome === 'ESCALATED') {
      pStatus = false;
      action = 'ESCALATE_HUMAN';
    } else if (reasonObj.code === 'RISK_REJECTED') {
      pStatus = false;
      action = 'STOP_RECOVERY';
    }

    await pool.query(
      `INSERT INTO policy_decisions (id, recovery_case_id, agent_decision_id, action, allowed, reason, rule, requires_approval, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [policyId, caseId, decisionId, action, pStatus, pStatus ? 'Passed all checks' : 'Flagged for review', 'global_risk_check', !pStatus, createdAt]
    );

    // 6. Recovery Action
    if (pStatus || targetOutcome === 'ESCALATED') {
      const actionId = randomUUID();
      let aStatus = 'PENDING';
      if (targetOutcome === 'RECOVERED') aStatus = 'SUCCESS';
      else if (targetOutcome === 'FAILED') aStatus = 'FAILED';
      else if (targetOutcome === 'ESCALATED') aStatus = 'PENDING_APPROVAL';

      await pool.query(
        `INSERT INTO recovery_actions (id, recovery_case_id, policy_decision_id, type, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [actionId, caseId, policyId, action, aStatus, createdAt]
      );

      // Audit Event for Action
      await pool.query(
        `INSERT INTO audit_events (id, merchant_id, recovery_case_id, event_type, description, entity_type, entity_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [randomUUID(), merchantId, caseId, 'RECOVERY_ACTION_DEPLOYED', `Deployed ${action}`, 'RECOVERY_ACTION', actionId, createdAt]
      );
      
      if (aStatus === 'SUCCESS') {
        await pool.query(
          `INSERT INTO audit_events (id, merchant_id, recovery_case_id, event_type, description, entity_type, entity_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [randomUUID(), merchantId, caseId, 'PAYMENT_RECOVERED', `Successfully recovered ₹${amount/100}`, 'PAYMENT', paymentId, updatedAt]
        );
      }
    }
    
    // Base Audit Event
    await pool.query(
      `INSERT INTO audit_events (id, merchant_id, recovery_case_id, event_type, description, entity_type, entity_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [randomUUID(), merchantId, caseId, 'REVENUE_RISK_DETECTED', `Case opened for ${reasonObj.code}`, 'RECOVERY_CASE', caseId, createdAt]
    );
  }

  console.log("Demo batch seeded successfully!");
  console.log("Stats: 30 Payments, 11 Recovered, 6 Escalated, 7 Failed, 6 Pending");
  process.exit(0);
}

seed().catch(console.error);
