const fs = require('fs');
const path = require('path');

const dir = __dirname;

const headTemplate = (title, extraScripts = '') => `
<!doctype html>
<html lang="fr" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · SR Editer</title>
  
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,300,400&f[]=clash-display@200,400,700,500,600,300&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles/awwwards.css?v=3" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"/>
  
  <!-- Supabase -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body class="aww-page">
  <!-- 3D Video Background -->
  <div class="site-bg-container" aria-hidden="true">
    <video class="site-bg-video" src="assets/videos/bg-landscape.mp4" preload="auto" muted playsinline poster="assets/videos/bg-landscape-poster.webp" loop autoplay></video>
    <div class="site-bg-overlay"></div>
    <div class="site-bg-grain"></div>
  </div>

  <div class="custom-cursor"></div>

  <!-- Awwwards Header -->
  <header class="aww-header" data-gsap="fade-down">
    <div class="aww-header-inner">
      <a href="index.html" class="aww-logo" data-magnetic>
        <img src="assets/logo_small.png" alt="SR Editer" />
        <span class="aww-logo-text">SR<br>EDITER</span>
      </a>
      <nav class="aww-nav">
        <a href="index.html" class="aww-link" data-magnetic><span class="aww-link-inner" data-hover="HOME">HOME</span></a>
        <a href="dashboard.html" class="aww-link" data-magnetic><span class="aww-link-inner" data-hover="DASHBOARD">DASHBOARD</span></a>
        <a href="library.html" class="aww-link" data-magnetic><span class="aww-link-inner" data-hover="LIBRARY">LIBRARY</span></a>
        <a href="docs.html" class="aww-link" data-magnetic><span class="aww-link-inner" data-hover="DOCS">DOCS</span></a>
        <a href="blog.html" class="aww-link" data-magnetic><span class="aww-link-inner" data-hover="BLOG">BLOG</span></a>
      </nav>
      <div class="aww-header-actions">
        <a href="login.html" class="aww-btn aww-btn-outline" data-magnetic>
          <span class="aww-btn-text">PORTAL</span>
        </a>
        <button type="button" class="aww-burger-btn" id="aww-burger-btn" aria-label="Menu" aria-expanded="false">
          <span></span><span></span>
        </button>
      </div>
    </div>
  </header>
  
  <main class="aww-smooth-scroll">
`;

const footerTemplate = (extraScripts = '') => `
      <footer class="aww-footer">
        <div class="aww-footer-content">
          <div class="aww-footer-top">
            <h2 class="aww-footer-title" data-gsap="split-text">EXPERIENCE<br>MODDING</h2>
            <a href="#" class="aww-btn aww-btn-solid aww-btn-massive" id="download-btn-2" data-magnetic>
              <span class="aww-btn-text">GET SR EDITER</span>
            </a>
          </div>
          <div class="aww-footer-bottom">
            <p>© 2026 SR Editer. Not affiliated with Rockstar Games.</p>
            <div class="aww-footer-links">
              <a href="privacy.html" class="aww-link">Privacy</a>
              <a href="terms.html" class="aww-link">Terms</a>
            </div>
          </div>
        </div>
      </footer>
  </main>

  <!-- Libraries -->
  <script src="https://unpkg.com/@studio-freight/lenis@1.0.39/dist/lenis.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
  <script src="https://unpkg.com/split-type"></script>
  <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
  
  <!-- Core Logic & Animations -->
  <script src="js/config.js"></script>
  <script src="js/sr-supabase.js"></script>
  <script src="js/awwwards.js"></script>
  ${extraScripts}
</body>
</html>
`;

const write = (filename, content) => {
  fs.writeFileSync(path.join(dir, filename), content);
  console.log('Wrote', filename);
};

// 1. index.html
write('index.html', headTemplate('Home') + `
      <section class="aww-hero">
        <div class="aww-hero-grid">
          <div class="aww-hero-content">
            <div class="aww-kicker">01 — NEXT GEN STUDIO</div>
            <h1 class="aww-hero-heading" data-reveal="text">
              TEXTURE<br>
              <span class="aww-text-stroke">ENGINEERING</span><br>
              REDEFINED.
            </h1>
            <p class="aww-hero-desc">
              Atelier de modding en temps réel pour GTA V et FiveM. Édition 2D multi-calques, rendu 3D RAGE en direct et injection d'archives RPF sans redémarrer le jeu.
            </p>
            <div class="aww-hero-actions">
              <a href="#features" class="aww-btn aww-btn-outline" data-magnetic>
                <span class="aww-btn-text">EXPLORER</span>
              </a>
              <a href="#abonnements" class="aww-btn aww-btn-solid" data-magnetic>
                <span class="aww-btn-text">OFFRES &amp; ACCÈS</span>
              </a>
              <a href="#" class="aww-btn aww-btn-outline btn-download" id="download-btn" data-magnetic>
                <span class="aww-btn-text">TÉLÉCHARGER x64</span>
              </a>
            </div>
            <div class="aww-hero-stats">
              <div class="aww-stat-pill">
                <span class="aww-stat-val">v0.7.1</span>
                <span class="aww-stat-lbl">Version Stable</span>
              </div>
              <div class="aww-stat-pill">
                <span class="aww-stat-val">145+</span>
                <span class="aww-stat-lbl">Textures Cloud</span>
              </div>
              <div class="aww-stat-pill">
                <span class="aww-stat-val">60 FPS</span>
                <span class="aww-stat-lbl">Moteur 3D RAGE</span>
              </div>
            </div>
          </div>
          <div class="aww-hero-media">
            <div class="aww-mockup-frame" data-reveal="image">
              <div class="aww-mockup-bar">
                <div class="aww-mockup-dots"><span></span><span></span><span></span></div>
                <div class="aww-mockup-title">SR Editer Studio · Texture UV &amp; RAGE Shaders (v0.7.1 Pro)</div>
                <div class="aww-mockup-badge">LIVE 60 FPS</div>
              </div>
              <div class="aww-mockup-screen">
                <img src="assets/app-texture-studio.webp" alt="SR Editer Studio Preview" class="aww-mockup-img" id="hero-showcase-img" />
                <div class="aww-mockup-glow"></div>
              </div>
              <div class="aww-mockup-tabs">
                <button type="button" class="aww-mockup-tab is-active" data-showcase="assets/app-texture-studio.webp">Texture Studio</button>
                <button type="button" class="aww-mockup-tab" data-showcase="assets/app-viewport-3d.webp">3D Viewport</button>
                <button type="button" class="aww-mockup-tab" data-showcase="assets/app-rpf-explorer.png">RPF Explorer</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="aww-features" id="features">
        <div class="aww-section-header">
          <div class="aww-kicker">02 — WORKFLOW ATELIER</div>
          <h2 class="aww-section-title" data-reveal="text">TECHNOLOGIES<br><span class="aww-text-stroke">DE POINTE</span></h2>
        </div>
        <div class="aww-feature-grid">
          <div class="aww-feature-card" data-gsap="card-reveal">
            <div class="aww-card-img-wrap">
              <img src="assets/app-texture-studio.webp" alt="Texture Studio 2D &amp; 4K" loading="lazy" />
            </div>
            <div class="aww-card-num">01</div>
            <h3>ATLAS UV &amp; CALQUES 4K</h3>
            <p>Édition multi-calques non destructive avec masques alpha en temps réel. Support natif des formats DDS BC7, DXT5 et PNG haute fidélité.</p>
          </div>
          <div class="aww-feature-card" data-gsap="card-reveal">
            <div class="aww-card-img-wrap">
              <img src="assets/app-viewport-3d.webp" alt="Viewport 3D RAGE" loading="lazy" />
            </div>
            <div class="aww-card-num">02</div>
            <h3>VIEWPORT 3D WEBGL</h3>
            <p>Rendu physique temps réel et shaders RAGE. Orbite 360°, éclairage studio HDRI, et synchronisation instantanée sans délai.</p>
          </div>
          <div class="aww-feature-card" data-gsap="card-reveal">
            <div class="aww-card-img-wrap">
              <img src="assets/app-rpf-explorer.png" alt="RPF Explorer Rockstar" loading="lazy" />
            </div>
            <div class="aww-card-num">03</div>
            <h3>ROCKSTAR RSC7 &amp; RPF</h3>
            <p>Exploration directe des archives RPF et sauvegardes atomiques. Injection chirurgicale des formats .ytd, .ydr, .yft et .ydd.</p>
          </div>
        </div>
      </section>

      <section class="aww-features" id="abonnements" style="padding-top: 2rem;">
        <div class="aww-section-header">
          <div class="aww-kicker">03 — PLANS TARIFAIRES</div>
          <h2 class="aww-section-title" data-reveal="text">CHOISISSEZ<br><span class="aww-text-stroke">VOTRE LICENCE</span></h2>
        </div>
        <div class="aww-pricing-grid">
          <div class="aww-pricing-card">
            <span class="aww-pricing-tier">STANDARD</span>
            <div class="aww-pricing-amount">9,99€ <span>/ mois</span></div>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Pour les créateurs indépendants et moddeurs occasionnels.</p>
            <ul class="aww-pricing-features">
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Studio Textures 2D &amp; RPF</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> 1 appareil simultané</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Mises à jour régulières</li>
            </ul>
            <a href="login.html?redirect=dashboard.html" class="aww-btn aww-btn-outline" data-magnetic style="width: 100%;">
              <span class="aww-btn-text">COMMANDER</span>
            </a>
          </div>

          <div class="aww-pricing-card is-featured">
            <span class="aww-pricing-badge">RECOMMANDÉ</span>
            <span class="aww-pricing-tier" style="color: var(--accent);">PRO</span>
            <div class="aww-pricing-amount">24,99€ <span>/ mois</span></div>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">L'outil complet pour les moddeurs actifs et créateurs de serveurs.</p>
            <ul class="aww-pricing-features">
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Tout le plan Standard inclus</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Viewport 3D temps réel &amp; Shaders</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Bibliothèque 145+ textures cloud</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Synchronisation Rôle Discord VIP</li>
            </ul>
            <a href="login.html?redirect=dashboard.html" class="aww-btn aww-btn-solid" data-magnetic style="width: 100%;">
              <span class="aww-btn-text">PASSER EN PRO</span>
            </a>
          </div>

          <div class="aww-pricing-card">
            <span class="aww-pricing-tier">PREMIUM</span>
            <div class="aww-pricing-amount">49,99€ <span>/ mois</span></div>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Pour les studios FiveM et équipes de modding exigeantes.</p>
            <ul class="aww-pricing-features">
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Tout le plan Pro inclus</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Multi-appareils (jusqu'à 3 postes)</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Support Prioritaire Dédié (Urgent)</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Accès anticipé aux builds bêta</li>
            </ul>
            <a href="login.html?redirect=dashboard.html" class="aww-btn aww-btn-outline" data-magnetic style="width: 100%;">
              <span class="aww-btn-text">REJOINDRE L'ÉLITE</span>
            </a>
          </div>
        </div>
      </section>
` + footerTemplate(`<script src="js/client.js"></script>`));

