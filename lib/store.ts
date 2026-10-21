"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Brief, DesignElement, DesignScene, Dieline, LabelMode, PackType, Usage } from "@/lib/types";
import type { CheckItem, GmsReport } from "@/lib/gms/check";
import { checkDesign } from "@/lib/gms/check";
import { idbStorage } from "./idb-storage";

export type Step = "upload" | "brief" | "results" | "editor" | "range";

export const STEPS: { key: Step; label: string; hint: string }[] = [
  { key: "upload", label: "Emballage", hint: "Type et tracé de découpe" },
  { key: "brief", label: "Produit", hint: "Secteur, packshot, style" },
  { key: "results", label: "Propositions", hint: "5 designs IA" },
  { key: "editor", label: "Éditeur", hint: "Personnaliser" },
  { key: "range", label: "Gamme", hint: "Déclinaisons" },
];

export const DEFAULT_BRIEF: Brief = {
  sector: "alimentaire",
  brandName: "",
  productName: "",
  category: "quiche",
  positioning: "familial",
  colors: [],
  style: "moderne-gms",
  audience: "familles",
  country: "France",
  inspirations: [],
  constraints: "",
  netWeight: "400 g",
  benefit: "",
  storage: "surgele",
  gmsReference: "aucune",
};

interface RangeState {
  baseId: string;
  scenes: DesignScene[];
  consistency: CheckItem[];
}

interface StudioState {
  step: Step;
  projectId?: string;
  packType: PackType | null;
  labelMode: LabelMode;
  dieline?: Dieline;
  brief: Brief;
  designs: DesignScene[];
  reports: Record<string, GmsReport>;
  selectedId?: string;
  validatedId?: string;
  range: RangeState | null;
  usage: Usage;
  proModal: string | null;
  hydrated: boolean;

  setStep: (s: Step) => void;
  setPackType: (t: PackType, mode?: LabelMode) => void;
  setDieline: (d?: Dieline) => void;
  updateBrief: (patch: Partial<Brief>) => void;
  setDesigns: (d: DesignScene[], reports: Record<string, GmsReport>) => void;
  select: (id?: string) => void;
  validate: (id: string) => void;
  updateDesign: (id: string, fn: (scene: DesignScene) => DesignScene) => void;
  updateElement: (designId: string, elId: string, patch: Partial<DesignElement>) => void;
  setRange: (r: RangeState | null) => void;
  setUsage: (u: Usage) => void;
  openPro: (reason: string | null) => void;
  loadProject: (p: { id?: string; dieline: Dieline; brief: Brief; designs: DesignScene[] }) => void;
  reset: () => void;
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      step: "upload",
      packType: null,
      labelMode: "enveloppante",
      brief: DEFAULT_BRIEF,
      designs: [],
      reports: {},
      range: null,
      usage: { used: 0, limit: 5, plan: "FREE" },
      proModal: null,
      hydrated: false,

      setStep: (step) => set({ step }),
      setPackType: (packType, mode) => set({ packType, labelMode: mode ?? get().labelMode }),
      setDieline: (dieline) => set({ dieline, designs: [], reports: {}, selectedId: undefined, validatedId: undefined, range: null }),
      updateBrief: (patch) => set({ brief: { ...get().brief, ...patch } }),

      setDesigns: (designs, reports) => set({ designs: [...get().designs, ...designs], reports: { ...get().reports, ...reports }, selectedId: designs[0]?.id }),
      select: (selectedId) => set({ selectedId }),
      validate: (validatedId) => set({ validatedId }),
      updateDesign: (id, fn) => {
        const { dieline, brief } = get();
        const designs = get().designs.map((d) => (d.id === id ? fn(d) : d));
        const scene = designs.find((d) => d.id === id);
        const reports = { ...get().reports };
        if (scene && dieline) reports[id] = checkDesign(scene, dieline, brief);
        set({ designs, reports });
      },
      updateElement: (designId, elId, patch) =>
        get().updateDesign(designId, (s) => ({
          ...s,
          elements: s.elements.map((e) => (e.id === elId ? ({ ...e, ...patch } as DesignElement) : e)),
        })),
      setRange: (range) => set({ range }),
      setUsage: (usage) => set({ usage }),
      openPro: (proModal) => set({ proModal }),
      loadProject: (p) =>
        set({ projectId: p.id, dieline: p.dieline, packType: p.dieline?.packType ?? "autre", brief: { ...DEFAULT_BRIEF, ...p.brief }, designs: p.designs, reports: p.dieline ? Object.fromEntries(p.designs.map((d) => [d.id, checkDesign(d, p.dieline, p.brief)])) : {}, selectedId: p.designs[0]?.id, step: p.designs.length ? "results" : "brief", range: null }),
      reset: () => set({ step: "upload", packType: null, projectId: undefined, dieline: undefined, brief: DEFAULT_BRIEF, designs: [], reports: {}, selectedId: undefined, validatedId: undefined, range: null }),
    }),
    {
      name: "packai-studio",
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ step: s.step, projectId: s.projectId, packType: s.packType, labelMode: s.labelMode, dieline: s.dieline, brief: s.brief, designs: s.designs, reports: s.reports, selectedId: s.selectedId, validatedId: s.validatedId, range: s.range }),
      onRehydrateStorage: () => () => useStudio.setState({ hydrated: true }),
    },
  ),
);

export const selectedDesign = (s: StudioState) => s.designs.find((d) => d.id === s.selectedId);
