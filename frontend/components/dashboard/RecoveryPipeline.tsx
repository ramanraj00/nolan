"use client";
import { useEffect, useState } from "react";

interface PipelineData {
  failedPayments: number;
  totalRevenueAtRisk: number;
  policyPassed: number;
  aiAnalyzed: number;
  actionsDeployed: number;
  recovered: number;
  recoveredRevenue: number;
}

function formatCurrency(val: number): string {
  if (val >= 100000) return "₹" + (val / 100000).toFixed(1) + "L";
  if (val >= 1000) return "₹" + (val / 1000).toFixed(1) + "K";
  return "₹" + val.toFixed(0);
}

export default function RecoveryPipeline({ data }: { data: PipelineData }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 150); }, []);

  const max = data.failedPayments || 1;

  const pipeline = [
    { step: "Initial Failed Payments", count: data.failedPayments, value: formatCurrency(data.totalRevenueAtRisk), color: "from-white/10 to-white/5", text: "text-white" },
    { step: "Filtered by Policy Engine", count: data.policyPassed, value: "", color: "from-[#C8FF00]/20 to-[#C8FF00]/5", text: "text-[#C8FF00]" },
    { step: "AI Analysis Complete", count: data.aiAnalyzed, value: "", color: "from-[#32ADE6]/20 to-[#32ADE6]/5", text: "text-[#32ADE6]" },
    { step: "Recovery Action Deployed", count: data.actionsDeployed, value: "", color: "from-[#FF9500]/20 to-[#FF9500]/5", text: "text-[#FF9500]" },
    { step: "Successfully Recovered", count: data.recovered, value: formatCurrency(data.recoveredRevenue), color: "from-[#C8FF00]/30 to-[#C8FF00]/10", text: "text-[#C8FF00]" },
  ];

  return (
    <div className="w-full flex flex-col gap-2.5 h-full justify-center">
      <h3 className="text-white font-medium text-[11px] uppercase tracking-wider mb-1">Recovery Pipeline</h3>
      {pipeline.map((item, i) => {
        const percentage = Math.max((item.count / max) * 100, 2);
        return (
          <div key={i} className="relative w-full h-8 group cursor-default">
            <div className={`absolute top-0 left-0 h-full bg-gradient-to-r ${item.color} rounded-r-md border-y border-r border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all duration-[2000ms] ease-out`}
              style={{ width: mounted ? `${percentage}%` : '0%', transitionDelay: `${i * 200}ms` }}>
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-50 rounded-r-md"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-between px-3 h-full">
              <span className={`text-[10px] font-bold tracking-wider uppercase z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'} ${item.text}`} style={{ transitionDelay: `${(i * 200) + 400}ms` }}>
                {item.step}
              </span>
              <div className={`flex items-center gap-3 z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`} style={{ transitionDelay: `${(i * 200) + 600}ms` }}>
                <span className="text-[11px] font-black text-white">{item.count.toLocaleString()}</span>
                {item.value && <span className="text-[10px] font-bold text-[#888]">{item.value}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
