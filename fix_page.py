import re

with open('frontend/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

content = content.replace('className="flex-1 min-h-0 py-3 relative z-10"', 'className="flex-1 min-h-0 relative z-10"')

with open('frontend/app/dashboard/page.tsx', 'w') as f:
    f.write(content)
