import { pool } from '../db';

export class CustomerService {
  static async createCustomer(data: {
    merchant_id: string;
    external_customer_id: string;
    name: string;
    email?: string;
    phone?: string;
  }) {
    // Check if the merchant exists and is active.
    const merchantCheckQuery = `SELECT user_id FROM merchants WHERE user_id = $1 AND status != 'inactive'`;
    const merchantCheck = await pool.query(merchantCheckQuery, [data.merchant_id]);

    if (merchantCheck.rows.length === 0) {
      throw new Error('MERCHANT_NOT_FOUND');
    }

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
    const values = [data.merchant_id, data.external_customer_id, data.name, data.email || null, data.phone || null];
    const dbResult = await pool.query(query, values);
    return dbResult.rows[0];
  }

  static async getCustomersByMerchant(merchant_id: string) {
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
    const dbResult = await pool.query(query, [merchant_id]);
    return dbResult.rows;
  }

  static async getCustomerById(customerId: string) {
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
    const dbResult = await pool.query(query, [customerId]);
    return dbResult.rows.length > 0 ? dbResult.rows[0] : null;
  }

  static async updateCustomer(customerId: string, updates: any, updateKeys: string[], columnMap: Record<string, string>) {
    const setClauses = updateKeys.map((key, index) => `${columnMap[key]} = $${index + 1}`);
    const values = updateKeys.map((key) => updates[key]);
    
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

    const dbResult = await pool.query(query, values);
    return dbResult.rows.length > 0 ? dbResult.rows[0] : null;
  }

  static async softDeleteCustomer(customerId: string) {
    const deactivatedStatus = 'inactive';
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
    const dbResult = await pool.query(query, [deactivatedStatus, customerId]);
    return dbResult.rows.length > 0 ? dbResult.rows[0] : null;
  }
}

