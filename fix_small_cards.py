content_ai = '''"use client";
import { useEffect, useState } from "react";
import AnimatedNumber from "./AnimatedNumber";

interface AIData { totalDecisions: number; averageConfidence: number; }

export default function AIIntelligence({ data, avgRecoveryProbability }: { data: AIData; avgRecoveryProbability: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  return (
    <div className="bg-[#111217] rounded-[20px] border border-white/5 h-full p-5 flex flex-col relative overflow-hidden group justify-between">
      <div className="w-10 h-10 rounded-full bg-[#32ADE6]/10 flex items-center justify-center mb-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#32ADE6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      </div>
      <div>
        <div className="text-[13px] text-[#999] font-medium mb-1">AI Decisions</div>
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
'''
with open('frontend/components/dashboard/AIIntelligence.tsx', 'w') as f:
    f.write(content_ai)

content_policy = '''"use client";
import { useEffect, useState } from "react";
import AnimatedNumber from "./AnimatedNumber";

interface PolicyData { totalEvaluations: number; allowed: number; rejected: number; approvalRequired: number; }

export default function PolicyEngine({ data }: { data: PolicyData }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  return (
    <div className="bg-[#111217] rounded-[20px] border border-white/5 h-full p-5 flex flex-col relative overflow-hidden group justify-between">
      <div className="w-10 h-10 rounded-full bg-[#C8FF00]/10 flex items-center justify-center mb-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8FF00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div>
        <div className="text-[13px] text-[#999] font-medium mb-1">Policy Rules</div>
        <div className="flex items-end gap-2">
           <div className="text-[22px] font-bold text-white leading-none tabular-nums">
             {mounted ? <AnimatedNumber value={data.totalEvaluations} decimals={0} duration={1500} /> : "0"}
           </div>
           <div className="text-[11px] font-medium text-[#4ade80] mb-0.5">
             {mounted ? <AnimatedNumber value={data.allowed} decimals={0} duration={1500} /> : "0"} allowed
           </div>
        </div>
      </div>
    </div>
  );
}
'''
with open('frontend/components/dashboard/PolicyEngine.tsx', 'w') as f:
    f.write(content_policy)