// 2. dashboard.html
write('dashboard.html', headTemplate('Dashboard') + `
      <div id="loading" class="aww-loading">
        <div class="aww-spinner"></div>
        <span>Loading Command Center...</span>
      </div>
      <section class="aww-page-hero" style="height: 50vh; min-height: 400px;">
        <h1 class="aww-page-title" data-gsap="split-text">COMMAND<br><span class="aww-text-stroke">CENTER</span></h1>
      </section>
      <section class="aww-dashboard" id="dashboard-content" style="display:none;" hidden>
        <div class="aww-dash-grid">
          <div class="aww-dash-sidebar" data-gsap="fade-right">
            <div class="aww-user-profile">
              <div class="aww-avatar" id="profile-avatar-char">?</div>
              <div class="aww-user-meta">
                <h3 id="user-email">Loading...</h3>
                <span class="aww-badge" id="user-tier">GUEST</span>
                <span style="display:none;" id="user-role"></span>
              </div>
            </div>
            <nav class="aww-dash-nav">
              <button class="aww-dash-tab active" data-tab="overview">Vue d'ensemble</button>
              <button class="aww-dash-tab" data-tab="subscription">Abonnement &amp; Factures</button>
              <button class="aww-dash-tab" data-tab="support">Support &amp; Tickets</button>
              <button class="aww-dash-tab" data-tab="downloads">Téléchargements</button>
              <button class="aww-dash-tab" data-tab="settings">Paramètres &amp; Sécurité</button>
              <button class="aww-dash-tab aww-text-danger" id="logout-btn">Se déconnecter</button>
            </nav>
          </div>
          <div class="aww-dash-content" data-gsap="fade-up">
            <!-- 1. OVERVIEW -->
            <div class="aww-panel active" id="panel-overview">
              <h2>Bienvenue dans votre atelier SR Editer</h2>
              <div class="aww-stats-grid">
                <div class="aww-stat-card">
                  <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <h4>Quota IA Texture</h4>
                    <button type="button" id="ai-quota-refresh" style="background: none; border: none; color: var(--accent); cursor: pointer; font-size: 0.8rem; text-decoration: underline;">Actualiser</button>
                  </div>
                  <p class="aww-stat-val" id="ai-quota-copy">Chargement...</p>
                  <p id="ai-quota-meta" style="font-size:0.8rem; color:var(--text-secondary); margin-top: 4px;"></p>
                  <div style="width:100%; background:rgba(255,255,255,0.1); height:6px; margin-top:1.2rem; border-radius:3px; overflow: hidden;">
                     <div id="ai-quota-meter-fill" style="width:0%; background:linear-gradient(90deg, var(--accent), #d946ef); height:100%; border-radius:3px;"></div>
                  </div>
                </div>
                <div class="aww-stat-card">
                  <h4>Compte Discord</h4>
                  <p class="aww-stat-val" id="discord-account-name" style="font-size: 1.4rem;">Non lié</p>
                  <p id="discord-account-status" style="font-size:0.85rem; color:var(--text-secondary); margin-top: 4px;"></p>
                </div>
                <div class="aww-stat-card">
                  <h4>Formule Active</h4>
                  <p class="aww-stat-val" id="overview-tier-label" style="font-size: 1.4rem;">Gratuit</p>
                  <p id="user-status" style="font-size:0.85rem; color:var(--text-secondary); margin-top: 4px;"></p>
                </div>
              </div>
              <div style="margin-top: 2.5rem; padding: 2rem; border: 1px solid var(--border-color); border-radius: 16px; background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem;">
                <div>
                  <h3 style="font-size: 1.25rem; margin-bottom: 0.4rem;">Application Desktop SR Editer</h3>
                  <p style="color: var(--text-secondary); font-size: 0.95rem;">Retrouvez l'atelier complet pour GTA V / FiveM, compatible Windows 10/11 x64.</p>
                </div>
                <a href="#" class="aww-btn aww-btn-solid" id="download-app-link" data-magnetic>
                  <span class="aww-btn-text">Télécharger <span data-app-version></span></span>
                </a>
              </div>
            </div>

            <!-- 2. SUBSCRIPTION -->
            <div class="aww-panel" id="panel-subscription" style="display:none;">
              <h2>Gestion de votre abonnement</h2>
              <p style="color: var(--text-secondary); margin-top: 0.5rem;">Gérez vos formules, vos paiements sécurisés et votre facturation via Stripe.</p>
              <div id="billing-error" class="aww-auth-error" style="display:none; text-align: left; margin: 1.5rem 0;"></div>
              <div style="margin: 2rem 0;">
                <button id="manage-billing-btn" class="aww-btn aww-btn-solid" data-magnetic>
                  <span class="aww-btn-text">Gérer ma facturation (Portail Stripe)</span>
                </button>
              </div>
              
              <div class="aww-pricing-cards">
                 <div class="aww-pricing-card" data-plan="standard">
                    <h3>Standard</h3>
                    <p class="price">9,99 € <span>/ mois</span></p>
                    <ul style="list-style: none; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 0.75rem; color: var(--text-secondary); font-size: 0.95rem;">
                      <li>✓ Enregistrement &amp; injection directs</li>
                      <li>✓ Atlas UV jusqu'à 2K</li>
                      <li>✓ 100 générations IA textures / jour</li>
                      <li>✓ Support tickets inclus</li>
                    </ul>
                    <button class="aww-btn aww-btn-outline" data-upgrade-tier="standard" data-magnetic>S'ABONNER STANDARD</button>
                 </div>
                 <div class="aww-pricing-card" data-plan="pro">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                      <h3>Pro</h3>
                      <span style="font-size: 0.75rem; background: var(--accent); color: #fff; padding: 2px 8px; border-radius: 999px; font-weight: 700;">POPULAIRE</span>
                    </div>
                    <p class="price">24,99 € <span>/ mois</span></p>
                    <ul style="list-style: none; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 0.75rem; color: var(--text-secondary); font-size: 0.95rem;">
                      <li>✓ Tout le plan Standard</li>
                      <li>✓ Atlas UV jusqu'à 4K</li>
                      <li>✓ 250 générations IA textures / jour</li>
                      <li>✓ Génération 3D TRELLIS &amp; PBR</li>
                      <li>✓ Support prioritaire Haute</li>
                    </ul>
                    <button class="aww-btn aww-btn-outline" data-upgrade-tier="pro" data-magnetic>S'ABONNER PRO</button>
                 </div>
                 <div class="aww-pricing-card" data-plan="premium">
                    <h3>Premium</h3>
                    <p class="price">49,99 € <span>/ mois</span></p>
                    <ul style="list-style: none; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 0.75rem; color: var(--text-secondary); font-size: 0.95rem;">
                      <li>✓ Tout le plan Pro</li>
                      <li>✓ 500 générations IA textures / jour</li>
                      <li>✓ Accès aux fonctionnalités expérimentales</li>
                      <li>✓ Support VIP Urgente en direct</li>
                      <li>✓ Rôle Discord Exclusif</li>
                    </ul>
                    <button class="aww-btn aww-btn-outline" data-upgrade-tier="premium" data-magnetic>S'ABONNER PREMIUM</button>
                 </div>
              </div>
            </div>

            <!-- 3. SUPPORT & TICKETS (SPT) -->
            <div class="aww-panel" id="panel-support" style="display:none;">
              <div class="support-tickets-header">
                <div>
                  <h2>Support &amp; Assistance</h2>
                  <p style="color: var(--text-secondary); margin-top: 0.4rem;">
                    Suivez vos demandes d'assistance, échangez directement avec notre équipe technique et retrouvez vos échanges synchronisés dans l'application.
                  </p>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem;">
                  <span id="web-ticket-count-badge" class="ticket-count-badge">0 Ticket</span>
                  <button type="button" class="aww-btn aww-btn-solid" id="open-new-ticket-modal-btn" data-magnetic>
                    <span class="aww-btn-text">+ Nouveau Ticket</span>
                  </button>
                </div>
              </div>
              <div id="web-tickets-list-container" style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem;">
                <div style="text-align: center; padding: 40px; color: var(--text-secondary); font-size: 14px; border: 1px dashed var(--border-color); border-radius: 16px;">
                  Chargement des tickets d'assistance...
                </div>
              </div>
            </div>

            <!-- 4. DOWNLOADS -->
            <div class="aww-panel" id="panel-downloads" style="display:none;">
              <h2>Téléchargements &amp; Versions</h2>
              <p style="color: var(--text-secondary); margin-top: 0.5rem;">Téléchargez la dernière version officielle de SR Editer pour Windows.</p>
              <div style="margin-top: 2rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
                <div style="padding: 2rem; border: 1px solid var(--border-color); border-radius: 16px; background: rgba(255,255,255,0.02);">
                  <span style="font-size: 0.8rem; color: var(--accent); font-weight: 700; text-transform: uppercase;">Build Officiel Windows</span>
                  <h3 style="font-size: 1.4rem; margin: 0.5rem 0 1rem;">SR Editer Desktop <span data-app-version>v0.7.1</span></h3>
                  <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem;">
                    Installeur officiel x64 intégrant le décodeur natif RSC7, l'éditeur de textures multi-calques et le viewport 3D temps réel.
                  </p>
                  <a href="https://github.com/NALYD2400/SR-editer/releases/download/0.7.1/SR.Editer_0.7.1_x64-setup.exe" class="aww-btn aww-btn-solid" data-magnetic>
                    <span class="aww-btn-text">Télécharger .exe (x64)</span>
                  </a>
                </div>
                <div style="padding: 2rem; border: 1px solid var(--border-color); border-radius: 16px; background: rgba(255,255,255,0.02);">
                  <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 700; text-transform: uppercase;">Configuration requise</span>
                  <h3 style="font-size: 1.4rem; margin: 0.5rem 0 1rem;">Prérequis Système</h3>
                  <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.6rem; color: var(--text-secondary); font-size: 0.9rem;">
                    <li>🖥️ <strong>Système :</strong> Windows 10 (64-bit) ou Windows 11</li>
                    <li>🧠 <strong>Mémoire RAM :</strong> 8 Go minimum (16 Go recommandés)</li>
                    <li>🎮 <strong>GPU :</strong> Compatible WebGL 2.0 / DirectX 11+</li>
                    <li>📁 <strong>Jeux :</strong> GTA V Legacy, Gen9 / Enhanced, FiveM</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- 5. SETTINGS -->
            <div class="aww-panel" id="panel-settings" style="display:none;">
              <h2>Paramètres &amp; Sécurité</h2>
              <div style="margin-top: 2rem; padding: 2rem; border: 1px solid var(--border-color); border-radius: 16px; background: rgba(255,255,255,0.02);">
                <h3>Liaison Discord</h3>
                <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0.5rem 0 1rem;">Link Discord to sync your roles automatically.</p>
                <p id="discord-account-note" style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1.5rem;"></p>
                <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                  <button class="aww-btn aww-btn-outline" id="discord-link-btn">Lier mon compte Discord</button>
                  <button class="aww-btn aww-btn-outline" id="discord-sync-btn" style="display:none;">Synchroniser les rôles</button>
                </div>
                <div id="account-action-message" style="margin-top:1rem; color:var(--accent);" hidden></div>
              </div>
              <div style="margin-top: 2rem; padding: 2rem; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; background: rgba(239, 68, 68, 0.03);">
                <h3 style="color: #f87171;">Zone de danger</h3>
                <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0.5rem 0 1.2rem;">La suppression de votre compte annule immédiatement votre abonnement actif et supprime définitivement toutes vos données associées.</p>
                <button type="button" class="aww-btn aww-btn-outline aww-text-danger" id="delete-account-start">
                  <span class="aww-btn-text">Supprimer définitivement mon compte</span>
                </button>
                <div class="delete-account-box" id="delete-account-confirmation" hidden>
                  <p>⚠️ <strong>Action irréversible :</strong> saisissez votre adresse email pour confirmer la suppression de votre compte :</p>
                  <input type="email" id="delete-account-email" class="aww-input" placeholder="votre-email@exemple.com" style="margin-bottom: 1rem;" />
                  <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" class="aww-btn aww-btn-outline" id="delete-account-cancel">Annuler</button>
                    <button type="button" class="aww-btn aww-btn-solid aww-text-danger" id="delete-account-confirm" disabled>Confirmer la suppression</button>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>
      
      <!-- Modals -->
      <div id="web-create-ticket-modal" class="aww-modal-backdrop" hidden>
        <div class="aww-modal-window">
          <div class="aww-modal-header">
            <h3 class="aww-modal-title">Créer un nouveau ticket d'assistance</h3>
            <button type="button" class="aww-modal-close" id="close-new-ticket-modal-btn">&times;</button>
          </div>
          <form id="web-create-ticket-form">
            <div class="aww-modal-body">
              <div id="web-create-ticket-error" class="aww-auth-error" style="display:none; margin-bottom: 1rem;"></div>
              <div class="aww-input-group">
                <label for="web-ticket-subject">SUJET DE LA DEMANDE</label>
                <input type="text" id="web-ticket-subject" class="aww-input" placeholder="ex: Problème d'export de texture DDS" required />
              </div>
              <div class="aww-input-group">
                <label for="web-ticket-priority">PRIORITÉ</label>
                <select id="web-ticket-priority" class="aww-select">
                  <option value="low">Faible</option>
                  <option value="normal" selected>Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div class="aww-input-group">
                <label for="web-ticket-message">DESCRIPTION DÉTAILLÉE</label>
                <textarea id="web-ticket-message" class="aww-textarea" placeholder="Expliquez précisément votre problème..." required></textarea>
              </div>
            </div>
            <div class="aww-modal-footer">
              <button type="button" class="aww-btn aww-btn-outline" id="cancel-new-ticket-modal-btn">Annuler</button>
              <button type="submit" class="aww-btn aww-btn-solid" id="submit-new-ticket-btn">Envoyer le ticket</button>
            </div>
          </form>
        </div>
      </div>

      <div id="web-ticket-chat-modal" class="aww-modal-backdrop" hidden>
        <div class="aww-modal-window" style="max-width: 720px; height: 80vh;">
          <div class="aww-modal-header">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <h3 class="aww-modal-title" id="web-chat-ticket-subject">Ticket #</h3>
                <span id="web-chat-ticket-status-pill" class="ticket-count-badge">Ouvert</span>
              </div>
            </div>
            <button type="button" class="aww-modal-close" id="close-ticket-chat-modal-btn">&times;</button>
          </div>
          <div id="web-chat-messages-container" style="flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;"></div>
          <form id="web-ticket-reply-form" style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; gap: 0.75rem; align-items: flex-end;">
            <textarea id="web-reply-message" rows="2" class="aww-textarea" style="min-height: 48px; padding: 0.6rem 0.85rem;" placeholder="Écrire votre réponse..." required></textarea>
            <button type="submit" id="submit-ticket-reply-btn" class="aww-btn aww-btn-solid" style="height: 48px; padding: 0 1.5rem;">Envoyer</button>
          </form>
        </div>
      </div>

      <div id="liquid-checkout-modal" class="liquid-checkout-backdrop" style="display: none;">
        <div class="liquid-checkout-modal-content">
          <button type="button" class="liquid-checkout-close" id="liquid-checkout-close-btn">&times;</button>
          <div class="liquid-checkout-header">
            <div class="liquid-checkout-badge">Paiement Sécurisé SR Editer</div>
            <h2 id="liquid-checkout-plan-title">Abonnement Pro</h2>
            <p class="liquid-checkout-price" id="liquid-checkout-plan-price">24,99 € <span>/ mois</span></p>
          </div>
          <div id="liquid-checkout-error" class="liquid-checkout-error-banner" style="display: none;"></div>
          <div id="liquid-checkout-loading" class="liquid-checkout-spinner" style="display: none;">Connexion à la passerelle de paiement sécurisée...</div>
          <div id="stripe-embedded-checkout-container"></div>
          <div class="liquid-checkout-footer">
            <span>🔒 Chiffrement SSL 256-bit</span>
            <span>⚡ Activation instantanée</span>
          </div>
          <div style="text-align: center; margin-top: 10px;">
            <a id="liquid-checkout-direct-link" href="#" target="_blank" style="display: none; color: var(--accent); font-size: 0.85rem; text-decoration: underline; font-weight: 500;">
              Problème d'affichage ? Ouvrir la page de paiement Stripe ➔
            </a>
          </div>
        </div>
      </div>

      <div id="discord-required-modal" class="aww-modal-backdrop" hidden>
        <div class="discord-required-dialog">
          <h3 style="font-family: var(--font-heading); margin-bottom: 1rem;">Discord Requis</h3>
          <p id="discord-required-message" style="color: var(--text-secondary);"></p>
          <a id="discord-required-join" target="_blank" rel="noopener" class="aww-btn aww-btn-solid" style="margin-bottom: 0.75rem; text-align: center;">Rejoindre le serveur Discord</a>
          <button type="button" id="discord-required-retry" class="aww-btn aww-btn-outline" style="margin-bottom: 0.75rem;">J'ai rejoint, réessayer</button>
          <button type="button" id="discord-required-close" class="aww-btn aww-btn-outline">Fermer</button>
        </div>
      </div>

      <a id="discord-recovery-link" hidden></a>

      <script>
        document.querySelectorAll('.aww-dash-tab').forEach(btn => {
          if(!btn.dataset.tab) return;
          btn.addEventListener('click', () => {
            document.querySelectorAll('.aww-dash-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.aww-panel').forEach(p => p.style.display = 'none');
            btn.classList.add('active');
            const target = document.getElementById('panel-' + btn.dataset.tab);
            if (target) target.style.display = 'block';
          });
        });
      </script>
` + footerTemplate(`<script src="js/portal-dashboard.js"></script>`));

