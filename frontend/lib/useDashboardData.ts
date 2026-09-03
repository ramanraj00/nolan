"use client";
import { useState, useEffect } from "react";
import { DashboardMetrics, RecoveryAction, getDashboardMetrics, getRecoveryActions, fetchApi } from "./api";

export interface DashboardData {
  metrics: DashboardMetrics | null;
  recentActions: RecoveryAction[];
  loading: boolean;
  error: string | null;
}

export function useDashboardData(timeframe: string = '7d'): DashboardData {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentActions, setRecentActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!cancelled && !metrics) setLoading(true);
      setError(null);
      try {
        let mid = process.env.NEXT_PUBLIC_MERCHANT_ID;
        
        if (!mid) {
           const merchants = await fetchApi<any[]>("/merchants");
           if (merchants && merchants.length > 0) {
              mid = merchants[0].id || merchants[0].user_id;
           } else {
              throw new Error("No merchants found in the database. Please create one.");
           }
        }

        const [metricsRes, actionsRes] = await Promise.all([
          getDashboardMetrics(mid!, timeframe),
          getRecoveryActions(mid!),
        ]);
        if (!cancelled) {
          setMetrics(metricsRes);
          setRecentActions(actionsRes.data || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load dashboard data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [timeframe]);

  return { metrics, recentActions, loading, error };
}
