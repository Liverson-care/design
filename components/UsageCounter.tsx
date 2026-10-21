"use client";
import { useEffect } from "react";
import { useStudio } from "@/lib/store";
import { IconCrown } from "@/components/ui/icons";

export function useUsageSync() {
  const setUsage = useStudio((s) => s.setUsage);
  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((j) => j.usage && setUsage(j.usage))
      .catch(() => undefined);
  }, [setUsage]);
}

export function UsageCounter({ compact = false }: { compact?: boolean }) {
  useUsageSync();
  const usage = useStudio((s) => s.usage);
  const openPro = useStudio((s) => s.openPro);
  if (usage.plan === "PRO") {
    return <span className="badge bg-amber-100 text-amber-800"><IconCrown size={12} /> Pro · illimité</span>;
  }
  const used = Math.min(usage.used, usage.limit);
  const pct = (used / usage.limit) * 100;
  const left = usage.limit - used;
  return (
    <button onClick={() => openPro(left ? null : "quota")} className={`group flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-3 py-2 text-left transition hover:border-brand-200 ${compact ? "" : "min-w-[190px]"}`} aria-label={`${used} sur ${usage.limit} designs gratuits utilisés`}>
      <div className="flex-1">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="font-bold text-ink-900">{used} / {usage.limit} designs utilisés</span>
          {!compact && <span className="text-ink-400 group-hover:text-brand-600">Gratuit</span>}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
          <div className={`h-full rounded-full transition-all duration-500 ${left === 0 ? "bg-rose-500" : left <= 2 ? "bg-amber-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </button>
  );
}
