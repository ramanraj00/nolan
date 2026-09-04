import re

with open('backend/src/seed-demo-batch.ts', 'r') as f:
    content = f.read()

old_insert = """
    await pool.query(
      `INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, status, failure_reason, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [paymentId, merchantId, customerId, rzpId, amount, finalPaymentStatus, reasonObj.code, createdAt, updatedAt]
    );
"""
new_insert = """
    await pool.query(
      `INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, status, failure_reason, created_at, recovered_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [paymentId, merchantId, customerId, rzpId, amount, finalPaymentStatus, reasonObj.code, createdAt, targetOutcome === 'RECOVERED' ? updatedAt : null]
    );
"""

# Since I used sed to remove `updated_at`, the file currently has:
# `INSERT INTO payments (id, merchant_id, customer_id, razorpay_payment_id, amount, status, failure_reason, created_at) 
# VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
# Let's just rewrite the script completely to be safe.
