# Stack & Balance — Hot Seat Roadmap (Phase 11)

> **Tipo**: feature locale, ortogonale a single-player e P2P multiplayer.
> **Obiettivo**: aggiungere modalità **Hot Seat / Pass-and-play** —
> 2-4 giocatori condividono un singolo PC, si passano il mouse a turno.
> Ottimizzato per "party game intorno al divano".
> **Origine**: chiesta dall'utente dopo la conclusione di Phase 10 (P2P MP).
> **Natura**: 100% additiva. Single-player e P2P multiplayer restano invariati.

---

## 🎯 Vision

Permettere a un gruppo di amici fisicamente nello stesso luogo di giocare
senza dover aprire 2-4 browser/dispositivi. Un solo schermo, mouse
condiviso, transizioni di turno **non-ambigue** (modal "passa il mouse a X").

**Differenziatori vs P2P multiplayer**:
- Niente network → niente sync, niente serialization, niente race
- Niente AI fillers obbligatori → ogni slot configurabile umano/AI
- "Open table" → tutti vedono tutto, è party game
- Pass-screen tra turni umani → impossibile sbagliare il turno

**Non-goals** (esplicitamente fuori scope):
- ❌ Multi-profile localStorage (solo slot 1 ha profilo persistente)
- ❌ Hidden info (Vision/OKR pubblici a tutti — open table)
- ❌ Daily mode in hot-seat (per MVP, valutiamo dopo)
- ❌ Block & React (coerente con P2P)
- ❌ Difficoltà AI per-slot (singolo selector globale)
- ❌ Spettatori (irrilevante: schermo unico)

---

## 🌐 Architettura tech

### Reuse vs build new

Hot Seat **non riusa** l'infrastruttura P2P (multiplayer.js / PeerJS / serialize).
Ma **riusa massicciamente** il render layer e il game loop:
- `state` object: stesso schema, con nuovo flag `state.isSharedScreen`
- `state.localSlotIdx`: già esistente (introdotto in S10), fa rotation con
  `state.activePicker` durante turni umani
- `processNextPick`, `humanPickCard`, `endOfQuarter`, `endGame`: invariati
  con piccoli hook per "passing" phase
- Render layer (`render-pyramid.js` / `render-tableau.js` / `render-sidebar.js`
  / `render-masthead.js`): NIENTE da cambiare — usano già `state.localSlotIdx`
- Modal pubblici (Q-end, Market News, Final Sequence, End-game):
  funzionano out-of-the-box (sono modal locali, condivisi su un solo schermo)

### Nuove additions

**Flag**:
```js
state.isSharedScreen = true;       // hot-seat mode
state.isMultiplayer = false;       // explicit mutex with P2P
state.activePicker  = 0..3;
state.localSlotIdx  = 0..3;        // rotates with activePicker on human turns
state.phase         = "passing";   // NEW: showing pass-screen between humans
```

**Functions**:
```js
function startGameSharedScreen(slotConfig, scenarioId) { ... }
function draftVisionsSequential(onComplete) { ... }
function draftOkrsSequential(onComplete) { ... }
function showPassScreenModal(nextSlotIdx, onAcknowledge) { ... }
function shouldShowPassScreen(playerIdx) { ... }
function isHumanSlot(idx) { ... }
```

**Files**:
- `js/hotseat.js` (nuovo, ~250 LOC) — slot config, draft sequential, pass logic
- `js/render-hotseat.js` (nuovo, ~120 LOC) — pass-screen modal + lobby modal
- Modifiche minori a `game.js` (hook in processNextPick), `render.js`
  (splash button), `index.html` (script tags), `styles/main.css` (CSS lobby + pass)

### Pattern: open table

Tutta l'info è pubblica (Vision di tutti, OKR di tutti, resources di
tutti). Ogni giocatore vede sul suo "turno" la propria sidebar (tramite
rotation di `state.localSlotIdx`). Quando non è il loro turno, vedono
quella del player attivo.

In termini pratici: la masthead/sidebar mostra **chi sta giocando ora**,
non "il mio POV fisso". Il pass-screen modal annuncia il cambio. Negli
intervalli AI, la UI continua a mostrare l'ultimo umano (così non flasha
durante una sequenza di 3 AI).

---

## 📅 Macro-timeline (6 sessions · ~12h totali, V1 polished)

