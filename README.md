# SR Editer — Site web

Site statique (HTML/CSS/JS sans build) déployé sur Vercel : https://sr-editer.vercel.app

## Structure

```
*.html                 Une page = un fichier à la racine (les URLs publiques ne changent pas)
│                      index, dashboard, library, docs, blog, login, privacy, terms
│                      admin.html (console admin), stats.html (redirection → admin#pulse)
│
├─ styles/
│  ├─ site/            Commun à toutes les pages publiques, chargé dans cet ordre :
│  │  ├─ base.css        tokens (couleurs, polices), reset, Lenis, fond vidéo, typo, utilitaires
│  │  ├─ layout.css      header + menu mobile, héros, sections, footer
│  │  └─ components.css  boutons, bouton profil, badges, formulaires, carte tarif, modale Discord
│  ├─ pages/           Une feuille par page, chargée après site/
│  │  ├─ home.css · dashboard.css · library.css · login.css · blog.css
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

- Préfixe `aww-` : composants partagés du site. Préfixes `doc-`, `library-`, `blog-`… : propres à une page.
- Éviter les `style=""` inline : créer une classe dans la feuille de la page
  (dashboard.html en contient encore, souvent basculés par le JS via `style.display`).
- Pas de `<style>` ni de `<script>` inline : tout va dans `styles/pages/` et `js/pages/`.

## Lancer en local

```bash
npx serve .
```
