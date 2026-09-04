const API_BASE = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" && window.location.hostname !== "localhost" ? "/api/backend" : "http://localhost:8000/api");

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
export interface RecoveryCase { id: string; paymentId: string; merchantId: string; status: string; revenueAtRisk: number; recoveryProbability: number; createdAt: string; recoveredAt: string | null; customerName: string; diagnosis: string | null; payment: { id: string, amount: number, currency: string, gateway: string, method: string }; }

export interface AgentDecisionDetail {
  createdAt: string;
  recoveryProbability: number;
  reasoning: string;
  recommendedAction: string;
}

export interface PolicyDecisionDetail {
  createdAt: string;
  rulesEvaluated: string[] | string | Record<string, unknown>;
  passed: boolean;
}

export interface RecoveryActionDetail {
  createdAt: string;
  type: string;
  status: string;
}

export interface RecoveryCaseDetail extends RecoveryCase {
  agentDecision: AgentDecisionDetail | null;
  policyDecision: PolicyDecisionDetail | null;
  recoveryAction: RecoveryActionDetail | null;
}

export interface AuditEvent { id: string; event_type: string; entity_type: string; entity_id: string; details: Record<string, unknown>; created_at: string; }

export function getDashboardMetrics(merchantId: string, timeframe: string = '7d') {
  return fetchApi<DashboardMetrics>(`/metrics/${merchantId}?timeframe=${timeframe}`);
}
export function getRecoveryActions(merchantId: string) { return fetchApi<{ data: RecoveryAction[] }>(`/recovery-actions?merchant_id=${merchantId}`); }
export function getRecoveryCases(merchantId: string) { return fetchApi<{ data: RecoveryCase[] }>(`/recovery-cases?merchant_id=${merchantId}`); }
export function getAuditEvents(merchantId: string) { return fetchApi<{ data: AuditEvent[] }>(`/audit-events?merchant_id=${merchantId}&limit=10`); }

export interface Merchant {
  id: string;
  name: string;
  email: string;
  razorpay_account_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}