| Session | Tema | Effort | Stato |
|---------|------|-------:|------:|
| **S11.1** | Lobby UI & State Setup | M (~2h) | ✅ Done · 2026-04-28 |
| **S11.2** | Pass-Screen Modal & Phase Hook | M (~2h) | ✅ Done · 2026-04-28 |
| **S11.3** | Sequential Vision/OKR Drafts | M (~2h) | ✅ Done · 2026-04-28 |
| **S11.4** | POV Rotation & Render Gating | S (~1.5h) | ✅ Done · 2026-04-28 |
| **S11.5** | Polish — Animations, Sound, Transitions | M (~2h) | ✅ Done · 2026-04-28 |
| **S11.6** | Edge Cases, Manual Playtest, Docs | M (~2.5h) | ✅ Done · 2026-04-28 |

**Critical path**: S11.1 → S11.2 → S11.3 → S11.4. Le ultime due sono
polish/validation, partono in parallelo dopo S11.4.

---

## 🪑 SESSION 11.1 — Lobby UI & State Setup ✅ Done · 2026-04-28

**Tipo**: foundation
**Effort**: M (~2h)
**Dipendenze**: nessuna
**Files toccati**: `index.html`, `js/hotseat.js` (nuovo),
`js/render-hotseat.js` (nuovo), `js/render.js` (splash), `styles/main.css`

**Goal**: l'utente clicca "🪑 Hot Seat" dalla splash, configura 4 slot
(umano/AI + nomi + persona AI + difficoltà globale), scegli scenario,
clicca "Avvia →" e arriva al primo Vision draft. Niente flow di gioco
ancora — solo la setup.

### Requirements

#### 11.1.a — Splash button
In `js/render.js` `renderSplash`, aggiungere accanto al "🌐 Multiplayer"
un nuovo bottone:
```html
<button class="ghost" title="Pass-and-play locale: 2-4 giocatori sullo stesso PC">
  🪑 Hot Seat
</button>
```
Click → `showHotSeatLobbyModal()`.

#### 11.1.b — `showHotSeatLobbyModal`
In `js/render-hotseat.js` (nuovo file).

UI structure:
- Header: "🪑 Hot Seat — Pass and play"
- Blurb: "4 manager attorno al tavolo. A turno passate il mouse e fate la vostra mossa."
- 2x2 grid di slot config (each):
  - Toggle radio: ◉ Umano / ○ AI
  - If Umano: text input nome (slot 1 default = profile name)
  - If AI: dropdown persona ("Marco", "Alessia", "Karim") — pesca dal
    ai.js AI_PERSONAS
- Difficulty selector: Junior / Senior / Director (radio o dropdown)
- Scenario selector: stessa lista di `getAvailableScenarios()` (S6.1)
- Validation:
  - Almeno 1 slot Umano
  - Nomi umani distinti (case-insensitive)
- Buttons: [Annulla] · [Avvia →]

CSS in `styles/main.css`: classe `.hotseat-lobby` con grid styling
coerente con altri modal del progetto (parchment, ink, gold accents).

#### 11.1.c — `startGameSharedScreen(slotConfig, scenarioId, difficulty)`
In `js/hotseat.js` (nuovo).

```js
function startGameSharedScreen(slotConfig, scenarioId, difficulty) {
  clearRngSeed();
  const players = slotConfig.map((slot, idx) => {
    const isHuman = slot.type === "human";
    const p = newPlayer(slot.name, isHuman);
    p.slotType = isHuman ? "human-host" : "ai";
    p.peerId = null;
    return p;
  });
  state = {
    quarter: 1,
    pickIndex: 0,
    pickOrder: [],
    pyramid: [],
    players,
    log: [],
    phase: "draft",
    aiHighlight: null,
    activePicker: 0,
    justPlayedCardId: null,
    aiJustPlayed: null,
    prevResources: null,
    seenTutorial: false,
    gameOver: false,
    counterMarketingPending: [],
    deferredReveals: [],
    activeEvent: null,
    difficulty: difficulty || "senior",
    scenario: getScenarioById(scenarioId),
    isDaily: false,
    dominanceSweepsByPlayer: {},
    localSlotIdx: 0,
    isSharedScreen: true,            // S11 flag
    isMultiplayer: false,             // mutex with P2P
  };
  // S11.3: Vision draft sequential
  draftVisionsSequential(() => {
    applyStartingModifiers();
    startQuarter();
    draftOkrsSequential(() => {
      render();
      processNextPick();
    });
  });
}
```

Per S11.1, `draftVisionsSequential` e `draftOkrsSequential` possono essere
**stub** che semplicemente auto-pick per umani (per testare il flow di setup).
La logica reale arriva in S11.3.

