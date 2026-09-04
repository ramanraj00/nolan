import re

with open('frontend/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden pb-2"',
    'key={timeframe} className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden pb-2"'
)

with open('frontend/app/dashboard/page.tsx', 'w') as f:
    f.write(content)
