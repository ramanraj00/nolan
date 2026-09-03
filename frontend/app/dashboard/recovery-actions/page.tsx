"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "../../../lib/api";

interface RecoveryAction {
  id: string;
  recoveryCaseId: string;
  policyDecisionId: string;
  type: string;
  status: string;
  scheduledAt: string | null;
  executedAt: string | null;
  completedAt: string | null;
  result: string | null;
  failureReason: string | null;
  createdAt: string;
}

interface PolicyDecision {
  id: string;
  action: string;
  allowed: boolean;
  reason: string;
  rule: string;
  requiresApproval: boolean;
}

const getStatusBadge = (status: string) => {
  const base = "px-3 py-1.5 font-black uppercase tracking-widest text-[9px] flex items-center gap-1.5 w-fit";
  switch (status) {
    case "PENDING_APPROVAL": return `${base} bg-[#FF9500] text-black shadow-[0_0_10px_rgba(255,149,0,0.4)] animate-pulse`;
    case "PENDING": return `${base} bg-white text-black`;
    case "SCHEDULED": return `${base} bg-[#555555] text-white`;
    case "EXECUTING": return `${base} bg-[#32ADE6] text-black`;
    case "SUCCESS": return `${base} bg-[#C8FF00] text-black`;
    case "FAILED": return `${base} bg-[#FF3B30] text-white`;
    case "CANCELLED": return `${base} bg-[#555555] text-white`;
    default: return `${base} bg-white/20 text-white`;
  }
};

const formatDate = (dateString: string | null, fallback: string = "-") => {
  if (!dateString) return fallback;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
};

