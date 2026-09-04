content = '''"use client";
import { useEffect, useState } from "react";

interface FailData { failureReasons: Record<string, number>; failedPayments: number; }

export default function WhyPaymentsFail({ data }: { data: FailData }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const total = data.failedPayments || 1;
  const sorted = Object.entries(data.failureReasons).sort((a, b) => b[1] - a[1]);

  return (
    <div className="relative flex flex-col h-full w-full">
      {/* Top Overlapping Badge (Cutout Illusion) - Smaller */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[52px] h-[52px] bg-[#07080B] rounded-full flex items-center justify-center z-10">
        <div className="w-9 h-9 bg-[#111] rounded-full flex items-center justify-center shadow-inner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e6ff7a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
      </div>

      {/* Main Mint Card - Softer color, smaller padding */}
      <div className="bg-[#e6ff7a] rounded-[24px] flex-1 mt-[26px] p-4 pt-8 flex flex-col items-center shadow-lg transition-transform hover:scale-[1.01] duration-300">
        
        <h3 className="text-[#111] text-[10px] font-black uppercase tracking-widest mb-3 opacity-80">
          Failure Distribution
        </h3>

        <div className="flex-1 w-full flex flex-col gap-1.5 justify-center">
          {sorted.slice(0, 3).map((r) => {
             const label = String(r[0]).replace(/_/g, " ").replace(/\\b\\w/g, (c) => c.toUpperCase());
             const count = Number(r[1]);
             const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
             return (
               <div key={r[0]} className="w-full flex items-center justify-between bg-black/5 rounded-[12px] px-3 py-2">
                 <span className="text-[#111] text-[10px] font-extrabold truncate mr-2">{label}</span>
                 <div className="flex items-center gap-1.5 shrink-0">
                   <span className="text-[#444] text-[10px] font-semibold">{mounted ? count : 0}</span>
                   <span className="text-[#111] text-[10px] font-black w-[26px] text-right">{mounted ? pct : 0}%</span>
                 </div>
               </div>
             )
          })}
          {sorted.length === 0 && (
             <div className="text-[#333] text-[10px] font-medium text-center my-auto">No failure data available</div>
          )}
        </div>

        <button className="w-full mt-3 py-2.5 bg-[#111] text-white hover:text-[#e6ff7a] text-[10px] font-bold rounded-[14px] hover:bg-black transition-colors flex items-center justify-center gap-1.5 shadow-md">
           Resolve Issues
        </button>
      </div>
    </div>
  );
}
'''
with open('frontend/components/dashboard/WhyPaymentsFail.tsx', 'w') as f:
    f.write(content)
