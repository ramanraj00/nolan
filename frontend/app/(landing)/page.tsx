import Image from "next/image";
import FAQSection from "../../components/landing/FAQSection";

export default function Home() {
  return (
    <div id="home" className="min-h-screen bg-[#0E0E0E] font-sans selection:bg-[#C8FF00] selection:text-black flex flex-col">

      
      <div className="min-h-[100svh] md:h-screen flex flex-col md:overflow-hidden relative">
      {/* Navbar */}
      <nav className="w-full max-w-7xl mx-auto px-6 md:px-8 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2">
            {/* Logo Icon */}
            <div className="w-6 h-6 bg-[#C8FF00] flex items-center justify-center rounded-sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L14.4 9.6H22L15.6 14.4L18 22L12 17.2L6 22L8.4 14.4L2 9.6H9.6L12 2Z" fill="black"/>
              </svg>
            </div>
            <span className="text-white text-xl font-bold tracking-tight">Nolan</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-[#A3A3A3] text-sm font-medium">
            <a href="#home" className="hover:text-white transition-colors">Home</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#footer" className="hover:text-white transition-colors">Others</a>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <a href="https://github.com/ramanraj00/nolan" target="_blank" rel="noopener noreferrer" className="text-[#A3A3A3] hover:text-white transition-colors flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="text-sm font-medium hidden sm:block">GitHub</span>
          </a>
          <button className="flex items-center text-xs font-bold text-white hover:text-[#C8FF00] transition-colors">
            <span className="px-3 py-2">SIGN IN</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-1">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto px-6 md:px-8 mt-6 flex-1 flex flex-col min-h-0">
        
        <div className="shrink-0 mb-6 w-full flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
          
          <div className="max-w-2xl">
            <h1 className="text-white text-3xl md:text-4xl font-normal tracking-tight leading-[1.15] mb-4">
              Turn failed payments into<br className="hidden sm:block" /> recovered revenue.
            </h1>
            
            <p className="text-[#888888] text-sm md:text-base leading-relaxed mb-8 max-w-xl">
              AI that detects payment failures, understands why they happened, 
              and orchestrates the safest recovery action — automatically.
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <button className="px-6 py-2.5 bg-[#C8FF00] hover:bg-[#b5e600] text-black font-semibold  transition-colors text-sm">
                Check Docs
              </button>
              <button className="px-6 py-2.5 bg-transparent border border-[#333333] hover:border-white text-white font-medium  transition-colors text-sm">
                Sign Up
              </button>
            </div>
          </div>

          {/* Right side Request a Demo Button */}
          <button className="flex items-center text-xs font-bold bg-[#111111] text-white hover:bg-[#222222] transition-colors shrink-0 border border-white/5 overflow-hidden group">
            <span className="px-5 py-3 tracking-widest">REQUEST A DEMO</span>
            <span className="px-4 py-3 bg-[#C8FF00] group-hover:bg-[#b5e600] transition-colors text-black flex items-center justify-center border-l border-white/5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>
          
        </div>

        {/* Hero Image Composition - DESKTOP (Original) */}
        <div className="relative w-full flex-1 mb-8 overflow-hidden hidden md:block">
          
          <Image 
            src="/nolanhero.png" 
            alt="Colorful Background" 
            fill
            className="object-cover object-top opacity-85"
            priority
          />
          
          <div className="absolute inset-0 pt-8 px-8 md:pt-14 md:px-20 lg:px-28">
            <div className="relative w-full rounded-t-xl sm:rounded-t-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-t border-x border-white/20 transform transition-transform hover:-translate-y-1 duration-500 overflow-hidden bg-[#0E0E0E]">
              <Image 
                src="/nolandashboard.webp" 
                alt="Dashboard UI" 
                width={1672}
                height={941}
                className="w-full h-auto block"
                priority
              />
            </div>
          </div>
          
        </div>

        {/* Hero Image Composition - MOBILE (Scrollable) */}
        <div className="relative w-full flex-1 mt-8 md:hidden overflow-hidden min-h-[45vh] flex flex-col justify-end">
          
          <div className="absolute inset-0 rounded-t-2xl overflow-hidden">
            <Image 
              src="/nolanhero.png" 
              alt="Colorful Background" 
              fill
              className="object-cover object-top opacity-60"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0E0E0E]/50 to-[#0E0E0E]"></div>
          </div>
          
          <div className="relative w-full pt-8 mt-auto z-10">
            <div className="w-full overflow-x-auto pb-6 px-6 custom-scrollbar">
              <div className="relative w-[800px] mx-auto shrink-0 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border-t border-x border-white/20 transform transition-transform hover:-translate-y-1 duration-500 overflow-hidden bg-[#0E0E0E]">
                <Image 
                  src="/nolandashboard.webp" 
                  alt="Dashboard UI" 
                  width={1672}
                  height={941}
                  className="w-full h-auto block"
                  priority
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-[#888] text-xs font-medium pb-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 8l4 4-4 4M7 16l-4-4 4-4M21 12H3"/>
              </svg>
              Swipe to explore dashboard
            </div>
          </div>
          
        </div>

      </main>
      </div>

      {/* Section 2 - Intelligence FAQ */}
      <FAQSection />

    </div>
  );
}
