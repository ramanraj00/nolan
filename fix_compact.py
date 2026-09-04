with open('frontend/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

# Replace gap-4 with gap-3 for tighter spacing
content = content.replace('gap-4', 'gap-3')
# Keep the very outer gap to 3 or 2
content = content.replace('flex flex-col gap-3', 'flex flex-col gap-3')

# Reduce heights
content = content.replace('min-h-[320px]', 'min-h-[220px]')
content = content.replace('min-h-[180px]', 'min-h-[140px]')
content = content.replace('min-h-[220px]', 'min-h-[160px]')
content = content.replace('min-h-[240px]', 'min-h-[200px]')
content = content.replace('min-h-[200px]', 'min-h-[140px]')
content = content.replace('min-h-[300px]', 'min-h-[220px]')

# Also reduce padding on the big bg-[#111217] wrapper
content = content.replace('p-6 border', 'p-4 border')
content = content.replace('gap-8 items-center', 'gap-4 items-center')

with open('frontend/app/dashboard/page.tsx', 'w') as f:
    f.write(content)
