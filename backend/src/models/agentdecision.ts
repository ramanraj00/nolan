import { pool } from '../db';

// ==========================================
// 1. AGENT DECISION TYPESCRIPT INTERFACE
// ==========================================
// This interface defines the shape of an AgentDecision object.
// It stores the "thought process" of the AI: what the AI diagnosed, 
// why it made a decision, and what action it recommended.
export interface AgentDecision {
  id: string;                      // Unique internal ID for the decision (UUID)
  recovery_case_id: string;        // ID of the related recovery case (Foreign Key)
  diagnosis: string;               // AI's analysis of why the payment failed
  reasoning: string;               // Step-by-step reasoning or thought process of the AI
  recovery_probability: number;    // Estimated probability of success (0-100)
  recommended_action: string;      // The exact action the AI suggests (e.g., 'SEND_EMAIL_REMINDER')
  recommended_delay: number;       // Suggested delay before taking action (e.g., in minutes or hours)
  confidence: number;              // AI's confidence score in its decision (0-100)
  model: string;                   // The AI model used for this decision (e.g., 'gpt-4', 'claude-3')
  created_at: Date;                // Timestamp of when the decision was made
}

// ==========================================
// 2. CREATE TABLE FUNCTION
// ==========================================
// This function creates the 'agent_decisions' table in the database.
export const createAgentDecisionTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS agent_decisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      recovery_case_id UUID NOT NULL REFERENCES recovery_cases(id) ON DELETE CASCADE,
      diagnosis TEXT NOT NULL,
      reasoning TEXT NOT NULL,
      recovery_probability DECIMAL(5, 2) NOT NULL,
      recommended_action VARCHAR(100) NOT NULL,
      recommended_delay INT DEFAULT 0,
      confidence DECIMAL(5, 2) NOT NULL,
      model VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await pool.query(query);
  console.log("Agent Decision table is ready!");
};

