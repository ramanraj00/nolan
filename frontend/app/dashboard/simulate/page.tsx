"use client";

import { useState, useEffect } from "react";
import { fetchApi, Merchant } from "@/lib/api";

const PRESETS = [
  { name: "Card Expired", failure: "Card Expired", method: "Card", ltv: 50000, failed: 0, success: 12 },
  { name: "Insufficient Funds", failure: "Insufficient Funds", method: "UPI", ltv: 1500, failed: 1, success: 5 },
  { name: "Risk Rejected", failure: "Risk Rejected", method: "Card", ltv: 0, failed: 5, success: 0 },
  { name: "High Value Customer", failure: "Bank Declined", method: "Net Banking", ltv: 250000, failed: 0, success: 40 },
];

export default function SimulatePage() {
  const [failureType, setFailureType] = useState("Card Expired");
  const [amount, setAmount] = useState("1499");
  const [paymentMethod, setPaymentMethod] = useState("Card");
  
  const [ltv, setLtv] = useState("50000");
  const [failedPayments, setFailedPayments] = useState("0");
  const [successPayments, setSuccessPayments] = useState("12");

  const [merchantId, setMerchantId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0); // For animation
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

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setFailureType(preset.failure);
    setPaymentMethod(preset.method);
    setLtv(preset.ltv.toString());
    setFailedPayments(preset.failed.toString());
    setSuccessPayments(preset.success.toString());
  };

  const runSimulation = async () => {
    if (!merchantId) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setActiveStep(1); // Payment Received

    try {
      // Fake delays for pipeline animation
      setTimeout(() => setActiveStep(2), 800); // Failure Detected
      setTimeout(() => setActiveStep(3), 1600); // AI Analysis

      const response = await fetchApi<any>("/test-nolan/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          failure_reason: failureType,
          amount: Number(amount) * 100,
          payment_method: paymentMethod,
          lifetime_value: Number(ltv),
          failed_payments: Number(failedPayments),
          successful_payments: Number(successPayments)
        })
      });
      
      setActiveStep(4); // Policy & Risk Check
      
      setTimeout(() => {
        setActiveStep(5); // Recovery Strategy
      }, 800);
      
      setTimeout(() => {
        setActiveStep(6); // Action Execution
        setResult(response.data);
        setActiveStep(7); // Result
        setLoading(false);
      }, 1600);

    } catch (err: any) {
      setError(err.message || "Simulation failed");
      setLoading(false);
      setActiveStep(0);
    }
  };

  return (
    <div className="p-4 lg:p-8 pb-32 max-w-[1400px] mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
          ⚡ Nolan Recovery Lab
          <span className="px-3 py-1 bg-[#C8FF00]/20 text-[#C8FF00] text-[10px] uppercase tracking-widest rounded-full border border-[#C8FF00]/50 relative top-[-4px]">Live Engine</span>
        </h1>
        <p className="text-[#888]">Create a real-time payment failure event and watch Nolan analyze, govern, and execute the recovery workflow.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT — PAYMENT EVENT BUILDER (Cols 1-3) */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          <div className="bg-[#0f1015] border border-white/5 p-5">
            <h2 className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              Quick Test Scenarios
            </h2>
            <div className="flex flex-col gap-2">
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => applyPreset(p)} className="text-left px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-sm transition-colors text-xs font-medium text-[#ccc] flex justify-between items-center group">
                  <span>{p.name}</span>
                  <svg className="w-3 h-3 text-[#666] group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#0f1015] border border-white/5 p-5 flex flex-col gap-5">
            <h2 className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] flex items-center gap-2">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Payment Details
            </h2>

            <div>
              <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1.5">Failure Signal</label>
              <select value={failureType} onChange={(e) => setFailureType(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 text-white p-2.5 text-xs focus:outline-none focus:border-[#32ADE6]">
                <option value="Card Expired">Card Expired</option>
                <option value="Insufficient Funds">Insufficient Funds</option>
                <option value="Payment Limit Exceeded">Payment Limit Exceeded</option>
                <option value="Bank Declined">Bank Declined</option>
                <option value="Risk Rejected">Risk Rejected</option>
                <option value="Network Timeout">Network Timeout</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1.5">Amount (₹)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 text-white p-2.5 text-xs focus:outline-none focus:border-[#32ADE6]" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1.5">Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 text-white p-2.5 text-xs focus:outline-none focus:border-[#32ADE6]">
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Wallet">Wallet</option>
                </select>
              </div>
            </div>

            <h2 className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Customer Intelligence
            </h2>

            <div>
              <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1.5">Lifetime Value (₹)</label>
              <input type="number" value={ltv} onChange={(e) => setLtv(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 text-white p-2.5 text-xs focus:outline-none focus:border-[#32ADE6]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1.5">Prev Failed</label>
                <input type="number" value={failedPayments} onChange={(e) => setFailedPayments(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 text-white p-2.5 text-xs focus:outline-none focus:border-[#32ADE6]" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#888] uppercase tracking-widest mb-1.5">Prev Success</label>
                <input type="number" value={successPayments} onChange={(e) => setSuccessPayments(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/10 text-white p-2.5 text-xs focus:outline-none focus:border-[#32ADE6]" />
              </div>
            </div>

            <button 
              onClick={runSimulation}
              disabled={loading || !merchantId}
              className="mt-2 w-full bg-[#C8FF00] text-black font-black text-xs py-4 px-2 uppercase tracking-widest hover:bg-[#b3e600] transition-all disabled:opacity-50 hover:shadow-[0_0_20px_rgba(200,255,0,0.4)]"
            >
              {loading ? "Injecting Event..." : "🚀 Inject Payment Failure"}
            </button>
            {error && <div className="text-[#FF3B30] text-[10px] font-medium bg-[#FF3B30]/10 p-2 text-center">{error}</div>}
          </div>
        </div>

        {/* CENTER — LIVE PIPELINE (Cols 4-7) */}
        <div className="xl:col-span-4 bg-[#0a0a0c] border border-white/5 p-6 relative flex flex-col justify-between overflow-hidden min-h-[500px]">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <svg className="w-64 h-64" viewBox="0 0 24 24" fill="currentColor"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          </div>
          
          <h2 className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-8 relative z-10">Live Pipeline Status</h2>
          
          <div className="flex flex-col gap-0 relative z-10 pl-2 pb-4">
            <div className="absolute left-6 top-4 bottom-8 w-[2px] bg-white/5 -z-10"></div>
            
            {/* Steps */}
            {[
              { id: 1, name: "PAYMENT RECEIVED", desc: "Webhook ingested" },
              { id: 2, name: "FAILURE DETECTED", desc: "Context analyzed" },
              { id: 3, name: "AI ANALYSIS", desc: "Generating strategy" },
              { id: 4, name: "POLICY & RISK CHECK", desc: "Validating limits" },
              { id: 5, name: "RECOVERY STRATEGY", desc: "Action mapped" },
              { id: 6, name: "ACTION EXECUTION", desc: "Deploying payload" },
              { id: 7, name: "RESULT", desc: "Awaiting response" }
            ].map(step => (
              <div key={step.id} className={`relative flex items-center gap-6 h-12 transition-all duration-300 ${activeStep >= step.id ? 'opacity-100 translate-x-0' : 'opacity-25 -translate-x-4'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-colors duration-500 ${
                  activeStep > step.id ? 'bg-[#C8FF00] border-[#C8FF00]' : 
                  activeStep === step.id ? 'bg-black border-[#32ADE6] animate-pulse shadow-[0_0_15px_rgba(50,173,230,0.5)]' : 
                  'bg-black border-[#333]'
                }`}>
                  {activeStep > step.id ? (
                    <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <span className={`text-[10px] font-black ${activeStep === step.id ? 'text-[#32ADE6]' : 'text-[#666]'}`}>{step.id}</span>
                  )}
                </div>
                <div>
                  <div className={`text-xs font-black tracking-widest ${activeStep >= step.id ? 'text-white' : 'text-[#888]'}`}>{step.name}</div>
                  <div className="text-[9px] text-[#555] uppercase tracking-wider">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — AI DECISION EXPLAINABILITY (Cols 8-12) */}
        <div className="xl:col-span-5 flex flex-col gap-6 h-full">
          {/* AI Analysis Panel */}
          <div className="bg-[#0f1015] border border-white/5 p-6 relative h-1/2 min-h-[250px] overflow-y-auto">
            <h2 className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <svg className="w-3 h-3 text-[#32ADE6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              AI Analysis Explainability
            </h2>
            
            {activeStep >= 3 && (result || loading) ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-[9px] text-[#888] uppercase tracking-widest mb-1">Failure Detected</div>
                    <div className="text-[#FF3B30] font-black text-sm uppercase tracking-wider">{failureType.replace(/ /g, '_')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-[#888] uppercase tracking-widest mb-1">AI Confidence</div>
                    <div className="text-[#32ADE6] font-black text-xl">{result?.ai ? `${(Number(result.ai.confidence || 0) * 100).toFixed(1)}%` : 'Analyzing...'}</div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3 mb-4">
                  <div className="text-[9px] text-[#888] uppercase tracking-widest mb-2">Reasoning Signals</div>
                  {result?.ai ? (
                    <div className="text-[#ccc] text-xs leading-relaxed border-l-2 border-[#32ADE6] pl-3">
                      {result.ai.reasoning}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="h-2 bg-white/10 rounded w-full animate-pulse"></div>
                      <div className="h-2 bg-white/10 rounded w-5/6 animate-pulse"></div>
                      <div className="h-2 bg-white/10 rounded w-4/6 animate-pulse"></div>
                    </div>
                  )}
                </div>

                {result?.ai && (
                  <div className="flex items-center gap-3 bg-[#32ADE6]/10 border border-[#32ADE6]/20 p-3">
                    <div className="w-8 h-8 bg-[#32ADE6]/20 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-[#32ADE6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#32ADE6] uppercase tracking-widest mb-0.5">Recommended Strategy</div>
                      <div className="text-white font-bold text-xs">{result.ai.recommendedAction.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-[#444] text-xs font-medium uppercase tracking-widest">Waiting for event...</div>
            )}
          </div>

          {/* Policy Panel */}
          <div className="bg-[#0f1015] border border-white/5 p-6 h-1/2 min-h-[250px] flex flex-col justify-between">
            <div>
              <h2 className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <svg className="w-3 h-3 text-[#4ade80]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Policy Engine
              </h2>
              
              {activeStep >= 4 ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-3">
                  <div className="flex justify-between items-center text-xs text-[#ccc]"><span>Retry allowed limit check</span> <span className="text-[#4ade80]">✓</span></div>
                  <div className="flex justify-between items-center text-xs text-[#ccc]"><span>Customer communication window</span> <span className="text-[#4ade80]">✓</span></div>
                  <div className="flex justify-between items-center text-xs text-[#ccc]"><span>Risk threshold check</span> 
                    {result?.policy ? (
                      <span className={result.policy.allowed ? "text-[#4ade80]" : "text-[#FF3B30] font-bold"}>
                        {result.policy.allowed ? "PASSED" : "FAILED"}
                      </span>
                    ) : <span className="text-[#888] animate-pulse">...</span>}
                  </div>
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center text-[#444] text-xs font-medium uppercase tracking-widest">Waiting for AI...</div>
              )}
            </div>

            {activeStep >= 5 && result?.policy && (
              <div className={`mt-4 p-3 flex items-center justify-between border ${result.policy.allowed ? 'bg-[#4ade80]/10 border-[#4ade80]/30' : 'bg-[#FF3B30]/10 border-[#FF3B30]/30'}`}>
                <div className="text-[10px] uppercase tracking-widest text-white/70">Final Gateway Decision</div>
                <div className={`font-black text-sm tracking-widest ${result.policy.allowed ? 'text-[#4ade80]' : 'text-[#FF3B30]'}`}>
                  {result.policy.allowed ? 'APPROVED' : 'BLOCKED'}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* BOTTOM — FINAL RESULT */}
      {activeStep === 7 && result && (
        <div className="mt-6 bg-black border border-white/10 p-6 flex items-center justify-between animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div>
            <div className="text-[10px] text-[#666] uppercase tracking-widest mb-1">Recovery Case</div>
            <div className="text-white font-mono text-sm">{result.case.id.substring(0, 8).toUpperCase()}</div>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div>
            <div className="text-[10px] text-[#666] uppercase tracking-widest mb-1">AI Decision</div>
            <div className="text-[#32ADE6] font-bold text-sm tracking-wider uppercase">{result.ai.recommendedAction.replace(/_/g, ' ')}</div>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div>
            <div className="text-[10px] text-[#666] uppercase tracking-widest mb-1">Policy Status</div>
            <div className={`font-black text-sm tracking-widest uppercase ${result.policy.allowed ? 'text-[#4ade80]' : 'text-[#FF3B30]'}`}>{result.policy.allowed ? 'APPROVED ✓' : 'BLOCKED ✗'}</div>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div>
            <div className="text-[10px] text-[#666] uppercase tracking-widest mb-1">Est. Recovery</div>
            <div className="text-[#C8FF00] font-black text-lg">₹{Math.floor((result.payment.amount / 100) * (result.ai.recoveryProbability || 1)).toLocaleString()}</div>
          </div>
        </div>
      )}

    </div>
  );
}
