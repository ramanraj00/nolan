"use client";
import { useEffect, useState } from "react";
import AnimatedNumber from "./AnimatedNumber";

interface AIData { totalDecisions: number; averageConfidence: number; }

export default function AIIntelligence({ data, avgRecoveryProbability }: { data: AIData; avgRecoveryProbability: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const confidence = data.averageConfidence;
  const c = 2 * Math.PI * 45;
  const l1 = (confidence / 100) * c;

  return (
    <div className="bg-[#111217] rounded-2xl border border-white/5 h-full p-5 flex items-center gap-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#32ADE6]/5 rounded-full blur-[40px] pointer-events-none"></div>
      <div className="relative w-32 h-32 shrink-0">
        <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_10px_rgba(50,173,230,0.5)]" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#111" strokeWidth="6" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#32ADE6" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${l1} ${c}`} strokeDashoffset={mounted ? 0 : l1} className="transition-all duration-[1500ms] ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-white tabular-nums tracking-tighter">
            {mounted ? <AnimatedNumber value={confidence} decimals={1} duration={1500} /> : "0"}%
          </span>
          <span className="text-[7px] text-[#32ADE6] font-bold uppercase tracking-widest mt-1">Confidence</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-4 z-10">
        <div>
          <div className="text-[9px] text-[#888] font-bold uppercase tracking-widest mb-0.5">Top Recommendation</div>
          <div className="text-[13px] font-bold text-[#C8FF00] bg-[#C8FF00]/10 inline-block px-2 py-0.5 rounded border border-[#C8FF00]/20">RETRY_PAYMENT</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[8px] text-[#666] font-bold uppercase tracking-wider mb-0.5">Decisions</div>
            <div className="text-[14px] font-black text-white tabular-nums">{mounted ? <AnimatedNumber value={data.totalDecisions} decimals={0} duration={1500} /> : "0"}</div>
          </div>
          <div>
            <div className="text-[8px] text-[#666] font-bold uppercase tracking-wider mb-0.5">Avg Prob</div>
            <div className="text-[14px] font-black text-[#C8FF00] tabular-nums">{mounted ? <AnimatedNumber value={avgRecoveryProbability} decimals={1} duration={1500} /> : "0"}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
