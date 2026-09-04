import re

with open('frontend/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

old_block = """
          {/* Row 2: Sales Overview (Left) + Small Cards & Chart (Right) */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            
            {/* Left: RecoveryChart */}
            <div className="xl:col-span-2 flex flex-col min-h-[380px]">
              <RecoveryChart data={{ recoveredRevenue: s.recoveredRevenue, totalRevenueAtRisk: s.totalRevenueAtRisk, trend }} />
            </div>
            
            {/* Right: AI & Policy (top) + WhyPaymentsFail (bottom) */}
            <div className="xl:col-span-1 flex flex-col gap-4">
               <div className="grid grid-cols-2 gap-4 h-[120px]">
                 <AIIntelligence data={ai} avgRecoveryProbability={s.averageRecoveryProbability} />
                 <PolicyEngine data={policy} />
               </div>
               <div className="flex-1 min-h-[240px]">
                 <WhyPaymentsFail data={{ failureReasons, failedPayments: s.failedPayments }} />
               </div>
            </div>
          </div>
""".strip()

new_block = """
          {/* Row 2: Graph (Left), AI/Policy (Middle), Failure Dist (Right) */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            
            {/* Left: RecoveryChart */}
            <div className="xl:col-span-2 flex flex-col min-h-[360px]">
              <RecoveryChart data={{ recoveredRevenue: s.recoveredRevenue, totalRevenueAtRisk: s.totalRevenueAtRisk, trend }} />
            </div>
            
            {/* Middle: AI & Policy (stacked vertically) */}
            <div className="xl:col-span-1 flex flex-col gap-4">
               <div className="flex-1">
                 <AIIntelligence data={ai} avgRecoveryProbability={s.averageRecoveryProbability} />
               </div>
               <div className="flex-1">
                 <PolicyEngine data={policy} />
               </div>
            </div>

            {/* Right: Failure Distribution (Mint Card) */}
            <div className="xl:col-span-1 flex flex-col">
               <WhyPaymentsFail data={{ failureReasons, failedPayments: s.failedPayments }} />
            </div>
          </div>
""".strip()

content = content.replace(old_block, new_block)

with open('frontend/app/dashboard/page.tsx', 'w') as f:
    f.write(content)
