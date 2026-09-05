"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, Merchant } from "../../../lib/api";

interface AgentDecision {
  id: string;
  recoveryCaseId: string;
  diagnosis: string;
  reasoning: string;
  recoveryProbability: string | number;
  recommendedAction: string;
  confidence: string | number;
  model: string;
  createdAt: string;
}

export default function AIDecisionsPage() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [selectedDecision, setSelectedDecision] = useState<AgentDecision | null>(null);

  useEffect(() => {
    async function load() {
      try {
        let mid = process.env.NEXT_PUBLIC_MERCHANT_ID;
        if (!mid) {
           const merchants = await fetchApi<Merchant[]>("/merchants");
           mid = merchants[0].id;
        }

        const res = await fetchApi<{ data: AgentDecision[] }>(`/agent-decisions?merchant_id=${mid}`);
        setDecisions(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredDecisions = decisions.filter((d) => {
    const q = search.toLowerCase();
    const caseDisplayId = `RC-${(parseInt(d.recoveryCaseId.replace(/-/g, '').substring(0, 8), 16) % 9000 + 1000)}`;
    const matchesSearch = 
      d.id.toLowerCase().includes(q) ||
      caseDisplayId.toLowerCase().includes(q) ||
      (d.diagnosis || '').toLowerCase().includes(q) ||
      (d.recommendedAction || '').toLowerCase().includes(q);
      
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredDecisions.length / itemsPerPage);
  const displayDecisions = filteredDecisions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
  };

  const handleExport = () => {
    if (filteredDecisions.length === 0) return;
    const headers = ["Decision ID", "Recovery Case ID", "Diagnosis", "Probability", "Action", "Confidence", "Model", "Created At", "Reasoning"];
    const rows = filteredDecisions.map(d => [
      d.id,
      `RC-${(parseInt(d.recoveryCaseId.replace(/-/g, '').substring(0, 8), 16) % 9000 + 1000)}`,
      d.diagnosis,
      `${Number(d.recoveryProbability || 0).toFixed(1)}%`,
      d.recommendedAction,
      `${(Number(d.confidence || 0) * 100).toFixed(1)}%`,
      d.model,
      new Date(d.createdAt).toISOString(),
      d.reasoning
    ]);
    const escapeCSV = (str: unknown) => `"${String(str).replace(/"/g, '""')}"`;
    const csvContent = [headers.join(","), ...rows.map(r => r.map(escapeCSV).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ai_decisions_${new Date().getTime()}.csv`);
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
            <h1 className="text-3xl font-black tracking-tight mb-2">AI Decisions</h1>
            <p className="text-[#888] text-sm font-medium">Audit log of autonomous agent behavior and reasoning.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 lg:gap-4 w-full lg:w-auto">
            <div className="relative group">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555] group-focus-within:text-[#32ADE6] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input 
                type="text" 
                placeholder="Search decisions..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="bg-[#111217] border border-white/10 text-white text-sm focus:border-[#32ADE6] focus:ring-1 focus:ring-[#32ADE6] rounded-none pl-10 pr-4 py-2 w-64 transition-all placeholder:text-[#555]"
              />
            </div>
            <button onClick={handleExport} className="px-4 py-2 bg-[#111217] border border-white/10 hover:border-white/30 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#ccc]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4 lg:px-8 lg:pb-8">
        <div className="flex-1 bg-[#111217] border border-white/5 relative flex overflow-hidden">
          
          {/* Table Container */}
          <div className={`flex-1 overflow-auto relative transition-all duration-300 ${selectedDecision ? 'border-r border-white/5' : ''}`}>
            
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f1015]/80 z-20 backdrop-blur-sm">
              <div className="w-8 h-8 border-4 border-[#C8FF00] border-t-transparent rounded-none animate-spin"></div>
            </div>
          )}

          <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-[#0f1015] z-10 outline outline-1 outline-white/5">
                <tr>
                  <th className="py-5 px-6 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Decision ID</th>
                  <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Case</th>
                  <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Diagnosis</th>
                  <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Prob.</th>
                  <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Action</th>
                  <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Confidence</th>
                  <th className="py-5 px-4 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">Model</th>
                  <th className="py-5 px-6 text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                
                {!loading && displayDecisions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-[#555] font-medium text-sm">
                      No AI decisions found.
                    </td>
                  </tr>
                )}
                {displayDecisions.map((d: AgentDecision) => {
                  const isSelected = selectedDecision?.id === d.id;
                  const displayId = `RC-${(parseInt(d.recoveryCaseId.replace(/-/g, '').substring(0, 8), 16) % 9000 + 1000)}`;
                  return (
                    <tr 
                      key={d.id} 
                      onClick={() => setSelectedDecision(isSelected ? null : d)}
                      className={`group cursor-pointer transition-colors ${isSelected ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}
                    >
                      <td className="py-4 px-6 text-[13px] font-mono font-bold text-[#32ADE6]">
                        {d.id.split('-')[0]}
                      </td>
                      <td className="py-4 px-4 text-[13px] font-bold text-white hover:text-[#C8FF00] transition-colors" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/recovery-cases/${d.recoveryCaseId}`); }}>
                        {displayId}
                      </td>
                      <td className="py-4 px-4 text-[13px] font-medium text-[#ccc]">{d.diagnosis}</td>
                      <td className="py-4 px-4 text-[13px] font-black text-[#C8FF00] tabular-nums">
                        {Number(d.recoveryProbability || 0).toFixed(0)}%
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-white/10 text-white">
                          {d.recommendedAction.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-[13px] font-bold text-[#32ADE6] tabular-nums">
                        {(Number(d.confidence || 0) * 100).toFixed(1)}%
                      </td>
                      <td className="py-4 px-4 text-[13px] font-medium text-[#888]">
                        {d.model}
                      </td>
                      <td className="py-4 px-6 text-[13px] font-medium text-[#888] text-right">
                        {formatDate(d.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Details Panel */}
          {selectedDecision && (
            <div className="w-full lg:w-[400px] shrink-0 bg-[#0c0d12] flex flex-col overflow-y-auto absolute lg:relative inset-y-0 right-0 z-50">
              <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0c0d12] z-10">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Decision Details</h3>
                <button onClick={() => setSelectedDecision(null)} className="text-[#888] hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6 flex flex-col gap-8">
                <div>
                  <div className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2">Diagnosis</div>
                  <div className="text-white font-medium text-sm bg-white/5 p-4 border border-white/10 rounded-sm">
                    {selectedDecision.diagnosis}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <svg className="w-3 h-3 text-[#32ADE6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    AI Reasoning
                  </div>
                  <div className="text-[#ccc] text-sm leading-relaxed border-l-2 border-[#32ADE6] pl-4">
                    {selectedDecision.reasoning}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2">Recommendation</div>
                  <div className="bg-[#C8FF00]/10 border border-[#C8FF00]/20 p-4 rounded-sm flex items-center justify-between">
                    <span className="text-[#C8FF00] font-black uppercase tracking-widest text-xs">
                      {selectedDecision.recommendedAction.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[#C8FF00] font-black text-lg tabular-nums">
                      {Number(selectedDecision.recoveryProbability || 0).toFixed(0)}% <span className="text-[9px] text-[#C8FF00]/60 uppercase tracking-widest ml-1">Prob</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div>
                    <div className="text-[9px] font-bold text-[#666] uppercase tracking-widest mb-1">Model</div>
                    <div className="text-[#ccc] text-sm font-bold">{selectedDecision.model}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-[#666] uppercase tracking-widest mb-1">Confidence</div>
                    <div className="text-[#32ADE6] text-sm font-bold tabular-nums">{(Number(selectedDecision.confidence || 0) * 100).toFixed(1)}%</div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
        
        {/* Flat Bottom bar */}
        <div className="h-auto lg:h-16 py-4 lg:py-0 border-t border-white/5 flex flex-col lg:flex-row items-center justify-between px-4 lg:px-8 gap-4 lg:gap-0 bg-[#0f1015] shrink-0 outline outline-1 outline-white/5 z-20">
          <div className="text-[11px] uppercase tracking-widest text-[#555] font-bold">
            Showing {displayDecisions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredDecisions.length)} of {filteredDecisions.length} entries
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
                    ? 'border-[#32ADE6] bg-[#32ADE6]/10 text-[#32ADE6]' 
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
