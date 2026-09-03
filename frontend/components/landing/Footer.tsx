export default function Footer() {
  return (
    <footer id="footer" className="w-full mt-auto bg-[#0a0a0a] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        
        {/* Top Row: Brand & Socials */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          
          {/* Brand Logo (Left) */}
          <div className="text-white font-bold text-2xl tracking-wide flex items-center">
            N
            <svg width="0.8em" height="0.8em" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="inline-block text-[#C8FF00] mx-[1px] -mt-[1px]">
              <path d="M12 2L14.4 9.6H22L15.6 14.4L18 22L12 17.2L6 22L8.4 14.4L2 9.6H9.6L12 2Z" />
            </svg>
            lan
          </div>

          {/* Social Icons (Right) */}
          <div className="flex items-center gap-6">
            <a href="https://x.com/r1zzdev?s=20" target="_blank" rel="noopener noreferrer" className="text-[#888] hover:text-white transition-colors">
              {/* X Logo */}
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://github.com/ramanraj00" target="_blank" rel="noopener noreferrer" className="text-[#888] hover:text-white transition-colors">
              {/* GitHub Logo */}
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
          <p className="text-[#666] text-sm font-medium">
            © 2026 Nolan. All rights reserved.
          </p>
          <p className="text-[#888] text-sm font-medium">
            Built with <span className="text-red-500 mx-1">❤️</span> by <span className="text-[#C8FF00] italic font-semibold">Raman Raj</span>
          </p>
        </div>

      </div>
    </footer>
  );
}
