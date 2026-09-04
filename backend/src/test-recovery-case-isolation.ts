import { pool } from "./db";
import { RecoveryCaseService } from "./services/recovery-case.service";

async function run() {
  console.log("\n==========================================");
  console.log("  RECOVERY CASE MERCHANT ISOLATION TEST");
  console.log("==========================================\n");

  try {
    const existing = await pool.query<{
      id: string;
      merchant_id: string;
    }>(`
      SELECT id, merchant_id
      FROM recovery_cases
      LIMIT 1
    `);

    if (existing.rowCount === 0) {
      throw new Error(
        "No recovery_cases exist. Run the existing seed/golden-path test first."
      );
    }

    const caseId = existing.rows[0].id;
    const ownerMerchantId = existing.rows[0].merchant_id;

    console.log(`[1] Using existing RecoveryCase: ${caseId}`);
    console.log(`[2] Owner merchant: ${ownerMerchantId}`);

    const { randomUUID } = require("crypto");
    const attackerMerchantId = randomUUID();

    console.log("\n[3] Cross-merchant access attempt...");

    const crossMerchantResult =
      await RecoveryCaseService.getRecoveryCaseById(
        caseId,
        attackerMerchantId
      );

    if (crossMerchantResult !== null) {
      console.error(
        "❌ SECURITY FAILURE: Another merchant accessed the case!"
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      "✅ Cross-merchant access correctly rejected (null)"
    );

    console.log("\n[4] Owner merchant access attempt...");

    const ownerResult =
      await RecoveryCaseService.getRecoveryCaseById(
        caseId,
        ownerMerchantId
      );

    if (!ownerResult) {
      console.error(
        "❌ OWNER ACCESS FAILURE: Case owner could not access its own case!"
      );
      process.exitCode = 1;
      return;
    }

    console.log("✅ Owner merchant can access its own case");

    console.log("\n==========================================");
    console.log("✅ MERCHANT ISOLATION TEST PASSED");
    console.log("==========================================\n");
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();

