"use strict";

// =============================================================
// render-hotseat.js — Hot Seat UI: lobby + pass-screen modal
// (Phase 11). Companion file to js/hotseat.js (game logic).
// =============================================================

// ---------- LOBBY MODAL (S11.1) ----------

function showHotSeatLobbyModal({ onComplete } = {}) {
  const root = el("div", { class: "modal-bg", id: "hotSeatLobbyBg" });
  const modal = el("div", { class: "modal hotseat-lobby" });

  // Default slot config: slot 0 = profile name (or "P1"), slot 1 = "P2",
  // slots 2-3 = AI with personas Alessia / Karim. Sensible defaults that
  // the user tweaks in the lobby.
  const profile = (typeof getProfile === "function") ? getProfile() : null;
  const defaultName = profile?.name || "P1";
  const aiPersonaNames = ["Marco (Eng VP)", "Alessia (CMO)", "Karim (CDO)"];
  const slots = [
    { type: "human", name: defaultName, persona: 0 },
    { type: "human", name: "P2",        persona: 1 },
    { type: "ai",    name: aiPersonaNames[1], persona: 1 },  // Alessia
    { type: "ai",    name: aiPersonaNames[2], persona: 2 },  // Karim
  ];

  let scenarioId = "standard";
  let difficulty = "senior";

  const renderLobby = () => {
    const slotsHtml = slots.map((slot, i) => {
      const isHuman = slot.type === "human";
      const personaOpts = aiPersonaNames.map((n, pi) =>
        `<option value="${pi}" ${slot.persona === pi ? "selected" : ""}>${escapeHtml(n)}</option>`
      ).join("");
      return `
        <div class="hs-slot ${isHuman ? "is-human" : "is-ai"}">
          <div class="hs-slot-header">Slot ${i + 1}</div>
          <div class="hs-slot-toggle">
            <label class="hs-toggle">
              <input type="radio" name="hs-type-${i}" value="human" ${isHuman ? "checked" : ""}>
              <span>👤 Umano</span>
            </label>
            <label class="hs-toggle">
              <input type="radio" name="hs-type-${i}" value="ai" ${!isHuman ? "checked" : ""}>
              <span>🤖 AI</span>
            </label>
          </div>
          ${isHuman
            ? `<input type="text" class="hs-name-input" data-slot="${i}"
                      maxlength="24" value="${escapeHtml(slot.name)}"
                      autocapitalize="words" autocomplete="off"
                      enterkeyhint="next"
                      placeholder="Nome giocatore" />`
            : `<select class="hs-persona-select" data-slot="${i}">${personaOpts}</select>`
          }
        </div>
      `;
    }).join("");

    // Scenario list — only standard for hot-seat MVP (no unlock check —
    // scenari unlocked by single-player win history apply too)
    const scenarios = (typeof getAvailableScenarios === "function")
      ? getAvailableScenarios(profile)
      : [{ id: "standard", name: "Standard", isLocked: false }];
    const scenarioOpts = scenarios
      .filter(s => !s.isLocked)
      .map(s => `<option value="${s.id}" ${s.id === scenarioId ? "selected" : ""}>${escapeHtml(s.icon || "")} ${escapeHtml(s.name)}</option>`)
      .join("");

    modal.innerHTML = `
      <div class="modal-eyebrow">🪑 Hot Seat — Pass and play</div>
      <h2>Setup tavolo</h2>
      <p class="hs-blurb">4 manager attorno al tavolo. A turno passate il
        mouse e fate la vostra mossa. I posti vuoti sono coperti da AI.</p>

      <div class="hs-slots-grid">${slotsHtml}</div>

      <div class="hs-config">
        <div class="hs-config-row">
          <label>Scenario</label>
          <select id="hsScenario">${scenarioOpts}</select>
        </div>
        <div class="hs-config-row">
          <label>Difficoltà AI</label>
          <select id="hsDifficulty">
            <option value="junior" ${difficulty === "junior" ? "selected" : ""}>Junior</option>
            <option value="senior" ${difficulty === "senior" ? "selected" : ""}>Senior</option>
            <option value="director" ${difficulty === "director" ? "selected" : ""}>Director</option>
          </select>
        </div>
      </div>

      <div class="err" id="hsErr"></div>

      <div class="actions">
        <button id="hsCancelBtn" type="button">Annulla</button>
        <button class="primary" id="hsStartBtn" type="button">Avvia →</button>
      </div>
    `;

    // Wire up toggles
    slots.forEach((_, i) => {
      modal.querySelectorAll(`input[name="hs-type-${i}"]`).forEach(input => {
        input.addEventListener("change", (e) => {
          slots[i].type = e.target.value;
          // When switching to AI, default name to persona name
          if (slots[i].type === "ai") {
            slots[i].name = aiPersonaNames[slots[i].persona ?? 0];
          } else if (slots[i].type === "human") {
            // Reset to a sensible human name
            const taken = new Set(slots.filter((s, j) => j !== i && s.type === "human").map(s => s.name));
            let suggested = `P${i + 1}`;
            let n = i + 1;
            while (taken.has(suggested)) suggested = `P${++n}`;
            slots[i].name = suggested;
          }
          renderLobby();
        });
      });
    });
    // Wire up name inputs
    modal.querySelectorAll(".hs-name-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const i = +e.target.dataset.slot;
        slots[i].name = e.target.value;
      });
    });
    // Wire up persona selects
    modal.querySelectorAll(".hs-persona-select").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const i = +e.target.dataset.slot;
        slots[i].persona = +e.target.value;
        slots[i].name = aiPersonaNames[slots[i].persona];
      });
    });

    modal.querySelector("#hsScenario").addEventListener("change", (e) => {
      scenarioId = e.target.value;
    });
    modal.querySelector("#hsDifficulty").addEventListener("change", (e) => {
      difficulty = e.target.value;
    });

    modal.querySelector("#hsCancelBtn").onclick = () => root.remove();

    modal.querySelector("#hsStartBtn").onclick = () => {
      // Validation
      const errEl = modal.querySelector("#hsErr");
      const humans = slots.filter(s => s.type === "human");
      if (humans.length === 0) {
        errEl.textContent = "Almeno 1 slot deve essere Umano.";
        return;
      }
      // Distinct names case-insensitive
      const lowerNames = humans.map(s => s.name.trim().toLowerCase());
      const uniqueNames = new Set(lowerNames);
      if (uniqueNames.size !== lowerNames.length) {
        errEl.textContent = "I nomi degli umani devono essere distinti.";
        return;
      }
      if (humans.some(s => s.name.trim().length < 2)) {
        errEl.textContent = "Ogni nome umano deve avere almeno 2 caratteri.";
        return;
      }
      errEl.textContent = "";
      root.remove();
      // Pass to hotseat.js
      startGameSharedScreen(slots, scenarioId, difficulty);
      if (typeof onComplete === "function") onComplete();
    };
  };

  root.appendChild(modal);
  document.body.appendChild(root);
  renderLobby();
}

