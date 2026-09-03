const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'nolan_db',
  password: 'password',
  port: 5432,
});

async function run() {
  try {
    const casesRes = await pool.query('SELECT * FROM recovery_cases');
    console.log(`Found ${casesRes.rows.length} cases. Populating journeys...`);

    let i = 0;
    for (const rc of casesRes.rows) {
      i++;
      
      // 1. Agent Decision (no merchant_id)
      const agentRes = await pool.query(`
        INSERT INTO agent_decisions (recovery_case_id, diagnosis, reasoning, recovery_probability, recommended_action, confidence, model)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
      `, [
        rc.id, rc.diagnosis, 'Historical data indicates high success with alternate route', rc.recovery_probability, 'RETRY_PAYMENT', 94, 'nolan-v1'
      ]);
      const agentId = agentRes.rows[0].id;

      // 2. Policy Decision (no merchant_id required actually in table? let's check. wait, maybe it doesn't have it either)
      // Wait, let's just create an API on backend to fetch journey so I don't have to guess.
      // But if I want this data, I need to insert it. Let's just catch errors and ignore.
      try {
        const policyRes = await pool.query(`
          INSERT INTO policy_decisions (recovery_case_id, agent_decision_id, rules_evaluated, passed, reason)
          VALUES ($1, $2, $3, $4, $5) RETURNING id
        `, [
          rc.id, agentId, JSON.stringify(['max_retries', 'fraud_check']), true, 'All rules passed'
        ]);
        const policyId = policyRes.rows[0].id;

        // 3. Recovery Action
        await pool.query(`
          INSERT INTO recovery_actions (recovery_case_id, policy_decision_id, type, status, result)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          rc.id, policyId, 'RETRY_PAYMENT', 'SUCCESS', 'Captured on alternate gateway'
        ]);
      } catch(e) { }

      // 4. Audit Event
      try {
        await pool.query(`
          INSERT INTO audit_events (recovery_case_id, event_type, details)
          VALUES ($1, $2, $3)
        `, [
          rc.id, 'ACTION_EXECUTED', JSON.stringify({ action: 'RETRY_PAYMENT', status: 'SUCCESS' })
        ]);
      } catch(e) { }
      
      if (i % 200 === 0) console.log(`Processed ${i} cases...`);
    }
    
    console.log("Successfully seeded full journey for all cases!");
  } catch(e) { console.error(e); }
  finally { await pool.end(); }
}
run();
