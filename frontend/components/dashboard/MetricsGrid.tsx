"use client";
import { useState } from "react";
import AnimatedNumber from "./AnimatedNumber";

interface MetricsData {
  totalRevenueAtRisk: number;
  recoveredRevenue: number;
  recoveryRate: number;
  failedPayments: number;
}

function formatCurrency(val: number): { value: number; suffix: string; decimals: number } {
  if (val >= 100000) return { value: val / 100000, suffix: "L", decimals: 2 };
  if (val >= 1000) return { value: val / 1000, suffix: "K", decimals: 1 };
  return { value: val, suffix: "", decimals: 0 };
}

export default function MetricsGrid({ data }: { data: MetricsData }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const risk = formatCurrency(data.totalRevenueAtRisk);
  const rec = formatCurrency(data.recoveredRevenue);
  
  const metrics = [
    { title: "Revenue at Risk", animated: <AnimatedNumber prefix="₹" value={risk.value} decimals={risk.decimals} suffix={risk.suffix} />, change: "12.4%" },
    { title: "Recovered Revenue", animated: <AnimatedNumber prefix="₹" value={rec.value} decimals={rec.decimals} suffix={rec.suffix} />, change: "18.7%", highlight: true },
    { title: "Recovery Rate", animated: <AnimatedNumber value={data.recoveryRate} decimals={1} suffix="%" />, change: "6.2%", highlight: true },
    { title: "Failed Payments", animated: <AnimatedNumber value={data.failedPayments} decimals={0} />, change: "8.3%" }
  ];

  return (
    <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 h-auto lg:h-full divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/60" onMouseLeave={() => setHoveredIndex(null)}>
      {/* Magic Hover Line at the bottom boundary */}
      <div 
         className="absolute -bottom-[1px] h-[2px] bg-[#C8FF00] shadow-[0_0_12px_#C8FF00] transition-all duration-300 ease-out z-20 pointer-events-none"
         style={{
           width: '12%',
           left: hoveredIndex !== null ? `${(hoveredIndex * 25) + 12.5}%` : '50%',
           transform: 'translateX(-50%)',
           opacity: hoveredIndex !== null ? 1 : 0
         }}
      />

      {metrics.map((metric, i) => (
        <div 
          key={i} 
          className="flex flex-col justify-center py-4 lg:py-0 px-4 xl:px-6 h-auto lg:h-full transition-colors duration-300 hover:bg-white/[0.01] cursor-default"
          onMouseEnter={() => setHoveredIndex(i)}
        >
          <h3 className="text-zinc-400 text-[11px] font-medium tracking-widest uppercase mb-2">{metric.title}</h3>
          <div className="flex items-end justify-between">
            <div className={`text-[24px] font-bold tracking-tight tabular-nums leading-none transition-colors duration-300 ${hoveredIndex === i ? 'text-white' : metric.highlight ? 'text-[#C8FF00]' : 'text-white'}`}>
              {metric.animated}
            </div>
            <div className="flex items-center gap-1 text-zinc-400 text-[11px] font-medium">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C8FF00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17l9.2-9.2M17 17V7H7"/>
              </svg>
              <span className={`transition-colors duration-300 ${hoveredIndex === i ? 'text-zinc-200' : 'text-zinc-400'}`}>{metric.change}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
