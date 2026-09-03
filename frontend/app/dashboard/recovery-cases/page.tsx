"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const dummyCases = [
  { id: "RC-1024", paymentId: "pay_9281", customer: "John Smith", amount: "₹4,500", probability: "90%", diagnosis: "Insufficient Funds", action: "RETRY_PAYMENT", status: "IN_PROGRESS", date: "Oct 24, 2026" },
  { id: "RC-1025", paymentId: "pay_8392", customer: "Sarah Connor", amount: "₹12,400", probability: "75%", diagnosis: "Card Expired", action: "SEND_UPDATE_LINK", status: "ACTION_PENDING", date: "Oct 24, 2026" },
  { id: "RC-1026", paymentId: "pay_7411", customer: "Neo Anderson", amount: "₹2,100", probability: "95%", diagnosis: "Network Timeout", action: "SMART_RETRY", status: "ANALYZING", date: "Oct 23, 2026" },
  { id: "RC-1027", paymentId: "pay_6622", customer: "Bruce Wayne", amount: "₹85,000", probability: "30%", diagnosis: "Suspected Fraud", action: "ESCALATE_HUMAN", status: "ESCALATED", date: "Oct 23, 2026" },
  { id: "RC-1028", paymentId: "pay_5533", customer: "Clark Kent", amount: "₹9,999", probability: "100%", diagnosis: "Issuer Declined", action: "AUTO_RESOLVED", status: "RECOVERED", date: "Oct 22, 2026" },
  { id: "RC-1029", paymentId: "pay_4444", customer: "Peter Parker", amount: "₹1,500", probability: "5%", diagnosis: "Card Blocked", action: "HALT_RECOVERY", status: "UNRECOVERABLE", date: "Oct 21, 2026" },
  { id: "RC-1030", paymentId: "pay_3355", customer: "Tony Stark", amount: "₹45,000", probability: "85%", diagnosis: "Authentication Failed", action: "AWAITING_AI", status: "OPEN", date: "Oct 21, 2026" },
  { id: "RC-1031", paymentId: "pay_2266", customer: "Steve Rogers", amount: "₹3,200", probability: "0%", diagnosis: "Customer Request", action: "CANCEL_WORKFLOW", status: "STOPPED", date: "Oct 20, 2026" }
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "OPEN": return "text-[#fff]";
    case "ANALYZING": return "text-[#902CFF]";
    case "ACTION_PENDING": return "text-[#FF9500]";
    case "IN_PROGRESS": return "text-[#32ADE6]";
    case "RECOVERED": return "text-[#C8FF00]";
    case "ESCALATED": return "text-[#FF3B30]";
    case "STOPPED": return "text-[#888]";
    case "UNRECOVERABLE": return "text-[#FF3B30]";
    default: return "text-[#fff]";
  }
};

export default function RecoveryCasesPage() {
  const router = useRouter();
  const [selectAll, setSelectAll] = useState(false);

  return (
    <div className="p-8 max-w-[1920px] mx-auto h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-[#07080B]">
      
      {/* Top Header Section like reference image */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-black text-white tracking-tight">Recovery Cases</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 bg-[#111217] text-white border border-white/10 hover:border-white/30 rounded-none text-xs font-bold uppercase tracking-widest transition-colors">
            All Cases
          </button>
          <button className="px-4 py-2 bg-[#111217] text-[#888] border border-white/10 hover:border-white/30 hover:text-white rounded-none text-xs font-bold uppercase tracking-widest transition-colors">
            High Risk
          </button>
          <button className="px-4 py-2 bg-[#C8FF00] text-black border border-[#C8FF00] hover:bg-[#b3e600] rounded-none text-xs font-bold uppercase tracking-widest transition-colors ml-4">
            Customize View
          </button>
        </div>
      </div>

      {/* Main Table Container (Brutalist, Flat, Crisp Corners) */}
      <div className="flex-1 bg-[#0f1015] rounded-none border border-white/5 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto scrollbar-hide">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-[#0f1015] sticky top-0 z-10 border-b border-white/5">
              <tr>
                <th className="py-5 pl-8 pr-4 w-10">
                  <input type="checkbox" checked={selectAll} onChange={() => setSelectAll(!selectAll)} className="w-4 h-4 rounded-none border-white/20 bg-transparent text-[#C8FF00] focus:ring-[#C8FF00] focus:ring-offset-0 cursor-pointer accent-[#C8FF00]" />
                </th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">ID</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Payment</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Customer</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Amount</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Prob.</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Diagnosis</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Action</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Date</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] text-center">Status</th>
                <th className="py-5 px-8 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dummyCases.map((rc) => (
                <tr 
                  key={rc.id} 
                  className="group hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-4 pl-8 pr-4">
                    <input type="checkbox" checked={selectAll} readOnly className="w-4 h-4 rounded-none border-white/20 bg-transparent text-[#C8FF00] focus:ring-[#C8FF00] focus:ring-offset-0 cursor-pointer accent-[#C8FF00]" />
                  </td>
                  <td className="py-4 px-4 text-[13px] font-bold text-white cursor-pointer" onClick={() => router.push(`/dashboard/recovery-cases/${rc.id}`)}>{rc.id}</td>
                  <td className="py-4 px-4 text-[13px] font-medium text-[#888]">{rc.paymentId}</td>
                  <td className="py-4 px-4 text-[13px] font-bold text-[#ccc]">{rc.customer}</td>
                  <td className="py-4 px-4 text-[13px] font-black text-[#C8FF00] tabular-nums">{rc.amount}</td>
                  <td className="py-4 px-4 text-[13px] font-bold text-white tabular-nums">{rc.probability}</td>
                  <td className="py-4 px-4 text-[13px] font-medium text-[#aaa]">{rc.diagnosis}</td>
                  <td className="py-4 px-4 text-[13px] font-medium text-[#aaa]">{rc.action.replace(/_/g, ' ')}</td>
                  <td className="py-4 px-4 text-[13px] font-medium text-[#888]">{rc.date}</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-block text-[11px] font-bold uppercase tracking-widest ${getStatusBadge(rc.status)}`}>
                      {rc.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-8 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => router.push(`/dashboard/recovery-cases/${rc.id}`)}
                        className="text-[11px] font-bold text-white hover:text-[#C8FF00] uppercase tracking-widest transition-colors"
                      >
                        Open
                      </button>
                      <button className="text-[11px] font-bold text-[#32ADE6] hover:text-[#7fd3ff] uppercase tracking-widest transition-colors">
                        Analysis
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Flat Bottom bar */}
        <div className="h-16 border-t border-white/5 flex items-center justify-between px-8 bg-[#0f1015] shrink-0">
          <div className="text-[11px] uppercase tracking-widest text-[#555] font-bold">Showing 1 to 8 of 8 entries</div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 border border-white/10 rounded-none flex items-center justify-center text-[#555] hover:text-white hover:border-white/30 transition-colors cursor-not-allowed text-[10px] uppercase font-bold tracking-widest">
              Prev
            </button>
            <button className="px-4 py-2 border border-[#C8FF00] bg-[#C8FF00]/10 rounded-none flex items-center justify-center text-[#C8FF00] font-bold text-[10px] uppercase tracking-widest">1</button>
            <button className="px-4 py-2 border border-white/10 rounded-none flex items-center justify-center text-[#888] hover:text-white hover:border-white/30 transition-colors font-bold text-[10px] uppercase tracking-widest">2</button>
            <button className="px-4 py-2 border border-white/10 rounded-none flex items-center justify-center text-white hover:border-white/30 transition-colors text-[10px] uppercase font-bold tracking-widest">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
