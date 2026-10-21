"use client";
import { AppShell } from "@/components/AppShell";
import { PRO_FEATURES } from "@/lib/pro";
import { useStudio } from "@/lib/store";
import { IconCheck, IconCrown, IconLock } from "@/components/ui/icons";

const COMPARE: [string, string, string][] = [
  ["Designs générés", "5", "Illimités"],
  ["Vue à plat, 3D, zoom, avant/après", "✓", "✓"],
  ["Éditeur & bibliothèque alimentaire", "✓", "✓"],
  ["Mode GMS France", "✓", "✓"],
  ["Gamme complète", "✓", "✓"],
  ["Export JPEG basse résolution", "✓", "✓"],
  ["Filigrane", "Léger", "Aucun"],
  ["PNG HD 300 dpi", "—", "✓"],
  ["PDF CMJN avec fonds perdus", "—", "✓"],
  ["AI vectoriel (calques)", "—", "✓"],
  ["Projets", "1 en cours", "Illimités"],
];

export default function ProPage() {
  const openPro = useStudio((s) => s.openPro);
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl p-5 md:p-10 animate-fade-up">
        <div className="rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-fuchsia-600 p-8 text-white md:p-12">
          <span className="badge bg-white/20 text-white"><IconCrown size={12} /> PackAI Pro</span>
          <h1 className="mt-4 max-w-2xl font-display text-3xl font-extrabold leading-tight md:text-5xl">Des fichiers prêts pour l'imprimeur et vos acheteurs GMS</h1>
          <p className="mt-3 max-w-xl text-white/80">Interface de démonstration : le paiement n'est pas encore activé.</p>
          <button className="btn mt-6 bg-white text-brand-700 hover:bg-white/90" onClick={() => openPro(null)}>Être prévenu du lancement</button>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PRO_FEATURES.map((f) => (
            <div key={f.title} className="card p-4">
              <IconLock size={18} className="text-amber-500" />
              <p className="mt-2 text-sm font-bold">{f.title}</p>
              <p className="mt-1 text-xs text-ink-500">{f.text}</p>
            </div>
          ))}
        </div>
        <div className="card mt-8 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="p-4">Fonctionnalité</th><th className="p-4">Gratuit</th><th className="p-4 text-brand-700">Pro</th></tr>
            </thead>
            <tbody>
              {COMPARE.map(([f, a, b]) => (
                <tr key={f} className="border-t border-ink-100">
                  <td className="p-4 font-medium">{f}</td>
                  <td className="p-4 text-ink-600">{a}</td>
                  <td className="p-4 font-semibold text-brand-700">{b === "✓" ? <IconCheck size={16} /> : b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
