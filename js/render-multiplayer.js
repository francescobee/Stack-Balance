"use strict";

// =============================================================
// render-multiplayer.js — modali UI per il multiplayer P2P (S10).
// Estratto da render-modals.js per rispettare il vincolo S8.1
// "<500 LOC per file" (render-modals.js post-S10 era a 600 LOC).
//
//   • showMultiplayerEntryModal   — host or join chooser
//   • showMultiplayerJoinModal    — input room code + name
//   • showMultiplayerLobbyModal   — waiting room con player slots
//   • renderMultiplayerLoading    — placeholder client durante connessione
//
// Dipendenze runtime (globals):
//   • mp (state da js/multiplayer.js)
//   • mpCreateRoom / mpJoinRoom / mpDisconnect / mpStartMultiplayerGame
//   • showToast, escapeHtml, getProfile, NUM_PLAYERS, renderSplash
// =============================================================

// ---------- S10.1 + S11.9: MULTIPLAYER ENTRY MODAL (P2P online + Hot Seat locale) ----------
// S11.9: Hot Seat moved here from a standalone splash button. The two
// online options (Host/Join) and the local option (Hot Seat) live under
// the same "Multiplayer" umbrella. PeerJS unavailability disables the
// online cards but Hot Seat stays clickable since it doesn't need the network.
function showMultiplayerEntryModal({ onComplete } = {}) {
  const peerAvailable = typeof Peer !== "undefined";
  const root = el("div", { class: "modal-bg", id: "mpEntryBg" });
  const modal = el("div", { class: "modal mp-entry" });
  const onlineDisabledNote = peerAvailable ? "" : `
    <div class="mp-online-unavailable">⚠️ Servizio P2P non disponibile (CDN unreachable). Le opzioni online sono disabilitate. Hot Seat funziona comunque.</div>
  `;
  modal.innerHTML = `
    <div class="modal-eyebrow">🌐 Multiplayer</div>
    <h2>Gioca con amici</h2>
    <p class="mp-blurb">Fino a 4 giocatori. I posti vuoti sono coperti da AI.
       Scegli online (P2P, ognuno sul proprio PC) o locale (un solo PC, ci si passa il mouse).</p>

    <div class="mp-section-label">🌐 Online · P2P</div>
    <div class="mp-options-grid">
      <button class="mp-option-card" id="mpHostBtn" type="button" ${peerAvailable ? "" : "disabled"}>
        <div class="mp-icon">🏠</div>
        <div class="mp-name">Crea partita</div>
        <div class="mp-desc">Sei l'host. Condividi il room code con gli amici.</div>
        <div class="mp-cta">Crea →</div>
      </button>
      <button class="mp-option-card" id="mpJoinBtn" type="button" ${peerAvailable ? "" : "disabled"}>
        <div class="mp-icon">🔗</div>
        <div class="mp-name">Unisciti</div>
        <div class="mp-desc">Inserisci un room code che ti hanno condiviso.</div>
        <div class="mp-cta">Connetti →</div>
      </button>
    </div>
    ${onlineDisabledNote}

    <div class="mp-section-label">🪑 Locale · Hot Seat</div>
    <div class="mp-options-grid mp-options-grid-1">
      <button class="mp-option-card" id="mpHotSeatBtn" type="button">
        <div class="mp-icon">🪑</div>
        <div class="mp-name">Pass-and-play</div>
        <div class="mp-desc">Stesso PC, ci si passa il mouse a turno. 2-4 giocatori, AI riempie i posti vuoti.</div>
        <div class="mp-cta">Avvia →</div>
      </button>
    </div>

    <div class="actions">
      <button id="mpEntryCancelBtn" type="button">Annulla</button>
    </div>
  `;
  root.appendChild(modal);
  document.body.appendChild(root);
  if (peerAvailable) {
    modal.querySelector("#mpHostBtn").onclick = async () => {
      root.remove();
      const profile = getProfile();
      const hostName = profile?.name || "Host";
      try {
        const code = await mpCreateRoom(hostName);
        showMultiplayerLobbyModal({ role: "host", roomCode: code, onComplete });
      } catch (err) {
        showToast({ who: "ERRORE", what: "Impossibile creare la room: " + (err.message || err.type), kind: "discard" });
      }
    };
    modal.querySelector("#mpJoinBtn").onclick = () => {
      root.remove();
      showMultiplayerJoinModal({ onComplete });
    };
  }
  modal.querySelector("#mpHotSeatBtn").onclick = () => {
    root.remove();
    if (typeof showHotSeatLobbyModal === "function") {
      showHotSeatLobbyModal({ onComplete });
    } else {
      showToast({ who: "ERRORE", what: "Hot Seat non disponibile.", kind: "discard" });
    }
  };
  modal.querySelector("#mpEntryCancelBtn").onclick = () => root.remove();
}

