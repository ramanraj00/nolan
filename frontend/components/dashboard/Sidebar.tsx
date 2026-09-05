"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { name: "Recovery Cases", href: "/dashboard/recovery-cases", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { name: "Payments", href: "/dashboard/payments", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { name: "AI Decisions", href: "/dashboard/ai-decisions", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
  { name: "Recovery Actions", href: "/dashboard/recovery-actions", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { name: "Audit Trail", href: "/dashboard/audit", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { name: "Integrations", href: "/dashboard/integrations", icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { name: "Live Checkout", href: "/dashboard/live-demo", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },

  { name: "Test Nolan", href: "/dashboard/simulate", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },

];

export default function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className={`bg-[#0a0a0a] border-r border-white/5 h-full flex flex-col transition-all duration-300 ease-in-out shrink-0 relative z-50 ${isExpanded ? 'w-64' : 'w-[68px]'}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Brand Logo / Toggle */}
      <div className={`h-16 flex items-center border-b border-white/5 shrink-0 ${isExpanded ? 'px-6 justify-between' : 'justify-center'}`}>
        {isExpanded ? (
          <Link href="/dashboard" className="flex items-center">
            <span className="text-white text-xl font-bold tracking-tight flex items-center">
              N
              <svg width="0.8em" height="0.8em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="inline-block text-[#C8FF00] mx-[1px] -mt-[1px]">
                <path d="M12 2L14.4 9.6H22L15.6 14.4L18 22L12 17.2L6 22L8.4 14.4L2 9.6H9.6L12 2Z" />
              </svg>
              lan
            </span>
          </Link>
        ) : (
          <div className="text-white cursor-pointer hover:text-[#C8FF00] transition-colors p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className={`flex-1 overflow-y-auto py-6 flex flex-col gap-2 ${isExpanded ? 'px-4' : 'items-center'}`}>
        {isExpanded && <div className="text-xs font-semibold text-[#555] uppercase tracking-wider mb-2 px-2">Navigation</div>}
        
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              title={!isExpanded ? item.name : undefined}
              className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
                isExpanded ? 'px-3 py-2.5 gap-3 w-full' : 'w-10 h-10 justify-center'
              } ${
                isActive 
                  ? "bg-white/10 text-white" 
                  : "text-[#888] hover:bg-white/5 hover:text-white"
              }`}
            >
              <svg className={`shrink-0 ${isExpanded ? 'w-5 h-5' : 'w-[22px] h-[22px]'} ${isActive ? 'text-[#C8FF00]' : 'text-[#888]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {isExpanded && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* Bottom Section */}
      <div className={`border-t border-white/5 shrink-0 ${isExpanded ? 'p-4' : 'py-4 flex flex-col items-center'}`}>
        <Link 
          href="/"
          title={!isExpanded ? "Logout" : undefined}
          className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
            isExpanded ? 'px-3 py-2.5 gap-3 w-full' : 'w-10 h-10 justify-center'
          } text-[#FF3B30] hover:bg-white/5`}
        >
          <svg className={`shrink-0 ${isExpanded ? 'w-5 h-5' : 'w-[22px] h-[22px]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {isExpanded && <span>Logout</span>}
        </Link>
      </div>
    </div>
  );
}
