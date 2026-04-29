# Stack & Balance — Project Context (Continuation Guide)

> Documento di handoff: leggi questo prima di iniziare una nuova sessione
> di sviluppo. Pensato per orientarsi in ~5 minuti se il contesto della
> conversazione è stato resettato.
>
> **Source of truth gerarchia**:
> 1. `CONTEXT.md` (questo file) — orientation, conventions, gotchas
> 2. `ROADMAP.md` — piano build (Phases 1-8, ✅ chiuso)
> 3. `GAMEPLAY-ROADMAP.md` — piano refinement post-launch (Phase 9, 🟡 7/8)
> 4. `MULTIPLAYER-ROADMAP.md` — Phase 10 P2P multiplayer (⬜ aperto)
> 5. `BALANCE-NOTES.md` — analisi numerica + playtest protocol (S9.2+)
> 6. `GIT-WORKFLOW.md` — git/GitHub workflow + Pages + CI
> 7. `CHANGELOG.md` — log dettagliato di ogni session implementata
> 8. Codice in `js/`, `styles/` — implementazione

---

## ⚡ TL;DR (60-second pitch)

- **Cos'è**: prototipo browser di un boardgame "drafting strategico tema startup tech".
  4 giocatori (1 umano + 3 AI), 3 trimestri, snake draft da una piramide
  Mahjong-style 4×6. Vince chi ha più **utenti (K MAU)** a fine Q3.
- **Stack**: HTML + CSS modulare + vanilla JS classic scripts (no build step,
  no librerie). Apre con `index.html` su browser. Persistenza profilo via
  `localStorage`.
- **Stato sviluppo**: Phase 1 (Decision Pressure) e Phase 2 (Strategic
  Identity) completate. Fasi 3-8 ancora da fare. Vedi `ROADMAP.md`.
- **Architettura chiave**: tutti i magic number in `js/balance.js`,
  cataloghi carte in `js/data.js`, modifier engine introdotto in S2.3.
- **Stile UI**: editorial / boardgame moderno (parchment cream, font Fraunces
  italic + Newsreader serif + JetBrains Mono per numeri).

---

## 🚀 First 5 minutes when restarting

1. Leggi questo file (TL;DR + sezione "Phase status")
2. Apri `ROADMAP.md` → tabella macro-timeline → identifica prossima session
3. Apri `CHANGELOG.md` → ultimo entry, leggi "Why" e "Files touched"
4. Skim `js/balance.js` → capisci che le costanti vivono qui
5. Apri il file da modificare e cerca `// SX.Y:` per vedere modifiche recenti

---

## 🎮 Game overview

### Win condition
Più **K MAU** (Monthly Active Users, internamente `vp`) a fine Q3.

### Flow di una partita
```
splash (con greeting personalizzato) → click "Avvia partita"
  → [VISION DRAFT MODAL]: 3 visioni, scegli 1 (S2.3)
  → applyStartingModifiers (vision applica delta start state)
  → startQuarter (Q1)
  → [OKR DRAFT MODAL]: 3 OKR, scegli 1 (S2.1)
  → render() + processNextPick()
  → loop snake-draft: 24 pick (4 player × 6)
    - human turno: clicca carta, animazione, applica effetto, prossimo
    - AI turno: highlight carta scelta, animazione, applica effetto
  → [QUARTER MODAL]: bonus dipartimentali + OKR + budget halving + debt penalty
  → ripeti × 3 quarter
  → [END-GAME MODAL]: 7 awards + 4 synergies + budget→users + debt penalty
  → recordGameResult() salva su profilo
```

### Risorse del player
- `budget` (💰) — costo cards, evapora 50% fra Q (S1.2)
- `tempo` (⏱) — capacità per Q, ridotto da debt (S1.1.1)
- `talento` (🧠) — capacità per Q, consumato via `talentoUsed` (S1.2)
- `dati` (📊) — accumula
- `morale` (🚀) — clamped 0-10
- `techDebt` (🐞) — penalty MAU + tempo loss + endgame
- `vp` — K MAU accumulati (display: `${vp}K`)
- `permanents` — { ci_cd, data_lake, design_system, monitoring }

### Carte
- **47 carte** distribuite in 3 catalog tematici per Q:
  - Q1 Discovery (14): research, MVP, hire foundationali
  - Q2 Build (17, +5 Crunch S1.1): infrastructure, scaling, refactor, **5 Crunch Cards** ship-fast/pay-later
  - Q3 Launch (16): marketing, optimization, sales
- Tipi: Discovery / Hiring / Feature / Tool / BugFix / Meeting / Funding / Training / Launch
- **Catene** (S1.x): alcune carte hanno `chainFrom: [ids]` + `chainDiscount: {res: n}`
  → se possiedi un predecessore, sconto sul costo

### Mechaniche di scoring
1. **MAU diretti** dalle card (`effect.vp`) durante il gioco
2. **Quarter dominance** (1 dept lead = +2 MAU + 1 risorsa)
3. **OKR completati** (1 per Q, drafted 3→1, reward 3-6K)
4. **End-game awards** (7 stat awards tiered + 4 synergy multi-condizione)
5. **Budget conversion** end-game: floor(budget/3) → +K MAU
6. **Tech Debt penalty**: −2K per debt residuo end-game

---

## 🏗️ Architecture

### File structure
```
test/
├── index.html              # 1 entry, links CSS + load JS in order
├── ROADMAP.md              # piano sviluppo 8 fasi · 19 sessions
├── CHANGELOG.md            # log dettagliato per session
├── CONTEXT.md              # questo file
├── styles/
│   ├── main.css            # vars, layout, modal, top-bar, banner, splash, toast, log
│   ├── board.css           # gantt + pyramid + opponents
│   └── player.css          # bacheca + risorse + OKR + awards
└── js/
    ├── data.js             # CATALOG_Q1/Q2/Q3 + OKR_POOL + lookup
    ├── visions.js          # VISION_POOL (S2.3) + helpers
    ├── util.js             # shuffle, clamp, sleep, el, deptLabel, showToast
    ├── user.js             # profile (localStorage)
    ├── balance.js          # ⭐ TUTTI i magic numbers (single source)
    ├── state.js            # constants + state vars + newPlayer + log + snapshot
    ├── rules.js            # adjustedCost, applyEffect, canAfford, computeAwards,
    │                       # computeSynergies, pyramid logic, takeFromPyramid
    ├── ai.js               # decideAIPickFromPyramid + chooseAIOKR + AI_DEPT_BIAS
    ├── game.js             # startGame, startQuarter, processNextPick,
    │                       # humanPickCard, endOfQuarter, endGame,
    │                       # showQuarterModal, draftVisionsFlow, applyStartingModifiers
    ├── render.js           # ⭐ orchestrator: render(), renderSplash, escapeHtml
    ├── render-pyramid.js   # board: renderPyramid, renderPyramidCard         (S8.1)
    ├── render-tableau.js   # bacheca: renderTableau (con S7.2 visual debt)   (S8.1)
    ├── render-sidebar.js   # right panels: assets, OKR, awards, log          (S8.1)
    ├── render-masthead.js  # header: masthead, progress, byline, profileChip (S8.1)
    ├── render-modals.js    # game-flow modali: vision/OKR/scenario/event/... (S8.1)
    ├── render-profile.js   # profile modali: setup/settings/achievements     (S8.1)
    └── main.js             # boot — chiama showProfileSetup o renderSplash
```

