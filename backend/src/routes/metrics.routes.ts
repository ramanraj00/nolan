import express, { Request, Response } from 'express';
import { MetricsService } from '../services/metrics.service';

const router = express.Router();

// ==========================================
// GET MERCHANT RECOVERY METRICS
// ==========================================
// Endpoint: GET /api/metrics/:merchantId
router.get('/:merchantId', async (req: Request, res: Response): Promise<void> => {
  try {
    const merchantId = String(req.params.merchantId);

    // Simple UUID validation (optional but good practice)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(merchantId)) {
      res.status(400).json({ error: 'Invalid Merchant ID format' });
      return;
    }

    const metrics = await MetricsService.getMerchantRecoveryMetrics(merchantId);

    res.status(200).json(metrics);
  } catch (error: any) {
    if (error.message === 'MERCHANT_NOT_FOUND') {
      res.status(404).json({ error: 'Merchant not found' });
      return;
    }
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Internal server error while fetching metrics' });
  }
});

export default router;

