with open('frontend/app/dashboard/page.tsx', 'r') as f:
    content = f.read()

old_right = """
            <div className="xl:col-span-1 flex flex-col gap-3">
               <div className="min-h-[150px]">
                 <LiveRecoveryActivity data={{ casesByStatus, failedPayments: s.failedPayments, recoveryCases: s.recoveryCases, actionPerformance: actions }} />
               </div>
               <div className="flex-1 min-h-[130px]">
                 <WhyPaymentsFail data={{ failureReasons, failedPayments: s.failedPayments }} />
               </div>
            </div>
""".strip()

new_right = """
            <div className="xl:col-span-1 flex flex-col gap-3">
               <div className="min-h-[150px]">
                 <WhyPaymentsFail data={{ failureReasons, failedPayments: s.failedPayments }} />
               </div>
               <div className="flex-1 min-h-[130px]">
                 <LiveRecoveryActivity data={{ casesByStatus, failedPayments: s.failedPayments, recoveryCases: s.recoveryCases, actionPerformance: actions }} />
               </div>
            </div>
""".strip()

content = content.replace(old_right, new_right)

with open('frontend/app/dashboard/page.tsx', 'w') as f:
    f.write(content)
