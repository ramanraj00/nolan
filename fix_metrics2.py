with open('frontend/components/dashboard/MetricsGrid.tsx', 'r') as f:
    content = f.read()

# Make MetricsGrid extremely compact to fit in 85px height
content = content.replace('p-6', 'p-3 px-4 h-full')
content = content.replace('mb-3', 'mb-1')
content = content.replace('text-[32px]', 'text-[24px]')
content = content.replace('gap-4', 'gap-3 h-full')

with open('frontend/components/dashboard/MetricsGrid.tsx', 'w') as f:
    f.write(content)
