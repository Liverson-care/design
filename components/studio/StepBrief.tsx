"use client";
import { useState, type ReactNode } from "react";
import type { Audience, Positioning } from "@/lib/types";
import { useStudio } from "@/lib/store";
import { STYLES } from "@/lib/generator/styles";
import { GMS_REFERENCES } from "@/lib/gms/references";
import { SECTORS, categoryDef, sectorDef, type Sector } from "@/lib/sectors";
import { dominantColors, fileToDataUrl, preparePackshot } from "@/lib/image";
import { CharterBlock, ImageStrip, InspirationBlock } from "./BriefVisuals";
import { IconCheck, IconImage, IconSparkles, IconStore, IconX } from "@/components/ui/icons";

const POSITIONINGS: { key: Positioning; label: string }[] = [
  { key: "premium", label: "Premium" },
  { key: "familial", label: "Familial" },
  { key: "discount", label: "Discount / 1er prix" },
  { key: "bio", label: "Bio & naturel" },
  { key: "terroir", label: "Terroir" },
  { key: "sante", label: "Santé / nutrition" },
];

const AUDIENCES: { key: Audience; label: string }[] = [
  { key: "familles", label: "Familles" },
  { key: "enfants", label: "Enfants" },
  { key: "jeunes-actifs", label: "Jeunes actifs" },
  { key: "seniors", label: "Seniors" },
  { key: "sportifs", label: "Sportifs" },
  { key: "gourmets", label: "Gourmets" },
];

const COUNTRIES = ["France", "Belgique", "Suisse", "Luxembourg", "Canada (Québec)", "Allemagne", "Espagne", "Italie", "Royaume-Uni", "Maroc"];

const SWATCHES = ["#c8102e", "#e85d04", "#f2b705", "#3c9d3c", "#00843d", "#0b5fa5", "#0057b8", "#5a2ef5", "#e85d9e", "#7a2e1d", "#14213d", "#1f1f1f", "#c9a227", "#f6f3ee", "#ffffff"];

