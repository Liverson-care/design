"use client";
import type { CheckItem, GmsReport } from "@/lib/gms/check";
import { useStudio } from "@/lib/store";
import { sectorDef } from "@/lib/sectors";
import { IconAlert, IconCheck, IconShield, IconX } from "@/components/ui/icons";

const STATUS = {
  ok: { cls: "bg-emerald-100 text-emerald-700", icon: IconCheck, label: "Conforme" },
  warn: { cls: "bg-amber-100 text-amber-700", icon: IconAlert, label: "À vérifier" },
  fail: { cls: "bg-rose-100 text-rose-700", icon: IconX, label: "Non conforme" },
} as const;

export function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = size / 2 - 4, c = 2 * Math.PI * r;
  const color = score >= 85 ? "#059669" : score >= 65 ? "#d97706" : "#e11d48";
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }} title={`Score GMS ${score}/100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eeeef2" strokeWidth="4" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="4" fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round" style={{ transition: "stroke-dashoffset .6s" }} />
      </svg>
      <span className="absolute text-[11px] font-extrabold tabular-nums" style={{ color }}>{score}</span>
    </span>
  );
}

export function CheckList({ items, onFocus }: { items: CheckItem[]; onFocus?: (ids: string[]) => void }) {
  return (
    <ul className="space-y-2">
      {items.map((it) => {
        const s = STATUS[it.status];
        return (
          <li key={it.id}>
            <button type="button" className="w-full rounded-xl border border-ink-100 p-3 text-left transition hover:border-ink-200 hover:bg-ink-50/60" onClick={() => it.elementIds?.length && onFocus?.(it.elementIds)}>
              <div className="flex items-center gap-2">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${s.cls}`}><s.icon size={13} /></span>
                <span className="text-sm font-semibold text-ink-900">{it.label}</span>
                <span className={`badge ml-auto ${s.cls}`}>{s.label}</span>
              </div>
              <p className="mt-1.5 pl-8 text-xs leading-relaxed text-ink-600">{it.detail}</p>
              {it.advice && <p className="mt-1 pl-8 text-xs font-medium text-brand-700">→ {it.advice}</p>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function GmsPanel({ report, onFocus, title }: { report?: GmsReport; onFocus?: (ids: string[]) => void; title?: string }) {
  const sector = sectorDef(useStudio((s) => s.brief.sector));
  if (!report) return null;
  const heading = title ?? (sector.food ? "Contrôle Mode GMS France" : sector.key === "medicament" ? "Contrôle officine & réglementaire" : "Contrôle rayon & réglementaire");
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-900 text-white"><IconShield size={18} /></span>
        <div className="flex-1">
          <h3 className="text-sm font-bold">{heading}</h3>
          <p className="text-[11px] text-ink-500">Lisibilité · hiérarchie · contrastes · {sector.regulation}</p>
        </div>
        <ScoreRing score={report.score} />
      </div>
      <CheckList items={report.items} onFocus={onFocus} />
    </div>
  );
}
