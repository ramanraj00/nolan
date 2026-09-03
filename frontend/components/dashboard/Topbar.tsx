"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function Topbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams);
    if (val) params.set("search", val);
    else params.delete("search");
    router.replace(`?${params.toString()}`);
  };

  return (
    <header className="h-16 w-full bg-[#0a0a0a] border-b border-white/5 flex items-center justify-between px-6 shrink-0">
      
      {/* Left: Greeting */}
      <div className="flex items-center gap-4">
        <h1 className="text-white text-lg font-medium tracking-tight">
          Good morning, <span className="text-[#C8FF00]">Merchant</span>
        </h1>
      </div>

      {/* Right: Actions & Status */}
      <div className="flex items-center gap-6">
        
        {/* Search */}
        <div className="relative group">
          <svg className="w-4 h-4 text-[#888] absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-[#C8FF00] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Search cases..." 
            value={searchQuery}
            onChange={handleSearch}
            className="bg-[#111] border border-white/10 text-white text-xs px-9 py-2 focus:outline-none focus:border-[#C8FF00]/50 focus:ring-1 focus:ring-[#C8FF00]/50 transition-all w-48 focus:w-64"
          />
        </div>

        {/* Notifications */}
        <button className="text-[#888] hover:text-white transition-colors relative">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Notification Dot */}
          <span className="absolute top-0 right-0 w-2 h-2 bg-[#C8FF00] rounded-full"></span>
        </button>

        {/* Merchant Dropdown (Visual Only) */}
        <div className="h-8 px-3 border border-white/10 rounded-md flex items-center gap-2 text-sm text-white cursor-pointer hover:bg-white/5 transition-colors">
          <div className="w-4 h-4 bg-purple-500 rounded-sm"></div>
          Demo Merchant
          <svg className="w-3 h-3 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10"></div>

        {/* Live Status */}
        <div className="flex items-center gap-2 text-xs font-medium text-[#A3A3A3] border border-white/10 rounded-full px-3 py-1.5 bg-[#111]">
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
