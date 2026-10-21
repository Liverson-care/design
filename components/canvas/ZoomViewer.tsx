"use client";
import { useEffect, useRef, useState } from "react";
import type { DesignScene, Dieline } from "@/lib/types";
import { DesignImage } from "./DesignImage";
import { IconX } from "@/components/ui/icons";

/** Visionneuse plein écran : molette pour zoomer, glisser pour se déplacer. */
export function ZoomViewer({ scene, dieline, onClose }: { scene: DesignScene; dieline: Dieline; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [tech, setTech] = useState(true);
  const drag = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const z = (f: number) => setZoom((v) => Math.max(0.5, Math.min(8, v * f)));
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-900/95 animate-fade-up" role="dialog" aria-modal aria-label={`Zoom sur ${scene.name}`}>
      <div className="flex items-center gap-2 p-3 text-white">
        <span className="font-semibold">{scene.name}</span>
        <span className="text-sm text-white/60">{dieline.widthMm} × {dieline.heightMm} mm</span>
        <div className="ml-auto flex items-center gap-1.5">
          <label className="mr-2 flex items-center gap-2 text-sm text-white/80"><input type="checkbox" checked={tech} onChange={(e) => setTech(e.target.checked)} /> Tracés techniques</label>
          <button className="btn btn-sm bg-white/10 text-white hover:bg-white/20" onClick={() => z(1 / 1.3)} aria-label="Dézoomer">−</button>
          <span className="w-14 text-center text-sm tabular-nums">{Math.round(zoom * 100)} %</span>
          <button className="btn btn-sm bg-white/10 text-white hover:bg-white/20" onClick={() => z(1.3)} aria-label="Zoomer">+</button>
          <button className="btn btn-sm bg-white/10 text-white hover:bg-white/20" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>Ajuster</button>
          <button className="btn btn-sm bg-white/10 text-white hover:bg-white/20" onClick={onClose} aria-label="Fermer"><IconX size={16} /></button>
        </div>
      </div>
      <div
        className="relative flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
        onWheel={(e) => z(e.deltaY < 0 ? 1.12 : 1 / 1.12)}
        onPointerDown={(e) => { drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => drag.current && setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })}
        onPointerUp={() => (drag.current = null)}
      >
        <div className="absolute left-1/2 top-1/2 w-[min(90vw,140vh)]" style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`, transition: drag.current ? "none" : "transform .12s ease-out" }}>
          <DesignImage scene={scene} dieline={dieline} px={7} showTech={tech} className="rounded shadow-2xl" />
        </div>
      </div>
    </div>
  );
}
