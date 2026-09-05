import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { pool } from './db';
import merchantRoutes from './routes/merchant.routes';
import customerRoutes from './routes/customer.routes';
import paymentRoutes from './routes/payment.routes';
import recoveryCaseRoutes from './routes/recovery-case.routes';
import agentDecisionRoutes from './routes/agent-decision.routes';
import policyDecisionRoutes from './routes/policy-decision.routes';
import recoveryActionRoutes from './routes/recovery-action.routes';
import auditEventRoutes from './routes/audit-event.routes';
import webhookEventRoutes from './routes/webhook-event.routes';
import metricsRoutes from './routes/metrics.routes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 8000;

import cors from "cors";

app.use(cors());

app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Register API Routes
app.use('/api/merchants', merchantRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/recovery-cases', recoveryCaseRoutes);
app.use('/api/agent-decisions', agentDecisionRoutes);
app.use('/api/policy-decisions', policyDecisionRoutes);
app.use('/api/recovery-actions', recoveryActionRoutes);
app.use('/api/audit-events', auditEventRoutes);
app.use('/api/webhook-events', webhookEventRoutes);
app.use('/api/metrics', metricsRoutes);

app.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.json({
      message: 'Backend with TypeScript & Postgres is running!',
      time: result.rows[0].now
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database connection failed'
    });
  }
});

// Start server
app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});

export default app;