"use client";
import { useEffect, useState } from "react";

interface FailData { failureReasons: Record<string, number>; failedPayments: number; }

export default function WhyPaymentsFail({ data }: { data: FailData }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const total = data.failedPayments || 1;
  const sorted = Object.entries(data.failureReasons).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-[#111217] rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(200,255,0,0.05)] flex-1 h-full p-4 xl:p-5 flex flex-col justify-between group">
      
      <div className="flex items-center justify-between mb-1 xl:mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#C8FF00]/10 border border-[#C8FF00]/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-[0_0_10px_rgba(200,255,0,0.1)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8FF00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
            Failure Distribution
          </h3>
        </div>
        <button className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-800">
          Resolve Issues
        </button>
      </div>

      <div className="flex-1 w-full flex flex-col gap-2 justify-center">
        {sorted.map((r, i) => {
           const label = String(r[0]).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
           const count = Number(r[1]);
           const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
           return (
             <div key={r[0]} className="w-full">
               <div className="flex items-center justify-between mb-1">
                 <span className="text-zinc-200 text-[11px] font-bold tracking-wide">{label}</span>
                 <div className="flex items-center gap-3">
                   <span className="text-white text-[12px] font-bold tabular-nums">{mounted ? count : 0}</span>
                   <span className="text-zinc-500 text-[11px] font-bold w-[28px] text-right tabular-nums">{mounted ? pct : 0}%</span>
                 </div>
               </div>
               {/* Progress bar line */}
               <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                 <div className="h-full bg-gradient-to-r from-[#C8FF00]/50 to-[#C8FF00] rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(200,255,0,0.8)]" style={{ width: mounted ? `${pct}%` : '0%', transitionDelay: `${i * 100}ms` }}></div>
               </div>
             </div>
           )
        })}
        {sorted.length === 0 && (
           <div className="text-zinc-500 text-[11px] font-medium text-center my-auto">No failure data available</div>
        )}
      </div>

    </div>
  );
}
