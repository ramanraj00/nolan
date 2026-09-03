"use client";
import { useEffect, useState } from "react";

interface PolicyData { totalEvaluations: number; allowed: number; rejected: number; approvalRequired: number; }

export default function PolicyEngine({ data }: { data: PolicyData }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const total = data.totalEvaluations || 1;

  return (
    <div className="bg-[#111217] rounded-2xl border border-white/5 h-full p-5 flex flex-col relative overflow-hidden">
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#C8FF00]/5 rounded-full blur-[40px] pointer-events-none"></div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-[#888] font-bold text-[10px] tracking-widest uppercase mb-1">Policy Rules</h3>
          <div className="text-xl font-black text-white tabular-nums">{data.totalEvaluations.toLocaleString()}</div>
        </div>
        <span className="text-[8px] text-[#32ADE6] bg-[#32ADE6]/10 px-2 py-1 rounded font-bold uppercase tracking-wider">Active</span>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-5 relative z-10">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-bold text-[#C8FF00] uppercase tracking-wider">Allowed</span>
            <span className="text-[11px] font-bold text-white">{data.allowed.toLocaleString()}</span>
          </div>
          <div className="w-full h-1.5 bg-[#111] rounded-full overflow-hidden">
            <div className="h-full bg-[#C8FF00] rounded-full shadow-[0_0_8px_#C8FF00] transition-all duration-1000" style={{ width: mounted ? `${(data.allowed / total) * 100}%` : '0%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-bold text-[#FF3B30] uppercase tracking-wider">Rejected</span>
            <span className="text-[11px] font-bold text-white">{data.rejected.toLocaleString()}</span>
          </div>
          <div className="w-full h-1.5 bg-[#111] rounded-full overflow-hidden">
            <div className="h-full bg-[#FF3B30] rounded-full shadow-[0_0_8px_#FF3B30] transition-all duration-1000 delay-150" style={{ width: mounted ? `${(data.rejected / total) * 100}%` : '0%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-bold text-[#FF9500] uppercase tracking-wider">Manual Review</span>
            <span className="text-[11px] font-bold text-white">{data.approvalRequired.toLocaleString()}</span>
          </div>
          <div className="w-full h-1.5 bg-[#111] rounded-full overflow-hidden">
            <div className="h-full bg-[#FF9500] rounded-full shadow-[0_0_8px_#FF9500] transition-all duration-1000 delay-300" style={{ width: mounted ? `${Math.max((data.approvalRequired / total) * 100, 2)}%` : '0%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
