"use client";
import { useState } from "react";
import { LIBRARY, LIBRARY_GROUPS, type LibraryItem } from "@/lib/library";
import { fileToDataUrl } from "@/lib/image";
import { IconUpload, IconX } from "@/components/ui/icons";

export function LibraryPicker({ onPick, onClose }: { onPick: (src: string, item?: LibraryItem) => void; onClose: () => void }) {
  const [group, setGroup] = useState<string>("Tous");
  const items = group === "Tous" ? LIBRARY : LIBRARY.filter((i) => i.group === group);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal aria-label="Bibliothèque alimentaire">
      <div className="card flex max-h-[85vh] w-full max-w-3xl flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-ink-100 p-4">
          <h2 className="font-semibold">Bibliothèque alimentaire</h2>
          <label className="btn-secondary btn-sm ml-auto cursor-pointer"><IconUpload size={14} /> Ma photo
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) onPick(await fileToDataUrl(f, 1200)); }} />
          </label>
          <button className="btn-ghost !p-2" onClick={onClose} aria-label="Fermer"><IconX /></button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto border-b border-ink-100 px-4 py-2">
          {["Tous", ...LIBRARY_GROUPS].map((g) => (
            <button key={g} onClick={() => setGroup(g)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${group === g ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}>{g}</button>
          ))}
        </div>
        <div className="scrollbar-thin grid grid-cols-3 gap-3 overflow-auto p-4 sm:grid-cols-5">
          {items.map((it) => (
            <button key={it.id} onClick={() => onPick(it.src, it)} className="group rounded-xl border border-ink-100 p-2 text-left transition hover:border-brand-300 hover:shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.src} alt={it.name} className="checker aspect-square w-full rounded-lg object-contain p-1 transition group-hover:scale-[1.03]" />
              <span className="mt-1.5 block truncate text-xs font-semibold">{it.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