### Script load order (in `index.html`)
```
data.js → visions.js → scenarios.js → util.js → user.js → audio.js
  → achievements.js → balance.js → state.js → rules.js → ai.js → game.js
  → render-pyramid.js → render-tableau.js → render-sidebar.js
  → render-masthead.js → render-modals.js → render-profile.js
  → render.js → main.js
```

L'ordine conta: `balance.js` deve precedere chi lo usa (state/rules/ai/game),
`visions.js` deve precedere `rules.js`/`game.js`/render-*. `util.js` deve
precedere ogni `render-*.js` (per `el`, `showToast`). I sub-moduli render-*
possono caricarsi in qualsiasi ordine TRA loro (sono tutti `function`
declarations globali, e l'invocazione runtime succede dopo che TUTTI
gli script sono parsed). `render.js` per convenzione viene per ultimo,
prima di `main.js`, perché è l'orchestrator.

### Key globals
- `state` (in state.js) — mutable game state, populated da `startGame`
- `BALANCE` (in balance.js) — `Object.freeze`d, costanti tunable
- `CATALOG_Q1/Q2/Q3` + `ALL_CARDS_BY_ID` + `CARD_META` (data.js)
- `VISION_POOL` (visions.js)
- `OKR_POOL` (data.js)
- `DEPT_LETTER`, `DEPT_ORNAMENT`, `AI_NAMES`, `QUARTER_LABELS` (data.js / state.js)
- `AI_DEPT_BIAS`, `AI_OKR_PREFERENCES` (ai.js)

### State shape (mental model)
```js
state = {
  quarter: 1..3,
  pickIndex: 0..23,
  pickOrder: [0,1,2,3,3,2,1,0,...],   // snake draft for current Q
  pyramid: [[slot,...],...4 rows × 6 cols],  // each slot: {card, faceUp, taken}
  players: [Player×4],
  log: [{msg, cls}],
  phase: "human" | "ai" | "animating" | "between",
  aiHighlight: {row,col} | null,
  activePicker: 0..3 | null,
  justPlayedCardId, aiJustPlayed, prevResources, ...UI flags
};

Player = {
  name, isHuman,
  budget, tempo, talento, talentoUsed, dati, morale, techDebt, vp,
  played: [card],
  permanents: { ci_cd?, data_lake?, design_system?, monitoring? },
  okrs: [okr],         // chosen this Q (length 1 after S2.1)
  okrOptions: [okr×3], // S2.1 draft pool
  okrCompleted: [id],
  vision: VisionObject | null,    // S2.3
  visionOptions: [vision×3],      // S2.3
  _quarterPlays: [card],          // reset each Q
  _quarterStartMorale: number,    // S2.1 snapshot for morale_boost OKR
  _tempoDebtLoss: number,         // S1.1.1 display hint
  _preAwardVp, _awards, _awardsTotal, _budgetConv, _debtPenalty // end-game
};
```

---

## 🎨 Conventions and patterns

### 1. The Modifier Engine (S2.3 — central pattern)
Vision Cards modificano regole tramite uno schema dichiarativo:
```js
v.modifiers = {
  awardMultipliers: { id: factor },           // applied in computeAwards
  costModifiersByType: { Type: { res: delta } }, // applied in adjustedCost
  costModifiersByCardId: { id: { res: delta } },
  effectMultipliersByType: { Type: { res: factor } }, // applied in applyEffect
  effectBonusByType: { Type: { res: amount } },
  excludeCardTypes: [Type],   // HUMAN ONLY, applied in startQuarter pool filter
  excludeCardIds: [id],       // HUMAN ONLY
  startingBudget, startingTalento, startingMorale, startingPermanents,
  debtPenaltyOffset, debtTempoLossOffset,
};
```
**Order of application** in `adjustedCost(player, card)`:
1. Base `card.cost`
2. CI/CD perm: −1⏱ on Feature/Launch
3. Chain: discount if predecessor owned
4. Vision `costModifiersByType[card.type]`
5. Vision `costModifiersByCardId[card.id]`
6. Clamp ≥ 0

### 2. Single-source balance
**Mai hardcodare numeri** in rules/game/ai. Sempre `BALANCE.X.Y`. Eccezioni
documentate: `BALANCE.AI` ha alias `const W = BALANCE.AI` per leggibilità
nello scoring loop.

Per **adjustment in S1.3**: ho estratto a `balance.js`. Per **bilanciamento
futuro** (S1.3 chiede playtest): cambia solo `balance.js`, l'effetto si
propaga ovunque.

### 3. Async modal pattern
I draft modal (Vision, OKR) bloccano il flusso e chiamano `onComplete`:
```js
function startGame() {
  state = {...};
  draftVisionsFlow(() => {
    applyStartingModifiers();
    startQuarter();
    showOKRDraftModal(() => {
      render();
      processNextPick();
    });
  });
}
```
**Mai chiamare `render()` o `processNextPick()` prima di `onComplete`** —
altrimenti la game loop parte con state non finalizzato.

### 4. Editorial style
- **Font**: `Fraunces` (display, italic come signature), `Newsreader` (body), `JetBrains Mono` (numeri)
- **Palette**: parchment cream (`--paper`), ink (`--ink`), oxblood (`--accent`), gold (`--gold`)
- **Dipartimenti**: `--product` (terracotta), `--eng` (ink blue), `--data` (forest green)
- **Players**: `--p0` (you, ink), `--p1` (Marco, terracotta), `--p2` (Alessia, viola), `--p3` (Karim, verde)
- **Card design**: top dept band 5px, wax-seal MAU corner, dept emblem (P/E/D in cerchio italic),
  ornamento per-dept (`❦` Product / `◈` Eng / `⁂` Data), Nº collezionabile

### 5. Naming conventions
- `vp` (internal) ↔ "MAU" / "K MAU" / "utenti" (display)
- Tutto display in **Italiano** ("Tocca a te", "Pesca", "Scarta")
- Card descriptions in `data.js` in italiano
- Code comments in italiano OK, ma logging/debug in inglese va bene

### 6. State mutation rules
- **`payCost` mutates** `budget`, `tempo`, `dati`, `morale`, `talentoUsed` (not `talento`!)
- **`applyEffect` mutates** tutto incluso `vp`, `talento` (su Hire), `permanents` (su Tool)
- **`takeFromPyramid` orchestra** payCost + applyEffect (action="play") oppure +budget/+debt (action="discard")
- Mid-Q resource changes triggherano animazioni via `state.prevResources` snapshot