// ---------- S10.1: JOIN ROOM MODAL ----------
function showMultiplayerJoinModal({ onComplete, prefilledCode } = {}) {
  const root = el("div", { class: "modal-bg", id: "mpJoinBg" });
  const modal = el("div", { class: "modal mp-join" });
  const profile = getProfile();
  const defaultName = profile?.name || "";
  modal.innerHTML = `
    <div class="modal-eyebrow">🌐 Unisciti a una partita</div>
    <h2>Inserisci il codice</h2>
    <form class="mp-join-form" id="mpJoinForm" autocomplete="off">
      <div>
        <label>Room code</label>
        <input type="text" id="mpRoomCodeInput" maxlength="4"
               placeholder="ABCD" required
               style="text-transform: uppercase; letter-spacing: 0.4em; font-family: var(--mono); font-size: 24px;"
               value="${prefilledCode ? escapeHtml(prefilledCode) : ''}" />
        <div class="field-hint">4 caratteri (es. ABCD)</div>
      </div>
      <div>
        <label>Il tuo nome</label>
        <input type="text" id="mpJoinNameInput" maxlength="32" required
               value="${escapeHtml(defaultName)}" placeholder="es. Marco" />
      </div>
      <div class="err" id="mpJoinErr"></div>
      <div class="actions" style="border-top:none;padding-top:8px;">
        <button type="button" id="mpJoinCancelBtn">Annulla</button>
        <button type="submit" class="primary">Connetti →</button>
      </div>
    </form>
  `;
  root.appendChild(modal);
  document.body.appendChild(root);
  const form = modal.querySelector("#mpJoinForm");
  const errEl = modal.querySelector("#mpJoinErr");
  const codeInput = modal.querySelector("#mpRoomCodeInput");
  const nameInput = modal.querySelector("#mpJoinNameInput");
  setTimeout(() => (prefilledCode ? nameInput : codeInput).focus(), 50);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = codeInput.value.trim().toUpperCase();
    const name = nameInput.value.trim();
    if (code.length !== 4) { errEl.textContent = "Il codice deve essere di 4 caratteri."; return; }
    if (name.length < 2) { errEl.textContent = "Inserisci un nome (≥ 2 caratteri)."; return; }
    errEl.textContent = "Connessione in corso...";
    try {
      await mpJoinRoom(code, name);
      root.remove();
      showMultiplayerLobbyModal({ role: "client", roomCode: code, onComplete });
    } catch (err) {
      errEl.textContent = `Connessione fallita: ${err.type || err.message || err}`;
    }
  });
  modal.querySelector("#mpJoinCancelBtn").onclick = () => {
    root.remove();
    showMultiplayerEntryModal({ onComplete });
  };
}

