"use client";

interface ActionData { totalActions: number; successful: number; failed: number; cancelled: number; }

export default function AuditPreview({ data }: { data: ActionData }) {
  const total = data.totalActions || 1;
  const successRate = ((data.successful / total) * 100).toFixed(1);

  return (
    <div className="bg-[#111217] rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(200,255,0,0.05)] h-full p-4 flex flex-col justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF9500]/5 rounded-full blur-[30px] pointer-events-none"></div>
      <h3 className="text-zinc-400 font-bold text-[10px] tracking-widest uppercase mb-4">Action Health</h3>
      <div className="space-y-4 relative z-10">
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[13px] font-bold text-white">Success Rate</div>
            <div className="text-[8px] text-zinc-400 uppercase tracking-widest">{data.successful} of {data.totalActions}</div>
          </div>
          <div className="text-[9px] font-bold text-[#C8FF00] uppercase tracking-widest">{successRate}%</div>
        </div>
        <div className="w-full h-1 bg-[#111] rounded-full">
          <div className="h-full bg-[#C8FF00] rounded-full shadow-[0_0_8px_#C8FF00]" style={{ width: `${successRate}%` }}></div>
        </div>
        <div className="flex justify-between items-end mt-4">
          <div>
            <div className="text-[13px] font-bold text-white">Failed</div>
            <div className="text-[8px] text-zinc-400 uppercase tracking-widest">{data.failed} actions</div>
          </div>
          <div className="text-[9px] font-bold text-[#FF3B30] uppercase tracking-widest">{data.failed}</div>
        </div>
        <div className="w-full h-1 bg-[#111] rounded-full overflow-hidden">
          <div className="h-full bg-[#FF3B30] rounded-full shadow-[0_0_8px_#FF3B30]" style={{ width: `${(data.failed / total) * 100}%` }}></div>
        </div>
      </div>
    </div>
  );
}
