# PackAI Designer

Application web (Next.js 15) qui génère jusqu'à **5 designs d'emballages alimentaires** à partir d'un tracé de découpe (PDF, AI, SVG) et d'un questionnaire de 10 questions. Interface en français, pensée pour la grande distribution (GMS).

## Démarrage

```bash
npm install
cp .env.example .env      # tout est facultatif pour un premier essai
npm run dev               # http://localhost:3000
```

Sans configuration, l'application fonctionne entièrement : projets conservés dans le navigateur (IndexedDB), quota gratuit suivi par un cookie signé, photos issues de la bibliothèque intégrée.

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | PostgreSQL (Prisma) : comptes, projets, compteur de designs. Puis `npm run db:push`. |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | NextAuth (connexion e-mail / mot de passe, Google si `GOOGLE_CLIENT_ID/SECRET`). |
| `OPENAI_API_KEY` | Photos produit photoréalistes générées par OpenAI Images (`gpt-image-1`, fond transparent). |
| `FREE_DESIGN_QUOTA` | Quota gratuit (5 par défaut). |

Scripts : `npm test` (détection de gabarit, générateur, contrôle GMS, gamme), `npm run typecheck`, `npm run lint`, `npm run mockups` (régénère les gabarits d'exemple de `/public/mockups`).

## Parcours

1. **Gabarit** — import PDF / AI (compatible PDF) / SVG, ou gabarit standard. Détection automatique des dimensions, du contour de découpe, des plis, des panneaux (face, dos, côtés, dessus, dessous, rabats, patte de collage) et du volume monté. Attribution des panneaux corrigeable.
2. **Questionnaire** — marque (texte ou logo), produit, catégorie, positionnement, couleurs, style (Premium, Minimaliste, Gourmet, Scandinave, Moderne GMS, Bio, Luxe, Enfant), cible, pays, inspirations (couleurs extraites automatiquement), contraintes ; plus poids net, bénéfice, conservation et **Mode GMS France**.
3. **Propositions** — 5 designs qui varient palette, typographie, disposition, photo et éléments graphiques. Vue à plat, boîte 3D (Three.js), zoom, comparaison avant/après, score GMS.
4. **Éditeur** (Konva) — texte, couleur, taille, position, rotation, photo, pictos, palette globale, annuler/rétablir. Découpes, plis, fonds techniques et zone de collage verrouillés.
5. **Gamme complète** — à partir d'un design validé : déclinaisons (ex. Quiche Saumon, Épinards, Fromage, Thon) avec même grille, typographies, logo et couleur de marque ; code couleur et garniture par variante ; contrôle de cohérence.

## Choix techniques

- **Le gabarit n'est jamais modifié** : la géométrie importée est conservée telle quelle (simple translation à l'origine) ; le design est une scène vectorielle détourée par le contour de découpe et chaque élément est limité à son panneau. Un test vérifie que la génération laisse le gabarit intact.
- **Aucun texte déformé** : les textes sont composés en vectoriel (jamais générés par l'IA d'image). Leur taille s'ajuste, l'échelle des lettres ne change jamais, y compris dans l'éditeur.
- **Hiérarchie GMS** : logo → nom du produit → photo → bénéfice → infos secondaires, sur une grille avec marges de sécurité.
- **Mode GMS France** (`lib/gms`) : codes visuels génériques de segments du rayon (surgelé premium, marques nationales, recettes traditionnelles, traiteur frais, MDD), appliqués sans reprise d'éléments protégés. Contrôles automatiques : lisibilité du nom à 2 m (hauteur de capitale ≥ distance / 250), hiérarchie du logo, contraste WCAG AA, mentions INCO 1169/2011 (dénomination et poids net dans le champ visuel principal, hauteur d'œil ≥ 1,2 mm, hauteur légale du poids net), Triman, marges de sécurité, part de la photo, cohérence de gamme.
- **Couvercles** : un rabat solidaire du dos est pivoté de 180° sur le plat pour se lire à l'endroit une fois monté (vérifié en 3D).

## Structure

```
app/            pages (accueil, studio, projets, bibliothèque, pro, connexion) et API
app/api/        generate, range, usage, projects, register, library, auth
components/     studio (étapes, éditeur, gamme), canvas (rendus 2D), three (3D), ui
lib/dieline/    lecture SVG / PDF (PDF.js), classification des traits, détection des panneaux, gabarits
lib/generator/  styles, mises en page, textes, génération des 5 variantes, gamme
lib/gms/        références GMS et contrôles
lib/render/     rendu Konva (vignettes, exports, textures 3D, filigrane)
lib/server/     Prisma, NextAuth, quotas, OpenAI Images
prisma/         schéma PostgreSQL
public/mockups  gabarits d'exemple (SVG + PDF)
public/assets   bibliothèque alimentaire
```

## Version gratuite / Pro

Gratuit : 5 designs, export JPEG basse résolution (1200 px) avec filigrane léger, compteur visible « 3 / 5 designs utilisés ». Pro : interface seulement (exports PDF CMJN, AI vectoriel, PNG HD, sans filigrane, projets illimités) — aucun paiement n'est branché.

## Limites connues

- Les visuels de la bibliothèque sont des illustrations vectorielles détaillées ; le rendu **photoréaliste** nécessite `OPENAI_API_KEY` (photos produit à la génération, et bouton « Version photo IA » dans la bibliothèque).
- Les `.ai` doivent être enregistrés « compatibles PDF » ; seule la 1re page d'un PDF est analysée. La détection des panneaux repose sur les plis et découpes orthogonaux (cas des étuis et fourreaux standards).
- Sans base de données, le quota des visiteurs repose sur un cookie signé (réinitialisable en effaçant les cookies).
- Les mentions réglementaires générées sont des emplacements à compléter (ingrédients, valeurs nutritionnelles, adresse, EAN fictif).
