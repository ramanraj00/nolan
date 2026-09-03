const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'nolan_db',
  password: 'password',
  port: 5432,
});

const names = [
  "Raman Raj", "Aisha Khan", "Vikram Singh", "Priya Sharma", 
  "Rahul Desai", "Ananya Patel", "Kabir Kapoor", "Neha Gupta",
  "Rohan Mehra", "Zara Ali", "Aryan Joshi", "Kavya Iyer"
];

const diagnoses = [
  "Insufficient Funds", 
  "Card Expired", 
  "Network Timeout", 
  "Suspected Fraud", 
  "Issuer Declined", 
  "Authentication Failed",
  "Card Blocked",
  "Daily Limit Exceeded"
];

const statuses = [
  "OPEN", "ANALYZING", "ACTION_PENDING", "IN_PROGRESS", 
  "RECOVERED", "ESCALATED", "STOPPED", "UNRECOVERABLE"
];

async function updateDB() {
  try {
    // 1. Update Customers with realistic names
    const customersRes = await pool.query('SELECT id FROM customers');
    for (let i = 0; i < customersRes.rows.length; i++) {
      const row = customersRes.rows[i];
      const name = names[i % names.length];
      await pool.query('UPDATE customers SET name = $1 WHERE id = $2', [name, row.id]);
    }
    console.log(`Updated ${customersRes.rowCount} customers with realistic names.`);

    // 2. Update Recovery Cases with realistic diagnosis and probability
    const casesRes = await pool.query('SELECT id FROM recovery_cases');
    for (let i = 0; i < casesRes.rows.length; i++) {
      const row = casesRes.rows[i];
      const diagnosis = diagnoses[i % diagnoses.length];
      const probability = Math.floor(Math.random() * 80) + 15; // 15% to 95%
      const status = statuses[i % statuses.length];
      
      await pool.query(
        'UPDATE recovery_cases SET diagnosis = $1, recovery_probability = $2, status = $3 WHERE id = $4',
        [diagnosis, probability, status, row.id]
      );
    }
    console.log(`Updated ${casesRes.rowCount} recovery cases with realistic diagnosis and probabilities.`);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

updateDB();
