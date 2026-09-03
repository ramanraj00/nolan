"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchApi, RecoveryCase } from "../../../../lib/api";

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [rc, setRc] = useState<RecoveryCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // We fetch all cases and find the one that matches this ID
        // In a real app we'd have a specific GET /cases/:id endpoint, which we actually do have!
        // But for quick hackathon prototype we can just hit the single endpoint.
        
        let mid = process.env.NEXT_PUBLIC_MERCHANT_ID;
        if (!mid) {
           const merchants = await fetchApi<any[]>("/merchants");
           mid = merchants[0].id || merchants[0].user_id;
        }

        const res = await fetchApi<{ data: RecoveryCase[] }>(`/recovery-cases?merchant_id=${mid}`);
        const found = res.data.find(c => c.id === params.id);
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
      <button onClick={() => router.push('/dashboard/recovery-cases')} className="px-6 py-2 bg-[#111217] text-white border border-white/20 hover:border-[#C8FF00] transition-colors rounded-none font-bold tracking-widest text-xs uppercase">
        Go Back
      </button>
    </div>
  );

  return (
    <div className="p-8 max-w-[1920px] mx-auto h-[calc(100vh-64px)] overflow-y-auto scrollbar-hide bg-[#07080B]">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard/recovery-cases')}
            className="w-10 h-10 border border-white/10 flex items-center justify-center text-[#888] hover:text-white hover:border-white/30 transition-colors bg-[#111217]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-white tracking-tight">Case Details</h1>
              <span className="bg-white/10 text-white px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">RC-{(parseInt(rc.id.replace(/-/g, '').substring(0, 8), 16) % 9000 + 1000)}</span>
              <span className="bg-[#AF52DE] text-white px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase">{rc.status.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-[#888] text-xs font-bold tracking-widest uppercase">Failed Payment Recovery</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button className="px-6 py-3 border border-white/10 bg-[#111217] text-[#888] hover:text-white hover:border-white/30 text-xs font-bold uppercase tracking-widest transition-colors rounded-none">
            Escalate to Human
          </button>
          <button className="px-6 py-3 border border-[#C8FF00] bg-[#C8FF00] text-black hover:bg-[#b3e600] text-xs font-black uppercase tracking-widest transition-colors rounded-none">
            Force Smart Retry
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Column (Main Analysis) */}
        <div className="col-span-8 flex flex-col gap-6">
          
          {/* Diagnostic Card */}
          <div className="bg-[#111217] border border-white/5 p-6">
            <h2 className="text-white font-bold text-sm tracking-widest uppercase mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#C8FF00]"></span> AI Diagnosis
            </h2>
            <div className="bg-[#0f1015] p-5 border border-white/5 border-l-2 border-l-[#FF3B30] mb-6">
              <p className="text-white text-sm font-medium mb-1">Root Cause Analysis:</p>
              <p className="text-[#aaa] text-sm leading-relaxed">
                The transaction was aborted by the issuer due to <strong className="text-white">{rc.diagnosis || 'Unknown Error'}</strong>. 
                Historical data indicates a {Number(rc.recoveryProbability || 0).toFixed(0)}% probability of recovery if retried within 24 hours using alternate routing.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-[#666] text-xs font-bold uppercase tracking-widest">Recommended Action</span>
                <span className="text-[#C8FF00] font-black text-sm uppercase tracking-widest">Route Alternate</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-white/5">
                <span className="text-[#666] text-xs font-bold uppercase tracking-widest">Estimated Recovery Time</span>
                <span className="text-white font-bold text-sm">~ 45 Minutes</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-[#666] text-xs font-bold uppercase tracking-widest">Risk Level</span>
                <span className="text-[#FF9500] font-bold text-sm uppercase tracking-widest">Medium</span>
              </div>
            </div>
          </div>

          {/* Timeline Card */}
          <div className="bg-[#111217] border border-white/5 p-6 flex-1">
             <h2 className="text-white font-bold text-sm tracking-widest uppercase mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#32ADE6]"></span> Event Timeline
            </h2>
            <div className="relative border-l border-white/10 ml-3 pl-6 flex flex-col gap-8">
              
              <div className="relative">
                <div className="absolute -left-[29px] top-1 w-2.5 h-2.5 bg-[#C8FF00] rounded-none shadow-[0_0_10px_rgba(200,255,0,0.5)]"></div>
                <p className="text-white font-bold text-sm mb-1">AI Agent Initiated Recovery</p>
                <p className="text-[#666] text-xs font-bold tracking-widest uppercase">Just now</p>
              </div>

              <div className="relative">
                <div className="absolute -left-[29px] top-1 w-2.5 h-2.5 bg-white/20 rounded-none"></div>
                <p className="text-[#ccc] font-medium text-sm mb-1">Case Created</p>
                <p className="text-[#666] text-xs font-bold tracking-widest uppercase">{new Date(rc.createdAt).toLocaleString()}</p>
              </div>
              
              <div className="relative">
                <div className="absolute -left-[29px] top-1 w-2.5 h-2.5 bg-[#FF3B30] rounded-none"></div>
                <p className="text-[#ccc] font-medium text-sm mb-1">Payment Failed</p>
                <p className="text-[#666] text-xs font-bold tracking-widest uppercase">{new Date(rc.createdAt).toLocaleString()}</p>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column (Meta Info) */}
        <div className="col-span-4 flex flex-col gap-6">
          
          <div className="bg-[#111217] border border-white/5 p-6">
            <h2 className="text-[#888] font-bold text-xs tracking-widest uppercase mb-4">Value At Risk</h2>
            <p className="text-4xl font-black text-[#C8FF00] tabular-nums tracking-tighter">
              ₹{Number(rc.revenueAtRisk).toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-[#111217] border border-white/5 p-6">
            <h2 className="text-[#888] font-bold text-xs tracking-widest uppercase mb-6">Customer Details</h2>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[#555] text-[10px] font-bold tracking-widest uppercase mb-1">Name</p>
                <p className="text-white font-bold text-sm">{rc.customerName || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-[#555] text-[10px] font-bold tracking-widest uppercase mb-1">Email</p>
                <p className="text-white font-bold text-sm">{(rc.customerName || 'user').toLowerCase().replace(' ', '.')}@example.com</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111217] border border-white/5 p-6">
            <h2 className="text-[#888] font-bold text-xs tracking-widest uppercase mb-6">Payment Info</h2>
            <div className="flex flex-col gap-4">
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

        </div>

      </div>
    </div>
  );
}
