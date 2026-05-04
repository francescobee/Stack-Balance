# Stack & Balance — Gameplay Cleanup Roadmap (Phase 20)

> **Tipo**: design refactor — sostituire/eliminare meccaniche
> accessorie identificate in audit, e rendere strategiche le risorse
> monodirezionali rimaste.
> **Origine**: design review utente post-Phase-19 — "ci sono altre
> meccaniche come questa che vedi un po' accessorie?"
> **Natura**: mix di **subtraction** (Block & React kill), **expansion**
> (Dati spendable + Permanents +3), **rework** (VC Pitch Quality).

---

## 🎯 Vision

Phase 19 ha trasformato il **morale** da stat collezionabile a risorsa
viva. Audit successivo ha identificato 4 meccaniche con problemi
analoghi o di altra natura:

| # | Meccanica | Problema | Fix |
|---|-----------|----------|-----|
| 1 | **Dati** | 32 carte lo generano, 2 lo costano → monodirezionale | +5-6 spend cards + 2 sinergie nuove |
| 2 | **Block & React** | Disabled in 70% dei modi (P2P/HS/morale≤3) | Rimozione formale |
| 3 | **VC Reaction** | RNG puro al climax — niente agency | Pitch Quality: weighted by stats |
| 4 | **Permanents** | Solo 4, install-and-forget | +3 nuovi con interaction |

**Decisioni utente validate**:
- ✅ Dati: rendere strategico
- ✅ Block & React: kill (era tentativo fallito)
- ✅ VC: rework con pitch quality version (a)
- ✅ Permanents: aggiungere

**Skip da audit**:
- AI archetype reveal (già implementato in render-masthead/board.css)
- Counter-Marketing rework (niche ma OK così)

---

## 📅 Macro-timeline (4 sessions · ~6h totali)

| Session | Tema | Effort | Stato |
|---------|------|-------:|------:|
| **S20.1** | Block & React removal (subtractive cleanup) | M (~1h) | ✅ Done · 2026-05-04 |
| **S20.2** | Dati spendable: schema + content | L (~3h) | ✅ Done · 2026-05-04 |
| **S20.3** | VC Pitch Quality (stats-weighted picker) | S (~1h) | ⬜ |
| **S20.4** | Permanents expansion (+3 tools) | S (~1h) | ⬜ |

**Critical path**: S20.1 → S20.2 → S20.3 → S20.4 (sequenziali, ognuna
ferma a un punto stabile testabile).

S20.1 va per primo perché è puramente subtractive — rimuovere
infrastruttura inutile prima di costruire sopra. S20.2 è la session
maggiore. S20.3 e S20.4 sono indipendenti.

---

## 🗑 SESSION 20.1 — Block & React removal

**Tipo**: subtractive cleanup
**Effort**: M (~1h)
**Dipendenze**: nessuna
**Outputs**: ~150-200 LOC in meno, mental overhead removato, gameplay
identico per chi non usava la feature (cioè 95% degli utenti).

### Razionale

Block & React era un tentativo di aggiungere reactive interaction al
draft (premi "Block" entro 4s quando l'AI sta per rivelare per
posticipare il reveal). In pratica:
- ❌ Disabled in P2P MP (S10) — sync 4s timer troppo complessa
- ❌ Disabled in Hot Seat (S11.8) — overlay assume single human
- ❌ Disabled a morale ≤ 3 (S19.1) — team disengaged
- ✅ Attivo solo in single-player a morale ≥ 4 — "single-player edge case"
- 📉 Feedback utente in chat: "tentativo fallito"

Rimuovere è più cleanup che design choice. Le sinergie con altri
sistemi sono nulle.

### Tasks

#### A. Rimuovere code path principale

File touched: `js/game.js` (3 funzioni), `js/ai.js` (1 funzione),
`js/rules.js` (?), `js/state.js` (1 field).

