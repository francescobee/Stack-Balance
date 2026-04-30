"use strict";

// =============================================================
// render-modals.js — modali del flusso di gioco. Estratto da
// render.js in S8.1 (i modali profilo/achievement vivono in
// render-profile.js per restare <500 LOC per file).
//
// Pre-game / draft:
//   • showScenarioChooser     — scelta scenario (Standard + sbloccati)
//   • showVisionDraftModal    — Founder DNA, 3 opzioni di 8
//   • showOKRDraftModal       — obiettivo trimestrale, 3 di 14
//
// In-game / climax:
//   • showMarketNewsModal     — Breaking News inter-quarter (S4.1)
//   • showFinalSequenceModal  — Pitch + VC reaction unified (S4.2 + S9.5.b)
//   • showBlockOverlay        — finestra di reazione 2-3s (S3.2)
//   • showHelpModal           — regole in 6 step
// =============================================================

// ---------- S6.1: SCENARIO CHOOSER MODAL ----------
function showScenarioChooser({ onPick }) {
  const profile = getProfile();
  const scenarios = getAvailableScenarios(profile);
  const root = el("div", { class: "modal-bg", id: "scenarioChooserBg" });
  const modal = el("div", { class: "modal scenario-chooser" });

  modal.innerHTML = `
    <div class="modal-eyebrow">Scenario · Game Mode</div>
    <h2>Scegli lo scenario</h2>
    <p class="scenario-blurb">Modifica le regole base del gioco. <em>Standard</em> è sempre disponibile, gli altri si sbloccano vincendo partite.</p>
    <div class="scenario-options-grid"></div>
  `;
  const grid = modal.querySelector(".scenario-options-grid");
  scenarios.forEach((s) => {
    const card = el("button", {
      class: `scenario-option-card${s.isLocked ? " locked" : ""}`,
      type: "button",
      disabled: s.isLocked ? "disabled" : null,
    });
    const lockHtml = s.isLocked
      ? `<div class="scenario-lock">🔒 Vinci ${s.winsNeeded} ${s.winsNeeded === 1 ? "partita" : "partite"} per sbloccare</div>`
      : `<div class="scenario-cta">Scegli →</div>`;
    card.innerHTML = `
      <div class="scenario-icon">${s.icon}</div>
      <div class="scenario-name">${s.name}</div>
      <div class="scenario-desc">${s.description}</div>
      <div class="scenario-bonus">+ ${s.bonus}</div>
      <div class="scenario-malus">− ${s.malus}</div>
      ${lockHtml}
    `;
    if (!s.isLocked) {
      card.onclick = () => {
        root.remove();
        if (typeof onPick === "function") onPick(s.id);
      };
    }
    grid.appendChild(card);
  });
  root.appendChild(modal);
  document.body.appendChild(root);
}

// ---------- VISION DRAFT MODAL (S2.3) ----------
// Big strategic choice that shapes the whole run. Bigger cards than OKR draft.
//
// S9.2: dev hook for deterministic playtest of specific Visions.
//   In browser console:
//     localStorage.setItem("dev.forceVision", "tech_first")
//     // ...play 5 games...
//     localStorage.removeItem("dev.forceVision")
//   Bypasses the random draft and auto-picks the requested Vision (if its
//   id matches getVisionById). Useful per S9.2/S9.8 playtest gauntlet.
function showVisionDraftModal({ options, onPick, mpWaiting }) {
  if (!options || options.length === 0) {
    if (typeof onPick === "function") onPick(null);
    return;
  }
  // S9.2: dev override — bypass modal if forceVision is set
  try {
    const forced = localStorage.getItem("dev.forceVision");
    if (forced) {
      const vision = (typeof getVisionById === "function" ? getVisionById(forced) : null);
      if (vision) {
        console.log(`[dev.forceVision] auto-picking "${vision.id}" (${vision.name})`);
        if (typeof onPick === "function") onPick(vision);
        return;
      } else {
        console.warn(`[dev.forceVision] unknown id "${forced}" — falling back to draft modal`);
      }
    }
  } catch (e) { /* localStorage access can fail in private mode etc. */ }
  const root = el("div", { class: "modal-bg", id: "visionDraftBg" });
  const modal = el("div", { class: "modal vision-draft" });

  modal.innerHTML = `
    <div class="modal-eyebrow">Strategic Vision · Founder DNA</div>
    <h2>Scegli la tua Vision</h2>
    <p class="vision-draft-blurb">Definisce la rotta della scale-up per <em>tutta la partita</em>: bonus + malus permanenti applicati dal Q1. Nessuna seconda chance.</p>
  `;

  const grid = el("div", { class: "vision-options-grid" });
  options.forEach((v) => {
    const card = el("button", { class: "vision-option-card", type: "button" });
    card.innerHTML = `
      <div class="vision-icon">${v.icon}</div>
      <div class="vision-name">${v.name}</div>
      <div class="vision-desc">${v.description}</div>
      <div class="vision-bonus">+ ${v.bonus}</div>
      <div class="vision-malus">− ${v.malus}</div>
      <div class="vision-cta">Scegli →</div>
    `;
    card.onclick = () => {
      // S11.7 mp-fix: in P2P MP, instead of removing the modal we transform
      // it into a "waiting for others" view. Host broadcasts closeMpModal
      // (and removes #visionDraftBg locally) when the draft phase resolves.
      if (mpWaiting) {
        renderMpDraftWaitingView(modal, "Vision");
        if (typeof onPick === "function") onPick(v);
      } else {
        root.remove();
        if (typeof onPick === "function") onPick(v);
      }
    };
    grid.appendChild(card);
  });
  modal.appendChild(grid);

  root.appendChild(modal);
  document.body.appendChild(root);
}

