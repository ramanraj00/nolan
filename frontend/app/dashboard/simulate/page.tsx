"use client";

import { useState, useEffect } from "react";
import { fetchApi, Merchant } from "@/lib/api";

export default function SimulatePage() {
  const [failureType, setFailureType] = useState("Card Expired");
  const [amount, setAmount] = useState("1499");
  const [customerContext, setCustomerContext] = useState("High Value Customer");
  const [merchantId, setMerchantId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMerchant() {
      let mid = process.env.NEXT_PUBLIC_MERCHANT_ID;
      if (!mid) {
        const merchants = await fetchApi<Merchant[]>("/merchants");
        if (merchants && merchants.length > 0) {
          mid = merchants[0].id;
        }
      }
      setMerchantId(mid || null);
    }
    loadMerchant();
  }, []);

  const runSimulation = async () => {
    if (!merchantId) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetchApi<any>("/test-nolan/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          failure_reason: failureType,
          amount: Number(amount) * 100, // paise
          customer_context: customerContext
        })
      });
      
      setResult(response.data);
    } catch (err: any) {
      setError(err.message || "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 pb-32 max-w-5xl mx-auto">
      <h1 className="text-3xl font-black text-white tracking-tight mb-2">🧪 Test Nolan Pipeline</h1>
      <p className="text-[#888] mb-8">Run an interactive simulation to see how Nolan's AI analyzes different failure contexts and decides on recovery actions in real-time.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* INPUT FORM */}
        <div className="bg-[#0f1015] border border-white/5 p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#32ADE6]"></div>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Simulation Input</h2>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-2">1. Failure Type</label>
            <select 
              value={failureType}
              onChange={(e) => setFailureType(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/10 text-white p-3 text-sm focus:outline-none focus:border-[#32ADE6] transition-colors"
            >
              <option value="Card Expired">Card Expired</option>
              <option value="Insufficient Funds">Insufficient Funds</option>
              <option value="Payment Limit Exceeded">Payment Limit Exceeded</option>
              <option value="Bank Declined">Bank Declined</option>
              <option value="Risk Rejected">Risk Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-2">2. Payment Amount (₹)</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/10 text-white p-3 text-sm focus:outline-none focus:border-[#32ADE6] transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-2">3. Customer Context</label>
            <select 
              value={customerContext}
              onChange={(e) => setCustomerContext(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-white/10 text-white p-3 text-sm focus:outline-none focus:border-[#32ADE6] transition-colors"
            >
              <option value="High Value Customer">High Value Customer</option>
              <option value="Normal Customer">Normal Customer</option>
              <option value="Low Value Customer">Low Value Customer</option>
              <option value="Risky Customer">Risky Customer</option>
            </select>
          </div>

          <button 
            onClick={runSimulation}
            disabled={loading || !merchantId}
            className="mt-4 w-full bg-[#C8FF00] text-black font-black text-sm p-4 uppercase tracking-widest hover:bg-[#b3e600] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : "⚡ Run Recovery Simulation"}
          </button>

          {error && <div className="text-[#FF3B30] text-xs font-medium bg-[#FF3B30]/10 p-3 mt-2">{error}</div>}
        </div>

        {/* RESULTS PANEL */}
        <div className="bg-[#0f1015] border border-white/5 p-6 relative overflow-hidden min-h-[500px]">
          {!result && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-[#0f1015] z-20">
              <svg className="w-12 h-12 text-white/10 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <p className="text-[#666] text-sm">Configure parameters and run the simulation to see Nolan's pipeline in action.</p>
            </div>
          )}

          <div className="flex flex-col gap-6 relative">
            <div className="absolute left-4 top-4 bottom-8 w-[2px] bg-white/5 z-0"></div>

            {/* Step 1 & 2 */}
            <div className="relative z-10 flex gap-4">
               <div className="w-8 h-8 rounded-full bg-black border-2 border-[#333] flex items-center justify-center shrink-0">
                 <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
               </div>
               <div>
                 <div className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-1">Step 1</div>
                 <div className="text-white text-sm font-medium">Test Payment Created</div>
               </div>
            </div>

            <div className="relative z-10 flex gap-4">
               <div className="w-8 h-8 rounded-full bg-black border-2 border-[#FF3B30] flex items-center justify-center shrink-0">
                 <svg className="w-3 h-3 text-[#FF3B30]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
               </div>
               <div>
                 <div className="text-[10px] font-bold text-[#FF3B30] uppercase tracking-widest mb-1">Step 2</div>
                 <div className="text-white text-sm font-medium mb-1">Payment Failure Detected</div>
                 {(result || loading) && (
                   <div className="text-xs text-[#888]">Reason: {failureType} | Amount: ₹{amount}</div>
                 )}
               </div>
            </div>

            {/* Step 3: AI */}
            <div className={`relative z-10 flex gap-4 transition-all duration-500 ${!result && loading ? 'animate-pulse' : ''} ${!result && !loading ? 'opacity-25' : ''}`}>
               <div className="w-8 h-8 rounded-full bg-black border-2 border-[#32ADE6] flex items-center justify-center shrink-0">
                 <svg className="w-4 h-4 text-[#32ADE6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               </div>
               <div className="flex-1">
                 <div className="text-[10px] font-bold text-[#32ADE6] uppercase tracking-widest mb-1">Step 3</div>
                 <div className="text-white text-sm font-bold mb-3">AI Analysis Complete</div>
                 
                 {result?.ai && (
                   <div className="bg-black border border-white/5 p-4 rounded-sm flex flex-col gap-3 shadow-lg">
                     <div>
                       <span className="text-[9px] text-[#666] uppercase tracking-widest block mb-1">AI Diagnosis</span>
                       <span className="text-white text-sm">{result.ai.diagnosis}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                       <div>
                         <span className="text-[9px] text-[#666] uppercase tracking-widest block mb-1">Confidence</span>
                         <span className="text-[#32ADE6] font-black">{Number((result.ai.confidence || 0) * 100).toFixed(1)}%</span>
                       </div>
                       <div>
                         <span className="text-[9px] text-[#666] uppercase tracking-widest block mb-1">Probability</span>
                         <span className="text-[#C8FF00] font-black">{Number((result.ai.recoveryProbability || 0) * 100).toFixed(1)}%</span>
                       </div>
                     </div>
                     <div className="bg-[#32ADE6]/10 border border-[#32ADE6]/20 p-3 mt-1">
                        <span className="text-[9px] text-[#32ADE6] uppercase tracking-widest block mb-1">Recommendation</span>
                        <span className="text-white font-bold text-xs">{result.ai.recommendedAction.replace(/_/g, ' ')}</span>
                     </div>
                   </div>
                 )}
               </div>
            </div>

            {/* Step 4: Policy */}
            <div className={`relative z-10 flex gap-4 transition-all duration-500 delay-100 ${!result ? 'opacity-25' : ''}`}>
               <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 bg-black ${result?.policy?.allowed ? 'border-[#4ade80]' : result ? 'border-[#FF9500]' : 'border-[#333]'}`}>
                 <svg className={`w-4 h-4 ${result?.policy?.allowed ? 'text-[#4ade80]' : result ? 'text-[#FF9500]' : 'text-[#333]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <div className="flex-1">
                 <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${result?.policy?.allowed ? 'text-[#4ade80]' : result ? 'text-[#FF9500]' : 'text-[#666]'}`}>Step 4</div>
                 <div className="text-white text-sm font-bold mb-2">Policy Engine Validation</div>
                 {result?.policy && (
                    <div className="bg-black border border-white/5 px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-[#aaa]">Decision</span>
                      <span className={`text-xs font-black tracking-widest uppercase px-2 py-1 ${result.policy.allowed ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-[#FF9500]/20 text-[#FF9500]'}`}>
                        {result.policy.allowed ? 'APPROVED' : 'BLOCKED'}
                      </span>
                    </div>
                 )}
               </div>
            </div>

            {/* Step 5: Action */}
            <div className={`relative z-10 flex gap-4 transition-all duration-500 delay-200 ${!result ? 'opacity-25' : ''}`}>
               <div className="w-8 h-8 rounded-full bg-black border-2 border-[#AF52DE] flex items-center justify-center shrink-0">
                 <svg className="w-4 h-4 text-[#AF52DE]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
               </div>
               <div className="flex-1">
                 <div className="text-[10px] font-bold text-[#AF52DE] uppercase tracking-widest mb-1">Step 5</div>
                 <div className="text-white text-sm font-bold mb-2">Recovery Action Deployed</div>
                 {result && (
                   <div className="bg-black border border-white/5 p-4">
                      {result.action ? (
                        <>
                          <div className="text-[#AF52DE] font-black text-sm mb-1 uppercase tracking-widest">{result.action.type.replace(/_/g, ' ')}</div>
                          <div className="text-[#888] text-xs">Status: {result.action.status.replace(/_/g, ' ')}</div>
                        </>
                      ) : (
                        <div className="text-[#FF9500] font-black text-sm mb-1 uppercase tracking-widest">No retry executed</div>
                      )}
                   </div>
                 )}
               </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