// ---------- PASS-SCREEN MODAL (S11.2) ----------

// Shows fullscreen modal "PASS THE MOUSE TO X" with mini-classifica.
// Click "Tocca a me, procedi →" → onAcknowledge.
function showPassScreenModal(nextSlotIdx, onAcknowledge) {
  const player = state?.players?.[nextSlotIdx];
  if (!player) {
    console.warn("[hotseat] showPassScreenModal: invalid slot", nextSlotIdx);
    if (typeof onAcknowledge === "function") onAcknowledge();
    return;
  }

  const root = el("div", { class: "modal-bg pass-screen-bg", id: "passScreenBg" });
  const modal = el("div", { class: "modal pass-screen" });

  // Mini-classifica sorted by VP descending
  const ranked = state.players
    .map((p, idx) => ({ p, idx }))
    .sort((a, b) => b.p.vp - a.p.vp);
  const standingsHtml = ranked.map(({ p }, i) =>
    `<div class="ps-rank-row${p === player ? " is-next" : ""}">
       <span class="ps-rank">#${i + 1}</span>
       <span class="ps-name">${escapeHtml(p.name)}</span>
       <span class="ps-mau">${p.vp}<small>K MAU</small></span>
     </div>`
  ).join("");

  // Clean name + role (e.g. "Marco (Eng VP)" → "Marco" + "Eng VP")
  const roleMatch = player.name.match(/^(.+?)\s*\((.*?)\)/);
  const cleanName = roleMatch ? roleMatch[1] : player.name;
  const role = roleMatch ? roleMatch[2] : "";
  const initial = cleanName.charAt(0).toUpperCase() || "?";

  modal.innerHTML = `
    <div class="ps-eyebrow">🪑 PASS THE MOUSE</div>
    <div class="ps-avatar-large">${escapeHtml(initial)}</div>
    <h2 class="ps-name-large">${escapeHtml(cleanName)}</h2>
    ${role ? `<div class="ps-role">${escapeHtml(role)}</div>` : ""}
    <div class="ps-blurb">È il tuo turno. Click quando hai il mouse in mano.</div>
    <div class="ps-standings">
      <div class="ps-standings-label">Classifica attuale</div>
      ${standingsHtml}
    </div>
    <div class="actions" style="justify-content:center;border-top:none;padding-top:8px;">
      <button class="primary ps-acknowledge" type="button">Tocca a me, procedi →</button>
    </div>
  `;

  root.appendChild(modal);
  document.body.appendChild(root);

  // S11.5: optional sound cue (audio.js may not be loaded if disabled)
  if (typeof sndPassScreen === "function") {
    try { sndPassScreen(); } catch (e) { /* ignore */ }
  }

  const btn = modal.querySelector(".ps-acknowledge");
  setTimeout(() => btn.focus(), 50);

  btn.onclick = () => {
    // S11.5: fade-out animation before removing
    modal.classList.add("dismissing");
    setTimeout(() => {
      root.remove();
      if (typeof onAcknowledge === "function") onAcknowledge();
    }, 240);
  };
}
