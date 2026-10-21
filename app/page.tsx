import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { HeroLoader } from "./HeroLoader";
import { STYLES } from "@/lib/generator/styles";
import { PRO_FEATURES } from "@/lib/pro";
import { IconBox, IconCheck, IconEdit, IconGrid, IconShield, IconSparkles, IconStore, IconUpload } from "@/components/ui/icons";

const STEPS = [
  { icon: IconUpload, title: "Type d'emballage et tracé", text: "Étiquette, étui 4 faces, fourreau ou sachet, puis le tracé en PDF, AI ou SVG : dimensions, plis, découpes et zones détectés." },
  { icon: IconEdit, title: "Votre produit", text: "Secteur, catégorie, packshot du produit fini, positionnement, couleurs, style, cible, pays, inspirations et contraintes." },
  { icon: IconSparkles, title: "Recevez 5 designs", text: "Appliqués directement sur votre gabarit, en vue à plat et en boîte 3D, prêts à présenter." },
];

const FEATURES = [
  { icon: IconBox, title: "Aperçu 3D réaliste", text: "La boîte est montée à partir de vos panneaux, aux dimensions réelles." },
  { icon: IconEdit, title: "Éditeur intégré", text: "Textes, couleurs, tailles, positions, photos et pictos. Zones techniques verrouillées." },
  { icon: IconGrid, title: "Gamme complète en un clic", text: "Déclinez un design validé : Saumon, Épinards, Fromage, Thon… même identité." },
  { icon: IconShield, title: "Bonnes pratiques GMS", text: "Logo → nom → photo → bénéfice → infos. Grille cohérente, textes jamais déformés." },
];

export default function Home() {
  return (
    <div className="overflow-hidden">
      <header className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-5">
        <Logo />
        <nav className="ml-auto hidden items-center gap-6 text-sm font-medium text-ink-600 md:flex">
          <a href="#fonctionnement" className="hover:text-ink-900">Fonctionnement</a>
          <a href="#gms" className="hover:text-ink-900">Mode GMS France</a>
          <Link href="/bibliotheque" className="hover:text-ink-900">Bibliothèque</Link>
          <a href="#tarifs" className="hover:text-ink-900">Tarifs</a>
        </nav>
        <Link href="/connexion" className="btn-ghost btn-sm ml-auto md:ml-0">Connexion</Link>
        <Link href="/studio" className="btn-primary btn-sm">Commencer gratuitement</Link>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-20 pt-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <div className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-brand-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-20 -z-10 h-[420px] w-[420px] rounded-full bg-fuchsia-200/40 blur-3xl" />
        <div className="animate-fade-up">
          <span className="badge bg-brand-100 text-brand-800"><IconSparkles size={12} /> Alimentaire, épicerie, boissons, cosmétique, santé, entretien</span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-900 md:text-6xl">
            Vos emballages, <span className="bg-gradient-to-r from-brand-600 to-fuchsia-600 bg-clip-text text-transparent">designés par l'IA</span> sur votre gabarit.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-600">Choisissez votre type d'emballage (étiquette, étui, fourreau, sachet), importez le tracé de découpe et la photo de votre produit : PackAI Designer crée 5 propositions prêtes pour le rayon, en vue à plat et en 3D.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/studio" className="btn-primary !px-6 !py-3.5 text-base">Créer mes 5 designs gratuits</Link>
            <a href="#fonctionnement" className="btn-secondary !px-6 !py-3.5 text-base">Voir comment ça marche</a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
            {["Sans carte bancaire", "PDF · AI · SVG", "Packshot détouré", "Mentions adaptées au secteur"].map((t) => <li key={t} className="flex items-center gap-1.5"><IconCheck size={16} className="text-emerald-600" />{t}</li>)}
          </ul>
        </div>
        <HeroLoader />
      </section>

      <section id="fonctionnement" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5">
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight md:text-4xl">Du tracé de découpe au design en 3 étapes</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white"><s.icon size={22} /></span>
                  <span className="font-display text-4xl font-extrabold text-ink-100">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-ink-600">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl bg-ink-50 p-5">
                <f.icon size={22} className="text-brand-600" />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-ink-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="gms" className="py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 lg:grid-cols-2">
          <div>
            <span className="badge bg-ink-900 text-white"><IconStore size={12} /> Exclusivité</span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight md:text-4xl">Mode GMS France</h2>
            <p className="mt-3 text-ink-600">Des emballages pensés pour la vente en grande distribution, pas seulement des images esthétiques. PackAI applique les codes visuels des grands segments du rayon — surgelé premium, marques nationales, recettes traditionnelles, traiteur frais, MDD — sans jamais copier un design existant.</p>
            <ul className="mt-6 space-y-3">
              {["Lisibilité du nom produit à 2 mètres en rayon", "Hiérarchie du logo et ordre de lecture GMS", "Contraste des couleurs (WCAG AA)", "Emplacement des mentions réglementaires (INCO 1169/2011, Triman)", "Cohérence des déclinaisons de gamme"].map((t) => (
                <li key={t} className="flex items-start gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><IconCheck size={14} /></span><span className="text-sm font-medium">{t}</span></li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STYLES.map((s) => (
              <div key={s.key} className="card overflow-hidden">
                <div className="flex h-20">{s.preview.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</div>
                <div className="p-3">
                  <p className="text-sm font-bold" style={{ fontFamily: `"${s.fonts[0].heading}"` }}>{s.label}</p>
                  <p className="text-[11px] leading-snug text-ink-500">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tarifs" className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight md:text-4xl">Commencez gratuitement</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="card p-7">
              <h3 className="text-lg font-bold">Gratuit</h3>
              <p className="mt-1 font-display text-4xl font-extrabold">0 €</p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {["5 designs générés", "Vue à plat, 3D, zoom, avant/après", "Éditeur complet", "Export JPEG basse résolution", "Filigrane léger"].map((t) => <li key={t} className="flex gap-2"><IconCheck size={16} className="text-emerald-600" />{t}</li>)}
              </ul>
              <Link href="/studio" className="btn-secondary mt-6 w-full">Commencer</Link>
            </div>
            <div className="card relative overflow-hidden border-brand-200 p-7 ring-2 ring-brand-500">
              <span className="badge absolute right-5 top-5 bg-brand-600 text-white">Bientôt</span>
              <h3 className="text-lg font-bold">Pro</h3>
              <p className="mt-1 font-display text-4xl font-extrabold">49 € <span className="text-base font-medium text-ink-500">HT / mois</span></p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {PRO_FEATURES.map((f) => <li key={f.title} className="flex gap-2"><IconCheck size={16} className="text-brand-600" />{f.title}</li>)}
              </ul>
              <Link href="/pro" className="btn-primary mt-6 w-full">Découvrir Pro</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} PackAI Designer · Les références de marques citées servent uniquement à décrire des codes visuels de segment ; aucun élément protégé n'est reproduit.
      </footer>
    </div>
  );
}
