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
        <div class="aww-hero-content">
          <div class="aww-kicker" data-gsap="fade-up">01 — NEXT GEN STUDIO</div>
          <h1 class="aww-hero-heading" data-gsap="split-text">
            TEXTURE<br>
            <span class="aww-text-stroke">ENGINEERING</span><br>
            REDEFINED.
          </h1>
          <p class="aww-hero-desc" data-gsap="fade-up" data-delay="0.4">
            Real-time modding workshop. 2D textures, 3D viewport, and RPF archives without ever restarting your game.
          </p>
          <div class="aww-hero-actions" data-gsap="fade-up" data-delay="0.6">
            <a href="#features" class="aww-btn aww-btn-outline" data-magnetic>
              <span class="aww-btn-text">EXPLORE CORE</span>
            </a>
            <a href="#" class="aww-btn aww-btn-solid btn-download" id="download-btn" data-magnetic>
              <span class="aww-btn-text">DOWNLOAD x64</span>
            </a>
          </div>
        </div>
      </section>

      <section class="aww-features" id="features">
        <div class="aww-section-header">
          <h2 class="aww-section-title" data-gsap="split-text">REVOLUTIONARY<br>WORKFLOW</h2>
        </div>
        <div class="aww-feature-grid">
          <div class="aww-feature-card" data-gsap="card-reveal">
            <div class="aww-card-num">01</div>
            <h3>ATLAS UV & 4K LAYERS</h3>
            <p>Non-destructive multi-layer editing with real-time alpha masks. Native support for DDS BC7, DXT5, and PNG.</p>
          </div>
          <div class="aww-feature-card" data-gsap="card-reveal">
            <div class="aww-card-num">02</div>
            <h3>WEBGL 2.0 VIEWPORT</h3>
            <p>Real-time physical rendering and RAGE shaders. 360° orbit, HDRI studio illumination, and zero sync delay.</p>
          </div>
          <div class="aww-feature-card" data-gsap="card-reveal">
            <div class="aww-card-num">03</div>
            <h3>ROCKSTAR RSC7</h3>
            <p>Direct RPF exploration and atomic saves. Surgical injection of .ytd, .ydr, .yft, and .ydd formats.</p>
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
              <li><a href="#getting-started" class="aww-link"><span class="aww-link-inner" data-hover="Démarrage">Démarrage</span></a></li>
              <li><a href="#installation" class="aww-link"><span class="aww-link-inner" data-hover="Installation">Installation</span></a></li>
              <li><a href="#texture-studio" class="aww-link"><span class="aww-link-inner" data-hover="Texture Studio">Texture Studio</span></a></li>
              <li><a href="#viewport-3d" class="aww-link"><span class="aww-link-inner" data-hover="Viewport 3D">Viewport 3D</span></a></li>
              <li><a href="#rpf-archives" class="aww-link"><span class="aww-link-inner" data-hover="Archives RPF">Archives RPF</span></a></li>
              <li><a href="#faq" class="aww-link"><span class="aww-link-inner" data-hover="FAQ &amp; Support">FAQ &amp; Support</span></a></li>
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

