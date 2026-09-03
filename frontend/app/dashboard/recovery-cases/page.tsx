"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useRecoveryCases } from "../../../lib/useRecoveryCases";
import { RecoveryCase } from "../../../lib/api";

const getStatusBadge = (status: string) => {
  const base = "px-3 py-1.5 font-black uppercase tracking-widest text-[10px]";
  switch (status) {
    case "OPEN": return `${base} bg-white text-black`;
    case "ANALYZING": return `${base} bg-[#AF52DE] text-white`;
    case "ACTION_PENDING": return `${base} bg-[#FF9500] text-black`;
    case "IN_PROGRESS": return `${base} bg-[#32ADE6] text-black`;
    case "RECOVERED": return `${base} bg-[#C8FF00] text-black`;
    case "ESCALATED": return `${base} bg-[#FF3B30] text-white`;
    case "STOPPED": return `${base} bg-[#555555] text-white`;
    case "UNRECOVERABLE": return `${base} bg-[#FF3B30] text-white`;
    default: return `${base} bg-white/20 text-white`;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

type ColumnKey = 'ID' | 'Payment' | 'Customer' | 'Amount' | 'Probability' | 'Diagnosis' | 'Action' | 'Date' | 'Status' | 'Actions';

const getRecommendedAction = (diagnosis: string | null) => {
  if (!diagnosis) return 'PENDING';
  switch (diagnosis) {
    case "Insufficient Funds": return "SMART RETRY";
    case "Card Expired": return "SEND UPDATE LINK";
    case "Network Timeout": return "SILENT RETRY";
    case "Suspected Fraud": return "ESCALATE HUMAN";
    case "Issuer Declined": return "ROUTE ALTERNATE";
    case "Authentication Failed": return "SEND PAYMENT LINK";
    case "Card Blocked": return "HALT RECOVERY";
    case "Daily Limit Exceeded": return "RETRY TOMORROW";
    default: return "AI ANALYZING";
  }
};

export default function RecoveryCasesPage() {
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('All Cases');
  const [showCustomize, setShowCustomize] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>({
    ID: true,
    Payment: true,
    Customer: true,
    Amount: true,
    Probability: true,
    Diagnosis: true,
    Action: true,
    Date: true,
    Status: true,
    Actions: true,
  });

  const { cases, loading, error } = useRecoveryCases(filter);
  const customizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customizeRef.current && !customizeRef.current.contains(event.target as Node)) {
        setShowCustomize(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleColumn = (col: ColumnKey) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const cols: ColumnKey[] = ['ID', 'Payment', 'Customer', 'Amount', 'Probability', 'Diagnosis', 'Action', 'Date', 'Status', 'Actions'];

  const totalPages = Math.ceil(cases.length / itemsPerPage);
  const displayCases = cases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = () => {
    if (selectedRows.size === displayCases.length && displayCases.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(displayCases.map((c: RecoveryCase) => c.id)));
    }
  };

  const toggleRow = (id: string) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRows(newSet);
  };

  return (
    <div className="p-8 max-w-[1920px] mx-auto h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-[#07080B]">
      
      {/* Top Header Section */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-black text-white tracking-tight">Recovery Cases</h1>
          {selectedRows.size > 0 && (
             <span className="bg-[#C8FF00]/10 text-[#C8FF00] px-3 py-1 text-xs font-bold uppercase tracking-widest border border-[#C8FF00]/30 rounded-none">
               {selectedRows.size} Selected
             </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setFilter('All Cases'); setCurrentPage(1); }}
            className={`px-4 py-2 border rounded-none text-xs font-bold uppercase tracking-widest transition-colors ${filter === 'All Cases' ? 'bg-[#111217] text-white border-white/30' : 'bg-[#111217] text-[#888] border-white/10 hover:border-white/30 hover:text-white'}`}
          >
            All Cases
          </button>
          <button 
            onClick={() => { setFilter('High Risk'); setCurrentPage(1); }}
            className={`px-4 py-2 border rounded-none text-xs font-bold uppercase tracking-widest transition-colors ${filter === 'High Risk' ? 'bg-[#111217] text-white border-white/30' : 'bg-[#111217] text-[#888] border-white/10 hover:border-white/30 hover:text-white'}`}
          >
            High Risk
          </button>

          <div className="relative ml-4" ref={customizeRef}>
            <button 
              onClick={() => setShowCustomize(!showCustomize)}
              className="px-4 py-2 bg-[#C8FF00] text-black border border-[#C8FF00] hover:bg-[#b3e600] rounded-none text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              Customize View
              <svg className={`w-3 h-3 transition-transform ${showCustomize ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            
            {showCustomize && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#111217] border border-white/10 shadow-2xl z-50">
                <div className="p-3 border-b border-white/5 bg-[#1a1b23]">
                  <h4 className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Toggle Columns</h4>
                </div>
                <div className="p-2 flex flex-col gap-1 max-h-64 overflow-y-auto">
                  {cols.map((col) => (
                    <label key={col} className="flex items-center gap-3 px-2 py-2 hover:bg-white/5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns[col]} 
                        onChange={() => toggleColumn(col)}
                        className="w-3.5 h-3.5 rounded-none border-white/20 bg-transparent text-[#C8FF00] focus:ring-[#C8FF00] focus:ring-offset-0 cursor-pointer accent-[#C8FF00]" 
                      />
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider">{col}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 bg-[#0f1015] rounded-none border border-white/5 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto scrollbar-hide relative">
          
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f1015]/80 z-20 backdrop-blur-sm">
              <div className="w-8 h-8 border-4 border-[#C8FF00] border-t-transparent rounded-none animate-spin"></div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f1015] z-20">
              <div className="text-[#FF3B30] font-bold text-sm bg-[#FF3B30]/10 px-4 py-2 border border-[#FF3B30]/20">{error}</div>
            </div>
          )}

          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-[#0f1015] sticky top-0 z-10 border-b border-white/5">
              <tr>
                <th className="py-5 pl-6 pr-3 w-10">
                  <input 
                    type="checkbox" 
                    checked={displayCases.length > 0 && selectedRows.size === displayCases.length} 
                    onChange={handleSelectAll} 
                    className="w-4 h-4 rounded-none border-white/20 bg-transparent text-[#C8FF00] focus:ring-[#C8FF00] focus:ring-offset-0 cursor-pointer accent-[#C8FF00]" 
                  />
                </th>
                {visibleColumns.ID && <th className="py-5 px-3 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">ID</th>}
                {visibleColumns.Payment && <th className="py-5 px-3 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Payment</th>}
                {visibleColumns.Customer && <th className="py-5 px-3 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Customer</th>}
                {visibleColumns.Amount && <th className="py-5 px-3 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Amount</th>}
                {visibleColumns.Probability && <th className="py-5 px-3 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Prob.</th>}
                {visibleColumns.Diagnosis && <th className="py-5 px-3 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Diagnosis</th>}
                {visibleColumns.Action && <th className="py-5 px-3 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Action</th>}
                {visibleColumns.Date && <th className="py-5 px-3 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Date</th>}
                {visibleColumns.Status && <th className="py-5 px-3 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] text-center">Status</th>}
                {visibleColumns.Actions && <th className="py-5 pr-6 pl-2 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayCases.length === 0 && !loading && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#555] font-medium text-sm">
                    No recovery cases found.
                  </td>
                </tr>
              )}
              {displayCases.map((rc: RecoveryCase, idx: number) => {
                const firstName = (rc.customerName || 'Unknown').split(' ')[0];
                return (
                  <tr 
                    key={rc.id} 
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-4 pl-6 pr-3">
                      <input 
                        type="checkbox" 
                        checked={selectedRows.has(rc.id)} 
                        onChange={() => toggleRow(rc.id)} 
                        className="w-4 h-4 rounded-none border-white/20 bg-transparent text-[#C8FF00] focus:ring-[#C8FF00] focus:ring-offset-0 cursor-pointer accent-[#C8FF00]" 
                      />
                    </td>
                    {visibleColumns.ID && <td className="py-4 px-3 text-[13px] font-bold text-white cursor-pointer" onClick={() => router.push(`/dashboard/recovery-cases/${rc.id}`)}>
                      RC-{(parseInt(rc.id.replace(/-/g, '').substring(0, 8), 16) % 9000 + 1000)}
                    </td>}
                    {visibleColumns.Payment && <td className="py-4 px-3 text-[13px] font-bold text-white">
                      {(rc.payment?.id || `pay_${rc.paymentId.split('-')[0]}`)}
                    </td>}
                    {visibleColumns.Customer && <td className="py-4 px-3 text-[13px] font-bold text-[#ccc]">{rc.customerName || 'Unknown'}</td>}
                    {visibleColumns.Amount && <td className="py-4 px-3 text-[13px] font-black text-[#C8FF00] tabular-nums">{formatCurrency(Number(rc.revenueAtRisk || 0))}</td>}
                    {visibleColumns.Probability && <td className="py-4 px-3 text-[13px] font-bold text-white tabular-nums">{Number(rc.recoveryProbability || 0).toFixed(0)}%</td>}
                    {visibleColumns.Diagnosis && <td className="py-4 px-3 text-[13px] font-medium text-[#aaa]">{rc.diagnosis || 'Analyzing'}</td>}
                    {visibleColumns.Action && <td className="py-4 px-3 text-[13px] font-medium text-[#aaa]">{getRecommendedAction(rc.diagnosis)}</td>}
                    {visibleColumns.Date && <td className="py-4 px-3 text-[13px] font-medium text-[#888]">{formatDate(rc.createdAt)}</td>}
                    {visibleColumns.Status && <td className="py-4 px-3 text-center">
                      <span className={`inline-block text-[10px] font-black uppercase tracking-widest ${getStatusBadge(rc.status)}`}>
                        {rc.status.replace(/_/g, ' ')}
                      </span>
                    </td>}
                    {visibleColumns.Actions && <td className="py-4 pr-6 pl-2 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
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
                    </td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Flat Bottom bar */}
        <div className="h-16 border-t border-white/5 flex items-center justify-between px-8 bg-[#0f1015] shrink-0">
          <div className="text-[11px] uppercase tracking-widest text-[#555] font-bold">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, cases.length)} of {cases.length} entries
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
