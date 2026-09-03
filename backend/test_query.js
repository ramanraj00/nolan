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
    const res = await pool.query(`
      SELECT 
        rc.id, 
        (
          SELECT json_build_object(
            'id', ad.id,
            'diagnosis', ad.diagnosis,
            'reasoning', ad.reasoning,
            'recoveryProbability', ad.recovery_probability,
            'recommendedAction', ad.recommended_action,
            'confidence', ad.confidence,
            'createdAt', ad.created_at
          )
          FROM agent_decisions ad WHERE ad.recovery_case_id = rc.id ORDER BY ad.created_at DESC LIMIT 1
        ) as "agentDecision"
      FROM recovery_cases rc LIMIT 1;
    `);
    console.log(res.rows);
  } catch(e) { console.error(e); }
  finally { await pool.end(); }
}
run();