**`js/game.js`**:
- Eliminare `offerBlockOpportunity(actingIdx, toReveal)` (~40 LOC)
- Eliminare `executeBlock(blockerIdx, toReveal)` (~25 LOC)
- Eliminare `flushDueDeferredReveals()` (~15 LOC)
- Nei call sites (humanPickCard, aiTurn): sostituire
  `await offerBlockOpportunity(...)` con `slot.faceUp = true` immediato
  (era il post-block fallback path)
- Rimuovere chiamate a `flushDueDeferredReveals()`

**`js/ai.js`**:
- Eliminare `aiSelectBlocker(actingIdx, toReveal)` (~30 LOC)

**`js/rules.js`** (verifica):
- `BALANCE.BLOCK` reference (se esiste) → rimuovere

**`js/state.js`**:
- Eliminare `blockUsedThisQ: false` da `newPlayer()`
- Eliminare `deferredReveals: []` da `state` initial (nei 3 entry points:
  startGame, startGameMultiplayer, e potenzialmente startGameSharedScreen)

#### B. Rimuovere modale UI

**`js/render-modals.js`**:
- Eliminare `showBlockOverlay({ actingIdx, toReveal, onBlock, onTimeout })`
  (~50 LOC, includes timer animation logic)

**`styles/main.css`**:
- Eliminare CSS `.block-overlay`, `.block-content`, `.block-btn`,
  `.block-info`, `.block-title`, `.block-detail`, `.block-cost`,
  `.block-timer`, `.block-icon`, `.block-label` + le keyframes/anim
  associate (~80 LOC)

**`js/audio.js`** (verifica):
- Se `sndBlock` o simile esiste → rimuovere

#### C. Rimuovere balance constants

**`js/balance.js`**:
- Eliminare il namespace `BLOCK` (`COST_BUDGET`, `COST_TEMPO`,
  `WINDOW_MS`, `REVEAL_DELAY_TURNS`)

#### D. Rimuovere dependent guards

**`js/multiplayer.js`** (verifica):
- Se ci sono comment "S10: Block & React disabled in MP" cleanup-arli
  per chiarezza (non rotto, ma il comment non è più rilevante)

**`js/hotseat.js`** (verifica):
- Idem per "S11.8: Block disabled in HS"

**`js/game.js`** offerBlockOpportunity guards (S19.1 morale ≤ 3):
- Tutto il body diventa morto. La funzione stessa va eliminata.

#### E. Aggiornare tests

**`tests/test-rules.js`**:
- Cercare test che usano `blockUsedThisQ` o `BALANCE.BLOCK` → rimuovere
  (probabilmente 0-2 tests)

#### F. Aggiornare docs

- `README.md`: cercare riferimenti a "Block & React" → rimuovere/marcare
  come deprecated
- `CONTEXT.md`: idem
- `CHANGELOG.md`: nuova entry S20.1 con motivazione

### Files

| File | Change |
|------|--------|
| `js/game.js` | Rimosse 3 funzioni + adattati 2 call sites (~80 LOC -) |
| `js/ai.js` | Rimossa aiSelectBlocker (~30 LOC -) |
| `js/render-modals.js` | Rimossa showBlockOverlay (~50 LOC -) |
| `js/state.js` | 2 field rimossi |
| `js/balance.js` | Namespace BLOCK rimosso |
| `js/rules.js` | Eventuali ref + S3.2 comment rimossi |
| `js/multiplayer.js` | Guard comment cleanup |
| `js/hotseat.js` | Guard comment cleanup |
| `js/audio.js` | sndBlock se esiste |
| `styles/main.css` | CSS .block-* rimossi (~80 LOC -) |
| `tests/test-rules.js` | Test block-related rimossi |
| README, CONTEXT | Riferimenti rimossi |
| `sw.js` | bump CACHE_VERSION sb-v16 → sb-v17 |

**Net code reduction**: ~250 LOC removed, ~10 LOC added (placeholder
comments where logic was inline).

### Acceptance criteria