// Write CSS
const cssContent = `
/* Awwwards Style CSS */
:root {
  --bg-color: #030303;
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.5);
  --accent: #8b5cf6;
  --border-color: rgba(255, 255, 255, 0.1);
  --font-heading: 'Clash Display', sans-serif;
  --font-body: 'Satoshi', sans-serif;
  --ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
[hidden] { display: none !important; }

body.aww-page {
  background-color: var(--bg-color);
  color: var(--text-primary);
  font-family: var(--font-body);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* Background Video */
.site-bg-container {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  z-index: -1;
  pointer-events: none;
}
.site-bg-video {
  width: 100%; height: 100%;
  object-fit: cover;
  opacity: 0.7;
}
.site-bg-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: radial-gradient(circle at center, rgba(3,3,3,0.3) 0%, var(--bg-color) 100%);
}

/* Background Grain */
.site-bg-grain {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none;
  z-index: 1;
  opacity: 0.06;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}

/* Custom Cursor */
.custom-cursor {
  position: fixed;
  top: 0; left: 0;
  width: 20px; height: 20px;
  background: var(--accent);
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: difference;
  transform: translate(-50%, -50%);
  transition: width 0.3s, height 0.3s;
}
.custom-cursor.hover {
  width: 60px; height: 60px;
}

/* Typography */
h1, h2, h3, .aww-font-heading {
  font-family: var(--font-heading);
  text-transform: uppercase;
  font-weight: 600;
  line-height: 0.9;
}
.aww-text-stroke {
  background: linear-gradient(135deg, var(--accent) 0%, #d946ef 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--accent);
  -webkit-text-stroke: 0;
  display: inline-block;
}

/* Header */
.aww-header {
  position: fixed;
  top: 0; left: 0; width: 100%;
  padding: 2rem 4rem;
  z-index: 100;
  mix-blend-mode: difference;
}
.aww-header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.aww-logo {
  display: flex; align-items: center; gap: 1rem;
  text-decoration: none; color: var(--text-primary);
}
.aww-logo img { width: 40px; border-radius: 8px; }
.aww-logo-text { font-family: var(--font-heading); font-size: 1.2rem; line-height: 1; }
.aww-nav {
  display: flex; gap: 3rem;
}
.aww-link {
  text-decoration: none;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  position: relative;
  overflow: hidden;
  display: inline-block;
}
.aww-link-inner {
  display: block;
  transition: transform 0.4s var(--ease-out-expo);
}
.aww-link-inner::after {
  content: attr(data-hover);
  position: absolute;
  left: 0;
  top: 100%;
  color: var(--accent);
}
.aww-link:hover .aww-link-inner {
  transform: translateY(-100%);
}

/* Buttons */
.aww-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 2rem;
  border-radius: 100px;
  font-family: var(--font-heading);
  text-transform: uppercase;
  font-size: 0.9rem;
  letter-spacing: 1px;
  text-decoration: none;
  cursor: pointer;
  background: transparent;
  position: relative;
  overflow: hidden;
  transition: all 0.4s var(--ease-out-expo);
}
.aww-btn-outline {
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}
.aww-btn-outline:hover {
  background: var(--text-primary);
  color: var(--bg-color);
}
.aww-btn-solid {
  background: var(--text-primary);
  color: var(--bg-color);
  border: 1px solid var(--text-primary);
}
.aww-btn-solid:hover {
  background: var(--accent);
  border-color: var(--accent);
}
.aww-btn-massive {
  font-size: 1.5rem;
  padding: 2rem 4rem;
}
button.aww-btn {
  appearance: none;
}
button:disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* Hero */
.aww-hero, .aww-page-hero {
  height: 100vh;
  display: flex;
  align-items: center;
  padding: 0 4rem;
}
.aww-hero-content {
  max-width: 1200px;
}
.aww-kicker {
  color: var(--accent);
  font-family: var(--font-heading);
  margin-bottom: 2rem;
}
.aww-hero-heading, .aww-page-title {
  font-size: clamp(4rem, 10vw, 10rem);
  margin-bottom: 2rem;
}
.aww-hero-desc {
  font-size: 1.5rem;
  color: var(--text-secondary);
  max-width: 600px;
  margin-bottom: 3rem;
  line-height: 1.4;
}
.aww-hero-actions {
  display: flex; gap: 1rem;
}

/* Features */
.aww-features {
  padding: 10rem 4rem;
}
.aww-section-title {
  font-size: clamp(3rem, 6vw, 6rem);
  margin-bottom: 5rem;
}
.aww-feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}
.aww-feature-card {
  padding: 3rem;
  border: 1px solid var(--border-color);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  transition: transform 0.4s var(--ease-out-expo);
}
.aww-feature-card:hover {
  transform: translateY(-10px);
  border-color: var(--accent);
}
.aww-card-num {
  font-family: var(--font-heading);
  font-size: 2rem;
  color: var(--accent);
  margin-bottom: 4rem;
}
.aww-feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}
.aww-feature-card p {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Footer */
.aww-footer {
  padding: 10rem 4rem 4rem;
  border-top: 1px solid var(--border-color);
}
.aww-footer-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 10rem;
}
.aww-footer-title {
  font-size: clamp(4rem, 8vw, 8rem);
}
.aww-footer-bottom {
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
.aww-footer-links {
  display: flex; gap: 2rem;
}

/* Dashboard */
.aww-loading {
  position: fixed;
  inset: 0; background: var(--bg-color);
  z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center;
  transition: opacity 0.4s;
}
.aww-loading.fade-out { opacity: 0; pointer-events: none; }
.aww-spinner { width: 40px; height: 40px; border: 2px solid var(--border-color); border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; }
@keyframes spin { 100% { transform: rotate(360deg); } }
.aww-dashboard { padding: 0 4rem 4rem; min-height: 50vh; }
.aww-dash-grid { display: grid; grid-template-columns: 300px 1fr; gap: 4rem; }
.aww-dash-sidebar { border-right: 1px solid var(--border-color); padding-right: 4rem; }
.aww-user-profile { margin-bottom: 4rem; }
.aww-avatar { width: 64px; height: 64px; background: var(--accent); color: var(--bg-color); border-radius: 50%; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; font-family: var(--font-heading); font-size: 2rem; overflow: hidden; }
.aww-avatar.has-image img { width: 100%; height: 100%; object-fit: cover; }
.aww-badge { display: inline-block; padding: 0.25rem 0.75rem; background: rgba(255,255,255,0.1); border-radius: 100px; font-size: 0.8rem; font-family: var(--font-heading); margin-top: 0.5rem; text-transform: uppercase; }
.aww-dash-nav { display: flex; flex-direction: column; gap: 1rem; }
.aww-dash-tab { background: none; border: none; color: var(--text-secondary); text-align: left; font-size: 1.2rem; font-family: var(--font-heading); cursor: pointer; transition: color 0.3s; text-transform: uppercase; }
.aww-dash-tab:hover, .aww-dash-tab.active { color: var(--text-primary); }
.aww-text-danger { color: #ff4e4e !important; }
.aww-panel { display: none; }
.aww-panel.active { display: block; animation: fadeIn 0.5s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.aww-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin-top: 3rem; }
.aww-stat-card { padding: 2rem; border: 1px solid var(--border-color); border-radius: 16px; }
.aww-stat-val { font-size: 2rem; font-family: var(--font-heading); margin-top: 1rem; color: var(--accent); }

/* Pricing Cards */
.aww-pricing-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin-top: 2rem; }
.aww-pricing-card { padding: 2rem; border: 1px solid var(--border-color); border-radius: 16px; display: flex; flex-direction: column; }
.aww-pricing-card.is-current { border-color: var(--accent); background: rgba(216, 255, 78, 0.05); }
.aww-pricing-card h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }
.aww-pricing-card .price { font-size: 2rem; font-family: var(--font-heading); margin-bottom: 2rem; }
.aww-pricing-card button { margin-top: auto; }

/* Auth */
.aww-auth-section { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 4rem; }
.aww-auth-container { width: 100%; max-width: 500px; padding: 4rem; border: 1px solid var(--border-color); border-radius: 24px; background: rgba(0,0,0,0.5); backdrop-filter: blur(20px); }
.aww-auth-title { font-size: 4rem; margin-bottom: 1rem; text-align: center; }
.aww-input-group { margin-bottom: 2rem; }
.aww-input-group label { display: block; font-family: var(--font-heading); margin-bottom: 0.5rem; color: var(--text-secondary); }
.aww-input { width: 100%; background: none; border: none; border-bottom: 1px solid var(--border-color); color: var(--text-primary); font-size: 1.2rem; padding: 0.5rem 0; outline: none; transition: border-color 0.3s; }
.aww-input:focus { border-color: var(--accent); }
.aww-btn-full { width: 100%; margin-top: 1rem; }
.aww-auth-footer { margin-top: 2rem; text-align: center; }
.aww-text-btn { background: none; border: none; color: var(--text-secondary); cursor: pointer; font-family: var(--font-body); text-decoration: underline; font-size: 1rem; }
.aww-auth-error { color: #ff4e4e; margin-top: 1rem; text-align: center; }
.aww-auth-error.is-visible { display: block; }

/* Misc pages */
.aww-docs { padding: 0 4rem 10rem; }
.aww-docs-container { display: grid; grid-template-columns: 250px 1fr; gap: 4rem; }
.aww-docs-sidebar ul { list-style: none; display: flex; flex-direction: column; gap: 1rem; position: sticky; top: 120px; }
.aww-docs-section { scroll-margin-top: 120px; }
.aww-docs-content h2 { font-size: 3rem; margin: 4rem 0 2rem; }
.aww-docs-content p { color: var(--text-secondary); font-size: 1.15rem; margin-bottom: 1.5rem; line-height: 1.65; }
.aww-docs-card { padding: 2.25rem; border: 1px solid var(--border-color); border-radius: 18px; margin: 2rem 0; background: rgba(255, 255, 255, 0.02); }

/* Library Styles */
.aww-library { padding: 0 4rem 10rem; }
.aww-library-gate { padding: 3rem 2rem 8rem; display: flex; justify-content: center; }
.aww-gate-card { max-width: 620px; width: 100%; padding: 3.5rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 24px; text-align: center; backdrop-filter: blur(20px); }
.aww-gate-icon { width: 64px; height: 64px; border-radius: 16px; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); color: var(--accent); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
.aww-gate-list { list-style: none; text-align: left; margin: 2rem 0; display: flex; flex-direction: column; gap: 0.75rem; color: var(--text-secondary); font-size: 0.95rem; }
.library-category-pills { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 2rem; }
.pill-btn { background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 0.5rem 1.25rem; border-radius: 100px; font-family: var(--font-heading); font-size: 0.85rem; cursor: pointer; transition: all 0.25s; text-transform: uppercase; }
.pill-btn:hover, .pill-btn.active { background: #fff; color: #000; border-color: #fff; }
.library-toolbar { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-bottom: 3rem; }
.search-input-wrap { position: relative; flex: 1; min-width: 260px; }
.search-input-wrap .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: var(--text-secondary); pointer-events: none; }
.library-toolbar input { width: 100%; padding: 0.85rem 1rem 0.85rem 2.75rem; border-radius: 12px; border: 1px solid var(--border-color); background: rgba(255, 255, 255, 0.02); color: #fff; font-size: 0.95rem; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
.library-toolbar input:focus { border-color: var(--accent); }
.select-filters { display: flex; gap: 0.75rem; }
.select-filters select { padding: 0.85rem 1.25rem; border-radius: 12px; border: 1px solid var(--border-color); background: #0e0e12; color: #fff; font-size: 0.9rem; outline: none; cursor: pointer; }
.library-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.75rem; }
.library-card { border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; background: rgba(255, 255, 255, 0.02); display: flex; flex-direction: column; transition: transform 0.3s, border-color 0.3s; }
.library-card:hover { transform: translateY(-6px); border-color: var(--accent); }
.library-card-preview { aspect-ratio: 1; background: #0c0c0f; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.library-card-preview img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
.library-card:hover .library-card-preview img { transform: scale(1.06); }
.library-card-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; flex: 1; }
.library-card-body h3 { font-size: 1.1rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.library-card-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.library-chip { font-size: 0.75rem; padding: 2px 8px; border-radius: 6px; background: rgba(139, 92, 246, 0.15); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.3); font-weight: 600; text-transform: uppercase; }
.library-download { margin-top: auto; padding: 0.75rem; border-radius: 8px; border: none; background: #fff; color: #000; font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; cursor: pointer; text-transform: uppercase; transition: background 0.2s, transform 0.2s; }
.library-download:hover { background: var(--accent); color: #fff; }

/* Blog & Releases Styles */
.aww-blog { padding: 0 4rem 10rem; max-width: 1000px; margin: 0 auto; }
.aww-featured-release { padding: 3.5rem; border: 1px solid rgba(139, 92, 246, 0.35); border-radius: 24px; background: rgba(139, 92, 246, 0.03); backdrop-filter: blur(16px); }
.aww-release-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.aww-release-tag { font-family: monospace; font-size: 1.1rem; font-weight: 700; color: var(--accent); background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }
.aww-release-notes { line-height: 1.8; color: var(--text-secondary); font-size: 1.05rem; }
.aww-blog-post { border-bottom: 1px solid var(--border-color); padding: 3rem 0; }

#discord-required-modal {
  position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 9999;
  display: flex; align-items: center; justify-content: center;
}
.discord-required-dialog {
  background: var(--bg-color); padding: 2rem; border: 1px solid var(--border-color); border-radius: 16px;
  max-width: 400px; text-align: center;
}
.discord-required-dialog p { margin-bottom: 1.5rem; line-height: 1.4; }
.discord-required-dialog a, .discord-required-dialog button { display: block; width: 100%; padding: 1rem; margin-bottom: 0.5rem; border-radius: 8px; font-family: var(--font-heading); text-decoration: none; cursor: pointer; }
.discord-required-dialog a { background: var(--text-primary); color: var(--bg-color); }
.discord-required-dialog button { background: none; border: 1px solid var(--border-color); color: var(--text-primary); }

/* Responsive Design */
@media (max-width: 768px) {
  .aww-feature-grid, 
  .aww-dash-grid, 
  .aww-stats-grid, 
  .aww-pricing-cards, 
  .aww-docs-container, 
  .aww-library-grid {
    grid-template-columns: 1fr;
  }
  
  .aww-header {
    padding: 1.5rem 2rem;
  }
  
  .aww-hero, .aww-page-hero, .aww-auth-section {
    padding-left: 2rem;
    padding-right: 2rem;
  }
  
  .aww-features, .aww-footer, .aww-docs, .aww-library, .aww-blog {
    padding: 6rem 2rem;
  }

  .aww-dashboard {
    padding: 0 2rem 2rem;
  }
  
  .aww-dash-sidebar {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    padding-right: 0;
    padding-bottom: 2rem;
  }

  .aww-hero-heading, .aww-page-title {
    font-size: clamp(2.5rem, 10vw, 4rem);
  }
  
  .aww-section-title, .aww-footer-title {
    font-size: clamp(2rem, 8vw, 3rem);
  }
  
  .aww-auth-container {
    padding: 2rem;
  }
}

/* Modals & Dialogs */
.aww-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  opacity: 1;
  transition: opacity 0.25s ease;
}
.aww-modal-backdrop[hidden] {
  display: none !important;
}
.aww-modal-window {
  background: #0d0d0f;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  width: 100%;
  max-width: 620px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
  position: relative;
  animation: awwModalPop 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes awwModalPop {
  0% { transform: scale(0.95) translateY(12px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

.aww-modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.aww-modal-title {
  font-family: var(--font-heading);
  font-size: 1.3rem;
  color: #fff;
  letter-spacing: 0.02em;
}
.aww-modal-close {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.aww-modal-close:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}
.aww-modal-body {
  padding: 2rem;
  overflow-y: auto;
}
.aww-modal-footer {
  padding: 1.25rem 2rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

/* Support Tickets Styles */
.support-tickets-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}
.ticket-count-badge {
  font-size: 0.8rem;
  background: rgba(139, 92, 246, 0.18);
  color: #c084fc;
  border: 1px solid rgba(139, 92, 246, 0.35);
  padding: 4px 12px;
  border-radius: 999px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.portal-btn.ticket-action-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.portal-btn.ticket-action-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
}

/* Form Controls */
.aww-select {
  width: 100%;
  background: #111114;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  outline: none;
  transition: border-color 0.2s;
  cursor: pointer;
}
.aww-select:focus {
  border-color: var(--accent);
}
.aww-textarea {
  width: 100%;
  background: #111114;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  outline: none;
  resize: vertical;
  min-height: 100px;
  font-family: var(--font-body);
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.aww-textarea:focus {
  border-color: var(--accent);
}

/* Liquid Checkout Styles */
.liquid-checkout-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}
.liquid-checkout-modal-content {
  background: #0f0f13;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 24px;
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2.5rem;
  position: relative;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.8);
}
.liquid-checkout-close {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.4rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.liquid-checkout-close:hover {
  background: rgba(255, 255, 255, 0.2);
}
.liquid-checkout-badge {
  display: inline-block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: var(--accent);
  background: rgba(139, 92, 246, 0.15);
  padding: 4px 12px;
  border-radius: 999px;
  margin-bottom: 0.75rem;
}
.liquid-checkout-price {
  font-size: 2rem;
  font-family: var(--font-heading);
  color: #fff;
  margin: 0.5rem 0 1.5rem;
}
.liquid-checkout-price span {
  font-size: 1rem;
  color: var(--text-secondary);
  font-family: var(--font-body);
}
.liquid-checkout-error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
  padding: 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}
.liquid-checkout-spinner {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}
.liquid-checkout-footer {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Account delete confirmation */
.delete-account-box {
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 14px;
  padding: 1.5rem;
  margin-top: 1.5rem;
}
.delete-account-box p {
  color: #fca5a5;
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

/* Mobile Burger & Navigation Drawer */
.aww-burger-btn {
  display: none;
  background: none;
  border: 1px solid var(--border-color);
  width: 42px;
  height: 42px;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 5px;
  z-index: 101;
  transition: border-color 0.2s, background 0.2s;
}
.aww-burger-btn span {
  display: block;
  width: 18px;
  height: 2px;
  background: #fff;
  border-radius: 2px;
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.aww-burger-btn:hover {
  border-color: var(--accent);
  background: rgba(255, 255, 255, 0.05);
}
.is-menu-open .aww-burger-btn span:nth-child(1) {
  transform: translateY(3.5px) rotate(45deg);
}
.is-menu-open .aww-burger-btn span:nth-child(2) {
  transform: translateY(-3.5px) rotate(-45deg);
}

@media (max-width: 860px) {
  .aww-burger-btn {
    display: flex;
  }
  .aww-nav {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(4, 4, 6, 0.97);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2.25rem;
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
    z-index: 99;
  }
  .is-menu-open .aww-nav {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }
  .is-menu-open .aww-nav .aww-link {
    font-size: 2rem;
    font-family: var(--font-heading);
    letter-spacing: 0.05em;
  }
  .aww-header {
    padding: 1.25rem 1.5rem;
  }
  .aww-header-actions .aww-btn-outline {
    display: none;
  }
  .aww-hero-heading, .aww-page-title {
    font-size: clamp(2.4rem, 9vw, 4.5rem);
    line-height: 0.95;
  }
  .aww-hero-desc {
    font-size: 1.15rem;
  }
  .aww-hero-actions {
    flex-direction: column;
    width: 100%;
    max-width: 320px;
  }
  .aww-hero-actions .aww-btn {
    width: 100%;
  }
  .aww-dash-nav {
    flex-direction: row;
    overflow-x: auto;
    gap: 0.5rem;
    padding-bottom: 0.75rem;
    scrollbar-width: none;
  }
  .aww-dash-nav::-webkit-scrollbar {
    display: none;
  }
  .aww-dash-tab {
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-color);
    border-radius: 100px;
    font-size: 0.85rem;
    white-space: nowrap;
  }
  .aww-dash-tab.active {
    background: var(--text-primary);
    color: var(--bg-color);
  }
  .aww-docs-sidebar ul {
    position: sticky;
    top: 70px;
    flex-direction: row;
    overflow-x: auto;
    gap: 0.5rem;
    padding: 0.6rem 0;
    background: rgba(3, 3, 3, 0.92);
    backdrop-filter: blur(16px);
    z-index: 40;
    scrollbar-width: none;
  }
  .aww-docs-sidebar ul::-webkit-scrollbar {
    display: none;
  }
  .aww-docs-sidebar ul li a {
    white-space: nowrap;
    padding: 0.4rem 0.9rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-color);
    border-radius: 100px;
    font-size: 0.8rem;
  }
  .library-category-pills {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 0.5rem;
    scrollbar-width: none;
  }
  .library-category-pills::-webkit-scrollbar {
    display: none;
  }
  .library-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .select-filters {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }
  .select-filters select {
    flex: 1;
  }
  .library-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 1rem;
  }
  .aww-modal-window {
    width: 95%;
    max-height: 90vh;
  }
  .liquid-checkout-modal-content {
    width: 95%;
    padding: 1.5rem 1rem;
  }
}
`

