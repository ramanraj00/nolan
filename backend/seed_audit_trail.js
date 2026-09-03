const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'nolan_db', password: 'password', port: 5432 });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT id, merchant_id, status FROM recovery_cases LIMIT 3");
    
    for (const rc of res.rows) {
      const caseId = rc.id;
      const mid = rc.merchant_id;
      
      const timeBase = new Date().getTime();
      let step = 0;
      const t = () => new Date(timeBase - ((10 - step++) * 3600000)); // distribute over the past 10 hours
      
      await client.query("INSERT INTO audit_events (merchant_id, recovery_case_id, entity_type, entity_id, event_type, actor, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
        [mid, caseId, 'RECOVERY_CASE', caseId, 'REVENUE_RISK_DETECTED', 'SYSTEM', JSON.stringify({ reason: 'Payment failure webhook received' }), t()]);
        
      await client.query("INSERT INTO audit_events (merchant_id, recovery_case_id, entity_type, entity_id, event_type, actor, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
        [mid, caseId, 'AGENT_DECISION', caseId, 'AI_ANALYSIS_COMPLETED', 'AI_AGENT', JSON.stringify({ diagnosis: 'Insufficient Funds', recommended_action: 'RETRY_PAYMENT' }), t()]);
        
      await client.query("INSERT INTO audit_events (merchant_id, recovery_case_id, entity_type, entity_id, event_type, actor, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
        [mid, caseId, 'POLICY_DECISION', caseId, 'POLICY_EVALUATED', 'POLICY_ENGINE', JSON.stringify({ rule_matched: 'fraud_check_pass', allowed: true }), t()]);
        
      await client.query("INSERT INTO audit_events (merchant_id, recovery_case_id, entity_type, entity_id, event_type, actor, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
        [mid, caseId, 'RECOVERY_ACTION', caseId, 'ACTION_APPROVED', 'POLICY_ENGINE', JSON.stringify({ action: 'RETRY_PAYMENT', requires_approval: false }), t()]);
        
      await client.query("INSERT INTO audit_events (merchant_id, recovery_case_id, entity_type, entity_id, event_type, actor, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
        [mid, caseId, 'RECOVERY_ACTION', caseId, 'ACTION_EXECUTED', 'SYSTEM', JSON.stringify({ status: 'EXECUTING', scheduled: true }), t()]);
        
      if (rc.status === 'RECOVERED') {
        await client.query("INSERT INTO audit_events (merchant_id, recovery_case_id, entity_type, entity_id, event_type, actor, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
          [mid, caseId, 'RECOVERY_CASE', caseId, 'PAYMENT_RECOVERED', 'SYSTEM', JSON.stringify({ captured_amount: 1000 }), t()]);
      } else if (rc.status === 'ESCALATED') {
        await client.query("INSERT INTO audit_events (merchant_id, recovery_case_id, entity_type, entity_id, event_type, actor, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
          [mid, caseId, 'RECOVERY_CASE', caseId, 'RECOVERY_ESCALATED', 'HUMAN', JSON.stringify({ reason: 'Fraud suspected' }), t()]);
      } else {
        await client.query("INSERT INTO audit_events (merchant_id, recovery_case_id, entity_type, entity_id, event_type, actor, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", 
          [mid, caseId, 'RECOVERY_CASE', caseId, 'RECOVERY_STOPPED', 'SYSTEM', JSON.stringify({ reason: 'Max retries reached' }), t()]);
      }
    }
    console.log("Seeded detailed audit trail");
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
