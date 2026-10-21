"use client";
import { useCallback, useRef, useState } from "react";
import type { PanelRole } from "@/lib/types";
import { useStudio } from "@/lib/store";
import { ACCEPTED, importDielineFile } from "@/lib/dieline/import";
import { analyzeDieline, boxDimensions, cutLengthMm, printableAreaCm2, ROLE_LABELS } from "@/lib/dieline/analyze";
import { TEMPLATES, buildTemplate } from "@/lib/dieline/templates";
import { DesignImage } from "@/components/canvas/DesignImage";
import { IconAlert, IconBox, IconCheck, IconChevronRight, IconRuler, IconUpload } from "@/components/ui/icons";

const ROLE_COLORS: Partial<Record<PanelRole, string>> = {
  front: "bg-brand-600 text-white",
  back: "bg-ink-800 text-white",
  left: "bg-sky-600 text-white",
  right: "bg-sky-600 text-white",
  top: "bg-emerald-600 text-white",
  bottom: "bg-emerald-600 text-white",
  glue: "bg-ink-300 text-ink-800",
  flap: "bg-white/90 text-ink-600",
};

export function StepUpload() {
  const { dieline, setDieline, setStep } = useStudio();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const onFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      setDieline(await importDielineFile(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lecture du fichier impossible.");
    } finally {
      setLoading(false);
    }
  }, [setDieline]);

  const setRole = (id: string, role: PanelRole) => {
    if (!dieline) return;
    const panels = dieline.panels.map((p) => (p.id === id ? { ...p, role } : role !== "flap" && role !== "glue" && p.role === role ? { ...p, role: "flap" as PanelRole } : p));
    setDieline({ ...dieline, panels, box: boxDimensions(panels) });
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-up">
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand-600">Étape 1</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Importez le tracé de découpe</h1>
        <p className="mt-1 text-ink-500">PDF, Illustrator (.ai compatible PDF) ou SVG. Dimensions, zones imprimables, plis et découpes sont détectés automatiquement.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
            onClick={() => input.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
            className={`card flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-10 text-center transition ${over ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:border-brand-300 hover:bg-brand-50/40"}`}
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700"><IconUpload size={26} /></span>
            <div>
              <p className="font-semibold">{loading ? "Analyse du gabarit…" : "Glissez votre fichier ici ou cliquez pour parcourir"}</p>
              <p className="text-sm text-ink-500">PDF · AI · SVG — traits de découpe continus, plis en pointillés ou calques nommés</p>
            </div>
            <input ref={input} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
          </div>
          {error && <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800"><IconAlert size={18} className="mt-0.5 shrink-0" />{error}</p>}

          {dieline && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
                <div>
                  <p className="font-semibold">{dieline.name}</p>
                  <p className="text-xs text-ink-500">Source : {dieline.source.toUpperCase()} · gabarit verrouillé (jamais modifié par l'IA)</p>
                </div>
                <div className="flex gap-3 text-xs text-ink-500">
                  <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-[#e5262b]" /> Découpe</span>
                  <span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t-2 border-dashed border-[#14a44d]" /> Pli</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-4 border border-dashed border-brand-400" /> Zone sûre</span>
                </div>
              </div>
              <div className="checker relative p-4">
                <div className="relative mx-auto" style={{ maxWidth: Math.min(900, dieline.widthMm * 2.2) }}>
                  <DesignImage scene={null} dieline={dieline} px={3} showTech showPanels />
                  {dieline.panels.map((p) => (
                    <span key={p.id} className={`badge pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap shadow ${ROLE_COLORS[p.role]}`} style={{ left: `${((p.x + p.w / 2) / dieline.widthMm) * 100}%`, top: `${((p.y + p.h / 2) / dieline.heightMm) * 100}%` }}>
                      {p.role === "glue" ? "Collage" : p.w > 25 || p.role !== "flap" ? ROLE_LABELS[p.role] : ""}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="mb-3 text-sm font-semibold text-ink-700">Pas de fichier sous la main ? Partez d'un gabarit standard</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {TEMPLATES.map((t) => (
                <div key={t.id} className={`card group flex flex-col p-3 text-left transition hover:-translate-y-0.5 hover:shadow-pop ${dieline?.name === t.label ? "ring-2 ring-brand-400" : ""}`}>
                  <button className="text-left" onClick={() => setDieline(analyzeDieline(buildTemplate(t)))}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/mockups/${t.id}.svg`} alt="" className="mb-2 h-20 w-full object-contain" />
                    <span className="block text-sm font-semibold">{t.label}</span>
                    <span className="block text-[11px] text-ink-500">{t.description}</span>
                  </button>
                  <span className="mt-2 flex gap-2 text-[11px] font-semibold text-brand-600">
                    <a href={`/mockups/${t.id}.pdf`} download onClick={(e) => e.stopPropagation()} className="hover:underline">PDF</a>
                    <a href={`/mockups/${t.id}.svg`} download onClick={(e) => e.stopPropagation()} className="hover:underline">SVG</a>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          {dieline ? (
            <>
              <div className="card p-5">
                <h2 className="mb-3 flex items-center gap-2 font-semibold"><IconRuler size={18} className="text-brand-600" /> Détection automatique</h2>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Format à plat" value={`${dieline.widthMm} × ${dieline.heightMm} mm`} />
                  <Stat label="Volume monté" value={`${dieline.box.lengthMm} × ${dieline.box.heightMm} × ${dieline.box.depthMm}`} />
                  <Stat label="Zones imprimables" value={`${dieline.panels.filter((p) => p.role !== "glue").length} panneaux`} />
                  <Stat label="Surface utile" value={`${printableAreaCm2(dieline)} cm²`} />
                  <Stat label="Lignes de pli" value={String(dieline.foldLines.length)} />
                  <Stat label="Découpe" value={`${(cutLengthMm(dieline) / 1000).toFixed(2)} m`} />
                </dl>
                {dieline.warnings.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {dieline.warnings.map((w) => <li key={w} className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"><IconAlert size={14} className="mt-0.5 shrink-0" />{w}</li>)}
                  </ul>
                )}
              </div>
              <div className="card p-5">
                <h2 className="mb-1 flex items-center gap-2 font-semibold"><IconBox size={18} className="text-brand-600" /> Panneaux</h2>
                <p className="mb-3 text-xs text-ink-500">Corrigez l'attribution si besoin : elle sert à la mise en page et au montage 3D.</p>
                <ul className="scrollbar-thin max-h-64 space-y-1.5 overflow-auto pr-1">
                  {dieline.panels.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 text-sm">
                      <span className="w-24 shrink-0 text-xs tabular-nums text-ink-500">{Math.round(p.w)} × {Math.round(p.h)} mm</span>
                      <select className="input !py-1.5 text-xs" value={p.role} onChange={(e) => setRole(p.id, e.target.value as PanelRole)} aria-label={`Rôle du panneau ${p.id}`}>
                        {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
              <button className="btn-primary w-full !py-3" onClick={() => setStep("brief")}>Continuer vers le questionnaire <IconChevronRight size={16} /></button>
            </>
          ) : (
            <div className="card p-5 text-sm text-ink-600">
              <h2 className="mb-3 font-semibold text-ink-900">Ce que nous détectons</h2>
              <ul className="space-y-2.5">
                {["Dimensions exactes du format à plat (mm)", "Contour et traits de découpe", "Lignes de pli et de rainage", "Faces, côtés, rabats et patte de collage", "Volume monté pour l'aperçu 3D"].map((t) => (
                  <li key={t} className="flex gap-2"><IconCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />{t}</li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl bg-ink-50 p-3 text-xs text-ink-500">Astuce : nommez vos calques « Découpe » et « Rainage » ou utilisez des pointillés pour les plis afin d'obtenir une détection parfaite.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 px-3 py-2">
      <dt className="text-[11px] font-medium text-ink-500">{label}</dt>
      <dd className="font-semibold tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}