#### 11.1.d — Helpers
In `js/hotseat.js`:
```js
function isHumanSlot(idx) {
  return state?.players?.[idx]?.slotType === "human-host";
}

function countHumans() {
  return state.players.filter(p => p.slotType === "human-host").length;
}

function shouldShowPassScreen(targetSlotIdx) {
  // True if more than 1 human AND target is human AND
  // it's a transition from a different human
  if (!state.isSharedScreen) return false;
  if (countHumans() <= 1) return false;       // single human degrade
  if (!isHumanSlot(targetSlotIdx)) return false;
  return true;
}
```

### Acceptance criteria

- [ ] Splash mostra "🪑 Hot Seat" accanto agli altri bottoni
- [ ] Click apre il lobby modal
- [ ] 4 slot configurabili: ognuno toggle Umano/AI
- [ ] Validation blocca: 0 umani, nomi duplicati
- [ ] Click "Avvia →" → `startGameSharedScreen` runa, state inizializzato
- [ ] In console: `state.isSharedScreen === true`, `state.players.length === 4`,
      slotType corretto per ogni slot
- [ ] Single-player NON viene rotto (test: avvia partita normale, funziona)

### Edge cases

- 1 umano configurato + 3 AI → `countHumans() === 1` → pass-screen mai
  mostrato → degrada a single-player flow visivamente
- Tutti AI → validation blocca al click "Avvia"
- Nomi con spazi / accenti / unicode → valid (solo controllo non-vuoto e duplicato)

---

## 📺 SESSION 11.2 — Pass-Screen Modal & Phase Hook ✅ Done · 2026-04-28

**Tipo**: core UX
**Effort**: M (~2h)
**Dipendenze**: S11.1
**Files toccati**: `js/render-hotseat.js`, `js/game.js` (processNextPick),
`styles/main.css`

**Goal**: implementare il pass-screen modal e integrarlo in
`processNextPick` per le transizioni umano→umano.

### Requirements

#### 11.2.a — `showPassScreenModal(nextSlotIdx, onAcknowledge)`
In `js/render-hotseat.js`.

```js
function showPassScreenModal(nextSlotIdx, onAcknowledge) {
  const player = state.players[nextSlotIdx];
  if (!player) { onAcknowledge?.(); return; }

  const root = el("div", { class: "modal-bg pass-screen-bg", id: "passScreenBg" });
  const modal = el("div", { class: "modal pass-screen" });

  // Mini-classifica
  const ranked = [...state.players]
    .map((p, idx) => ({ p, idx }))
    .sort((a, b) => b.p.vp - a.p.vp);
  const standingsHtml = ranked.map(({ p }, i) =>
    `<div class="ps-rank-row${p === player ? ' is-next' : ''}">
       <span class="ps-rank">#${i + 1}</span>
       <span class="ps-name">${escapeHtml(p.name)}</span>
       <span class="ps-mau">${p.vp}<small>K MAU</small></span>
     </div>`
  ).join("");

  // Persona role hint (for AI named slots / clean name extraction)
  const roleMatch = player.name.match(/^(.+?)\s*\((.*?)\)/);
  const cleanName = roleMatch ? roleMatch[1] : player.name;
  const role = roleMatch ? roleMatch[2] : "";

  modal.innerHTML = `
    <div class="ps-eyebrow">🪑 PASS THE MOUSE</div>
    <div class="ps-avatar-large">${escapeHtml(cleanName[0])}</div>
    <h2 class="ps-name-large">${escapeHtml(cleanName)}</h2>
    ${role ? `<div class="ps-role">${escapeHtml(role)}</div>` : ''}
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

  // Big focusable button — keyboard friendly
  const btn = modal.querySelector(".ps-acknowledge");
  setTimeout(() => btn.focus(), 50);
  btn.onclick = () => {
    root.remove();
    if (typeof onAcknowledge === "function") onAcknowledge();
  };
}
```

#### 11.2.b — CSS in `styles/main.css`

```css
/* === S11.2: Pass-screen modal === */
.modal.pass-screen {
  text-align: center;
  max-width: 480px;
  padding: 32px 28px;
}
.ps-eyebrow {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.3em;
  color: var(--accent);
  text-transform: uppercase;
  margin-bottom: 18px;
}
.ps-avatar-large {
  width: 84px; height: 84px;
  border-radius: 50%;
  background: var(--ink);
  color: var(--paper);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--serif-display);
  font-size: 42px; font-weight: 600; font-style: italic;
  margin: 0 auto 14px;
  border: 3px solid var(--gold);
}
.ps-name-large {
  font-family: var(--serif-display);
  font-style: italic;
  font-size: 32px;
  margin: 0 0 4px;
  color: var(--ink);
}
.ps-role {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: 18px;
}
.ps-blurb {
  font-style: italic;
  color: var(--ink-muted);
  margin-bottom: 22px;
}
.ps-standings {
  background: var(--paper-2);
  border-radius: 6px;
  padding: 14px 16px;
  margin: 14px 0 22px;
  text-align: left;
}
.ps-standings-label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--ink-muted);
  text-transform: uppercase;
  margin-bottom: 8px;
}
.ps-rank-row {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--rule);
}
.ps-rank-row:last-child { border-bottom: none; }
.ps-rank-row.is-next { background: rgba(193, 154, 61, 0.15); padding: 6px 8px; border-radius: 4px; margin: 2px -8px; }
.ps-rank { font-family: var(--mono); font-size: 12px; letter-spacing: 0.1em; color: var(--ink-muted); width: 28px; }
.ps-name { flex: 1; font-family: var(--serif-display); font-style: italic; font-size: 16px; color: var(--ink); }
.ps-mau { font-family: var(--mono); font-size: 14px; font-weight: 600; color: var(--accent); }
.ps-mau small { font-size: 9px; letter-spacing: 0.2em; margin-left: 3px; color: var(--ink-muted); }