### 7. Card numbering
`CARD_META[id] = { num: "01..47", quarter: 1..3 }` — usato per "Nº 14" footer e tooltip.
Auto-numerato all'init di data.js iterando i 3 catalog.

### 8. Session documentation workflow
Per ogni nuova session:
1. Leggi requirements da `ROADMAP.md`
2. Implementa modifiche
3. Aggiorna `ROADMAP.md`: marca session ✅ Done con data + Actual effort + link `[Sx.y]`
4. Aggiungi entry a `CHANGELOG.md`: Added / Changed / Why / Files / Acceptance criteria
5. Marca le acceptance verificate (✅) vs quelle che richiedono playtest (⚠)
6. Quando una phase è completa, aggiorna macro-timeline table in ROADMAP

---

## ✅ Phase status (as of 2026-04-27)

| Phase | Sessions | Status | Notes |
|-------|----------|--------|-------|
| **1** Decision Pressure | 3 + 1 patch | ✅ Done | Crunch Cards + Bug Interrupt + Talent/Budget pressure + balance.js extraction |
| **2** Strategic Identity | 3 | ✅ Done | OKR drafted + Synergy awards + Vision Cards |
| **3** Player Interaction | 2 | ✅ Done | Sabotage cards + tiered dominance + Block & React |
| **4** Pacing & Climax | 2 | ✅ Done | Market events + Investor pitch + climax sequence |
| **5** AI Quality | 2 | ✅ Done | 3 personas distinte + lookahead 1-step + difficulty selector |
| **6** Replayability | 3 | ✅ Done | 4 Scenarios + 13 Achievements + Daily Seed Mode |
| **7** Feel & Polish | 2 | ✅ Done | Combo/award/synergy/OKR celebrations + Tech Debt cracks + audio cues |
| **8** Code Quality | 2 | ✅ Done | render.js splittato in 7 file <500 LOC + 30 test pass + README per estensioni |

**Implementate**: S1.1, S1.1.1, S1.2, S1.3, S2.1, S2.2, S2.3, S3.1, S3.2, S4.1, S4.2, S5.1, S5.2, S6.1, S6.2, S6.3, S7.1, S7.2, S8.1, **S8.2** (20 sessions / patches).

**🎉 Roadmap a 8 fasi: 100% completato.** Il gioco è feature-complete,
polished, modulare, testato (30/30 verde), documentato. Per nuove feature
vedi `ROADMAP.md → 📚 BACKLOG` (multiplayer async, mobile, dark mode, etc.).

---

## ⚠️ Critical gotchas

1. **Tempo min 1**: anche con tantissimo debt, `Math.max(1, ...)` garantisce
   gameplay viability. Se rimuovi questo clamp, partite estreme bloccano.

2. **Pyramid filter solo HUMAN**: `excludeCardTypes`/`excludeCardIds` del
   Vision si applicano solo all'umano (`state.players[0]?.vision`). Se
   AI avesse Bootstrapped, otterrebbe il bonus +4💰 senza il malus
   (perché il pool è condiviso). Per questo `visionsForAI()` filtra
   queste visions dal pool AI.

3. **Budget halving NON dopo Q3**: in `endOfQuarter`, controlla
   `state.quarter < NUM_QUARTERS` prima di applicare halving. Q3 va
   in endGame che ha la full conversion.

4. **`talentoUsed` reset in `startQuarter`** sì, in `endOfQuarter` no.
   Se sposti la reset, rompi le animazioni mid-Q.

5. **`_quarterStartMorale` snapshot in `startQuarter`** — lo serve
   l'OKR `morale_boost`. Senza, il check sempre `0` di delta.

6. **Order in `startQuarter`**: vision starting modifiers → tempo (con
   debt loss formula che usa `debtTempoLossOffset` del vision) → OKR
   draft generation → log.

7. **Order in `applyEffect`**: clone `e` prima delle mutazioni, applica
   vision multipliers + bonuses, POI procedi con le mutazioni standard.
   Se modifichi `card.effect` direttamente, mutate il pool globale (bug).

8. **`Object.freeze`** è solo top-level su `BALANCE`. Le sub-keys sono
   anch'esse frozen perché usate `Object.freeze` ricorsivo manuale. Se
   aggiungi nuove sezioni, ricordati di freezarle anche loro.

9. **Modal HTML è in `game.js`** (non render-modals.js) per cohesion col
   game flow: **Quarter modal** e **end-game modal** sono in `game.js`.
   Tutti gli altri modali sono splittati (post S8.1):
   - `render-modals.js` → `showOKRDraftModal`, `showVisionDraftModal`,
     `showScenarioChooser`, `showMarketNewsModal`, `showInvestorPitchModal`,
     `showVcReactionModal`, `showBlockOverlay`, `showHelpModal`
   - `render-profile.js` → `showProfileSetup`, `showProfileSettings`,
     `showNewAchievementsModal`, `renderAchievementsHtml`

10. **AI scoring usa `canAfford` che usa `talentoUsed`** — quindi quando
    AI sceglie sequenzialmente, ogni decisione vede lo stato aggiornato.
    Se aggiungi un AI lookahead (S5.2), ricordati di simulare il
    talentoUsed oltre alle altre risorse.

11. **`pickRandom` shuffles a copy**, non mutates l'argomento. OK.

12. **Profile persistence**: `localStorage.stack-balance.profile.v1`. Se
    cambi schema in modo breaking, bumpa la version key.

13. **Card-mast text overflow**: `letter-spacing: 0.10em` (era 0.18em prima
    di S2.x fix). "DISCOVERY" è il type più lungo. `padding-right: 40px`
    riserva spazio per la wax seal. Non aumentare letter-spacing senza
    testare.

14. **`overflow: visible` su `.pcard.d0`**: necessario per il hover badge
    "Click → pesca" che è a `bottom: -14px`. Le carte d1/d2/d3 mantengono
    `overflow: hidden` per il sliver effect.

15. **🐛 RECURRING BUG — `<button>` come card-layout**: il selettore globale
    `button {}` in main.css setta `text-transform: uppercase`,
    `letter-spacing: 0.04em`, e ha pseudo-class :hover/:focus che fanno
    `background: var(--ink); color: var(--paper-3)`. Quando crei un nuovo
    "card-as-button" (es. Vision draft, OKR draft, Scenario chooser, MP
    entry option), DEVI:
    - Prefissare con `.modal` per specificità (0,3,0) > button:hover (0,2,1)
    - Override esplicito di `:hover`, `:focus`, `:focus-visible` con
      `background`, `color`, `outline: none` desiderati
    - Reset `text-transform: none` + `letter-spacing: normal` su card
      e figli (titoli, descrizioni)
    Il primo button in un modal auto-riceve `:focus` al render: senza fix
    appare già scuro PRIMA dell'hover. Già fixato 4 volte (S2.x Vision,
    S2.x OKR, S6.x Scenario, S10 MP). Considerare in futuro una utility
    class `.btn-card` per evitare il 5° fix.

