const { GoogleGenAI } = require('@google/genai');
const { z } = require('zod');

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

const ai = new GoogleGenAI({ apiKey: 'dummy' });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Hello",
      config: {
        responseMimeType: 'application/json',
        responseSchema: aiDecisionSchema,
        temperature: 0.2
      }
    });
    console.log(response);
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
run();
