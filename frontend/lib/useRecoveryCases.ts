"use client";
import { useState, useEffect } from "react";
import { RecoveryCase, fetchApi, getRecoveryCases } from "./api";

export function useRecoveryCases(statusFilter: string = 'All Cases') {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!cancelled && cases.length === 0) setLoading(true);
      setError(null);
      try {
        let mid = process.env.NEXT_PUBLIC_MERCHANT_ID;
        if (!mid) {
           const merchants = await fetchApi<any[]>("/merchants");
           if (merchants && merchants.length > 0) {
              mid = merchants[0].id || merchants[0].user_id;
           } else {
              throw new Error("No merchants found in the database.");
           }
        }

        const res = await getRecoveryCases(mid!);
        if (!cancelled) {
          let data = res.data || [];
          if (statusFilter === 'High Risk') {
             data = data.filter((c: RecoveryCase) => {
               // Cases already being handled or resolved should not trigger High Risk alerts
               if (['RECOVERED', 'IN_PROGRESS', 'ANALYZING'].includes(c.status)) {
                 return false;
               }

               const amount = Number(c.revenueAtRisk || 0);
               const prob = Number(c.recoveryProbability || 0);
               const isFraud = c.diagnosis === 'Suspected Fraud';
               const isEscalated = c.status === 'ESCALATED';
               const isHighValueLowProb = amount > 20000 && prob < 40;
               const isCriticalAmount = amount > 100000;
               
               return isFraud || isEscalated || isHighValueLowProb || isCriticalAmount;
             });
          }
          setCases(data);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load recovery cases");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
  }, [statusFilter]);

  return { cases, loading, error };
}
