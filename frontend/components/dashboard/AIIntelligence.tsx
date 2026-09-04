"use client";
import { useEffect, useState } from "react";
import AnimatedNumber from "./AnimatedNumber";

interface AIData { totalDecisions: number; averageConfidence: number; }

export default function AIIntelligence({ data, avgRecoveryProbability }: { data: AIData; avgRecoveryProbability: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  return (
    <div className="bg-[#111217] rounded-[20px] border border-white/10 shadow-[0_0_20px_rgba(200,255,0,0.05)] h-full p-5 flex flex-col relative overflow-hidden group justify-between">
      <div className="w-10 h-10 rounded-full bg-[#32ADE6]/10 flex items-center justify-center mb-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#32ADE6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      </div>
      <div>
        <div className="text-[13px] text-zinc-400 font-medium mb-1">AI Decisions</div>
        <div className="flex items-end gap-2">
           <div className="text-[22px] font-bold text-white leading-none tabular-nums">
             {mounted ? <AnimatedNumber value={data.totalDecisions} decimals={0} duration={1500} /> : "0"}
           </div>
           <div className="text-[11px] font-medium text-[#C8FF00] mb-0.5">
             {mounted ? avgRecoveryProbability.toFixed(1) : "0"}% avg prob
           </div>
        </div>
      </div>
    </div>
  );
}
