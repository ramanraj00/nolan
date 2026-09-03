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
        <div className="relative z-10">
          <Topbar />
        </div>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-transparent relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
