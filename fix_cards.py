import os

files = ['AIIntelligence.tsx', 'PolicyEngine.tsx', 'WhyPaymentsFail.tsx']

for file in files:
    path = f'frontend/components/dashboard/{file}'
    with open(path, 'r') as f:
        content = f.read()

    content = content.replace('bg-[#111217]', 'bg-[#09090B]')
    content = content.replace('border-white/5', 'border-zinc-800/60 shadow-[0_0_20px_rgba(200,255,0,0.05)]')
    content = content.replace('text-[#888]', 'text-zinc-400')
    content = content.replace('text-[#999]', 'text-zinc-400')
    content = content.replace('text-[#666]', 'text-zinc-400')
    content = content.replace('font-black', 'font-bold')

    with open(path, 'w') as f:
        f.write(content)
