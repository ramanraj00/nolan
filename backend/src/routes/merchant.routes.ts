import express, { Request, Response } from 'express';
import { pool } from '../db';
import { merchantSchema } from '../validators/merchantValidator';

const router = express.Router();

// ==========================================
// CREATE A NEW MERCHANT (POST Request)
// ==========================================
// Purpose: Register a new merchant in our system using data from the frontend.
// Example Payload:
// {
//   "name": "Acme Store",
//   "email": "owner@acme.com",
//   "razorpay_account_id": "acc_12345",
//   "status": "active"
// }
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate the dynamic data coming from the frontend using Zod
    const validationResult = merchantSchema.safeParse(req.body);

    if (!validationResult.success) {
      // If validation fails, return a 400 Error with the exact issues
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    // 2. Destructure the validated dynamic data
    const { name, email, razorpay_account_id, status } = validationResult.data;

    // 3. Write a parameterized SQL query to prevent SQL Injection
    // user_id, created_at, and updated_at are generated automatically by PostgreSQL
    const query = `
      INSERT INTO merchants (name, email, razorpay_account_id, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [name, email, razorpay_account_id, status];

    // 4. Execute the query
    const dbResult = await pool.query(query, values);

    // 5. Send back the newly created merchant data to the frontend
    res.status(201).json({
      message: 'Merchant registered successfully',
      data: dbResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating merchant:', error);

    // Handle potential Postgres duplicate email error (Unique Violation - code 23505)
    if (error.code === '23505') {
       res.status(409).json({ error: 'A merchant with this email already exists' });
       return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// VIEW ALL MERCHANTS (GET Request)
// ==========================================
// Purpose: To view all registered merchants.
// Usefulness: Admin dashboard, Merchant management, Internal operations, Testing
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Fetch all merchants from the database dynamically
    // No hardcoded data here, returning exactly what is in the PostgreSQL table.
    const query = `
      SELECT 
        user_id as id, 
        name, 
        email, 
        razorpay_account_id, 
        status, 
        created_at, 
        updated_at 
      FROM merchants
      ORDER BY created_at DESC;
    `;
    
    // 2. Execute the query
    const dbResult = await pool.query(query);

    // 3. Send back the array of merchants to the frontend
    res.status(200).json(dbResult.rows);
  } catch (error: any) {
    console.error('Error fetching merchants:', error);
    res.status(500).json({ error: 'Internal server error while fetching merchants' });
  }
});

// ==========================================
// VIEW A SPECIFIC MERCHANT (GET Request)
// ==========================================
// Purpose: To view ONE specific merchant using their unique ID.
// Flow: GET /merchants/:id -> ONE merchant
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = String(req.params.id);

    // 1. Fetch the specific merchant dynamically from the database
    // Using parameterized queries ($1) to fetch by ID safely.
    // Also aliasing columns (like razorpay_account_id to "razorpayAccountId") to exactly match frontend requirements.
    const query = `
      SELECT 
        user_id as id, 
        name, 
        email, 
        razorpay_account_id as "razorpayAccountId", 
        status, 
        created_at, 
        updated_at 
      FROM merchants
      WHERE user_id = $1;
    `;
    
    // 2. Execute the query with dynamic merchantId
    const dbResult = await pool.query(query, [merchantId]);

    // 3. Check if the merchant exists
    if (dbResult.rows.length === 0) {
       res.status(404).json({ error: 'Merchant not found' });
       return;
    }

    // 4. Send back the exactly matched single merchant object
    res.status(200).json(dbResult.rows[0]);
  } catch (error: any) {
    console.error('Error fetching specific merchant:', error);
    
    // Handle invalid UUID error from PostgreSQL (code 22P02)
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Merchant ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching the merchant' });
  }
});

// ==========================================
// UPDATE SPECIFIC MERCHANT (PATCH Request)
// ==========================================
// Purpose: To partially update a merchant (e.g., only updating email without sending name again).
// Flow: PATCH /merchants/:id -> Updated merchant
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = String(req.params.id);

    // 1. Validate the incoming data dynamically allowing partial fields
    // .partial() makes all fields in the schema optional, exactly what we need for a PATCH route.
    const validationResult = merchantSchema.partial().safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const updates = validationResult.data;

    // 2. Check if there are actually any fields to update
    const updateKeys = Object.keys(updates);
    if (updateKeys.length === 0) {
      res.status(400).json({ error: 'No fields provided to update' });
      return;
    }

    // 3. Dynamically build the SQL UPDATE query
    // Example: SET email = $1, status = $2
    const setClauses = updateKeys.map((key, index) => `${key} = $${index + 1}`);
    const values = Object.values(updates);
    
    // Add the merchantId as the last parameter for the WHERE clause
    values.push(merchantId);
    
    const query = `
      UPDATE merchants 
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $${values.length}
      RETURNING 
        user_id as id, 
        name, 
        email, 
        razorpay_account_id as "razorpayAccountId", 
        status, 
        created_at, 
        updated_at;
    `;

    // 4. Execute the dynamic query
    const dbResult = await pool.query(query, values);

    if (dbResult.rows.length === 0) {
      res.status(404).json({ error: 'Merchant not found' });
      return;
    }

    // 5. Send back the updated merchant object
    res.status(200).json({
      message: 'Merchant updated successfully',
      data: dbResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating specific merchant:', error);

    // Handle invalid UUID error
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Merchant ID format' });
       return;
    }
    
    // Handle unique email conflict
    if (error.code === '23505') {
       res.status(409).json({ error: 'A merchant with this email already exists' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while updating the merchant' });
  }
});

// ==========================================
// SOFT DELETE MERCHANT (DELETE Request)
// ==========================================
// Purpose: To "delete" a merchant safely.
// Precaution: We don't do hard deletes because they have Customers, Payments, etc. linked.
// Action: We do a SOFT DELETE by changing their status to 'inactive'.
// Flow: DELETE /merchants/:id -> Merchant deactivated -> Data remains intact
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = String(req.params.id);
    const deactivatedStatus = 'inactive';

    // 1. Run dynamic UPDATE query to soft-delete
    // We update the status to 'inactive' so we preserve all related Audit, Payment, and Case history.
    const query = `
      UPDATE merchants 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
      RETURNING 
        user_id as id, 
        name, 
        email, 
        razorpay_account_id as "razorpayAccountId", 
        status, 
        created_at, 
        updated_at;
    `;

    // 2. Execute query dynamically
    const dbResult = await pool.query(query, [deactivatedStatus, merchantId]);

    if (dbResult.rows.length === 0) {
      res.status(404).json({ error: 'Merchant not found' });
      return;
    }

    // 3. Return the deactivated merchant
    res.status(200).json({
      message: 'Merchant successfully deactivated (soft deleted)',
      data: dbResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error deactivating merchant:', error);

    // Handle invalid UUID error
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Merchant ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while deleting the merchant' });
  }
});

export default router;
