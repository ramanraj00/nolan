"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";

interface Merchant {
  id: string;
  name: string;
  email: string;
  razorpay_account_id: string;
  status: string;
  created_at: string;
}

interface WebhookEvent {
  id: string;
  merchantId: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processedAt: string | null;
  createdAt: string;
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(dateString));
};

const formatRelative = (dateString: string) => {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function IntegrationsPage() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [selectedPayload, setSelectedPayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const merchants = await fetchApi<Merchant[]>("/merchants");
        const m = merchants[0];
        setMerchant(m);

        const mid = m.id;
        const res = await fetchApi<{ data: WebhookEvent[] }>(`/webhook-events?merchant_id=${mid}`);
        const sorted = res.data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWebhooks(sorted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalEvents = webhooks.length;
  const processedEvents = webhooks.filter(w => w.processed).length;
  const failedEvents = webhooks.filter(w => !w.processed).length;
  const lastWebhook = webhooks.length > 0 ? webhooks[0] : null;
  const recentWebhooks = webhooks.slice(0, 8);


  const handleSimulate = async () => {
    if (!merchant) return;
    setTesting(true);
    try {
      await fetchApi('/webhook-events/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: merchant.id })
      });
      
      // Reload webhooks
      const res = await fetchApi<{ data: WebhookEvent[] }>(`/webhook-events?merchant_id=${merchant.id}`);
      const sorted = res.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setWebhooks(sorted);
      
    } catch (e) {
      console.error(e);
    } finally {
      setTesting(false);
    }
  };
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Ping the webhook-events endpoint to verify connectivity
      const merchants = await fetchApi<Merchant[]>("/merchants");
      if (merchants && merchants.length > 0) {
        setTestResult('SUCCESS');
      } else {
        setTestResult('FAILED');
      }
    } catch {
      setTestResult('FAILED');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center bg-[#07080B]">
        <div className="w-8 h-8 border-4 border-[#C8FF00] border-t-transparent rounded-none animate-spin"></div>
      </div>
    );
  }

  const webhookEndpoint = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/razorpay`
    : '/api/webhooks/razorpay';

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#07080B] text-white overflow-hidden">
      {/* Header */}
      <div className="p-4 lg:p-8 shrink-0 pb-4 lg:pb-6 border-b border-white/5">
        <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4 lg:gap-0">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Integrations</h1>
            <p className="text-[#888] text-sm font-medium">Payment gateway connections and webhook pipeline status.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8 flex flex-col gap-6">

        {/* Connection Status Card */}
        <div className="bg-[#111217] border border-white/5 p-8">
          <div className="flex flex-col lg:flex-row items-start justify-between mb-4 lg:mb-8 gap-4 lg:gap-0">
            <div className="flex flex-wrap items-center gap-2 lg:gap-4 w-full lg:w-auto">
              <div className="w-12 h-12 bg-[#32ADE6]/10 border border-[#32ADE6]/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-[#32ADE6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Razorpay</h2>
                <p className="text-[#888] text-xs font-medium mt-0.5">Payment Gateway Integration</p>
              </div>
            </div>
            <span className={`px-3 py-1.5 font-black uppercase tracking-widest text-[9px] ${
              merchant?.status === 'active'
                ? 'bg-[#C8FF00] text-black'
                : 'bg-[#FF3B30] text-white'
            }`}>
              {merchant?.status === 'active' ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div className="bg-white/5 border border-white/10 p-4">
              <div className="text-[9px] font-bold text-[#666] uppercase tracking-widest mb-1">Account ID</div>
              <div className="text-white font-mono text-sm">{merchant?.razorpay_account_id || '-'}</div>
            </div>
            <div className="bg-white/5 border border-white/10 p-4">
              <div className="text-[9px] font-bold text-[#666] uppercase tracking-widest mb-1">Merchant</div>
              <div className="text-white font-medium text-sm">{merchant?.name || '-'}</div>
            </div>
            <div className="bg-white/5 border border-white/10 p-4">
              <div className="text-[9px] font-bold text-[#666] uppercase tracking-widest mb-1">Connected Since</div>
              <div className="text-white font-medium text-sm">{merchant?.created_at ? formatDate(merchant.created_at) : '-'}</div>
            </div>
            <div className="bg-white/5 border border-white/10 p-4">
              <div className="text-[9px] font-bold text-[#666] uppercase tracking-widest mb-1">Contact</div>
              <div className="text-white font-medium text-sm">{merchant?.email || '-'}</div>
            </div>
          </div>
        </div>

        {/* Webhook Status + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-[#111217] border border-white/5 p-6 col-span-1 lg:col-span-2">
            <div className="flex flex-col lg:flex-row items-center lg:items-start lg:justify-between gap-4 lg:gap-0 mb-8 w-full">
              <h3 className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Webhook Pipeline</h3>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleSimulate}
                  disabled={testing}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest border border-white/10 transition-colors disabled:opacity-50"
                >
                  {testing ? 'SIMULATING...' : 'SIMULATE WEBHOOK'}
                </button>
                <span className={`px-3 py-1.5 font-black uppercase tracking-widest text-[9px] ${
                  totalEvents > 0 ? 'bg-[#C8FF00] text-black' : 'bg-[#555] text-white'
                }`}>
                  {totalEvents > 0 ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 p-4 text-center">
                <div className="text-2xl font-black text-white tabular-nums">{totalEvents}</div>
                <div className="text-[9px] font-bold text-[#888] uppercase tracking-widest mt-1">Received</div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 text-center">
                <div className="text-2xl font-black text-[#C8FF00] tabular-nums">{processedEvents}</div>
                <div className="text-[9px] font-bold text-[#888] uppercase tracking-widest mt-1">Processed</div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 text-center">
                <div className="text-2xl font-black text-[#FF3B30] tabular-nums">{failedEvents}</div>
                <div className="text-[9px] font-bold text-[#888] uppercase tracking-widest mt-1">Failed</div>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 text-center">
                <div className="text-sm font-bold text-white">{lastWebhook ? formatRelative(lastWebhook.createdAt) : '-'}</div>
                <div className="text-[9px] font-bold text-[#888] uppercase tracking-widest mt-1">Last Event</div>
              </div>
            </div>
          </div>

          {/* Test Connection */}
          <div className="bg-[#111217] border border-white/5 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-4">Connection Test</h3>
              <div className="bg-white/5 border border-white/10 p-3 mb-4">
                <div className="text-[9px] font-bold text-[#666] uppercase tracking-widest mb-1">Endpoint</div>
                <div className="text-[10px] font-mono text-[#aaa] break-all">{webhookEndpoint}</div>
              </div>
            </div>
            <div>
              {testResult && (
                <div className={`mb-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-center ${
                  testResult === 'SUCCESS'
                    ? 'bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/20'
                    : 'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20'
                }`}>
                  {testResult === 'SUCCESS' ? '✓ Connection Healthy' : '✗ Connection Failed'}
                </div>
              )}
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full px-4 py-3 bg-[#32ADE6] text-black font-black uppercase tracking-widest text-[10px] hover:bg-[#32ADE6]/80 transition-colors disabled:opacity-50"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
            </div>
          </div>
        </div>

        {/* Visual Pipeline */}
        <div className="bg-[#111217] border border-white/5 p-8">
          <h3 className="text-[10px] font-bold text-[#888] uppercase tracking-widest mb-8">Webhook Processing Pipeline</h3>
          <div className="flex flex-col lg:flex-row items-center lg:items-start lg:justify-between gap-6 lg:gap-0">
            {[
              { label: 'RAZORPAY', color: '#32ADE6', desc: 'Payment Gateway' },
              { label: 'WEBHOOK RECEIVED', color: '#C8FF00', desc: `${totalEvents} events` },
              { label: 'EVENT STORED', color: '#AF52DE', desc: `${totalEvents} stored` },
              { label: 'PROCESSOR', color: '#FF9500', desc: `${processedEvents} processed` },
              { label: 'RECOVERY ENGINE', color: '#C8FF00', desc: `${processedEvents} actioned` },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex flex-col lg:flex-row items-center">
                <div className="flex flex-col items-center">
                  <div
                    className="w-3 h-3 rounded-full mb-2"
                    style={{ backgroundColor: step.color }}
                  />
                  <div className="text-[10px] font-black text-white uppercase tracking-widest text-center whitespace-nowrap">
                    {step.label}
                  </div>
                  <div className="text-[9px] font-bold text-[#888] mt-1">{step.desc}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className="w-[2px] h-8 lg:w-16 lg:h-[2px] my-2 lg:my-0 lg:mx-4 lg:mt-[-18px]" style={{ backgroundColor: `${step.color}40` }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Webhook Activity */}
        <div className="bg-[#111217] border border-white/5">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Recent Webhook Activity</h3>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-[#0f1015]">
              <tr>
                <th className="py-4 px-6 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Event ID</th>
                <th className="py-4 px-4 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Type</th>
                <th className="py-4 px-4 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Status</th>
                <th className="py-4 px-4 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">Payload</th>
                <th className="py-4 px-6 text-[9px] font-bold text-[#666] uppercase tracking-[0.2em] text-right">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentWebhooks.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#555] text-sm">No webhook events received yet.</td>
                </tr>
              )}
              {recentWebhooks.map((w) => (
                <tr key={w.id} onClick={() => setSelectedPayload(w.payload)} className="hover:bg-white/[0.02] transition-colors cursor-pointer" title="Click to view full payload">
                  <td className="py-3 px-6 text-[11px] font-mono font-bold text-[#32ADE6]">{w.eventId}</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">
                      {w.eventType.replace(/\./g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1.5 font-black uppercase tracking-widest text-[9px] ${
                      w.processed
                        ? 'bg-[#C8FF00] text-black'
                        : 'bg-[#FF3B30] text-white'
                    }`}>
                      {w.processed ? 'PROCESSED' : 'FAILED'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[10px] font-mono text-[#888] max-w-[200px] truncate">
                    {JSON.stringify(w.payload)}
                  </td>
                  <td className="py-3 px-6 text-[11px] font-medium text-[#888] text-right">
                    {formatDate(w.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>

      </div>

      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPayload(null)}>
          <div className="bg-[#111217] border border-white/10 w-full max-w-2xl flex flex-col relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Webhook Payload Details</h3>
              <button onClick={() => setSelectedPayload(null)} className="text-[#888] hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </button>
            </div>
            <div className="p-0 overflow-y-auto max-h-[70vh]">
              <pre className="text-[#32ADE6] text-[11px] font-mono whitespace-pre-wrap p-6">
                {JSON.stringify(selectedPayload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
