import re

with open('frontend/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

content = content.replace('className="grid grid-cols-2 gap-3 h-[90px] shrink-0"', 'className="grid grid-cols-2 gap-3 h-[140px] shrink-0"')

with open('frontend/app/dashboard/page.tsx', 'w') as f:
    f.write(content)
