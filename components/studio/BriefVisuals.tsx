"use client";
import { useState } from "react";
import type { Brief, Charter } from "@/lib/types";
import { FONTS } from "@/lib/generator/styles";
import { analyzeInspirations, fileToDataUrl } from "@/lib/image";
import { IconImage, IconUpload, IconX } from "@/components/ui/icons";

/** Rangée de vignettes avec ajout multiple et suppression */
export function ImageStrip({ images, max, onChange, label, size = 80 }: { images: string[]; max: number; onChange: (imgs: string[]) => void; label: string; size?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((src, i) => (
        <div key={i} className="group relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`${label} ${i + 1}`} className="rounded-xl object-cover" style={{ width: size, height: size }} />
          <button type="button" onClick={() => onChange(images.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink-900 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100" aria-label={`Retirer ${label.toLowerCase()} ${i + 1}`}><IconX size={12} /></button>
        </div>
      ))}
      {images.length < max && (
        <label className="grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink-200 text-ink-400 hover:border-brand-300 hover:text-brand-600" style={{ width: size, height: size }} title={`Ajouter (${images.length}/${max})`}>
          <IconImage />
          <input type="file" accept="image/*" multiple className="hidden" aria-label={`Ajouter : ${label}`} onChange={async (e) => {
            const files = [...(e.target.files ?? [])].slice(0, max - images.length);
            e.target.value = "";
            onChange([...images, ...(await Promise.all(files.map((f) => fileToDataUrl(f, 900))))]);
          }} />
        </label>
      )}
    </div>
  );
}

/** Designs aimés : analyse automatique de la palette et de l'ambiance */
export function InspirationBlock({ brief, updateBrief }: { brief: Brief; updateBrief: (p: Partial<Brief>) => void }) {
  const [busy, setBusy] = useState(false);
  const prof = brief.inspirationProfile;
  const set = async (imgs: string[]) => {
    updateBrief({ inspirations: imgs });
    if (!imgs.length) return updateBrief({ inspirations: imgs, inspirationProfile: undefined });
    setBusy(true);
    const a = await analyzeInspirations(imgs);
    setBusy(false);
    updateBrief({ inspirations: imgs, inspirationProfile: { ...a, useColors: prof?.useColors ?? true } });
  };
  const mood = prof ? `${prof.lightness < 0.35 ? "sombre" : prof.lightness > 0.7 ? "claire" : "contrastée"}, ${prof.saturation > 0.45 ? "couleurs vives" : "couleurs douces"}` : "";
  return (
    <div className="space-y-3">
      <ImageStrip images={brief.inspirations} max={6} onChange={set} label="Design d'inspiration" />
      {busy && <p className="text-xs text-ink-500">Analyse des designs…</p>}
      {prof && !busy && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-50 p-3 text-xs">
          <span className="font-semibold text-ink-700">Palette détectée</span>
          <span className="flex gap-1">{prof.colors.map((c) => <span key={c} className="h-5 w-5 rounded-full border border-black/10" style={{ background: c }} title={c} />)}</span>
          <span className="text-ink-500">Ambiance {mood}</span>
          <label className="ml-auto flex items-center gap-2 font-medium text-ink-700">
            <input type="checkbox" checked={prof.useColors} onChange={(e) => updateBrief({ inspirationProfile: { ...prof, useColors: e.target.checked } })} />
            S'inspirer de ces couleurs et de cette ambiance
          </label>
        </div>
      )}
    </div>
  );
}

const DEFAULT_CHARTER: Charter = { enabled: true, primary: "#0b5fa5", secondary: "#e3eef8", accent: "#f2a900", background: "#ffffff", headingFont: "Montserrat", bodyFont: "Inter", customFonts: [] };