.ps-acknowledge {
  padding: 14px 28px !important;
  font-size: 16px !important;
}

/* Backdrop scuro più aggressivo per emphasize del pass */
.pass-screen-bg { background: rgba(31, 29, 25, 0.88) !important; }
```

#### 11.2.c — Hook in `processNextPick`

In `js/game.js`:
```js
async function processNextPick() {
  if (!state.isMultiplayer) flushDueDeferredReveals();

  if (state.pickIndex >= state.pickOrder.length) {
    state.phase = "between";
    state.activePicker = null;
    render();
    if (state.isMultiplayer) mpBroadcastState();
    await sleep(400);
    endOfQuarter();
    return;
  }
  const playerIdx = state.pickOrder[state.pickIndex];
  state.activePicker = playerIdx;
  const player = state.players[playerIdx];

  if (!player) return;

  const isAITurn = player.slotType === "ai" || !player.isHuman;
  if (!isAITurn) {
    // S11.2: hot-seat — show pass-screen if transitioning between humans
    if (state.isSharedScreen && shouldShowPassScreen(playerIdx)) {
      state.phase = "passing";
      render();  // render with "in attesa" indicator
      showPassScreenModal(playerIdx, () => {
        state.localSlotIdx = playerIdx;  // rotate POV
        state.phase = "human";
        state.aiHighlight = null;
        render();
      });
      return;
    }
    state.phase = "human";
    state.aiHighlight = null;
    if (state.isSharedScreen) state.localSlotIdx = playerIdx;
    render();
    if (state.isMultiplayer) mpBroadcastState();
    return;
  }
  // ... existing AI turn logic ...
}
```

#### 11.2.d — Phase "passing" turn indicator

In `js/render-masthead.js` `makeTurnIndicator`, aggiungere case:
```js
if (state.phase === "passing") {
  return el("span", { class: "turn-indicator" }, "🪑 In attesa del prossimo player...");
}
```

### Acceptance criteria

- [ ] Configura 2 umani + 2 AI, avvia partita.
- [ ] Dopo prima pick, se prossimo è umano diverso → pass-screen modal appare.
- [ ] Modal mostra: avatar grande + nome + classifica + button.
- [ ] Click button → modal sparisce, sidebar/masthead riflettono il nuovo player.
- [ ] Tra 2 AI consecutive → no pass-screen.
- [ ] Tra umano A → AI → umano A → no pass-screen (stesso umano).
- [ ] Tra umano A → AI → AI → umano B → pass-screen.

### Edge cases

- Tasto Enter quando pass-screen è aperto → aziona il button (focus auto)
- Avatar con nome non-ASCII (es. cirillico, emoji) → render OK
- Lunghi nomi → CSS truncate o wrap (verifica visivo)

---

## 🎯 SESSION 11.3 — Sequential Vision/OKR Drafts ✅ Done · 2026-04-28

**Tipo**: game flow
**Effort**: M (~2h)
**Dipendenze**: S11.1, S11.2
**Files toccati**: `js/hotseat.js`, eventualmente `js/render-modals.js`

**Goal**: implementare i draft sequenziali con pass-screen tra ogni
umano. Sostituisce gli stub di S11.1.

### Requirements

#### 11.3.a — `draftVisionsSequential(onComplete)`

In `js/hotseat.js`:
```js
function draftVisionsSequential(onComplete) {
  // 1) Tutti gli AI scelgono Vision sincronicamente
  state.players.forEach((p, idx) => {
    if (p.slotType === "ai") {
      const aiPool = visionsForAI();
      p.visionOptions = pickRandom(aiPool, Math.min(3, aiPool.length));
      p.vision = chooseAIVision(idx, p.visionOptions);
    }
  });
  // 2) Iterate humans sequentially with pass-screen between
  const humanIndices = state.players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.slotType === "human-host")
    .map(({ i }) => i);

  if (humanIndices.length === 0) {
    onComplete?.();
    return;
  }

  let cursor = 0;
  const showNextDraft = () => {
    if (cursor >= humanIndices.length) {
      onComplete?.();
      return;
    }
    const idx = humanIndices[cursor++];
    const player = state.players[idx];
    player.visionOptions = pickRandom(VISION_POOL, 3);

    const openModal = () => {
      state.localSlotIdx = idx;
      render();
      showVisionDraftModal({
        options: player.visionOptions,
        onPick: (vision) => {
          player.vision = vision;
          showNextDraft();
        },
      });
    };

    // Pass-screen only between humans (not before first one in single-human)
    if (cursor > 1 || (countHumans() > 1 && cursor === 1)) {
      // > 1: between humans
      // first pass: only if 2+ humans (otherwise skip pass-screen for solo)
      showPassScreenModal(idx, openModal);
    } else {
      openModal();
    }
  };
  showNextDraft();
}
```

Wait, actually let me simplify the condition. Pass-screen prima del PRIMO umano:
- Single human (1 umano + 3 AI): no pass-screen
- 2+ humans: pass-screen prima di ogni umano (incluso il primo)

```js
const shouldPassFirst = countHumans() > 1;

