"use client";

const recentOrders = [
  { id: "#PAY_9872", customer: "Liam K.", date: "Oct 31, 10:45 AM", status: "Recovered", amount: "₹4,500", action: "View", color: "text-[#C8FF00]", bg: "bg-[#C8FF00]/10", border: "border-[#C8FF00]/20" },
  { id: "#PAY_9863", customer: "Emma W.", date: "Oct 31, 10:42 AM", status: "Processing", amount: "₹8,200", action: "View", color: "text-[#0A84FF]", bg: "bg-[#0A84FF]/10", border: "border-[#0A84FF]/20" },
  { id: "#PAY_9860", customer: "Sophia M.", date: "Oct 31, 10:15 AM", status: "Failed", amount: "₹1,250", action: "Review", color: "text-[#FF3B30]", bg: "bg-[#FF3B30]/10", border: "border-[#FF3B30]/20" },
  { id: "#PAY_9855", customer: "Noah J.", date: "Oct 31, 09:30 AM", status: "Recovered", amount: "₹12,400", action: "View", color: "text-[#C8FF00]", bg: "bg-[#C8FF00]/10", border: "border-[#C8FF00]/20" },
  { id: "#PAY_9842", customer: "Olivia B.", date: "Oct 31, 09:05 AM", status: "Escalated", amount: "₹3,100", action: "Manage", color: "text-[#FF9500]", bg: "bg-[#FF9500]/10", border: "border-[#FF9500]/20" },
];

export default function RecentRecoveriesTable() {
  return (
    <div className="bg-[#111] border border-white/5 rounded-2xl p-5 md:p-6 h-full flex flex-col relative overflow-hidden group">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold text-base">Recent Recoveries</h3>
        <span className="text-[#888] text-sm font-medium">10 Pending</span>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-[#888]">
              <th className="pb-3 font-medium whitespace-nowrap pl-2">Case ID</th>
              <th className="pb-3 font-medium whitespace-nowrap">Customer</th>
              <th className="pb-3 font-medium whitespace-nowrap">Time</th>
              <th className="pb-3 font-medium whitespace-nowrap">Status</th>
              <th className="pb-3 font-medium whitespace-nowrap">Amount</th>
              <th className="pb-3 font-medium whitespace-nowrap text-right pr-2">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {recentOrders.map((order, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group/row">
                <td className="py-3.5 pl-2 font-medium text-white whitespace-nowrap">{order.id}</td>
                <td className="py-3.5 text-[#E5E5E5] whitespace-nowrap">{order.customer}</td>
                <td className="py-3.5 text-[#888] text-xs whitespace-nowrap">{order.date}</td>
                <td className="py-3.5 whitespace-nowrap">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border ${order.color} ${order.bg} ${order.border}`}>
                    {order.status}
                  </span>
                </td>
                <td className="py-3.5 text-white font-medium tabular-nums whitespace-nowrap">{order.amount}</td>
                <td className="py-3.5 text-right pr-2 whitespace-nowrap">
                  <button className="text-[#0A84FF] text-xs font-semibold hover:text-white transition-colors">
                    {order.action}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
