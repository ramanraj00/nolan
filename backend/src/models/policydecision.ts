import { pool } from '../db';

// ==========================================
// 1. POLICY DECISION TYPESCRIPT INTERFACE
// ==========================================
// This interface defines the shape of a PolicyDecision object.
// The Policy Engine has the ultimate authority. The flow is:
// [AI Recommendation] -> [Policy Decision] -> [Execution].
// This table records whether the AI's suggested action was allowed or denied, and why.
export interface PolicyDecision {
  id: string;                      // Unique internal ID for the policy decision (UUID)
  recovery_case_id: string;        // ID of the related recovery case (Foreign Key)
  agent_decision_id: string;       // ID of the AI's decision being evaluated (Foreign Key)
  action: string;                  // The specific action being evaluated (e.g., 'RETRY_PAYMENT')
  allowed: boolean;                // YES/NO if the policy engine allowed the action
  reason: string;                  // Human-readable reason (e.g., "Attempt count < 2, Amount < ₹25,000")
  rule: string;                    // The specific policy rule that was triggered/matched
  requires_approval: boolean;      // True if the action needs a human to manually approve it
  created_at: Date;                // Timestamp of when the policy decision was made
}

// ==========================================
// 2. CREATE TABLE FUNCTION
// ==========================================
// This function creates the 'policy_decisions' table in the database.
export const createPolicyDecisionTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS policy_decisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recovery_case_id UUID NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
      agent_decision_id UUID NOT NULL REFERENCES agent_decisions(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      allowed BOOLEAN NOT NULL,
      reason TEXT NOT NULL,
      rule VARCHAR(255) NOT NULL,
      requires_approval BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await pool.query(query);
  console.log("Policy Decision table is ready!");
};

