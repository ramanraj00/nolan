const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function fetchApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export interface DashboardMetrics {
  summary: { totalRevenueAtRisk: number; recoveredRevenue: number; recoveryRate: number; failedPayments: number; recoveryCases: number; recoveredRevenueToday: number; averageRecoveryProbability: number; };
  recoveryCasesByStatus: Record<string, number>;
  recoveryTrend: { date: string; recoveredRevenue: number }[];
  failedPaymentsByReason: Record<string, number>;
  aiPerformance: { totalDecisions: number; averageConfidence: number; };
  policyPerformance: { totalEvaluations: number; allowed: number; rejected: number; approvalRequired: number; };
  actionPerformance: { totalActions: number; successful: number; failed: number; cancelled: number; };
}
export interface RecoveryAction {
  id: string;
  recoveryCaseId: string;
  policyDecisionId: string;
  type: string;
  status: string;
  scheduledAt: string | null;
  executedAt: string | null;
  completedAt: string | null;
  result: string | null;
  failureReason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}
export interface RecoveryCase { id: string; payment_id: string; merchant_id: string; status: string; revenue_at_risk: number; recovery_probability: number; created_at: string; recovered_at: string | null; }
export interface AuditEvent { id: string; event_type: string; entity_type: string; entity_id: string; details: Record<string, unknown>; created_at: string; }

export function getDashboardMetrics(merchantId: string, timeframe: string = '7d') {
  return fetchApi<DashboardMetrics>(`/metrics/${merchantId}?timeframe=${timeframe}`);
}
export function getRecoveryActions(merchantId: string) { return fetchApi<{ data: RecoveryAction[] }>(`/recovery-actions?merchant_id=${merchantId}`); }
export function getRecoveryCases(merchantId: string) { return fetchApi<{ data: RecoveryCase[] }>(`/recovery-cases?merchant_id=${merchantId}`); }
export function getAuditEvents(merchantId: string) { return fetchApi<{ data: AuditEvent[] }>(`/audit-events?merchant_id=${merchantId}&limit=10`); }
