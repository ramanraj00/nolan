import express, { Request, Response } from 'express';
import { pool } from '../db';
import { customerSchema } from '../validators/customerValidator';

const router = express.Router();

// ==========================================
// CREATE A NEW CUSTOMER (POST Request)
// ==========================================
// Purpose: To register a new customer strictly under a specific merchant.
// Flow: Check merchant exists -> Validate customer data -> Create customer
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate incoming data (Zod handles required fields like merchant_id, name, external_customer_id)
    const validationResult = customerSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const { merchant_id, external_customer_id, name, email, phone } = validationResult.data;

    // 2. IMPORTANT: Check if the merchant exists and is active.
    // Customers cannot be created globally; they must belong to a valid merchant context.
    const merchantCheckQuery = `SELECT user_id FROM merchants WHERE user_id = $1 AND status != 'inactive'`;
    const merchantCheck = await pool.query(merchantCheckQuery, [merchant_id]);

    if (merchantCheck.rows.length === 0) {
      res.status(404).json({ 
        error: 'Merchant not found or is deactivated. A customer must be created under a valid merchant.' 
      });
      return;
    }

    // 3. Insert customer into database
    // Mapping the result to camelCase dynamically so the frontend gets a clean response
    const query = `
      INSERT INTO customers (merchant_id, external_customer_id, name, email, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id, 
        merchant_id as "merchantId", 
        external_customer_id as "externalCustomerId", 
        name, 
        email, 
        phone, 
        status,
        lifetime_value as "lifetimeValue", 
        total_payments as "totalPayments",
        successful_payments as "successfulPayments",
        failed_payments as "failedPayments",
        created_at as "createdAt", 
        updated_at as "updatedAt";
    `;
    const values = [merchant_id, external_customer_id, name, email, phone];

    const dbResult = await pool.query(query, values);

    // 4. Return successful response
    res.status(201).json({
      message: 'Customer successfully registered under merchant',
      data: dbResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating customer:', error);

    // Handle unique constraint violation (duplicate customer for merchant)
    if (error.code === '23505') {
       res.status(409).json({ error: 'Customer already exists for this merchant' });
       return;
    }

    // Handle invalid UUID error from PostgreSQL
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid ID format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while creating the customer' });
  }
});

// ==========================================
// VIEW CUSTOMERS FOR A SPECIFIC MERCHANT (GET Request)
// ==========================================
// Purpose: Fetch the list of customers that belong to a specific merchant.
// Rule Followed: Must pass ?merchant_id=... to prevent fetching massive global lists (50k+ customers)
// Example: GET /customers?merchant_id=merchant_123
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchant_id = req.query.merchant_id as string;

    // 1. Enforce that merchant_id is strictly required
    // We never want to accidentally dump all customers from all merchants.
    if (!merchant_id) {
      res.status(400).json({ 
        error: 'merchant_id is required as a query parameter (e.g., /customers?merchant_id=uuid)' 
      });
      return;
    }

    // 2. Build the secure dynamic query
    // Filtering exactly for this merchant and aliasing columns to camelCase for the API response.
    const query = `
      SELECT 
        id, 
        merchant_id as "merchantId", 
        external_customer_id as "externalCustomerId", 
        name, 
        email, 
        phone, 
        status,
        lifetime_value as "lifetimeValue", 
        total_payments as "totalPayments",
        successful_payments as "successfulPayments",
        failed_payments as "failedPayments",
        created_at as "createdAt", 
        updated_at as "updatedAt"
      FROM customers
      WHERE merchant_id = $1
      ORDER BY created_at DESC;
    `;
    
    // 3. Execute the query
    const dbResult = await pool.query(query, [merchant_id]);

    // 4. Send back the isolated customer list
    res.status(200).json(dbResult.rows);
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    
    // Handle invalid UUID error from PostgreSQL
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid merchant_id format provided' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching customers' });
  }
});