write('styles/awwwards.css', cssContent);

// Write JS
const jsContent = `
// Awwwards Style JS
document.addEventListener('DOMContentLoaded', () => {
  // Lenis Smooth Scroll
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
  });

  // Expose Lenis globally
  window.__srLenis = lenis;

  // Mobile Menu Burger Handler
  const burgerBtn = document.getElementById('aww-burger-btn');
  const header = document.querySelector('.aww-header');
  if (burgerBtn && header) {
    burgerBtn.addEventListener('click', () => {
      const isOpen = header.classList.toggle('is-menu-open');
      burgerBtn.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        lenis.stop();
      } else {
        lenis.start();
      }
    });

    document.querySelectorAll('.aww-nav .aww-link').forEach(link => {
      link.addEventListener('click', () => {
        header.classList.remove('is-menu-open');
        burgerBtn.setAttribute('aria-expanded', 'false');
        lenis.start();
      });
    });
  }

  // GSAP Animations
  gsap.registerPlugin(ScrollTrigger);
  
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Lenis Anchor Smooth Scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href && href.length > 1) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -90 });
        }
      }
    });
  });

  // Custom Cursor
  const cursor = document.querySelector('.custom-cursor');
  if(cursor) {
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });
    
    let xTo = gsap.quickTo(cursor, "x", { duration: 0.2, ease: "power3" }),
        yTo = gsap.quickTo(cursor, "y", { duration: 0.2, ease: "power3" });

    let isFirstMove = true;
    document.addEventListener('mousemove', (e) => {
      if (isFirstMove) {
        gsap.set(cursor, { x: e.clientX, y: e.clientY });
        isFirstMove = false;
      }
      xTo(e.clientX);
      yTo(e.clientY);
    });
    
    document.querySelectorAll('a, button, input, select, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }

  // Text Split Animations
  const splitTexts = document.querySelectorAll('[data-gsap="split-text"]');
  splitTexts.forEach(text => {
    if (typeof SplitType !== 'undefined') {
      const split = new SplitType(text, { types: 'lines, words, chars' });
      gsap.from(split.chars, {
        y: 100,
        opacity: 0,
        stagger: 0.02,
        duration: 1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: text,
          start: "top 90%",
        }
      });
    }
  });

  // Fade Up
  document.querySelectorAll('[data-gsap="fade-up"]').forEach(el => {
    const delay = el.dataset.delay || 0;
    gsap.from(el, {
      y: 50,
      opacity: 0,
      duration: 1,
      delay: delay,
      ease: "power3.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
      }
    });
  });

  // Cards Reveal
  const cards = document.querySelectorAll('[data-gsap="card-reveal"]');
  if(cards.length) {
    gsap.from(cards, {
      y: 50,
      opacity: 0,
      stagger: 0.1,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: cards[0],
        start: "top 85%",
      }
    });
  }

  // Magnetic Buttons
  const magneticEls = document.querySelectorAll('[data-magnetic]');
  magneticEls.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      gsap.to(el, {
        x: x * 0.3,
        y: y * 0.3,
        duration: 0.6,
        ease: "power3.out"
      });
    });
    
    el.addEventListener('mouseleave', () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "elastic.out(1, 0.3)"
      });
    });
  });
});
`;

write('js/awwwards.js', jsContent);
