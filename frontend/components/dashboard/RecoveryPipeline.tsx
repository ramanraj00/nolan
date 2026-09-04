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
    { step: "Initial Failed Payments", count: data.failedPayments, value: formatCurrency(data.totalRevenueAtRisk), color: "from-white/10 to-transparent", text: "text-zinc-400" },
    { step: "AI Analysis Complete", count: data.aiAnalyzed, value: "", color: "from-[#32ADE6]/15 to-transparent", text: "text-[#32ADE6]" },
    { step: "Filtered by Policy", count: data.policyPassed, value: "", color: "from-[#C8FF00]/15 to-transparent", text: "text-[#C8FF00]" },
    { step: "Action Deployed", count: data.actionsDeployed, value: "", color: "from-[#FF9500]/15 to-transparent", text: "text-[#FF9500]" },
    { step: "Successfully Recovered", count: data.recovered, value: formatCurrency(data.recoveredRevenue), color: "from-[#C8FF00]/25 to-[#C8FF00]/5", text: "text-[#C8FF00]" },
  ];

  return (
    <div className="w-full flex flex-col gap-3 h-full justify-center p-3 xl:p-4">
      <h3 className="text-zinc-400 font-bold text-[11px] uppercase tracking-widest mb-2">Recovery Pipeline</h3>
      {pipeline.map((item, i) => {
        const percentage = Math.max((item.count / max) * 100, 2);
        return (
          <div key={i} className="relative w-full h-[28px] xl:h-[30px] group cursor-default rounded-md border border-white/10 bg-white/[0.01] overflow-hidden">
            <div className={`absolute top-0 left-0 h-full bg-gradient-to-r ${item.color} transition-all duration-[2000ms] ease-out`}
              style={{ width: mounted ? `${percentage}%` : '0%', transitionDelay: `${i * 200}ms` }}>
            </div>
            <div className="absolute inset-0 flex items-center justify-between px-3 h-full">
              <span className={`text-[10px] font-bold tracking-wider uppercase z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'} ${item.text}`} style={{ transitionDelay: `${(i * 200) + 400}ms` }}>
                {item.step}
              </span>
              <div className={`flex items-center gap-3 z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`} style={{ transitionDelay: `${(i * 200) + 600}ms` }}>
                <span className="text-[12px] font-bold text-white">{item.count.toLocaleString()}</span>
                {item.value && <span className="text-[10px] font-bold text-zinc-400">{item.value}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