const showNextDraft = () => {
  if (cursor >= humanIndices.length) {
    onComplete?.();
    return;
  }
  const idx = humanIndices[cursor];
  cursor++;
  // ... open modal logic
  if (shouldPassFirst || cursor > 1) {
    showPassScreenModal(idx, openModal);
  } else {
    openModal();
  }
};
```

In realtà, se shouldPassFirst è true, sempre mostra. Se shouldPassFirst
è false, mai (1 solo umano).

Cleaner:
```js
const showNextDraft = () => {
  if (cursor >= humanIndices.length) { onComplete?.(); return; }
  const idx = humanIndices[cursor++];
  // ... open logic
  if (countHumans() > 1) {
    showPassScreenModal(idx, openModal);
  } else {
    openModal();
  }
};
```

#### 11.3.b — `draftOkrsSequential(onComplete)`
Stesso pattern di vision sequential, ma per OKR.
- AI auto-pick (chooseAIOKR) — già fatto da `startQuarter` durante setup
- Humans iterate sequentially, pass-screen tra ognuno
- Modal: `showOKRDraftModal` (già MP-aware da S10, usa `state.localSlotIdx`)

```js
function draftOkrsSequential(onComplete) {
  const humanIndices = state.players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.slotType === "human-host")
    .map(({ i }) => i);

  if (humanIndices.length === 0) { onComplete?.(); return; }

  let cursor = 0;
  const showNextDraft = () => {
    if (cursor >= humanIndices.length) {
      onComplete?.();
      return;
    }
    const idx = humanIndices[cursor++];
    const openModal = () => {
      state.localSlotIdx = idx;
      render();
      showOKRDraftModal(showNextDraft);
    };
    if (countHumans() > 1) {
      showPassScreenModal(idx, openModal);
    } else {
      openModal();
    }
  };
  showNextDraft();
}
```

Nota: l'OKR draft tra Q1↔Q2 e Q2↔Q3 deve usare `draftOkrsSequential` invece
di `showOKRDraftModal` direttamente. Hook in `showQuarterModal`'s
`nextQuarterBtn.onclick`:
```js
pickAndShowMarketEvent(() => {
  startQuarter();
  render();
  if (state.isMultiplayer) {
    // P2P branch (existing)
    ...
  } else if (state.isSharedScreen) {
    // S11.3: sequential drafts in hot-seat
    draftOkrsSequential(() => {
      render();
      processNextPick();
    });
  } else {
    // Single-player branch (existing)
    showOKRDraftModal(() => {
      render();
      processNextPick();
    });
  }
});
```

### Acceptance criteria

- [ ] 2+ umani: prima del Q1 ognuno vede il proprio Vision modal in
      sequenza, con pass-screen tra uno e l'altro.
- [ ] AI Vision auto-pickata (no modal).
- [ ] OKR draft Q1: stesso pattern.
- [ ] Q1→Q2 transition: market news visibile a tutti, poi OKR draft
      sequential per ogni umano con pass-screen.
- [ ] 1 umano: NO pass-screen al draft (solo lui sceglie).

---

## 🎬 SESSION 11.4 — POV Rotation & Render Gating ✅ Done · 2026-04-28

**Tipo**: render integration
**Effort**: S (~1.5h)
**Dipendenze**: S11.2, S11.3
**Files toccati**: `js/game.js` (varie), `js/render-pyramid.js` (audit),
`js/render-masthead.js` (audit)

**Goal**: assicurarsi che `state.localSlotIdx` rotti correttamente
durante turni umani, NON flashi durante sequenze AI, e che tutta la
UI rifletta il player attivo.

### Requirements

#### 11.4.a — Rotation on human turn entry
Già fatto in S11.2 (`state.localSlotIdx = playerIdx` quando human turn).
Verifica che funzioni in tutti i path:
- Pyramid pick (humanPickCard → next pick → processNextPick)
- AI sequence che termina su un umano

#### 11.4.b — No rotation during AI sequence
Quando 3 AI giocano di fila, `localSlotIdx` rimane sull'ultimo umano.
La masthead/sidebar mostra il "vecchio" umano durante le AI moves.
Questo è **intenzionale** per non causare flicker.

Verifica: in processNextPick AI branch, NON cambiare `state.localSlotIdx`.
Lo cambiamo solo nel branch `!isAITurn`.

#### 11.4.c — humanPickCard guard
In `js/game.js` `humanPickCard`:
```js
async function humanPickCard(row, col, cardEl) {
  if (state.gameOver || state.phase !== "human") return;
  if (!isPickable(row, col)) return;

  // S11: in hot-seat, double-check that activePicker matches localSlotIdx
  // (should be true if pass-screen rotated correctly)
  if (state.isSharedScreen && state.activePicker !== state.localSlotIdx) {
    console.warn("[hotseat] activePicker mismatch:", state.activePicker, "vs localSlotIdx:", state.localSlotIdx);
    return;
  }
  // ... existing logic uses state.localSlotIdx ...
}
```

In single-player, localSlotIdx===0===activePicker (umano sempre slot 0).
In MP, già check correlativo. In hot-seat, deve match dopo pass-screen.

#### 11.4.d — Render audit

Verificare che TUTTI questi usino `state.localSlotIdx ?? 0`:
- ✅ `renderMasthead` (già S10)
- ✅ `renderTableau` (chiamato da `render()` con `state.players[localIdx]`)
- ✅ `renderAssets`, `renderOKRs`, `renderAwardsForecast` (idem)
- ✅ `renderByline` (esclude localIdx)
- ✅ `renderPyramidCard` (usa per affordability)
- ✅ `showOKRDraftModal` (post S10 fix)
- ✅ `showQuarterModal` (post S10 fix)
- ✅ `showEndGameModal` (post S10 fix)

Audit + fix se ne trovi altri hardcoded a 0.

### Acceptance criteria

- [ ] 4 umani: ogni turno la sidebar/masthead mostra il giocatore corrente
- [ ] Tra umani: pass-screen → POV switch → UI riflette
- [ ] Sequenza 4 AI: UI rimane stabile (non flasha tra player)
- [ ] Single human: UI fissa sul player umano sempre
- [ ] Console: nessun warning di activePicker mismatch durante una partita normale

---

## ✨ SESSION 11.5 — Polish: Animations, Sound, Transitions ✅ Done · 2026-04-28

**Tipo**: UX polish
**Effort**: M (~2h)
**Dipendenze**: S11.4
**Files toccati**: `styles/main.css`, `js/render-hotseat.js`, `js/audio.js`

**Goal**: rendere le transizioni di turno gradevoli e coerenti con
l'editorial style del gioco.

### Requirements

#### 11.5.a — Pass-screen slide-in animation

CSS `@keyframes` per il modal entry:
```css
@keyframes passScreenSlideIn {
  from { opacity: 0; transform: translateY(-30px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.modal.pass-screen {
  animation: passScreenSlideIn 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.1) forwards;
}
@keyframes passScreenBackdropFade {
  from { background: rgba(31, 29, 25, 0); }
  to   { background: rgba(31, 29, 25, 0.88); }
}
.modal-bg.pass-screen-bg {
  animation: passScreenBackdropFade 0.4s ease-out forwards;
}

/* Avatar pulse — subtle breath */
@keyframes avatarBreath {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(193, 154, 61, 0.4); }
  50%      { transform: scale(1.04); box-shadow: 0 0 0 12px rgba(193, 154, 61, 0); }
}
.ps-avatar-large {
  animation: avatarBreath 2.4s ease-in-out infinite;
}

/* Reduced-motion override */
body.reduced-motion .modal.pass-screen,
body.reduced-motion .modal-bg.pass-screen-bg {
  animation: none;
}
body.reduced-motion .ps-avatar-large {
  animation: none;
}
```

#### 11.5.b — Sound cue al pass-screen

In `js/audio.js`, nuovo sound `sndPassScreen`:
```js
function sndPassScreen() {
  if (!getAudioEnabled()) return;
  const ctx = unlockAudio();
  if (!ctx) return;
  // Soft chime: 2 notes ascending C major (C4 → E4 → G4)
  const now = ctx.currentTime;
  [261.63, 329.63, 392.00].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.18 * MASTER_GAIN, now + i * 0.08 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.42);
  });
}
```

Hook in `showPassScreenModal`: chiamare `sndPassScreen()` all'apertura.

#### 11.5.c — Smooth transition fra modali

Quando il pass-screen chiude e il Vision/OKR modal si apre, è uno snap
visivo. Aggiungere un fade-out al pass-screen + delay 200ms prima di
aprire il prossimo modal:

```js
btn.onclick = () => {
  modal.style.animation = "passScreenSlideOut 0.25s ease-in forwards";
  setTimeout(() => {
    root.remove();
    if (typeof onAcknowledge === "function") onAcknowledge();
  }, 240);
};
```

CSS:
```css
@keyframes passScreenSlideOut {
  to { opacity: 0; transform: translateY(20px) scale(0.96); }
}
```

#### 11.5.d — Highlight del player attivo nella byline

Quando rotation cambia, l'oldHighlight nella byline (small dot indicating
"just played") già esiste (`aiJustPlayed`). Per hot-seat, aggiungiamo un
effetto simile sul player umano che ha appena giocato → glow gold sul
loro byline cell per 1.5s.

In `renderByline`, aggiungere classe `.just-acted` se appropriate.

### Acceptance criteria

- [ ] Pass-screen entra con slide-in fluido
- [ ] Avatar fa "breath" pulse delicato durante l'attesa
- [ ] Sound cue all'apertura (se audio enabled)
- [ ] Click "Procedi" → fade-out + 240ms delay prima del prossimo modal
- [ ] Reduced-motion disabilita animations + sound (ma button funziona)
- [ ] Byline cell del player che ha appena agito si illumina brevemente

---

## 🧪 SESSION 11.6 — Edge Cases, Manual Playtest, Docs ✅ Done · 2026-04-28

**Tipo**: validation + docs
**Effort**: M (~2.5h)
**Dipendenze**: S11.5
**Files toccati**: `README.md`, `CONTEXT.md`, `CHANGELOG.md`,
`HOTSEAT-ROADMAP.md` (questo file), eventualmente `tests/test-rules.js`

**Goal**: chiudere Phase 11 con manual playtest + documentazione.

### Requirements

#### 11.6.a — Manual playtest checklist

Eseguire una partita completa per ogni configurazione:

```
☐ 1 umano + 3 AI (degrade, no pass-screen)
☐ 2 umani + 2 AI
☐ 3 umani + 1 AI
☐ 4 umani (tutti pass-screen)
☐ Tutti scenarios: Standard, Bear Market, AI Hype, Remote First
☐ Difficulty: Junior, Senior, Director
☐ Verifica modal pubblici: Q-end, Market News, Final Sequence,
  End-game classifica — visibili senza pass-screen
