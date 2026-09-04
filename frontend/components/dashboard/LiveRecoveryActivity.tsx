"use client";
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => { setTimeout(() => setMounted(true), 150); }, []);

  const total = data.failedPayments || 1;
  const policyPassed = data.recoveryCases;
  const aiDeployed = data.actionPerformance.totalActions;
  const recovered = data.casesByStatus.RECOVERED ?? 0;

  const flowData = [
    { label: "Failed Payments", value: total, pct: "100%", color: "#666666" },
    { label: "Policy Approved", value: policyPassed, pct: total > 0 ? `${((policyPassed / total) * 100).toFixed(1)}%` : "0%", color: "#C8FF00" },
    { label: "Action Deployed", value: aiDeployed, pct: total > 0 ? `${((aiDeployed / total) * 100).toFixed(1)}%` : "0%", color: "#C8FF00" },
    { label: "Recovered", value: recovered, pct: total > 0 ? `${((recovered / total) * 100).toFixed(1)}%` : "0%", color: "#C8FF00" },
  ];

  return (
    <div className="relative flex items-center justify-between w-full h-full px-6 gap-2 lg:gap-4" onMouseLeave={() => setHoveredIndex(null)}>
      {/* Magic Hover Line at the top boundary */}
      <div 
         className="absolute -top-[1px] h-[2px] bg-[#C8FF00] shadow-[0_0_12px_#C8FF00] transition-all duration-300 ease-out z-20 pointer-events-none"
         style={{
           width: '12%',
           left: hoveredIndex !== null ? `${(hoveredIndex * 25) + 12.5}%` : '50%',
           transform: 'translateX(-50%)',
           opacity: hoveredIndex !== null ? 1 : 0
         }}
      />

      {flowData.map((step, i) => (
        <React.Fragment key={i}>
          <div 
            className="flex flex-col justify-center flex-1 h-full relative overflow-hidden transition-all duration-300 hover:bg-white/[0.01] px-4 rounded-xl cursor-default group" 
            style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(10px)', transitionDelay: mounted ? '0ms' : `${i * 150}ms` }}
            onMouseEnter={() => setHoveredIndex(i)}
          >
            <div className="flex items-center justify-between w-full mb-1.5 mt-1">
               <span className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-wider truncate transition-colors duration-300 ${hoveredIndex === i ? 'text-zinc-200' : 'text-zinc-400'}`}>{step.label}</span>
               <div className={`w-1.5 h-1.5 rounded-full transition-shadow duration-300 ${hoveredIndex === i ? 'shadow-[0_0_12px_rgba(200,255,0,0.8)] scale-125' : 'shadow-[0_0_8px_rgba(200,255,0,0.5)]'}`} style={{ backgroundColor: step.color }}></div>
            </div>
            <div className="flex items-end gap-2">
              <div className="text-xl lg:text-2xl font-bold text-white tabular-nums tracking-tight leading-none">
                {mounted ? <AnimatedNumber value={step.value} decimals={0} duration={1500} /> : "0"}
              </div>
              <div className={`text-[9px] lg:text-[10px] font-extrabold tracking-wide mb-[2px] transition-colors duration-300 ${hoveredIndex === i ? 'text-zinc-300' : 'text-zinc-500'}`}>
                {i === 0 ? "TOTAL" : `${step.pct} RETAINED`}
              </div>
            </div>
          </div>

          {i < flowData.length - 1 && (
            <div className="flex-shrink-0 text-zinc-600 transition-all duration-700"
                 style={{ opacity: mounted ? 1 : 0, transitionDelay: `${i * 150 + 100}ms` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
