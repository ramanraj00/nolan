import { AiAgentService } from './src/services/ai-agent.service';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const res = await AiAgentService.analyzeFailure(
      { amount: 100, currency: "USD", failureReason: "insufficient_funds", attemptCount: 1 },
      { lifetimeValue: 500, failedPayments: 1, successfulPayments: 10 },
      "test-rc-id"
    );
    console.log("Success:", res);
  } catch(e) {
    console.error("Error calling AI:", e);
  }
}
run();
