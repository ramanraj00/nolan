"use client";
import { RecoveryAction } from "../../lib/api";

const base = "px-2 py-1 font-bold uppercase tracking-widest text-[9px] inline-block";
const STATUS_COLORS: Record<string, string> = {
  SUCCESS: `${base} bg-[#C8FF00] text-black`,
  EXECUTING: `${base} bg-[#32ADE6] text-black`,
  PENDING: `${base} bg-[#FF9500] text-black`,
  SCHEDULED: `${base} bg-[#FF9500] text-black`,
  FAILED: `${base} bg-[#FF3B30] text-white`,
  CANCELLED: `${base} bg-[#FF3B30] text-white`,
  PENDING_APPROVAL: `${base} bg-[#FF9500] text-black`,
};

const TYPE_SHORT: Record<string, string> = {
  RETRY_PAYMENT: "Retry", SEND_PAYMENT_REMINDER: "Reminder",
  ESCALATE_HUMAN: "Human", REQUEST_PAYMENT_METHOD_UPDATE: "Update",
  SEND_CHECKOUT_RECOVERY: "Checkout", RETRY_SUBSCRIPTION: "Sub Retry",
  STOP_RECOVERY: "Stop",
};

export default function RecentActionsTable({ data }: { data: RecoveryAction[] }) {
  const recent = data.slice(0, 5);

  const handleExport = () => {
    if (data.length === 0) return;
    const headers = ["Action ID", "Type", "Status", "Created At", "Result"];
    const rows = data.map(act => [
      act.id,
      act.type,
      act.status,
      act.createdAt ? new Date(act.createdAt).toISOString() : "",
      act.result || ""
    ]);
    const escapeCSV = (str: unknown) => `"${String(str).replace(/"/g, '""')}"`;
    const csvContent = [headers.join(","), ...rows.map(r => r.map(escapeCSV).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `recent_actions_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#111217] rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(200,255,0,0.05)] h-full p-4 xl:p-5 flex flex-col min-h-0 relative overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-zinc-400 font-bold text-[10px] tracking-widest uppercase">Action Log</h3>
        <span onClick={handleExport} className="text-[9px] text-[#C8FF00] uppercase tracking-wider font-bold cursor-pointer hover:text-[#e2ff66] transition-colors">Export</span>
      </div>
      <div className="h-auto max-h-[350px] lg:h-[66px] lg:max-h-none my-auto snap-y snap-mandatory overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <table className="w-full h-full text-left">
          <thead className="sticky top-0 bg-[#111217] z-10 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.5)]">
            <tr>
              <th className="pb-2 pt-1 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">ID</th>
              <th className="pb-2 pt-1 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Action</th>
              <th className="pb-2 pt-1 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
              <th className="pb-2 pt-1 text-[9px] font-bold text-zinc-400 uppercase tracking-widest text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-center text-[10px] text-zinc-400">No actions yet</td></tr>
            )}
            {recent.map((act) => (
              <tr key={act.id} className="snap-start h-full group cursor-pointer border-b border-white/10 shadow-[0_0_20px_rgba(200,255,0,0.05)] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="py-3 text-[10px] font-bold text-white">{act.id.slice(0, 8)}</td>
                <td className="py-3 text-[10px] text-[#ccc] font-medium">{TYPE_SHORT[act.type] || act.type}</td>
                <td className="py-3">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${STATUS_COLORS[act.status] || 'text-zinc-400'}`}>{act.status}</span>
                </td>
                <td className="py-3 text-[10px] text-zinc-400 text-right tabular-nums">
                  {act.createdAt ? new Date(act.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
