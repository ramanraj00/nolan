import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { pool } from './db';
import merchantRoutes from './routes/merchant.routes';
import customerRoutes from './routes/customer.routes';
import paymentRoutes from './routes/payment.routes';
import recoveryCaseRoutes from './routes/recovery-case.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());

// Register API Routes
app.use('/api/merchants', merchantRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/recovery-cases', recoveryCaseRoutes);

app.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ message: 'Backend with TypeScript & Postgres is running!', time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