// ---------- OKR DRAFT MODAL (S2.1) ----------
// S10 fix: use state.localSlotIdx for the local POV player. In single-player
// localSlotIdx=0, so state.players[0] (the original hardcoded path). In
// multiplayer, clients have localSlotIdx=1/2/3 and need to draft for THEIR
// own slot — not the host's.
function showOKRDraftModal(onComplete, opts) {
  const mpWaiting = !!(opts && opts.mpWaiting);
  const localIdx = state.localSlotIdx ?? 0;
  const human = state.players[localIdx];
  const options = (human && human.okrOptions) || [];
  const ql = QUARTER_LABELS[state.quarter - 1];

  // Edge case: no options (shouldn't happen with pool size 14)
  if (options.length === 0) {
    console.warn("[OKR draft] no options for slot", localIdx, "— skipping modal");
    if (typeof onComplete === "function") onComplete();
    return;
  }

  const root = el("div", { class: "modal-bg", id: "okrDraftBg" });
  const modal = el("div", { class: "modal okr-draft" });

  modal.innerHTML = `
    <div class="modal-eyebrow">${ql.icon} ${ql.name} · Quarterly Goal</div>
    <h2>Scegli il tuo OKR</h2>
    <p class="okr-draft-blurb">Un solo obiettivo a trimestre. Scegli quello più allineato alla tua strategia. Le altre due opzioni evaporano.</p>
  `;

  const grid = el("div", { class: "okr-options-grid" });
  options.forEach((okr) => {
    const card = el("button", { class: "okr-option-card", type: "button" });
    card.innerHTML = `
      <div class="okr-option-reward">+${okr.reward}<small>K MAU</small></div>
      <div class="okr-option-text">${okr.text}</div>
      <div class="okr-option-cta">Scegli →</div>
    `;
    card.onclick = () => {
      // S10 fix: re-read state.players[currentIdx] at click time, NOT the
      // closure-captured `human`. In multiplayer, handleStateUpdate replaces
      // state.players (new array, new objects) when broadcasts arrive.
      // The captured `human` then references the orphaned old player object,
      // and mutations on it never reach the current state. The onComplete
      // callback reads `state.players[localSlotIdx].okrs[0]` which is still
      // empty, so the guest never sends draftResponse → host waits forever.
      const currentIdx = state.localSlotIdx ?? 0;
      const currentHuman = state.players[currentIdx];
      if (currentHuman) {
        currentHuman.okrs = [okr];
        currentHuman.okrOptions = [];
      }
      // S11.7 mp-fix: in P2P MP, transform modal into "waiting for others"
      // instead of removing it. Host clears it when all picks are in.
      if (mpWaiting) {
        renderMpDraftWaitingView(modal, "OKR");
        if (typeof onComplete === "function") onComplete();
      } else {
        root.remove();
        if (typeof onComplete === "function") onComplete();
      }
    };
    grid.appendChild(card);
  });
  modal.appendChild(grid);

  root.appendChild(modal);
  document.body.appendChild(root);
}

