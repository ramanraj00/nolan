import { Suspense } from "react";
import Sidebar from "../../components/dashboard/Sidebar";
import Topbar from "../../components/dashboard/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#07080B] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Demo Banner */}
        <div className="bg-[#C8FF00] text-black font-bold text-[10px] text-center py-1 uppercase tracking-widest relative z-60">
          DEMO ENVIRONMENT · RAZORPAY TEST MODE
        </div>
        
        {/* Topbar */}
        <div className="relative z-50 shadow-sm">
          <Suspense fallback={<div className="h-16 bg-[#0a0a0a] border-b border-white/5"></div>}><Topbar /></Suspense>
        </div>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-transparent relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