// ---------- S10.1 + S10.4: LOBBY (waiting room with player slots) ----------
function showMultiplayerLobbyModal({ role, roomCode, onComplete }) {
  const root = el("div", { class: "modal-bg", id: "mpLobbyBg" });
  const modal = el("div", { class: "modal mp-lobby" });
  root.appendChild(modal);
  document.body.appendChild(root);

  const renderLobby = () => {
    const isHost = role === "host";
    const lobby = mp.lobby || [];
    const humanCount = lobby.length;
    const aiCount = NUM_PLAYERS - humanCount;
    const shareUrl = isHost
      ? `${location.origin}${location.pathname}#room=${roomCode}`
      : null;
    const slotsHtml = Array.from({ length: NUM_PLAYERS }, (_, i) => {
      const occupant = lobby.find(p => p.slotIdx === i);
      if (occupant) {
        const isYou = occupant.peerId === mp.localPeerId;
        const isHostSlot = occupant.slotIdx === 0;
        return `
          <div class="mp-slot ${isYou ? 'is-you' : ''} ${isHostSlot ? 'is-host' : ''}">
            <div class="mp-slot-avatar">${escapeHtml(occupant.name[0])}</div>
            <div class="mp-slot-info">
              <div class="mp-slot-name">${escapeHtml(occupant.name)}${isYou ? ' (tu)' : ''}</div>
              <div class="mp-slot-role">${isHostSlot ? 'HOST' : 'Giocatore ' + (i + 1)}</div>
            </div>
          </div>`;
      } else {
        return `
          <div class="mp-slot mp-slot-empty">
            <div class="mp-slot-avatar">🤖</div>
            <div class="mp-slot-info">
              <div class="mp-slot-name muted">Posto vuoto</div>
              <div class="mp-slot-role">→ AI all'avvio</div>
            </div>
          </div>`;
      }
    }).join("");
    modal.innerHTML = `
      <div class="modal-eyebrow">🌐 Lobby Multiplayer</div>
      <h2>${isHost ? "Tu sei l'host" : "Connesso al host"}</h2>
      <div class="mp-room-code">
        <span class="mp-room-label">ROOM CODE</span>
        <span class="mp-room-value">${escapeHtml(roomCode)}</span>
        ${isHost ? `<button class="mp-copy-btn" id="mpCopyBtn" type="button" title="Copia link condivisibile">📋 Copia link</button>` : ''}
      </div>
      <div class="mp-slots-grid">${slotsHtml}</div>
      <div class="mp-summary">
        ${humanCount} umano${humanCount > 1 ? 'i' : ''} +
        ${aiCount} AI · 4/4
      </div>
      ${isHost ? `
        <div class="mp-difficulty">
          <label class="mp-diff-label">Difficoltà AI:</label>
          <select id="mpDifficulty">
            <option value="junior" ${mp.difficulty === 'junior' ? 'selected' : ''}>Junior</option>
            <option value="senior" ${mp.difficulty === 'senior' ? 'selected' : ''}>Senior</option>
            <option value="director" ${mp.difficulty === 'director' ? 'selected' : ''}>Director</option>
          </select>
        </div>
      ` : ''}
      <div class="actions">
        <button id="mpLeaveBtn" type="button">Esci</button>
        ${isHost ? `<button class="primary" id="mpStartBtn" type="button">Avvia partita →</button>` : `<div class="mp-waiting">⏳ In attesa che l'host avvii...</div>`}
      </div>
    `;
    if (isHost) {
      modal.querySelector("#mpCopyBtn").onclick = () => {
        navigator.clipboard?.writeText(shareUrl).then(
          () => showToast({ who: "COPIATO", what: shareUrl, kind: "celebrate" }),
          () => showToast({ who: "ERRORE", what: "Copia manuale: " + shareUrl, kind: "discard" })
        );
      };
      modal.querySelector("#mpDifficulty").onchange = (e) => {
        mp.difficulty = e.target.value;
      };
      modal.querySelector("#mpStartBtn").onclick = () => {
        // Host starts the game with current scenario (default Standard).
        // We could open the scenario chooser first; for MVP we use Standard.
        root.remove();
        mpStartMultiplayerGame("standard");
        if (typeof onComplete === "function") onComplete();
      };
    }
    modal.querySelector("#mpLeaveBtn").onclick = () => {
      mpDisconnect();
      root.remove();
      renderSplash();
    };
  };

  // Wire up live updates
  mp.onLobbyUpdate = renderLobby;
  mp.onError = (msg) => {
    showToast({ who: "MULTIPLAYER", what: msg, kind: "discard" });
  };
  renderLobby();
}

// ---------- S10.3: WAITING / LOADING placeholder for clients ----------
function renderMultiplayerLoading() {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = `
    <div style="text-align:center; padding: 80px 24px;">
      <div style="font-size: 56px; margin-bottom: 16px;">🌐</div>
      <h2 style="font-family: var(--serif-display); font-style: italic;">Connessione al host...</h2>
      <p style="color: var(--ink-muted);">In attesa dei dati di partita.</p>
    </div>
  `;
}