// 3. login.html
write('login.html', headTemplate('Portal') + `
      <section class="aww-auth-section">
        <div class="aww-auth-container" data-gsap="fade-up">
          <h1 class="aww-auth-title" id="auth-title-heading" data-gsap="split-text">SECURE<br><span class="aww-text-stroke">PORTAL</span></h1>
          <p id="auth-subtitle" style="text-align:center; color:var(--text-secondary); margin-bottom:2rem;">Authenticate to access the studio.</p>
          
          <button type="button" class="aww-btn aww-btn-outline aww-btn-full" id="discord-btn" style="margin-bottom: 2rem;" data-magnetic>
            <span class="aww-btn-text">CONTINUE WITH DISCORD</span>
          </button>
          
          <form class="aww-auth-form" id="auth-form">
            <div class="aww-input-group">
              <label>EMAIL ADDRESS</label>
              <input type="email" id="email" class="aww-input" placeholder="agent@srediter.com" required />
            </div>
            <div class="aww-input-group">
              <label>PASSWORD</label>
              <input type="password" id="password" class="aww-input" placeholder="••••••••" required />
            </div>
            <div class="aww-input-group" id="confirm-password-field" hidden>
              <label>CONFIRM PASSWORD</label>
              <input type="password" id="confirm-password" class="aww-input" placeholder="••••••••" />
            </div>
            
            <div id="error-message" class="aww-auth-error"></div>
            <div id="success-message" style="color:var(--accent); text-align:center; margin-top:1rem;"></div>
            <a id="discord-recovery-link" hidden></a>

            <button type="submit" class="aww-btn aww-btn-solid aww-btn-full" id="submit-btn" data-magnetic>
              <span class="aww-btn-text">AUTHENTICATE</span>
            </button>
            <div class="aww-auth-footer" id="auth-switch">
              Pas encore de compte ? <button type="button" class="aww-text-btn" id="switch-to-signup">S'inscrire</button>
            </div>
          </form>
        </div>
      </section>
      
      <!-- Modals for Discord Requirements -->
      <div id="discord-required-modal" hidden>
        <div class="discord-required-dialog">
          <p id="discord-required-message"></p>
          <a id="discord-required-join"></a>
          <button id="discord-required-retry"></button>
          <button id="discord-required-close">Close</button>
        </div>
      </div>
` + footerTemplate(`<script src="js/portal-login.js"></script>`));

