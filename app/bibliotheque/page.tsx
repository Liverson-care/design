"use client";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LIBRARY, LIBRARY_GROUPS } from "@/lib/library";
import { IconSparkles } from "@/components/ui/icons";

export default function LibraryPage() {
  const [group, setGroup] = useState("Tous");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const items = group === "Tous" ? LIBRARY : LIBRARY.filter((i) => i.group === group);

  const aiPhoto = async (id: string) => {
    setBusy(id);
    setMsg(null);
    const res = await fetch("/api/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const json = await res.json().catch(() => ({}));
    if (res.ok) setPhotos((p) => ({ ...p, [id]: json.src }));
    else setMsg(json.error ?? "Génération impossible.");
    setBusy(null);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl p-5 md:p-8 animate-fade-up">
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Bibliothèque alimentaire</h1>
        <p className="mt-1 text-ink-500">Éléments détourés utilisables dans l'éditeur. Avec une clé OpenAI, chaque élément peut être régénéré en photographie culinaire photoréaliste.</p>
        {msg && <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900">{msg}</p>}
        <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
          {["Tous", ...LIBRARY_GROUPS].map((g) => (
            <button key={g} onClick={() => setGroup(g)} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${group === g ? "bg-brand-600 text-white" : "bg-white text-ink-600 hover:bg-ink-100"}`}>{g}</button>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((it) => (
            <div key={it.id} className="card group overflow-hidden">
              <div className="checker relative aspect-square p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photos[it.id] ?? it.src} alt={it.name} className="h-full w-full object-contain transition duration-300 group-hover:scale-105" />
                {photos[it.id] && <span className="badge absolute left-2 top-2 bg-brand-600 text-white">Photo IA</span>}
              </div>
              <div className="flex items-center gap-2 p-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: it.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{it.name}</p>
                  <p className="text-[11px] text-ink-500">{it.group}</p>
                </div>
                <button className="btn-ghost !p-1.5" title="Version photo IA" disabled={busy === it.id} onClick={() => aiPhoto(it.id)}><IconSparkles size={15} className={busy === it.id ? "animate-spin" : ""} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
