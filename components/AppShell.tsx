"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
import { UsageCounter } from "@/components/UsageCounter";
import { ProModal } from "@/components/ProModal";
import { useStudio } from "@/lib/store";
import { IconCrown, IconFolder, IconLibrary, IconSparkles, IconUser } from "@/components/ui/icons";

const NAV = [
  { href: "/studio", label: "Studio", icon: IconSparkles },
  { href: "/projets", label: "Mes projets", icon: IconFolder },
  { href: "/bibliotheque", label: "Bibliothèque", icon: IconLibrary },
  { href: "/pro", label: "PackAI Pro", icon: IconCrown },
];

export function AppShell({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) {
  const path = usePathname();
  const { data: session } = useSession();
  const openPro = useStudio((s) => s.openPro);
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col items-center gap-2 border-r border-ink-100 bg-white py-4 lg:flex">
        <Logo compact />
        <nav className="mt-6 flex flex-col gap-1.5" aria-label="Navigation principale">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path.startsWith(href);
            return (
              <Link key={href} href={href} className={`group flex w-[62px] flex-col items-center gap-1 rounded-xl py-2.5 text-[10.5px] font-semibold transition ${active ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"}`}>
                <Icon size={20} />
                <span className="text-center leading-tight">{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-100 bg-white/85 px-4 backdrop-blur lg:px-6">
          <div className="lg:hidden"><Logo /></div>
          <div className="hidden min-w-0 flex-1 lg:block">{toolbar}</div>
          <div className="ml-auto flex items-center gap-2">
            <UsageCounter />
            <button className="btn-secondary btn-sm hidden sm:inline-flex" onClick={() => openPro(null)}><IconCrown size={14} className="text-amber-500" /> Pro</button>
            {session?.user ? (
              <button className="btn-ghost btn-sm" onClick={() => signOut()} title="Se déconnecter">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{(session.user.name ?? session.user.email ?? "?")[0]?.toUpperCase()}</span>
              </button>
            ) : (
              <Link href="/connexion" className="btn-ghost btn-sm"><IconUser size={16} /> <span className="hidden sm:inline">Connexion</span></Link>
            )}
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-ink-100 bg-white px-3 py-2 lg:hidden" aria-label="Navigation mobile">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${path.startsWith(href) ? "bg-brand-50 text-brand-700" : "text-ink-500"}`}><Icon size={15} />{label}</Link>
          ))}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <ProModal />
    </div>
  );
}
