content = '''"use client";
import { useEffect, useState } from "react";

interface FailData { failureReasons: Record<string, number>; failedPayments: number; }

export default function WhyPaymentsFail({ data }: { data: FailData }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const total = data.failedPayments || 1;
  const sorted = Object.entries(data.failureReasons).sort((a, b) => b[1] - a[1]);
  
  const topReason = sorted.length > 0 ? sorted[0] : ["UNKNOWN", 0] as [string, number];
  const topLabel = String(topReason[0]).replace(/_/g, " ").replace(/\\b\\w/g, (c: string) => c.toUpperCase());
  const topCount = Number(topReason[1]);
  const topPct = total > 0 ? ((topCount / total) * 100).toFixed(0) : "0";

  return (
    <div className="relative w-full h-full pt-6">
      {/* Top Overlapping Badge */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 bg-[#07080B] rounded-full flex items-center justify-center z-10 border-4 border-[#07080B]">
        <div className="w-full h-full bg-[#111] rounded-full flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8FF00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
      </div>

      {/* Main Mint Card */}
      <div className="bg-[#C8FF00] rounded-3xl h-full flex flex-col p-5 pt-10 items-center text-center shadow-lg transition-transform hover:scale-[1.02] duration-300">
        
        <div className="flex-1 flex flex-col justify-center items-center w-full">
          <h3 className="text-[#111] text-xl font-black mb-1.5 leading-tight tracking-tight">
            Top Failure: {topLabel}
          </h3>
          <p className="text-[#333] text-xs font-medium leading-snug px-2">
            {mounted ? topCount : 0} payments ({mounted ? topPct : 0}% of all failures) were stopped due to this issue.
          </p>
        </div>

        <button className="w-full mt-4 py-3 bg-[#111] text-white hover:text-[#C8FF00] text-sm font-bold rounded-2xl hover:bg-black transition-colors flex items-center justify-center gap-2 group">
          <span className="text-lg leading-none font-normal">+</span> Resolve Now
        </button>
      </div>
    </div>
  );
}
'''
with open('frontend/components/dashboard/WhyPaymentsFail.tsx', 'w') as f:
    f.write(content)