- [ ] `grep -r "showBlockOverlay\|offerBlockOpportunity\|aiSelectBlocker\|deferredReveals\|blockUsedThisQ\|BALANCE.BLOCK" js/ styles/` ritorna 0 hit
- [ ] Single-player Q1-Q3 completabile, AI gioca normalmente, reveal
  immediati
- [ ] P2P MP / Hot Seat: nessuna regressione (era già off)
- [ ] 127/127 test pass (eventualmente -1 o -2 test rimossi)
- [ ] Niente reference dangling a `BLOCK` constants in console errori

---

## 📊 SESSION 20.2 — Dati come risorsa spendibile

**Tipo**: feature expansion — schema + content
**Effort**: L (~3h)
**Dipendenze**: nessuna (parallelizzabile a S20.1)
**Outputs**: dati diventano risorsa attivamente spesa, non più
"punteggio fantasma".

### Razionale

Audit numerico:
- **32 occorrenze** `dati: N` come EFFECT (carte che danno dati)
- **2 carte** che richiedono `cost.dati`: bridge_loan (Q1) + series_b (Q3)
- Sinks: DATA_EMPIRE synergy (threshold), Data award (threshold), OKR
  data_target (threshold)

Tutti i sink sono **threshold check** (≥ X dati a fine game), non
spesa attiva. Risultato: il giocatore accumula dati passivamente fino
a 5-10 e poi non li tocca mai. Identico al morale pre-S19.

### Schema (no code changes)

`canAfford` e `payCost` (rules.js) **già supportano `cost.dati`** —
verifiche grep:
- canAfford line 67: `&& (player.dati >= (c.dati || 0))`
- payCost line 77: `player.dati -= (c.dati || 0);`

`adjustedCost` itera generic `Object.entries`. Modifier engine OK.

**Da aggiungere**: tracking di `_dataSpent` cumulativo per game (necessario
per la nuova synergy "Data Driven"). Field su `newPlayer`, incrementato
in `payCost` quando `c.dati > 0`.

### Le 6 nuove carte data-spend

```
═══════════════════════════════════════════════════════════════
A. USER SURVEY ANALYSIS · Discovery · data (Q1)
   cost: { dati: 2, tempo: 1 }
   effect: { vp: 2, morale: 1 }
   desc: "Trasforma i dati in insight. +2K, +1 Morale. Spendi 2 Dati."
   ─ Discovery che spende dati per output. Q1 dati ancora bassi (~3-4),
     forza una scelta: spendere subito o accumulare per Q3.

B. DATA-DRIVEN DECISION · Meeting · product (Q2)
   cost: { dati: 3, tempo: 1 }
   effect: { vp: 3, talento: 1 }
   desc: "Decisione informata. +3K, +1 Talento. Spendi 3 Dati."
   ─ Meeting che converte dati in vp + talento. Mid-game spend.

C. PERSONALIZATION ENGINE · Tool · data (Q2)
   cost: { dati: 4, tempo: 2 }
   effect: { vp: 3 }, permanent: "personalization"
   desc: "Personalizziamo l'app. +3K + permanent (vedi sotto)."
   chainFrom: ["data_lake"], chainDiscount: { dati: 2 }
   ─ Tool nuovo permanent (vedi S20.4). Chain con data_lake riduce
     a 2 dati spend, accessible per data builds.

D. TARGETED AD CAMPAIGN · Launch · product (Q3)
   cost: { dati: 3, budget: 2 }
   effect: { vp: 5, morale: 1 }
   chainFrom: ["growth_hacker"], chainDiscount: { budget: 1 }
   desc: "Ad super-targeted. +5K, +1 Morale. Spendi 3 Dati."
   ─ Launch alternativo a viral_campaign, dati-cost invece di
     budget-cost-pure. Premia chi ha accumulato.

E. PREDICTIVE MODEL · Feature · data (Q3)
   cost: { dati: 4, tempo: 2 }
   effect: { vp: 4, dati: 1 }
   desc: "Modello predittivo. +4K, riciclo 1 Dato."
   ─ Net spend: -3 dati. Permette continuous play su dati senza
     dover sempre rebuild da 0.

F. DATA SALE · Funding · data (Q3)
   cost: { dati: 5, morale: 1 }
   effect: { budget: 8 }
   desc: "Vendi dati a un terzo. +8💰. Eticamente ambiguo (-1 Morale)."
   ─ Funding che converte dati in budget. Costo morale piccolo per
     il flavor "etica del data trading". Alternative tardiva a series_b.
═══════════════════════════════════════════════════════════════
```

