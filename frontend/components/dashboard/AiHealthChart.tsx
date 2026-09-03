"use client";
import { useEffect, useState } from "react";
import AnimatedNumber from "./AnimatedNumber";

interface HealthData { recovered: number; pending: number; failed: number; }

export default function AiHealthChart({ data }: { data: HealthData }) {
  const { recovered, pending, failed } = data;
  const total = recovered + pending + failed || 1;
  const radius = 70, circumference = 2 * Math.PI * radius, gap = 5;
  const availableLength = circumference - (3 * gap);
  const recLength = (recovered / total) * availableLength;
  const penLength = (pending / total) * availableLength;
  const failLength = (failed / total) * availableLength;
  const recRot = 0, penRot = ((recLength + gap) / circumference) * 360, failRot = ((recLength + gap + penLength + gap) / circumference) * 360;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 200); }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full flex items-center justify-center mb-4">
        <h3 className="text-[#888] font-bold text-[11px] uppercase tracking-widest">Analysis Breakdown</h3>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center relative w-full">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 drop-shadow-2xl" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="#222" strokeWidth="16" />
            <circle cx="80" cy="80" r={radius} fill="none" stroke="#C8FF00" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${recLength} ${circumference}`} strokeDashoffset={mounted ? 0 : recLength} style={{ transform: `rotate(${recRot}deg)`, transformOrigin: "50% 50%" }} className="transition-all duration-[2000ms] ease-out drop-shadow-[0_0_8px_rgba(200,255,0,0.5)]" />
            <circle cx="80" cy="80" r={radius} fill="none" stroke="#32ADE6" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${penLength} ${circumference}`} strokeDashoffset={mounted ? 0 : penLength} style={{ transform: `rotate(${penRot}deg)`, transformOrigin: "50% 50%" }} className="transition-all duration-[2000ms] ease-out delay-[400ms] drop-shadow-[0_0_8px_rgba(50,173,230,0.5)]" />
            <circle cx="80" cy="80" r={radius} fill="none" stroke="#FF3B30" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${failLength} ${circumference}`} strokeDashoffset={mounted ? 0 : failLength} style={{ transform: `rotate(${failRot}deg)`, transformOrigin: "50% 50%" }} className="transition-all duration-[2000ms] ease-out delay-[800ms] drop-shadow-[0_0_8px_rgba(255,59,48,0.5)]" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-3xl font-black text-white tabular-nums tracking-tighter">{mounted ? <AnimatedNumber value={total} decimals={0} duration={1500} /> : "0"}</div>
            <div className="text-[9px] font-bold text-[#888] mt-0.5 uppercase tracking-widest">Analyzed</div>
          </div>
        </div>
        <div className="w-full mt-6 grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 mb-1"><div className="w-1.5 h-1.5 rounded-full bg-[#C8FF00] shadow-[0_0_5px_#C8FF00]"></div><span className="text-[9px] font-bold text-[#888] uppercase tracking-wider">Recovered</span></div>
            <span className="text-sm font-bold text-white tabular-nums">{mounted ? <AnimatedNumber value={recovered} decimals={0} duration={1500} /> : "0"}</span>
          </div>
          <div className="flex flex-col items-center justify-center border-l border-r border-white/10">
            <div className="flex items-center gap-1.5 mb-1"><div className="w-1.5 h-1.5 rounded-full bg-[#32ADE6] shadow-[0_0_5px_#32ADE6]"></div><span className="text-[9px] font-bold text-[#888] uppercase tracking-wider">Pending</span></div>
            <span className="text-sm font-bold text-white tabular-nums">{mounted ? <AnimatedNumber value={pending} decimals={0} duration={1500} /> : "0"}</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 mb-1"><div className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] shadow-[0_0_5px_#FF3B30]"></div><span className="text-[9px] font-bold text-[#888] uppercase tracking-wider">Failed</span></div>
            <span className="text-sm font-bold text-white tabular-nums">{mounted ? <AnimatedNumber value={failed} decimals={0} duration={1500} /> : "0"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
