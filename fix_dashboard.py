import re

with open('frontend/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

new_grid = """
      {/* Dashboard Grid Restructured */}
      <div className="flex-1 overflow-y-auto pb-10 scrollbar-hide">
        <div className="flex flex-col gap-4">
          
          <MetricsGrid data={s} />
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 flex flex-col gap-4">
              <div className="min-h-[320px] flex-1">
                <RecoveryChart data={{ recoveredRevenue: s.recoveredRevenue, totalRevenueAtRisk: s.totalRevenueAtRisk, trend }} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[180px]">
                <AIIntelligence data={ai} avgRecoveryProbability={s.averageRecoveryProbability} />
                <PolicyEngine data={policy} />
              </div>
            </div>
            
            <div className="xl:col-span-1 flex flex-col gap-4">
               <div className="min-h-[220px]">
                 <LiveRecoveryActivity data={{ casesByStatus, failedPayments: s.failedPayments, recoveryCases: s.recoveryCases, actionPerformance: actions }} />
               </div>
               <div className="flex-1 min-h-[240px]">
                 <WhyPaymentsFail data={{ failureReasons, failedPayments: s.failedPayments }} />
               </div>
            </div>
          </div>

          <div className="bg-[#111217] rounded-2xl p-6 border border-white/5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center min-h-[200px]">
              <div className="lg:col-span-1 flex justify-center lg:border-r border-white/5 h-full relative py-4 lg:py-0">
                <div className="w-full max-w-[240px] flex items-center justify-center">
                  <AiHealthChart data={{ recovered: casesByStatus.RECOVERED ?? 0, pending: (casesByStatus.OPEN ?? 0) + (casesByStatus.ANALYZING ?? 0) + (casesByStatus.ACTION_PENDING ?? 0) + (casesByStatus.IN_PROGRESS ?? 0), failed: (casesByStatus.ESCALATED ?? 0) + (casesByStatus.STOPPED ?? 0) + (casesByStatus.UNRECOVERABLE ?? 0) }} />
                </div>
              </div>
              <div className="lg:col-span-2 h-full flex items-center py-4 lg:py-0">
                <div className="w-full">
                  <RecoveryPipeline data={{ failedPayments: s.failedPayments, totalRevenueAtRisk: s.totalRevenueAtRisk, policyPassed: policy.allowed, aiAnalyzed: ai.totalDecisions, actionsDeployed: actions.totalActions, recovered: casesByStatus.RECOVERED ?? 0, recoveredRevenue: s.recoveredRevenue }} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 min-h-[300px]">
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
"""

pattern = r'\{\/\* Dashboard Grid \*\/\}.*?(?=\s+<\/div>\s+<\/div>\s+\);\s+\})'
content = re.sub(pattern, new_grid.strip(), content, flags=re.DOTALL)

with open('frontend/app/dashboard/page.tsx', 'w') as f:
    f.write(content)