// 4. docs.html
write('docs.html', headTemplate('Documentation') + `
      <section class="aww-page-hero" style="height: 45vh; min-height: 380px;">
        <div class="aww-hero-content">
          <div class="aww-kicker" data-gsap="fade-up">03 — DOCUMENTATION &amp; GUIDES</div>
          <h1 class="aww-page-title" data-gsap="split-text">SYSTEM<br><span class="aww-text-stroke">MANUAL</span></h1>
          <p class="aww-hero-desc" data-gsap="fade-up" data-delay="0.3" style="max-width: 650px; font-size: 1.2rem;">
            Guide technique officiel et spécifications de l'atelier SR Editer pour GTA V, FiveM et les archives RPF.
          </p>
        </div>
      </section>

      <section class="aww-docs">
        <div class="aww-docs-container">
          <aside class="aww-docs-sidebar" data-gsap="fade-right">
            <ul>
              <li><a href="#getting-started" class="aww-toc-link">Démarrage</a></li>
              <li><a href="#installation" class="aww-toc-link">Installation</a></li>
              <li><a href="#texture-studio" class="aww-toc-link">Texture Studio</a></li>
              <li><a href="#viewport-3d" class="aww-toc-link">Viewport 3D</a></li>
              <li><a href="#rpf-archives" class="aww-toc-link">Archives RPF</a></li>
              <li><a href="#faq" class="aww-toc-link">FAQ &amp; Support</a></li>
            </ul>
          </aside>

          <div class="aww-docs-content" data-gsap="fade-up">
            <!-- DÉMARRAGE -->
            <section id="getting-started" class="aww-docs-section">
              <span class="ticket-count-badge">01 · INTRODUCTION</span>
              <h2 style="font-size: clamp(2.2rem, 4vw, 3.5rem); margin: 1rem 0 1.5rem;">Prise en Main Rapide</h2>
              <p>
                <strong>SR Editer</strong> est une suite logicielle native pour Windows conçue pour les moddeurs, créateurs de véhicules, graphistes et développeurs FiveM.
                Elle remplace les anciens flux de travail lents et destructifs par un pipeline moderne en temps réel, incluant l'inspection d'archives RPF, un studio 2D et un viewport 3D physically-based (PBR).
              </p>
              <div class="aww-docs-card">
                <h3 style="margin-bottom: 0.75rem; color: #fff;">Points Clés de la Version v0.7.1</h3>
                <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.6rem; color: var(--text-secondary); font-size: 0.95rem;">
                  <li>⚡ <strong>Décodeur RSC7 Natif en Rust :</strong> Décompression ultra-rapide des conteneurs sans corruptions mémoires.</li>
                  <li>🎨 <strong>Texture Studio Multi-Calques :</strong> Peinture, masques vectoriels, calques de réglages et export direct en DDS (DXT1, DXT5, BC7).</li>
                  <li>🧊 <strong>Moteur WebGL 3D RAGE-Compliant :</strong> Rendu fidèle des shaders GTA V (carpaint, specular, normal maps, dirt level).</li>
                  <li>🔄 <strong>Hot-Swap RPF :</strong> Remplacement des textures à chaud sans redémarrer le client FiveM ou le jeu.</li>
                </ul>
              </div>
            </section>

            <!-- INSTALLATION -->
            <section id="installation" class="aww-docs-section" style="margin-top: 5rem;">
              <span class="ticket-count-badge">02 · SETUP</span>
              <h2 style="font-size: clamp(2.2rem, 4vw, 3.5rem); margin: 1rem 0 1.5rem;">Installation &amp; Prérequis</h2>
              <p>
                L'application est distribuée sous forme d'installateur officiel Windows 64-bit autonome avec signature cryptographique.
              </p>
              <div class="aww-docs-card" style="border-color: rgba(139, 92, 246, 0.3); background: rgba(139, 92, 246, 0.04);">
                <h3 style="margin-bottom: 0.75rem; color: #fff;">Téléchargement Recommandé</h3>
                <p style="margin-bottom: 1.25rem;">Obtenez la dernière version stable directement depuis notre serveur sécurisé :</p>
                <a href="https://github.com/NALYD2400/SR-editer/releases/download/0.7.1/SR.Editer_0.7.1_x64-setup.exe" class="aww-btn aww-btn-solid" data-magnetic>
                  <span class="aww-btn-text">Télécharger SR Editer v0.7.1 (.exe)</span>
                </a>
              </div>
              <div style="margin-top: 1.5rem;">
                <h4 style="font-size: 1.1rem; margin-bottom: 0.5rem; color: #fff;">Configuration Minimale :</h4>
                <p>Système : Windows 10 (version 1903+) ou Windows 11 (64-bit).<br>Processeur : Intel Core i3 / AMD Ryzen 3 ou supérieur.<br>Mémoire : 8 Go RAM (16 Go conseillés pour les textures 4K).<br>Carte Graphique : NVIDIA GeForce GTX 960 / AMD Radeon R9 280 ou supérieure (compatible DirectX 11 / OpenGL 4.5).</p>
              </div>
            </section>

            <!-- TEXTURE STUDIO -->
            <section id="texture-studio" class="aww-docs-section" style="margin-top: 5rem;">
              <span class="ticket-count-badge">03 · WORKSHOP</span>
              <h2 style="font-size: clamp(2.2rem, 4vw, 3.5rem); margin: 1rem 0 1.5rem;">Texture Studio 2D</h2>
              <p>
                Le module Texture Studio permet de manipuler directement les dictionnaires de textures (.ytd) et les fichiers bruts. Vous pouvez importer des fichiers PNG, JPEG ou DDS, ajuster les canaux de couleurs et prévisualiser immédiatement le résultat.
              </p>
              <div class="aww-docs-card">
                <h3 style="margin-bottom: 0.75rem; color: #fff;">Formats et Algorithmes Supportés</h3>
                <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.6rem; color: var(--text-secondary); font-size: 0.95rem;">
                  <li><strong>DXT1 (BC1) :</strong> Idéal pour les livrées simples, badges et textures opaques sans transparence complexe.</li>
                  <li><strong>DXT5 (BC3) :</strong> Format standard pour les textures avec canal alpha progressif (verre, décalcomanies, fumées).</li>
                  <li><strong>BC7 (DirectX 11) :</strong> Qualité maximale pour les rendus HD 4K avec compression de blocs avancée et réduction des artefacts.</li>
                  <li><strong>Génération Automatique de Mipmaps :</strong> Calcul GPU des niveaux de détails pour éviter le scintillement en jeu.</li>
                </ul>
              </div>
            </section>

            <!-- VIEWPORT 3D -->
            <section id="viewport-3d" class="aww-docs-section" style="margin-top: 5rem;">
              <span class="ticket-count-badge">04 · REALTIME 3D</span>
              <h2 style="font-size: clamp(2.2rem, 4vw, 3.5rem); margin: 1rem 0 1.5rem;">Viewport 3D &amp; Shaders</h2>
              <p>
                Le viewport 3D intègre une réplique fidèle du moteur d'éclairage de GTA V. Il prend en charge les modèles 3D (.ydr, .yft, .ydd, .odr) et synchronise les textures éditées en une fraction de seconde.
              </p>
              <div class="aww-docs-card">
                <h3 style="margin-bottom: 0.75rem; color: #fff;">Contrôles et Raccourcis Clavier</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                  <div style="padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 8px;">
                    <strong style="color: var(--accent);">Clic Gauche + Glisser :</strong><br><span style="font-size: 0.9rem; color: var(--text-secondary);">Rotation de la caméra (Orbite)</span>
                  </div>
                  <div style="padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 8px;">
                    <strong style="color: var(--accent);">Clic Droit + Glisser :</strong><br><span style="font-size: 0.9rem; color: var(--text-secondary);">Panoramique (Pan)</span>
                  </div>
                  <div style="padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 8px;">
                    <strong style="color: var(--accent);">Molette Souris :</strong><br><span style="font-size: 0.9rem; color: var(--text-secondary);">Zoom avant / arrière progressif</span>
                  </div>
                  <div style="padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 8px;">
                    <strong style="color: var(--accent);">Ctrl + Z / Ctrl + Y :</strong><br><span style="font-size: 0.9rem; color: var(--text-secondary);">Annuler / Rétablir modifications</span>
                  </div>
                </div>
              </div>
            </section>

            <!-- RPF ARCHIVES -->
            <section id="rpf-archives" class="aww-docs-section" style="margin-top: 5rem;">
              <span class="ticket-count-badge">05 · FILE SYSTEM</span>
              <h2 style="font-size: clamp(2.2rem, 4vw, 3.5rem); margin: 1rem 0 1.5rem;">Archives RPF &amp; Remplacement</h2>
              <p>
                L'explorateur RPF de SR Editer inspecte les fichiers du jeu en lecture sécurisée avec checksum d'intégrité, protégeant vos installations originales contre toute corruption.
              </p>
              <div class="aww-docs-card">
                <h3 style="margin-bottom: 0.75rem; color: #fff;">Sécurité &amp; Compatibilité FiveM</h3>
                <p>
                  Toutes les opérations d'export respectent la structure interne des fichiers DLC (.rpf) et stream folders FiveM. Vous pouvez exporter vos ressources directement prêtes à être intégrées dans votre dossier de serveur sans outil tiers.
                </p>
              </div>
            </section>

            <!-- FAQ -->
            <section id="faq" class="aww-docs-section" style="margin-top: 5rem;">
              <span class="ticket-count-badge">06 · ASSISTANCE</span>
              <h2 style="font-size: clamp(2.2rem, 4vw, 3.5rem); margin: 1rem 0 1.5rem;">Foire Aux Questions &amp; Support</h2>
              <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                <div class="aww-docs-card">
                  <h3 style="margin-bottom: 0.5rem; color: #fff;">Puis-je utiliser SR Editer sans connexion internet ?</h3>
                  <p>Oui. Une fois votre licence validée lors de la première connexion, SR Editer conserve un cache chiffré de votre autorisation permettant de travailler hors-ligne pendant 14 jours.</p>
                </div>
                <div class="aww-docs-card">
                  <h3 style="margin-bottom: 0.5rem; color: #fff;">Comment synchroniser mon abonnement avec Discord ?</h3>
                  <p>Rendez-vous dans l'Espace Client &gt; Paramètres, puis cliquez sur « Lier mon compte Discord ». Votre rôle (Membre, Pro ou VIP) vous sera automatiquement attribué par notre bot officiel.</p>
                </div>
                <div class="aww-docs-card">
                  <h3 style="margin-bottom: 0.5rem; color: #fff;">Comment obtenir de l'aide technique ?</h3>
                  <p>Ouvrez un ticket d'assistance directement depuis l'onglet « Support » de votre Espace Client ou de l'application desktop. Notre équipe technique vous répond en direct sous quelques heures.</p>
                  <div style="margin-top: 1rem;">
                    <a href="dashboard.html" class="aww-btn aww-btn-outline" data-magnetic><span class="aww-btn-text">Ouvrir un Ticket</span></a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
` + footerTemplate());

