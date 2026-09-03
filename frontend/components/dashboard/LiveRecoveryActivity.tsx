"use client";
import { useEffect, useState } from "react";

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

  const funnelData = [
    { label: "Failed Pmts", value: total.toLocaleString(), pct: "100%", color: "bg-[#333333]" },
    { label: "Policy Passed", value: policyPassed.toLocaleString(), pct: total > 0 ? `${((policyPassed / total) * 100).toFixed(1)}%` : "0%", color: "bg-[#FF9500]" },
    { label: "AI Deployed", value: aiDeployed.toLocaleString(), pct: total > 0 ? `${((aiDeployed / total) * 100).toFixed(1)}%` : "0%", color: "bg-[#32ADE6]" },
    { label: "Recovered", value: recovered.toLocaleString(), pct: total > 0 ? `${((recovered / total) * 100).toFixed(1)}%` : "0%", color: "bg-[#C8FF00]" },
  ];

  return (
    <div className="bg-[#111217] rounded-2xl border border-white/5 h-full p-4 flex flex-col relative overflow-hidden group">
      <h3 className="text-[#888] font-bold text-[11px] tracking-widest uppercase mb-3">Conversion Funnel</h3>
      <div className="flex-1 flex items-center justify-between gap-6 px-2">
        <div className="w-[90px] h-full flex flex-col items-center gap-[3px] py-1">
          <div className="w-[100%] flex-1 bg-[#333333] transition-all duration-1000 origin-top" style={{ clipPath: "polygon(0 0, 100% 0, 90% 100%, 10% 100%)", transform: mounted ? 'scaleY(1)' : 'scaleY(0)' }}></div>
          <div className="w-[80%] flex-1 bg-[#FF9500] transition-all duration-1000 delay-150 origin-top shadow-[0_0_10px_rgba(255,149,0,0.5)]" style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 15% 100%)", transform: mounted ? 'scaleY(1)' : 'scaleY(0)' }}></div>
          <div className="w-[56%] flex-1 bg-[#32ADE6] transition-all duration-1000 delay-300 origin-top shadow-[0_0_10px_rgba(50,173,230,0.5)]" style={{ clipPath: "polygon(0 0, 100% 0, 80% 100%, 20% 100%)", transform: mounted ? 'scaleY(1)' : 'scaleY(0)' }}></div>
          <div className="w-[34%] flex-1 bg-[#C8FF00] transition-all duration-1000 delay-500 origin-top shadow-[0_0_15px_rgba(200,255,0,0.6)]" style={{ clipPath: "polygon(0 0, 100% 0, 70% 100%, 30% 100%)", transform: mounted ? 'scaleY(1)' : 'scaleY(0)' }}></div>
        </div>
        <div className="flex-1 flex flex-col justify-between h-full py-1">
          {funnelData.map((d, i) => (
            <div key={i} className="flex justify-between items-center h-full max-h-[30px]">
              <div>
                <div className="text-[9px] text-[#888] font-bold uppercase tracking-wider mb-0.5">{d.label}</div>
                <div className="text-sm font-black text-white tabular-nums leading-none">{d.value}</div>
              </div>
              {i > 0 && <div className={`text-[10px] font-bold ${i === 3 ? 'text-[#C8FF00]' : 'text-[#aaa]'}`}>{d.pct}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
