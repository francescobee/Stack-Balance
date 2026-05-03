"use strict";

// =============================================================
// render-profile.js — modali legati al profilo utente.
// Estratto da render-modals.js in S8.1 (split per restare <500 LOC).
//
//   • showProfileSetup        — onboarding al primo lancio
//   • showProfileSettings     — pannello identità + carriera + prefs +
//                               achievements + difficoltà + danger zone
//   • renderAchievementsHtml  — helper inline per il pannello
//   • showNewAchievementsModal — celebrazione post-game
// =============================================================

// ---------- PROFILE SETUP MODAL ----------
function showProfileSetup({ onComplete } = {}) {
  const root = el("div", { class: "modal-bg", id: "profileSetupBg" });
  const modal = el("div", { class: "modal profile-setup" });

  const initial = "?";
  modal.innerHTML = `
    <div class="modal-eyebrow">Stack &amp; Balance</div>
    <div class="crest empty" id="setupCrest">${initial}</div>
    <h2>Crea il tuo profilo</h2>
    <p class="blurb">Stai per fondare la tua scale-up. Ogni partita giocata si aggiunge alla tua storia: vittorie, miglior numero di utenti, anni di carriera.</p>
    <form class="profile-form" id="profileForm" autocomplete="off">
      <div>
        <label>Nome del fondatore</label>
        <input type="text" id="nameInput" placeholder="es. Federica" maxlength="32" required
               autocapitalize="words" autocomplete="given-name" enterkeyhint="go" />
        <div class="field-hint">Apparirà nelle classifiche e a fine partita.</div>
      </div>
      <div class="err" id="setupErr"></div>
      <div class="actions" style="justify-content: center; padding-top: 8px; border-top: none;">
        <button type="submit" class="primary">Avvia partita →</button>
      </div>
    </form>
  `;
  root.appendChild(modal);
  document.body.appendChild(root);

  const input = modal.querySelector("#nameInput");
  const crest = modal.querySelector("#setupCrest");
  const err = modal.querySelector("#setupErr");
  const form = modal.querySelector("#profileForm");

  // Live update of avatar
  input.addEventListener("input", () => {
    const v = input.value.trim();
    if (v.length > 0) {
      crest.textContent = v.charAt(0).toUpperCase();
      crest.classList.remove("empty");
    } else {
      crest.textContent = "?";
      crest.classList.add("empty");
    }
    err.textContent = "";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (name.length < 2) {
      err.textContent = "Il nome deve avere almeno 2 caratteri.";
      input.focus();
      return;
    }
    setProfile(newProfile(name));
    root.remove();
    if (typeof onComplete === "function") onComplete();
  });

  // Auto-focus
  setTimeout(() => input.focus(), 50);
}