// ---------- S15: SYNERGY SHOWCASE MODAL ----------
// Mostra le 5 sinergie pescate per la partita corrente. Triggerato dopo
// Vision draft, prima OKR draft. One-shot informativo: il giocatore le
// rivedrà in sidebar (renderAwardsForecast) durante tutta la partita.
// Le sinergie marcate `guaranteed` dallo scenario hanno un piccolo badge
// "🎯 da scenario" per indicare la provenienza tematica.
function showSynergyShowcaseModal(synergies, scenario, onComplete) {
  const safeComplete = () => { if (typeof onComplete === "function") onComplete(); };
  if (!synergies || synergies.length === 0) {
    safeComplete();
    return;
  }
  const guaranteedIds = new Set(
    (scenario && scenario.synergyFlavor && scenario.synergyFlavor.guaranteed) || []
  );

  const root = el("div", { class: "modal-bg", id: "synergyShowcaseBg" });
  const modal = el("div", { class: "modal synergy-showcase" });

  const scenarioBadge = scenario && scenario.id !== "standard"
    ? `<span class="ss-scenario">${scenario.icon} ${scenario.name}</span>`
    : "";

  modal.innerHTML = `
    <div class="modal-eyebrow">🤝 Sinergie · Quest Game</div>
    <h2>Sinergie di questa partita</h2>
    <p class="ss-blurb">
      Cinque obiettivi multi-condizione. Soddisfa tutti i requisiti di una
      sinergia entro fine partita per i K MAU bonus. ${scenarioBadge}
    </p>
    <div class="synergy-showcase-grid"></div>
    <div class="actions">
      <button class="primary" id="ackSynergyBtn" type="button">Continua →</button>
    </div>
  `;
  const grid = modal.querySelector(".synergy-showcase-grid");
  synergies.forEach(syn => {
    const fromScenario = guaranteedIds.has(syn.id);
    const card = el("div", {
      class: `synergy-showcase-card${fromScenario ? " from-scenario" : ""}`
    });
    const reqsHtml = (syn.tags || []).slice(0, 3)
      .map(t => `<span class="ss-tag">#${t}</span>`).join("");
    // Compute requirement labels for an empty player snapshot so the
    // showcase shows the actual conditions without needing a live player.
    const dummyPlayer = {
      budget: 0, tempo: 0, talento: 0, dati: 0, morale: 0, techDebt: 0, vp: 0,
      played: [], permanents: {},
    };
    const reqLabels = (typeof syn.check === "function")
      ? (syn.check(dummyPlayer, null).requirements || [])
        .map(r => `<li>${r.label}</li>`).join("")
      : "";
    card.innerHTML = `
      <div class="ss-head">
        <span class="ss-icon">${syn.icon}</span>
        <span class="ss-name">${syn.name}</span>
        <span class="ss-points">+${syn.points}<small>K MAU</small></span>
      </div>
      ${fromScenario ? `<div class="ss-from-scenario">🎯 da scenario</div>` : ""}
      <div class="ss-desc">${syn.detailInactive || ""}</div>
      <ul class="ss-reqs">${reqLabels}</ul>
      <div class="ss-tags">${reqsHtml}</div>
    `;
    grid.appendChild(card);
  });

  root.appendChild(modal);
  document.body.appendChild(root);

  // S10: in MP, host triggers + clients see via stateUpdate. For now, the
  // showcase is host-side only (single-player). MP support: would broadcast
  // a `synergyShowcaseShow` message similar to showMarketNewsModal. Keeping
  // simple for first cut.
  const isMpClient = state && state.isMultiplayer
    && typeof mp !== "undefined" && mp.active && !mp.isHost;
  if (isMpClient) {
    const actionsArea = modal.querySelector(".actions");
    if (actionsArea) actionsArea.innerHTML = `<div class="mp-waiting">⏳ In attesa che l'host avanzi...</div>`;
    return;
  }

  modal.querySelector("#ackSynergyBtn").onclick = () => {
    root.remove();
    safeComplete();
  };
}

