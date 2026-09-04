import re

with open('frontend/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}\s*$', '\n    </div>\n  );\n}\n', content)

with open('frontend/app/dashboard/page.tsx', 'w') as f:
    f.write(content)