☐ Reduced motion: animations disabilitate, gameplay invariato
☐ Audio: sound cue del pass-screen rispetta toggle audio
```

#### 11.6.b — Tests per pure functions

In `tests/test-rules.js` (o nuovo `tests/test-hotseat.js`):
```js
describe("hot-seat helpers [S11]", () => {
  it("isHumanSlot returns true for human-host slots", () => { ... });
  it("countHumans counts human slots", () => { ... });
  it("shouldShowPassScreen logic: false when single human", () => { ... });
  it("shouldShowPassScreen logic: true when human transition", () => { ... });
});
```

Target: ~6 nuovi test, totale ~58/58 pass.

#### 11.6.c — Documentation

**README.md** — nuova sezione "🪑 Hot Seat Mode":
- Come iniziare (splash button)
- Setup lobby (slot config)
- Pass-screen flow
- Differenze vs P2P multiplayer
- Limitations (open table, no Block, single profile)

**CONTEXT.md** — sezione "Phase 11 additions":
- File map (`hotseat.js`, `render-hotseat.js`)
- Critical gotchas (e.g., "isMultiplayer e isSharedScreen sono mutex —
  mai entrambi true")
- Migration cheatsheet (come aggiungere un nuovo modal pubblico in MP+HS)

**CHANGELOG.md** — entry `[S11.1-S11.6]` con sintesi delle 6 session.

**HOTSEAT-ROADMAP.md** (questo file) — marcare tutte le session ✅ Done.

#### 11.6.d — Cross-mode testing

Verifica che single-player e P2P multiplayer NON siano stati rotti:
- ☐ Avvia single-player normalmente, completa una partita
- ☐ Avvia P2P MP (host + guest in 2 browser tabs), completa una partita
- ☐ Switch tra modalità: hot-seat → splash → single-player → ok
- ☐ Cleanup: dopo hot-seat end-game, "Nuova partita" torna pulito allo splash

### Acceptance criteria

- [ ] 6+ partite di playtest completate, una per ogni configurazione
- [ ] Tests pass (52→58 atteso)
- [ ] README ha sezione Hot Seat
- [ ] CONTEXT.md ha gotchas Phase 11
- [ ] CHANGELOG entry committed
- [ ] HOTSEAT-ROADMAP.md marca session done

---

## 🗺️ Dependency graph

```
S11.1 (Lobby) ──→ S11.2 (Pass-screen) ──→ S11.3 (Drafts) ──→ S11.4 (POV) ──┬─→ S11.5 (Polish)
                                                                          │
                                                                          └─→ S11.6 (Playtest + docs)
