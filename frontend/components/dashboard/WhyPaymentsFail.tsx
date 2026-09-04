"use client";
import { useEffect, useState } from "react";

interface FailData { failureReasons: Record<string, number>; failedPayments: number; }

const LABELS: Record<string, string> = {
  INSUFFICIENT_FUNDS: "FUNDS", CARD_DECLINED: "CARD", NETWORK_ERROR: "NETWORK",
  AUTHENTICATION: "AUTH", UNKNOWN: "UNKWN", EXPIRED_CARD: "EXPRD", FRAUD: "FRAUD",
};

export default function WhyPaymentsFail({ data }: { data: FailData }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const total = data.failedPayments || 1;
  const sorted = Object.entries(data.failureReasons).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

  // Top reason for opportunity panel
  const topReason = sorted.length > 0 ? sorted[0] : ["UNKNOWN", 0] as [string, number];
  const topLabel = String(topReason[0]).replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  const topCount = Number(topReason[1]);
  const topPct = total > 0 ? ((topCount / total) * 100).toFixed(0) : "0";

  return (
    <div className="bg-[#111217] rounded-2xl border border-white/5 h-full flex relative overflow-hidden group">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      <div className="flex-1 p-5 flex flex-col z-10">
        <h3 className="text-[#888] font-bold text-[10px] tracking-widest uppercase mb-1">Failure Distribution</h3>
        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-3xl font-black text-white tracking-tighter">{data.failedPayments.toLocaleString()}</span>
        </div>
        <div className="flex-1 flex items-end justify-between gap-3 mt-4">
          {sorted.map((r, i) => {
            const pct = (r[1] / maxCount) * 85;
            return (
              <div key={r[0]} className="flex flex-col items-center flex-1 group/bar cursor-pointer">
                <div className="w-full relative bg-white/5 rounded-t-sm overflow-hidden flex flex-col justify-end" style={{ height: '100px' }}>
                  <div className="w-full bg-gradient-to-t from-[#902CFF] to-[#D53BFF] rounded-t-sm transition-all duration-1000 ease-out group-hover/bar:brightness-125" 
                    style={{ height: mounted ? `${pct}%` : '0%', transitionDelay: `${i * 100}ms` }}></div>
                </div>
                <span className="text-[8px] text-[#666] font-bold mt-2 uppercase tracking-wider">{LABELS[r[0]] || r[0].slice(0, 5)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="w-[180px] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-l border-white/5 p-4 flex flex-col justify-between z-10 overflow-hidden">
        <div className="flex-1 flex flex-col justify-start">
          <div className="text-[8px] text-[#C8FF00] font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5 shrink-0">
            <div className="w-1.5 h-1.5 bg-[#C8FF00] rounded-full shadow-[0_0_5px_#C8FF00] animate-pulse"></div>
            Opportunity
          </div>
          <div className="text-[12px] font-black text-white leading-tight mb-2 break-words line-clamp-2 shrink-0" title={topLabel}>{topLabel}</div>
          <div className="flex flex-col gap-2 shrink-0">
            <div>
              <div className="text-[8px] text-[#666] uppercase tracking-wider">Affected</div>
              <div className="text-[12px] font-bold text-white tabular-nums">{topCount} payments</div>
            </div>
            <div>
              <div className="text-[8px] text-[#666] uppercase tracking-wider">Share</div>
              <div className="text-[12px] font-bold text-[#C8FF00] tabular-nums">{topPct}%</div>
            </div>
          </div>
        </div>
        <button className="w-full py-1.5 mt-2 bg-[#C8FF00]/10 text-[#C8FF00] text-[9px] font-bold uppercase tracking-widest rounded border border-[#C8FF00]/20 hover:bg-[#C8FF00]/20 transition-all shrink-0">
          Execute Retry
        </button>
      </div>
    </div>
  );
}