// 5. library.html
write('library.html', headTemplate('Library') + `
      <section class="aww-page-hero" style="height: 45vh; min-height: 380px;">
        <div class="aww-hero-content">
          <div class="aww-kicker" data-gsap="fade-up">04 — CLOUD ASSETS</div>
          <h1 class="aww-page-title" data-gsap="split-text">ASSET<br><span class="aww-text-stroke">LIBRARY</span></h1>
          <p class="aww-hero-desc" data-gsap="fade-up" data-delay="0.3" style="max-width: 650px; font-size: 1.2rem;">
            Explorez, filtrez et téléchargez en 1-clic des textures PBR 4K &amp; HD (Carbone, Métal, Cuir, Véhicules GTA V) prêtes pour l'atelier SR Editer.
          </p>
        </div>
      </section>

      <!-- Gate de connexion (quand non connecté) -->
      <section id="library-gate" class="aww-library-gate" data-gsap="fade-up">
        <div class="aww-gate-card">
          <div class="aww-gate-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2>Connexion requise pour la bibliothèque</h2>
          <p>Un compte SR Editer connecté est requis pour parcourir l'intégralité du catalogue cloud et télécharger les textures haute résolution.</p>
          <ul class="aww-gate-list">
            <li>✓ Catalogue complet de textures 4K &amp; HD certifiées GTA V / FiveM</li>
            <li>✓ Intégration instantanée dans le Texture Studio 2D de l'application</li>
            <li>✓ Téléchargements directs au format .dds et .webp</li>
          </ul>
          <a href="login.html?next=library.html" class="aww-btn aww-btn-solid aww-btn-full" data-magnetic>
            <span class="aww-btn-text">Se connecter au studio</span>
          </a>
          <p style="margin-top: 1.2rem; font-size: 0.9rem; color: var(--text-secondary);">
            Pas encore de compte ? <a href="login.html?mode=signup&amp;next=library.html" class="aww-link" style="color: var(--accent);">Créer un compte</a>
          </p>
        </div>
      </section>

      <p id="library-guest-hint" class="library-guest-hint" hidden></p>

      <!-- Application de bibliothèque (quand connecté) -->
      <section id="library-app" class="aww-library" hidden data-gsap="fade-up">
        <!-- Raccourcis de catégories rapides (Pills) -->
        <div class="library-category-pills" id="library-pills">
          <button type="button" class="pill-btn active" data-pill-cat="Tous">Tous</button>
          <button type="button" class="pill-btn" data-pill-cat="Couleurs GTA V / FiveM">GTA V &amp; FiveM</button>
          <button type="button" class="pill-btn" data-pill-cat="Badges &amp; Logos Vectoriels">Badges &amp; Logos</button>
          <button type="button" class="pill-btn" data-pill-cat="Dégradés">Dégradés</button>
          <button type="button" class="pill-btn" data-pill-cat="Couleur unie">Couleurs unies</button>
          <button type="button" class="pill-btn" data-pill-cat="Métal">Métal</button>
          <button type="button" class="pill-btn" data-pill-cat="Carbone/Plastique">Carbone</button>
          <button type="button" class="pill-btn" data-pill-cat="Néon/Lumière">Néon</button>
          <button type="button" class="pill-btn" data-pill-cat="Tissu/Cuir">Cuir &amp; Tissu</button>
        </div>

        <!-- Barre de recherche et filtres -->
        <div class="library-toolbar">
          <div class="search-input-wrap">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" id="library-search" class="aww-input" placeholder="Rechercher une texture (métal, carbone, néon, cuir...)" autocomplete="off">
          </div>

          <div class="select-filters">
            <select id="library-category" class="aww-select" aria-label="Catégorie">
              <option value="Tous">Toutes les catégories</option>
            </select>
            <select id="library-color" class="aww-select" aria-label="Couleur">
              <option value="Toutes">Toutes les couleurs</option>
            </select>
          </div>

          <div id="library-status" class="ticket-count-badge">Chargement...</div>
        </div>

        <!-- État vide si aucun résultat -->
        <div id="library-empty" class="aww-gate-card" style="margin: 3rem auto; max-width: 500px;" hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; color: var(--text-secondary); margin: 0 auto 12px; display: block;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
          <h2>Aucune texture trouvée</h2>
          <p>Aucun résultat ne correspond à vos critères de recherche.</p>
          <button type="button" class="aww-btn aww-btn-outline" id="reset-filters-btn" style="margin: 0 auto;">Réinitialiser les filtres</button>
        </div>

        <!-- Grille des textures -->
        <div id="library-grid" class="library-grid"></div>
      </section>
` + footerTemplate(`<script src="js/library-page.js"></script>`));

