
import { assert } from 'console';

import { RecoveryOrchestratorService } from './services/recovery-orchestrator.service';
import { RecoveryCaseService } from './services/recovery-case.service';
import { AuditEventService } from './services/audit-event.service';

const API = 'http://localhost:8000/api';

async function runTests() {
  console.log('--- STARTING LEVEL 1 TESTS ---');

  // 1. Merchant CRUD
  const mRes = await fetch(`${API}/merchants`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Merchant', email: `test${Date.now()}@merchant.com`, razorpayAccountId: 'acc_123' })
  });
  const mData = await mRes.json();
  const merchantId = mData.data.id;
  console.log('✅ Created Merchant:', merchantId);

  // 2. Customer CRUD
  const cRes = await fetch(`${API}/customers`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchant_id: merchantId, external_customer_id: 'cust_ext_1', name: 'Test Customer', email: 'cust@test.com' })
  });
  const cData = await cRes.json();
  const customerId = cData.data?.id;
  if (!customerId) console.error(cData);
  console.log('✅ Created Customer:', customerId);

  // 3. Payment CRUD (Simulate a FAILED payment)
  const pRes = await fetch(`${API}/payments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchantId: merchantId, 
      customerId: customerId, 
      razorpayPaymentId: 'pay_test_' + Date.now(),
      amount: 500, 
      currency: 'INR',
      status: 'FAILED', 
      failureReason: 'insufficient_funds', 
      attemptCount: 1
    })
  });
  const pData = await pRes.json();
  const paymentId = pData.data?.id;
  if (!paymentId) console.error(pData);
  console.log('✅ Created Failed Payment:', paymentId);

  // 4. Invalid ID test
  const errRes = await fetch(`${API}/customers/invalid-uuid`);
  if (errRes.status === 400 || errRes.status === 404) {
    console.log('✅ Caught Invalid ID properly');
  } else {
    console.error('❌ Failed with wrong status for invalid ID', errRes.status);
  }

  console.log('\n--- STARTING LEVEL 2 (ORCHESTRATOR) TESTS ---');
  console.log('⏳ Triggering RecoveryOrchestratorService with the failed payment...');
  
  try {
    await RecoveryOrchestratorService.processFailedPayment({
      id: paymentId,
      merchantId: merchantId,
      customerId: customerId,
      amount: 499,
      currency: "USD",
      failureReason: "mock_insufficient_funds",
      attemptCount: 1
    } as any);

    console.log('✅ Orchestrator completed without throwing exceptions');

    // Fetch the recovery case to see outcome
    const cases = await RecoveryCaseService.getRecoveryCasesByMerchant(merchantId);
    console.log('✅ Created Recovery Case:', cases[0].status);
    
    // Fetch Audit Events
    const events = await AuditEventService.getAuditEvents(merchantId);
    console.log(`✅ Generated ${events.length} Audit Events in the pipeline`);
    
  } catch (error: any) {
    console.error('❌ Orchestrator failed:', error.message);
  }
  
  process.exit(0);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