// ---------- PROFILE SETTINGS MODAL ----------
function showProfileSettings() {
  const profile = getProfile();
  if (!profile) { showProfileSetup({ onComplete: renderSplash }); return; }

  const root = el("div", { class: "modal-bg", id: "profileSetBg",
    onclick: (e) => { if (e.target.id === "profileSetBg") root.remove(); } });
  const modal = el("div", { class: "modal profile-settings" });

  const wr = profileWinRate(profile);
  const since = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  modal.innerHTML = `
    <h2>Profilo</h2>
    <p>Gestisci nome e visualizza la tua carriera da Head of Department.</p>

    <h3>Identità</h3>
    <form class="profile-form" id="settingsForm" autocomplete="off">
      <div>
        <label>Nome</label>
        <input type="text" id="settingsNameInput" value="${escapeHtml(profile.name)}" maxlength="32" required
               autocapitalize="words" autocomplete="given-name" enterkeyhint="done" />
        <div class="field-hint">Cambia in qualunque momento.</div>
      </div>
      <div class="err" id="settingsErr"></div>
      <div style="display: flex; gap: 10px; margin-top: 4px;">
        <button type="submit" class="primary">Salva nome</button>
      </div>
    </form>

    <h3>Carriera</h3>
    ${(function() {
      // S18.1: Founder Level chip + progress bar (compatibility safe — falls
      // back gracefully if computeLevel/xpProgressInLevel are not loaded).
      if (typeof computeLevel !== "function" || typeof xpProgressInLevel !== "function") return "";
      const xp = profile.xp || 0;
      const prog = xpProgressInLevel(xp);
      const nextLine = prog.capped
        ? `Cap raggiunto · ${xp.toLocaleString()} XP totali`
        : `${prog.current.toLocaleString()} / ${prog.needed.toLocaleString()} XP al Lv ${prog.level + 1}`;
      return `
        <div class="founder-level">
          <div class="fl-row">
            <span class="fl-chip">⭐ Founder Lv. <strong>${prog.level}</strong></span>
            <span class="fl-xp">${xp.toLocaleString()} XP</span>
          </div>
          <div class="fl-bar"><span class="fl-fill" style="width: ${prog.pct}%"></span></div>
          <div class="fl-hint">${nextLine}</div>
        </div>`;
    })()}
    <div class="stats-grid">
      <div class="stat">
        <span class="lbl">Partite giocate</span>
        <span class="val">${profile.stats.games || 0}</span>
      </div>
      <div class="stat">
        <span class="lbl">Vittorie</span>
        <span class="val">${profile.stats.wins || 0}<small>${wr !== null ? wr + "%" : ""}</small></span>
      </div>
      <div class="stat">
        <span class="lbl">Best run</span>
        <span class="val">${profile.stats.bestUsers || 0}<small>K MAU</small></span>
      </div>
      <div class="stat">
        <span class="lbl">Utenti totali</span>
        <span class="val">${profile.stats.totalUsers || 0}<small>K MAU</small></span>
      </div>
      <div class="stat" style="grid-column: span 2;">
        <span class="lbl">Profilo creato</span>
        <span class="val" style="font-size: 14px; font-style: italic; font-weight: 500;">${since}</span>
      </div>
    </div>

    <h3>Preferenze UI</h3>
    <div class="prefs-toggles">
      <label class="prefs-row">
        <input type="checkbox" id="prefAudio" ${getAudioEnabled() ? "checked" : ""}>
        <span class="prefs-label">🔊 Audio cues</span>
        <span class="prefs-hint">Ding chain · debt buzz · award chime · OKR tick</span>
      </label>
      <label class="prefs-row">
        <input type="checkbox" id="prefReducedMotion" ${getReducedMotion() ? "checked" : ""}>
        <span class="prefs-label">🚶 Reduced motion</span>
        <span class="prefs-hint">Disabilita animazioni di celebrazione e pulse</span>
      </label>
    </div>

    <h3>Achievements</h3>
    <div class="ach-panel" id="achPanel">
      ${renderAchievementsHtml(profile)}
    </div>

    ${(function() {
      // S18.2: Vision Mastery panel — wins per base Vision + variant unlock state
      if (typeof getAvailableVisions !== "function") return "";
      const vs = profile.visionStats || {};
      const all = getAvailableVisions(profile);
      const baseVisions = all.filter(v => !v.baseId);
      const rows = baseVisions.map(v => {
        const stats = vs[v.id] || { wins: 0, plays: 0 };
        const variant = all.find(x => x.baseId === v.id);
        const variantTag = variant && variant.isUnlocked
          ? `<span class="vm-unlocked">⭐ v2 sbloccata</span>`
          : variant
            ? `<span class="vm-locked">🔒 ${variant.winsNeeded} ${variant.winsNeeded === 1 ? "vittoria" : "vittorie"} alla v2</span>`
            : "";
        return `
          <div class="vm-row">
            <span class="vm-icon">${v.icon}</span>
            <span class="vm-name">${v.name}</span>
            <span class="vm-stats">${stats.wins || 0}W · ${stats.plays || 0}P</span>
            ${variantTag}
          </div>`;
      }).join("");
      return `
        <h3>Vision Mastery</h3>
        <div class="vm-grid">${rows}</div>
      `;
    })()}

    <h3>Difficoltà AI</h3>
    <div class="difficulty-selector" id="diffSelector">
      <button class="diff-btn ${getDifficulty() === 'junior' ? 'active' : ''}" data-level="junior" type="button">
        <span class="diff-name">Junior</span>
        <span class="diff-desc">AI base, senza lookahead né personas. Per imparare.</span>
      </button>
      <button class="diff-btn ${getDifficulty() === 'senior' ? 'active' : ''}" data-level="senior" type="button">
        <span class="diff-name">Senior</span>
        <span class="diff-desc">Personas distinte + lookahead 1-step. Bilanciato.</span>
      </button>
      <button class="diff-btn ${getDifficulty() === 'director' ? 'active' : ''}" data-level="director" type="button">
        <span class="diff-name">Director</span>
        <span class="diff-desc">Persona + lookahead + Vision strategica + block aggressivo.</span>
      </button>
    </div>
    <div class="diff-note">⚙️ La difficoltà si applica dalla prossima partita.</div>

    <div class="danger-zone">
      <span class="note">Reset elimina nome e statistiche.</span>
      <button class="danger-btn" id="resetProfileBtn" type="button">Reset profilo</button>
    </div>

    <div class="actions">
      <button id="closeSettingsBtn" type="button">Chiudi</button>
    </div>
  `;
  root.appendChild(modal);
  document.body.appendChild(root);

  // S5.2: difficulty selector
  modal.querySelectorAll("#diffSelector .diff-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const level = btn.dataset.level;
      setDifficulty(level);
      modal.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // S7.1+S7.2: UI prefs toggles
  modal.querySelector("#prefAudio")?.addEventListener("change", (e) => {
    setAudioEnabled(e.target.checked);
    if (e.target.checked) { unlockAudio?.(); sndAwardUnlock?.(); /* sample */ }
  });
  modal.querySelector("#prefReducedMotion")?.addEventListener("change", (e) => {
    setReducedMotion(e.target.checked);
    document.body.classList.toggle("reduced-motion", e.target.checked);
  });

  const form = modal.querySelector("#settingsForm");
  const nameInput = modal.querySelector("#settingsNameInput");
  const err = modal.querySelector("#settingsErr");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (name.length < 2) { err.textContent = "Almeno 2 caratteri."; return; }
    updateProfile(p => {
      p.name = name;
      p.avatar = name.charAt(0).toUpperCase();
    });
    // Mid-game: apply the new name to the running player so it reflects everywhere
    if (state && state.players && state.players[0]) {
      state.players[0].name = name;
    }
    root.remove();
    if (state) render();
    else renderSplash();
  });

  modal.querySelector("#closeSettingsBtn").onclick = () => root.remove();

  modal.querySelector("#resetProfileBtn").onclick = () => {
    if (!confirm("Sei sicuro? Verranno cancellati nome e statistiche.")) return;
    clearProfile();
    root.remove();
    showProfileSetup({ onComplete: renderSplash });
  };
}

