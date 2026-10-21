"use client";
import { useState } from "react";
import type { DesignScene } from "@/lib/types";
import { useStudio } from "@/lib/store";
import { suggestRangeNames } from "@/lib/generator/range";
import type { GmsReport } from "@/lib/gms/check";
import { DesignImage } from "@/components/canvas/DesignImage";
import { BoxPreview } from "@/components/three/BoxPreview";
import { CheckList, ScoreRing } from "./GmsPanel";
import { exportFreeJpeg } from "./exporting";
import { IconBox, IconDownload, IconGrid, IconPlus, IconSparkles, IconX } from "@/components/ui/icons";

export function RangeBuilder() {
  const { designs, validatedId, dieline, brief, range, setRange, setStep, select } = useStudio();
  const base = designs.find((d) => d.id === validatedId);
  const [names, setNames] = useState<string[]>(() => suggestRangeNames(brief));
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, GmsReport>>({});
  const [view3d, setView3d] = useState(false);

  if (!dieline) return null;
  if (!base) {
    return (
      <div className="mx-auto max-w-xl card p-8 text-center animate-fade-up">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700"><IconGrid size={26} /></span>
        <h1 className="mt-4 font-display text-xl font-extrabold">Validez d'abord un design</h1>
        <p className="mt-2 text-sm text-ink-500">La gamme complète reprend l'identité visuelle d'un design validé : grille, typographies, logo et couleur de marque.</p>
        <button className="btn-primary mt-5" onClick={() => setStep("results")}>Voir les propositions</button>
      </div>
    );
  }

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/range", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base: { ...base, variantLabel: brief.productName }, names, dieline, brief }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRange({ baseId: base.id, scenes: json.range as DesignScene[], consistency: json.consistency });
      setReports(json.reports);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  };

  const addToProject = (s: DesignScene) => {
    const st = useStudio.getState();
    if (!st.designs.some((d) => d.id === s.id)) {
      useStudio.setState({ designs: [...st.designs, s], reports: { ...st.reports, ...(reports[s.id] ? { [s.id]: reports[s.id] } : {}) } });
    }
    select(s.id);
    setStep("editor");
  };

  return (
    <div className="mx-auto max-w-[1400px] animate-fade-up">
      <header className="mb-5">
        <p className="text-sm font-semibold text-brand-600">Étape 6 · Bonus</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Créer une gamme complète</h1>
        <p className="mt-1 text-ink-500">Même identité visuelle, un code couleur et une garniture par variante. Idéal pour former un bloc marque en rayon.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <div className="card p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Design de référence</p>
            <div className="checker rounded-xl p-2"><DesignImage scene={base} dieline={dieline} px={1.5} /></div>
            <p className="mt-2 text-sm font-semibold">{brief.productName} · {base.name}</p>
          </div>
          <div className="card p-4">
            <p className="mb-2 text-sm font-semibold">Déclinaisons</p>
            <ul className="space-y-1.5">
              {names.map((n, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input className="input !py-1.5 text-sm" value={n} onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} aria-label={`Déclinaison ${i + 1}`} />
                  <button className="btn-ghost !p-1.5" onClick={() => setNames(names.filter((_, j) => j !== i))} aria-label="Retirer"><IconX size={14} /></button>
                </li>
              ))}
            </ul>
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim() && names.length < 8) { setNames([...names, draft.trim()]); setDraft(""); } }}>
              <input className="input !py-1.5 text-sm" placeholder="ex. Quiche Chèvre Miel" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Nouvelle déclinaison" />
              <button className="btn-secondary btn-sm shrink-0" disabled={names.length >= 8}><IconPlus size={14} /></button>
            </form>
            <button className="btn-primary mt-4 w-full" disabled={busy || !names.filter((n) => n.trim()).length} onClick={generate}>
              <IconSparkles size={16} /> {busy ? "Déclinaison en cours…" : `Générer ${names.filter((n) => n.trim()).length} déclinaisons`}
            </button>
            {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
          </div>
          {range?.baseId === base.id && (
            <div className="card p-4">
              <p className="mb-2 text-sm font-bold">Cohérence de gamme</p>
              <CheckList items={range.consistency} />
            </div>
          )}
        </aside>

        <section>
          {range?.baseId === base.id ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-ink-500">{range.scenes.length} références</p>
                <button className="btn-secondary btn-sm" onClick={() => setView3d((v) => !v)}><IconBox size={14} /> {view3d ? "Vue à plat" : "Vue 3D (face)"}</button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {range.scenes.map((s) => (
                  <div key={s.id} className="card overflow-hidden">
                    {view3d ? <BoxPreview scene={s} dieline={dieline} autoRotate={false} className="aspect-square" /> : <div className="checker p-2"><DesignImage scene={s} dieline={dieline} px={1.6} /></div>}
                    <div className="flex items-center gap-2 p-3">
                      <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: s.palette.accent }} />
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold">{s.variantLabel}</p>
                      {reports[s.id] && <ScoreRing score={reports[s.id].score} size={34} />}
                      <button className="btn-ghost !p-1.5" onClick={() => exportFreeJpeg(s, dieline, brief.brandName)} title="Télécharger (JPEG basse déf.)"><IconDownload size={15} /></button>
                      <button className="btn-secondary btn-sm" onClick={() => addToProject(s)}>Éditer</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="card grid min-h-[360px] place-items-center p-8 text-center text-ink-500">
              <div>
                <IconGrid size={40} className="mx-auto text-ink-300" />
                <p className="mt-3 text-sm">Ajustez la liste des déclinaisons puis lancez la génération.</p>
                <p className="mt-1 text-xs text-ink-400">Les déclinaisons de gamme ne consomment pas vos designs gratuits.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
