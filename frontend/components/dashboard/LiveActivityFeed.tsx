"use client";

const activities = [
  {
    time: "Just now",
    title: "₹4,500 payment recovered",
    subtitle: "PAY_9281",
    type: "success",
  },
  {
    time: "18 sec ago",
    title: "Retry payment approved",
    subtitle: "Recovery probability 91%",
    type: "info",
  },
  {
    time: "42 sec ago",
    title: "AI analysis completed",
    subtitle: "₹8,200 at risk",
    type: "warning",
  },
  {
    time: "1 min ago",
    title: "Payment failed",
    subtitle: "Card declined",
    type: "error",
  },
  {
    time: "2 min ago",
    title: "Recovery escalated",
    subtitle: "Manual review required",
    type: "action",
  }
];

export default function LiveActivityFeed() {
  return (
    <div className="bg-[#111] border border-white/5 rounded-2xl p-5 md:p-6 h-full flex flex-col relative overflow-hidden group">
      {/* Subtle hover glow matching other cards */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#C8FF00]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="flex items-center justify-between mb-6 relative z-10">
        <h3 className="text-white font-semibold text-base">Live Recovery Activity</h3>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#C8FF00]/10 border border-[#C8FF00]/20">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C8FF00] animate-pulse shadow-[0_0_8px_#C8FF00]"></div>
          <span className="text-[#C8FF00] text-[10px] font-bold tracking-wider uppercase">Live</span>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="flex-1 relative z-10">
        {/* Vertical line connecting timeline dots */}
        <div className="absolute left-[7px] top-2 bottom-4 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent"></div>
        
        <div className="flex flex-col gap-5">
          {activities.map((activity, i) => (
            <div key={i} className="flex gap-4 relative group/item">
              {/* Dot Container */}
              <div className="relative mt-1.5 z-10 flex-shrink-0">
                <div className={`w-3.5 h-3.5 rounded-full border-2 border-[#111] transition-transform duration-300 group-hover/item:scale-125 ${
                  activity.type === 'success' ? 'bg-[#C8FF00] shadow-[0_0_10px_rgba(200,255,0,0.3)]' :
                  activity.type === 'error' ? 'bg-[#FF3B30]' :
                  activity.type === 'warning' ? 'bg-[#FF9500]' :
                  activity.type === 'action' ? 'bg-[#FF9500]' :
                  'bg-[#0A84FF]'
                }`}></div>
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-1">
                <div className="text-[11px] font-medium text-[#888] mb-0.5">{activity.time}</div>
                <div className={`text-[13px] font-medium ${activity.type === 'success' ? 'text-[#C8FF00]' : 'text-white'}`}>
                  {activity.title}
                </div>
                <div className="text-xs text-[#666] mt-0.5">
                  {activity.subtitle}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
