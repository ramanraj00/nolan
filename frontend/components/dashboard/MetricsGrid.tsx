"use client";
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
  const risk = formatCurrency(data.totalRevenueAtRisk);
  const rec = formatCurrency(data.recoveredRevenue);
  
  const metrics = [
    { title: "Revenue at Risk", animated: <AnimatedNumber prefix="₹" value={risk.value} decimals={risk.decimals} suffix={risk.suffix} />, change: "+12.4%", subtitle: `Across ${data.failedPayments} failed payments` },
    { title: "Recovered Revenue", animated: <AnimatedNumber prefix="₹" value={rec.value} decimals={rec.decimals} suffix={rec.suffix} />, change: "+18.7%", subtitle: "Successfully recovered" },
    { title: "Recovery Rate", animated: <AnimatedNumber value={data.recoveryRate} decimals={1} suffix="%" />, change: "+6.2%", subtitle: "Of revenue at risk" },
    { title: "Failed Payments", animated: <AnimatedNumber value={data.failedPayments} decimals={0} />, change: "+8.3%", subtitle: "This period" }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, i) => (
        <div key={i} className="bg-[#111217] rounded-2xl p-5 border border-white/5 relative overflow-hidden group flex flex-col justify-between">
          <div className="relative z-10 flex items-start justify-between mb-3">
            <h3 className="text-[#888] text-[11px] font-bold uppercase tracking-wider">{metric.title}</h3>
          </div>
          <div className="relative z-10 flex items-end justify-between mb-1.5">
            <div className="text-3xl font-black text-white tracking-tight tabular-nums leading-none">{metric.animated}</div>
            <div className="flex items-center text-[11px] font-bold text-[#C8FF00] bg-[#C8FF00]/10 px-2 py-1 rounded border border-[#C8FF00]/20 mb-1">
              {metric.change}
            </div>
          </div>
          <div className="relative z-10 text-[#666] text-[10px] font-bold">{metric.subtitle}</div>
        </div>
      ))}
    </div>
  );
}