// 6. blog.html
write('blog.html', headTemplate('Blog &amp; Releases') + `
      <section class="aww-page-hero" style="height: 45vh; min-height: 380px;">
        <div class="aww-hero-content">
          <div class="aww-kicker" data-gsap="fade-up">05 — TRANSMISSIONS</div>
          <h1 class="aww-page-title" data-gsap="split-text">TRANSMISSIONS<br><span class="aww-text-stroke">&amp; PATCHES</span></h1>
          <p class="aww-hero-desc" data-gsap="fade-up" data-delay="0.3" style="max-width: 650px; font-size: 1.2rem;">
            Journal officiel des mises à jour, notes de version et annonces de développement de SR Editer.
          </p>
        </div>
      </section>

      <section class="aww-blog" data-gsap="fade-up">
        <!-- Conteneur de chargement -->
        <div id="changelog-loading" style="text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
          <div class="aww-spinner" style="margin: 0 auto 1.5rem;"></div>
          <p>Chargement des versions officielles depuis Supabase...</p>
        </div>

        <!-- Dernière Version en Vedette (Featured Hero Card) -->
        <div id="featured-release-container" style="display: none; margin-bottom: 4rem;"></div>

        <!-- Titre Versions Antérieures -->
        <div id="past-releases-header" style="display: none; margin-bottom: 2rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; justify-content: space-between; align-items: flex-end;">
          <h2 style="font-size: 2rem;">Historique des Versions</h2>
          <span id="releases-count-badge" class="ticket-count-badge">0 version</span>
        </div>

        <!-- Grille des Versions Antérieures -->
        <div id="changelog-container" class="aww-blog-list"></div>
      </section>

      <script>
        document.addEventListener("DOMContentLoaded", async () => {
          const loadingEl = document.getElementById("changelog-loading");
          const featuredEl = document.getElementById("featured-release-container");
          const pastHeader = document.getElementById("past-releases-header");
          const countBadge = document.getElementById("releases-count-badge");
          const listEl = document.getElementById("changelog-container");

          try {
            const client = (typeof window.getSRSupabase === "function" ? window.getSRSupabase() : null) || window.srSupabase;
            if (!client) throw new Error("Client Supabase non initialisé");

            const { data, error } = await client
              .from("release_records")
              .select("version, notes, artifact_url, updated_at")
              .eq("published", true)
              .order("updated_at", { ascending: false });

            if (error) throw error;

            if (loadingEl) loadingEl.style.display = "none";

            const releases = data && data.length ? data : [
              {
                version: "0.7.1",
                updated_at: new Date().toISOString(),
                notes: "SR Editer 0.7.1 — Version stable officielle avec moteur WebGL 3D et Texture Studio 2D.",
                artifact_url: "https://github.com/NALYD2400/SR-editer/releases/download/0.7.1/SR.Editer_0.7.1_x64-setup.exe"
              }
            ];

            const latest = releases[0];
            const others = releases.slice(1);

            if (countBadge) countBadge.textContent = releases.length + " version" + (releases.length > 1 ? "s" : "");

            // Rendu de la version la plus récente (Featured)
            if (featuredEl && latest) {
              const dateStr = new Date(latest.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
              featuredEl.style.display = "block";
              featuredEl.innerHTML = \`
                <div class="aww-featured-release">
                  <div class="aww-release-top">
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                      <span class="ticket-count-badge" style="background: rgba(52, 211, 153, 0.15); color: #34d399; border-color: rgba(52, 211, 153, 0.3);">
                        Dernière Version Stable
                      </span>
                      <span class="aww-release-tag">v\${latest.version}</span>
                    </div>
                    <span style="font-size: 0.9rem; color: var(--text-secondary);">Publiée le \${dateStr}</span>
                  </div>
                  <h2 style="font-size: clamp(2rem, 4vw, 3rem); margin: 1.5rem 0 1rem;">SR Editer Desktop v\${latest.version}</h2>
                  <div class="aww-release-notes" style="margin-bottom: 2rem;">\${formatNotes(latest.notes)}</div>
                  <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                    \${latest.artifact_url ? \`
                      <a href="\${latest.artifact_url}" class="aww-btn aww-btn-solid" data-magnetic>
                        <span class="aww-btn-text">Télécharger v\${latest.version} (.exe)</span>
                      </a>
                    \` : ''}
                    <a href="https://discord.gg/gNQwHGMRdT" target="_blank" rel="noopener" class="aww-btn aww-btn-outline" data-magnetic>
                      <span class="aww-btn-text">Rejoindre le Discord</span>
                    </a>
                  </div>
                </div>
              \`;
            }

            // Rendu des versions antérieures
            if (pastHeader && others.length > 0) pastHeader.style.display = "flex";
            if (listEl && others.length > 0) {
              listEl.innerHTML = others.map(rel => {
                const dateStr = new Date(rel.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
                return \`
                  <article class="aww-blog-post">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="aww-release-tag">v\${rel.version}</span>
                        <span class="ticket-count-badge" style="font-size: 0.75rem;">Archive</span>
                      </div>
                      <span style="font-size: 0.85rem; color: var(--text-secondary);">\${dateStr}</span>
                    </div>
                    <h3 style="font-size: 1.8rem; margin-bottom: 1rem;">Mise à jour v\${rel.version}</h3>
                    <div class="aww-release-notes" style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
                      \${formatNotes(rel.notes)}
                    </div>
                    \${rel.artifact_url ? \`
                      <a href="\${rel.artifact_url}" class="aww-btn aww-btn-outline" style="padding: 0.6rem 1.2rem; font-size: 0.8rem;" data-magnetic>
                        <span class="aww-btn-text">Télécharger v\${rel.version}</span>
                      </a>
                    \` : ''}
                  </article>
                \`;
              }).join("");
            }
          } catch (err) {
            console.error("Erreur chargement changelog:", err);
            if (loadingEl) {
              loadingEl.innerHTML = \`
                <div class="aww-featured-release">
                  <span class="ticket-count-badge">Build Windows Officiel</span>
                  <h2 style="font-size: 2.2rem; margin: 1rem 0;">SR Editer Desktop v0.7.1</h2>
                  <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Version stable avec prévisualisation WebGL et Texture Studio 2D.</p>
                  <a href="https://github.com/NALYD2400/SR-editer/releases/download/0.7.1/SR.Editer_0.7.1_x64-setup.exe" class="aww-btn aww-btn-solid">
                    <span class="aww-btn-text">Télécharger v0.7.1 (.exe)</span>
                  </a>
                </div>
              \`;
            }
          }
        });

        function formatNotes(notes) {
          if (!notes) return "Mise à jour d'amélioration générale.";
          const escaped = notes
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          return escaped.replace(/\\n/g, "<br>");
        }
      </script>
` + footerTemplate());

