"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useShallow } from "zustand/react/shallow";
import { useStudio } from "@/lib/store";
import { IconFolder, IconPlus, IconTrash } from "@/components/ui/icons";

interface Row { id: string; name: string; updatedAt: string; _count: { designs: number } }

export default function ProjectsPage() {
  const router = useRouter();
  const local = useStudio(useShallow((s) => ({ name: s.brief.productName || s.dieline?.name, designs: s.designs.length, has: !!s.dieline })));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () =>
    fetch("/api/projects").then(async (r) => {
      const j = await r.json();
      if (r.ok) setRows(j.projects);
      else { setRows([]); setMsg(j.error); }
    });
  useEffect(() => { load(); }, []);

  const open = async (id: string) => {
    const r = await fetch(`/api/projects/${id}`);
    const j = await r.json();
    if (r.ok) { useStudio.getState().loadProject(j.project); router.push("/studio"); }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl p-5 md:p-8 animate-fade-up">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">Mes projets</h1>
          <Link href="/studio" className="btn-primary btn-sm" onClick={() => useStudio.getState().reset()}><IconPlus size={15} /> Nouveau projet</Link>
        </div>
        {local.has && (
          <div className="card mt-6 flex items-center gap-4 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-700"><IconFolder /></span>
            <div className="flex-1">
              <p className="font-semibold">{local.name}</p>
              <p className="text-xs text-ink-500">Projet en cours · {local.designs} design(s) · enregistré dans ce navigateur</p>
            </div>
            <Link href="/studio" className="btn-secondary btn-sm">Reprendre</Link>
          </div>
        )}
        {msg && <p className="mt-6 rounded-xl bg-ink-100 px-4 py-3 text-sm text-ink-600">{msg}</p>}
        <ul className="mt-4 space-y-2">
          {rows?.map((p) => (
            <li key={p.id} className="card flex items-center gap-4 p-4">
              <div className="flex-1">
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-ink-500">{p._count.designs} design(s) · modifié le {new Date(p.updatedAt).toLocaleDateString("fr-FR")}</p>
              </div>
              <button className="btn-secondary btn-sm" onClick={() => open(p.id)}>Ouvrir</button>
              <button className="btn-ghost !p-2 text-rose-600" aria-label="Supprimer" onClick={async () => { if (confirm("Supprimer ce projet ?")) { await fetch(`/api/projects/${p.id}`, { method: "DELETE" }); load(); } }}><IconTrash size={16} /></button>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
