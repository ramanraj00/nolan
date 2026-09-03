"use client";

import { useState } from "react";

const faqs = [
  {
    num: "01",
    question: "What happens when a payment fails?",
    answer: "RecoverAI detects the failed payment, identifies the revenue at risk, and creates a recovery case automatically. The payment then enters the recovery pipeline for analysis and action."
  },
  {
    num: "02",
    question: "How does AI decide what to do?",
    answer: "The AI agent analyzes the payment context and failure signals to determine the likely cause, estimate recovery probability, and recommend the most suitable recovery action."
  },
  {
    num: "03",
    question: "Can AI execute anything it wants?",
    answer: "No. Every AI recommendation passes through a policy engine first. The policy layer evaluates safety rules, payment history, confidence, retry limits, and approval requirements before any action can run."
  },
  {
    num: "04",
    question: "What happens after an action is approved?",
    answer: "The approved recovery action is executed through the appropriate recovery channel. Its progress is tracked from pending to execution, success or failure, with every state transition recorded."
  },
  {
    num: "05",
    question: "What if the recovery attempt fails?",
    answer: "Recovery never becomes a dead end. Failed actions are handled gracefully, the recovery case can be escalated for human attention, and the complete outcome is recorded for analysis."
  },
  {
    num: "06",
    question: "How do you know how much revenue was recovered?",
    answer: "Every recovery case is linked to its payment and outcome. RecoverAI measures revenue at risk, recovered revenue, recovery rate, failed payments, and recovery performance in real time."
  },
  {
    num: "07",
    question: "Can merchants see what the AI did?",
    answer: "Yes. Every important decision and action is recorded in an audit trail — from revenue risk detection and AI analysis to policy evaluation, execution, recovery, or escalation."
  },
  {
    num: "08",
    question: "Does RecoverAI work with Razorpay?",
    answer: "RecoverAI is designed around the Razorpay payment lifecycle, using payment events and webhooks to detect failures and trigger the recovery workflow while keeping payment execution within the merchant's authorized environment."
  },
  {
    num: "09",
    question: "What happens if the system receives the same webhook twice?",
    answer: "Events are handled idempotently, so duplicate webhook deliveries don't create duplicate recovery cases or repeat recovery actions."
  },
  {
    num: "10",
    question: "Who is actually in control?",
    answer: "The merchant's recovery policy remains the final authority. AI recommends; the policy engine decides what is allowed; the execution layer performs only approved actions."
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="how-it-works" className="w-full max-w-7xl mx-auto px-6 md:px-8 py-16 md:py-24 border-t border-white/10 lg:h-[90vh] lg:min-h-[700px] flex flex-col justify-center">
      <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start w-full lg:h-full lg:max-h-[650px]">
        
        {/* Left Side: Static Content */}
        <div className="flex-1 h-full flex flex-col justify-center max-w-xl">
          <h2 className="text-white text-4xl md:text-5xl font-medium tracking-tight leading-[1.15] mb-6">
            The intelligence behind every recovered payment.
          </h2>
          <p className="text-[#A3A3A3] text-lg leading-relaxed mb-10">
            Failed payments don’t always mean lost customers. RecoverAI identifies revenue at risk, understands why a payment failed, and determines the safest way to recover it — while keeping every decision measurable and auditable.
          </p>
          <div>
            <button className="px-6 py-3 bg-white text-black font-semibold hover:bg-[#C8FF00] transition-colors flex items-center gap-2 group">
              See How It Works
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
          
          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-[#C8FF00] font-semibold text-lg leading-snug">
              AI recommends. Policy decides. Recovery executes. Every rupee is accounted for.
            </p>
          </div>
        </div>

        {/* Right Side: Accordion Questions (Independently Scrollable) */}
        <div className="flex-1 w-full max-w-2xl lg:h-full overflow-y-auto pr-4 pb-8">
          <div className="flex flex-col gap-4">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div 
                  key={faq.num} 
                  className={`border border-white/10 overflow-hidden transition-colors duration-300 ${isOpen ? 'bg-[#111]' : 'bg-transparent hover:bg-white/5'}`}
                >
                  <button 
                    onClick={() => toggleFAQ(index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-[#666] font-mono text-sm">{faq.num}</span>
                      <span className={`text-base font-medium transition-colors ${isOpen ? 'text-[#C8FF00]' : 'text-white'}`}>
                        {faq.question}
                      </span>
                    </div>
                    <div className={`text-[#888] transition-transform duration-300 ${isOpen ? 'rotate-45 text-[#C8FF00]' : ''}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>
                  
                  <div 
                    className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-6 pb-6 pt-0 ml-[36px] text-[#A3A3A3] text-sm md:text-base leading-relaxed">
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
      </div>
    </section>
  );
}
