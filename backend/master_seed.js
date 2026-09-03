const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'nolan_db',
  password: 'password',
  port: 5432,
});

const generateUUID = () => crypto.randomUUID();

const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Starting master seed...");
    await client.query('BEGIN');
    
    console.log("Truncating all tables...");
    await client.query('TRUNCATE merchants CASCADE;');

    // 1. Merchant
    const merchantId = generateUUID();
    await client.query(`
      INSERT INTO merchants (user_id, name, email, razorpay_account_id, status)
      VALUES ($1, 'Nolan Demo Merchant', 'demo@nolan.app', 'acc_demo_nolan', 'active')
    `, [merchantId]);
    console.log(`Created merchant: ${merchantId}`);

    // 2. Customers
    const customers = [
      { name: 'James Carter', email: 'james.c@example.com' },
      { name: 'Patricia Boyle', email: 'pattyb@example.com' },
      { name: 'Michael Smith', email: 'msmith99@example.com' },
      { name: 'Linda Martinez', email: 'linda.m@example.com' },
      { name: 'David Lee', email: 'dlee@example.com' },
      { name: 'Elizabeth Taylor', email: 'liz.t@example.com' },
      { name: 'Robert Johnson', email: 'rjohnson@example.com' },
      { name: 'Jennifer White', email: 'jwhite@example.com' },
      { name: 'William Brown', email: 'wbrown@example.com' },
      { name: 'Mary Garcia', email: 'mgarcia@example.com' }
    ];

    const customerIds = [];
    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      const cid = generateUUID();
      await client.query(`
        INSERT INTO customers (id, merchant_id, external_customer_id, name, email, phone, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW() - interval '30 days')
      `, [cid, merchantId, 'cust_ext_' + i, c.name, c.email, '+15550000000']);
      customerIds.push(cid);
    }
    console.log(`Created 10 customers.`);

    // 3. Payments
    console.log("Generating payments & recovery flows...");
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < 35; i++) {
      const pid = generateUUID();
      const cid = customerIds[Math.floor(Math.random() * customerIds.length)];
      const amount = Math.floor(Math.random() * 80000) + 2000;
      const isFailed = i >= 15; // 20 Failed, 15 Captured
      
      const status = isFailed ? 'FAILED' : 'CAPTURED';
      const failureReason = isFailed ? (Math.random() > 0.5 ? 'Insufficient Funds' : 'Authentication Timeout') : null;
      
      const createdAt = randomDate(thirtyDaysAgo, now);

      await client.query(`
        INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, currency, status, failure_reason, gateway, payment_method, attempt_count, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        pid, merchantId, cid, 'pay_demo_' + i.toString().padStart(4, '0'), amount, 'INR', status, failureReason, 'Razorpay', 'Credit Card', isFailed ? 1 : 1, createdAt
      ]);

      if (isFailed) {
        // Create Recovery Case
        const rcid = generateUUID();
        
        // Define realistic case state based on random selection
        const caseStates = [
          { status: 'OPEN', actionStatus: 'PENDING', recovered: false },
          { status: 'IN_PROGRESS', actionStatus: 'EXECUTING', recovered: false },
          { status: 'RECOVERED', actionStatus: 'SUCCESS', recovered: true },
          { status: 'RECOVERED', actionStatus: 'SUCCESS', recovered: true }, // Weight recovered more
          { status: 'ESCALATED', actionStatus: 'FAILED', recovered: false },
          { status: 'ANALYZING', actionStatus: null, recovered: false } // No action yet
        ];
        
        const state = caseStates[i % caseStates.length];
        
        await client.query(`
          INSERT INTO recovery_cases (id, merchant_id, payment_id, revenue_at_risk, recovery_probability, diagnosis, status, created_at, updated_at, recovered_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9)
        `, [
          rcid, merchantId, pid, amount, Math.floor(Math.random() * 60) + 30, failureReason, state.status, createdAt, state.recovered ? createdAt : null
        ]);

        if (state.status !== 'ANALYZING') {
          // Agent Decision
          const adid = generateUUID();
          await client.query(`
            INSERT INTO agent_decisions (id, recovery_case_id, diagnosis, reasoning, recovery_probability, recommended_action, confidence, model, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            adid, rcid, failureReason, 'AI matched 14 similar past failures; routing change recommended.', 85.5, 'RETRY_PAYMENT', 94.2, 'nolan-v2', new Date(createdAt.getTime() + 400)
          ]);

          // Policy Decision
          const pdid = generateUUID();
          await client.query(`
            INSERT INTO policy_decisions (id, recovery_case_id, agent_decision_id, action, allowed, reason, rule, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            pdid, rcid, adid, 'RETRY_PAYMENT', true, 'All policy checks passed.', JSON.stringify(['fraud_check_pass', 'velocity_limit_ok']), new Date(createdAt.getTime() + 800)
          ]);

          // Recovery Action
          const raid = generateUUID();
          await client.query(`
            INSERT INTO recovery_actions (id, recovery_case_id, policy_decision_id, type, status, result, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            raid, rcid, pdid, 'RETRY_PAYMENT', state.actionStatus, state.actionStatus === 'SUCCESS' ? 'Captured on Stripe' : 'Failed on retry', new Date(createdAt.getTime() + 1200)
          ]);

          // Audit Event
          await client.query(`
            INSERT INTO audit_events (merchant_id, recovery_case_id, entity_type, entity_id, event_type, actor, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [
            merchantId, rcid, 'RECOVERY_ACTION', raid, 'ACTION_EXECUTED', 'POLICY_ENGINE', JSON.stringify({ action: 'RETRY_PAYMENT', status: state.actionStatus }), new Date(createdAt.getTime() + 1500)
          ]);
        }
        
        // Webhook Event
        await client.query(`
          INSERT INTO webhook_events (merchant_id, event_id, event_type, payload, processed, created_at)
          VALUES ($1, $2, $3, $4, true, $5)
        `, [
          merchantId, 'evt_' + generateUUID().substring(0, 8), 'payment.failed', JSON.stringify({ payment_id: pid, error: failureReason }), createdAt
        ]);
      }
    }

    await client.query('COMMIT');
    console.log("Master seed completed successfully!");
  } catch(e) { 
    await client.query('ROLLBACK');
    console.error("Master seed failed:", e); 
  } finally { 
    client.release();
    await pool.end(); 
  }
}

seed();