export default function RecoveryActionsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('ALL');
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<RecoveryAction | null>(null);
  const [policyData, setPolicyData] = useState<PolicyDecision | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function load() {
      try {
        let mid = process.env.NEXT_PUBLIC_MERCHANT_ID;
        if (!mid) {
           const merchants = await fetchApi<any[]>("/merchants");
           mid = merchants[0].id || merchants[0].user_id;
        }

        const res = await fetchApi<{ data: RecoveryAction[] }>(`/recovery-actions?merchant_id=${mid}`);
        setActions(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const loadPolicy = async (policyId: string) => {
    setPolicyLoading(true);
    setPolicyData(null);
    try {
      const res = await fetchApi<{ data: PolicyDecision }>(`/policy-decisions/${policyId}`);
      setPolicyData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleSelectAction = async (act: RecoveryAction) => {
    if (selectedAction?.id === act.id) {
      setSelectedAction(null);
      setPolicyData(null);
    } else {
      setSelectedAction(act); // optimistic update for UI speed
      try {
        const res = await fetchApi<{ data: RecoveryAction }>(`/recovery-actions/${act.id}`);
        setSelectedAction(res.data);
      } catch (err) {
        console.error('Failed to load action details', err);
      }
      loadPolicy(act.policyDecisionId);
    }
  };

  const filters = ['ALL', 'PENDING_APPROVAL', 'PENDING', 'SCHEDULED', 'EXECUTING', 'SUCCESS', 'FAILED', 'CANCELLED'];

  const filteredActions = actions.filter(act => {
    if (filter === 'ALL') return true;
    return act.status === filter;
  });

  const totalPages = Math.ceil(filteredActions.length / itemsPerPage);
  const displayActions = filteredActions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#07080B] text-white relative">
      {/* Header section */}
      <div className="p-8 shrink-0">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Recovery Actions</h1>
            <p className="text-[#888] text-sm font-medium">System execution logs mapping approved actions to physical outcomes.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-4">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setCurrentPage(1); }}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                filter === f 
                  ? 'bg-[#111217] text-[#C8FF00] border border-white/10 shadow-md' 
                  : 'text-[#666] hover:text-white border border-transparent'
              }`}
            >
              {f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col px-8 pb-8">
        <div className="flex-1 bg-[#111217] border border-white/5 relative flex overflow-hidden">
          
          {/* Table Container */}
          <div className={`flex-1 overflow-auto transition-all duration-300 ${selectedAction ? 'border-r border-white/5' : ''}`}>
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="sticky top-0 bg-[#0f1015] z-10 outline outline-1 outline-white/5">
                <tr>
                  <th className="py-5 px-6 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Action ID</th>
                  <th className="py-5 px-4 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Case</th>
                  <th className="py-5 px-4 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Action Type</th>
                  <th className="py-5 px-4 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Status</th>
                  <th className="py-5 px-4 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Execution Timeline</th>
                  <th className="py-5 px-4 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Result</th>
                  <th className="py-5 px-6 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em] text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading && (
                   <tr>
                      <td colSpan={7} className="py-12 text-center text-[#555] font-medium text-sm">Loading Actions...</td>
                   </tr>
                )}
                {!loading && filteredActions.length === 0 && (
                   <tr>
                      <td colSpan={7} className="py-12 text-center text-[#555] font-medium text-sm">No actions found.</td>
                   </tr>
                )}
                {displayActions.map((act) => {
                  const isSelected = selectedAction?.id === act.id;
                  const displayCaseId = `RC-${(parseInt(act.recoveryCaseId.replace(/-/g, '').substring(0, 8), 16) % 9000 + 1000)}`;
                  return (
                    <tr 
                      key={act.id} 
                      onClick={() => handleSelectAction(act)}
                      className={`group cursor-pointer transition-colors ${isSelected ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}
                    >
                      <td className="py-4 px-6 text-[13px] font-mono font-bold text-white">
                        ACT-{act.id.split('-')[0].toUpperCase()}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-[12px] font-bold text-[#32ADE6] hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/recovery-cases/${act.recoveryCaseId}`); }}>
                          {displayCaseId}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#ccc]">
                          {act.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={getStatusBadge(act.status)}>
                          {act.status === 'PENDING_APPROVAL' && (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          )}
                          {act.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[#666] w-16">Scheduled:</span>
                            <span className={`font-medium ${!act.scheduledAt ? 'text-[#666] italic text-[10px]' : 'text-[#aaa]'}`}>
                              {formatDate(act.scheduledAt, 'Pending')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#666] w-16">Executed:</span>
                            <span className={`font-medium ${!act.executedAt ? 'text-[#666] italic text-[10px]' : 'text-white'}`}>
                              {formatDate(act.executedAt, 'Pending')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[12px] font-medium text-[#aaa] max-w-[200px] truncate">
                        {act.result || act.failureReason || '-'}
                      </td>
                      <td className="py-4 px-6 text-[12px] font-medium text-[#888] text-right">
                        {formatDate(act.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Details Pipeline Panel */}
          {selectedAction && (
            <div className="w-[450px] shrink-0 bg-[#0c0d12] flex flex-col overflow-y-auto">
              <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0c0d12] z-10">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Execution Pipeline</h3>
                <button onClick={() => setSelectedAction(null)} className="text-[#888] hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-8">
                <div className="relative border-l border-white/10 ml-3 pl-8 pb-8">
                  <div className="absolute w-6 h-6 bg-[#111217] border border-white/20 rounded-full -left-3 top-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#888] rounded-full"></div>
                  </div>
                  <div className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-2">1. Policy Decision</div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-sm text-[13px] text-white min-h-[50px] flex items-center">
                    {policyLoading ? (
                      <span className="text-[#888] animate-pulse">Fetching policy...</span>
                    ) : policyData ? (
                      <div className="flex flex-col gap-1 w-full">
                         <div className="flex justify-between items-center w-full">
                           <span className="font-mono text-[#C8FF00] text-[10px] uppercase">{policyData.rule || 'Default Rule'}</span>
                           <span className={`text-[9px] font-bold uppercase tracking-widest ${policyData.requiresApproval ? 'text-[#FF9500]' : 'text-[#32ADE6]'}`}>
                             {policyData.requiresApproval ? 'Approval Required' : 'Auto-Approved'}
                           </span>
                         </div>
                         <span className="text-[#ccc] mt-1">{policyData.reason}</span>
                      </div>
                    ) : (
                      <span className="text-[#FF3B30]">Failed to load policy.</span>
                    )}
                  </div>
                </div>

                <div className="relative border-l border-white/10 ml-3 pl-8 pb-8">
                  <div className="absolute w-6 h-6 bg-[#111217] border border-[#32ADE6]/30 rounded-full -left-3 top-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-[#32ADE6] rounded-full"></div>
                  </div>
                  <div className="text-[10px] font-bold text-[#32ADE6] uppercase tracking-widest mb-2">2. Approved Action</div>
                  <div className="text-xl font-black text-white uppercase tracking-widest">
                    {selectedAction.type.replace(/_/g, ' ')}
                  </div>
                  {selectedAction.status === 'PENDING_APPROVAL' && (
                    <div className="mt-3 bg-[#FF9500]/10 border border-[#FF9500]/20 p-4 rounded-sm flex items-start gap-3">
                       <svg className="w-5 h-5 text-[#FF9500] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                       <div>
                         <div className="text-[11px] font-bold text-[#FF9500] uppercase tracking-widest mb-1">Human Approval Required</div>
                         <div className="text-[12px] text-[#FF9500]/80">This action bypasses standard auto-execution policies and requires explicit approval before dispatching to the gateway.</div>
                         <div className="mt-4 flex gap-3">
                           <button className="px-4 py-2 bg-[#FF9500] text-black text-[10px] font-black uppercase tracking-widest">Approve</button>
                           <button className="px-4 py-2 bg-transparent border border-[#FF9500]/30 text-[#FF9500] text-[10px] font-black uppercase tracking-widest hover:bg-[#FF9500]/10 transition-colors">Reject</button>
                         </div>
                       </div>
                    </div>
                  )}
                </div>

                <div className="relative border-l border-white/10 ml-3 pl-8 pb-8">
                  <div className={`absolute w-6 h-6 bg-[#111217] rounded-full -left-3 top-0 flex items-center justify-center ${
                    selectedAction.status === 'PENDING_APPROVAL' ? 'border border-white/10' : 'border border-[#AF52DE]/50'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${selectedAction.status === 'PENDING_APPROVAL' ? 'bg-[#333]' : 'bg-[#AF52DE]'}`}></div>
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${selectedAction.status === 'PENDING_APPROVAL' ? 'text-[#666]' : 'text-[#AF52DE]'}`}>
                    3. Execution
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/5 border border-white/10 p-3">
                       <div className="text-[9px] text-[#888] uppercase tracking-widest mb-1">Scheduled</div>
                       <div className={`text-[12px] font-medium ${!selectedAction.scheduledAt ? 'text-[#666] italic' : 'text-white'}`}>{formatDate(selectedAction.scheduledAt, 'Pending')}</div>
                     </div>
                     <div className="bg-white/5 border border-white/10 p-3">
                       <div className="text-[9px] text-[#888] uppercase tracking-widest mb-1">Executed</div>
                       <div className={`text-[12px] font-medium ${!selectedAction.executedAt ? 'text-[#666] italic' : 'text-white'}`}>{formatDate(selectedAction.executedAt, 'Pending')}</div>
                     </div>
                  </div>
                </div>

                <div className="relative border-l border-transparent ml-3 pl-8 pb-4">
                  <div className={`absolute w-6 h-6 bg-[#111217] rounded-full -left-3 top-0 flex items-center justify-center ${
                    selectedAction.status === 'SUCCESS' ? 'border border-[#C8FF00]/50' : 
                    selectedAction.status === 'FAILED' ? 'border border-[#FF3B30]/50' : 'border border-white/10'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      selectedAction.status === 'SUCCESS' ? 'bg-[#C8FF00]' : 
                      selectedAction.status === 'FAILED' ? 'bg-[#FF3B30]' : 'bg-[#333]'
                    }`}></div>
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${
                    selectedAction.status === 'SUCCESS' ? 'text-[#C8FF00]' : 
                    selectedAction.status === 'FAILED' ? 'text-[#FF3B30]' : 'text-[#666]'
                  }`}>
                    4. Result & Audit
                  </div>
                  <div className="bg-white/5 border border-white/10 p-4 rounded-sm flex flex-col gap-2">
                    <div className={`text-[14px] font-bold ${
                      selectedAction.status === 'SUCCESS' ? 'text-white' : 
                      selectedAction.status === 'FAILED' ? 'text-[#FF3B30]' : 'text-[#666]'
                    }`}>
                      {selectedAction.result || selectedAction.failureReason || 'Awaiting completion'}
                    </div>
                    {/* We can fetch the audit trail via another API call later if needed, right now we just show a placeholder or nothing if not completed */}
                    {['SUCCESS', 'FAILED'].includes(selectedAction.status) && (
                      <div className="text-[11px] font-mono text-[#888] border-t border-white/5 pt-2 mt-1">
                        Audit Log: action.{selectedAction.status.toLowerCase()} event recorded.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Flat Bottom bar */}
        <div className="h-16 border-t border-white/5 flex items-center justify-between px-8 bg-[#0f1015] shrink-0 outline outline-1 outline-white/5 z-20">
          <div className="text-[11px] uppercase tracking-widest text-[#555] font-bold">
            Showing {displayActions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredActions.length)} of {filteredActions.length} entries
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
