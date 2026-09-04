"use client";
import { useState } from "react";
import { useDashboardData } from "../../lib/useDashboardData";
import TimeFilter from "../../components/dashboard/TimeFilter";
import MetricsGrid from "../../components/dashboard/MetricsGrid";
import RecoveryChart from "../../components/dashboard/RecoveryChart";
import LiveRecoveryActivity from "../../components/dashboard/LiveRecoveryActivity";
import AiHealthChart from "../../components/dashboard/AiHealthChart";
import RecoveryPipeline from "../../components/dashboard/RecoveryPipeline";
import AIIntelligence from "../../components/dashboard/AIIntelligence";
import PolicyEngine from "../../components/dashboard/PolicyEngine";
import RecoveryCaseStatus from "../../components/dashboard/RecoveryCaseStatus";
import WhyPaymentsFail from "../../components/dashboard/WhyPaymentsFail";
import RecentActionsTable from "../../components/dashboard/RecentActionsTable";
import AuditPreview from "../../components/dashboard/AuditPreview";

export default function DashboardOverview() {
  const [timeframe, setTimeframe] = useState("7d");
  const { metrics, recentActions, loading, error } = useDashboardData(timeframe);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-[#07080B]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#C8FF00] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-zinc-400 text-sm font-medium">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-[#07080B]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-[#FF3B30] text-sm font-bold">Failed to load dashboard</div>
          <div className="text-zinc-400 text-xs max-w-sm">{error}</div>
        </div>
      </div>
    );
  }

  const s = metrics?.summary ?? {
    totalRevenueAtRisk: 0, recoveredRevenue: 0, recoveryRate: 0,
    failedPayments: 0, recoveryCases: 0, recoveredRevenueToday: 0, averageRecoveryProbability: 0,
  };
  const trend = metrics?.recoveryTrend ?? [];
  const casesByStatus = metrics?.recoveryCasesByStatus ?? {};
  const failureReasons = metrics?.failedPaymentsByReason ?? {};
  const ai = metrics?.aiPerformance ?? { totalDecisions: 0, averageConfidence: 0 };
  const policy = metrics?.policyPerformance ?? { totalEvaluations: 0, allowed: 0, rejected: 0, approvalRequired: 0 };
  const actions = metrics?.actionPerformance ?? { totalActions: 0, successful: 0, failed: 0, cancelled: 0 };

  return (
    <div className="p-3 lg:p-4 max-w-[1920px] mx-auto h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-[#07080B] relative z-0">
      {/* Backgrounds */}
      <div className="absolute top-[-250px] left-[-250px] w-[600px] h-[600px] rounded-full pointer-events-none -z-10" style={{ background: 'radial-gradient(circle, rgba(200,255,0,0.04) 0%, transparent 70%)' }}></div>
      <div className="absolute bottom-[-350px] right-[-350px] w-[800px] h-[800px] rounded-full pointer-events-none -z-10" style={{ background: 'radial-gradient(circle, rgba(50,173,230,0.03) 0%, transparent 70%)' }}></div>

      {/* Page Header (h-10) */}
      <div className="mb-2 lg:mb-3 flex items-center justify-between shrink-0 h-[36px]">
        <h2 className="text-xl font-bold text-white tracking-tight">Overview</h2>
        <TimeFilter value={timeframe} onChange={setTimeframe} />
      </div>
      
      {/* Dashboard Layout - Exact Single Screen (No Scroll) */}
      <div key={timeframe} className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden pb-2">
        
        {/* ROW 1 & 2: Combined Top Overview Card */}
        <div className="shrink-0 h-[170px] bg-[#111217] rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(200,255,0,0.05)] flex flex-col relative overflow-hidden">
          
          {/* Top Half: KPIs */}
          <div className="flex-1 min-h-0">
            <MetricsGrid data={s} />
          </div>
          
          {/* Middle Horizontal Divider */}
          <div className="w-full h-px bg-zinc-800/60 relative z-10">
             {/* Tiny glow accent in the center of the line */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-[1px] bg-[#C8FF00] shadow-[0_0_8px_#C8FF00] opacity-30"></div>
          </div>
          
          {/* Bottom Half: Conversion Flow */}
          <div className="flex-1 min-h-0 relative z-10">
            <LiveRecoveryActivity data={{ casesByStatus, failedPayments: s.failedPayments, recoveryCases: s.recoveryCases, actionPerformance: actions }} />
          </div>
        </div>
        
        {/* ROW 3: Charts (Flexible height) */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-3 min-h-0">
          
          {/* Left: RecoveryChart (5 cols) */}
          <div className="xl:col-span-5 h-full">
            <RecoveryChart data={{ recoveredRevenue: s.recoveredRevenue, totalRevenueAtRisk: s.totalRevenueAtRisk, trend }} />
          </div>
          
          {/* Middle: AI & Policy + Failure Dist (4 cols) */}
          <div className="xl:col-span-4 flex flex-col gap-3 h-full">
             <div className="grid grid-cols-2 gap-3 h-[140px] shrink-0">
               <AIIntelligence data={ai} avgRecoveryProbability={s.averageRecoveryProbability} />
               <PolicyEngine data={policy} />
             </div>
             <div className="flex-1 min-h-0">
               <WhyPaymentsFail data={{ failureReasons, failedPayments: s.failedPayments }} />
             </div>
          </div>

          {/* Right: Recovery Pipeline (3 cols) */}
          <div className="xl:col-span-3 h-full bg-[#111217] rounded-xl border border-white/10 shadow-[0_0_20px_rgba(200,255,0,0.05)] overflow-hidden">
             <RecoveryPipeline data={{ failedPayments: s.failedPayments, totalRevenueAtRisk: s.totalRevenueAtRisk, policyPassed: policy.allowed, aiAnalyzed: ai.totalDecisions, actionsDeployed: actions.totalActions, recovered: casesByStatus.RECOVERED ?? 0, recoveredRevenue: s.recoveredRevenue }} />
          </div>
        </div>

        {/* ROW 4: Extra tables (h-[190px]) */}
        <div className="shrink-0 h-[190px] grid grid-cols-1 xl:grid-cols-12 gap-3">
           <div className="xl:col-span-3 h-full">
             <RecoveryCaseStatus data={casesByStatus} />
           </div>
           <div className="xl:col-span-6 h-full">
             <RecentActionsTable data={recentActions} />
           </div>
           <div className="xl:col-span-3 h-full">
             <AuditPreview data={actions} />
           </div>
        </div>

      </div>
    </div>
  );
}
