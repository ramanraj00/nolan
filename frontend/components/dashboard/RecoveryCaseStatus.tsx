"use client";

const STATUS_COLORS: Record<string, string> = {
  RECOVERED: "text-[#C8FF00]", OPEN: "text-[#32ADE6]", ANALYZING: "text-[#32ADE6]",
  ACTION_PENDING: "text-[#FF9500]", IN_PROGRESS: "text-[#FF9500]",
  ESCALATED: "text-[#FF3B30]", STOPPED: "text-[#FF3B30]", UNRECOVERABLE: "text-[#FF3B30]",
};

const DISPLAY: Record<string, string> = {
  RECOVERED: "Recovered", OPEN: "Open", ANALYZING: "Analyzing",
  ACTION_PENDING: "Action Pending", IN_PROGRESS: "In Progress",
  ESCALATED: "Escalated", STOPPED: "Stopped", UNRECOVERABLE: "Unrecoverable",
};

export default function RecoveryCaseStatus({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="bg-[#111217] rounded-2xl border border-white/5 h-full p-5 flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[#888] font-bold text-[10px] tracking-widest uppercase">Case Status</h3>
        <div className="w-2 h-2 bg-[#C8FF00] rounded-full shadow-[0_0_8px_#C8FF00] animate-pulse"></div>
      </div>
      <div className="flex-1 flex flex-col justify-between overflow-y-auto">
        {entries.map(([status, count]) => (
          <div key={status} className="flex justify-between items-center group cursor-pointer">
            <span className={`text-[10px] font-bold ${STATUS_COLORS[status] || 'text-white'}`}>{DISPLAY[status] || status}</span>
            <div className="flex-1 border-b border-dashed border-white/10 mx-3 opacity-50"></div>
            <span className="text-[10px] font-black text-white tabular-nums">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
