import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Ensure the API key is provided
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
  recommended_delay: z.number().min(0).describe("Delay in minutes before executing the action (e.g., 1440 for 24 hours)."),
  confidence: z.number().min(0).max(1).describe("AI confidence in this recommendation (0.0 to 1.0)."),
  reasoning: z.string().describe("Concise explanation for this specific recommendation and delay.")
});

export type AiDecision = z.infer<typeof aiDecisionSchema>;

export class AiAgentService {
  /**
   * Analyzes a failed payment context using Gemini and returns a structured recovery strategy.
   */
  static async analyzeFailure(payment: any, customer: any, recoveryCaseId: string): Promise<AiDecision> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in environment. Cannot generate real AI decision.");
    }

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
    
    Guidelines:
    - If it's a temporary issue (like insufficient funds), 'RETRY_PAYMENT' with a 24-48h delay is often best.
    - If the card is permanently invalid/expired, 'REQUEST_PAYMENT_METHOD_UPDATE' immediately (0 delay) is best.
    - If it's a high-value customer and the issue is complex, 'ESCALATE_HUMAN' might be required.
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
              recommended_delay: { type: "NUMBER", description: "Delay in minutes before executing the action." },
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

      const parsedDecision = JSON.parse(responseText);
      
      // Validate again with Zod just to be absolutely safe
      return aiDecisionSchema.parse(parsedDecision);

    } catch (error) {
      console.error("AI Agent Analysis failed:", error);
      throw new Error("Failed to generate AI decision. " + (error instanceof Error ? error.message : ""));
    }
  }
}