### Soft cap (decisione design)

**Roadmap originale**: dati > 10 → -1 per excess a fine Q.

**Decisione finale**: **NO soft cap V1**. Lascia il design parlare —
le 6 carte spend sono abbastanza forti che hoarding dati > 10
dovrebbe risultare suboptimal. Se playtest dimostra hoarding ancora
dominante, cap aggiunto in Phase 21.

Razionale: i soft cap arbitrari sono "punizione esterna", non
"design choice del giocatore". Meglio rendere il spending forte.

### 2 nuove sinergie (synergies.js)

```
═══════════════════════════════════════════════════════════════
S1. DATA DRIVEN · 📊 · 9 punti · medium
    Tag: ["data", "spend"]
    detailInactive: "Sinergia: hai investito attivamente in data ops"
    detailActive: (p) => `${p._dataSpent} dati spesi durante il game`
    check(p) {
      const spent = p._dataSpent || 0;
      return {
        requirements: [
          { label: "Dati spesi ≥ 8", current: spent, target: 8,
            met: spent >= 8 },
        ],
        active: spent >= 8,
      };
    }
    ─ Premia uso ATTIVO. Single-condition (solo dati spesi cumulative)
      per chiarezza. Reward 9 (medium).

S2. INSIGHT HOARDER · 💎 · 11 punti · hard
    Tag: ["data", "passive"]
    detailInactive: "Sinergia: hai accumulato un patrimonio di dati"
    detailActive: (p) => `Dati finali: ${p.dati}`
    check(p) {
      return {
        requirements: [
          { label: "Dati finali ≥ 12", current: p.dati, target: 12,
            met: p.dati >= 12 },
        ],
        active: p.dati >= 12,
      };
    }
    ─ Reward 11 (hard). DELIBERATAMENTE in tensione con Data Driven —
      forza scelta strategica: spendere o accumulare? Entrambe valid,
      diverse playstyle.
═══════════════════════════════════════════════════════════════
```

### 1 nuovo OKR (data.js OKR_POOL)

```
═══════════════════════════════════════════════════════════════
DATA SPENDER · 4 punti
text: "Spendi ≥ 4 Dati questo Q"
check(p, q) {
  return (p._quarterDataSpent || 0) >= 4;
}
─ Per-Q tracking nuovo: _quarterDataSpent. Reset a inizio Q.
  Incrementato in payCost insieme a _dataSpent (cumulativo).
═══════════════════════════════════════════════════════════════
```

### Tasks

#### A. Schema tracking

**`js/state.js`** `newPlayer()`:
```js
_dataSpent: 0,           // S20.2: cumulativo per game (Data Driven synergy)
_quarterDataSpent: 0,    // S20.2: per Q (Data Spender OKR)
```

**`js/rules.js`** `payCost()`:
```js
if (c.dati) {
  player.dati -= c.dati;
  player._dataSpent = (player._dataSpent || 0) + c.dati;
  player._quarterDataSpent = (player._quarterDataSpent || 0) + c.dati;
}
```

**`js/game.js`** `startQuarter()`:
```js
p._quarterDataSpent = 0;  // reset per Q
```

#### B. Carte (data.js)

A in CATALOG_Q1 (1 card)
B, C in CATALOG_Q2 (2 cards)
D, E, F in CATALOG_Q3 (3 cards)

