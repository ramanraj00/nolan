"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "../../lib/api";

export default function Topbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [greeting, setGreeting] = useState("Good morning");
  const [merchantName, setMerchantName] = useState("Loading...");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamic Greeting
    const hour = new Date().getHours();
    if (hour < 5) setGreeting("Good night");
    else if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    // Fetch Merchant & Notifications
    async function loadData() {
      try {
        let mid = process.env.NEXT_PUBLIC_MERCHANT_ID;
        if (!mid) {
          const merchants = await fetchApi<any[]>("/merchants");
          if (merchants && merchants.length > 0) {
            mid = merchants[0].id || merchants[0].user_id;
            setMerchantName(merchants[0].name || "Demo Merchant");
          } else {
            setMerchantName("Demo Merchant");
            return;
          }
        }
        
        if (mid) {
           const actionsRes = await fetchApi<any>(`/recovery-actions?merchant_id=${mid}`);
           const actions = actionsRes.data || [];
           // Find actions pending approval for notifications
           const pending = actions.filter((a: any) => a.status === 'PENDING_APPROVAL');
           
           // Format notifications
           const notifs = pending.map((p: any) => ({
             id: p.id,
             title: "Manual Approval Required",
             desc: `Action ${p.type} requires human review.`,
             time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now',
             link: `/dashboard/recovery-cases/${p.recoveryCaseId}`
           }));

           // If none pending, maybe show recent failed payments
           if (notifs.length === 0) {
              const casesRes = await fetchApi<any>(`/recovery-cases?merchant_id=${mid}`);
              const cases = casesRes.data || [];
              const recentFailures = cases.filter((c: any) => c.status === 'ESCALATED').slice(0, 3);
              recentFailures.forEach((c: any) => {
                 notifs.push({
                   id: c.id,
                   title: "Recovery Escalated",
                   desc: `Payment recovery failed for ${c.customerName || 'Customer'}.`,
                   time: c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now',
                   link: `/dashboard/recovery-cases/${c.id}`
                 });
              });
           }
           
           setNotifications(notifs);
        }
      } catch(e) {
        console.error("Error loading topbar data:", e);
      }
    }
    loadData();

    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams);
    if (val) params.set("search", val);
    else params.delete("search");
    router.replace(`?${params.toString()}`);
  };

  return (
    <header className="h-16 w-full bg-[#0a0a0a] border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-50 relative">
      
      {/* Left: Greeting */}
      <div className="flex items-center gap-4">
        <h1 className="text-white text-lg font-medium tracking-tight">
          {greeting}, <span className="text-[#C8FF00] font-bold">{merchantName.split(' ')[0]}</span>
        </h1>
      </div>

      {/* Right: Actions & Status */}
      <div className="flex items-center gap-6">
        
        {/* Search */}
        <div className="relative group hidden sm:block">
          <svg className="w-4 h-4 text-[#888] absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-[#C8FF00] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search cases..." 
            value={searchQuery}
            onChange={handleSearch}
            className="bg-[#111] border border-white/10 rounded-md text-white text-xs px-9 py-2 focus:outline-none focus:border-[#C8FF00]/50 focus:ring-1 focus:ring-[#C8FF00]/50 transition-all w-48 focus:w-64"
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`transition-colors relative p-1 rounded-md ${showNotifications ? 'text-white bg-white/10' : 'text-[#888] hover:text-white hover:bg-white/5'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {/* Notification Dot */}
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#FF3B30] rounded-full border border-[#0a0a0a]"></span>
            )}
          </button>
          
          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-[#111217] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-black/20">
                <h3 className="text-white text-sm font-bold">Notifications</h3>
                <span className="text-xs text-[#888] bg-white/5 px-2 py-0.5 rounded-full">{notifications.length} New</span>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-hide">
                {notifications.length > 0 ? (
                  notifications.map((n, i) => (
                    <div 
                      key={i} 
                      onClick={() => { router.push(n.link); setShowNotifications(false); }}
                      className="px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-white group-hover:text-[#C8FF00] transition-colors">{n.title}</span>
                        <span className="text-[10px] text-[#888] whitespace-nowrap ml-2">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-[#aaa] line-clamp-2">{n.desc}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-[#888] text-xs">
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Merchant Dropdown (Visual Only) */}
        <div className="h-8 px-3 border border-white/10 rounded-md flex items-center gap-2 text-sm text-white cursor-pointer hover:bg-white/5 transition-colors">
          <div className="w-4 h-4 bg-purple-500 rounded-sm"></div>
          <span className="max-w-[100px] truncate">{merchantName}</span>
          <svg className="w-3 h-3 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10 hidden sm:block"></div>

        {/* Live Status */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#A3A3A3] border border-white/10 rounded-full px-3 py-1.5 bg-[#111]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8FF00] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C8FF00]"></span>
          </span>
          Recovery Engine Active
        </div>

      </div>
    </header>
  );
}
