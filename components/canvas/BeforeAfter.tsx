"use client";
import { useRef, useState } from "react";
import type { DesignScene, Dieline } from "@/lib/types";
import { DesignImage } from "./DesignImage";

/** Comparaison avant / après : gabarit nu à gauche du curseur, design appliqué à droite. */
export function BeforeAfter({ scene, dieline }: { scene: DesignScene; dieline: Dieline }) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const move = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div
      ref={ref}
      className="relative select-none overflow-hidden rounded-xl checker"
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => e.buttons && move(e.clientX)}
    >
      <DesignImage scene={scene} dieline={dieline} px={3} showTech />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <DesignImage scene={null} dieline={dieline} px={3} showTech showPanels className="bg-white" />
      </div>
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -ml-px w-0.5 bg-white shadow" />
        <div className="absolute top-1/2 -ml-5 -mt-5 grid h-10 w-10 place-items-center rounded-full bg-white text-ink-700 shadow-pop">⇆</div>
      </div>
      <span className="badge absolute left-3 top-3 bg-ink-900/80 text-white">Avant · gabarit</span>
      <span className="badge absolute right-3 top-3 bg-brand-600 text-white">Après · design</span>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} className="sr-only" aria-label="Position du comparateur" />
    </div>
  );
}