#### C. Sinergie (synergies.js)

S1, S2 in SYNERGY_POOL with appropriate tags.

#### D. OKR (data.js OKR_POOL)

Data Spender entry.

#### E. Tests

```js
describe("data spend mechanic [S20.2]", () => {
  it("payCost tracks _dataSpent cumulative", () => { ... });
  it("payCost tracks _quarterDataSpent per Q", () => { ... });
  it("data_driven synergy fires at 8+ dati spent", () => { ... });
  it("insight_hoarder synergy at 12+ final dati", () => { ... });
  it("data_spender OKR check on quarterDataSpent", () => { ... });
});
```

Target: **+5 test**. Total atteso 132/132.

### Files

| File | Change |
|------|--------|
| `js/state.js` | +2 field tracking |
| `js/rules.js` | payCost increments tracking |
| `js/game.js` | startQuarter reset _quarterDataSpent |
| `js/data.js` | +6 carte (1 Q1, 2 Q2, 3 Q3) + 1 OKR |
| `js/synergies.js` | +2 sinergie (data_driven, insight_hoarder) |
| `tests/test-rules.js` | +5 test |
| `sw.js` | bump CACHE_VERSION sb-v17 → sb-v18 |

### Acceptance criteria

- [ ] 6 nuove carte pescabili **solo** con dati sufficienti
- [ ] _dataSpent incrementa cumulative; _quarterDataSpent reset per Q
- [ ] Synergy data_driven attiva a 8+ dati cumulativi spent
- [ ] Synergy insight_hoarder attiva a 12+ dati finali
- [ ] OKR data_spender check su per-Q tracking
- [ ] Vision DATA_EMPIRE synergy ancora funziona (era threshold-based, no regression)
- [ ] AI personas (especialmente Karim/data) pickano sensatamente le data-spend
- [ ] 132/132 test pass

---

## 🎯 SESSION 20.3 — VC Pitch Quality (stats-weighted)

**Tipo**: rework di RNG → stats-weighted picker
**Effort**: S (~1h)
**Dipendenze**: nessuna (parallelizzabile)
**Outputs**: il momento finale del gioco è strategico, non puro RNG.

### Razionale

VC pool corrente (5 entries, uniform random):
- star_investor +5
- standing_ovation +10
- polite_applause +1
- skeptical_board -2
- walk_out 0

**Problema**: il giocatore arriva al climax e prende un random. Se sei
a -1K dal vincere e prendi `walk_out` (0) mentre il rivale prende
`standing_ovation` (+10) → ingiusto, niente agency.

### Schema

Aggiungere weighting basato su `pitchScore` calcolato dalle stats
finali del leader (chi triggera il pitch):

```js
function pitchScore(player) {
  // Higher → favor positive VC reactions, lower → favor negative.
  return (
    Math.max(0, player.morale - 5) * 2  // morale buon hint di team health
    + Math.max(0, player.dati - 5) * 1  // dati = "abbiamo i numeri"
    - Math.max(0, player.techDebt - 3) * 2  // debt = code red flag
    + Math.min(player.played.length, 8) * 0.5  // tableau size = traction
  );
  // Range tipico: -6..+12
}

function pickWeightedVC(player) {
  const score = pitchScore(player);
  const weights = VC_POOL.map(vc => {
    if (vc.vpDelta > 0) return Math.max(1, 5 + score);     // positive VCs
    if (vc.vpDelta < 0) return Math.max(1, 5 - score);     // negative VCs
    return 5;                                               // neutral (walk_out, polite)
  });
  return weightedPick(VC_POOL, weights);
}
```

A pitchScore = 0 (neutro), weights tutti uguali = comportamento
identico a oggi. A +10 (gran build), positivi 3× più probabili. A
-5 (debt overload), negativi 2× più probabili. Mantiene tutto il
range di outcomes possibile (incluso black-swan walk_out su gran
build) ma sposta la distribuzione.

### UI transparency (importante)