// S11.7 mp-fix: shared "waiting for others" view shown after a player picks
// their Vision/OKR while remote slots are still drafting. Replaces modal
// content in-place. Host removes #visionDraftBg/#okrDraftBg + broadcasts
// closeMpModal once everyone has picked.
function renderMpDraftWaitingView(modal, kindLabel) {
  modal.innerHTML = `
    <div class="modal-eyebrow">⏳ ${kindLabel} draft</div>
    <h2>Scelta confermata!</h2>
    <p class="mp-waiting-blurb">In attesa degli altri giocatori…</p>
    <div class="mp-waiting-spinner" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
  `;
}

// ---------- S4.1: MARKET NEWS MODAL ----------
function showMarketNewsModal(event, onComplete) {
  const root = el("div", { class: "modal-bg", id: "marketNewsBg" });
  const modal = el("div", { class: "modal market-news" });
  modal.innerHTML = `
    <div class="market-banner">
      <div class="market-flag">⚡ BREAKING NEWS</div>
      <div class="market-flag-meta">${QUARTER_LABELS[state.quarter - 1].name} · Market Update</div>
    </div>
    <div class="market-icon">${event.icon}</div>
    <h2 class="market-name">${event.name}</h2>
    <p class="market-desc">${event.description}</p>
    <div class="market-effects">
      <div class="market-bonus">
        <span class="me-label">+ EFFETTO</span>
        <span class="me-text">${event.bonus}</span>
      </div>
      <div class="market-malus">
        <span class="me-label">− CONSEGUENZA</span>
        <span class="me-text">${event.malus}</span>
      </div>
    </div>
    <div class="actions">
      <button class="primary" id="ackEventBtn" type="button">Continua →</button>
    </div>
  `;
  root.appendChild(modal);
  document.body.appendChild(root);

  // S10: mp client variant — replace "Continua" with waiting indicator;
  // host's "closeMpModal" broadcast removes this on advance.
  const isMpClient = state?.isMultiplayer && typeof mp !== "undefined" && mp.active && !mp.isHost;
  if (isMpClient) {
    const actionsArea = modal.querySelector(".actions");
    if (actionsArea) actionsArea.innerHTML = `<div class="mp-waiting">⏳ In attesa che l'host avanzi...</div>`;
    return;
  }

  modal.querySelector("#ackEventBtn").onclick = () => {
    root.remove();
    if (typeof onComplete === "function") onComplete();
  };
}

