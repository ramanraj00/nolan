import re

with open('backend/src/services/metrics.service.ts', 'r') as f:
    content = f.read()

# We need to find all the individual awaits and group them into a Promise.all.
# Since it's a bit complex to regex, let's just do a manual rewrite of the execution part.

old_execution = """    const result = await pool.query(query, [merchantId]);
    
    // Trend query always shows last 7 days or 30 days based on timeframe.
    let trendInterval = timeframe === '30d' ? 30 : 7;
    const trendQuery = `
      SELECT 
        TO_CHAR(date_series.date, 'Mon DD') as date,
        COALESCE(SUM(rc.revenue_at_risk), 0) as "recoveredRevenue"
      FROM (
        SELECT current_date - i AS date
        FROM generate_series(0, ${trendInterval - 1}) i
      ) date_series
      LEFT JOIN recovery_cases rc 
        ON DATE(rc.recovered_at) = date_series.date 
        AND rc.status = 'RECOVERED'
        AND rc.merchant_id = $1
      GROUP BY date_series.date
      ORDER BY date_series.date ASC;
    `;
    const trendResult = await pool.query(trendQuery, [merchantId]);
    const recoveryTrend = trendResult.rows.map(r => ({
      date: r.date,
      recoveredRevenue: Number(r.recoveredRevenue)
    }));

    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM recovery_cases
      WHERE merchant_id = $1 ${dateFilterRc}
      GROUP BY status;
    `;
    const statusResult = await pool.query(statusQuery, [merchantId]);
    
    const recoveryCasesByStatus: Record<string, number> = {
      'OPEN': 0,
      'IN_PROGRESS': 0,
      'RECOVERED': 0,
      'FAILED': 0
    };
    statusResult.rows.forEach(r => {
      recoveryCasesByStatus[r.status] = parseInt(r.count);
    });

    const reasonQuery = `
      SELECT COALESCE(UPPER(failure_reason), 'UNKNOWN') as reason, COUNT(*) as count
      FROM payments
      WHERE merchant_id = $1 AND status = 'FAILED' ${dateFilterPm}
      GROUP BY COALESCE(UPPER(failure_reason), 'UNKNOWN');
    `;
    const reasonResult = await pool.query(reasonQuery, [merchantId]);
    const failedPaymentsByReason: Record<string, number> = {};
    reasonResult.rows.forEach(r => {
      failedPaymentsByReason[r.reason] = parseInt(r.count);
    });

    const aiQuery = `
      SELECT 
        COUNT(*) as total,
        AVG(ad.confidence_score) as avg_confidence
      FROM agent_decisions ad
      JOIN recovery_cases rc ON rc.id = ad.recovery_case_id
      WHERE rc.merchant_id = $1 ${dateFilterAd};
    `;
    const aiResult = await pool.query(aiQuery, [merchantId]);
    let aiPerformance = { totalDecisions: 0, averageConfidence: 0 };
    if (aiResult.rows.length > 0) {
      aiPerformance = {
        totalDecisions: parseInt(aiResult.rows[0].total) || 0,
        averageConfidence: Math.round(Number(aiResult.rows[0].avg_confidence) * 100) || 0
      };
    }

    const policyQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN pd.passed = true THEN 1 ELSE 0 END) as allowed,
        SUM(CASE WHEN pd.passed = false THEN 1 ELSE 0 END) as rejected
      FROM policy_decisions pd
      JOIN recovery_cases rc ON rc.id = pd.recovery_case_id
      WHERE rc.merchant_id = $1 ${dateFilterPd};
    `;
    const policyResult = await pool.query(policyQuery, [merchantId]);
    let policyPerformance = { totalEvaluations: 0, allowed: 0, rejected: 0, approvalRequired: 0 };
    if (policyResult.rows.length > 0) {
      const total = parseInt(policyResult.rows[0].total) || 0;
      const allowed = parseInt(policyResult.rows[0].allowed) || 0;
      const rejected = parseInt(policyResult.rows[0].rejected) || 0;
      policyPerformance = { totalEvaluations: total, allowed, rejected, approvalRequired: 0 }; // Mock approval required
    }

    const actionQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ra.status = 'COMPLETED' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN ra.status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN ra.status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
      FROM recovery_actions ra
      JOIN recovery_cases rc ON rc.id = ra.recovery_case_id
      WHERE rc.merchant_id = $1 ${dateFilterRa};
    `;
    const actionResult = await pool.query(actionQuery, [merchantId]);
    let actionPerformance = { totalActions: 0, successful: 0, failed: 0, cancelled: 0 };
    if (actionResult.rows.length > 0) {
      actionPerformance = {
        totalActions: parseInt(actionResult.rows[0].total) || 0,
        successful: parseInt(actionResult.rows[0].successful) || 0,
        failed: parseInt(actionResult.rows[0].failed) || 0,
        cancelled: parseInt(actionResult.rows[0].cancelled) || 0
      };
    }

    const row = result.rows[0];"""