/** Charte graphique imposée : couleurs exactes et polices, y compris fichiers de police importés */
export function CharterBlock({ brief, updateBrief }: { brief: Brief; updateBrief: (p: Partial<Brief>) => void }) {
  const charter = brief.charter ?? { ...DEFAULT_CHARTER, enabled: false };
  const [fontMsg, setFontMsg] = useState<string | null>(null);
  const set = (p: Partial<Charter>) => updateBrief({ charter: { ...charter, ...p } });
  const fontNames = [...charter.customFonts.map((f) => f.family), ...Object.keys(FONTS)];
  const colorField = (key: "primary" | "secondary" | "accent" | "background", label: string) => (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-ink-500">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-ink-200 px-2 py-1.5">
        <input type="color" value={charter[key]} onChange={(e) => set({ [key]: e.target.value })} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={label} />
        <input value={charter[key]} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && set({ [key]: e.target.value })} className="w-20 bg-transparent font-mono text-xs uppercase outline-none" aria-label={`${label} (hexadécimal)`} />
      </span>
    </label>
  );
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={charter.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="h-4 w-4" />
        <span className="text-sm font-semibold">Respecter ma charte graphique</span>
        <span className="text-xs text-ink-500">Couleurs et polices imposées sur les 5 propositions ; seuls la mise en page, la photo et les motifs varient.</span>
      </label>
      {charter.enabled && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {colorField("primary", "Couleur principale")}
            {colorField("secondary", "Couleur secondaire")}
            {colorField("accent", "Couleur d'accent")}
            {colorField("background", "Fond")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["headingFont", "bodyFont"] as const).map((k) => (
              <label key={k} className="block">
                <span className="mb-1 block text-[11px] font-semibold text-ink-500">{k === "headingFont" ? "Police des titres" : "Police des textes"}</span>
                <select className="input" value={charter[k]} onChange={(e) => set({ [k]: e.target.value })} style={{ fontFamily: `"${charter[k]}"` }}>
                  {fontNames.map((f) => <option key={f} value={f}>{f}{charter.customFonts.some((c) => c.family === f) ? " (importée)" : ""}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-secondary btn-sm cursor-pointer"><IconUpload size={14} /> Importer une police (TTF, OTF, WOFF)
              <input type="file" accept=".ttf,.otf,.woff,.woff2,font/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (f.size > 3_000_000) return setFontMsg("Fichier trop lourd (3 Mo maximum).");
                const src = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); });
                const family = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
                try {
                  const face = new FontFace(family, `url(${src})`);
                  await face.load();
                  document.fonts.add(face);
                } catch {
                  return setFontMsg("Police illisible : essayez un fichier TTF, OTF ou WOFF.");
                }
                set({ customFonts: [...charter.customFonts.filter((c) => c.family !== family), { family, src }], headingFont: family });
                setFontMsg(`« ${family} » importée et appliquée aux titres. Vérifiez que votre licence autorise son usage sur emballage.`);
              }} />
            </label>
            {charter.customFonts.map((c) => (
              <span key={c.family} className="badge bg-ink-100 text-ink-700" style={{ fontFamily: `"${c.family}"` }}>
                {c.family}
                <button type="button" aria-label={`Retirer ${c.family}`} onClick={() => set({ customFonts: charter.customFonts.filter((x) => x.family !== c.family), headingFont: charter.headingFont === c.family ? "Montserrat" : charter.headingFont, bodyFont: charter.bodyFont === c.family ? "Inter" : charter.bodyFont })}><IconX size={11} /></button>
              </span>
            ))}
          </div>
          {fontMsg && <p className="text-xs text-ink-500">{fontMsg}</p>}
          <div className="rounded-xl border border-ink-100 p-3">
            <p className="mb-2 text-[11px] font-semibold text-ink-500">Aperçu de la charte</p>
            <div className="flex items-center gap-4 rounded-lg p-3" style={{ background: charter.background }}>
              <span className="rounded-lg px-3 py-2 text-lg font-bold" style={{ background: charter.primary, color: "#fff", fontFamily: `"${charter.headingFont}"` }}>{brief.brandName || "Votre marque"}</span>
              <span className="text-xl font-bold" style={{ color: charter.primary, fontFamily: `"${charter.headingFont}"` }}>{brief.productName || "Nom du produit"}</span>
              <span className="ml-auto rounded-full px-3 py-1 text-xs font-bold" style={{ background: charter.accent, color: "#111", fontFamily: `"${charter.bodyFont}"` }}>Bénéfice</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
