# SR Editer — Site web

Site statique (HTML/CSS/JS sans build) déployé sur Vercel : https://sr-editer.vercel.app

## Structure

```
*.html                 Une page = un fichier à la racine (les URLs publiques ne changent pas)
│                      index, dashboard, library, docs, blog, login, privacy, terms
│                      admin.html (console admin), stats.html (redirection → admin#pulse)
│                      404.html (servie automatiquement par Vercel pour toute URL inconnue)
│
├─ styles/
│  ├─ site/            Commun à toutes les pages publiques, chargé dans cet ordre :
│  │  ├─ base.css        tokens (couleurs, polices), reset, Lenis, fond vidéo, typo, utilitaires
│  │  ├─ layout.css      header + menu mobile, héros, sections, footer
│  │  └─ components.css  boutons, bouton profil, badges, formulaires, carte tarif, modale Discord
│  ├─ pages/           Une feuille par page, chargée après site/
│  │  ├─ home.css · dashboard.css · library.css · login.css · blog.css · error.css (404)
│  │  ├─ article.css     mise en page sommaire + contenu (docs, privacy, terms)
│  │  └─ docs.css        composants de la documentation (après article.css)
│  └─ admin/           Console admin (tokens, base, admin)
│
├─ js/
│  ├─ core/            Commun à toutes les pages publiques, chargé dans cet ordre :
│  │  ├─ config.js       configuration publique (Supabase, version, liens) — voir config.example.js
│  │  ├─ supabase.js     client Supabase partagé : window.getSRSupabase()
│  │  ├─ header-auth.js  avatar / pseudo de l'utilisateur connecté dans le header
│  │  └─ site.js         Lenis, menu burger, animations GSAP, scrollspy du sommaire
│  ├─ components/      Partagé par quelques pages : discord.js (erreurs Discord + modale « Discord requis », login & dashboard)
│  ├─ pages/           Script propre à une page (home, blog, docs, library, login, dashboard…)
│  └─ admin/           Console admin
│
└─ assets/             Images, vidéos, textures. ⚠ assets/textures/ est référencé par
                       l'URL publique depuis le backend (edge function admin-users) : ne pas renommer.
```

## Ajouter une page

1. Copier une page existante (ex. `privacy.html`) pour récupérer header, fond vidéo et footer.
2. Garder les 3 feuilles `styles/site/*` puis ajouter `styles/pages/<page>.css` si besoin.
3. Garder les scripts `js/core/*` puis ajouter `js/pages/<page>.js` si besoin.
4. Ajouter le lien dans la `<nav class="aww-nav">` de **toutes** les pages.

## Conventions

- Pages de lecture (docs, légal, blog, dashboard, 404) : `<body class="aww-page aww-page--reading">` assombrit et floute la vidéo de fond.
- Titres : ceux du hero apparaissent lettre par lettre, les autres ligne par ligne au scroll (automatique, voir `js/core/site.js`).
- Paragraphe avec `data-gsap="words-scrub"` : les mots s'allument au fil du scroll.
- `data-magnetic` : réservé aux boutons `.aww-btn`.
- Ne pas décrire le fonctionnement interne de l'application (stack, moteur, identifiants internes) sur le site.
- Préfixe `aww-` : composants partagés du site. Préfixes `doc-`, `library-`, `blog-`… : propres à une page.
- Pas de `style=""` inline, ni dans le HTML ni dans le HTML généré par le JS : créer une classe dans la feuille de la page.
- Afficher / masquer : attribut `hidden` ou classe (`.active`, `.is-visible`), pas `style.display`.
- Pas de `<style>` ni de `<script>` inline : tout va dans `styles/pages/` et `js/pages/`.

## Lancer en local

Aperçu de l'espace client sans compte (tickets et messages fictifs, localhost uniquement) : `http://localhost:3000/dashboard?preview=1`

```bash
npx serve .
```