// ---------- S6.2: ACHIEVEMENTS UI ----------
function renderAchievementsHtml(profile) {
  const owned = profile?.achievements || {};
  const total = ACHIEVEMENTS.length;
  const unlocked = Object.keys(owned).length;
  const items = ACHIEVEMENTS.map(a => {
    const isUnlocked = !!owned[a.id];
    return `
      <div class="ach-item${isUnlocked ? " unlocked" : ""}" title="${a.name} — ${a.description}">
        <span class="ach-icon">${isUnlocked ? a.icon : "🔒"}</span>
        <div class="ach-body">
          <div class="ach-name">${isUnlocked ? a.name : "???"}</div>
          <div class="ach-desc">${isUnlocked ? a.description : "Sblocca per scoprire."}</div>
        </div>
      </div>
    `;
  }).join("");
  return `
    <div class="ach-summary">${unlocked} / ${total} sbloccati</div>
    <div class="ach-grid">${items}</div>
  `;
}

function showNewAchievementsModal(achievements, onComplete) {
  if (!achievements || achievements.length === 0) {
    if (typeof onComplete === "function") onComplete();
    return;
  }
  const root = el("div", { class: "modal-bg", id: "newAchBg" });
  const modal = el("div", { class: "modal new-achievements" });
  const items = achievements.map(a => `
    <div class="new-ach-item">
      <div class="new-ach-icon">${a.icon}</div>
      <div class="new-ach-body">
        <div class="new-ach-name">${a.name}</div>
        <div class="new-ach-desc">${a.description}</div>
      </div>
    </div>
  `).join("");
  // S9.5.c: scale auto-dismiss timer by achievement count (3s base + 1s/ach,
  // capped at 8s). 1 ach = 4s, 3 ach = 6s, 5+ ach = 8s.
  const autoDismissMs = Math.min(8000, 3000 + 1000 * achievements.length);
  modal.innerHTML = `
    <div class="modal-eyebrow">Achievement${achievements.length > 1 ? "s" : ""} Sbloccato${achievements.length > 1 ? "i" : ""}</div>
    <h2>${achievements.length === 1 ? "🏆 New Trophy" : `🏆 ${achievements.length} Trofei`}</h2>
    <div class="new-ach-list">${items}</div>
    <div class="actions">
      <button class="primary" id="newAchOk" type="button">Continua →</button>
    </div>
    <div class="ach-autodismiss" style="animation-duration: ${autoDismissMs}ms;"></div>
  `;
  root.appendChild(modal);
  document.body.appendChild(root);

  // S9.5.c: idempotent dismiss — manual click OR timeout, whichever comes first
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(timerId);
    root.remove();
    if (typeof onComplete === "function") onComplete();
  };
  const timerId = setTimeout(dismiss, autoDismissMs);
  modal.querySelector("#newAchOk").onclick = dismiss;
}
