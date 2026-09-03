"use client";

import { useState, useRef, useEffect } from "react";

const options = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" }
];

export default function TimeFilter({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || "Last 7 days";

  return (
    <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between min-w-[140px] px-4 py-2.5 bg-[#111] border border-white/10 hover:border-white/20 transition-colors rounded-lg text-sm font-medium text-white shadow-sm focus:outline-none"
      >
        {selectedLabel}
        <svg className={`w-4 h-4 text-[#888] transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0a0a0a] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 flex items-center justify-between text-sm hover:bg-white/5 transition-colors group"
            >
              <span className={`font-medium ${value === option.value ? 'text-[#C8FF00]' : 'text-[#e5e5e5]'}`}>
                {option.label}
              </span>
              
              <svg className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${value === option.value ? 'text-[#C8FF00]' : 'text-[#555]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
