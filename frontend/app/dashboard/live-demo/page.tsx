"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { fetchApi, Merchant } from "@/lib/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function DemoStore() {
  const [loading, setLoading] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

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

  const handlePayment = async () => {
    if (!merchantId) return;
    setLoading(true);
    setError(null);
    setPaymentStatus(null);

    try {
      const response = await fetchApi<any>("/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 1499, merchant_id: merchantId })
      });

      if (!response.success) {
        throw new Error("Failed to create order");
      }

      const options = {
        key: response.key_id,
        amount: response.amount,
        currency: response.currency,
        name: "Nolan Store (Demo)",
        description: "Test Transaction",
        order_id: response.order_id,
        handler: function (response: any) {
          setPaymentStatus("Payment Successful! No recovery needed.");
          setLoading(false);
        },
        prefill: {
          name: "Test User",
          email: "test@example.com",
          contact: "9999999999"
        },
        theme: {
          color: "#0a0a0a"
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response: any) {
        setPaymentStatus("Payment Failed! Nolan has automatically caught this via Webhook and triggered AI Recovery.");
        setLoading(false);
      });

      rzp.open();

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-[#0a0a0a] text-white flex flex-col font-sans">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Navbar */}

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <div className="h-48 bg-gradient-to-br from-[#32ADE6]/20 to-[#C8FF00]/10 flex items-center justify-center p-8">
            {/* Fake Product Image */}
            <div className="w-full h-full border border-white/10 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center flex-col gap-2 shadow-2xl">
                <svg className="w-12 h-12 text-[#C8FF00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <div className="font-bold text-sm">Premium Workspace Pro</div>
            </div>
          </div>
          
          <div className="p-8">
            <h1 className="text-2xl font-black mb-2">Premium Workspace Pro</h1>
            <p className="text-[#888] text-sm mb-6">Experience the ultimate productivity suite for modern teams. Annual subscription.</p>
            
            <div className="flex items-end gap-2 mb-8 border-b border-white/10 pb-6">
              <span className="text-3xl font-black text-white">₹1,499</span>
              <span className="text-sm text-[#888] font-medium mb-1 line-through">₹2,999</span>
            </div>

            {error && <div className="text-[#FF3B30] text-xs font-bold mb-4 bg-[#FF3B30]/10 p-3 rounded-md">{error}</div>}
            
            {paymentStatus ? (
               <div className={`p-4 rounded-md text-sm font-bold text-center ${paymentStatus.includes('Failed') ? 'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20' : 'bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20'}`}>
                 {paymentStatus}
                 {paymentStatus.includes('Failed') && (
                    <a href="/dashboard" className="block mt-3 text-xs uppercase tracking-widest text-white underline hover:text-[#C8FF00]">View Live Pipeline in Dashboard</a>
                 )}
               </div>
            ) : (
              <button 
                onClick={handlePayment} 
                disabled={loading || !merchantId}
                className="w-full bg-[#C8FF00] hover:bg-[#b3e600] text-black font-black text-sm uppercase tracking-widest py-4 rounded-md transition-all disabled:opacity-50"
              >
                {loading ? "Processing..." : "Pay with Razorpay"}
              </button>
            )}

            <div className="mt-6 text-center">
              <p className="text-[10px] text-[#666] uppercase tracking-widest">
                Test Mode: Use a test card and intentionally fail the payment to trigger Nolan AI.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