Il giocatore deve **capire** che stats hanno influenzato il pitch.
Aggiungere a `showFinalSequenceModal` una preview pre-VC:

```
┌─────────────────────────────────────────┐
│  📊 PITCH READINESS                     │
│                                         │
│  Morale:     ⭐⭐⭐⭐⭐ (8/10)           │
│  Dati:       ⭐⭐⭐⭐ (7)                │
│  Tech Debt:  ❌ (5 — too high!)        │
│  Tableau:    ⭐⭐⭐⭐ (12 cards)         │
│                                         │
│  Pitch quality: STRONG → favor +VC      │
│                                         │
│       [ Continue to pitch → ]           │
└─────────────────────────────────────────┘
```

Pattern: il giocatore vede COME le sue stats si traducono in
probabilità VC, prima dell'estrazione. Trasparenza game design.

### Tasks

#### A. Schema (game.js)

Aggiungere `pitchScore()` + `pickWeightedVC()` helpers (15 LOC).

Sostituire `pickRandom(VC_POOL, 1)` in `endGame` con
`pickWeightedVC(leader)`.

#### B. Pre-VC modal (render-modals.js)

Modificare `showFinalSequenceModal` aggiungendo step "Pitch Readiness"
prima del VC reveal. ~30 LOC.

#### C. Tests

```js
describe("VC pitch quality [S20.3]", () => {
  it("pitchScore: high morale + low debt → positive", () => { ... });
  it("pitchScore: high debt → negative", () => { ... });
  it("pickWeightedVC at score 0 → uniform-ish distribution", () => { ... });
});
```

Note: pickWeightedVC è random, possibile testare solo statistical
properties (run 100 times, check positive bias when score high).
Mantenere semplice — testare solo pitchScore() puro + il fatto che
weights sono > 0 sempre.

### Files

| File | Change |
|------|--------|
| `js/game.js` | +pitchScore, +pickWeightedVC, sostituisci pickRandom |
| `js/render-modals.js` | +Pitch Readiness step in showFinalSequenceModal |
| `styles/main.css` | +CSS .pitch-readiness panel (~30 LOC) |
| `tests/test-rules.js` | +3 test |
| `sw.js` | bump sb-v18 → sb-v19 |

### Acceptance criteria

- [ ] pitchScore deterministic dato stats finali
- [ ] pickWeightedVC: a score = 0, ogni VC entry può essere pickato
  (no zero-weight)
- [ ] Pitch Readiness modal mostra stats + qualità pitch
- [ ] Negative outcomes ancora possibili (game balance preserved)
- [ ] 135/135 test pass

---

## 🛠 SESSION 20.4 — Permanents expansion (+3 tools)

**Tipo**: content expansion
**Effort**: S (~1h)
**Dipendenze**: nessuna; può andare prima di S20.3 se preferito
**Outputs**: pool permanents da 4 → 7. Più scelte strategiche, meno
gating su data_lake per data builds.

### Razionale

Audit permanents:
- 4 totali: ci_cd (eng), data_lake (data), design_system (product),
  monitoring (eng)
- Pool ~80 carte → 4 carte permanent = ~5%. Molto scarso.
- Synergies dipendono: data_empire requires data_lake. Se non lo
  peschi, sinergia morta.
- No interactivity post-install.

### I 3 nuovi permanents