// 6. terms.html
write('terms.html', headTemplate("Conditions d'utilisation") + `
      <section class="aww-page-hero" style="min-height: 440px; padding-bottom: 3rem;">
        <div class="aww-hero-content">
          <div class="aww-kicker" data-gsap="fade-up">05 — CADRE LÉGAL &amp; CGU</div>
          <h1 class="aww-page-title" data-gsap="split-text">CONDITIONS<br><span class="aww-text-stroke">D'UTILISATION</span></h1>
          <p class="aww-hero-desc" data-gsap="fade-up" data-delay="0.3" style="max-width: 780px; font-size: 1.15rem;">
            Règles et conditions régissant l'utilisation du logiciel SR Editer, de l'espace client, des téléchargements et des services associés pour Grand Theft Auto V et FiveM.
          </p>
          <div class="aww-legal-meta" data-gsap="fade-up" data-delay="0.45">
            <span class="aww-legal-pill aww-legal-pill--accent">Version 0.7.1</span>
            <span class="aww-legal-pill">Dernière mise à jour : 3 août 2026</span>
            <span class="aww-legal-pill aww-legal-pill--emerald">Droit Français Applicable</span>
            <span class="aww-legal-pill">Paiements Sécurisés Stripe</span>
            <span class="aww-legal-pill">Non affilié à Rockstar Games</span>
          </div>
        </div>
      </section>

      <section class="aww-docs" data-gsap="fade-up">
        <div class="aww-docs-container">
          <aside class="aww-docs-sidebar" data-gsap="fade-right">
            <ul>
              <li><a href="#editeur" class="aww-toc-link">1. Éditeur</a></li>
              <li><a href="#objet" class="aww-toc-link">2. Objet</a></li>
              <li><a href="#compte" class="aww-toc-link">3. Compte</a></li>
              <li><a href="#licence" class="aww-toc-link">4. Licence</a></li>
              <li><a href="#abonnements" class="aww-toc-link">5. Abonnements</a></li>
              <li><a href="#propriete" class="aww-toc-link">6. Légalité &amp; Mods</a></li>
              <li><a href="#ia" class="aww-toc-link">7. IA &amp; Tiers</a></li>
              <li><a href="#maj" class="aww-toc-link">8. Mises à jour</a></li>
              <li><a href="#responsabilite" class="aww-toc-link">9. Responsabilité</a></li>
              <li><a href="#droit" class="aww-toc-link">10. Juridiction</a></li>
            </ul>
          </aside>

          <div class="aww-docs-content" data-gsap="fade-up">
            <!-- 1. EDITEUR -->
            <section id="editeur" class="aww-docs-section">
              <span class="ticket-count-badge">SECTION 01</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">1. Éditeur du Service</h2>
              <div class="aww-legal-card">
                <p>
                  Le service <strong>SR Editer</strong> (comprenant le site web, l'application desktop Windows, les serveurs d'authentification et les modules cloud) est édité et administré par l'exploitant du produit SR Editer.
                </p>
                <p>
                  <strong>Contact officiel &amp; Assistance :</strong><br>
                  • Serveur Discord Officiel : <a href="https://discord.gg/gNQwHGMRdT" target="_blank" rel="noopener" class="aww-link" style="color: var(--accent);">discord.gg/gNQwHGMRdT</a><br>
                  • Espace Client : via le gestionnaire de tickets sur <a href="dashboard.html" class="aww-link" style="color: var(--accent);">dashboard.html</a>.
                </p>
                <p style="font-size: 0.9rem; opacity: 0.75;">
                  <em>L'identité civile, l'adresse du siège social et les informations complètes d'immatriculation d'entreprise seront publiées dès validation définitive des formalités d'enregistrement.</em>
                </p>
              </div>
            </section>

            <!-- 2. OBJET -->
            <section id="objet" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 02</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">2. Objet &amp; Champ d'Application</h2>
              <div class="aww-legal-card">
                <p>
                  SR Editer est un studio d'ingénierie et d'édition assistée pour créateurs de contenus, moddeurs et serveurs FiveM. Il permet d'inspecter en lecture sécurisée, d'éditer en multi-calques et de prévisualiser en 3D des textures et archives de Grand Theft Auto V préalablement extraites.
                </p>
                <p>
                  Les présentes Conditions Générales d'Utilisation régissent de plein droit l'accès au site, le téléchargement de l'application, l'utilisation de l'espace membre et les souscriptions d'abonnements.
                </p>
              </div>
            </section>

            <!-- 3. COMPTE -->
            <section id="compte" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 03</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">3. Compte Utilisateur &amp; Éligibilité</h2>
              <div class="aww-legal-card">
                <p>L'accès aux fonctionnalités connectées nécessite la création d'un compte personnel authentifié via Supabase :</p>
                <ul>
                  <li>Vous devez renseigner une adresse électronique valide et maintenir la stricte confidentialité de vos identifiants d'accès.</li>
                  <li>Toute activité réalisée depuis votre compte est réputée effectuée sous votre entière responsabilité.</li>
                  <li>Tout partage non autorisé de licence, tentative d'intrusion, abus de bande passante ou comportement hostile entraînera la suspension immédiate du compte sans préavis ni remboursement.</li>
                </ul>
              </div>
            </section>

            <!-- 4. LICENCE -->
            <section id="licence" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 04</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">4. Licence d'Utilisation &amp; Droits</h2>
              <div class="aww-legal-card">
                <p>
                  Sous réserve de l'acceptation des présentes conditions et du respect de votre formule d'abonnement, nous vous concédons une licence personnelle, non exclusive, révocable et non transférable pour installer et exécuter SR Editer sur vos postes Windows autorisés.
                </p>
                <p>
                  <strong>Restrictions formelles :</strong> Il est strictement interdit d'altérer le binaire, de décompiler ou désassembler le code source, de contourner le mécanisme de protection par clé/jeton JWT, de revendre ou redistribuer les installateurs hors des canaux officiels SR Editer.
                </p>
              </div>
            </section>

            <!-- 5. ABONNEMENTS -->
            <section id="abonnements" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 05</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">5. Abonnements &amp; Modalités de Paiement</h2>
              <div class="aww-legal-card">
                <p>
                  Les fonctions avancées de sauvegarde, d'export vers archives RPF, d'accès à la bibliothèque de textures 4K et d'assistance prioritaire nécessitent la souscription d'un abonnement actif (Standard, Pro ou VIP).
                </p>
                <ul>
                  <li><strong>Traitement des paiements :</strong> Toutes les transactions financières sont traitées de manière chiffrée par <em>Stripe Inc.</em> certifié PCI-DSS de niveau 1. SR Editer ne stocke aucune coordonnée bancaire.</li>
                  <li><strong>Tarification :</strong> Les montants sont exprimés en Euros (€) toutes taxes applicables comprises selon votre juridiction de résidence.</li>
                  <li><strong>Résiliation :</strong> Vous pouvez résilier votre renouvellement automatique à tout moment en 1 clic depuis votre Espace Client (portail client Stripe). L'accès aux privilèges acquis demeure valide jusqu'au terme de l'échéance facturée.</li>
                </ul>
              </div>
            </section>

            <!-- 6. PROPRIETE -->
            <section id="propriete" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 06</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">6. Contenu Utilisateur &amp; Absence d'Affiliation</h2>
              <div class="aww-legal-card">
                <p>
                  <strong>Avertissement Trademark &amp; Affiliation :</strong> SR Editer est un outil logiciel indépendant développé par des passionnés pour la communauté de création numérique. SR Editer n'est en aucun cas sponsorisé, approuvé, lié ou affilié à Rockstar Games, Take-Two Interactive Software, Inc., Cfx.re ou FiveM. Toutes les marques et droits d'auteur associés aux jeux vidéo cités demeurent la propriété exclusive de leurs détenteurs respectifs.
                </p>
                <p>
                  Vous conservez l'entière propriété intellectuelle des créations, livrées, textures originales et modèles que vous réalisez avec SR Editer. Vous attestez posséder les droits nécessaires sur les ressources importées et vous engagez à respecter les conditions générales d'utilisation des plateformes et serveurs sur lesquels vous déployez vos créations.
                </p>
              </div>
            </section>

            <!-- 7. IA -->
            <section id="ia" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 07</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">7. Intelligence Artificielle &amp; Services Tiers</h2>
              <div class="aww-legal-card">
                <p>
                  Certaines fonctionnalités avancées de génération de variations de textures font appel à des modèles de vision et de diffusion tiers (OpenAI, Google Gemini, Hugging Face).
                </p>
                <ul>
                  <li>Ces modules s'exécutent au moyen de vos propres clés API renseignées dans l'application.</li>
                  <li>Les données soumises à ces services sont régies par les politiques de confidentialité de leurs fournisseurs respectifs.</li>
                  <li>SR Editer décline toute responsabilité quant à la disponibilité, la latence ou l'exactitude des résultats générés par ces API externes.</li>
                </ul>
              </div>
            </section>

            <!-- 8. MAJ -->
            <section id="maj" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 08</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">8. Disponibilité &amp; Mises à Jour</h2>
              <div class="aww-legal-card">
                <p>
                  Nous mettons en œuvre tous les moyens raisonnables pour assurer la disponibilité continue de l'infrastructure web et de la vérification de licences. Des interruptions pour maintenance ou mise à niveau peuvent survenir occasionnellement.
                </p>
                <p>
                  L'application intègre un protocole de mise à jour sécurisé et signé cryptographiquement. Nous nous réservons le droit de déployer des correctifs de stabilité ou de sécurité nécessaires à la compatibilité du studio.
                </p>
              </div>
            </section>

            <!-- 9. RESPONSABILITE -->
            <section id="responsabilite" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 09</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">9. Limitation de Responsabilité</h2>
              <div class="aww-legal-card">
                <p>
                  Dans les limites autorisées par la législation applicable, SR Editer est fourni « en l'état » et « selon disponibilité », sans garantie d'adéquation à un besoin spécifique.
                </p>
                <p>
                  L'éditeur ne saurait être tenu responsable d'éventuelles corruptions de fichiers de jeux originaux, de pertes de données de travail, de bugs graphiques ou d'incidents imputables à des manipulations directes d'archives. Il incombe à chaque utilisateur de réaliser des sauvegardes (backups) intégrales de ses dossiers de jeu avant toute opération de remplacement de texture.
                </p>
              </div>
            </section>

            <!-- 10. DROIT -->
            <section id="droit" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 10</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">10. Droit Applicable &amp; Règlement des Litiges</h2>
              <div class="aww-legal-card">
                <p>
                  Les présentes Conditions Générales d'Utilisation sont exclusivement soumises et interprétées conformément au <strong>droit français</strong>.
                </p>
                <p>
                  En cas de différend relatif à l'interprétation ou à l'exécution des présentes, les parties s'engagent à privilégier une conciliation amiable via notre support technique. À défaut de résolution amiable dans un délai de 30 jours, les tribunaux compétents français seront seuls habilités à trancher le litige.
                </p>
              </div>
            </section>

            <!-- CROSS-LINKS -->
            <div class="aww-legal-crosslinks">
              <a href="privacy.html" class="aww-btn aww-btn-solid" data-magnetic>
                <span class="aww-btn-text">Consulter la Politique de Confidentialité →</span>
              </a>
              <a href="docs.html" class="aww-btn aww-btn-outline" data-magnetic>
                <span class="aww-btn-text">Documentation Technique →</span>
              </a>
              <a href="index.html" class="aww-link" style="color: var(--text-secondary); font-size: 0.95rem;">
                ← Retour à l'accueil
              </a>
            </div>
          </div>
        </div>
      </section>
` + footerTemplate());

