import { pool } from '../db';

export class MetricsService {
  static async getMerchantRecoveryMetrics(merchantId: string, timeframe: string = '7d') {
    const merchantCheck = await pool.query(`SELECT user_id FROM merchants WHERE user_id = $1`, [merchantId]);
    if (merchantCheck.rows.length === 0) {
      throw new Error('MERCHANT_NOT_FOUND');
    }

    let dateFilterRc = "";
    let dateFilterPm = "";
    let dateFilterAd = "";
    let dateFilterPd = "";
    let dateFilterRa = "";
    
    if (timeframe === 'today') {
      dateFilterRc = "AND created_at >= CURRENT_DATE";
      dateFilterPm = "AND created_at >= CURRENT_DATE";
      dateFilterAd = "AND ad.created_at >= CURRENT_DATE";
      dateFilterPd = "AND pd.created_at >= CURRENT_DATE";
      dateFilterRa = "AND ra.created_at >= CURRENT_DATE";
    } else if (timeframe === '7d') {
      dateFilterRc = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
      dateFilterPm = "AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
      dateFilterAd = "AND ad.created_at >= CURRENT_DATE - INTERVAL '7 days'";
      dateFilterPd = "AND pd.created_at >= CURRENT_DATE - INTERVAL '7 days'";
      dateFilterRa = "AND ra.created_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (timeframe === '30d') {
      dateFilterRc = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
      dateFilterPm = "AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
      dateFilterAd = "AND ad.created_at >= CURRENT_DATE - INTERVAL '30 days'";
      dateFilterPd = "AND pd.created_at >= CURRENT_DATE - INTERVAL '30 days'";
      dateFilterRa = "AND ra.created_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const query = `
      WITH case_metrics AS (
        SELECT 
          COUNT(id) AS "recoveryCases",
          COALESCE(SUM(revenue_at_risk), 0) AS "totalRevenueAtRisk",
          COALESCE(SUM(CASE WHEN status = 'RECOVERED' THEN revenue_at_risk ELSE 0 END), 0) AS "recoveredRevenue",
          COALESCE(SUM(CASE WHEN status = 'RECOVERED' AND recovered_at >= CURRENT_DATE THEN revenue_at_risk ELSE 0 END), 0) AS "recoveredRevenueToday",
          COALESCE(AVG(recovery_probability), 0) AS "averageRecoveryProbability"
        FROM recovery_cases
        WHERE merchant_id = $1 ${dateFilterRc}
      ),
      payment_metrics AS (
        SELECT COUNT(id) AS "failedPayments"
        FROM payments
        WHERE merchant_id = $1 AND status = 'FAILED' ${dateFilterPm}
      )
      SELECT 
        cm."recoveryCases",
        cm."totalRevenueAtRisk",
        cm."recoveredRevenue",
        cm."recoveredRevenueToday",
        cm."averageRecoveryProbability",
        pm."failedPayments"
      FROM case_metrics cm
      CROSS JOIN payment_metrics pm;
    `;

    const result = await pool.query(query, [merchantId]);
    
    // Trend query always shows last 7 days or 30 days based on timeframe.
    // If today, just show 7 days trend because 1 day trend makes no sense.
    let trendInterval = '6 days';
    if (timeframe === '30d') trendInterval = '29 days';

    const trendQuery = `
      SELECT 
        TO_CHAR(date_series.date, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(rc.revenue_at_risk), 0) AS "recoveredRevenue"
      FROM generate_series(CURRENT_DATE - INTERVAL '${trendInterval}', CURRENT_DATE, '1 day'::interval) AS date_series(date)
      LEFT JOIN recovery_cases rc 
        ON DATE(rc.recovered_at) = DATE(date_series.date)
        AND rc.merchant_id = $1 
        AND rc.status = 'RECOVERED'
      GROUP BY date_series.date
      ORDER BY date_series.date ASC;
    `;
    const trendResult = await pool.query(trendQuery, [merchantId]);
    const recoveryTrend = trendResult.rows.map(r => ({
      date: r.date,
      recoveredRevenue: Number(r.recoveredRevenue) || 0
    }));

    const statusQuery = `
      SELECT status, COUNT(id) AS count
      FROM recovery_cases
      WHERE merchant_id = $1 ${dateFilterRc}
      GROUP BY status;
    `;
    const statusResult = await pool.query(statusQuery, [merchantId]);
    
    const recoveryCasesByStatus: Record<string, number> = {
      OPEN: 0, ANALYZING: 0, ACTION_PENDING: 0, IN_PROGRESS: 0,
      RECOVERED: 0, ESCALATED: 0, STOPPED: 0, UNRECOVERABLE: 0
    };

    statusResult.rows.forEach(r => {
      if (recoveryCasesByStatus[r.status] !== undefined) {
        recoveryCasesByStatus[r.status] = Number(r.count);
      }
    });

    const reasonQuery = `
      SELECT COALESCE(UPPER(failure_reason), 'UNKNOWN') AS reason, COUNT(id) AS count
      FROM payments
      WHERE merchant_id = $1 AND status = 'FAILED' ${dateFilterPm}
      GROUP BY COALESCE(UPPER(failure_reason), 'UNKNOWN');
    `;
    const reasonResult = await pool.query(reasonQuery, [merchantId]);
    const failedPaymentsByReason: Record<string, number> = {};
    reasonResult.rows.forEach(r => {
      failedPaymentsByReason[r.reason] = Number(r.count);
    });

    const aiQuery = `
      SELECT 
        COUNT(ad.id) AS "totalDecisions",
        COALESCE(AVG(ad.confidence), 0) AS "averageConfidence"
      FROM agent_decisions ad
      JOIN recovery_cases rc ON rc.id = ad.recovery_case_id
      WHERE rc.merchant_id = $1 ${dateFilterAd};
    `;
    const aiResult = await pool.query(aiQuery, [merchantId]);
    let aiPerformance = { totalDecisions: 0, averageConfidence: 0 };
    if (aiResult.rows.length > 0) {
      const avgConf = Number(aiResult.rows[0].averageConfidence) || 0;
      aiPerformance = {
        totalDecisions: Number(aiResult.rows[0].totalDecisions) || 0,
        averageConfidence: Number((avgConf * 100).toFixed(2))
      };
    }

    const policyQuery = `
      SELECT 
        COUNT(pd.id) AS "totalEvaluations",
        COALESCE(SUM(CASE WHEN pd.allowed = true THEN 1 ELSE 0 END), 0) AS "allowed",
        COALESCE(SUM(CASE WHEN pd.allowed = false THEN 1 ELSE 0 END), 0) AS "rejected",
        COALESCE(SUM(CASE WHEN pd.requires_approval = true THEN 1 ELSE 0 END), 0) AS "approvalRequired"
      FROM policy_decisions pd
      JOIN agent_decisions ad ON ad.id = pd.agent_decision_id
      JOIN recovery_cases rc ON rc.id = ad.recovery_case_id
      WHERE rc.merchant_id = $1 ${dateFilterPd};
    `;
    const policyResult = await pool.query(policyQuery, [merchantId]);
    let policyPerformance = { totalEvaluations: 0, allowed: 0, rejected: 0, approvalRequired: 0 };
    if (policyResult.rows.length > 0) {
      policyPerformance = {
        totalEvaluations: Number(policyResult.rows[0].totalEvaluations) || 0,
        allowed: Number(policyResult.rows[0].allowed) || 0,
        rejected: Number(policyResult.rows[0].rejected) || 0,
        approvalRequired: Number(policyResult.rows[0].approvalRequired) || 0
      };
    }

    const actionQuery = `
      SELECT 
        COUNT(ra.id) AS "totalActions",
        COALESCE(SUM(CASE WHEN ra.status = 'SUCCESS' THEN 1 ELSE 0 END), 0) AS "successful",
        COALESCE(SUM(CASE WHEN ra.status = 'FAILED' THEN 1 ELSE 0 END), 0) AS "failed",
        COALESCE(SUM(CASE WHEN ra.status = 'CANCELLED' THEN 1 ELSE 0 END), 0) AS "cancelled"
      FROM recovery_actions ra
      JOIN recovery_cases rc ON rc.id = ra.recovery_case_id
      WHERE rc.merchant_id = $1 ${dateFilterRa};
    `;
    const actionResult = await pool.query(actionQuery, [merchantId]);
    let actionPerformance = { totalActions: 0, successful: 0, failed: 0, cancelled: 0 };
    if (actionResult.rows.length > 0) {
      actionPerformance = {
        totalActions: Number(actionResult.rows[0].totalActions) || 0,
        successful: Number(actionResult.rows[0].successful) || 0,
        failed: Number(actionResult.rows[0].failed) || 0,
        cancelled: Number(actionResult.rows[0].cancelled) || 0
      };
    }

    if (result.rows.length === 0) {
      return { summary: { totalRevenueAtRisk: 0, recoveredRevenue: 0, recoveryRate: 0, failedPayments: 0, recoveryCases: 0, recoveredRevenueToday: 0, averageRecoveryProbability: 0 }, recoveryCasesByStatus, recoveryTrend, failedPaymentsByReason, aiPerformance, policyPerformance, actionPerformance };
    }

    const row = result.rows[0];
    const totalRevenueAtRisk = Number(row.totalRevenueAtRisk) || 0;
    const recoveredRevenue = Number(row.recoveredRevenue) || 0;
    const failedPayments = Number(row.failedPayments) || 0;
    const recoveryCases = Number(row.recoveryCases) || 0;
    const recoveredRevenueToday = Number(row.recoveredRevenueToday) || 0;
    const rawProb = Number(row.averageRecoveryProbability) || 0;
    const averageRecoveryProbability = Number((rawProb * 100).toFixed(2));
    let recoveryRate = 0;
    if (totalRevenueAtRisk > 0) {
      recoveryRate = (recoveredRevenue / totalRevenueAtRisk) * 100;
    }

    return {
      summary: { totalRevenueAtRisk, recoveredRevenue, recoveryRate: Number(recoveryRate.toFixed(2)), failedPayments, recoveryCases, recoveredRevenueToday, averageRecoveryProbability },
      recoveryCasesByStatus, recoveryTrend, failedPaymentsByReason, aiPerformance, policyPerformance, actionPerformance
    };
  }
}
