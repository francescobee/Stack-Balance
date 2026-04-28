# Stack & Balance — Quarterly Rivals

[![Tests](https://github.com/francescobee/Stack-Balance/actions/workflows/test.yml/badge.svg)](https://github.com/francescobee/Stack-Balance/actions/workflows/test.yml)

Un boardgame in stile *7 Wonders* ambientato in una scale-up tech. Quattro
manager (1 umano + 3 AI) draftano carte da una piramide condivisa stile
Mahjong (4×6) per costruire la migliore app. Vince chi accumula più
**utenti (K MAU)** alla fine del Q3.

> **Editorial design** · parchment + Fraunces italic + Newsreader serif.
> **Vanilla JS** · zero build step, zero librerie. Apri `index.html` e gioca.

🎮 **Live demo**: https://francescobee.github.io/Stack-Balance/
🧪 **Test harness**: https://francescobee.github.io/Stack-Balance/tests/test.html

---

## 🎮 Come giocare

1. Apri **`index.html`** in un browser moderno (o usa il [live demo](https://francescobee.github.io/Stack-Balance/)).
2. Crea un profilo (nome) — viene salvato in localStorage.
3. Scegli uno **scenario** (Standard è sempre disponibile; gli altri 3 si
   sbloccano vincendo partite).
4. Pesca la tua **Vision Card** (1 di 3 random da pool di 8 — definisce
   bonus/malus per tutta la partita).
5. Per ogni quarter (Q1 Discovery → Q2 Build → Q3 Launch):
   - Pesca il tuo **OKR** (1 di 3 random).
   - Pesca 6 carte dalla piramide via **snake draft** (Tu→Marco→Alessia→Karim,
     poi reverse).
   - Tra Q1→Q2 e Q2→Q3 un **Market Event** cambia le regole.
6. A fine Q3: **Investor Pitch** + **VC Reaction** + classifica con
   **7 Awards** + **4 Synergies** + conversione budget − tech debt.

> 💡 Premi `?` nel masthead in alto a destra durante il gioco per il riassunto
> rapido delle regole.

---

## 🗂️ Struttura del codice

```
test/
├── index.html                # entry point — script tags in load order
├── README.md                 # questo file
├── ROADMAP.md                # piano sviluppo a 8 fasi (tutte completate)
├── CHANGELOG.md              # log dettagliato per session
├── CONTEXT.md                # handoff doc (orientation per nuove sessioni)
│
├── styles/
│   ├── main.css              # vars, layout, masthead, modali, toast
│   ├── board.css             # piramide + opponents byline
│   └── player.css            # bacheca + assets + OKR + awards forecast
│
├── js/                       # game logic — tutti vanilla JS classic scripts
│   ├── data.js               # CATALOG_Q1/2/3 + OKR_POOL + EVENT_POOL + VC_POOL
│   ├── visions.js            # 8 Vision Cards (Founder Mode, Lean Startup, …)
│   ├── scenarios.js          # 4 Scenarios (Standard, Bear Market, AI Hype, Remote First)
│   ├── util.js               # el(), shuffle, rng (seedable), showToast
│   ├── user.js               # profile localStorage + prefs (difficulty, audio, motion)
│   ├── audio.js              # Web Audio API — 6 sintetizzati (S7.2)
│   ├── achievements.js       # 13 achievements + check helpers
│   ├── balance.js            # ⭐ TUTTE le costanti tunable (Object.freeze)
│   ├── state.js              # newPlayer, NUM_PLAYERS, PYR_ROWS, log
│   ├── rules.js              # adjustedCost, applyEffect, computeAwards, pyramid
│   ├── ai.js                 # AI_PERSONAS + decideAIPickFromPyramid + lookahead
│   ├── game.js               # startGame, processNextPick, endOfQuarter, modals
│   ├── multiplayer.js        # P2P multiplayer via PeerJS (Phase 10)
│   │
│   ├── render.js             # ⭐ orchestrator: render(), renderSplash, escapeHtml
│   ├── render-pyramid.js     # board: renderPyramidCard, renderPyramid       (S8.1)
│   ├── render-tableau.js     # bacheca: renderTableau                        (S8.1)
│   ├── render-sidebar.js     # assets/OKR/awards/log panels                  (S8.1)
│   ├── render-masthead.js    # header + progress + byline + profile chip     (S8.1)
│   ├── render-modals.js      # game-flow modali                              (S8.1)
│   ├── render-profile.js     # profile setup/settings/achievements modali    (S8.1)
│   │
│   └── main.js               # boot — chiama showProfileSetup o renderSplash
│
└── tests/
    ├── test.html             # apri in browser per eseguire i test
    ├── runner.js             # describe/it/assert/assertEq/assertDeepEq
    └── test-rules.js         # 30 test su isChainTriggered/adjustedCost/applyEffect/computeAwards/...
```

### Script load order (in `index.html`)

```
data → visions → scenarios → util → user → audio → achievements
  → balance → state → rules → ai → game
  → render-pyramid → render-tableau → render-sidebar
  → render-masthead → render-modals → render-profile → render
  → main
```

L'ordine *conta* per `balance.js` (deve precedere chi lo usa: state/rules/ai/game)
e `util.js` (deve precedere ogni `render-*.js` per `el()`/`showToast`). Tra i
sub-moduli `render-*` l'ordine è libero (sono tutte function declarations
globali invocate runtime).

---

## 🌐 Multiplayer P2P

Il gioco supporta multiplayer fino a 4 player via **WebRTC peer-to-peer**.
Niente server da gestire: il signaling è gratis tramite [PeerJS Cloud](https://peerjs.com/),
i dati di gioco fluiscono direttamente tra browser. Funziona out-of-the-box
su GitHub Pages.

### Come giocare in multiplayer

1. **Host**: dalla splash, click **"🌐 Multiplayer"** → **"Crea partita"**
2. Condividi il **room code** (4 caratteri, es. `ABCD`) o il link copiato
   con i tuoi amici
3. **Client**: dalla splash → **"Multiplayer"** → **"Unisciti"** + codice +
   nome
4. Il host vede i player che si connettono. **Posti vuoti = AI** (non c'è
   bisogno di tutti e 4 i posti pieni)
5. Il host clicca **"Avvia partita →"** quando pronto
6. Ogni player draftano **Vision** e **OKR** in modo indipendente, poi il
   gioco procede normalmente con snake draft

### Limitazioni MVP

- 🚫 **Block & React disabled** in multiplayer (single-player conserva)
- 🚫 **Host disconnect** = game over (no host migration)
- 🚫 **Disconnect = AI replacement** (no reconnect)
- 🚫 No spectator mode, no voice chat, no persistence
- ⚠️ Qualche network corporate/mobile può avere problemi di NAT traversal

### Setup deterministico (per dev)

```js
// In console:
localStorage.setItem("dev.forceVision", "tech_first");
// Bypassa il modal Vision draft — utile per S9.8 playtest
```

---

## 🧪 Test harness

Aprire `tests/test.html` in un browser. I test girano automaticamente al load
e mostrano un report con:

- **Banner verde** se passano tutti, rosso con conta dei fail altrimenti.
- **Sezione per gruppo** (`describe`) con ✓/✗ per ogni `it()`.
- Per i fail: dettaglio dell'assertion (atteso vs. ottenuto).

Aggiungere un nuovo test:

```js
// tests/test-rules.js (o nuovo tests/test-X.js)
describe("la mia feature", () => {
  it("fa quello che mi aspetto", () => {
    const p = mockPlayer({ budget: 5 });
    const card = mockCard({ cost: { budget: 3 } });
    assertEq(canAfford(p, card), true);
  });
});
```

I fixture `mockPlayer()` e `mockCard()` in `test-rules.js` accettano
override (`mockPlayer({ techDebt: 5 })`). Per testi che dipendono dal
`state` globale usa `withState({ activeEvent: null, scenario: null }, () => {…})` —
salva/ripristina lo stato per evitare leakage tra test.

---

## 🛠️ Estendere il gioco

### Aggiungere una **carta**

Apri **`js/data.js`** e aggiungi un oggetto al catalogo del Q appropriato
(`CATALOG_Q1`, `CATALOG_Q2`, `CATALOG_Q3`):

```js
{
  id: "growth_hack",                            // unique id, snake_case
  name: "Growth Hack",                          // display name
  dept: "product",                              // "product" | "eng" | "data"
  type: "Launch",                               // Discovery | Hiring | Feature | Tool | BugFix | Funding | Launch | Sabotage | Crunch | Training | Meeting
  cost: { budget: 2, tempo: 1, talento: 1 },    // tutto opzionale; non specificato = 0
  effect: { vp: 4, dati: 1 },                   // vp = K MAU; tutte le risorse sono opzionali
  desc: "Hack di crescita virale. +4K utenti.",

  // Optional:
  // permanent: "ci_cd",                        // installa permanent al play
  // chainFrom: ["lean_canvas"],                // se possiedi una di queste...
  // chainDiscount: { budget: 1 },              // ...sconto sul costo
}
```

> ⚠️ Il pool della piramide è 24 carte/Q. Se aggiungi carte, aumenta la
> dimensione del pool oppure il `data.js` ne pesca random `TOTAL_PICKS=24`
> a inizio Q. Nessun lavoro extra.

I numeri di carta (`Nº NN`) e i lookup (`ALL_CARDS_BY_ID`, `CARD_META`) si
ricostruiscono automaticamente al load — non serve sincronizzare nulla.

### Aggiungere uno **scenario**

Apri **`js/scenarios.js`** e aggiungi un oggetto a `SCENARIO_POOL`:

```js
{
  id: "crypto_winter",
  icon: "❄️",
  name: "Crypto Winter",
  description: "Fine dell'hype. Funding evaporano, ma chi ha cash è re.",
  bonus: "Tech Stack award ×2",
  malus: "Tutti i Funding rendono metà",
  locked: true,
  minWinsToUnlock: 4,
  modifiers: {
    awardMultipliers: { stack: 2 },
    effectMultipliersByType: { Funding: { budget: 0.5 } },
  },
},
```

I **modifier keys** disponibili (riusabili anche per Vision e Event):

| Key | Cosa fa |
|-----|---------|
| `costModifiersByType` / `costModifiersByCardId` | Aggiunge/sottrae a `cost.{res}` per tipo o id |
| `effectMultipliersByType` / `effectMultipliersByDept` | Moltiplica `effect.{res}` (round-half-to-even) |
| `effectBonusByType` / `effectBonusByCardId` / `effectBonusByDept` | Somma a `effect.{res}` |
| `awardMultipliers: { awardId: factor }` | Moltiplica i punti dell'award (`stack`, `funding`, `morale`, `talent`, `data`, `clean`, `bugcrush`, `lean_op`, `eng_exc`, `data_empire`, `full_funding`) |
| `zeroResourceCosts: ["tempo"]` | Azzera quel resource cost globalmente |
| `statCaps: { talento: 3 }` | Clampa la stat (post-applyEffect) |
| `onQuarterStart(state)` | Callback alla startQuarter |
| `excludeCardTypes` / `excludeCardIds` | (HUMAN ONLY) filtra dal pool |
| `startingBudget` / `startingTalento` / `startingMorale` / `startingPermanents` | Patch state iniziale |
| `debtPenaltyOffset` / `debtTempoLossOffset` | Modifica le formule di penalità debt |

Il modifier engine applica **3 pass** (Vision → Event → Scenario) in
ordine, additivamente. Vedi `applyCostModifiers` / `applyEffectModifiers`
in `js/rules.js`.

### Aggiungere una **AI Persona**

Apri **`js/ai.js`** e aggiungi una entry a `AI_PERSONAS` (key = `playerIdx` 1, 2, 3):

```js
4: {                                            // se vuoi un 5° AI, espandi NUM_PLAYERS
  id: "elena",
  name: "Elena · The Architect",
  dept: "eng",
  weights: {
    vp: 1.5,           // peso del MAU contribuito
    dati: 1.5,         // gradisce dati
    talento: 1.2,
    budget: 0.5,
    morale: 0.5,
    permanent: 6,      // ama i Tool permanents
    chain: 4,          // ama le combo
  },
  targetAwards: ["stack", "data_empire"],       // award da rincorrere (bonus scoring)
  riskTolerance: 0.20,                          // bassa = evita Crunch
  rejectTypes: ["Crunch"],                      // tipi che rigetta a priori
  preferredVisions: ["tech_first", "data_empire"],
},
```

I **weights** moltiplicano i resource pickup nel score di
`decideAIPickFromPyramid`. Default in `BALANCE.AI` (vedi `js/balance.js`)
servono come fallback se la persona non specifica un peso.

`riskTolerance` ∈ [0, 1] modula la propensione alle **Crunch Cards**
(carte ad alto MAU + tech debt): più alto, più la AI le pesca.

`targetAwards` sono gli ID degli award che la persona "rincorre" — il
codice cerca carte che contribuiscono a quegli award e gli dà bonus
score (vedi `personaTargetAwardBonus`).

`preferredVisions` guida `chooseAIVision` durante il draft delle Vision
all'inizio della partita.

> Le 3 personas attuali sono **Junior+ only** — il livello "Junior" non
> usa personas (usa `BALANCE.AI` defaults + `AI_DEPT_BIAS`). Vedi
> `state.difficulty` in `js/game.js`.

### Aggiungere un **Market Event**

Apri **`js/data.js`** e aggiungi a `EVENT_POOL`:

```js
{
  id: "patent_war",
  icon: "⚖️",
  name: "Patent War",
  description: "Cause legali a tappeto. Le Feature costano +1 talento.",
  bonus: "BugFix +1K MAU",
  malus: "Feature: +1🧠 costo",
  modifiers: {
    costModifiersByType: { Feature: { talento: 1 } },
    effectBonusByType: { BugFix: { vp: 1 } },
  },
  // optional onActivate(state) callback per effetti immediati al pick
},
```

### Aggiungere un **Achievement**

Apri **`js/achievements.js`** e aggiungi a `ACHIEVEMENTS`:

```js
{
  id: "perfectionist",
  icon: "💎",
  name: "Perfectionist",
  description: "Vinci con 0 tech debt e ≥3 BugFix.",
  check(ctx) {
    return ctx.won
        && ctx.you.techDebt === 0
        && ctx.you.played.filter(c => c.type === "BugFix").length >= 3;
  },
},
```

Il **`ctx`** è costruito da `buildAchievementContext()` in
`js/achievements.js` e contiene: `won`, `you`, `state`, `profile`. Tutti
gli achievement vengono valutati a fine partita; quelli che ritornano
`true` E che non sono già unlocked vengono notificati col modal
`showNewAchievementsModal`.

---

## ⚙️ Tuning numerico

**Mai hardcodare numeri** in `rules.js` / `game.js` / `ai.js`. Tutto
vive in **`js/balance.js`** (`Object.freeze`d):

```js
BALANCE.QUARTER.BASE_TEMPO          // 5 — capacità tempo base per Q
BALANCE.DEBT.Q_PENALTY_THRESHOLD    // 3 — debt sopra il quale paga MAU
BALANCE.AWARDS.MORALE_TIERS         // [{threshold:9, points:12}, ...]
BALANCE.AWARDS.SYNERGIES.LEAN_OP    // {points:10, MORALE_MIN:8, TALENT_MAX:4}
BALANCE.AI.VP_WEIGHT                // 2.0 — fallback se la persona non lo override
```

Per ribilanciare: modifica solo `balance.js`, l'effetto si propaga.

---

## 🎨 Editorial style

- **Font**: Fraunces (display, italic come signature), Newsreader (body), JetBrains Mono (numeri)
- **Palette**: parchment cream (`--paper`), ink (`--ink`), oxblood (`--accent`), gold (`--gold`)
- **Dipartimenti**: terracotta (Product) / ink blue (Engineering) / forest green (Data)
- **Cards**: top dept band 5px, wax-seal MAU corner, dept emblem (P/E/D), ornamento per-dept (`❦` / `◈` / `⁂`)

Tutti i token CSS sono in `styles/main.css` (`:root`).

---

## 📚 Documenti

- **[ROADMAP.md](ROADMAP.md)** — piano di sviluppo a 8 fasi (tutte ✅).
- **[CHANGELOG.md](CHANGELOG.md)** — log dettagliato session-by-session
  (~20 entries, da S1.1 a S8.2).
- **[CONTEXT.md](CONTEXT.md)** — handoff doc per riprendere lo sviluppo
  dopo una pausa: architettura, gotchas, conventions, file map.

---

## 🧠 Architecture highlights

- **Modifier engine** (S2.3 → S6.1): Vision (per-player) + Event (per-Q) +
  Scenario (game-wide) sono uniformemente schemi dichiarativi processati
  da `applyCostModifiers` / `applyEffectModifiers`. Aggiungere un nuovo
  trigger = aggiungere una entry, niente codice procedurale.
- **Snake draft**: `pickOrder = [0,1,2,3,3,2,1,0,...]` per 24 pick (ogni
  player pesca 6 volte per Q).
- **Pyramid logic**: `isPickable(row, col)` true ⟺ tutte le slot sotto
  nella stessa colonna sono `taken`. `getDepth` calcola il "sliver" visivo.
- **Block & React** (S3.2): `takeFromPyramid` non auto-flippa il reveal —
  ritorna `toReveal` e il caller chiede al human (via `showBlockOverlay`)
  o all'AI (via `aiSelectBlocker`) se vuole bloccarlo.
- **Async modal pattern**: i draft (Vision, OKR) bloccano il flusso e
  chiamano `onComplete` quando il player ha scelto. Mai chiamare
  `render()` o `processNextPick()` prima del callback.
- **Daily seed mode** (S6.3): `xorshift32` seedable RNG in `util.js`,
  hash di `YYYY-MM-DD` come seed → due browser diversi che giocano la
  daily lo stesso giorno ottengono la stessa piramide.

---

## 📜 License & credits

Progetto personale didattico. Font Fraunces, Newsreader, JetBrains Mono
via Google Fonts (open license).
