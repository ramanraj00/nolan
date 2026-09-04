import re

with open('frontend/components/dashboard/RecoveryChart.tsx', 'r') as f:
    content = f.read()

# Replace the graph area definitions
new_defs = """
          <defs>
            <linearGradient id="chartGradientRec" x1="0" y1="0" x2="0" y2="1">
               <stop offset="5%" stopColor="#C8FF00" stopOpacity="0.3" />
               <stop offset="95%" stopColor="#C8FF00" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="chartGradientRisk" x1="0" y1="0" x2="0" y2="1">
               <stop offset="5%" stopColor="#A3A3A3" stopOpacity="0.3" />
               <stop offset="95%" stopColor="#A3A3A3" stopOpacity="0.0" />
            </linearGradient>
          </defs>
"""

content = re.sub(r'<defs>.*?</defs>', new_defs.strip(), content, flags=re.DOTALL)
content = content.replace('bg-[#111217] rounded-2xl p-4 shadow-lg border border-white/5', 'bg-[#09090B] rounded-2xl p-4 border border-zinc-800/60 shadow-[0_0_20px_rgba(200,255,0,0.05)]')
content = content.replace('text-[#666]', 'text-zinc-400')
content = content.replace('text-[#888]', 'text-zinc-400')
content = content.replace('font-black', 'font-bold')

with open('frontend/components/dashboard/RecoveryChart.tsx', 'w') as f:
    f.write(content)
