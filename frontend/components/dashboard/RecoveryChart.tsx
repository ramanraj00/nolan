"use client";
import { useState, useEffect, useMemo } from "react";
import AnimatedNumber from "./AnimatedNumber";

interface ChartData {
  recoveredRevenue: number;
  totalRevenueAtRisk: number;
  trend: { date: string; recoveredRevenue: number }[];
}

function formatCurrency(val: number): { value: number; suffix: string; decimals: number } {
  if (val >= 100000) return { value: val / 100000, suffix: "L", decimals: 2 };
  if (val >= 1000) return { value: val / 1000, suffix: "K", decimals: 1 };
  return { value: val, suffix: "", decimals: 0 };
}

export default function RecoveryChart({ data }: { data: ChartData }) {
  const [activeTab, setActiveTab] = useState<"recovered" | "risk">("recovered");
  const [mounted, setMounted] = useState(false);
  const [animKeyRec, setAnimKeyRec] = useState(0);
  const [animKeyRisk, setAnimKeyRisk] = useState(0);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const handleTabChange = (tab: "recovered" | "risk") => {
    setActiveTab(tab);
    if (tab === "recovered") setAnimKeyRec(prev => prev + 1);
    else setAnimKeyRisk(prev => prev + 1);
  };

  const rec = formatCurrency(data.recoveredRevenue);
  const risk = formatCurrency(data.totalRevenueAtRisk);

  // Build chart points from real trend data
  const { chartPoints, dotPoints, dayLabels } = useMemo(() => {
    if (!data.trend.length) {
      return { chartPoints: "0,90 60,80 120,85 180,55 240,40 300,50 360,25", dotPoints: [{x:0,y:90},{x:60,y:80},{x:120,y:85},{x:180,y:55},{x:240,y:40},{x:300,y:50},{x:360,y:25}], dayLabels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] };
    }
    const maxVal = Math.max(...data.trend.map(t => t.recoveredRevenue), 1);
    const step = 360 / Math.max(data.trend.length - 1, 1);
    const pts = data.trend.map((t, i) => {
      const x = Math.round(i * step);
      const y = Math.round(100 - (t.recoveredRevenue / maxVal) * 80 - 5);
      return { x, y };
    });
    const labels = data.trend.map(t => {
      const d = new Date(t.date);
      return d.toLocaleDateString("en-US", { weekday: "short" });
    });
    return {
      chartPoints: pts.map(p => `${p.x},${p.y}`).join(" "),
      dotPoints: pts,
      dayLabels: labels,
    };
  }, [data.trend]);

  // Risk tab shows inverse
  const riskPoints = dotPoints.map(p => ({ x: p.x, y: Math.max(110 - p.y - 10, 5) }));
  const riskChartPoints = riskPoints.map(p => `${p.x},${p.y}`).join(" ");

  const currentPoints = activeTab === "recovered" ? chartPoints : riskChartPoints;
  const currentDots = activeTab === "recovered" ? dotPoints : riskPoints;
  const color = activeTab === "recovered" ? "#C8FF00" : "#888888";

  return (
    <div className="bg-[#111217] rounded-2xl p-5 shadow-lg border border-white/5 h-full flex flex-col justify-between relative overflow-hidden group">
      <style>{`
        @keyframes drawOriginToRight {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-draw { stroke-dasharray: 1000; animation: drawOriginToRight 1.5s cubic-bezier(0.22,1,0.36,1) forwards; }
      `}</style>

      <div className="flex justify-between items-start z-10 relative mb-4">
        <div className="flex gap-6">
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 transition-colors duration-500 ${activeTab === "recovered" ? "text-[#C8FF00]" : "text-[#666]"}`}>Recovered</div>
            <div className="text-2xl font-black text-white tracking-tight tabular-nums leading-none">
              <AnimatedNumber key={`rec-${animKeyRec}`} prefix="₹" value={rec.value} decimals={rec.decimals} suffix={rec.suffix} />
            </div>
          </div>
          <div>
            <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 transition-colors duration-500 ${activeTab === "risk" ? "text-white" : "text-[#666]"}`}>At Risk</div>
            <div className="text-2xl font-black text-white tracking-tight tabular-nums leading-none">
              <AnimatedNumber key={`risk-${animKeyRisk}`} prefix="₹" value={risk.value} decimals={risk.decimals} suffix={risk.suffix} />
            </div>
          </div>
        </div>
        <div className="flex p-1 bg-black/40 border border-white/5 rounded-md shrink-0">
          <button onClick={() => handleTabChange("recovered")} className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all duration-500 ${activeTab === "recovered" ? "bg-[#111217] text-[#C8FF00] border border-white/10 shadow-md" : "text-[#888] hover:text-white border border-transparent"}`}>Recovered</button>
          <button onClick={() => handleTabChange("risk")} className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all duration-500 ${activeTab === "risk" ? "bg-[#111217] text-white border border-white/10 shadow-md" : "text-[#888] hover:text-white border border-transparent"}`}>At Risk</button>
        </div>
      </div>

      <div className="flex-1 relative w-full mt-2 z-0 min-h-[140px]">
        <svg viewBox="0 0 360 110" className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradientRec" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#C8FF00" stopOpacity="0.25" /><stop offset="100%" stopColor="#C8FF00" stopOpacity="0.0" /></linearGradient>
            <linearGradient id="chartGradientRisk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#888888" stopOpacity="0.25" /><stop offset="100%" stopColor="#888888" stopOpacity="0.0" /></linearGradient>
          </defs>
          <polygon points={`${currentPoints} 360,110 0,110`} fill={activeTab === "recovered" ? "url(#chartGradientRec)" : "url(#chartGradientRisk)"} className="transition-all duration-[1000ms] ease-in-out" style={{ opacity: mounted ? 1 : 0 }} />
          <polyline points={currentPoints} fill="none" stroke={color} strokeWidth="2" className={`transition-all duration-[1000ms] ease-in-out ${mounted ? 'animate-draw' : ''} ${activeTab === 'recovered' ? 'drop-shadow-[0_0_8px_rgba(200,255,0,0.6)]' : 'drop-shadow-[0_0_8px_rgba(136,136,136,0.6)]'}`} />
          {currentDots.map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="#111217" stroke={color} strokeWidth="2" className="transition-all duration-[1000ms] ease-in-out" style={{ opacity: mounted ? 1 : 0, transitionDelay: mounted ? `${i * 150}ms` : '0ms' }} />
          ))}
        </svg>
        <div className="absolute bottom-[-15px] left-0 right-0 flex justify-between text-[10px] font-medium text-[#666] pt-2">
          {dayLabels.map((d, i) => <span key={i}>{d}</span>)}
        </div>
      </div>
    </div>
  );
}
