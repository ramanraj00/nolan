"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, Merchant } from "../../../lib/api";

interface AuditEvent {
  id: string;
  merchantId: string;
  recoveryCaseId: string | null;
  entityType: string;
  entityId: string;
  eventType: string;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const getActorBadge = (actor: string) => {
  const base = "px-3 py-1.5 font-black uppercase tracking-widest text-[9px]";
  switch (actor) {
    case 'SYSTEM': return `${base} bg-white text-black`;
    case 'AI_AGENT': return `${base} bg-[#32ADE6] text-black`;
    case 'POLICY_ENGINE': return `${base} bg-[#AF52DE] text-white`;
    case 'HUMAN': return `${base} bg-[#FF9500] text-black`;
    default: return `${base} bg-[#555555] text-white`;
  }
};

const getEventColor = (event: string) => {
  if (event.includes('FAILED') || event.includes('REJECTED') || event.includes('STOPPED')) return 'text-[#FF3B30]';
  if (event.includes('SUCCESS') || event.includes('RECOVERED') || event.includes('APPROVED')) return 'text-[#C8FF00]';
  if (event.includes('DETECTED') || event.includes('COMPLETED')) return 'text-[#32ADE6]';
  if (event.includes('EVALUATED') || event.includes('ESCALATED')) return 'text-[#FF9500]';
  return 'text-white';
};

const formatDate = (dateString: string | null, fallback: string = "-") => {
  if (!dateString) return fallback;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(dateString));
};

