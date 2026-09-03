"use client";
const systems = [
  { name: "Razorpay", status: "Connected", healthy: true },
  { name: "Webhook", status: "Healthy", healthy: true },
  { name: "AI Agent", status: "Healthy", healthy: true },
  { name: "Policy Engine", status: "Active", healthy: true },
];

export default function SystemHealth() {
  return (
    <div className="bg-[#111217] rounded-xl p-4 border border-white/[0.02] h-full flex flex-col justify-between">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-medium text-[12px]">System Health</h3>
        <span className="text-[10px] text-[#C8FF00] font-medium">Operational</span>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 justify-center">
        {systems.map((sys, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
            <span className="text-[10px] text-[#ccc]">{sys.name}</span>
            <span className={`text-[9px] ${sys.healthy ? 'text-[#888]' : 'text-[#FF3B30]'}`}>{sys.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
