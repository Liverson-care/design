"use client";
import { useEffect, useRef, useState } from "react";
import { useStudio } from "@/lib/store";
import { ANGLES, BACKDROPS, PackStage, type Angle, type Backdrop } from "@/lib/render/stage";
import type { Finish, Substrate } from "@/lib/render/three-pack";
import { canvasToBlob, downloadBlob, drawWatermark, slug } from "@/lib/render/konva-scene";
import { IconCrown, IconDownload, IconLock, IconSparkles } from "@/components/ui/icons";

const FINISHES: { key: Finish; label: string }[] = [
  { key: "mat", label: "Mat" },
  { key: "satine", label: "Satiné" },
  { key: "brillant", label: "Vernis brillant" },
];

interface Shot { src: string; label: string; ai?: boolean }

/** Étape « Rendu final » : l'emballage fabriqué virtuellement à partir de la proposition validée */
export function FinalRender() {
  const { designs, validatedId, dieline, brief, setStep, openPro, usage } = useStudio();
  const design = designs.find((d) => d.id === validatedId);
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<PackStage | null>(null);
  const isLabel = dieline?.packType === "etiquette";
  const [backdrop, setBackdrop] = useState<Backdrop>("studio-clair");
  const [angle, setAngle] = useState<Angle>("trois-quarts");
  const [finish, setFinish] = useState<Finish>("satine");
  const [substrate, setSubstrate] = useState<Substrate>(isLabel ? "verre" : "carton");
  const [facings, setFacings] = useState(3);
  const [building, setBuilding] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiOk, setAiOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/usage").then((r) => r.json()).then((j) => setAiOk(!!j.ai)).catch(() => setAiOk(false));
  }, []);

  useEffect(() => {
    if (!host.current) return;
    try {
      stage.current = new PackStage(host.current);
    } catch {
      setError("La 3D n'est pas disponible sur cet appareil.");
    }
    return () => { stage.current?.dispose(); stage.current = null; };
  }, []);

  useEffect(() => {
    const st = stage.current;
    if (!st || !design || !dieline) return;
    let alive = true;
    setBuilding(true);
    st.build(design, dieline, { backdrop, angle, finish, substrate, facings })
      .catch(() => alive && setError("Impossible de construire le rendu."))
      .finally(() => alive && setBuilding(false));
    return () => { alive = false; };
    // l'angle est appliqué séparément pour ne pas reconstruire la scène
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, dieline, backdrop, finish, substrate, facings]);

  useEffect(() => { stage.current?.setAngle(angle, backdrop === "rayon" ? facings : 1); }, [angle, backdrop, facings]);

  if (!design || !dieline) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center animate-fade-up">
        <h1 className="font-display text-xl font-extrabold">Validez d'abord une proposition</h1>
        <p className="mt-2 text-sm text-ink-500">Le rendu final fabrique l'emballage réel à partir du design que vous avez choisi.</p>
        <button className="btn-primary mt-5" onClick={() => setStep("results")}>Voir les propositions</button>
      </div>
    );
  }

  const label = `${BACKDROPS.find((b) => b.key === backdrop)?.label} · ${ANGLES.find((a) => a.key === angle)?.label}`;
  const capture = () => {
    const c = stage.current?.snapshot(2400);
    if (c) setShots((s) => [{ src: c.toDataURL("image/jpeg", 0.92), label }, ...s].slice(0, 8));
  };
  const download = async (src: string, name: string) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const k = Math.min(1, 1200 / img.width);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    if (usage.plan !== "PRO") drawWatermark(c);
    downloadBlob(await canvasToBlob(c, "image/jpeg", 0.85), `${slug(brief.brandName)}-${slug(brief.productName)}-${slug(name)}.jpg`);
  };
  const aiPhoto = async () => {
    const c = stage.current?.snapshot(1536);
    if (!c) return;
    setAiBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: c.toDataURL("image/png"), backdrop, finish, substrate }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setShots((s) => [{ src: json.photo, label: `Photo IA · ${label}`, ai: true }, ...s].slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : "La photo IA a échoué.");
    } finally {
      setAiBusy(false);
    }
  };

  const substrates: { key: Substrate; label: string }[] = isLabel
    ? [{ key: "verre", label: "Pot en verre" }, { key: "plastique", label: "Pot plastique" }, { key: "kraft", label: "Étiquette kraft" }]
    : dieline.packType === "sachet"
      ? [{ key: "plastique", label: "Film souple" }, { key: "kraft", label: "Papier kraft" }]
      : [{ key: "carton", label: "Carton blanc" }, { key: "kraft", label: "Carton kraft" }];

  return (
    <div className="mx-auto max-w-[1400px] animate-fade-up">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-600">Étape 5</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Rendu final — {brief.productName}</h1>
          <p className="mt-1 text-ink-500">L'emballage fabriqué virtuellement à partir de « {design.name} » : matière, finition, arêtes du carton, lumière de studio ou mise en rayon. Les modifications faites dans l'éditeur sont reprises.</p>
        </div>
        <button className="btn-secondary" onClick={() => setStep("editor")}>Retoucher le design</button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="card overflow-hidden p-2">
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-ink-100">
              <div ref={host} className="absolute inset-0 cursor-grab active:cursor-grabbing" aria-label="Rendu 3D de l'emballage, faites glisser pour tourner" />
              {building && <div className="absolute inset-0 grid place-items-center bg-white/50 text-sm font-medium text-ink-600 backdrop-blur-sm">Fabrication de l'emballage…</div>}
              {aiBusy && <div className="absolute inset-0 grid place-items-center bg-ink-900/40 text-sm font-semibold text-white">Photographie IA en cours (20 à 60 s)…</div>}
            </div>
          </div>
          {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
          {shots.length > 0 && (
            <div className="card p-4">
              <p className="mb-3 text-sm font-bold">Vos rendus</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shots.map((s, i) => (
                  <figure key={i} className="overflow-hidden rounded-xl border border-ink-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.src} alt={s.label} className="aspect-[3/2] w-full object-cover" />
                    <figcaption className="flex items-center gap-2 p-2 text-xs">
                      {s.ai && <span className="badge bg-brand-600 text-white">IA</span>}
                      <span className="min-w-0 flex-1 truncate text-ink-600">{s.label}</span>
                      <button className="btn-ghost !p-1.5" onClick={() => download(s.src, s.label)} title="Télécharger (JPEG 1200 px)"><IconDownload size={14} /></button>
                    </figcaption>
                  </figure>
                ))}
              </div>
              {shots.some((s) => s.ai) && <p className="mt-3 text-xs text-ink-500">La photo IA peut altérer de très petits caractères : le rendu 3D reste la référence fidèle pour l'impression.</p>}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Group title="Mise en scène">
            {BACKDROPS.map((b) => <Chip key={b.key} on={backdrop === b.key} onClick={() => setBackdrop(b.key)}>{b.label}</Chip>)}
          </Group>
          {backdrop === "rayon" && (
            <Group title="Exemplaires en rayon">
              {[1, 2, 3, 4, 5].map((n) => <Chip key={n} on={facings === n} onClick={() => setFacings(n)}>{n}</Chip>)}
            </Group>
          )}
          <Group title="Angle de vue">
            {ANGLES.map((a) => <Chip key={a.key} on={angle === a.key} onClick={() => setAngle(a.key)}>{a.label}</Chip>)}
          </Group>
          <Group title="Matière">
            {substrates.map((m) => <Chip key={m.key} on={substrate === m.key} onClick={() => setSubstrate(m.key)}>{m.label}</Chip>)}
          </Group>
          <Group title="Finition d'impression">
            {FINISHES.map((f) => <Chip key={f.key} on={finish === f.key} onClick={() => setFinish(f.key)}>{f.label}</Chip>)}
          </Group>
          <div className="card space-y-2 p-4">
            <button className="btn-primary w-full" onClick={capture} disabled={building}><IconDownload size={16} /> Capturer ce rendu</button>
            <button className="btn-secondary w-full" onClick={aiPhoto} disabled={building || aiBusy || aiOk === false} title={aiOk === false ? "Ajoutez OPENAI_API_KEY pour activer la photo IA" : undefined}>
              <IconSparkles size={16} /> Photo réaliste par IA
            </button>
            {aiOk === false && <p className="text-[11px] text-ink-500">Photo IA indisponible : la clé OpenAI n'est pas configurée. Le rendu 3D fonctionne sans.</p>}
            <button className="btn-ghost w-full text-ink-500" onClick={() => openPro("export")}><IconLock size={14} className="text-amber-500" /> Rendu 4K sans filigrane <IconCrown size={14} className="text-amber-500" /></button>
            <p className="text-[11px] text-ink-500">Gratuit : capture en JPEG 1200 px avec filigrane léger.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={`chip !py-1.5 text-xs ${on ? "chip-active" : ""}`}>{children}</button>;
}
