"use client";
import { useState } from "react";
import type { DesignScene, Dieline } from "@/lib/types";
import { useStudio } from "@/lib/store";
import { exportFreeJpeg } from "./exporting";
import { IconDownload, IconLock } from "@/components/ui/icons";

const LOCKED = ["PDF CMJN (impression)", "AI vectoriel (calques)", "PNG HD 300 dpi", "Sans filigrane"];

export function ExportMenu({ scene, dieline, onMockup }: { scene: DesignScene; dieline: Dieline; onMockup?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const brand = useStudio((s) => s.brief.brandName);
  const openPro = useStudio((s) => s.openPro);
  return (
    <div className="relative">
      <button className="btn-primary btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}><IconDownload size={15} /> Télécharger</button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-ink-100 bg-white p-2 shadow-pop animate-fade-up" onMouseLeave={() => setOpen(false)}>
          <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">Gratuit</p>
          <button className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-ink-50" disabled={busy} onClick={async () => { setBusy(true); await exportFreeJpeg(scene, dieline, brand).finally(() => setBusy(false)); setOpen(false); }}>
            <span>Vue à plat · JPEG basse déf.</span><span className="text-[11px] text-ink-400">1200 px</span>
          </button>
          {onMockup && (
            <button className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-ink-50" onClick={() => { onMockup(); setOpen(false); }}>
              <span>Maquette 3D · JPEG</span><span className="text-[11px] text-ink-400">filigrane</span>
            </button>
          )}
          <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">PackAI Pro</p>
          {LOCKED.map((l) => (
            <button key={l} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm text-ink-500 hover:bg-amber-50" onClick={() => { openPro("export"); setOpen(false); }}>
              <span>{l}</span><IconLock size={14} className="text-amber-500" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
