"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { STEPS, useStudio, type Step } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { StepUpload } from "./StepUpload";
import { StepBrief } from "./StepBrief";
import { StepResults } from "./StepResults";
import { Editor } from "./Editor";
import { RangeBuilder } from "./RangeBuilder";
import { FinalRender } from "./FinalRender";
import { Generating } from "./Generating";
import { IconCheck, IconPlus, IconSave } from "@/components/ui/icons";

export function Studio() {
  const s = useStudio();
  const { data: session } = useSession();
  const [generating, setGenerating] = useState<{ count: number; ai: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const available = (k: Step) => {
    if (k === "upload") return true;
    if (k === "brief") return !!s.dieline;
    if (k === "results" || k === "editor") return s.designs.length > 0;
    return !!s.validatedId;
  };
  const done = (k: Step) => (k === "upload" ? !!s.dieline : k === "brief" ? s.designs.length > 0 : k === "results" ? !!s.validatedId : k === "range" ? !!s.range : false);


  const generate = async () => {
    const { dieline, brief, usage } = useStudio.getState();
    if (!dieline) return;
    const remaining = usage.plan === "PRO" ? 5 : usage.limit - usage.used;
    if (remaining <= 0) return s.openPro("quota");
    setError(null);
    const ai = await fetch("/api/usage").then((r) => r.json()).then((j) => !!j.ai).catch(() => false);
    setGenerating({ count: Math.min(5, remaining), ai });
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dieline: { ...dieline, originalPreview: undefined }, brief, count: Math.min(5, remaining) }) });
      const json = await res.json();
      if (json.usage) s.setUsage(json.usage);
      if (res.status === 402) { s.openPro("quota"); return; }
      if (!res.ok) throw new Error(json.error ?? "La génération a échoué.");
      s.setDesigns(json.designs, json.reports);
      s.setStep("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "La génération a échoué.");
    } finally {
      setGenerating(null);
    }
  };

  const save = async () => {
    const st = useStudio.getState();
    if (!st.dieline) return;
    setSaveMsg("Enregistrement…");
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: st.projectId, name: st.brief.productName, dieline: { ...st.dieline, originalPreview: undefined }, brief: st.brief, designs: st.designs }) });
    const json = await res.json().catch(() => ({}));
    if (res.ok) { useStudio.setState({ projectId: json.id }); setSaveMsg("Projet enregistré"); }
    else setSaveMsg(json.error ?? "Enregistrement impossible");
    setTimeout(() => setSaveMsg(null), 3500);
  };

  const toolbar = (
    <div className="flex items-center gap-3">
      <span className="truncate text-sm font-semibold text-ink-800">{s.brief.productName || s.dieline?.name || "Nouveau projet"}</span>
      {s.dieline && <span className="badge bg-ink-100 text-ink-600">{s.dieline.widthMm} × {s.dieline.heightMm} mm</span>}
      <div className="ml-auto flex items-center gap-2 pr-2">
        {saveMsg && <span className="text-xs text-ink-500">{saveMsg}</span>}
        {s.dieline && <button className="btn-ghost btn-sm" onClick={save} title={session ? "Enregistrer dans mes projets" : "Connectez-vous pour enregistrer en ligne"}><IconSave size={15} /> Enregistrer</button>}
        <button className="btn-ghost btn-sm" onClick={() => { if (confirm("Démarrer un nouveau projet ? Le projet en cours reste dans ce navigateur jusqu'à remplacement.")) s.reset(); }}><IconPlus size={15} /> Nouveau</button>
      </div>
    </div>
  );

  if (!s.hydrated) return <AppShell toolbar={toolbar}><div className="p-8"><div className="skeleton h-96 w-full" /></div></AppShell>;

  return (
    <AppShell toolbar={toolbar}>
      <div className="flex">
        {s.step !== "editor" && (
          <nav className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-ink-100 bg-white p-4 md:block" aria-label="Étapes">
            <ol className="space-y-1">
              {STEPS.map((st, i) => {
                const active = s.step === st.key;
                const ok = available(st.key);
                return (
                  <li key={st.key}>
                    <button disabled={!ok} onClick={() => s.setStep(st.key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${active ? "bg-brand-50" : "hover:bg-ink-50"}`} aria-current={active ? "step" : undefined}>
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold transition ${done(st.key) && !active ? "bg-emerald-500 text-white" : active ? "bg-brand-600 text-white shadow-pop" : "bg-ink-100 text-ink-500"}`}>
                        {done(st.key) && !active ? <IconCheck size={16} /> : i + 1}
                      </span>
                      <span>
                        <span className={`block text-sm font-semibold ${active ? "text-brand-800" : "text-ink-800"}`}>{st.label}</span>
                        <span className="block text-[11px] text-ink-500">{st.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-6 rounded-xl border border-dashed border-ink-200 p-3 text-[11px] leading-relaxed text-ink-500">
              Les découpes, plis et dimensions de votre gabarit ne sont <b>jamais</b> modifiés : l'IA ne travaille que dans les zones imprimables.
            </div>
          </nav>
        )}
        <div className={`min-w-0 flex-1 ${s.step === "editor" ? "" : "p-4 md:p-8"}`}>
          {s.step !== "editor" && (
            <div className="mb-4 flex gap-1.5 overflow-x-auto md:hidden">
              {STEPS.map((st, i) => (
                <button key={st.key} disabled={!available(st.key)} onClick={() => s.setStep(st.key)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${s.step === st.key ? "bg-brand-600 text-white" : "bg-white text-ink-600"}`}>{i + 1}. {st.label}</button>
              ))}
            </div>
          )}
          {error && <p className="mx-auto mb-4 max-w-4xl rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
          {s.step === "upload" && <StepUpload />}
          {s.step === "brief" && <StepBrief onGenerate={generate} />}
          {s.step === "results" && <StepResults onGenerate={generate} />}
          {s.step === "editor" && <Editor />}
          {s.step === "rendu" && <FinalRender />}
          {s.step === "range" && <RangeBuilder />}
        </div>
      </div>
      {generating && <Generating {...generating} />}
    </AppShell>
  );
}
