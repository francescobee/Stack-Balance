"use strict";

// =============================================================
// render.js — orchestrator. Estrae a sub-modules in S8.1:
//   • render-pyramid.js  → renderPyramid, renderPyramidCard
//   • render-tableau.js  → renderTableau (bacheca)
//   • render-sidebar.js  → renderAssets, renderOKRs, renderAwardsForecast, renderLog
//   • render-masthead.js → renderMasthead, renderProgress, renderByline,
//                          renderProfileChip, makeTurnIndicator
//   • render-modals.js   → tutti i modali (setup/settings/draft/help/...)
//
// Questo file ora contiene solo:
//   • escapeHtml       — helper HTML-escape (usato da render-modals e splash)
//   • renderSplash     — landing page pre-game
//   • render           — funzione top-level chiamata da game.js dopo ogni state-change
// =============================================================

// ---------- HTML ESCAPE (helper condiviso con render-modals) ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

// ---------- SPLASH ----------
function renderSplash() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  const profile = getProfile();
  const splash = el("div", { class: "splash" });

  const greeting = profile
    ? `Bentornato, <em>${escapeHtml(profile.name)}</em> · Issue Nº ${(profile.stats?.games || 0) + 1}`
    : "A startup-tech card game · Issue Nº 1";

  splash.innerHTML = `
    <div class="pre">${greeting}</div>
    <h1>Stack <em>&amp;</em><br>Balance</h1>
    <div class="subtitle">Quarterly Rivals — un draft a piramide, stile Mahjong, ambientato in una scale-up tech.</div>
    <p class="desc">Sei un Head of Department in una scale-up tech. Il pool di carte è una piramide: pesca prima dell'avversario o ti porterà via la carta che ti serviva. Costruisci catene per ottenere sconti, completa OKR, investi in tooling. Vince chi a fine Q3 ha più utenti per la sua app.</p>
    <div class="feature-list">
      <strong>Piramide 4×6</strong> · 24 carte/Q. Front scoperta, dietro alterna face-down e face-up.<br>
      <strong>3 fasi tematiche</strong> · Q1 Discovery → Q2 Build → Q3 Launch.<br>
      <strong>Snake draft</strong> · 4 manager, 6 pescate ciascuno per quarter.<br>
      <strong>Catene</strong> · una carta-predecessore sblocca sconti sulla successiva.<br>
      <strong>End-game awards</strong> · 7 categorie indipendenti per bonus utenti.
    </div>
  `;

  const actions = el("div", { style: "display: flex; gap: 12px; align-items: center; flex-wrap: wrap;" });
  const startLabel = profile ? "Avvia nuova partita →" : "Crea profilo e gioca →";
  actions.appendChild(el("button", {
    class: "start-btn",
    onclick: () => {
      const proceed = () => showScenarioChooser({ onPick: (id) => startGame(id, false) });
      if (getProfile()) proceed();
      else showProfileSetup({ onComplete: proceed });
    }
  }, startLabel));

  // S6.3: Daily Run — once per day, shared seed across players
  if (profile) {
    const playedToday = hasPlayedDailyToday();
    const dailyBtn = el("button", {
      class: "ghost daily-btn",
      title: playedToday ? "Hai già giocato la daily oggi" : "Una partita al giorno con seed condiviso",
      onclick: () => {
        if (hasPlayedDailyToday()) {
          showToast({ who: "DAILY", what: "Hai già giocato la run di oggi.", kind: "discard" });
          return;
        }
        startGame("standard", true);
      }
    });
    const streak = profile?.stats?.dailyStreak || 0;
    dailyBtn.innerHTML = `🌅 Daily Run ${playedToday ? '· ✓' : ''} ${streak > 0 ? `<small>· streak ${streak}</small>` : ''}`;
    if (playedToday) dailyBtn.style.opacity = "0.55";
    actions.appendChild(dailyBtn);

    // S10 + S11.9: Multiplayer button (P2P online + Hot Seat locale unified)
    actions.appendChild(el("button", {
      class: "ghost",
      title: "Multiplayer online (P2P) o locale (Hot Seat)",
      onclick: () => {
        if (!getProfile()) {
          showProfileSetup({ onComplete: () => showMultiplayerEntryModal() });
        } else {
          showMultiplayerEntryModal();
        }
      }
    }, "🌐 Multiplayer"));

    actions.appendChild(el("button", {
      class: "ghost",
      onclick: showProfileSettings
    }, "Profilo"));
  }
  splash.appendChild(actions);

  app.appendChild(splash);
  app.appendChild(el("div", { id: "modalRoot" }));
}

// ---------- TOP-LEVEL ----------
// Compone in ordine: masthead + progress strip + byline strip,
// poi due colonne (main = pyramid+tableau, side = assets+OKR+awards+log).
function render() {
  if (!state) { renderSplash(); return; }
  const app = document.getElementById("app");
  app.innerHTML = "";

  app.appendChild(renderMasthead());
  app.appendChild(renderProgress());

  // S10: localSlotIdx selects the local POV player (0 in single-player, 0-3 in MP)
  const localIdx = state.localSlotIdx ?? 0;
  const localPlayer = state.players[localIdx];

  // Phase 12 mobile UX iter 4: compact resources strip ABOVE the pyramid,
  // visible on phone only via CSS. Replaces byline-strip on mobile so you
  // see your own resources at a glance while picking from thumb-sized cards.
  app.appendChild(renderMobileResourcesStrip(localPlayer));
  app.appendChild(renderByline());

  const layout = el("div", { class: "layout" });

  const mainCol = el("div", { class: "main-col" });
  mainCol.appendChild(renderPyramid());
  mainCol.appendChild(renderTableau(localPlayer));
  layout.appendChild(mainCol);

  const sideCol = el("div", { class: "side-col" });
  sideCol.appendChild(renderAssets(localPlayer));
  sideCol.appendChild(renderOKRs(localPlayer));
  sideCol.appendChild(renderAwardsForecast(localPlayer));
  sideCol.appendChild(renderLog());
  layout.appendChild(sideCol);

  app.appendChild(layout);
  app.appendChild(el("div", { id: "modalRoot" }));
}