export function StepBrief({ onGenerate }: { onGenerate: () => void }) {
  const { brief, updateBrief, usage } = useStudio();
  const [suggested, setSuggested] = useState<string[]>([]);
  const [shotBusy, setShotBusy] = useState(false);
  const [shotInfo, setShotInfo] = useState<string | null>(null);
  const [cutout, setCutout] = useState(true);
  const sector = sectorDef(brief.sector);
  const onPackshot = async (f: File, remove = cutout) => {
    setShotBusy(true);
    try {
      const shot = await preparePackshot(f, remove);
      updateBrief({ packshot: shot.src, packshotAspect: shot.aspect, packshotColors: shot.colors });
      setSuggested((s) => [...new Set([...shot.colors, ...s])].slice(0, 6));
      setShotInfo(shot.removedBackground ? "Fond détouré automatiquement." : remove ? "Fond conservé (non uni ou déjà transparent)." : "Fond conservé.");
    } finally {
      setShotBusy(false);
    }
  };
  const remaining = usage.plan === "PRO" ? 5 : Math.max(0, usage.limit - usage.used);
  const valid = brief.brandName.trim() && brief.productName.trim();

  const toggleColor = (c: string) => {
    const has = brief.colors.includes(c);
    updateBrief({ colors: has ? brief.colors.filter((x) => x !== c) : [...brief.colors, c].slice(-3) });
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <header className="mb-6">
        <p className="text-sm font-semibold text-brand-600">Étape 2</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Parlez-nous de votre produit</h1>
        <p className="mt-1 text-ink-500">Une dizaine de questions pour orienter l'IA : alimentaire, épicerie, boissons, cosmétique, hygiène, médicament, compléments, animalerie ou entretien. Les textes sont composés en vectoriel : jamais de lettres déformées.</p>
      </header>

      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) onGenerate(); }}>
        <Q n={1} title="Nom de la marque" hint="Texte ou logo (PNG, SVG, JPEG)">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input className="input" placeholder="ex. Maison Dorée" value={brief.brandName} onChange={(e) => updateBrief({ brandName: e.target.value })} required aria-label="Nom de la marque" />
            <label className="btn-secondary shrink-0 cursor-pointer">
              <IconImage size={16} /> {brief.brandLogo ? "Changer le logo" : "Importer le logo"}
              <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (f.type === "image/svg+xml") {
                  const src = await fileToDataUrl(f);
                  const ar = await new Promise<number>((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth && im.naturalHeight ? im.naturalWidth / im.naturalHeight : 2); im.onerror = () => res(2); im.src = src; });
                  updateBrief({ brandLogo: src, brandLogoAspect: ar, logoMode: brief.logoMode ?? "obligatoire" });
                } else {
                  // Fond blanc uni retiré, recadrage au plus près : le logo garde ses proportions exactes
                  const logo = await preparePackshot(f, true);
                  updateBrief({ brandLogo: logo.src, brandLogoAspect: logo.aspect, logoMode: brief.logoMode ?? "obligatoire" });
                }
              }} />
            </label>
          </div>
          {brief.brandLogo && (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={brief.brandLogo} alt="Logo importé" className="checker h-16 w-32 rounded-lg object-contain p-1" />
                <button type="button" className="btn-ghost btn-sm" onClick={() => updateBrief({ brandLogo: undefined, brandLogoAspect: undefined, logoMode: undefined })}><IconX size={14} /> Retirer</button>
              </div>
              <div className="grid flex-1 gap-2" role="radiogroup" aria-label="Utilisation du logo">
                {([
                  ["obligatoire", "Logo obligatoire", "Utilisé tel quel sur toutes les propositions et toutes les faces, proportions d'origine, jamais redessiné."],
                  ["libre", "Logo facultatif", "L'IA alterne votre logo et un logotype typographique à partir du nom de la marque."],
                ] as const).map(([k, label, hint]) => {
                  const on = (brief.logoMode ?? "obligatoire") === k;
                  return (
                    <button type="button" role="radio" aria-checked={on} key={k} onClick={() => updateBrief({ logoMode: k })} className={`rounded-xl border p-3 text-left text-sm transition ${on ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-ink-200 hover:border-brand-300"}`}>
                      <b>{label}</b><span className="block text-xs text-ink-500">{hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Q>

        <Q n={2} title="Nom du produit">
          <input className="input" placeholder="ex. Quiche Lorraine" value={brief.productName} onChange={(e) => updateBrief({ productName: e.target.value })} required aria-label="Nom du produit" />
        </Q>

        <Q n={3} title="Secteur et catégorie" hint="Les mentions obligatoires s'adaptent au secteur">
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="input" value={brief.sector} aria-label="Secteur" onChange={(e) => {
              const sec = sectorDef(e.target.value as Sector);
              updateBrief({ sector: sec.key, category: sec.categories[0].key, storage: sec.defaultStorage as typeof brief.storage, gmsReference: sec.food ? brief.gmsReference : "aucune", ...(sec.key === "medicament" ? { style: "sante" as const } : {}) });
            }}>
              {SECTORS.map((sc) => <option key={sc.key} value={sc.key}>{sc.label} — {sc.description}</option>)}
            </select>
            <select className="input" value={brief.category} onChange={(e) => updateBrief({ category: e.target.value })} aria-label="Catégorie">
              {sector.categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <p className="mt-2 text-xs text-ink-500">Réglementation appliquée : {sector.regulation}.</p>
        </Q>

        <Q n={4} title="Photo du produit (packshot)" hint="Optionnel · le design s'adapte au produit réel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {brief.packshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brief.packshot} alt="Packshot importé" className="checker h-28 w-28 shrink-0 rounded-xl object-contain p-1" />
            ) : (
              <div className="grid h-28 w-28 shrink-0 place-items-center rounded-xl border-2 border-dashed border-ink-200 text-ink-300"><IconImage size={28} /></div>
            )}
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <label className="btn-secondary btn-sm cursor-pointer"><IconImage size={14} /> {shotBusy ? "Préparation…" : brief.packshot ? "Remplacer" : "Importer le packshot"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPackshot(f); e.target.value = ""; }} />
                </label>
                {brief.packshot && <button type="button" className="btn-ghost btn-sm" onClick={() => { updateBrief({ packshot: undefined, packshotAspect: undefined, packshotColors: undefined }); setShotInfo(null); }}><IconX size={14} /> Retirer</button>}
              </div>
              <label className="flex items-center gap-2 text-xs text-ink-600"><input type="checkbox" checked={cutout} onChange={(e) => setCutout(e.target.checked)} /> Détourer automatiquement un fond uni</label>
              <p className="text-xs text-ink-500">{shotInfo ?? "Photo du produit fini (plat, pot, flacon…) : utilisée comme visuel principal dans les 5 propositions, proportions conservées. Ses couleurs servent de palette si vous n'en choisissez pas."}</p>
              {brief.packshotColors?.length ? <div className="flex gap-1.5">{brief.packshotColors.map((c) => <span key={c} className="h-5 w-5 rounded-full border border-black/10" style={{ background: c }} title={c} />)}</div> : null}
            </div>
          </div>
                  <div className="mt-4 border-t border-ink-100 pt-4">
            <p className="mb-1 text-sm font-semibold">Photos de référence du produit fini <span className="font-normal text-ink-400">· jusqu'à 4</span></p>
            <p className="mb-2 text-xs text-ink-500">Différents angles, la recette réelle, le produit hors emballage : l'IA s'en sert pour générer une photo fidèle à votre produit. Leurs couleurs complètent la palette.</p>
            <ImageStrip images={brief.productRefs ?? []} max={4} label="Photo de référence" onChange={async (imgs) => {
              updateBrief({ productRefs: imgs });
              if (!brief.packshot && imgs.length) {
                const colors = (await Promise.all(imgs.slice(0, 2).map((u) => dominantColors(u, 2)))).flat();
                setSuggested((s) => [...new Set([...colors, ...s])].slice(0, 6));
              }
            }} />
          </div>
        </Q>

        <Q n={5} title="Charte graphique" hint="Optionnel · pour garder votre identité existante">
          <CharterBlock brief={brief} updateBrief={updateBrief} />
        </Q>

        <Q n={6} title="Positionnement">
          <Chips options={POSITIONINGS} value={brief.positioning} onChange={(positioning) => updateBrief({ positioning })} />
        </Q>

        {brief.charter?.enabled && <p className="-mb-2 rounded-xl bg-brand-50 px-4 py-2 text-xs font-medium text-brand-800">Charte graphique active : vos couleurs et vos polices priment sur les deux questions suivantes (le style sert aux motifs et à la mise en scène).</p>}
        <Q n={7} title="Couleurs souhaitées" hint="Jusqu'à 3 · laissez vide pour laisser l'IA choisir">
          <div className="flex flex-wrap items-center gap-2">
            {[...new Set([categoryDef(brief.category).color, ...suggested, ...SWATCHES])].map((c) => {
              const on = brief.colors.includes(c);
              return (
                <button type="button" key={c} onClick={() => toggleColor(c)} className={`relative h-9 w-9 rounded-full border transition ${on ? "scale-110 ring-2 ring-brand-500 ring-offset-2" : "border-ink-200 hover:scale-105"}`} style={{ background: c }} aria-label={`Couleur ${c}`} aria-pressed={on}>
                  {on && <IconCheck size={16} className="absolute inset-0 m-auto" style={{ color: ["#ffffff", "#f6f3ee", "#f2b705"].includes(c) ? "#111" : "#fff" }} />}
                </button>
              );
            })}
            <label className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-dashed border-ink-300 text-ink-500 hover:border-brand-400" title="Couleur personnalisée">
              +
              <input type="color" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => toggleColor(e.target.value)} aria-label="Couleur personnalisée" />
            </label>
          </div>
          {suggested.length > 0 && <p className="mt-2 text-xs text-ink-500">Les premières pastilles sont extraites de vos inspirations.</p>}
        </Q>

        <Q n={8} title="Style graphique">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {STYLES.map((s) => (
              <button type="button" key={s.key} onClick={() => updateBrief({ style: s.key })} className={`rounded-xl border p-3 text-left transition ${brief.style === s.key ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-ink-200 bg-white hover:border-brand-300"}`} aria-pressed={brief.style === s.key}>
                <div className="mb-2 flex h-8 overflow-hidden rounded-lg">
                  {s.preview.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
                </div>
                <span className="block text-sm font-semibold" style={{ fontFamily: `"${s.fonts[0].heading}"` }}>{s.label}</span>
                <span className="block text-[11px] leading-snug text-ink-500">{s.description}</span>
              </button>
            ))}
          </div>
        </Q>

        <Q n={9} title="Public cible">
          <Chips options={AUDIENCES} value={brief.audience} onChange={(audience) => updateBrief({ audience })} />
        </Q>

        <Q n={10} title="Pays de vente">
          <select className="input" value={brief.country} onChange={(e) => updateBrief({ country: e.target.value })} aria-label="Pays de vente">
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Q>

        <Q n={11} title="Designs que vous aimez" hint="Optionnel · emballages, moodboard, votre ancien packaging">
          <p className="mb-2 text-xs text-ink-500">L'application en extrait la palette et l'ambiance pour orienter les propositions ; l'IA s'en inspire pour la lumière et le style de la photo. Aucun texte ni logo n'est copié.</p>
          <InspirationBlock brief={brief} updateBrief={updateBrief} />
        </Q>

        <Q n={12} title="Contraintes" hint="Logo obligatoire, texte existant, mentions imposées…">
          <textarea className="input min-h-[84px]" placeholder="ex. Logo obligatoire en haut à gauche, fond blanc, mention « Recette du chef »" value={brief.constraints} onChange={(e) => updateBrief({ constraints: e.target.value })} aria-label="Contraintes" />
        </Q>

        <div className="card grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="weight">{sector.weightLabel}</label>
            <input id="weight" className="input" value={brief.netWeight} onChange={(e) => updateBrief({ netWeight: e.target.value })} placeholder={sector.key === "medicament" ? "16 comprimés" : sector.weightLabel === "Contenance" || sector.weightLabel === "Volume net" ? "250 ml" : "400 g"} />
          </div>
          <div>
            <label className="label" htmlFor="benefit">Bénéfice principal</label>
            <input id="benefit" className="input" value={brief.benefit} onChange={(e) => updateBrief({ benefit: e.target.value })} placeholder="Proposé par l'IA si vide" />
          </div>
          {sector.storage ? (
            <div>
              <label className="label" htmlFor="storage">Conservation</label>
              <select id="storage" className="input" value={brief.storage} onChange={(e) => updateBrief({ storage: e.target.value as typeof brief.storage })}>
                <option value="surgele">Surgelé</option>
                <option value="frais">Frais</option>
                <option value="ambiant">Ambiant</option>
              </select>
            </div>
          ) : (
            <div className="text-xs text-ink-500"><span className="label">Conservation</span>Mention adaptée au secteur {sector.label.toLowerCase()}.</div>
          )}
        </div>

        {sector.food && <div className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-ink-100 bg-gradient-to-r from-[#002395]/5 via-white to-[#ed2939]/5 px-5 py-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-900 text-white"><IconStore size={20} /></span>
            <div>
              <h3 className="font-semibold">Mode GMS France</h3>
              <p className="text-xs text-ink-500">Appliquez les codes visuels d'un segment du rayon, sans copier aucun design. Contrôle automatique : lisibilité à 2 m, logo, contrastes, mentions INCO.</p>
            </div>
          </div>
          <div className="grid gap-2.5 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {GMS_REFERENCES.map((r) => (
              <button type="button" key={r.key} onClick={() => updateBrief({ gmsReference: r.key })} className={`rounded-xl border p-3 text-left transition ${brief.gmsReference === r.key ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-ink-200 hover:border-brand-300"}`} aria-pressed={brief.gmsReference === r.key}>
                <span className="block text-sm font-semibold">{r.label}</span>
                <span className="block text-[11px] font-medium text-brand-700">{r.segment}</span>
                {r.key !== "aucune" && <span className="mt-1 block text-[11px] leading-snug text-ink-500">{r.codes.slice(0, 2).join(" · ")}</span>}
              </button>
            ))}
          </div>
        </div>}

        <div className="sticky bottom-4 z-10 flex flex-col items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white/95 p-4 shadow-pop backdrop-blur sm:flex-row">
          <p className="text-sm text-ink-600">
            {remaining > 0
              ? <>L'IA va créer <b>{Math.min(5, remaining)} proposition{Math.min(5, remaining) > 1 ? "s" : ""}</b> — {remaining} design{remaining > 1 ? "s" : ""} gratuit{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}.</>
              : <>Vos 5 designs gratuits sont utilisés.</>}
          </p>
          <button type="submit" className="btn-primary w-full !px-6 !py-3 sm:w-auto" disabled={!valid}>
            <IconSparkles size={18} /> {remaining > 0 ? "Générer mes designs" : "Débloquer avec Pro"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Q({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">{n}</span>
        <h2 className="font-semibold">{title}</h2>
        {hint && <span className="text-xs text-ink-400">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Chips<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={value === o.key} key={o.key} onClick={() => onChange(o.key)} className={`chip ${value === o.key ? "chip-active" : ""}`}>{o.label}</button>
      ))}
    </div>
  );
}