```
═══════════════════════════════════════════════════════════════
A. FEATURE FLAGS · Tool · eng (Q2)
   cost: { budget: 3, tempo: 1 }
   effect: { vp: 1 }, permanent: "feature_flags"
   chainFrom: ["ci_cd"], chainDiscount: { tempo: 1 }
   desc: "Rollout graduali. Crunch cards: -1🐞 (-1 con CI/CD)."

   Permanent effect: ogni carta crunch giocata genera 1 debt in meno.
   Hardcoded check in applyEffect:
     if (player.permanents.feature_flags
         && (card.type === "Feature" || card.type === "Launch")
         && card.effect.techDebt > 0) {
       e.techDebt = Math.max(0, e.techDebt - 1);
     }

   Sinergia con S19 morale mechanic — chi crunch beneficia.

B. INCIDENT RUNBOOK · Tool · eng (Q2)
   cost: { budget: 2, tempo: 2 }
   effect: { techDebt: -1 }, permanent: "incident_runbook"
   desc: "Procedure standard. -1🐞 ora. Ignora burnout debt scaling."

   Permanent effect: ENDOFQUARTER skip burnout debt accumulation.
   Hardcoded check in endOfQuarter:
     if (p.permanents.incident_runbook) {
       // skip burnout block
     } else if (p.morale < 4) {
       p.techDebt += burnoutDebt;
     }

   Insurance contro morale low → fa pickare anche da chi vuole crunch.

C. GROWTH DASHBOARD · Tool · data (Q3)
   cost: { budget: 4 }
   effect: { dati: 2, vp: 2 }, permanent: "growth_dashboard"
   chainFrom: ["data_lake"], chainDiscount: { budget: 2 }
   desc: "Dashboard growth. +2 Dati, +2K. Permanent: ogni Launch +1K MAU."

   Permanent effect: Launch cards +1 vp. Hardcoded check in applyEffect:
     if (player.permanents.growth_dashboard && card.type === "Launch") {
       e.vp = (e.vp || 0) + 1;
     }

   Late-Q3 powerful but expensive. Chain con data_lake la rende
   2 budget reduction = molto strategica.
═══════════════════════════════════════════════════════════════
```

### Tasks

#### A. Carte (data.js)

A, B in CATALOG_Q2 (2 cards)
C in CATALOG_Q3 (1 card)

#### B. Permanent effects (rules.js applyEffect)

Aggiungere 3 hardcoded check pattern allineati con `data_lake` /
`design_system` esistenti:

```js
// In applyEffect, dopo i check data_lake / design_system:
let techDebtDelta = e.techDebt || 0;

// S20.4: feature_flags reduces debt on Feature/Launch
if (player.permanents.feature_flags
    && (card.type === "Feature" || card.type === "Launch")
    && techDebtDelta > 0) {
  techDebtDelta = Math.max(0, techDebtDelta - 1);
}
player.techDebt = Math.max(0, player.techDebt + techDebtDelta);

// S20.4: growth_dashboard +1 vp on Launch
let vpDelta = e.vp || 0;
if (player.permanents.growth_dashboard && card.type === "Launch") {
  vpDelta += 1;
}
player.vp = Math.max(0, player.vp + vpDelta);
```

Per `incident_runbook` (burnout debt skip), modifica in `endOfQuarter`:

```js
if (p.permanents.incident_runbook) {
  // S20.4: skip burnout — runbook protegge il team
} else if (p.morale < 4) {
  const burnoutMult = p.vision?.modifiers?.burnoutDebtMultiplier || 1;
  const burnoutDebt = (4 - p.morale) * burnoutMult;
  p.techDebt += burnoutDebt;
  log(...);
}
```

#### C. UI rendering (render-sidebar.js o equivalent)

`renderAssets` panel mostra "Tech Permanents" — verificare che le 3
nuove abbiano label nel lookup:

```js
const lookup = {
  ci_cd: "CI/CD Pipeline",
  data_lake: "Data Lake",
  design_system: "Design System",
  monitoring: "Monitoring",
  // S20.4:
  feature_flags: "Feature Flags",
  incident_runbook: "Incident Runbook",
  growth_dashboard: "Growth Dashboard",
  // S20.2:
  personalization: "Personalization Engine",
};
```

Wait — `personalization` viene da S20.2 (Personalization Engine card,
sezione C). Da aggiungere anche quel label.

#### D. Tests

