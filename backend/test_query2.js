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
        (
          SELECT json_build_object(
            'id', pd.id,
            'rulesEvaluated', pd.rule,
            'passed', pd.allowed,
            'reason', pd.reason,
            'createdAt', pd.created_at
          )
          FROM policy_decisions pd WHERE pd.recovery_case_id = rc.id ORDER BY pd.created_at DESC LIMIT 1
        ) as "policyDecision"
      FROM recovery_cases rc LIMIT 1;
    `);
    console.log(res.rows);
  } catch(e) { console.error(e); }
  finally { await pool.end(); }
}
run();