---

## 🧠 Mental model — perché il gioco funziona

**Loop di pressione (Phase 1)**:
- Tech Debt non è cosmetico → costa MAU + tempo + Clean Code Award
- Budget non si accumula → spend or lose 50%
- Talento è capacità per Q → non puoi infinite-stack hires

**Identità (Phase 2)**:
- Vision = identità di run (game-wide)
- OKR drafted = obiettivo tattico Q (per-Q)
- Synergy awards = ricompensa commitment (end-game)

**Decision pressure**:
- Ogni pesca è un tradeoff (Crunch Card vs Pulito? OKR diversification vs ship_features?)
- Le synergie sono in tensione tra loro (Lean Op vuole talento ≤4, Talent Pool ≥5)
- Le Vision creano ASIMMETRIA strategica (no Funding per Bootstrapped, etc.)

**Sources of MAU end-game**:
- Direct from cards (~10-30K)
- Per-Q dominance (~6K se domini 1 dept ogni Q)
- OKRs completed (3-6K × 3Q = 9-18K)
- Stat awards tiered (max 12K each, 5 awards)
- Synergy awards (max 15K each, 4 synergie)
- Budget→users conversion
- − tech debt penalty

Tipica partita end ranges: 30-80K MAU. Build focused può raggiungere 60-80K, spread 30-50K.

---

## 🔍 How to validate nothing broke

### Quick sanity grep
```bash
grep -c "BALANCE\." js/*.js   # tutti i file rules/game/ai/state usano BALANCE
grep -c "id: \"" js/data.js   # 47 cards + 14 OKR = 61 (post S2.1)
grep -cE "^\s*id:" js/visions.js  # 8 visions
grep -c "use strict" js/*.js  # tutti i file JS hanno "use strict"
```

### Manual playthrough checklist
1. Apri `index.html` nel browser
2. Profile setup modal compare al primo run
3. Vision draft modal compare cliccando "Avvia partita"
4. OKR draft modal compare dopo Vision draft
5. Pyramid renders 6 colonne, depth 0 cards visibili in fronte
6. Click su carta affordable → animazione fly + applica effetto
7. AI turni: highlight pulsante sulla loro pick + toast
8. Fine Q: modal con bonus + budget banner (se Q1/Q2)
9. Fine Q3 → modal end-game con awards + classifica
10. "Nuova partita" reset tutto, profile persiste

### Common breakage signs
- `state.players[0].vision is undefined` → draftVisionsFlow non chiamato. Check in startGame.
- Talent capacity sembra infinita → `talentoUsed` non incrementato. Check `payCost`.
- "DISCOVERY" tagliato nel mast → letter-spacing/padding regression in `board.css`.
- Hover badge non visibile → `overflow: hidden` reintrodotto su `.pcard.d0`. Deve essere `visible`.
- Budget halving fa 0K MAU sempre → `BUDGET.CONVERSION_DIVISOR` controllato. Default `3`.
- Synergy non scattano mai → check `awardMultipliers` non azzeri i punti, o requirements si valuta a `false` per bug.

---

## 📐 Code style notes

- **JS**: vanilla ES6+, no transpilation. Use `?.` optional chaining freely.
- **CSS**: BEM-ish naming (e.g. `.tab-card .tc-name`). Use CSS vars for colors.
- **Comments**: marca le modifiche con `// SX.Y:` per facilitare review.
- **Magic numbers**: in `balance.js`. Eccezioni: animazioni timing
  (560ms, 900ms etc.) sono inline in CSS/JS perché di "feel" non di "balance".
