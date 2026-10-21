"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", company: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    if (mode === "signup") {
      const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? "Inscription impossible."); setBusy(false); return; }
    }
    const res = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    setBusy(false);
    if (res?.ok) router.push("/studio");
    else setError("E-mail ou mot de passe incorrect (ou base de données non configurée).");
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-50 via-white to-fuchsia-50 p-4">
      <div className="card w-full max-w-md p-8 animate-fade-up">
        <Logo />
        <h1 className="mt-6 font-display text-2xl font-extrabold">{mode === "login" ? "Connexion" : "Créer un compte"}</h1>
        <p className="mt-1 text-sm text-ink-500">Retrouvez vos projets et votre compteur de designs sur tous vos appareils.</p>
        <form className="mt-6 space-y-3" onSubmit={submit}>
          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Nom" />
              <input className="input" placeholder="Entreprise" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} aria-label="Entreprise" />
            </div>
          )}
          <input className="input" type="email" required placeholder="E-mail professionnel" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-label="E-mail" />
          <input className="input" type="password" required minLength={8} placeholder="Mot de passe (8 caractères min.)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} aria-label="Mot de passe" />
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
          <button className="btn-primary w-full !py-3" disabled={busy}>{busy ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}</button>
        </form>
        <button className="btn-secondary mt-3 w-full" onClick={() => signIn("google", { callbackUrl: "/studio" })}>Continuer avec Google</button>
        <p className="mt-5 text-center text-sm text-ink-500">
          {mode === "login" ? "Pas encore de compte ?" : "Déjà inscrit ?"}{" "}
          <button className="font-semibold text-brand-700 hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Créer un compte" : "Se connecter"}</button>
        </p>
        <p className="mt-2 text-center text-xs text-ink-400"><Link href="/studio" className="hover:underline">Continuer sans compte</Link></p>
      </div>
    </div>
  );
}
