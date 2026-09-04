import { Suspense } from "react";
import Sidebar from "../../components/dashboard/Sidebar";
import Topbar from "../../components/dashboard/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#111111] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Topbar */}
        <div className="relative z-50 shadow-sm">
          <Suspense fallback={<div className="h-16 bg-[#0a0a0a] border-b border-white/5"></div>}><Topbar /></Suspense>
        </div>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-transparent relative z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
