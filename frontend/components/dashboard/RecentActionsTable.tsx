"use client";
import { RecoveryAction } from "../../lib/api";

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "text-[#C8FF00]", EXECUTING: "text-[#32ADE6]", PENDING: "text-[#FF9500]",
  SCHEDULED: "text-[#FF9500]", FAILED: "text-[#FF3B30]", CANCELLED: "text-[#FF3B30]",
  PENDING_APPROVAL: "text-[#FF9500]",
};

const TYPE_SHORT: Record<string, string> = {
  RETRY_PAYMENT: "Retry", SEND_PAYMENT_REMINDER: "Reminder",
  ESCALATE_HUMAN: "Human", REQUEST_PAYMENT_METHOD_UPDATE: "Update",
  SEND_CHECKOUT_RECOVERY: "Checkout", RETRY_SUBSCRIPTION: "Sub Retry",
  STOP_RECOVERY: "Stop",
};

export default function RecentActionsTable({ data }: { data: RecoveryAction[] }) {
  const recent = data.slice(0, 5);

  return (
    <div className="bg-[#111217] rounded-2xl border border-white/5 h-full p-5 flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[#888] font-bold text-[10px] tracking-widest uppercase">Action Log</h3>
        <span className="text-[9px] text-[#C8FF00] uppercase tracking-wider font-bold cursor-pointer">Export</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="pb-3 text-[9px] font-bold text-[#666] uppercase tracking-widest">ID</th>
              <th className="pb-3 text-[9px] font-bold text-[#666] uppercase tracking-widest">Action</th>
              <th className="pb-3 text-[9px] font-bold text-[#666] uppercase tracking-widest">Status</th>
              <th className="pb-3 text-[9px] font-bold text-[#666] uppercase tracking-widest text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-center text-[10px] text-[#666]">No actions yet</td></tr>
            )}
            {recent.map((act) => (
              <tr key={act.id} className="group cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="py-3 text-[10px] font-black text-white">{act.id.slice(0, 8)}</td>
                <td className="py-3 text-[10px] text-[#ccc] font-medium">{TYPE_SHORT[act.type] || act.type}</td>
                <td className="py-3">
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${STATUS_COLORS[act.status] || 'text-[#888]'}`}>{act.status}</span>
                </td>
                <td className="py-3 text-[10px] text-[#888] text-right tabular-nums">
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
