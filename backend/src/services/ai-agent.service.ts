import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import dotenv from 'dotenv';
import { Payment } from './payment.service';
import { Customer } from './customer.service';

dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY is not set in environment.');
}

// Ensure the API key is provided
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

// The schema the AI must strictly follow
const aiDecisionSchema = z.object({
  diagnosis: z.string().describe("Detailed diagnosis of why the payment failed based on available data."),
  recovery_probability: z.number().min(0).max(1).describe("Probability (0.0 to 1.0) of successful recovery."),
  recommended_action: z.enum([
    'RETRY_PAYMENT', 
    'REQUEST_PAYMENT_METHOD_UPDATE', 
    'SEND_CHECKOUT_RECOVERY', 
    'RETRY_SUBSCRIPTION', 
    'SEND_PAYMENT_REMINDER', 
    'ESCALATE_HUMAN', 
    'STOP_RECOVERY'
  ]).describe("The best automated or manual action to take next."),
  recommended_delay: z
    .number()
    .min(0)
    .max(10080)
    .describe("Delay in minutes before executing the action. Must be between 0 and 10080 minutes (7 days)."),
  confidence: z.number().min(0).max(1).describe("AI confidence in this recommendation (0.0 to 1.0)."),
  reasoning: z.string().describe("Concise explanation for this specific recommendation and delay.")
});

export type AiDecision = z.infer<typeof aiDecisionSchema>;

export class AiAgentService {
  /**
   * Analyzes a failed payment context using Gemini and returns a structured recovery strategy.
   */
  static async analyzeFailure(
    payment: Payment,
    customer: Customer | null,
    recoveryCaseId: string
  ): Promise<AiDecision> {
    const prompt = `
    You are an expert Payment Recovery AI Agent for a global merchant platform.
    A payment has failed. Analyze the context and decide the best recovery strategy.

    Payment Context:
    - Amount: ${payment.currency} ${payment.amount}
    - Failure Reason provided by Gateway: "${payment.failureReason || 'Unknown'}"
    - Attempt Count: ${payment.attemptCount}
    
    Customer Context:
    - Customer Lifetime Value: ${customer?.lifetimeValue || 'Unknown'}
    - Previous Failed Payments: ${customer?.failedPayments || 0}
    - Previous Successful Payments: ${customer?.successfulPayments || 0}
    
    Recovery Case ID: ${recoveryCaseId}

    Task:
    Provide a detailed diagnosis, the probability of recovery, the recommended action from the allowed list, the delay in minutes before taking the action, your confidence score, and your reasoning.
    
    Important:
    - You are a recommendation engine, not the final authority.
    - Your output will be evaluated by a separate policy engine before any action is executed.
    - Never assume that your recommended action will be executed.
    - Choose only from the allowed actions provided.
    - Do not invent actions, payment methods, credentials, or gateway capabilities.


    Guidelines:
    - If it's a temporary issue (like insufficient funds), 'RETRY_PAYMENT' with a 24-48h delay is often best.
    - If the card is permanently invalid/expired, 'REQUEST_PAYMENT_METHOD_UPDATE' immediately (0 delay) is best.
    - If it's a high-value customer and the issue is complex, 'ESCALATE_HUMAN' might be required.

    Probability and Confidence Scoring Rules:
    - recovery_probability represents the likelihood that the payment CAN be successfully recovered.
    - confidence represents how certain you are about YOUR recommendation.
    - Both values must be logically consistent with your diagnosis and reasoning.
    - For a first-time payment failure caused by a potentially temporary issue (network timeout, soft decline, insufficient funds on a first attempt), recovery_probability should be between 0.55 and 0.85.
    - For permanent card failures (expired card, invalid card number, stolen card), recovery_probability should be between 0.20 and 0.45.
    - For risk/fraud rejections, recovery_probability should be between 0.10 and 0.30.
    - Do NOT assign extremely low recovery probability (below 0.10) unless there is overwhelming evidence that recovery is impossible.
    - Confidence should typically be between 0.70 and 0.95.

    Scoring Benchmarks:
    | Failure Type            | recovery_probability | confidence |
    |-------------------------|---------------------|------------|
    | Temporary/Network       | 0.65 - 0.85         | 0.75 - 0.90 |
    | Insufficient Funds (1st)| 0.55 - 0.75         | 0.70 - 0.85 |
    | Card Expired            | 0.25 - 0.40         | 0.85 - 0.95 |
    | Card Invalid/Stolen     | 0.10 - 0.25         | 0.85 - 0.95 |
    | Risk/Fraud Rejected     | 0.10 - 0.30         | 0.80 - 0.90 |
    | Unknown/Generic Decline | 0.40 - 0.65         | 0.60 - 0.80 |
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // fast and capable for this classification
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: "OBJECT",
            properties: {
              diagnosis: { type: "STRING", description: "Detailed diagnosis of why the payment failed based on available data." },
              recovery_probability: { type: "NUMBER", description: "Probability (0.0 to 1.0) of successful recovery." },
              recommended_action: { 
                type: "STRING", 
                enum: [
                  'RETRY_PAYMENT', 
                  'REQUEST_PAYMENT_METHOD_UPDATE', 
                  'SEND_CHECKOUT_RECOVERY', 
                  'RETRY_SUBSCRIPTION', 
                  'SEND_PAYMENT_REMINDER', 
                  'ESCALATE_HUMAN', 
                  'STOP_RECOVERY'
                ],
                description: "The best automated or manual action to take next." 
              },
              recommended_delay: {
                type: "NUMBER",
                description:
                  "Delay in minutes before executing the action. Must be between 0 and 10080 minutes (7 days).",
              },
              confidence: { type: "NUMBER", description: "AI confidence in this recommendation (0.0 to 1.0)." },
              reasoning: { type: "STRING", description: "Concise explanation for this specific recommendation and delay." }
            },
            required: ["diagnosis", "recovery_probability", "recommended_action", "recommended_delay", "confidence", "reasoning"]
          },
          temperature: 0.2 // Low temperature for more deterministic reasoning
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("AI returned empty response");
      }

      let parsedDecision: unknown;

      try {
        parsedDecision = JSON.parse(responseText);
      } catch {
        throw new Error("AI returned invalid JSON");
      }

      // Validate the AI response against the application schema.
      return aiDecisionSchema.parse(parsedDecision);

    } catch (error) {
      console.error("AI Agent Analysis failed:", error);
      throw new Error("Failed to generate AI decision. " + (error instanceof Error ? error.message : ""));
    }
  }
}

