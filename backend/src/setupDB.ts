import { createMerchantTable } from './models/merchant';
import { createCustomerTable } from './models/customer';
import { createPaymentTable } from './models/payment';
import { createRecoveryCaseTable } from './models/recoverycase';
import { createAgentDecisionTable } from './models/agentdecision';
import { createPolicyDecisionTable } from './models/policydecision';
import { createRecoveryActionTable } from './models/recoveryaction';
import { createAuditEventTable } from './models/auditevent';
import { createWebhookEventTable } from './models/webhookevent';

async function init() {
  try {
    await createMerchantTable();
    await createCustomerTable();
    await createPaymentTable();
    await createRecoveryCaseTable();
    await createAgentDecisionTable();
    await createPolicyDecisionTable();
    await createRecoveryActionTable();
    await createAuditEventTable();
    await createWebhookEventTable();
    console.log('All tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

init();

