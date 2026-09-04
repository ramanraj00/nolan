with open('frontend/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

content = content.replace('min-h-[220px] flex-1', 'min-h-[220px] flex-1') # keeping it 220
content = content.replace('min-h-[140px]"', 'min-h-[130px]"') # AI/Policy
content = content.replace('min-h-[160px]"', 'min-h-[150px]"') # LiveActivity
content = content.replace('min-h-[200px]"', 'min-h-[200px]"') # WhyPaymentsFail (no change)

# Pipeline
content = content.replace('min-h-[200px]">\n              <div className="lg:col-span-1', 'min-h-[140px]">\n              <div className="lg:col-span-1')

# Bottom row
content = content.replace('min-h-[220px]">\n             <div className="xl:col-span-3', 'min-h-[200px]">\n             <div className="xl:col-span-3')

with open('frontend/app/dashboard/page.tsx', 'w') as f:
    f.write(content)
