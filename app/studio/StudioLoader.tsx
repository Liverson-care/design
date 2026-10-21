"use client";
import dynamic from "next/dynamic";

// Konva, PDF.js et Three.js sont des bibliothèques navigateur : pas de rendu serveur pour le studio.
const Studio = dynamic(() => import("@/components/studio/Studio").then((m) => m.Studio), {
  ssr: false,
  loading: () => <div className="grid min-h-screen place-items-center text-sm text-ink-400">Chargement du studio…</div>,
});

export function StudioLoader() {
  return <Studio />;
}