- **No build step**: file servibili direttamente da `file://`. Niente
  ES modules (CORS issues su file://).

---

## 🤖 AI personality notes (per Phase 5 quando arriverà)

Già implementato (S1.1, S2.1):
- Department bias per playerIdx: 1=eng, 2=product, 3=data
- OKR preferences mapping in `AI_OKR_PREFERENCES`
- Debt-aware scoring: penalizza Crunch Cards in base al debt corrente
- Real-BugFix bonus: scala con `|techDebt rimosso|` quando proprio debt ≥ 3

Da fare (S5.1, S5.2):
- Personas distinte (Scaler / Hustler / Auditor) con weights diversi
- Lookahead 1-step: simula pick + revealed card
- Difficulty selector: Junior / Senior / Director

---

## 📦 Dependencies summary

**Runtime**: nessuna libreria. Solo browser standard (DOM + localStorage + setTimeout).

**Asset esterni**:
- Google Fonts: Fraunces, Newsreader, JetBrains Mono (preconnect in `<head>`)

**Storage**:
- `localStorage["stack-balance.profile.v1"]` per il profile

---

## 🎯 If you're picking up where I left off

**🎉 Il roadmap a 8 fasi è chiuso (20/20 sessions).** Niente di
"obbligatorio" rimasto. Le strade aperte:

### A. Playtest esteso & balance tuning
Il roadmap originale chiedeva playtest tra le fasi (vedi nota in
ROADMAP.md macro-timeline). Con scenari + difficoltà + daily ora abbiamo
**8 vision × 4 scenari × 3 difficoltà × 14 OKR** = ampia copertura per
trovare combo rotte o frizioni. Tweaks vanno solo in `js/balance.js`.

### B. Backlog (vedi ROADMAP.md sezione "📚 BACKLOG")
- **Multiplayer asincrono** (richiede backend, lavoro grosso)
- **Mobile responsive** (richiede ridisegno layout)
- **Card editor** (creazione di custom cards via UI)
- **Tutorial guidato** (overlay step-by-step alla prima partita)
- **Soundtrack ambient** (musica di sottofondo, S7.2 ha già il sistema audio)
- **Dark mode** (palette alternativa, già tutto in CSS vars)
- **Export bacheca come immagine condivisibile** (canvas snapshot)
- **Modalità "rapida" 12 carte/Q** (variante con pyramid 3×4 o 2×6)

### C. Hardening
- **Più test**: aggiungere test per `ai.js` (decideAIPickFromPyramid scoring),
  `game.js` (endOfQuarter dominance ties), `achievements.js` (tutti i 13)
- **Errori graziosi**: il gioco crasha silenziosamente se il profile
  localStorage è corrotto. Aggiungere try/catch + reset graceful.
- **CI**: GitHub Actions che gira `tests/` headlessly via Puppeteer
  ad ogni commit.

### D. Iterazione di design
Se vuoi cambiare *forma* al gioco invece di *aggiungere*:
- **Più Q** (4 invece di 3) per dare respiro alle catene lunghe
- **Carte event giocabili** (invece di solo passive Market Events)
- **Negotiation phase** tra player human e AI (offerta carte/risorse)

---

## 📞 Communication conventions con l'utente

- Conversa in **italiano** (l'utente è italiano, tutto il design è in italiano)
- Fornisci **resoconti compatti** dopo ogni session (cosa fatto, cosa toccato, next)
- Usa **tabelle markdown** per riepilogare cambiamenti numerici
- Marca `✅` per acceptance verificati, `⚠` per quelli che richiedono playtest
- Per file paths usa link markdown: `[file.js](js/file.js)`
- Suggerimenti di prossima session sempre in fondo

---

_Last updated: 2026-04-28 dopo S8.2 (test harness + README). 🎉 **Roadmap
a 8 fasi: 100% completato.** Aggiorna questo doc quando le convenzioni o
l'architettura cambiano in modo non-locale._

## 🆕 Phase 10 additions (2026-04-28) — Multiplayer P2P

### Architecture: Authoritative Host + WebRTC DataChannels
- **`js/multiplayer.js`** (~430 LOC) — connection mgmt, message dispatch,
  state serialization, draft orchestration, slot helpers, disconnect
  handlers. Single global `mp` object holds all multiplayer state.
- **PeerJS via CDN** — `https://unpkg.com/peerjs@1.5.4` loaded with
  `defer`. Free public signaling server. Falls back gracefully if
  `Peer === undefined` (graceful degradation, single-player still works).

### Slot model
- **`state.players[i].slotType`**: `"human-host"` | `"human-remote"` | `"ai"`
- **`state.players[i].peerId`**: PeerJS id for human-remote slots only
- **`state.localSlotIdx`**: which slot is "you" from THIS client's POV
  (default 0 single-player, can be 0-3 in multiplayer)
- **Renders use `state.localSlotIdx`** (was hardcoded `0` previously)
- **Backward compat**: single-player auto-sets slot 0 = human-host, 1-3 = ai

### Message types (host ↔ client)

| Type | Direction | Purpose |
|------|-----------|---------|
| `join` | client → host | Initial announcement with player name |
| `lobbyUpdate` | host → all | Lobby roster changed |
| `lobbyFull` | host → client | Game already in progress / 4 players in |
| `gameStarted` | host → all | Game begins, includes slotConfig + yourSlotIdx |
| `stateUpdate` | host → all | Authoritative state snapshot |
| `pick` | client → host | I picked a card (row, col) |
| `pickRejected` | host → client | Pick was invalid (debug only) |
| `draftRequest` | host → client | "Pick your Vision/OKR" with options |
| `draftResponse` | client → host | "I picked X" |
| `gameEnded` | host → all | Game terminated |

### Game flow hooks in `game.js`

- **`startGameMultiplayer(scenarioId, slotConfig, localSlotIdx)`** —
  parallels `startGame` but builds players from slotConfig and uses
  `mpDraftVisionsForAll` / `mpDraftOkrsForAll` (parallel multi-player draft)
- **`processNextPick`**: detects `player.slotType === "ai"` to know whether
  to run AI logic or wait for human input
- **`humanPickCard`**: if multiplayer + not host → sends `{type:"pick"}` to
  host instead of applying. Host applies and broadcasts.
- **Block & React DISABLED in MP** — `offerBlockOpportunity` early-returns
  `{blocked: false}` if `state.isMultiplayer`
- **Broadcast hooks** at: end of `processNextPick`, end of `endOfQuarter`,
  end of `endGame`, after Q transitions, after market events

### State serialization — what gets stripped

**Functions can't be serialized over the wire**, so we strip them from
`state` using `serializeState()` and reconstruct via id-lookup using
`deserializeState()`:

| Field | Original | Serialized | Restored on client |
|-------|----------|------------|-------------------|
| `state.scenario` | full obj with `onQuarterStart` fn | `{id}` | `getScenarioById(id)` |
| `state.activeEvent` | full obj with `onActivate` fn | `{id}` | `EVENT_POOL.find(...)` |
| `state.players[i].okrs` | OKR objects with `check` fn | array of ids | `OKR_POOL.find(...)` |
| `state.players[i].okrOptions` | same | array of ids | same |
| `state.counterMarketingPending` | array of player refs | length only | empty array |
| `state.deferredReveals` | block queue | empty (MP disables block) | empty array |
| `state.log` | full array | last 10 only | as-is |
| Cards / Vision / modifiers | pure data | passthrough | passthrough |

### Critical gotchas added (S10) — UPDATED post-S10.7 hardening

1. **`state.localSlotIdx` is per-client**, NEVER serialize it. The host's
   `state.localSlotIdx` is 0; client's might be 1/2/3. We preserve
   localSlotIdx in `handleStateUpdate` before applying the new state.

2. **`state.isMultiplayer` MUST be in serializeState** (S10.7 fix). Without
   it, clients lose the flag on the first stateUpdate → `humanPickCard`
   falls into single-player branch → applies picks LOCALLY without
   notifying host → state divergence. Belt+suspenders: also preserved
   in `handleStateUpdate` from previous state. **THIS WAS THE #1 BUG**
   of the post-MVP fix pass.

3. **🐛 RECURRING BUG — Closure capture race in modal click handlers** (S10.7).
   In multiplayer, `handleStateUpdate` REPLACES `state.players` with a
   new array of new objects. Any modal handler that captures
   `const human = state.players[localIdx]` at modal-open time becomes
   ORPHANED when a broadcast arrives mid-modal: `human` references the
   old player object, but the global state now has a new one. Click
   handlers mutating `human.okrs = [okr]` mutate the orphan; the
   onComplete callback reads the NEW state.players[localIdx] which
   still has empty okrs.
   **Recipe**: in click handlers that mutate state.players[i], ALWAYS
   re-read `state.players[currentIdx]` at click time, never trust the
   closure-captured reference.
   Already fixed in `showOKRDraftModal`. Other modals to audit if you
   add new ones with player mutation in click handlers.

4. **Functions inside `state` will silently break broadcast** — if you
   add a new field to player/state with a function reference, update
   `serializeState` to strip it (or use id-lookup pattern).

5. **OKR mocks in tests must reference real `OKR_POOL` entries** — the
   serialize/deserialize tests use real OKR ids (`OKR_POOL[0].id`) so the
   lookup succeeds.

6. **Render gating uses `state.localSlotIdx`**, not hardcoded `0`. If you
   add new render code that says "the human player", use `state.players[state.localSlotIdx ?? 0]`.
   **Audit list**: ` showQuarterModal`, `showEndGameModal`, `showOKRDraftModal`,
   `renderMasthead`, `renderTableau`, `renderAssets`, `renderOKRs`,
   `renderAwardsForecast` — all updated to use localSlotIdx.

7. **`renderPyramid` must guard against empty `state.pyramid`** (S10.7).
   Early multiplayer broadcasts (post-Vision-draft, pre-startQuarter)
   carry `state.pyramid: []`. Without `if (pyramid.length > 0)` guard,
   `state.pyramid[row][col]` throws "Cannot read properties of undefined
   (reading '0')" on the client.

8. **`startQuarter` MUST reset `state.phase = "draft"`** (S10.7). Without
   this, phase trails the previous Q's "between" value through the OKR
   draft. `humanPickCard`'s `if (state.phase !== "human") return` ignores
   clicks. processNextPick eventually sets phase to "human" but if
   anything in the chain throws first, host stays at "draft" forever.

9. **All `.then()` chains in MP flow MUST have `.catch`** (S10.7). Silent
   promise rejections in `mpDraftVisionsForAll`/`mpDraftOkrsForAll`
   stalled the host with no error visible. `.catch` surfaces error as
   toast + state dump in console.

10. **Modal mirroring host→guest pattern**:
    - Host calls modal locally + broadcasts trigger message
    - Client's handler in `multiplayer.js` calls same modal function
    - Modal function detects MP-client via
      `state?.isMultiplayer && mp?.active && !mp?.isHost`
    - In MP-client variant, replace action buttons with "in attesa" indicator
    - Host's button click broadcasts `closeMpModal` to clean up client side
    - Implemented for: lobby, vision draft, okr draft, market news,
      quarter-end, final sequence (pitch+VC), end-game classifica.

11. **Block & React in multiplayer is silently disabled** — the existing
    block timer + DOM modal would need cross-client sync. MVP skips it.

12. **`mpBroadcastState` is no-op if not host** — safe to call anywhere
    in game.js without checking `mp.isHost` first.

13. **Audio context unlock** in lobby: `unlockAudio?.()` is called inside
    `humanPickCard` already. The first user click in lobby (e.g. "Crea
    partita") provides the gesture browser needs to unlock audio.

14. **`Peer === undefined` graceful degrade**: if PeerJS CDN fails to load,
    the multiplayer button shows error toast instead of crashing.
    Single-player flow unaffected.

15. **`endGame` is split host vs all-clients** (S10.7). Host computes
    scores + broadcasts state + triggers modal. `showEndGameModal` is
    called by everyone (host directly, clients via `endGameShow` message)
    and uses `localSlotIdx` for POV — each player records their own
    profile, sees their own awards/rank, sees "🎉 Promosso a CTO" only
    if they personally won.

### Migration cheatsheet

Quando devi modificare la game logic:
- Aggiungi un nuovo type di message → add a `case` in `handlePeerMessage`
- Aggiungi un nuovo field a `state` → considera se serializable; se sì,
  passthrough; se no, strip in `serializeState` + lookup in deserialize
- Aggiungi una nuova decision point in `game.js` per umano → controlla
  che `state.activePicker === state.localSlotIdx` (è il suo turno)
- Aggiungi una nuova UI modal che richiede risposta → usa il pattern
  `mp.pendingDrafts[peerId] = callback` come `mpDraftVisionsForAll`

## 🆕 Phase 8 additions (2026-04-27 / 2026-04-28)

### Test harness & README (S8.2)
- **`tests/test.html`** + **`tests/runner.js`** + **`tests/test-rules.js`**:
  smoke test sulle funzioni pure di `rules.js`. **30 test in 9 gruppi · 59
  assertions · 30/30 pass**.
- **API runner**: `describe`, `it`, `assert`, `assertEq`, `assertDeepEq`,
  `assertClose`. Mocha-style ma 0 dipendenze, 130 LOC.
- **Fixture pattern**: `mockPlayer({over})`, `mockCard({over})`,
  `withState(stub, fn)` per save/restore del global state attorno a
  ogni test (i test usano `state.activeEvent`, `state.scenario`, etc.).
- **Coverage funzionalità**: `isChainTriggered`, `adjustedCost`,
  `canAfford`, `payCost`, `applyEffect`, `effectiveCardEffect`,
  `applyEffectModifiers`, `computeAwards`, `computeSynergies`,
  `pointsForTier`, `isPickable`, `getDepth`, `getPickableSlots`.
- **README.md** (262 LOC) — primo README del progetto: come giocare,
  struttura del codice, load order, test harness, **estendere** il
  gioco (carta, scenario, persona, event, achievement con esempi
  copy-pasteable), tabella dei 14 modifier keys, tuning, editorial
  style, architecture highlights.

### Critical gotchas added (S8.2)
- **`withState` save/restore obbligatorio**: i test che usano
  `adjustedCost`/`applyEffect`/`effectiveCardEffect`/`computeAwards`
  DEVONO wrappare in `withState({ activeEvent: null, scenario: null }, () => {...})`
  altrimenti il global `state` è `null` e accedere `state?.scenario`
  fallisce, oppure peggio leak tra test consecutivi.
- **Test usano numeri espliciti, non BALANCE.PLAYER_INIT**: `mockPlayer()`
  hardcoda budget=6, talento=5, etc. Se cambiamo `BALANCE.PLAYER_INIT`
  i test non si rompono. Solo `BALANCE.AWARDS` (tier thresholds) e
  `BALANCE.AWARDS.SYNERGIES` (synergy conditions) sono usati direttamente
  dai test perché sono i **contratti** di scoring che non vogliamo
  rompere senza aggiornare i test.
- **`const __tests` nel runner non è esposto via vm.runInContext**:
  è OK in browser (script-scope sharing) ma per headless Node serve
  intercettare `it()` (che è una function declaration, quindi sì sul
  context object). Usato durante sviluppo; non incluso nel ship.

### Refactor render.js (S8.1)
- **`render.js` splittato in 7 file**, ognuno <500 LOC:
  - `render.js` (118 LOC) — orchestrator: `render()`, `renderSplash`, `escapeHtml`
  - `render-pyramid.js` (144) — board: `renderPyramidCard`, `renderPyramid`
  - `render-tableau.js` (74) — bacheca: `renderTableau` (con S7.2 visual debt)
  - `render-sidebar.js` (207) — pannelli destra: `renderAssets`, `renderOKRs`, `renderAwardsForecast`, `renderAwardRow`, `renderSynergyRow`, `renderLog`
  - `render-masthead.js` (206) — header: `renderMasthead`, `renderProgress`, `renderByline`, `renderProfileChip`, `makeTurnIndicator`
  - `render-modals.js` (329) — modali di flusso: `showScenarioChooser`, `showVisionDraftModal`, `showOKRDraftModal`, `showMarketNewsModal`, `showInvestorPitchModal`, `showVcReactionModal`, `showBlockOverlay`, `showHelpModal`
  - `render-profile.js` (282) — modali profilo: `showProfileSetup`, `showProfileSettings`, `renderAchievementsHtml`, `showNewAchievementsModal`
- **Index.html** aggiornato con 7 script tag (sub-moduli + orchestrator).
- **Refactor puro**: zero modifiche di comportamento. Variable rename:
  `canAfford` locale in `showBlockOverlay` → `canAffordBlock` (era shadow
  della global function `canAfford` di rules.js, mai chiamata in quella
  funzione ma rinominato per pulizia).

### Critical gotchas added
- **Cross-module global function calls work runtime**: tutti i sub-moduli
  espongono `function name() {}` declarations globali. L'ordine di
  caricamento dei `<script>` tag NON conta TRA sub-moduli, perché
  l'invocazione runtime avviene dopo che TUTTI gli script sono parsed.
- **Convenzione load order**: `render.js` per ULTIMO (prima di main.js)
  per chiarezza semantica — è l'orchestrator.
- **Nuovi file = nuovi script tags**: se aggiungi una nuova feature UI,
  scegli il sub-modulo giusto (vedi cheatsheet sotto). Solo se devi
  creare un NUOVO sub-modulo, aggiorna anche index.html.

### Migration cheatsheet
Quando devi modificare la UI:
| Cosa cambi | File |
|------------|------|
| Card della piramide | `render-pyramid.js` |
| Card della bacheca | `render-tableau.js` |
| Pannelli a destra (assets/OKR/awards/log) | `render-sidebar.js` |
| Header / badges / turn indicator | `render-masthead.js` |
| Nuovo modale di gioco (vision/event/scenario...) | `render-modals.js` |
| Modale legato al profilo | `render-profile.js` |
| `render()` orchestration o `renderSplash` | `render.js` |

## 🆕 Phase 7 additions (2026-04-27)

### Celebrations (S7.1)
- **`snapshotCelebrationState(player)`** in game.js — cattura `awards` e
  `okrsDone` correnti
- **`celebrateChanges(player, before, opts)`** — confronta pre/post pick e
  fa fire toast + audio per: award unlock, synergy unlock, OKR done, debt+
- Hook in `humanPickCard` (post-takeFromPyramid) e nel branch AI di
  `processNextPick` (per sabotage che colpiscono human awards)
- 3 nuovi toast kinds: `chain`, `celebrate`, `synergy` — ognuno con
  animazione CSS dedicata (chainGlow, synergyPulse)

### Tech Debt visuals (S7.2)
- **`.tableau-grouped.high-debt`** quando `player.techDebt >= 3`:
  - `::after` SVG inline con 4 crack paths oxblood (opacity 0.4-0.55)
  - `::before` banner "🐞 TECH DEBT ACTIVE" rosso in alto a destra
- **Shake animation** quando debt INCREMENTA: `state._debtShakeTs` flag
  timestamp-based, decade dopo 600ms

### Audio system (S7.2)
- **`js/audio.js`** nuovo file: Web Audio API + 6 sound effects sintetizzati
  (sndPick, sndChain, sndDebt, sndAwardUnlock, sndSynergy, sndOkrDone)
- **`unlockAudio()`** lazy-init AudioContext (browsers richiedono user interaction)
- Default OFF (`profile.prefs.audioEnabled` undefined → false)
- Master gain 0.18, no asset esterni

### UI Preferences (S7.1+S7.2)
- **`getReducedMotion()` / `setReducedMotion(b)`** + system fallback a `prefers-reduced-motion`
- **`getAudioEnabled()` / `setAudioEnabled(b)`**
- **2 toggle checkbox** in profile settings: 🔊 Audio cues, 🚶 Reduced motion
- **`body.reduced-motion`** class globale che azzera `animation-duration` /
  `transition-duration` via `!important` overrides
- Init class al boot in main.js

### Critical gotchas added
- **Audio fails silent** se AudioContext non disponibile o sospeso (no error)
- **Reduced motion `!important`** — aggiungi animazioni nuove SAPENDO che
  body.reduced-motion le disabilita (è il punto)
- **Debt shake timestamp** (`state._debtShakeTs`) — non si "resetta" a fine
  Q ma decade naturalmente (controllo `Date.now() - ts < 600`)
- **`celebrateChanges` solo per human**: chiamato con `state.players[0]`,
  evita spam di award AI

## 🆕 Phase 6 additions (2026-04-27)

### Scenario System (S6.1)
- **`js/scenarios.js`**: SCENARIO_POOL con 4 scenari (Standard, Bear Market,
  AI Hype Wave, Remote First) + helpers `getScenarioById`, `getAvailableScenarios`
- **`state.scenario`** sempre set (default Standard, set da chooser modal)
- **Pipeline modifier triple** in `adjustedCost` / `applyEffect` /
  `effectiveCardEffect` / `computeAwards`: Vision → Event → Scenario
- **Nuovi modifier keys** (riusabili da chiunque):
  - `effectMultipliersByDept: { dept: { res: factor } }`
  - `zeroResourceCosts: [resourceNames]` — azzera cost components
  - `statCaps: { stat: max }` — clamps stats post-applyEffect
  - `onQuarterStart(state)` callback
- **`applyScenarioStatCaps(player)`** chiamato al fondo di applyEffect
- **Scenario chooser modal** mostrato dalla splash PRIMA del Vision draft
- **Lock progression**: 1 win sblocca Bear Market, 2 wins AI Hype Wave, 3 wins Remote First

### Achievement System (S6.2)
- **`js/achievements.js`**: 13 achievements + `buildAchievementContext`,
  `checkNewAchievements`, `unlockAchievements`
- **`profile.achievements: { id: timestamp }`** nuovo campo localStorage
- **Tracking counters**:
  - `player._chainsTriggered` incrementato in applyEffect (Combo Master)
  - `player._dominanceSweeps` incrementato in endOfQuarter (Dominator)
  - `profile.stats.winStreak` gestito in recordGameResult
- **Achievement panel** in showProfileSettings (grid 2-col, locked grayscale)
- **`showNewAchievementsModal`** modal cinematic PRIMA del modal classifica
  finale, con animation `newAchSlide`
- **Restart button** ora torna alla splash (non subito a startGame) per permettere scelta scenario

### Daily Seed Mode (S6.3)
- **Seedable RNG** (xorshift32) in util.js: `setRngSeed`, `clearRngSeed`, `rng()`
- **`shuffle` ora usa `rng()`** invece di Math.random direttamente
- **`dailySeed()`**: hash deterministico di YYYY-MM-DD UTC
- **`startGame(scenarioId, isDaily)`** accetta isDaily, set/clear seed
- **`profile.dailyHistory[date]`** + **`profile.stats.dailyStreak`**
- **Daily Run button** nella splash (disabled se hai già giocato oggi)
- **Daily badge** nel masthead durante una run
- **`hasPlayedDailyToday()`** + **`computeDailyStreak()`** in user.js

### Critical gotchas added
- **3-pass modifier pipeline**: Vision → Event → Scenario in this exact order.
  Se aggiungi nuovi keys, ricorda di aggiungerli in `applyEffectModifiers` /
  `applyCostModifiers` per coprire tutti tre.
- **`state.scenario` sempre set**: Standard come default, non null
- **`startGame` ora ha 2 params**: il restart button passa "" — verifica che
  scenarioId fallback funzioni (`getScenarioById` ha fallback a Standard)
- **RNG seed deve essere clearato** dopo end-game (in endGame) per non
  influenzare run successive
- **`shuffle` usa `rng()` non Math.random** — chiunque chiami shuffle
  partecipa al seed daily
- **`renderSplash` controlla daily disponibilità** — chiama
  `hasPlayedDailyToday()` ogni volta, no caching
- **Achievement check post-end-game**: lo `state` è in stato finale (con
  `_awardsTotal`, `_debtPenalty` ecc.) — gli achievement che leggono
  `you.played` o `you.permanents` vedono lo stato finale

## 🆕 Phase 5 additions (2026-04-27)

### AI Personas (S5.1)
- **`AI_PERSONAS`** in ai.js — config con 3 personas indexed by playerIdx (1,2,3):
  - 1: Marco · The Scaler (eng, permanent: 5, target: stack/eng_exc)
  - 2: Alessia · The Hustler (product, vp: 2.5, target: funding/morale)
  - 3: Karim · The Auditor (data, dati: 2.5, target: clean/data, rejects Sabotage)
- Ogni persona: `weights`, `targetAwards`, `riskTolerance` (0..1),
  `rejectTypes`, `preferredVisions`
- **`personaTargetAwardBonus(persona, card, e)`** — bonus per cards che
  contribuiscono ai target awards
- **`chooseAIVision(playerIdx, options)`** — scoring delle 3 vision
  drafted basato su `persona.preferredVisions`
- `decideAIPickFromPyramid` ora persona-resolved: pesi override BALANCE
  con `??` operator

### Lookahead 1-step (S5.2)
- **`lookaheadDelta(playerIdx, row, col)`** — quick-value della carta
  che verrebbe rivelata + dampening 0.5/-0.4 a seconda del prossimo picker
- Solo Senior+ usa lookahead (`useLookahead = state.difficulty !== "junior"`)

### Difficulty selector (S5.2)
- **3 livelli**: junior / senior (default) / director
- **`state.difficulty`** letto da `getDifficulty()` in startGame
- **`profile.prefs.difficulty`** persistente (nuovo path in user profile)
- **UI**: 3 button cards in showProfileSettings con click handlers
- **Director**: vision strategiche + block 0.7 prob (vs 0.45 senior, 0 junior)

### Critical gotchas added
- **`state.difficulty` lockato a `startGame`** — modifiche mid-game
  applicano alla prossima partita (intenzionale)
- **Junior persona-less** — usa BALANCE.AI defaults + AI_DEPT_BIAS fallback
- **`chooseAIVision` esiste già** in ai.js dopo S5.1 — `draftVisionsFlow` la chiama
- **Lookahead richiede `state.pickOrder[state.pickIndex + 1]`** — può
  essere undefined per ultimo pick, gestito con early return 0

## 🆕 Phase 4 additions (2026-04-27)

### Market Events (S4.1)
- **`state.activeEvent`**: l'evento attivo per il Q corrente, null in Q1
- **Modifier engine consolidato**: `applyCostModifiers(c, card, mods)` e
  `applyEffectModifiers(e, card, mods)` chiamati 2 volte (Vision + Event)
  in `adjustedCost` e `applyEffect`
- **Nuovi keys di modifier** (per eventi):
  - `effectBonusByCardId: { id: { res: amount } }` — bonus mirato (Mobile Boom)
  - `effectBonusByDept: { dept: { res: amount } }` — bonus per dept (AI Hype)
- **`effectiveCardEffect(player, card)`** in rules.js: utility che ritorna
  l'effetto completo (Vision + Event applicati) — usato da AI scoring
- **vp clampato ≥ 0** in `applyEffect` perché eventi possono dare `vp` negativo
  (es. VC Drought su Funding cards)
- **Black Swan**: se pescato, redirige a un altro evento random non-BlackSwan
  con label composta "Black Swan: X"

### Investor Pitch (S4.2)
- **Game-end flow refactor**: dopo Q3 endOfQuarter, il button "Vedi risultato
  finale" non chiama direttamente `endGame()` ma `showInvestorPitch(() => endGame())`
- **`showInvestorPitch(onComplete)`**: ordina players per vp asc., mostra
  pitch modal, poi VC reaction modal sul leader, poi callback
- **`VC_POOL`** in data.js: 5 reaction (range vpDelta [-2, +10])
- **`leader._vcReaction`** memorized per eventuale display in endGame modal

### Critical gotchas added
- **`state.activeEvent` non resettato** in `startQuarter` (intenzionale —
  viene set dall'evento prima di startQuarter, e startQuarter NON deve
  cancellarlo)
- **`event.onActivate(state)`** wrappato in try/catch per resilienza
- **AI usa `effectiveCardEffect`** non `card.effect` raw — quando aggiungi
  nuovi modifier types, ricordati di estendere `applyEffectModifiers`
- **Il vp clamp ≥ 0** è in `applyEffect` ma NON in altri posti dove vp viene
  modificato (es. dominance bonus, OKR reward, end-game). Quei contesti non
  generano negativi.

## 🆕 Phase 3 additions (2026-04-27)

### Sabotage system (S3.1)
- **New card type**: `Sabotage` (visual: dark red toast)
- **New effect keys** in `applyEffect`:
  - `stealHiringFromLeader` — transfer Hiring + 1 talento
  - `targetMostFeatures: -N` — −N MAU al player con più Feature/Launch
  - `targetLeaderMorale: -N` — leader perde N morale
  - `cancelNextLaunch: true` — push player in `state.counterMarketingPending`
- **Counter-Marketing reaction**: when a Launch is played, queue head (≠ player)
  consumes one entry and zeroes the launch's `effect.vp`
- **Tiered dominance** in `endOfQuarter`: 🥇 full / 🥈 half (floor) / 🥉 +1K MAU,
  ties skip the tier

### Block & React (S3.2)
- **`takeFromPyramid` no longer auto-flips reveal** — returns `toReveal` for
  caller to decide. `humanPickCard` and AI branch in `processNextPick` now
  await `offerBlockOpportunity(actingIdx, toReveal)` before flipping.
- **`state.deferredReveals`**: array of `{row, col, card, revealAtPick}`.
  Processed at start of every `processNextPick` via `flushDueDeferredReveals()`.
- **Block cost**: 2💰 + 1⏱, max 1 per Q per player (`blockUsedThisQ`)
- **Reveal delay**: `BALANCE.BLOCK.REVEAL_DELAY_TURNS` picks (default 2 = "skip 1 turn")
- **Human UI**: `showBlockOverlay` floating bottom-center button + countdown bar
- **AI auto-block**: `aiSelectBlocker` checks affordability + value heuristic (vp+dati×0.5+talento×0.5 ≥ 4 + picker.vp ≥ ai.vp + 45% prob)

### Critical gotchas added
- **Don't call `processNextPick` immediately** after pick; the block window is async
- **`takeFromPyramid` return shape changed** from `{card, revealed}` to `{card, toReveal}`.
  Old key `revealed` is gone — check both call sites if refactoring
- **`state.counterMarketingPending` and `state.deferredReveals` reset per Q** in `startQuarter`
- **Block overlay auto-passes if player can't afford** (200ms pause for visual rhythm)
