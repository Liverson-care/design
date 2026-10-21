"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import type { DesignElement, DesignScene, Dieline, ImageElement, PathElement, TextElement } from "@/lib/types";
import { useStudio } from "@/lib/store";
import { buildArtLayer, buildTechLayer } from "@/lib/render/konva-scene";
import { preloadScene } from "@/lib/render/assets";
import { FONTS } from "@/lib/generator/styles";
import { ICONS } from "@/lib/icons";
import { ROLE_LABELS } from "@/lib/dieline/analyze";
import { GmsPanel } from "./GmsPanel";
import { ExportMenu } from "./ExportMenu";
import { LibraryPicker } from "./LibraryPicker";
import {
  IconChevronLeft, IconEye, IconFront, IconImage, IconLock, IconPlus, IconRedo, IconShape, IconSparkles, IconTrash, IconType, IconUndo, IconZoom,
} from "@/components/ui/icons";

const PT = 0.3528;
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 8)}`;

export function Editor() {
  const { designs, selectedId, dieline, updateDesign, reports, setStep } = useStudio();
  const scene = designs.find((d) => d.id === selectedId) ?? designs[0];
  if (!scene || !dieline) return null;
  return <EditorInner key={scene.id} scene={scene} dieline={dieline} report={reports[scene.id]} onChange={(s) => updateDesign(scene.id, () => s)} onBack={() => setStep("results")} />;
}

function EditorInner({ scene, dieline, report, onChange, onBack }: { scene: DesignScene; dieline: Dieline; report: ReturnType<typeof useStudio.getState>["reports"][string] | undefined; onChange: (s: DesignScene) => void; onBack: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(2);
  const [tech, setTech] = useState(true);
  const [picker, setPicker] = useState<"replace" | "add" | null>(null);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [highlight, setHighlight] = useState<string[]>([]);
  const history = useRef<{ past: DesignScene[]; future: DesignScene[] }>({ past: [], future: [] });
  const [, force] = useState(0);
  const px = fit * zoom;

  const commit = useCallback((next: DesignScene) => {
    history.current.past.push(scene);
    history.current.future = [];
    onChange(next);
    force((n) => n + 1);
  }, [scene, onChange]);

  const patch = useCallback((id: string, p: Partial<DesignElement>) => {
    commit({ ...scene, elements: scene.elements.map((e) => (e.id === id ? ({ ...e, ...p } as DesignElement) : e)) });
  }, [scene, commit]);

  const undo = () => { const prev = history.current.past.pop(); if (prev) { history.current.future.push(scene); onChange(prev); force((n) => n + 1); } };
  const redo = () => { const next = history.current.future.pop(); if (next) { history.current.past.push(scene); onChange(next); force((n) => n + 1); } };

  // Taille d'affichage : le gabarit tient dans la zone de travail
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - 48, h = el.clientHeight - 48;
      setFit(Math.max(0.8, Math.min(w / dieline.widthMm, h / dieline.heightMm)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [dieline]);

  useEffect(() => {
    if (!host.current) return;
    const stage = new Konva.Stage({ container: host.current, width: 10, height: 10 });
    stageRef.current = stage;
    return () => { stage.destroy(); stageRef.current = null; };
  }, []);

  // (Re)construction de la scène Konva à chaque modification
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let alive = true;
    preloadScene(scene).then((images) => {
      if (!alive) return;
      stage.destroyChildren();
      stage.size({ width: Math.ceil(dieline.widthMm * px), height: Math.ceil(dieline.heightMm * px) });
      const art = buildArtLayer(scene, dieline, images, { px, interactive: true, highlight });
      stage.add(art);
      if (tech) stage.add(buildTechLayer(dieline, { px, showPanels: true }));
      const tr = new Konva.Transformer({
        rotateEnabled: true, anchorSize: 9, borderStroke: "#6847ff", anchorStroke: "#6847ff", anchorCornerRadius: 3,
        rotationSnaps: [0, 90, 180, 270, -90], ignoreStroke: true,
        boundBoxFunc: (o, n) => (n.width < 6 || n.height < 6 ? o : n),
      });
      const ui = new Konva.Layer();
      ui.add(tr);
      stage.add(ui);

      const byId = new Map(scene.elements.map((e) => [e.id, e]));
      const sync = (node: Konva.Node) => {
        const el = byId.get(node.id());
        if (!el) return;
        const sx = node.scaleX(), sy = node.scaleY();
        const p: Partial<DesignElement> = { rotation: Math.round(node.rotation() * 10) / 10 };
        if (el.kind === "ellipse") {
          const rx = (node as Konva.Ellipse).radiusX() * sx, ry = (node as Konva.Ellipse).radiusY() * sy;
          Object.assign(p, { x: (node.x() - rx) / px, y: (node.y() - ry) / px, w: (2 * rx) / px, h: (2 * ry) / px });
        } else if (el.kind === "path") {
          Object.assign(p, { x: node.x() / px, y: node.y() / px, w: (sx * el.viewBox) / px, h: (sy * el.viewBox) / px });
        } else if (el.kind === "text") {
          // Texte : on change le corps et la largeur, jamais l'échelle → aucune déformation
          const k = sx;
          Object.assign(p, { x: node.x() / px, y: node.y() / px, w: el.w * k, h: el.h * k, fontSize: Math.round(el.fontSize * k * 100) / 100 });
        } else {
          Object.assign(p, { x: node.x() / px, y: node.y() / px, w: (node.width() * sx) / px, h: (node.height() * sy) / px });
        }
        // Réaffectation au panneau sous le centre de l'élément
        const cx = (p.x ?? el.x) + (p.w ?? el.w) / 2, cy = (p.y ?? el.y) + (p.h ?? el.h) / 2;
        const panel = dieline.panels.find((q) => cx >= q.x && cx <= q.x + q.w && cy >= q.y && cy <= q.y + q.h && q.role !== "glue");
        if (panel && el.panelId && panel.id !== el.panelId) p.panelId = panel.id;
        patch(el.id, p);
      };

      art.find(".design-element").forEach((node) => {
        node.on("mousedown touchstart", (e) => { e.cancelBubble = true; setSel(node.id()); });
        node.on("dragend", () => sync(node));
        node.on("transformend", () => sync(node));
        node.on("mouseenter", () => (stage.container().style.cursor = "move"));
        node.on("mouseleave", () => (stage.container().style.cursor = "default"));
      });
      stage.off("mousedown touchstart");
      stage.on("mousedown touchstart", (e) => {
        const onTransformer = e.target.getParent() instanceof Konva.Transformer;
        if (!onTransformer && !e.target.hasName("design-element")) setSel(null);
      });

      const selNode = sel ? stage.findOne(`#${sel}`) : null;
      const selEl = sel ? byId.get(sel) : null;
      if (selNode && selEl) {
        const uniform = selEl.kind === "text" || selEl.kind === "image" || (selEl.kind === "path" && selEl.role === "icon");
        tr.keepRatio(uniform);
        tr.enabledAnchors(uniform ? ["top-left", "top-right", "bottom-left", "bottom-right"] : ["top-left", "top-center", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-center", "bottom-right"]);
        tr.nodes([selNode]);
      }
      stage.batchDraw();
    });
    return () => { alive = false; };
  }, [scene, dieline, px, tech, sel, highlight, patch]);

  const selected = scene.elements.find((e) => e.id === sel) ?? null;
  const front = dieline.panels.find((p) => p.role === "front") ?? dieline.panels[0];

  const add = (el: Omit<DesignElement, "id">) => {
    const full = { ...el, id: uid(el.kind) } as DesignElement;
    commit({ ...scene, elements: [...scene.elements, full] });
    setSel(full.id);
  };
  const remove = (id: string) => { commit({ ...scene, elements: scene.elements.filter((e) => e.id !== id) }); setSel(null); };
  const reorder = (id: string, dir: 1 | -1) => {
    const els = [...scene.elements];
    const i = els.findIndex((e) => e.id === id);
    const j = i + dir;
    if (j < 0 || j >= els.length || els[j].locked) return;
    [els[i], els[j]] = [els[j], els[i]];
    commit({ ...scene, elements: els });
  };

  // Raccourcis clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (!selected) return;
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(selected.id); }
      const step = e.shiftKey ? 5 : 0.5;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) { e.preventDefault(); patch(selected.id, { x: selected.x + moves[e.key][0], y: selected.y + moves[e.key][1] }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const paletteColors = useMemo(() => [...new Set([scene.palette.primary, scene.palette.accent, scene.palette.background, scene.palette.surface, scene.palette.text, scene.palette.onPrimary])], [scene.palette]);
  const swapColor = (from: string, to: string) => {
    const key = (Object.keys(scene.palette) as (keyof typeof scene.palette)[]).filter((k) => scene.palette[k] === from);
    const palette = { ...scene.palette };
    key.forEach((k) => ((palette as Record<string, string>)[k] = to));
    commit({ ...scene, palette, elements: scene.elements.map((e) => ({ ...e, ...("fill" in e && e.fill === from ? { fill: to } : {}), ...("stroke" in e && e.stroke === from ? { stroke: to } : {}) }) as DesignElement) });
  };

  const editable = scene.elements.filter((e) => !e.locked && e.role !== "legal").slice().reverse();

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[600px] flex-col animate-fade-up">
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 bg-white px-4 py-2.5">
        <button className="btn-ghost btn-sm" onClick={onBack}><IconChevronLeft size={16} /> Propositions</button>
        <span className="mx-1 h-5 w-px bg-ink-200" />
        <span className="text-sm font-semibold">{scene.name}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button className="btn-ghost btn-sm" onClick={undo} disabled={!history.current.past.length} title="Annuler (Ctrl+Z)"><IconUndo size={16} /></button>
          <button className="btn-ghost btn-sm" onClick={redo} disabled={!history.current.future.length} title="Rétablir (Ctrl+Maj+Z)"><IconRedo size={16} /></button>
          <span className="mx-1 h-5 w-px bg-ink-200" />
          <button className="btn-ghost btn-sm" onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))} aria-label="Dézoomer">−</button>
          <span className="w-12 text-center text-xs font-semibold tabular-nums"><IconZoom size={12} className="inline" /> {Math.round(zoom * 100)}%</span>
          <button className="btn-ghost btn-sm" onClick={() => setZoom((z) => Math.min(6, z * 1.25))} aria-label="Zoomer">+</button>
          <button className={`btn-sm btn ${tech ? "bg-ink-900 text-white" : "btn-secondary"}`} onClick={() => setTech((t) => !t)} title="Découpes et plis (verrouillés)"><IconLock size={14} /> Tracés techniques</button>
          <ExportMenu scene={scene} dieline={dieline} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Outils */}
        <aside className="flex w-[68px] shrink-0 flex-col items-center gap-1 border-r border-ink-100 bg-white py-3">
          <Tool icon={IconType} label="Texte" onClick={() => add({ kind: "text", name: "Texte libre", role: "secondary", x: front.x + front.w * 0.15, y: front.y + front.h * 0.45, w: front.w * 0.7, h: 8, rotation: 0, text: "Votre texte", fontFamily: scene.fonts.body, fontSize: 6, fontWeight: 700, fill: scene.palette.text, align: "center", panelId: front.id } as Omit<TextElement, "id">)} />
          <Tool icon={IconImage} label="Photo" onClick={() => setPicker("add")} />
          <Tool icon={IconSparkles} label="Icônes" onClick={() => setIconsOpen((o) => !o)} active={iconsOpen} />
          <Tool icon={IconShape} label="Forme" onClick={() => add({ kind: "ellipse", name: "Pastille", role: "decor", x: front.x + front.w * 0.4, y: front.y + front.h * 0.4, w: front.w * 0.2, h: front.w * 0.2, rotation: 0, fill: scene.palette.accent, panelId: front.id } as Omit<DesignElement, "id">)} />
        </aside>

        {iconsOpen && (
          <div className="w-56 shrink-0 overflow-auto border-r border-ink-100 bg-white p-3 scrollbar-thin animate-fade-up">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Pictogrammes</p>
            <div className="grid grid-cols-3 gap-2">
              {ICONS.map((ic) => (
                <button key={ic.id} title={ic.label} className="flex flex-col items-center gap-1 rounded-lg border border-ink-100 p-2 text-[10px] text-ink-600 hover:border-brand-300 hover:bg-brand-50" onClick={() => add({ kind: "path", name: `Picto · ${ic.label}`, role: "icon", x: front.x + front.w * 0.42, y: front.y + front.h * 0.42, w: 12, h: 12, rotation: 0, data: ic.data, viewBox: 24, fill: "transparent", stroke: scene.palette.primary, strokeWidth: 1.7, panelId: front.id } as Omit<PathElement, "id">)}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={ic.data} /></svg>
                  <span className="line-clamp-1">{ic.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plan de travail */}
        <div ref={wrap} className="checker relative min-w-0 flex-1 overflow-auto scrollbar-thin" onWheel={(e) => { if (e.ctrlKey) { e.preventDefault(); setZoom((z) => Math.max(0.5, Math.min(6, z * (e.deltaY < 0 ? 1.1 : 0.9)))); } }}>
          <div className="inline-block p-6"><div ref={host} className="rounded bg-white/0 shadow-2xl" /></div>
        </div>

        {/* Propriétés */}
        <aside className="scrollbar-thin w-[320px] shrink-0 space-y-4 overflow-auto border-l border-ink-100 bg-white p-4">
          {selected ? (
            <Properties el={selected} scene={scene} onPatch={(p) => patch(selected.id, p)} onDelete={() => remove(selected.id)} onReorder={(d) => reorder(selected.id, d)} onReplace={() => setPicker("replace")} panelLabel={ROLE_LABELS[dieline.panels.find((p) => p.id === selected.panelId)?.role ?? "flap"]} />
          ) : (
            <>
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Palette du design</h3>
                <p className="mb-2 text-xs text-ink-500">Changez une couleur : elle est remplacée partout.</p>
                <div className="flex flex-wrap gap-2">
                  {paletteColors.map((c) => (
                    <label key={c} className="relative h-9 w-9 cursor-pointer rounded-full border border-black/10 shadow-sm" style={{ background: c }} title={c}>
                      <input type="color" defaultValue={c} className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => swapColor(c, e.target.value)} aria-label={`Remplacer ${c}`} />
                    </label>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Calques modifiables</h3>
                <ul className="space-y-1">
                  {editable.slice(0, 40).map((e) => (
                    <li key={e.id}><button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-ink-50" onClick={() => setSel(e.id)}>
                      <span className="grid h-5 w-5 place-items-center rounded bg-ink-100 text-[10px] font-bold text-ink-500">{e.kind === "text" ? "T" : e.kind === "image" ? "▣" : "◆"}</span>
                      <span className="truncate">{e.kind === "text" ? e.text.split("\n")[0] : e.name}</span>
                    </button></li>
                  ))}
                </ul>
                <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-ink-50 p-2 text-[11px] text-ink-500"><IconLock size={12} /> Découpes, plis, fonds techniques et zone de collage sont verrouillés.</p>
              </section>
            </>
          )}
          <GmsPanel report={report} onFocus={(ids) => { setHighlight(ids); setSel(ids[0] ?? null); setTimeout(() => setHighlight([]), 2500); }} />
        </aside>
      </div>

      {picker && (
        <LibraryPicker
          onClose={() => setPicker(null)}
          onPick={(src, item) => {
            if (picker === "replace" && selected?.kind === "image") patch(selected.id, { src, libraryId: item?.id } as Partial<ImageElement>);
            else add({ kind: "image", name: item ? `Photo · ${item.name}` : "Photo importée", role: "photo", x: front.x + front.w * 0.3, y: front.y + front.h * 0.4, w: front.w * 0.4, h: front.w * 0.4, rotation: 0, src, libraryId: item?.id, panelId: front.id } as Omit<ImageElement, "id">);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

function Tool({ icon: Icon, label, onClick, active }: { icon: typeof IconType; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-14 flex-col items-center gap-1 rounded-xl py-2 text-[10.5px] font-semibold transition ${active ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"}`}>
      <Icon size={20} />{label}
    </button>
  );
}

function Num({ label, value, onChange, step = 0.5, suffix }: { label: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-ink-500">{label}</span>
      <div className="flex items-center rounded-lg border border-ink-200 focus-within:border-brand-400">
        <input type="number" step={step} className="w-full bg-transparent px-2 py-1.5 text-xs tabular-nums outline-none" value={Math.round(value * 10) / 10} onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) onChange(v); }} />
        {suffix && <span className="pr-2 text-[10px] text-ink-400">{suffix}</span>}
      </div>
    </label>
  );
}

function Properties({ el, scene, onPatch, onDelete, onReorder, onReplace, panelLabel }: { el: DesignElement; scene: DesignScene; onPatch: (p: Partial<DesignElement>) => void; onDelete: () => void; onReorder: (d: 1 | -1) => void; onReplace: () => void; panelLabel: string }) {
  const swatches = [...new Set([scene.palette.primary, scene.palette.accent, scene.palette.text, scene.palette.onPrimary, scene.palette.background, "#ffffff", "#1b1b1f"])];
  const color = "fill" in el ? el.fill : undefined;
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{el.name}</p>
          <p className="text-[11px] text-ink-500">{panelLabel}{el.legalKey ? " · mention réglementaire" : ""}</p>
        </div>
        <button className="btn-ghost !p-1.5" onClick={() => onReorder(1)} title="Premier plan"><IconFront size={16} /></button>
        <button className="btn-ghost !p-1.5" onClick={() => onReorder(-1)} title="Arrière-plan"><IconFront size={16} className="rotate-180" /></button>
        <button className="btn-ghost !p-1.5 text-rose-600" onClick={onDelete} title="Supprimer"><IconTrash size={16} /></button>
      </div>

      {el.kind === "text" && (
        <>
          <textarea className="input min-h-[70px] text-sm" value={el.text} onChange={(e) => onPatch({ text: e.target.value } as Partial<TextElement>)} aria-label="Texte" />
          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-2 block">
              <span className="mb-1 block text-[11px] font-semibold text-ink-500">Police</span>
              <select className="input !py-1.5 text-xs" value={el.fontFamily} onChange={(e) => onPatch({ fontFamily: e.target.value } as Partial<TextElement>)} style={{ fontFamily: `"${el.fontFamily}"` }}>
                {Object.keys(FONTS).map((f) => <option key={f} value={f} style={{ fontFamily: `"${f}"` }}>{f}</option>)}
              </select>
            </label>
            <Num label="Taille" value={el.fontSize / PT} step={1} suffix="pt" onChange={(v) => onPatch({ fontSize: Math.max(4, v) * PT } as Partial<TextElement>)} />
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-ink-500">Graisse</span>
              <select className="input !py-1.5 text-xs" value={el.fontWeight} onChange={(e) => onPatch({ fontWeight: +e.target.value } as Partial<TextElement>)}>
                {[400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>
          </div>
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map((a) => (
              <button key={a} className={`btn-sm btn flex-1 ${el.align === a ? "bg-ink-900 text-white" : "btn-secondary"}`} onClick={() => onPatch({ align: a } as Partial<TextElement>)}>{a === "left" ? "Gauche" : a === "center" ? "Centre" : "Droite"}</button>
            ))}
            <button className={`btn-sm btn ${el.uppercase ? "bg-ink-900 text-white" : "btn-secondary"}`} onClick={() => onPatch({ uppercase: !el.uppercase } as Partial<TextElement>)} title="Capitales">AA</button>
          </div>
        </>
      )}

      {el.kind === "image" && (
        <button className="btn-secondary w-full" onClick={onReplace}><IconImage size={16} /> Remplacer la photo</button>
      )}

      {color !== undefined && (
        <div>
          <span className="mb-1.5 block text-[11px] font-semibold text-ink-500">{el.kind === "text" ? "Couleur du texte" : "Couleur"}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {swatches.map((c) => <button key={c} className={`h-7 w-7 rounded-full border ${color === c ? "ring-2 ring-brand-500 ring-offset-1" : "border-black/10"}`} style={{ background: c }} onClick={() => onPatch({ fill: c } as Partial<DesignElement>)} aria-label={`Couleur ${c}`} />)}
            <label className="relative grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-dashed border-ink-300 text-xs text-ink-500"><IconPlus size={12} />
              <input type="color" value={color === "transparent" ? "#ffffff" : color} className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => onPatch({ fill: e.target.value } as Partial<DesignElement>)} />
            </label>
          </div>
        </div>
      )}
      {el.kind === "path" && el.stroke && (
        <div>
          <span className="mb-1.5 block text-[11px] font-semibold text-ink-500">Couleur du pictogramme</span>
          <div className="flex flex-wrap gap-1.5">
            {swatches.map((c) => <button key={c} className={`h-7 w-7 rounded-full border ${el.stroke === c ? "ring-2 ring-brand-500 ring-offset-1" : "border-black/10"}`} style={{ background: c }} onClick={() => onPatch({ stroke: c } as Partial<PathElement>)} aria-label={`Couleur ${c}`} />)}
          </div>
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink-400">Position & taille (mm)</span>
        <div className="grid grid-cols-2 gap-2">
          <Num label="X" value={el.x} onChange={(x) => onPatch({ x })} />
          <Num label="Y" value={el.y} onChange={(y) => onPatch({ y })} />
          <Num label="Largeur" value={el.w} onChange={(w) => onPatch(el.kind === "image" || el.kind === "text" ? { w, h: (el.h * w) / el.w } : { w })} />
          <Num label="Hauteur" value={el.h} onChange={(h) => onPatch(el.kind === "image" ? { h, w: (el.w * h) / el.h } : { h })} />
          <Num label="Rotation" value={el.rotation} step={1} suffix="°" onChange={(rotation) => onPatch({ rotation })} />
          <Num label="Opacité" value={(el.opacity ?? 1) * 100} step={5} suffix="%" onChange={(o) => onPatch({ opacity: Math.max(0, Math.min(1, o / 100)) })} />
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-ink-400"><IconEye size={12} /> Glissez sur le plan de travail · flèches pour décaler de 0,5 mm (Maj : 5 mm)</p>
    </section>
  );
}