export default function AuditTrailPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('ALL');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const itemsPerPage = 15;

  useEffect(() => {
    async function load() {
      try {
        let mid = process.env.NEXT_PUBLIC_MERCHANT_ID;
        if (!mid) {
           const merchants = await fetchApi<Merchant[]>("/merchants");
           mid = merchants[0].id;
        }

        const res = await fetchApi<{ data: AuditEvent[] }>(`/audit-events?merchant_id=${mid}`);
        // sort by newest first
        const sorted = res.data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEvents(sorted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const actors = ['ALL', 'SYSTEM', 'AI_AGENT', 'POLICY_ENGINE', 'HUMAN'];

  const filteredEvents = events.filter(ev => {
    if (filter === 'ALL') return true;
    return ev.actor === filter;
  });

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const displayEvents = filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#07080B] text-white relative">
      {/* Header section */}
      <div className="p-8 shrink-0">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between mb-4 lg:mb-8 gap-4 lg:gap-0">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Audit Trail</h1>
            <p className="text-[#888] text-sm font-medium">Immutable timeline of system actions, AI decisions, and human interventions.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-white/5 pb-4">
          {/* Mobile View: Dropdown Filter */}
          <div className="lg:hidden relative">
            <button
              onClick={() => setShowMobileFilter(!showMobileFilter)}
              className="px-4 py-3 bg-[#111217] text-white border border-white/20 hover:border-white/40 flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-widest rounded-none"
            >
              <span>{filter === 'ALL' ? 'ALL ACTORS' : filter.replace(/_/g, ' ')}</span>
              <svg className={`w-4 h-4 transition-transform ${showMobileFilter ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            
            {showMobileFilter && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1b23] border border-white/20 z-50 flex flex-col shadow-2xl max-h-64 overflow-y-auto">
                {actors.map(a => (
                  <button
                    key={a}
                    onClick={() => { setFilter(a); setCurrentPage(1); setShowMobileFilter(false); }}
                    className={`px-4 py-4 text-[10px] text-left font-bold uppercase tracking-widest transition-all border-b border-white/5 last:border-none ${
                      filter === a 
                        ? 'bg-white/10 text-[#C8FF00]' 
                        : 'text-[#888] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {a.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop View: Tab Buttons */}
          <div className="hidden lg:flex flex-wrap items-center gap-2">
            {actors.map(a => (
              <button
                key={a}
                onClick={() => { setFilter(a); setCurrentPage(1); }}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filter === a 
                    ? 'bg-[#111217] text-[#C8FF00] border border-white/10 shadow-md' 
                    : 'text-[#666] hover:text-white border border-transparent'
                }`}
              >
                {a.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4 lg:px-8 lg:pb-8">
        <div className="flex-1 bg-[#111217] border border-white/5 relative flex overflow-hidden">
          
          {/* Table Container */}
          <div className={`flex-1 overflow-auto transition-all duration-300 ${selectedEvent ? 'border-r border-white/5' : ''}`}>
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-[#0f1015] z-10 outline outline-1 outline-white/5">
                <tr>
                  <th className="py-5 px-6 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="py-5 px-4 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Actor</th>
                  <th className="py-5 px-4 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Event Type</th>
                  <th className="py-5 px-4 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Entity</th>
                  <th className="py-5 px-4 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Case ID</th>
                  <th className="py-5 px-6 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em] text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading && (
                   <tr>
                      <td colSpan={6} className="py-12 text-center text-[#555] font-medium text-sm">Loading Audit Log...</td>
                   </tr>
                )}
                {!loading && filteredEvents.length === 0 && (
                   <tr>
                      <td colSpan={6} className="py-12 text-center text-[#555] font-medium text-sm">No events found.</td>
                   </tr>
                )}
                {displayEvents.map((ev) => {
                  const isSelected = selectedEvent?.id === ev.id;
                  const displayCaseId = ev.recoveryCaseId ? `RC-${(parseInt(ev.recoveryCaseId.replace(/-/g, '').substring(0, 8), 16) % 9000 + 1000)}` : '-';
                  return (
                    <tr 
                      key={ev.id} 
                      onClick={() => setSelectedEvent(isSelected ? null : ev)}
                      className={`group cursor-pointer transition-colors ${isSelected ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}
                    >
                      <td className="py-4 px-6 text-[11px] font-mono font-medium text-[#888]">
                        {formatDate(ev.createdAt)}
                      </td>
                      <td className="py-4 px-4">
                        <span className={getActorBadge(ev.actor)}>
                          {ev.actor.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`text-[11px] font-black uppercase tracking-wider ${getEventColor(ev.eventType)}`}>
                          {ev.eventType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-[10px] font-mono text-[#666]">
                          {ev.entityType}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {ev.recoveryCaseId ? (
                           <span className="text-[12px] font-bold text-[#32ADE6] hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/recovery-cases/${ev.recoveryCaseId}`); }}>
                             {displayCaseId}
                           </span>
                        ) : (
                           <span className="text-[#666]">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button className="text-[10px] font-bold text-[#888] uppercase tracking-widest hover:text-white transition-colors">
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Details Payload Panel */}
          {selectedEvent && (
            <div className="w-full lg:w-[450px] shrink-0 bg-[#0c0d12] flex flex-col overflow-y-auto absolute lg:relative inset-y-0 right-0 z-50">
              <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0c0d12] z-10">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Event Inspector</h3>
                <button onClick={() => setSelectedEvent(null)} className="text-[#888] hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="p-8 flex flex-col gap-6">
                 <div>
                    <div className="text-[9px] font-bold text-[#666] uppercase tracking-widest mb-1">Event Type</div>
                    <div className={`text-lg font-black uppercase tracking-widest ${getEventColor(selectedEvent.eventType)}`}>
                      {selectedEvent.eventType.replace(/_/g, ' ')}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <div className="text-[9px] font-bold text-[#666] uppercase tracking-widest mb-1">Actor</div>
                       <span className={getActorBadge(selectedEvent.actor)}>
                          {selectedEvent.actor.replace(/_/g, ' ')}
                       </span>
                    </div>
                    <div>
                       <div className="text-[9px] font-bold text-[#666] uppercase tracking-widest mb-1">Timestamp</div>
                       <div className="text-[12px] font-mono text-white">{formatDate(selectedEvent.createdAt)}</div>
                    </div>
                 </div>

                 <div className="border-t border-white/5 pt-6 mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#888]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        JSON Payload
                      </div>
                      <button 
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedEvent.metadata, null, 2))}
                        className="text-[9px] font-bold text-[#666] uppercase tracking-widest hover:text-white transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="bg-black/50 border border-white/5 rounded-sm p-4 overflow-x-auto">
                      <pre className="text-[11px] font-mono text-[#32ADE6] leading-relaxed">
                        {JSON.stringify(selectedEvent.metadata || {}, null, 2)}
                      </pre>
                    </div>
                 </div>

                 <div className="border-t border-white/5 pt-6 mt-2">
                    <div className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3">Entity References</div>
                    <div className="bg-white/5 border border-white/10 p-3 flex flex-col gap-2">
                       <div className="flex justify-between items-center border-b border-white/5 pb-2">
                         <span className="text-[10px] text-[#888] uppercase tracking-widest">Type</span>
                         <span className="text-[11px] font-mono text-white">{selectedEvent.entityType}</span>
                       </div>
                       <div className="flex justify-between items-center border-b border-white/5 pb-2">
                         <span className="text-[10px] text-[#888] uppercase tracking-widest">Entity ID</span>
                         <span className="text-[10px] font-mono text-[#aaa]">{selectedEvent.entityId || '-'}</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-[10px] text-[#888] uppercase tracking-widest">Case ID</span>
                         <span className="text-[10px] font-mono text-[#aaa]">{selectedEvent.recoveryCaseId || '-'}</span>
                       </div>
                    </div>
                 </div>

              </div>
            </div>
          )}

        </div>
        
        {/* Flat Bottom bar */}
        <div className="h-auto lg:h-16 py-4 lg:py-0 border-t border-white/5 flex flex-col lg:flex-row items-center justify-between px-4 lg:px-8 gap-4 lg:gap-0 bg-[#0f1015] shrink-0 outline outline-1 outline-white/5 z-20">
          <div className="text-[11px] uppercase tracking-widest text-[#555] font-bold">
            Showing {displayEvents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of {filteredEvents.length} entries
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