// 7. privacy.html
write('privacy.html', headTemplate('Politique de confidentialité') + `
      <section class="aww-page-hero" style="min-height: 440px; padding-bottom: 3rem;">
        <div class="aww-hero-content">
          <div class="aww-kicker" data-gsap="fade-up">06 — PROTECTION DES DONNÉES &amp; RGPD</div>
          <h1 class="aww-page-title" data-gsap="split-text">POLITIQUE DE<br><span class="aww-text-stroke">CONFIDENTIALITÉ</span></h1>
          <p class="aww-hero-desc" data-gsap="fade-up" data-delay="0.3" style="max-width: 780px; font-size: 1.15rem;">
            Transparence intégrale quant à la collecte, au traitement, au stockage et à la protection de vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD - UE 2016/679).
          </p>
          <div class="aww-legal-meta" data-gsap="fade-up" data-delay="0.45">
            <span class="aww-legal-pill aww-legal-pill--emerald">Conforme RGPD UE 2016/679</span>
            <span class="aww-legal-pill">Autorité : CNIL France</span>
            <span class="aww-legal-pill aww-legal-pill--accent">Chiffrement TLS 1.3 / AES-256</span>
            <span class="aww-legal-pill">Mods &amp; Textures 100% Locaux</span>
            <span class="aww-legal-pill">Zéro Vente de Données</span>
          </div>
        </div>
      </section>

      <section class="aww-docs" data-gsap="fade-up">
        <div class="aww-docs-container">
          <aside class="aww-docs-sidebar" data-gsap="fade-right">
            <ul>
              <li><a href="#responsable" class="aww-toc-link">1. Responsable</a></li>
              <li><a href="#donnees" class="aww-toc-link">2. Données</a></li>
              <li><a href="#finalites" class="aww-toc-link">3. Finalités</a></li>
              <li><a href="#sous-traitants" class="aww-toc-link">4. Partenaires</a></li>
              <li><a href="#conservation" class="aww-toc-link">5. Conservation</a></li>
              <li><a href="#droits" class="aww-toc-link">6. Droits RGPD</a></li>
              <li><a href="#securite" class="aww-toc-link">7. Sécurité</a></li>
              <li><a href="#ia-donnees" class="aww-toc-link">8. Modules IA</a></li>
              <li><a href="#contact" class="aww-toc-link">9. Contact &amp; DPO</a></li>
            </ul>
          </aside>

          <div class="aww-docs-content" data-gsap="fade-up">
            <!-- 1. RESPONSABLE -->
            <section id="responsable" class="aww-docs-section">
              <span class="ticket-count-badge">SECTION 01</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">1. Responsable du Traitement</h2>
              <div class="aww-legal-card">
                <p>
                  Le responsable du traitement des données à caractère personnel collectées sur le site <a href="https://sr-editer.vercel.app/" class="aww-link" style="color: var(--accent);">sr-editer.vercel.app</a> et au travers de l'application desktop est l'exploitant du produit <strong>SR Editer</strong>.
                </p>
                <p>
                  <strong>Contact Délégué / Référent Données :</strong><br>
                  • Serveur Discord officiel : <a href="https://discord.gg/gNQwHGMRdT" target="_blank" rel="noopener" class="aww-link" style="color: var(--accent);">discord.gg/gNQwHGMRdT</a><br>
                  • Espace Client : messagerie d'assistance sécurisée accessible sur votre tableau de bord.
                </p>
                <p style="font-size: 0.9rem; opacity: 0.75;">
                  <em>Les mentions nominatives du responsable d'exploitation seront actualisées dès l'immatriculation d'entreprise en cours.</em>
                </p>
              </div>
            </section>

            <!-- 2. DONNEES -->
            <section id="donnees" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 02</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">2. Données Personnelles Collectées</h2>
              <div class="aww-legal-card">
                <p>Nous appliquons le principe de minimisation des données. Ne sont collectées que les informations strictement indispensables :</p>
                <ul>
                  <li><strong>Données de Compte :</strong> Adresse e-mail, mot de passe hashé de manière cryptographique et irréversible (via Supabase Auth - algorithme Scrypt/Bcrypt), identifiants d'authentification uniques. Si vous optez pour la connexion via Discord OAuth, nous collectons uniquement votre identifiant public Discord, votre nom d'utilisateur et votre avatar.</li>
                  <li><strong>Données de Facturation &amp; Abonnement :</strong> Identifiant technique de client Stripe (Customer ID), statut d'abonnement actif (Standard, Pro, VIP), date d'échéance. <em>Attention : vos numéros de cartes bancaires sont traités exclusivement par Stripe et ne transitent jamais sur nos serveurs.</em></li>
                  <li><strong>Données Techniques &amp; Télémétrie Minimale :</strong> Version de l'application, système d'exploitation (Windows 10/11), journaux d'erreurs techniques pour le dépannage de plantages (crash dumps anonymisés).</li>
                  <li><strong>Fichiers de Modding &amp; Textures (Strictement Locaux) :</strong> Vos archives RPF, fichiers .ytd, projets de peinture 2D et modèles 3D restent hébergés sur votre propre disque dur. SR Editer n'effectue aucun téléversement de vos fichiers de jeu vers nos serveurs sans votre action volontaire explicite.</li>
                </ul>
              </div>
            </section>

            <!-- 3. FINALITES -->
            <section id="finalites" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 03</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">3. Finalités &amp; Bases Légales</h2>
              <div class="aww-legal-card">
                <p>Chaque traitement repose sur une base juridique claire au sens de l'article 6 du RGPD :</p>
                <ul>
                  <li><strong>Exécution du Contrat :</strong> Création de votre compte, gestion de vos droits d'accès au studio, vérification de votre licence d'utilisation et livraison des mises à jour logicielles.</li>
                  <li><strong>Obligation Légale :</strong> Tenue de la comptabilité générale et conservation des justificatifs de facturation par Stripe.</li>
                  <li><strong>Intérêt Légitime :</strong> Prévention des tentatives de fraude, protection contre les attaques par déni de service, amélioration des performances du moteur graphique et assistance aux utilisateurs via les tickets.</li>
                </ul>
              </div>
            </section>

            <!-- 4. SOUS-TRAITANTS -->
            <section id="sous-traitants" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 04</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">4. Sous-traitants &amp; Hébergement</h2>
              <div class="aww-legal-card">
                <p>Pour assurer la fiabilité et la haute sécurité du service, nous collaborons avec des prestataires d'infrastructure reconnus :</p>
                <ul>
                  <li><strong>Supabase Inc. :</strong> Hébergement de la base de données PostgreSQL chiffrée et gestionnaire d'authentification (certifié SOC 2 Type II, conformité RGPD).</li>
                  <li><strong>Stripe Payments Europe :</strong> Prestataire de paiement en ligne certifié PCI-DSS Level 1.</li>
                  <li><strong>Vercel Inc. :</strong> Réseau de diffusion de contenu (CDN) et hébergement du portail web avec certificats TLS automatiques.</li>
                  <li><strong>GitHub Inc. :</strong> Hébergement des artefacts de déploiement, binaires d'installation et notes de version officielles.</li>
                  <li><strong>Discord Inc. :</strong> Passerelle d'authentification OAuth2 optionnelle et gestion communautaire.</li>
                </ul>
              </div>
            </section>

            <!-- 5. CONSERVATION -->
            <section id="conservation" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 05</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">5. Durée de Conservation des Données</h2>
              <div class="aww-legal-card">
                <p>
                  Les données associées à votre compte utilisateur sont conservées tant que celui-ci est actif. En cas d'inactivité prolongée supérieure à 24 mois sans abonnement actif, le compte pourra faire l'objet d'un archivage ou d'une suppression après avertissement préalable par e-mail.
                </p>
                <p>
                  En cas de demande de suppression formulée par l'utilisateur, l'effacement de toutes les données personnelles intervient sous un délai maximal de 30 jours, à l'exception des données de facturation dont la conservation est requise par la loi fiscale française (10 ans).
                </p>
              </div>
            </section>

            <!-- 6. DROITS -->
            <section id="droits" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 06</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">6. Vos Droits Informatique &amp; Libertés (RGPD)</h2>
              <div class="aww-legal-card">
                <p>Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants à l'égard de vos données :</p>
                <ul>
                  <li><strong>Droit d'accès :</strong> Obtenir la confirmation que vos données sont traitées et en obtenir une copie complète.</li>
                  <li><strong>Droit de rectification :</strong> Modifier toute information inexacte ou incomplète directement depuis votre profil.</li>
                  <li><strong>Droit à l'effacement (« Droit à l'oubli ») :</strong> Exiger la suppression définitive de votre compte et de vos données.</li>
                  <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré, couramment utilisé et lisible par machine (JSON/CSV).</li>
                  <li><strong>Droit d'opposition et de limitation :</strong> Vous opposer à certains traitements non essentiels ou demander le gel temporaire de vos données.</li>
                </ul>
              </div>
            </section>

            <!-- 7. SECURITE -->
            <section id="securite" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 07</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">7. Mesures de Sécurité &amp; Chiffrement</h2>
              <div class="aww-legal-card">
                <p>Nous implémentons les meilleures pratiques de sécurité de l'industrie pour prémunir vos informations contre tout accès non autorisé :</p>
                <ul>
                  <li>Chiffrement systématique de toutes les communications par le protocole HTTPS avec TLS 1.3.</li>
                  <li>Mots de passe hashés avec sels cryptographiques puissants via Supabase Auth.</li>
                  <li>Contrôles d'accès basés sur des jetons JWT à validité éphémère avec rotation automatique des clés de rafraîchissement.</li>
                  <li>Architecture native Tauri en Rust isolée dans des bacs à sable (sandbox) mémoires rigides.</li>
                </ul>
              </div>
            </section>

            <!-- 8. IA-DONNEES -->
            <section id="ia-donnees" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 08</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">8. Traitement des Données pour les Outils IA</h2>
              <div class="aww-legal-card">
                <p>
                  Si vous activez les modules d'assistance par Intelligence Artificielle intégrés à SR Editer :
                </p>
                <ul>
                  <li>Vos clés d'API (OpenAI, Google Gemini) sont stockées exclusivement sur votre poste local au sein d'un trousseau chiffré.</li>
                  <li>Vos prompts de texturation et images générées ne sont ni revendus, ni conservés sur nos serveurs, ni utilisés pour l'entraînement de modèles IA sans votre accord préalable exprès.</li>
                </ul>
              </div>
            </section>

            <!-- 9. CONTACT -->
            <section id="contact" class="aww-docs-section" style="margin-top: 4rem;">
              <span class="ticket-count-badge">SECTION 09</span>
              <h2 style="font-size: clamp(2rem, 3.5vw, 2.8rem); margin: 1rem 0 1.25rem;">9. Exercice de Vos Droits &amp; Réclamation CNIL</h2>
              <div class="aww-legal-card">
                <p>
                  Pour toute question relative à cette politique de confidentialité ou pour exercer vos droits d'accès, de rectification ou de suppression de données, vous pouvez nous contacter :
                </p>
                <p>
                  • Par l'intermédiaire de votre <strong>Espace Client</strong> (rubrique Support / Tickets)<br>
                  • Sur notre <strong>Discord Officiel</strong> : <a href="https://discord.gg/gNQwHGMRdT" target="_blank" rel="noopener" class="aww-link" style="color: var(--accent);">discord.gg/gNQwHGMRdT</a>
                </p>
                <p>
                  Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous disposez du droit d'introduire une réclamation auprès de la <strong>Commission Nationale de l'Informatique et des Libertés (CNIL)</strong> :<br>
                  3 Place de Fontenoy - TSA 80715 - 75334 Paris Cedex 07 · Site web : <a href="https://www.cnil.fr" target="_blank" rel="noopener" class="aww-link" style="color: var(--accent);">cnil.fr</a>.
                </p>
              </div>
            </section>

            <!-- CROSS-LINKS -->
            <div class="aww-legal-crosslinks">
              <a href="terms.html" class="aww-btn aww-btn-solid" data-magnetic>
                <span class="aww-btn-text">Consulter les Conditions d'Utilisation →</span>
              </a>
              <a href="dashboard.html" class="aww-btn aww-btn-outline" data-magnetic>
                <span class="aww-btn-text">Accéder à l'Espace Client →</span>
              </a>
              <a href="index.html" class="aww-link" style="color: var(--text-secondary); font-size: 0.95rem;">
                ← Retour à l'accueil
              </a>
            </div>
          </div>
        </div>
      </section>
` + footerTemplate());

console.log('All Awwwards pages generated successfully.');

