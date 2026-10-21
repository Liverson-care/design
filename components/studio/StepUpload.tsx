"use client";
import { useCallback, useRef, useState } from "react";
import type { LabelMode, PackType, PanelRole } from "@/lib/types";
import { useStudio } from "@/lib/store";
import { ACCEPTED, importDielineFile } from "@/lib/dieline/import";
import { analyzeDieline, boxDimensions, cutLengthMm, printableAreaCm2, ROLE_LABELS } from "@/lib/dieline/analyze";
import { TEMPLATES, templateForPackType } from "@/lib/dieline/templates";
import { PACK_TYPES, packTypeDef } from "@/lib/dieline/pack-types";
import { PackIcon } from "./PackIcons";
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

const EXAMPLES: Record<PackType, string[]> = {
  etiquette: ["etiquette-bocal", "etiquette-flacon"],
  etui: ["etui-nuggets", "etui-quiche", "etui-pizza"],
  fourreau: ["fourreau-plat"],
  sachet: ["sachet-cafe"],
  autre: ["etui-glace"],
};

export function StepUpload() {
  const { dieline, setDieline, setStep, packType, labelMode, setPackType } = useStudio();
  const def = packType ? packTypeDef(packType) : null;
  const [dims, setDims] = useState<{ length: number; height: number; depth?: number }>(def?.defaults ?? { length: 160, height: 200, depth: 55 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const onFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      setDieline(await importDielineFile(file, { packType: packType ?? "autre", labelMode }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lecture du fichier impossible.");
    } finally {
      setLoading(false);
    }
  }, [setDieline, packType, labelMode]);

  const chooseType = (t: PackType, mode?: LabelMode) => {
    setPackType(t, mode);
    setDims(packTypeDef(t).defaults);
    // Un tracé déjà importé est réinterprété selon le nouveau type, sans modifier sa géométrie.
    if (dieline) setDieline(analyzeDieline({ name: dieline.name, source: dieline.source, cutPaths: dieline.cutPaths, foldLines: dieline.foldLines, originalPreview: dieline.originalPreview }, { packType: t, labelMode: mode ?? labelMode }));
  };

  const setRole = (id: string, role: PanelRole) => {
    if (!dieline) return;
    const panels = dieline.panels.map((p) => (p.id === id ? { ...p, role } : role !== "flap" && role !== "glue" && p.role === role ? { ...p, role: "flap" as PanelRole } : p));
    setDieline({ ...dieline, panels, box: dieline.packType === "etiquette" ? dieline.box : boxDimensions(panels, dieline.packType) });
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-up">
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand-600">Étape 1</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Votre emballage</h1>
        <p className="mt-1 text-ink-500">Choisissez le type d'emballage, puis importez son tracé de découpe (PDF, Illustrator ou SVG). Dimensions, zones imprimables, plis et découpes sont détectés automatiquement.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section aria-labelledby="type-title">
            <h2 id="type-title" className="mb-3 flex items-center gap-2 text-sm font-bold"><span className="grid h-6 w-6 place-items-center rounded-md bg-brand-600 text-xs text-white">a</span> Type d'emballage</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" role="radiogroup">
              {PACK_TYPES.map((t) => {
                const on = packType === t.key;
                return (
                  <button key={t.key} role="radio" aria-checked={on} onClick={() => chooseType(t.key)} className={`card flex flex-col items-start gap-2 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-pop ${on ? "ring-2 ring-brand-500" : ""}`}>
                    <span className={on ? "text-brand-600" : "text-ink-500"}><PackIcon type={t.key} /></span>
                    <span className="text-sm font-bold">{t.label}</span>
                    <span className="text-[11px] leading-snug text-ink-500">{t.hint}</span>
                    <span className="text-[11px] leading-snug text-ink-400">{t.examples}</span>
                  </button>
                );
              })}
            </div>
            {def?.labelModes && (
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Pose de l'étiquette">
                {def.labelModes.map((m) => (
                  <button key={m.key} role="radio" aria-checked={labelMode === m.key} onClick={() => chooseType("etiquette", m.key)} className={`chip ${labelMode === m.key ? "chip-active" : ""}`} title={m.hint}>
                    <b>{m.label}</b> <span className="text-xs text-ink-500">{m.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="file-title" className={packType ? "" : "pointer-events-none opacity-50"}>
            <h2 id="file-title" className="mb-3 flex items-center gap-2 text-sm font-bold"><span className="grid h-6 w-6 place-items-center rounded-md bg-brand-600 text-xs text-white">b</span> Tracé de découpe {def ? `— ${def.label.toLowerCase()}` : ""}</h2>
            <div
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
              onClick={() => input.current?.click()}
              role="button"
              tabIndex={packType ? 0 : -1}
              aria-disabled={!packType}
              onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
              className={`card flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-9 text-center transition ${over ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:border-brand-300 hover:bg-brand-50/40"}`}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700"><IconUpload size={26} /></span>
              <div>
                <p className="font-semibold">{loading ? "Analyse du tracé…" : packType ? "Glissez votre fichier ici ou cliquez pour parcourir" : "Choisissez d'abord le type d'emballage"}</p>
                <p className="text-sm text-ink-500">PDF · AI · SVG — découpe en trait continu, plis en pointillés ou calques nommés</p>
              </div>
              <input ref={input} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
            </div>
            {error && <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800"><IconAlert size={18} className="mt-0.5 shrink-0" />{error}</p>}

            {def && (
              <details className="card mt-3 p-4">
                <summary className="cursor-pointer text-sm font-semibold">Pas de tracé sous la main ? Créer un gabarit standard aux bonnes dimensions</summary>
                <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setDieline(analyzeDieline(templateForPackType(def.key === "autre" ? "etui" : def.key, dims, labelMode), { packType: def.key === "autre" ? "etui" : def.key, labelMode })); }}>
                  {(def.fields.length ? def.fields : (["length", "height", "depth"] as const)).map((f) => (
                    <label key={f} className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-ink-500">{f === "length" ? (def.key === "etiquette" ? "Longueur (mm)" : "Largeur face (mm)") : f === "height" ? "Hauteur (mm)" : "Profondeur (mm)"}</span>
                      <input type="number" min={10} max={1500} required className="input w-28 !py-1.5" value={dims[f] ?? 50} onChange={(e) => setDims({ ...dims, [f]: +e.target.value })} />
                    </label>
                  ))}
                  <button className="btn-secondary btn-sm">Créer le gabarit</button>
                  <span className="basis-full text-[11px] text-ink-500">
                    Fichiers d'exemple :{" "}
                    {EXAMPLES[def.key].map((id) => (
                      <span key={id} className="mr-2">{TEMPLATES.find((t) => t.id === id)?.label} (<a className="text-brand-700 hover:underline" href={`/mockups/${id}.pdf`} download>PDF</a> · <a className="text-brand-700 hover:underline" href={`/mockups/${id}.svg`} download>SVG</a>)</span>
                    ))}
                  </span>
                </form>
              </details>
            )}
          </section>

          {dieline && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
                <div>
                  <p className="font-semibold">{dieline.name}</p>
                  <p className="text-xs text-ink-500">{packTypeDef(dieline.packType ?? "autre").label}{dieline.labelMode ? ` ${dieline.labelMode}` : ""} · source {dieline.source.toUpperCase()} · tracé verrouillé (jamais modifié par l'IA)</p>
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
                      {p.role === "glue" ? "Collage" : p.virtual && p.role === "right" ? "Infos (lot, EAN, tri)" : p.virtual && p.role === "back" ? "Mentions" : p.w > 25 || p.role !== "flap" ? ROLE_LABELS[p.role] : ""}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        <aside className="space-y-4">
          {dieline ? (
            <>
              <div className="card p-5">
                <h2 className="mb-3 flex items-center gap-2 font-semibold"><IconRuler size={18} className="text-brand-600" /> Détection automatique</h2>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Format à plat" value={`${dieline.widthMm} × ${dieline.heightMm} mm`} />
                  <Stat label={dieline.packType === "etiquette" ? "Contenant estimé" : "Volume monté"} value={dieline.packType === "etiquette" ? `Ø ${dieline.box.lengthMm} × ${dieline.box.heightMm} mm` : `${dieline.box.lengthMm} × ${dieline.box.heightMm} × ${dieline.box.depthMm}`} />
                  <Stat label="Zones imprimables" value={`${dieline.panels.filter((p) => p.role !== "glue").length} ${dieline.panels.some((p) => p.virtual) ? "zones" : "panneaux"}`} />
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