// ---------- S4.2 + S9.5.b: FINAL SEQUENCE MODAL (Pitch + VC unified) ----------
// S9.5.b: collassa Investor Pitch + VC Reaction in un unico modal con
// 2 fasi (slide-in CSS). Riduce i modal-clicks tra Q3 finale e classifica
// da 3+ a 2 (o 1 con skip).
//
// Phase 0: pitch-stage visibile, vc-reveal hidden, button "Avanti — VC →"
// Phase 1: vc-reveal slides in, button text → "Vedi classifica finale →",
//          leader.vp += vc.vpDelta applicato
// Skip:    apply vc silently + close immediately
//
// Sostituisce showInvestorPitchModal + showVcReactionModal (separate in S4.2).
function showFinalSequenceModal(sortedPlayers, leader, vc, onComplete) {
  const root = el("div", { class: "modal-bg", id: "finalSeqBg" });
  const modal = el("div", { class: "modal final-sequence" });

  // ── PITCH section: best card per player ──
  const presentations = sortedPlayers.map(p => {
    let best = null;
    p.played.forEach(c => {
      const v = c.effect?.vp || 0;
      if (!best || v > (best.effect?.vp || 0)) best = c;
    });
    return { player: p, bestCard: best };
  });
  const pitchRows = presentations.map((pr, idx) => {
    const p = pr.player;
    const card = pr.bestCard;
    const isLast = idx === presentations.length - 1;
    const cardHtml = card
      ? `<div class="pitch-card-name">${card.name}</div>
         <div class="pitch-card-meta">${card.type} · ${deptLabel(card.dept)}</div>`
      : `<div class="pitch-card-name muted">— bacheca vuota —</div>`;
    return `
      <div class="pitch-row${isLast ? ' is-last' : ''}" style="animation-delay: ${idx * 350}ms">
        <div class="pitch-order">${idx + 1}</div>
        <div class="pitch-player">
          <div class="pitch-name">${p.name}</div>
          <div class="pitch-mau">${p.vp}K MAU</div>
        </div>
        <div class="pitch-card">${cardHtml}</div>
      </div>
    `;
  }).join("");

  // ── VC REVEAL section (hidden initially, slides in via class toggle) ──
  const sign = vc.vpDelta > 0 ? "+" : (vc.vpDelta < 0 ? "" : "±");
  const tier = vc.vpDelta >= 5 ? "great" : vc.vpDelta > 0 ? "good" : vc.vpDelta < 0 ? "bad" : "neutral";
  const vcHtml = `
    <div class="vc-divider"></div>
    <div class="modal-eyebrow">Reazione del Board</div>
    <div class="vc-icon ${tier}">${vc.icon}</div>
    <h3 class="vc-name">${vc.name}</h3>
    <p class="vc-reaction-line">${vc.reaction}</p>
    <div class="vc-impact ${tier}">
      <span class="vc-leader-name">${leader.name}</span>
      <span class="vc-delta">${sign}${vc.vpDelta}<small>K MAU</small></span>
    </div>
  `;

  modal.innerHTML = `
    <div class="modal-eyebrow">Q3 Closing · Investor Pitch</div>
    <h2>The Pitch</h2>
    <p class="pitch-blurb">In ordine di MAU corrente, ogni manager presenta la sua carta migliore. Il leader chiude con la pitch decisiva.</p>
    <div class="pitch-stage">${pitchRows}</div>
    <div class="vc-reveal">${vcHtml}</div>
    <div class="actions">
      <button class="ghost" id="skipFinalBtn" type="button">Salta →</button>
      <button class="primary" id="phaseBtn" type="button">Avanti — VC reaction →</button>
    </div>
  `;
  root.appendChild(modal);
  document.body.appendChild(root);

  // S10: MP client variant — passive observer. Replace buttons with
  // "in attesa" indicator. Host's closeMpModal broadcast removes the modal.
  // VC reveal panel stays hidden until host clicks Avanti (then its broadcast
  // triggers a stateUpdate; we don't auto-reveal on client since host doesn't
  // broadcast a "reveal" message — but client sees updated leader.vp via state).
  const isMpClient = state?.isMultiplayer && typeof mp !== "undefined" && mp.active && !mp.isHost;
  if (isMpClient) {
    const actionsArea = modal.querySelector(".actions");
    if (actionsArea) actionsArea.innerHTML = `<div class="mp-waiting">⏳ In attesa che l'host avanzi...</div>`;
    // Reveal VC panel immediately on client (no host's "Avanti" click needed —
    // client just observes the cinematic). The vc.vpDelta is already
    // reflected in leader.vp via the broadcast that arrives before this modal.
    setTimeout(() => {
      const reveal = modal.querySelector(".vc-reveal");
      if (reveal) reveal.classList.add("revealed");
    }, 1500);  // delay so user sees pitch animation first
    return;
  }

  // Idempotent VC application (called by phase 1 reveal OR skip)
  const applyVcOnce = () => {
    if (leader._vcReaction) return;  // già applicata
    leader.vp = Math.max(0, leader.vp + vc.vpDelta);
    leader._vcReaction = vc;
    if (typeof log === "function") {
      log(`🎤 ${leader.name}: VC reaction "${vc.name}" → ${vc.vpDelta >= 0 ? "+" : ""}${vc.vpDelta}K MAU`, "event");
    }
    // S10: broadcast post-VC state so clients see updated leader.vp
    if (state?.isMultiplayer && typeof mpBroadcastState === "function") {
      mpBroadcastState();
    }
  };

  let phase = 0;
  const phaseBtn = modal.querySelector("#phaseBtn");
  const skipBtn  = modal.querySelector("#skipFinalBtn");

  phaseBtn.onclick = () => {
    if (phase === 0) {
      // Reveal VC: apply mutation + slide in panel + change button text
      applyVcOnce();
      modal.querySelector(".vc-reveal").classList.add("revealed");
      phaseBtn.textContent = "Vedi classifica finale →";
      skipBtn.style.display = "none";
      phase = 1;
    } else {
      root.remove();
      if (typeof onComplete === "function") onComplete();
    }
  };

  skipBtn.onclick = () => {
    applyVcOnce();
    root.remove();
    if (typeof onComplete === "function") onComplete();
  };
}

