"use client";
import { useEffect, useState } from "react";
import { IconCheck, IconSparkles } from "@/components/ui/icons";

const PHASES = [
  "Lecture du gabarit verrouillé",
  "Composition des palettes et typographies",
  "Préparation des photos produit",
  "Application sur les faces et les côtés",
  "Contrôle Mode GMS France",
];

export function Generating({ count, ai }: { count: number; ai: boolean }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => Math.min(PHASES.length - 1, p + 1)), ai ? 3500 : 450);
    return () => clearInterval(t);
  }, [ai]);
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-white/80 p-4 backdrop-blur-md animate-fade-up" role="status" aria-live="polite">
      <div className="card w-full max-w-md p-7 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-pop">
          <IconSparkles size={30} className="animate-pulse" />
        </div>
        <h2 className="mt-4 font-display text-xl font-extrabold">Création de {count} design{count > 1 ? "s" : ""}…</h2>
        <p className="mt-1 text-sm text-ink-500">{ai ? "Les photos sont générées par l'IA : comptez 20 à 60 secondes." : "Quelques secondes suffisent."}</p>
        <ul className="mt-5 space-y-2 text-left">
          {PHASES.map((p, i) => (
            <li key={p} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${i === phase ? "bg-brand-50 font-semibold text-brand-800" : i < phase ? "text-ink-500" : "text-ink-300"}`}>
              <span className={`grid h-5 w-5 place-items-center rounded-full ${i < phase ? "bg-emerald-500 text-white" : i === phase ? "border-2 border-brand-500 border-t-transparent animate-spin" : "border border-ink-200"}`}>{i < phase && <IconCheck size={12} />}</span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
