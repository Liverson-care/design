"use client";
import { useRef, useState } from "react";
import { useStudio } from "@/lib/store";
import { LAYOUT_LABELS, type LayoutKey } from "@/lib/generator/generate";
import { styleDef } from "@/lib/generator/styles";
import { DesignImage } from "@/components/canvas/DesignImage";
import { BeforeAfter } from "@/components/canvas/BeforeAfter";
import { ZoomViewer } from "@/components/canvas/ZoomViewer";
import { BoxPreview, type BoxPreviewHandle } from "@/components/three/BoxPreview";
import { GmsPanel, ScoreRing } from "./GmsPanel";
import { ExportMenu } from "./ExportMenu";
import { exportMockup } from "./exporting";
import { IconBox, IconCheck, IconCompare, IconEdit, IconGrid, IconLayers, IconSparkles, IconZoom } from "@/components/ui/icons";

type View = "flat" | "3d" | "compare";

export function StepResults({ onGenerate }: { onGenerate: () => void }) {
  const { designs, reports, selectedId, select, dieline, setStep, validatedId, validate, usage, brief } = useStudio();
  const [view, setView] = useState<View>("3d");
  const [zoom, setZoom] = useState(false);
  const [highlight, setHighlight] = useState<string[]>([]);
  const box = useRef<BoxPreviewHandle>(null);
  const current = designs.find((d) => d.id === selectedId) ?? designs[0];
  const remaining = usage.plan === "PRO" ? 5 : usage.limit - usage.used;
  if (!dieline || !current) return null;

  return (
    <div className="mx-auto max-w-[1400px] animate-fade-up">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-600">Étape 3</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">{designs.length} propositions pour « {brief.productName} »</h1>
          <p className="mt-1 text-ink-500">Palette, typographie, disposition, photo et éléments graphiques varient. Le gabarit reste strictement identique.</p>
        </div>
        <button className="btn-secondary" onClick={onGenerate} disabled={remaining <= 0} title={remaining <= 0 ? "Quota gratuit atteint" : undefined}>
          <IconSparkles size={16} /> Nouvelles propositions {remaining > 0 && <span className="text-ink-400">({Math.min(5, remaining)})</span>}
        </button>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {designs.map((d) => {
          const active = d.id === current.id;
          return (
            <button key={d.id} onClick={() => { select(d.id); setHighlight([]); }} className={`card group overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-pop ${active ? "ring-2 ring-brand-500" : ""}`} aria-pressed={active}>
              <div className="checker relative p-2">
                <DesignImage scene={d} dieline={dieline} px={1.6} />
                {validatedId === d.id && <span className="badge absolute left-2 top-2 bg-emerald-600 text-white"><IconCheck size={11} /> Validé</span>}
                {d.usedAi && <span className="badge absolute right-2 top-2 bg-brand-600 text-white">Photo IA</span>}
              </div>
              <div className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{d.name}</p>
                  <p className="truncate text-[11px] text-ink-500">{styleDef(d.style).label} · {LAYOUT_LABELS[d.layout as LayoutKey] ?? d.layout}</p>
                  <div className="mt-1.5 flex gap-1">
                    {[d.palette.primary, d.palette.accent, d.palette.background, d.palette.surface].map((c, i) => <span key={i} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ background: c }} />)}
                  </div>
                </div>
                {reports[d.id] && <ScoreRing score={reports[d.id].score} size={38} />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 px-4 py-3">
            <div className="flex rounded-xl bg-ink-100 p-1" role="tablist">
              {([["3d", "Boîte 3D", IconBox], ["flat", "Vue à plat", IconGrid], ["compare", "Avant / après", IconCompare]] as const).map(([k, label, Icon]) => (
                <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${view === k ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"}`}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button className="btn-secondary btn-sm" onClick={() => setZoom(true)}><IconZoom size={15} /> Zoom</button>
              <button className="btn-secondary btn-sm" onClick={() => setStep("editor")}><IconEdit size={15} /> Modifier</button>
              <button className={`btn-sm btn ${validatedId === current.id ? "bg-emerald-600 text-white" : "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`} onClick={() => validate(current.id)}>
                <IconCheck size={15} /> {validatedId === current.id ? "Design validé" : "Valider ce design"}
              </button>
              <ExportMenu scene={current} dieline={dieline} onMockup={view === "3d" ? () => exportMockup(box.current?.snapshot() ?? null, current, brief.brandName) : undefined} />
            </div>
          </div>
          <div className="p-4">
            {view === "3d" && <BoxPreview ref={box} scene={current} dieline={dieline} className="aspect-[4/3] w-full" />}
            {view === "flat" && <div className="checker rounded-xl p-4"><DesignImage scene={current} dieline={dieline} px={3.5} showTech highlight={highlight} /></div>}
            {view === "compare" && <BeforeAfter scene={current} dieline={dieline} />}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink-100 px-4 py-3 text-xs text-ink-500">
            <span><b className="text-ink-800">Typographies :</b> <span style={{ fontFamily: `"${current.fonts.heading}"` }}>{current.fonts.heading}</span> / {current.fonts.body}</span>
            <span><b className="text-ink-800">Disposition :</b> {LAYOUT_LABELS[current.layout as LayoutKey] ?? current.layout}</span>
            <span className="flex items-center gap-1"><IconLayers size={14} /> {current.elements.length} éléments · découpes & plis verrouillés</span>
            {validatedId === current.id && (
              <span className="ml-auto flex gap-2">
                <button className="btn-primary btn-sm" onClick={() => setStep("rendu")}><IconBox size={14} /> Créer l'emballage réel</button>
                <button className="btn-secondary btn-sm" onClick={() => setStep("range")}><IconGrid size={14} /> Créer une gamme complète</button>
              </span>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <GmsPanel report={reports[current.id]} onFocus={(ids) => { setHighlight(ids); setView("flat"); }} />
          {!validatedId && (
            <div className="card bg-gradient-to-br from-brand-50 to-white p-4 text-sm">
              <p className="font-semibold">Bonus : gamme complète</p>
              <p className="mt-1 text-ink-600">Validez un design pour le décliner automatiquement en gamme (ex. Quiche Saumon, Épinards, Fromage, Thon) avec la même identité.</p>
            </div>
          )}
        </div>
      </div>
      {zoom && <ZoomViewer scene={current} dieline={dieline} onClose={() => setZoom(false)} />}
    </div>
  );
}
