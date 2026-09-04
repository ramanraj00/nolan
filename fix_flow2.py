content = '''"use client";
import React, { useEffect, useState } from "react";
import AnimatedNumber from "./AnimatedNumber";

interface FunnelData {
  casesByStatus: Record<string, number>;
  failedPayments: number;
  recoveryCases: number;
  actionPerformance: { totalActions: number; successful: number; failed: number; cancelled: number };
}

export default function LiveRecoveryActivity({ data }: { data: FunnelData }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 150); }, []);

  const total = data.failedPayments || 1;
  const policyPassed = data.recoveryCases;
  const aiDeployed = data.actionPerformance.totalActions;
  const recovered = data.casesByStatus.RECOVERED ?? 0;

  const flowData = [
    { label: "Failed Payments", value: total, pct: "100%", color: "#666666" },
    { label: "Policy Approved", value: policyPassed, pct: total > 0 ? `${((policyPassed / total) * 100).toFixed(1)}%` : "0%", color: "#FF9500" },
    { label: "Action Deployed", value: aiDeployed, pct: total > 0 ? `${((aiDeployed / total) * 100).toFixed(1)}%` : "0%", color: "#32ADE6" },
    { label: "Recovered", value: recovered, pct: total > 0 ? `${((recovered / total) * 100).toFixed(1)}%` : "0%", color: "#C8FF00" },
  ];

  return (
    <div className="bg-[#111217] rounded-xl border border-white/5 h-full p-2.5 px-4 flex flex-col justify-center shadow-md">
      <div className="flex items-center justify-between w-full h-full gap-2 lg:gap-4">
        {flowData.map((step, i) => (
          <React.Fragment key={i}>
            <div className={`flex flex-col justify-center border border-white/5 bg-[#181920] rounded-[14px] p-3 px-4 flex-1 h-full shadow-lg transition-transform duration-500 hover:-translate-y-0.5 relative overflow-hidden`} 
                 style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(10px)', transitionDelay: `${i * 150}ms` }}>
              <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: step.color }}></div>
              <div className="flex items-center justify-between w-full mb-1.5 mt-1">
                 <span className="text-[#999] text-[9px] lg:text-[10px] font-bold uppercase tracking-wider truncate">{step.label}</span>
                 <div className="w-1.5 h-1.5 rounded-full shadow-sm animate-pulse" style={{ backgroundColor: step.color, boxShadow: `0 0 6px ${step.color}80` }}></div>
              </div>
              <div className="flex items-end gap-2">
                <div className="text-xl lg:text-2xl font-black text-white tabular-nums tracking-tight leading-none">
                  {mounted ? <AnimatedNumber value={step.value} decimals={0} duration={1500} /> : "0"}
                </div>
                <div className="text-[9px] lg:text-[10px] font-extrabold tracking-wide mb-[2px]" style={{ color: step.color }}>
                  {i === 0 ? "TOTAL" : `${step.pct} RETAINED`}
                </div>
              </div>
            </div>

            {i < flowData.length - 1 && (
              <div className="flex-shrink-0 text-[#333] transition-all duration-700"
                   style={{ opacity: mounted ? 1 : 0, transitionDelay: `${i * 150 + 100}ms` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
'''
with open('frontend/components/dashboard/LiveRecoveryActivity.tsx', 'w') as f:
    f.write(content)