new_execution = """    // Optimizing latency by firing all heavy dashboard queries in parallel!
    let trendInterval = timeframe === '30d' ? 30 : 7;
    const trendQuery = `
      SELECT 
        TO_CHAR(date_series.date, 'Mon DD') as date,
        COALESCE(SUM(rc.revenue_at_risk), 0) as "recoveredRevenue"
      FROM (
        SELECT current_date - i AS date
        FROM generate_series(0, ${trendInterval - 1}) i
      ) date_series
      LEFT JOIN recovery_cases rc 
        ON DATE(rc.recovered_at) = date_series.date 
        AND rc.status = 'RECOVERED'
        AND rc.merchant_id = $1
      GROUP BY date_series.date
      ORDER BY date_series.date ASC;
    `;
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM recovery_cases
      WHERE merchant_id = $1 ${dateFilterRc}
      GROUP BY status;
    `;
    const reasonQuery = `
      SELECT COALESCE(UPPER(failure_reason), 'UNKNOWN') as reason, COUNT(*) as count
      FROM payments
      WHERE merchant_id = $1 AND status = 'FAILED' ${dateFilterPm}
      GROUP BY COALESCE(UPPER(failure_reason), 'UNKNOWN');
    `;
    const aiQuery = `
      SELECT 
        COUNT(*) as total,
        AVG(ad.confidence_score) as avg_confidence
      FROM agent_decisions ad
      JOIN recovery_cases rc ON rc.id = ad.recovery_case_id
      WHERE rc.merchant_id = $1 ${dateFilterAd};
    `;
    const policyQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN pd.passed = true THEN 1 ELSE 0 END) as allowed,
        SUM(CASE WHEN pd.passed = false THEN 1 ELSE 0 END) as rejected
      FROM policy_decisions pd
      JOIN recovery_cases rc ON rc.id = pd.recovery_case_id
      WHERE rc.merchant_id = $1 ${dateFilterPd};
    `;
    const actionQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN ra.status = 'COMPLETED' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN ra.status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN ra.status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
      FROM recovery_actions ra
      JOIN recovery_cases rc ON rc.id = ra.recovery_case_id
      WHERE rc.merchant_id = $1 ${dateFilterRa};
    `;

    // Promise.all to fetch all dashboard widgets simultaneously
    const [result, trendResult, statusResult, reasonResult, aiResult, policyResult, actionResult] = await Promise.all([
      pool.query(query, [merchantId]),
      pool.query(trendQuery, [merchantId]),
      pool.query(statusQuery, [merchantId]),
      pool.query(reasonQuery, [merchantId]),
      pool.query(aiQuery, [merchantId]),
      pool.query(policyQuery, [merchantId]),
      pool.query(actionQuery, [merchantId])
    ]);

    const recoveryTrend = trendResult.rows.map(r => ({
      date: r.date,
      recoveredRevenue: Number(r.recoveredRevenue)
    }));

    const recoveryCasesByStatus: Record<string, number> = { 'OPEN': 0, 'IN_PROGRESS': 0, 'RECOVERED': 0, 'FAILED': 0 };
    statusResult.rows.forEach(r => { recoveryCasesByStatus[r.status] = parseInt(r.count); });

    const failedPaymentsByReason: Record<string, number> = {};
    reasonResult.rows.forEach(r => { failedPaymentsByReason[r.reason] = parseInt(r.count); });

    let aiPerformance = { totalDecisions: 0, averageConfidence: 0 };
    if (aiResult.rows.length > 0) {
      aiPerformance = {
        totalDecisions: parseInt(aiResult.rows[0].total) || 0,
        averageConfidence: Math.round(Number(aiResult.rows[0].avg_confidence) * 100) || 0
      };
    }

    let policyPerformance = { totalEvaluations: 0, allowed: 0, rejected: 0, approvalRequired: 0 };
    if (policyResult.rows.length > 0) {
      policyPerformance = { 
        totalEvaluations: parseInt(policyResult.rows[0].total) || 0, 
        allowed: parseInt(policyResult.rows[0].allowed) || 0, 
        rejected: parseInt(policyResult.rows[0].rejected) || 0, 
        approvalRequired: 0 
      };
    }

    let actionPerformance = { totalActions: 0, successful: 0, failed: 0, cancelled: 0 };
    if (actionResult.rows.length > 0) {
      actionPerformance = {
        totalActions: parseInt(actionResult.rows[0].total) || 0,
        successful: parseInt(actionResult.rows[0].successful) || 0,
        failed: parseInt(actionResult.rows[0].failed) || 0,
        cancelled: parseInt(actionResult.rows[0].cancelled) || 0
      };
    }

    const row = result.rows[0];"""

content = content.replace(old_execution, new_execution)
with open('backend/src/services/metrics.service.ts', 'w') as f:
    f.write(content)
print("Dashboard metrics optimized!")