```

S11.5 e S11.6 possono parallelizzare dopo S11.4.

---

## 📐 Definition of Done — Phase 11

Phase 11 chiusa quando:

1. ✅ 4 amici reali, 1 PC, 1 partita completa funzionante
2. ✅ Tutte le configurazioni di slot (1-4 umani) si comportano correttamente
3. ✅ Pass-screen è chiaro e non-ambiguo (nessuno si confonde su chi tocca)
4. ✅ Single-player e P2P MP non hanno regressioni
5. ✅ Tests automatici passano (incl. nuovi hot-seat tests)
6. ✅ README aggiornato

---

## 🤔 Open follow-ups (post-Phase-11)

Cose che la Phase 11 lascia volutamente scoperte e potrebbero diventare
Phase 11.X o backlog:

- **Multi-profile localStorage**: salvare stats per ogni umano, non solo slot 1.
  Richiede UI di profile selection in lobby.
- **Daily mode hot-seat**: stesso seed per il gruppo. Banale tecnicamente,
  ma richiede UX tweak in lobby.
- **Hidden info mode**: Vision/OKR nascosti agli avversari. Richiederebbe
  privacy logic complicata su pass-screen e render. Meglio come modalità opt-in.
- **Block & React in hot-seat**: difficile UX (chi clicca il block? quando?
  il timer è 4s, troppo poco per "guarda chi è seduto qui"). Probabilmente
  non vale la pena.
- **Tutorial overlay** per il primo Hot Seat play (spiega il pass-screen).
- **Score history / replay**: salvare la partita per analisi a posteriori.

---

## 🎮 Quando iniziare?

Suggerito: **un weekend dedicato** per le 6 session, perché S11.6 richiede
playtest reale con 2-4 amici e va fatto a freddo (non subito dopo lo
sviluppo, per testare con menti pulite).

Alternativa **graduale**: S11.1+S11.2 per avere il MVP "pass-screen funziona"
in ~4h, poi S11.3+S11.4 per il game flow completo (~3.5h), infine
S11.5+S11.6 quando hai tempo per polish (~4.5h).

**Effort totale Phase 11**: ~12h V1 polished.

---

_Roadmap stilata 2026-04-28 dopo che l'utente ha chiesto la modalità
Hot Seat (pass-and-play locale) come complemento al P2P multiplayer.
Decisioni di design validate dall'utente in chat: open table, single-human
degrade permitted, naming "Hot Seat", single AI difficulty selector,
Block & React disabilitato, mini-classifica nel pass-screen, V1 polished._
