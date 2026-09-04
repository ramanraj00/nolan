"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, Merchant } from "../../../lib/api";

interface Payment {
  id: string;
  merchantId: string;
  customerId: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  failureReason?: string;
  attemptCount: number;
  createdAt: string;
  failedAt?: string;
  recoveredAt?: string;
  customerName?: string;
  recoveryCaseId?: string;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    async function load() {
      try {
        let mid = process.env.NEXT_PUBLIC_MERCHANT_ID;
        if (!mid) {
           const merchants = await fetchApi<Merchant[]>("/merchants");
           mid = merchants[0].id;
        }

        const res = await fetchApi<{ data: Payment[] }>(`/payments?merchant_id=${mid}`);
        setPayments(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredPayments = payments.filter((p) => {
    // Search
    const q = search.toLowerCase();
    const matchesSearch = 
      (p.razorpayPaymentId || '').toLowerCase().includes(q) ||
      (p.customerName || '').toLowerCase().includes(q) ||
      (p.failureReason || '').toLowerCase().includes(q);
      
    if (!matchesSearch) return false;

    // Status Filter
    if (statusFilter !== "ALL") {
       if (statusFilter === "SUCCESSFUL" && p.status !== "CAPTURED") return false;
       if (statusFilter === "FAILED" && p.status !== "FAILED") return false;
       if (statusFilter === "REFUNDED" && p.status !== "REFUNDED") return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const displayPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
  };

  const getStatusBadge = (status: string) => {
    const base = "px-3 py-1.5 font-black uppercase tracking-widest text-[10px]";
    switch (status) {
      case 'CAPTURED': return `${base} bg-[#C8FF00] text-black`;
      case 'FAILED': return `${base} bg-[#FF3B30] text-white`;
      case 'REFUNDED': return `${base} bg-[#555555] text-white`;
      default: return `${base} bg-white text-black`;
    }
  };

  const handleExport = () => {
    if (filteredPayments.length === 0) return;

    const headers = [
      "Payment ID", "Customer Name", "Amount", "Currency", 
      "Status", "Failure Reason", "Attempts", "Created At", "Recovery Case ID"
    ];
    
    const rows = filteredPayments.map(p => [
      p.razorpayPaymentId,
      p.customerName || 'Unknown',
      p.amount,
      p.currency,
      p.status,
      p.failureReason || 'N/A',
      p.attemptCount,
      new Date(p.createdAt).toISOString(),
      p.recoveryCaseId || 'N/A'
    ]);

    const escapeCSV = (str: unknown) => `"${String(str).replace(/"/g, '""')}"`;
    const csvContent = [headers.join(","), ...rows.map(r => r.map(escapeCSV).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `payments_${statusFilter.toLowerCase()}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#07080B] text-white">
      {/* Header section */}
      <div className="p-8 shrink-0">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between mb-4 lg:mb-8 gap-4 lg:gap-0">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Payments</h1>
            <p className="text-[#888] text-sm font-medium">Raw transaction logs from your gateway.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 lg:gap-4 w-full lg:w-auto">
            <div className="relative group">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555] group-focus-within:text-[#C8FF00] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input 
                type="text" 
                placeholder="Search payments..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="bg-[#111217] border border-white/10 text-white text-sm focus:border-[#C8FF00] focus:ring-1 focus:ring-[#C8FF00] rounded-none pl-10 pr-4 py-2 w-64 transition-all placeholder:text-[#555]"
              />
            </div>
            <button onClick={handleExport} className="px-4 py-2 bg-[#111217] border border-white/10 hover:border-white/30 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#ccc]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-white/10 pb-4">
          {/* Mobile View: Dropdown Filter */}
          <div className="lg:hidden relative">
            <button
              onClick={() => setShowMobileFilter(!showMobileFilter)}
              className="px-4 py-3 bg-[#111217] text-white border border-white/20 hover:border-white/40 flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-[0.2em] rounded-none"
            >
              <span>{statusFilter === 'ALL' ? 'ALL PAYMENTS' : statusFilter}</span>
              <svg className={`w-4 h-4 transition-transform ${showMobileFilter ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            
            {showMobileFilter && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1b23] border border-white/20 z-50 flex flex-col shadow-2xl">
                {['ALL', 'SUCCESSFUL', 'FAILED', 'REFUNDED'].map(f => (
                  <button
                    key={f}
                    onClick={() => { setStatusFilter(f); setCurrentPage(1); setShowMobileFilter(false); }}
                    className={`px-4 py-4 text-[10px] text-left font-bold uppercase tracking-[0.2em] transition-all border-b border-white/5 last:border-none ${
                      statusFilter === f 
                        ? 'bg-white/10 text-[#C8FF00]' 
                        : 'text-[#888] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop View: Tab Buttons */}
          <div className="hidden lg:flex items-center gap-2">
            {['ALL', 'SUCCESSFUL', 'FAILED', 'REFUNDED'].map(f => (
              <button
                key={f}
                onClick={() => { setStatusFilter(f); setCurrentPage(1); }}
                className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all rounded-none ${
                  statusFilter === f 
                    ? 'bg-white text-black' 
                    : 'text-[#888] hover:text-white hover:bg-white/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4 lg:px-8 lg:pb-8">
        <div className="flex-1 overflow-auto bg-[#111217] border border-white/5 relative">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="sticky top-0 bg-[#0f1015] z-10 outline outline-1 outline-white/5">
              <tr>
                <th className="py-5 px-6 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Payment ID</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Customer</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Amount</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Status</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Failure Reason</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Attempts</th>
                <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Created</th>
                <th className="py-5 px-6 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] text-right">Recovery Case</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                 <tr>
                    <td colSpan={8} className="py-12 text-center text-[#555] font-medium text-sm">Loading payments...</td>
                 </tr>
              )}
              {!loading && displayPayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#555] font-medium text-sm">
                    No payments found.
                  </td>
                </tr>
              )}
              {displayPayments.map((p: Payment) => (
                <tr 
                  key={p.id} 
                  className="group hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-4 px-6 text-[13px] font-mono text-white">
                    {p.razorpayPaymentId}
                  </td>
                  <td className="py-4 px-4 text-[13px] font-bold text-[#ccc]">{p.customerName || 'Unknown'}</td>
                  <td className="py-4 px-4 text-[13px] font-black text-white tabular-nums">
                    {formatCurrency(Number(p.amount), p.currency)}
                  </td>
                  <td className="py-4 px-4">
                    <span className={getStatusBadge(p.status)}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-[13px] font-medium text-[#aaa] max-w-[200px] truncate">
                    {p.failureReason || <span className="text-[#666] font-bold text-[10px] uppercase tracking-widest">N/A</span>}
                  </td>
                  <td className="py-4 px-4 text-[13px] font-bold text-[#888] tabular-nums">
                    {p.attemptCount}
                  </td>
                  <td className="py-4 px-4 text-[13px] font-medium text-[#888]">
                    {formatDate(p.createdAt)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {p.recoveryCaseId ? (
                      <button 
                        onClick={() => router.push(`/dashboard/recovery-cases/${p.recoveryCaseId}`)}
                        className="text-[11px] font-bold text-[#32ADE6] hover:text-[#7fd3ff] uppercase tracking-widest transition-colors flex items-center justify-end gap-1 w-full"
                      >
                        RC-{(parseInt(p.recoveryCaseId.replace(/-/g, '').substring(0, 8), 16) % 9000 + 1000)}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-[#444] uppercase tracking-widest">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Flat Bottom bar */}
        <div className="h-auto lg:h-16 py-4 lg:py-0 border-t border-white/5 flex flex-col lg:flex-row items-center justify-between px-4 lg:px-8 gap-4 lg:gap-0 bg-[#0f1015] shrink-0 outline outline-1 outline-white/5">
          <div className="text-[11px] uppercase tracking-widest text-[#555] font-bold">
            Showing {displayPayments.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-white/10 rounded-none flex items-center justify-center text-[#888] hover:text-white hover:border-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[10px] uppercase font-bold tracking-widest"
            >
              Prev
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
              Math.max(0, Math.min(currentPage - 2, totalPages - 3)), 
              Math.min(totalPages, Math.max(3, currentPage + 1))
            ).map(p => (
              <button 
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`px-4 py-2 border rounded-none flex items-center justify-center font-bold text-[10px] uppercase tracking-widest transition-colors ${
                  currentPage === p 
                    ? 'border-[#C8FF00] bg-[#C8FF00]/10 text-[#C8FF00]' 
                    : 'border-white/10 text-[#888] hover:text-white hover:border-white/30'
                }`}
              >
                {p}
              </button>
            ))}

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-4 py-2 border border-white/10 rounded-none flex items-center justify-center text-[#888] hover:text-white hover:border-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-[10px] uppercase font-bold tracking-widest"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
