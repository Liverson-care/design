"use client";
import { useState } from "react";
import { useStudio } from "@/lib/store";
import { IconCheck, IconCrown, IconX } from "@/components/ui/icons";
import { PRO_FEATURES } from "@/lib/pro";


const REASONS: Record<string, string> = {
  quota: "Vous avez utilisé vos 5 designs gratuits.",
  export: "Cet export est réservé à PackAI Pro.",
};

export function ProModal() {
  const reason = useStudio((s) => s.proModal);
  const close = () => useStudio.getState().openPro(null);
  const [sent, setSent] = useState(false);
  if (reason === null) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/50 p-4 backdrop-blur-sm animate-fade-up" role="dialog" aria-modal aria-labelledby="pro-title" onClick={close}>
      <div className="card relative w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button className="btn-ghost absolute right-3 top-3 z-10 !p-2" onClick={close} aria-label="Fermer"><IconX /></button>
        <div className="grid md:grid-cols-[1fr_1.1fr]">
          <div className="relative bg-gradient-to-br from-brand-700 via-brand-600 to-fuchsia-600 p-7 text-white">
            <span className="badge bg-white/20 text-white"><IconCrown size={12} /> PackAI Pro</span>
            <h2 id="pro-title" className="mt-4 font-display text-2xl font-extrabold leading-tight">Passez vos emballages en production</h2>
            {REASONS[reason] && <p className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-sm">{REASONS[reason]}</p>}
            <div className="mt-6 flex items-baseline gap-1">
              <span className="font-display text-4xl font-extrabold">49 €</span>
              <span className="text-white/80">HT / mois</span>
            </div>
            <p className="mt-1 text-sm text-white/70">Sans engagement · facturation entreprise</p>
          </div>
          <div className="p-7">
            <ul className="space-y-3.5">
              {PRO_FEATURES.map((f) => (
                <li key={f.title} className="flex gap-3">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700"><IconCheck size={13} /></span>
                  <span><span className="block text-sm font-semibold text-ink-900">{f.title}</span><span className="text-xs text-ink-500">{f.text}</span></span>
                </li>
              ))}
            </ul>
            <button className="btn-primary mt-6 w-full" disabled title="Le paiement n'est pas encore disponible">Passer à Pro — bientôt disponible</button>
            {sent ? (
              <p className="mt-3 text-center text-xs font-medium text-emerald-700">Merci ! Nous vous préviendrons à l'ouverture de l'offre Pro.</p>
            ) : (
              <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                <input required type="email" className="input !py-2 text-xs" placeholder="E-mail professionnel" aria-label="E-mail professionnel" />
                <button className="btn-secondary btn-sm shrink-0">Être prévenu</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