// ---------- S3.2: BLOCK OVERLAY (reaction window) ----------
// Float bottom-center button with countdown timer. Player has WINDOW_MS ms
// to click "BLOCK" or auto-resolves to no-block.
function showBlockOverlay({ actingIdx, toReveal, onBlock, onTimeout }) {
  const human = state.players[0];
  const canAffordBlock = !human.blockUsedThisQ
    && human.budget >= BALANCE.BLOCK.COST_BUDGET
    && human.tempo  >= BALANCE.BLOCK.COST_TEMPO;

  if (!canAffordBlock) {
    // Player can't block at all — auto-pass after a short pause for visual rhythm
    setTimeout(onTimeout, 200);
    return;
  }

  const overlay = el("div", { class: "block-overlay" });
  const ms = BALANCE.BLOCK.WINDOW_MS;
  overlay.innerHTML = `
    <div class="block-content">
      <div class="block-info">
        <div class="block-title">Reveal in arrivo</div>
        <div class="block-detail">${state.players[actingIdx].name} sta per scoprire <em>${toReveal.card.name}</em></div>
      </div>
      <button class="block-btn" type="button">
        <span class="block-icon">🛡</span>
        <span class="block-label">BLOCK</span>
        <span class="block-cost">−${BALANCE.BLOCK.COST_BUDGET}💰 −${BALANCE.BLOCK.COST_TEMPO}⏱</span>
        <span class="block-timer" style="animation-duration: ${ms}ms;"></span>
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  let resolved = false;
  const finish = (cb) => {
    if (resolved) return;
    resolved = true;
    overlay.classList.add("dismiss");
    setTimeout(() => overlay.remove(), 220);
    cb();
  };

  overlay.querySelector(".block-btn").addEventListener("click", () => finish(onBlock));
  setTimeout(() => finish(onTimeout), ms);
}

// ---------- S10: MULTIPLAYER MODALI ----------
// Estratti in `js/render-multiplayer.js` per rispettare il vincolo
// S8.1 "<500 LOC per file" (post-S10 questo file era a 600 LOC).
//   • showMultiplayerEntryModal, showMultiplayerJoinModal,
//     showMultiplayerLobbyModal, renderMultiplayerLoading
// Le funzioni sono globali, accessibili via window/global classic-script.

// ---------- HELP MODAL ----------
function showHelpModal() {
  const root = el("div", { class: "modal-bg", id: "helpBg",
    onclick: (e) => { if (e.target.id === "helpBg") root.remove(); } });
  const modal = el("div", { class: "modal" });
  modal.innerHTML = `
    <h2>Come si gioca</h2>
    <p>Sei un Head of Department in una scale-up. Tu e 3 IA pescate carte da una piramide condivisa per costruire la migliore app: <em>vince chi ha più utenti finali</em>.</p>
    <div class="help-content">
      <div class="step"><div class="num">1</div><div><strong>Piramide condivisa.</strong> 24 carte in 4 file × 6 colonne. La fila in fronte è scoperta e pescabile. Dietro alterna face-down e face-up.</div></div>
      <div class="step"><div class="num">2</div><div><strong>Snake draft.</strong> Voi quattro pescate a turno (Tu→Marco→Alessia→Karim, poi reverse). 6 pescate a testa per Q.</div></div>
      <div class="step"><div class="num">3</div><div><strong>Reveal.</strong> Quando peschi, la carta dietro si gira (se era coperta) e arriva in fronte: nuovo target per il prossimo giocatore.</div></div>
      <div class="step"><div class="num">4</div><div><strong>Risorse.</strong> Budget, Tempo, Talento, Dati, Morale. Se non puoi permetterti la carta, click → la scarti (+2 budget, +1 tech debt).</div></div>
      <div class="step"><div class="num">5</div><div><strong>Catene.</strong> Possedere la carta-predecessore sblocca uno sconto sul costo (es. <em>Senior Dev</em> -2 budget se hai <em>Junior Dev</em>).</div></div>
      <div class="step"><div class="num">6</div><div><strong>Vittoria.</strong> Più utenti (K MAU) a fine Q3 = vinci. Punti da: carte giocate + dominanza dipartimento per Q + OKR + 7 awards finali + conversione budget − tech debt.</div></div>
    </div>
    <div class="actions">
      <button class="primary" id="closeHelp">Capito</button>
    </div>
  `;
  root.appendChild(modal);
  document.body.appendChild(root);
  modal.querySelector("#closeHelp").onclick = () => root.remove();
}