// ==========================================
// VIEW A SPECIFIC CUSTOMER (GET Request)
// ==========================================
// Purpose: To fetch a specific customer using their ID.
// Why we need this: So we can load the full profile of a single customer, 
// which acts as the base to check all their payment and recovery history.
// Example: GET /customers/customer_123
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = String(req.params.id);

    // 1. Fetch the specific customer dynamically
    // We fetch all fields. Aliasing to camelCase to keep responses strictly consistent with frontend.
    const query = `
      SELECT 
        id, 
        merchant_id as "merchantId", 
        external_customer_id as "externalCustomerId", 
        name, 
        email, 
        phone, 
        status,
        lifetime_value as "lifetimeValue", 
        total_payments as "totalPayments",
        successful_payments as "successfulPayments",
        failed_payments as "failedPayments",
        created_at as "createdAt", 
        updated_at as "updatedAt"
      FROM customers
      WHERE id = $1;
    `;
    
    // 2. Execute query
    const dbResult = await pool.query(query, [customerId]);

    // 3. Check if customer exists
    if (dbResult.rows.length === 0) {
       res.status(404).json({ error: 'Customer not found' });
       return;
    }

    // 4. Return the specific customer
    res.status(200).json(dbResult.rows[0]);
  } catch (error: any) {
    console.error('Error fetching specific customer:', error);
    
    // Handle invalid UUID error from PostgreSQL
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Customer ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while fetching the customer' });
  }
});

// ==========================================
// UPDATE SPECIFIC CUSTOMER (PATCH Request)
// ==========================================
// Purpose: To partially update a customer (e.g., only updating email or phone).
// Why: If a customer changes their email, we only update the email without needing the whole object.
// Flow: PATCH /customers/:id -> Updated customer
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = String(req.params.id);

    // 1. Validate the incoming data dynamically allowing partial fields
    const validationResult = customerSchema.partial().safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid input data',
        details: validationResult.error.format(),
      });
      return;
    }

    const updates = validationResult.data;

    // 2. Explicit mapping of allowed columns (Security Best Practice)
    // We intentionally exclude financial metrics (lifetimeValue, successfulPayments, etc.) 
    // because they should be driven by payment logic, not direct manual updates!
    const columnMap: Record<string, string> = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      externalCustomerId: 'external_customer_id',
    };

    // Filter out any keys that are not in our explicit map
    const updateKeys = Object.keys(updates).filter((key) => columnMap[key]);

    if (updateKeys.length === 0) {
      res.status(400).json({ error: 'No valid fields provided to update' });
      return;
    }

    // 3. Dynamically build the SQL UPDATE query
    const setClauses = updateKeys.map((key, index) => `${columnMap[key]} = $${index + 1}`);
    const values = updateKeys.map((key) => (updates as any)[key]);
    
    // Add the customerId as the last parameter
    values.push(customerId);
    
    const query = `
      UPDATE customers 
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING 
        id, 
        merchant_id as "merchantId", 
        external_customer_id as "externalCustomerId", 
        name, 
        email, 
        phone, 
        status,
        lifetime_value as "lifetimeValue", 
        total_payments as "totalPayments",
        successful_payments as "successfulPayments",
        failed_payments as "failedPayments",
        created_at as "createdAt", 
        updated_at as "updatedAt";
    `;

    // 4. Execute the query
    const dbResult = await pool.query(query, values);

    if (dbResult.rows.length === 0) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // 5. Send back the updated customer object
    res.status(200).json({
      message: 'Customer updated successfully',
      data: dbResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating specific customer:', error);

    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Customer ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while updating the customer' });
  }
});

// ==========================================
// SOFT DELETE CUSTOMER (DELETE Request)
// ==========================================
// Purpose: To safely deactivate a customer without destroying historical data.
// Reason: Customers have Payments, Recovery Cases, and Audit Events linked to them.
// Hard deleting them would break data integrity. We use soft deletion (status = 'inactive').
// Flow: DELETE /customers/:id -> Customer deactivated -> Data remains
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = String(req.params.id);
    const deactivatedStatus = 'inactive';

    // 1. Dynamic UPDATE query for Soft Delete
    // This simply marks the customer as inactive while preserving all historical references.
    const query = `
      UPDATE customers 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING 
        id, 
        merchant_id as "merchantId", 
        external_customer_id as "externalCustomerId", 
        name, 
        email, 
        phone, 
        status,
        lifetime_value as "lifetimeValue", 
        total_payments as "totalPayments",
        successful_payments as "successfulPayments",
        failed_payments as "failedPayments",
        created_at as "createdAt", 
        updated_at as "updatedAt";
    `;

    // 2. Execute dynamic query
    const dbResult = await pool.query(query, [deactivatedStatus, customerId]);

    // 3. Handle non-existent customer
    if (dbResult.rows.length === 0) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // 4. Return success response with deactivated customer
    res.status(200).json({
      message: 'Customer deactivated safely',
      data: dbResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error deactivating customer:', error);

    // Handle invalid UUID error
    if (error.code === '22P02') {
       res.status(400).json({ error: 'Invalid Customer ID format' });
       return;
    }

    res.status(500).json({ error: 'Internal server error while deactivating the customer' });
  }
});

export default router;
