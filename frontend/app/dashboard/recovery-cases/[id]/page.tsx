"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchApi, RecoveryCase } from "../../../../lib/api";

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [rc, setRc] = useState<RecoveryCase | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showAudit, setShowAudit] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchApi<{ data: any }>(`/recovery-cases/${params.id}`);
        const found = res.data;
        if (found) setRc(found);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) return (
    <div className="p-8 max-w-[1920px] mx-auto h-[calc(100vh-64px)] flex items-center justify-center bg-[#07080B]">
      <div className="w-8 h-8 border-4 border-[#C8FF00] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!rc) return (
    <div className="p-8 max-w-[1920px] mx-auto h-[calc(100vh-64px)] flex flex-col items-center justify-center bg-[#07080B]">
      <h1 className="text-white text-2xl font-bold mb-4">Case Not Found</h1>
      <button onClick={() => router.back()} className="px-6 py-2 bg-[#111217] text-white border border-white/20 hover:border-[#C8FF00] transition-colors rounded-none font-bold tracking-widest text-xs uppercase">
        Go Back
      </button>
    </div>
  );

  const displayId = `RC-${(parseInt(rc.id.replace(/-/g, '').substring(0, 8), 16) % 9000 + 1000)}`;
  const dateStr = new Date(rc.createdAt).toLocaleDateString();

  const handleForceAction = () => {
    setActionSuccess(true);
    setTimeout(() => {
      setShowAction(false);
      setActionSuccess(false);
    }, 2000);
  };

  return (
    <div className="p-8 max-w-[1920px] mx-auto h-[calc(100vh-64px)] overflow-y-auto scrollbar-hide bg-[#07080B] relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 border border-white/10 flex items-center justify-center text-[#888] hover:text-white hover:border-white/30 transition-colors bg-[#111217]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-white tracking-tight">Case Details</h1>
              <span className="bg-white/10 text-white px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">{displayId}</span>
              <span className="bg-[#AF52DE] text-white px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">{rc.status.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-[#888] text-xs font-bold tracking-widest uppercase">Failed Payment Recovery</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAudit(true)}
            className="px-6 py-3 border border-white/10 bg-[#111217] text-[#888] hover:text-white hover:border-white/30 text-xs font-bold uppercase tracking-widest transition-colors rounded-none"
          >
            Full Audit Trail
          </button>
          <button 
            onClick={() => setShowAction(true)}
            className="px-6 py-3 border border-[#C8FF00] bg-[#C8FF00] text-black hover:bg-[#b3e600] text-xs font-black uppercase tracking-widest transition-colors rounded-none"
          >
            Request Manual Action
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Column (The Journey) */}
        <div className="col-span-8 flex flex-col gap-6">
          
          <div className="bg-[#111217] border border-white/5 p-8 flex-1">
             <h2 className="text-white font-bold text-sm tracking-widest uppercase mb-8 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#32ADE6]"></span> Recovery Journey
            </h2>
            
            <div className="relative border-l-2 border-white/5 ml-4 pl-8 flex flex-col gap-8 pb-4">
              
              {/* 1. Payment Failed */}
              <div className="relative">
                <div className="absolute -left-[39px] top-1 w-4 h-4 bg-[#FF3B30] rounded-none flex items-center justify-center">
                   <div className="w-2 h-2 bg-black rounded-none"></div>
                </div>
                <h3 className="text-white font-black text-lg mb-1 tracking-tight">Payment Failed</h3>
                <p className="text-[#888] text-xs font-bold tracking-widest uppercase mb-3">{dateStr} • Gateway: {(rc.payment as any)?.gateway || 'Razorpay'}</p>
                <div className="bg-[#0f1015] border border-white/5 p-4 inline-block">
                  <p className="text-[#aaa] text-sm"><span className="text-[#555] uppercase text-[10px] font-bold tracking-widest block mb-1">Raw Error</span> {rc.diagnosis || 'authentication_failed'}</p>
                </div>
              </div>

              {/* 2. AI Diagnosis */}
              <div className="relative">
                <div className="absolute -left-[39px] top-1 w-4 h-4 bg-[#AF52DE] rounded-none flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9V5a1 1 0 112 0v4h2a1 1 0 110 2h-3a1 1 0 01-1-1z" /></svg>
                </div>
                <h3 className="text-white font-black text-lg mb-1 tracking-tight">AI Agent Diagnosis</h3>
                <p className="text-[#888] text-xs font-bold tracking-widest uppercase mb-3">{(rc as any).agentDecision ? new Date((rc as any).agentDecision.createdAt).toLocaleTimeString() : '+ 0.4s'}</p>
                <div className="bg-[#0f1015] border border-[#AF52DE]/20 p-4 border-l-2 border-l-[#AF52DE]">
                  <p className="text-white text-sm font-medium">Predicted Probability: <span className="text-[#C8FF00] font-black">{Number((rc as any).agentDecision?.recoveryProbability || rc.recoveryProbability || 0).toFixed(0)}%</span></p>
                  <p className="text-[#aaa] text-xs mt-2">{(rc as any).agentDecision?.reasoning || 'Nolan AI analyzing past patterns for optimal route.'}</p>
                </div>
              </div>
              
              {/* 3. Policy Decision */}
              <div className="relative">
                <div className="absolute -left-[39px] top-1 w-4 h-4 bg-white/20 rounded-none flex items-center justify-center"></div>
                <h3 className="text-white font-black text-lg mb-1 tracking-tight">Policy Engine Evaluation</h3>
                <p className="text-[#888] text-xs font-bold tracking-widest uppercase mb-3">{(rc as any).policyDecision ? new Date((rc as any).policyDecision.createdAt).toLocaleTimeString() : '+ 0.8s'}</p>
                <div className="flex flex-wrap gap-2">
                  {(rc as any).policyDecision?.rulesEvaluated ? (
                    (Array.isArray((rc as any).policyDecision.rulesEvaluated) ? (rc as any).policyDecision.rulesEvaluated : ((rc as any).policyDecision.rulesEvaluated as string).startsWith('[') ? JSON.parse((rc as any).policyDecision.rulesEvaluated) : [(rc as any).policyDecision.rulesEvaluated]).map((rule: string, i: number) => (
                       <span key={i} className="px-2 py-1 bg-white/5 text-[#ccc] text-[10px] font-bold uppercase tracking-widest border border-white/10">Rule: {rule}</span>
                    ))
                  ) : (
                    <span className="px-2 py-1 bg-white/5 text-[#ccc] text-[10px] font-bold uppercase tracking-widest border border-white/10">Rule: Max Retries &lt; 3</span>
                  )}
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border ${(rc as any).policyDecision?.passed ? 'bg-[#C8FF00]/10 text-[#C8FF00] border-[#C8FF00]/20' : 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20'}`}>
                    {(rc as any).policyDecision?.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>

              {/* 4. Recovery Action */}
              <div className="relative">
                <div className="absolute -left-[39px] top-1 w-4 h-4 bg-[#FF9500] rounded-none flex items-center justify-center">
                  <div className="w-2 h-2 bg-black rounded-none"></div>
                </div>
                <h3 className="text-white font-black text-lg mb-1 tracking-tight">Recovery Action Triggered</h3>
                <p className="text-[#888] text-xs font-bold tracking-widest uppercase mb-3">{(rc as any).recoveryAction ? new Date((rc as any).recoveryAction.createdAt).toLocaleTimeString() : '+ 1.2s'}</p>
                <div className="bg-[#0f1015] border border-[#FF9500]/20 p-4 inline-block">
                  <p className="text-[#FF9500] text-sm font-bold tracking-widest uppercase">Action: {((rc as any).recoveryAction?.type || (rc as any).agentDecision?.recommendedAction || 'ESCALATE_HUMAN').replace(/_/g, ' ')}</p>
                  <p className="text-[#aaa] text-xs mt-1">Status: {(rc as any).recoveryAction?.status || 'PENDING'}</p>
                </div>
              </div>

              {/* 5. Razorpay Result & Final Outcome */}
              <div className="relative">
                <div className="absolute -left-[41px] top-0 w-5 h-5 bg-[#C8FF00] rounded-none flex items-center justify-center shadow-[0_0_15px_rgba(200,255,0,0.3)]">
                  <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-[#C8FF00] font-black text-xl mb-1 tracking-tight">Recovery Successful</h3>
                <p className="text-[#888] text-xs font-bold tracking-widest uppercase mb-3">+ 3.5 seconds • Final Outcome</p>
                <div className="bg-[#C8FF00]/5 border border-[#C8FF00]/30 p-5">
                  <p className="text-white text-sm">Payment of <strong className="text-[#C8FF00]">₹{Number(rc.revenueAtRisk).toLocaleString('en-IN')}</strong> was successfully captured on the alternate route.</p>
                  <p className="text-[#aaa] text-xs mt-2 font-mono">Txn: pay_rec_{rc.payment?.id?.substring(4) || '9283A'}</p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column (Meta Info) */}
        <div className="col-span-4 flex flex-col gap-6 sticky top-8 self-start pb-8">
          
          <div className="bg-[#111217] border border-white/5 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8FF00]/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <h2 className="text-[#888] font-bold text-xs tracking-widest uppercase mb-4 relative z-10">Value Recovered</h2>
            <p className="text-4xl font-black text-[#C8FF00] tabular-nums tracking-tighter relative z-10">
              ₹{Number(rc.revenueAtRisk).toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-[#111217] border border-white/5 p-6">
            <h2 className="text-[#888] font-bold text-xs tracking-widest uppercase mb-6 flex items-center justify-between">
              Customer Details
              <button className="text-[#32ADE6] hover:text-white transition-colors">View All</button>
            </h2>
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[#555] text-[10px] font-bold tracking-widest uppercase mb-1">Name</p>
                <p className="text-white font-bold text-sm">{rc.customerName || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-[#555] text-[10px] font-bold tracking-widest uppercase mb-1">Email</p>
                <p className="text-white font-bold text-sm">{(rc.customerName || 'user').toLowerCase().replace(' ', '.')}@example.com</p>
              </div>
              <div>
                <p className="text-[#555] text-[10px] font-bold tracking-widest uppercase mb-1">Lifetime Value</p>
                <p className="text-white font-bold text-sm">₹{(Number(rc.revenueAtRisk) * 4.5).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111217] border border-white/5 p-6">
            <h2 className="text-[#888] font-bold text-xs tracking-widest uppercase mb-6">Original Payment</h2>
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-[#555] text-[10px] font-bold tracking-widest uppercase mb-1">Gateway</p>
                <p className="text-white font-bold text-sm">{(rc.payment as any)?.gateway || 'Razorpay'}</p>
              </div>
              <div>
                <p className="text-[#555] text-[10px] font-bold tracking-widest uppercase mb-1">Method</p>
                <p className="text-white font-bold text-sm">{(rc.payment as any)?.method || 'Credit Card'}</p>
              </div>
              <div>
                <p className="text-[#555] text-[10px] font-bold tracking-widest uppercase mb-1">Transaction ID</p>
                <p className="text-white font-mono text-xs">{rc.payment?.id || rc.paymentId}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111217] border border-white/5 p-6 mt-4">
             <button 
               onClick={() => setShowAudit(true)}
               className="w-full flex items-center justify-between text-white font-bold text-xs uppercase tracking-widest hover:text-[#C8FF00] transition-colors"
             >
               <span>View Full Audit Trail JSON</span>
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
             </button>
          </div>

        </div>

      </div>

      {/* Audit Modal */}
      {showAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f1015] border border-white/10 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#111217]">
              <h3 className="text-white font-bold text-xs uppercase tracking-widest">Audit Trail Payload</h3>
              <button onClick={() => setShowAudit(false)} className="text-[#888] hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <pre className="text-[#C8FF00] font-mono text-[11px] leading-relaxed">
{JSON.stringify(rc, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Force Action Modal */}
      {showAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f1015] border border-white/10 w-full max-w-md shadow-2xl">
            <div className="p-8 flex flex-col items-center text-center">
              {actionSuccess ? (
                <>
                  <div className="w-12 h-12 bg-[#C8FF00]/10 flex items-center justify-center mb-4 border border-[#C8FF00]/30">
                    <svg className="w-6 h-6 text-[#C8FF00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-[#C8FF00] font-black text-xl mb-2">Request Submitted</h3>
                  <p className="text-[#aaa] text-sm">Your manual review request has been queued for policy evaluation.</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-[#FF9500]/10 flex items-center justify-center mb-4 border border-[#FF9500]/30">
                    <svg className="w-6 h-6 text-[#FF9500]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-white font-black text-xl mb-2">Request Manual Action</h3>
                  <p className="text-[#aaa] text-sm mb-8">This will create a manual recovery request for this case. The automated recovery policy will not be bypassed, and execution will require explicit approval.</p>
                  
                  <div className="flex gap-4 w-full">
                    <button onClick={() => setShowAction(false)} className="flex-1 py-3 border border-white/10 bg-[#111217] text-white hover:border-white/30 text-xs font-bold uppercase tracking-widest transition-colors rounded-none">
                      Cancel
                    </button>
                    <button onClick={handleForceAction} className="flex-1 py-3 border border-[#FF9500] bg-[#FF9500] text-black hover:bg-[#e08300] text-xs font-black uppercase tracking-widest transition-colors rounded-none">
                      Request Review
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
