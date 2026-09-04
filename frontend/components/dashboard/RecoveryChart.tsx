"use client";
import { useState, useMemo } from "react";
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
  const [animKeyRec, setAnimKeyRec] = useState(0);
  const [animKeyRisk, setAnimKeyRisk] = useState(0);

  const handleTabChange = (tab: "recovered" | "risk") => {
    setActiveTab(tab);
    if (tab === "recovered") setAnimKeyRec(prev => prev + 1);
    else setAnimKeyRisk(prev => prev + 1);
  };

  const rec = formatCurrency(data.recoveredRevenue);
  const risk = formatCurrency(data.totalRevenueAtRisk);

  // Build chart points from real trend data
  const { pathData, areaPathData, dotPoints, dayLabels } = useMemo(() => {
    let rawData = data.trend;
    const fallbackLabels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    if (!rawData || rawData.length === 0) {
      const fallbackValues = [42, 58, 51, 67, 61, 74, 69];
      rawData = fallbackLabels.map((_, i) => ({ date: `2026-01-0${i+1}`, recoveredRevenue: fallbackValues[i] }));
    }

    const maxVal = Math.max(...rawData.map(t => t.recoveredRevenue), 1);
    const step = 360 / Math.max(rawData.length - 1, 1);
    
    const pts = rawData.map((t, i) => {
      const x = Math.round(i * step);
      const y = Math.round(100 - (t.recoveredRevenue / maxVal) * 80 - 5);
      return { x, y };
    });

    const labels = data.trend.length ? data.trend.map(t => {
      const d = new Date(t.date);
      return d.toLocaleDateString("en-US", { weekday: "short" });
    }) : fallbackLabels;

    // Smooth Bezier Curve generator
    let path = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const midX = (curr.x + next.x) / 2;
      path += ` C ${midX},${curr.y} ${midX},${next.y} ${next.x},${next.y}`;
    }

    const areaPath = `${path} L ${pts[pts.length - 1].x},110 L ${pts[0].x},110 Z`;

    return {
      pathData: path,
      areaPathData: areaPath,
      dotPoints: pts,
      dayLabels: labels,
    };
  }, [data.trend]);

  // Risk tab shows inverse mathematically for visual effect
  const riskPoints = dotPoints.map(p => ({ x: p.x, y: Math.max(110 - p.y - 10, 5) }));
  
  let riskPath = `M ${riskPoints[0].x},${riskPoints[0].y}`;
  for (let i = 0; i < riskPoints.length - 1; i++) {
    const curr = riskPoints[i];
    const next = riskPoints[i + 1];
    const midX = (curr.x + next.x) / 2;
    riskPath += ` C ${midX},${curr.y} ${midX},${next.y} ${next.x},${next.y}`;
  }
  const riskAreaPath = `${riskPath} L ${riskPoints[riskPoints.length - 1].x},110 L ${riskPoints[0].x},110 Z`;

  const currentPath = activeTab === "recovered" ? pathData : riskPath;
  const currentAreaPath = activeTab === "recovered" ? areaPathData : riskAreaPath;
  const currentDots = activeTab === "recovered" ? dotPoints : riskPoints;
  const color = activeTab === "recovered" ? "#C8FF00" : "#A3A3A3";
  const dropShadow = activeTab === "recovered" ? "drop-shadow(0 0 12px rgba(200,255,0,0.6))" : "drop-shadow(0 0 12px rgba(163,163,163,0.4))";

  const latestDot = currentDots[currentDots.length - 1];

  return (
    <div className="bg-[#111217] rounded-2xl p-5 shadow-lg border border-white/5 h-full flex flex-col justify-between relative overflow-hidden group">
      <style>{`
        @keyframes smoothReveal {
          0% { opacity: 0; transform: translateY(15px) scaleY(0.95); }
          100% { opacity: 1; transform: translateY(0) scaleY(1); }
        }
        .animate-reveal { animation: smoothReveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform-origin: bottom; }
        .chart-path { transition: d 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
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
        <svg viewBox="0 0 360 110" className="w-full h-full overflow-visible animate-reveal" preserveAspectRatio="none" style={{ filter: dropShadow }}>
          <defs>
            <linearGradient id="chartGradientRec" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#C8FF00" stopOpacity="0.4" /><stop offset="100%" stopColor="#C8FF00" stopOpacity="0.0" /></linearGradient>
            <linearGradient id="chartGradientRisk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A3A3A3" stopOpacity="0.3" /><stop offset="100%" stopColor="#A3A3A3" stopOpacity="0.0" /></linearGradient>
          </defs>
          <path d={currentAreaPath} fill={activeTab === "recovered" ? "url(#chartGradientRec)" : "url(#chartGradientRisk)"} className="chart-path" />
          <path d={currentPath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="chart-path" />
          
          {/* Only the latest data point has a dot, making it look much cleaner */}
          <circle cx={latestDot.x} cy={latestDot.y} r="4" fill="#111217" stroke={color} strokeWidth="3" className="transition-all duration-700 ease-out" />
          <circle cx={latestDot.x} cy={latestDot.y} r="12" fill={color} opacity="0.2" className="animate-pulse transition-all duration-700 ease-out" />
        </svg>
        <div className="absolute bottom-[-15px] left-0 right-0 flex justify-between text-[10px] font-medium text-[#666] pt-2">
          {dayLabels.map((d, i) => <span key={i} className="opacity-70">{d}</span>)}
        </div>
      </div>
    </div>
  );
}