```js
describe("new permanents [S20.4]", () => {
  it("feature_flags reduces debt on Feature with debt", () => { ... });
  it("feature_flags has no effect without Feature/Launch", () => { ... });
  it("growth_dashboard +1 vp on Launch", () => { ... });
  it("incident_runbook skips burnout (formula test)", () => { ... });
});
```

Target: **+4 test**. Total 139/139.

### Files

| File | Change |
|------|--------|
| `js/data.js` | +3 carte (2 Q2, 1 Q3) |
| `js/rules.js` | applyEffect: +2 permanent effects (feature_flags, growth_dashboard) |
| `js/game.js` | endOfQuarter: incident_runbook bypass |
| `js/render-sidebar.js` | lookup table updated |
| `tests/test-rules.js` | +4 test |
| `sw.js` | bump sb-v19 → sb-v20 |

### Acceptance criteria

- [ ] Pool permanents 4 → 7 (+ personalization da S20.2 = 8 totali)
- [ ] feature_flags riduce debt di 1 su Feature/Launch (-1 dal value, no negative)
- [ ] growth_dashboard +1 vp su Launch (stack con altri bonus)
- [ ] incident_runbook skippa burnout debt scaling
- [ ] UI sidebar mostra label corrette per tutti i nuovi permanent
- [ ] 139/139 test pass

---

## 🗺️ Dependency graph

```
S20.1 (kill block)  ─┐
                     ├──→ S20.2 (data spend)  ──→ playtest
S20.4 (permanents)  ─┤        (depend solo
                     │         su tracking field)
                     │
S20.3 (VC pitch)  ───┘
```

S20.1 standalone (subtractive). S20.2 sviluppa il content principale.
S20.3 e S20.4 indipendenti, possono partire prima/dopo.

---

## 📐 Definition of Done — Phase 20

Phase 20 è **DONE** quando:

1. ✅ Block & React rimosso completamente, no dangling reference
2. ✅ Dati come risorsa spendable end-to-end (6 carte + 2 sinergie + 1 OKR)
3. ✅ VC Pitch Quality replaces uniform random
4. ✅ 3 nuovi permanents + UI updated
5. ✅ 139+/139+ test pass (~12 nuovi tra le 4 session)
6. ✅ Cache bumpato sb-v16 → sb-v20
7. ✅ CHANGELOG entries S20.1 + S20.2 + S20.3 + S20.4
8. ✅ README aggiornato (rimuove sezione block, aggiunge data spend)
9. ✅ Playtest 3-5 partite per verificare i 3 nuovi mechanic emergono
   nelle decisioni

---

## 🤔 Open follow-ups (post-Phase-20)

- **Soft cap dati > 12** se hoarding domina playtest (~30 min impl)
- **Pitch readiness modal** estensione: mostrare anche le condition
  per le altre VC reactions (più educational, pattern Splendor cards
  hover)
- **Permanent loss mechanic**: una sabotage card che fa lose un
  permanent specifico al target. Adds counter-play.
- **Data-themed Vision** (10ª base?) tipo "Data Mercenary": +2K MAU
  on data-spend cards, -2 starting morale. Allinea con la 9ª vision
  Crunch Culture aggiunta in S19.
- **Counter-Marketing rework** (post-block-removal, c'è ancora la
  cancelNextLaunch handler attivo): valutare se mantenere o rifare
  in chiave morale-cost.
- **AI tuning per le data-spend cards** (fine playtest)

---

## 🎮 Quando iniziare?

Suggerito: **2 sere consecutive** o **un weekend**.
- Sera 1: S20.1 + S20.2 (~4h) — il grosso del lavoro
- Sera 2: S20.3 + S20.4 (~2h) + playtest (~30 min)

**Effort totale Phase 20**: ~6h V1 mechanic.

---

_Roadmap stilata 2026-05-04 dopo design review post-Phase-19. 4 issue
identificate, tutte validate dall'utente in chat: Block & React kill,
Dati spendable, VC Pitch Quality (variant a), Permanents +3. Skip:
AI archetype reveal (già fatto), Counter-Marketing (niche)._
