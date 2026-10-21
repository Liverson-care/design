"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Brief } from "@/lib/types";
import { analyzeDieline } from "@/lib/dieline/analyze";
import { TEMPLATES, buildTemplate } from "@/lib/dieline/templates";
import { generateDesigns } from "@/lib/generator/generate";
import { DesignImage } from "@/components/canvas/DesignImage";

const BoxPreview = dynamic(() => import("@/components/three/BoxPreview").then((m) => m.BoxPreview), { ssr: false });

const DEMO: Brief = {
  brandName: "Maison Dorée", productName: "Quiche Lorraine", category: "quiche", positioning: "familial", colors: ["#7a2e1d", "#f2c14e"],
  style: "gourmet", audience: "familles", country: "France", inspirations: [], constraints: "", netWeight: "400 g", benefit: "", storage: "surgele", gmsReference: "marie",
};

/** Démonstration en direct sur la page d'accueil : le vrai générateur appliqué à un gabarit standard. */
export function HeroPreview() {
  const dieline = useMemo(() => analyzeDieline(buildTemplate(TEMPLATES[2])), []);
  const designs = useMemo(() => generateDesigns(dieline, DEMO, 5, { seed: "accueil" }), [dieline]);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % designs.length), 5000);
    return () => clearInterval(t);
  }, [designs.length]);
  return (
    <div className="relative">
      <div className="card overflow-hidden p-3 shadow-pop">
        <BoxPreview scene={designs[i]} dieline={dieline} className="aspect-[5/4] w-full" />
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {designs.map((d, j) => (
          <button key={d.id} onClick={() => setI(j)} className={`card overflow-hidden p-1 transition ${i === j ? "ring-2 ring-brand-500" : "opacity-70 hover:opacity-100"}`} aria-label={`Afficher la ${d.name}`}>
            <DesignImage scene={d} dieline={dieline} px={0.9} />
          </button>
        ))}
      </div>
    </div>
  );
}
