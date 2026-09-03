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
          <span className="text-[#888] text-sm font-medium">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-[#07080B]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-[#FF3B30] text-sm font-bold">Failed to load dashboard</div>
          <div className="text-[#888] text-xs max-w-sm">{error}</div>
        </div>
      </div>
    );
  }

  // Extract data from metrics with safe defaults
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
    <div className="p-4 max-w-[1920px] mx-auto h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-[#07080B] relative z-0">
      {/* Highly Optimized Ambient Background Glows (No CSS blur) */}
      <div className="absolute top-[-250px] left-[-250px] w-[600px] h-[600px] rounded-full pointer-events-none -z-10" style={{ background: 'radial-gradient(circle, rgba(200,255,0,0.04) 0%, transparent 70%)' }}></div>
      <div className="absolute bottom-[-350px] right-[-350px] w-[800px] h-[800px] rounded-full pointer-events-none -z-10" style={{ background: 'radial-gradient(circle, rgba(50,173,230,0.03) 0%, transparent 70%)' }}></div>
      <div className="absolute top-[30%] left-[40%] w-[500px] h-[500px] rounded-full pointer-events-none -z-10" style={{ background: 'radial-gradient(circle, rgba(144,44,255,0.02) 0%, transparent 70%)' }}></div>

      {/* Page Header */}
      <div className="mb-3 flex items-center justify-between shrink-0">
        <h2 className="text-xl font-black text-white tracking-tight">Overview</h2>
        <TimeFilter value={timeframe} onChange={setTimeframe} />
      </div>
      
      {/* Dashboard Grid */}
      <div className="flex-1 overflow-y-auto pb-10 scrollbar-hide">
        <div className="grid grid-cols-12 gap-3 xl:gap-4 auto-rows-max">
          
          <div className="col-span-12">
            <MetricsGrid data={s} />
          </div>
          
          <div className="col-span-12 xl:col-span-8">
            <RecoveryChart data={{ recoveredRevenue: s.recoveredRevenue, totalRevenueAtRisk: s.totalRevenueAtRisk, trend }} />
          </div>
          <div className="col-span-12 xl:col-span-4">
            <LiveRecoveryActivity data={{ casesByStatus, failedPayments: s.failedPayments, recoveryCases: s.recoveryCases, actionPerformance: actions }} />
          </div>

          <div className="col-span-12">
            <div className="bg-[#111217] rounded-2xl p-5 border border-white/5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div className="flex justify-center lg:border-r border-white/5 pb-4 lg:pb-0 lg:pr-6 relative h-full">
                  <div className="w-full max-w-[280px]"><AiHealthChart data={{ recovered: casesByStatus.RECOVERED ?? 0, pending: (casesByStatus.OPEN ?? 0) + (casesByStatus.ANALYZING ?? 0) + (casesByStatus.ACTION_PENDING ?? 0) + (casesByStatus.IN_PROGRESS ?? 0), failed: (casesByStatus.ESCALATED ?? 0) + (casesByStatus.STOPPED ?? 0) + (casesByStatus.UNRECOVERABLE ?? 0) }} /></div>
                </div>
                <div className="flex justify-center lg:pl-6 w-full h-full">
                  <div className="w-full h-full"><RecoveryPipeline data={{ failedPayments: s.failedPayments, totalRevenueAtRisk: s.totalRevenueAtRisk, policyPassed: policy.allowed, aiAnalyzed: ai.totalDecisions, actionsDeployed: actions.totalActions, recovered: casesByStatus.RECOVERED ?? 0, recoveredRevenue: s.recoveredRevenue }} /></div>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Grid Bottom */}
          <div className="col-span-12 xl:col-span-4 h-[180px]">
            <AIIntelligence data={ai} avgRecoveryProbability={s.averageRecoveryProbability} />
          </div>
          <div className="col-span-12 xl:col-span-4 h-[180px]">
            <PolicyEngine data={policy} />
          </div>
          <div className="col-span-12 xl:col-span-4 h-[180px]">
            <WhyPaymentsFail data={{ failureReasons, failedPayments: s.failedPayments }} />
          </div>

          <div className="col-span-12 xl:col-span-3 h-[240px]">
            <RecoveryCaseStatus data={casesByStatus} />
          </div>
          <div className="col-span-12 xl:col-span-6 h-[240px]">
            <RecentActionsTable data={recentActions} />
          </div>
          <div className="col-span-12 xl:col-span-3 h-[240px]">
            <AuditPreview data={actions} />
          </div>

        </div>
      </div>
    </div>
  );
}
