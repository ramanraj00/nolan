"use client";
import { useEffect, useState } from "react";
import AnimatedNumber from "./AnimatedNumber";

interface PolicyData { totalEvaluations: number; allowed: number; rejected: number; approvalRequired: number; }

export default function PolicyEngine({ data }: { data: PolicyData }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  return (
    <div className="bg-[#111217] rounded-[20px] border border-white/10 shadow-[0_0_20px_rgba(200,255,0,0.05)] h-full p-5 flex flex-col relative overflow-hidden group justify-between">
      <div className="w-10 h-10 rounded-full bg-[#C8FF00]/10 flex items-center justify-center mb-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8FF00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div>
        <div className="text-[13px] text-zinc-400 font-medium mb-1">Policy Rules</div>
        <div className="flex items-end gap-2">
           <div className="text-[22px] font-bold text-white leading-none tabular-nums">
             {mounted ? <AnimatedNumber value={data.totalEvaluations} decimals={0} duration={1500} /> : "0"}
           </div>
           <div className="text-[10px] font-medium text-zinc-400 mb-0.5">
             <span className="text-[#4ade80]">{mounted ? <AnimatedNumber value={data.allowed} decimals={0} duration={1500} /> : "0"} auto</span> + <span className="text-[#FF9500]">{mounted ? <AnimatedNumber value={data.approvalRequired} decimals={0} duration={1500} /> : "0"} manual</span>
           </div>
        </div>
      </div>
    </div>
  );
}
