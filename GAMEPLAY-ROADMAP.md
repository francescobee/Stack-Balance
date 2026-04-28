# Stack & Balance — Gameplay Roadmap (Phase 9)

> **Tipo**: design-driven refinement, post-launch.
> **Origine**: gameplay review effettuata il 2026-04-28 dopo chiusura del
> [`ROADMAP.md`](ROADMAP.md) di sviluppo (Phases 1-8, 20 sessions, ✅).
> **Natura**: sostanzialmente diversa da Phases 1-8. Lì costruivamo
> *features*; qui aggiustiamo *numeri* e *tempi* basandoci su playtest.

---

## 🎯 Vision

Il gioco ha **ossatura solida** ma 7-9 punti di gameplay che, senza
rovinare l'esperienza al primo playthrough, **emergeranno come frizioni
al 5°-10° gioco**. Phase 9 chiude queste frizioni con il rapporto
**impatto/effort più alto possibile**: prima i fix da 15 minuti, poi
il playtest serio.

**Goal misurabile**: dopo Phase 9, l'utente dovrebbe poter giocare 10
partite consecutive senza:
- Sentire che una Vision specifica è "automatica" o "trappola"
- Vedere lo stesso OKR pescato 3 volte essere ovviamente la scelta giusta
- Subire 4 sabotage sul leader e sentirsi "dogpiled"
- Cliccare 6 modali in fila a fine Q3
- Percepire che il primo player ha vantaggio strutturale in Q3

---

## 📊 Heatmap del review

| Area | Severità | Effort fix | Priorità |
|------|---------:|-----------:|---------:|
| Vision asymmetry (Founder/Data Empire 💪, B2B Veteran 🥶) | 🔴 Alta | M | **1** |
| First-player rotation (umano mai primo in Q3) | 🔴 Alta | XS | **2** |
| Award gold-or-nothing (manca bronze tier) | 🟡 Media | XS | **3** |
| Pyramid pool con duplicati di Series B / Mobile App | 🟡 Media | S | **4** |
| Q3 affollato di modali (Pitch + VC + Awards + ...) | 🟡 Media | S | **5** |
| Q1 "tiepido" — niente catene intra-Q | 🟡 Media | M | **6** |
| Sabotage tutte anti-leader → dogpile | 🟡 Media | M | **7** |
| OKR reward range mal calibrato | 🟢 Bassa | S | **8** |
| AI Director senza coordinazione contro umano | 🟢 Bassa | M | **9** |
| Block & React timing window troppo stretto | 🟢 Bassa | XS | **10** |

Severità: 🔴 = "rompe la varietà delle partite", 🟡 = "frustration al
5°+ gioco", 🟢 = "nice-to-have, non gameplay-killer".

Effort: XS = <30min · S = ~1h · M = ~2h · L = ~3h · XL = playtest required.

---

## 📅 Macro-timeline (8 sessions · ~14h totali)

| Session | Tema | Effort | Priorità | Stato |
|---------|------|-------:|---------:|------:|
| **S9.1** | Quick Balance Pass (5 fix da review) | M (~1.5h) | 🔥🔥🔥 | ✅ Done · 2026-04-28 |
| **S9.2** | Vision Rebalance Deep (con playtest) | XL (~3h) | 🔥🔥🔥 | 🟡 Static analysis Done · 2026-04-28 · empirical playtest deferred a S9.8 |
| **S9.3** | OKR Reward Calibration | S (~1h) | 🔥🔥 | ✅ Done · 2026-04-28 |
| **S9.4** | Sabotage Diversification (2 nuove carte) | M (~2h) | 🔥🔥 | ✅ Done · 2026-04-28 |
| **S9.5** | Pacing Fixes (Q1 chains + Q3 modal collapse) | M (~1.5h) | 🔥🔥 | ✅ Done · 2026-04-28 |
| **S9.6** | AI Director Coordination | M (~2h) | 🔥 | ✅ Done · 2026-04-28 |
| **S9.7** | Block & React Tuning | XS (~30min) | 🔥 | ✅ Done · 2026-04-28 |
| **S9.8** | Playtest Gauntlet & Final Balance | XL (~3h) | 🔥🔥🔥 | ⬜ |

**Ordine consigliato**: S9.1 → S9.3 → S9.5 → S9.7 (tutti i quick fix prima)
→ S9.2 (deep balance) → S9.4 → S9.6 → S9.8 (validation).

> ⚠️ **Differenza fondamentale dalle Phases 1-8**: qui le acceptance
> criteria includono **playtest soggettivo** (es. "in 5 partite, 3+ Vision
> diverse vincono"). Non basta "il codice gira". Pianificare 30-60 min di
> playtest per ogni session pesante.

---

## 🔥 SESSION 9.1 — Quick Balance Pass ✅ Done · 2026-04-28

**Tipo**: numeric tuning + 2 micro-feature
**Effort**: M (~1.5h) · **Actual**: ~1h
**Dipendenze**: nessuna
**Files toccati**: `js/balance.js`, `js/visions.js`, `js/game.js`,
`js/render-modals.js`, `tests/test-rules.js`
**Changelog**: [`[S9.1]`](CHANGELOG.md#s91--2026-04-28--quick-balance-pass)

> ⚠️ **Follow-up flag**: Founder Mode nerf 1.5→1.3 sembra **insufficient**
> al check matematico. Rivalutare in S9.2.

**Goal**: chiudere i 5 fix dal review che hanno effort `<30min` ognuno.
Sblocca il resto della phase senza richiedere playtest preliminare.

### Requirements

#### 9.1.a — Bronze tier per gli stat awards
In `js/balance.js`, aggiungere una soglia bassa a tutti i tier:
```js
MORALE_TIERS: [
  { threshold: 9, points: 12, label: "≥ 9" },
  { threshold: 7, points:  5, label: "≥ 7" },
  { threshold: 5, points:  2, label: "≥ 5" },   // NEW bronze
],
TALENT_TIERS: [
  { threshold: 7, points: 12, label: "≥ 7" },
  { threshold: 5, points:  5, label: "≥ 5" },
  { threshold: 3, points:  2, label: "≥ 3" },   // NEW
],
DATA_TIERS: [
  { threshold: 10, points: 15, label: "≥ 10" },
  { threshold:  6, points:  5, label: "≥ 6"  },
  { threshold:  3, points:  2, label: "≥ 3"  }, // NEW
],
```
Verificare che `tierClass()` gestisca già il caso bronze con la sua
formula `points >= gold ? "gold" : points >= silver ? "silver" : points > 0 ? "bronze" : "none"`.

#### 9.1.b — Skip Pitch button
In `js/render-modals.js`, `showInvestorPitchModal`: aggiungere un secondo
bottone con classe `ghost` accanto al primary:
```html
<button class="ghost" id="skipPitchBtn" type="button">Salta →</button>
```
Skipping va direttamente a `onComplete()` senza VC reaction *separata*
(la VC reaction si applica comunque al leader, ma in modal collapsed —
vedi 9.5.b).

#### 9.1.c — Q3 first-player = last-place
In `js/game.js`, `startQuarter()`, sostituire:
```js
const startingPlayer = (state.quarter - 1) % NUM_PLAYERS;
```
con:
```js
let startingPlayer;
if (state.quarter === NUM_QUARTERS) {
  // S9.1: last-place player parte primo nella finale (catch-up)
  const ranked = state.players.map((p, i) => ({ i, vp: p.vp }))
    .sort((a, b) => a.vp - b.vp);
  startingPlayer = ranked[0].i;
} else {
  startingPlayer = (state.quarter - 1) % NUM_PLAYERS;
}
```

#### 9.1.d — Vision numeric tweaks
In `js/visions.js`:
- **Founder Mode**: `awardMultipliers` da `1.5/1.5/0.5` a `1.3/1.3/0.5`
  (mantieni tilt morale/talent ma meno dominante)
- **Data Empire**: `startingMorale` da `-2` a `-3`
- **B2B Veteran**: rimuovi `excludeCardIds: ["viral_campaign"]` (mantieni
  solo no-Mobile App). Aggiungi `effectBonusByType: { Funding: { vp: 1 } }`.

#### 9.1.e — Pyramid pool dedup di high-VP/permanent cards
In `js/game.js`, `startQuarter()`, sostituire il loop di build cards:
```js
const cards = [];
for (let i = 0; i < TOTAL_PICKS; i++) {
  cards.push(instCard(pool[i % pool.length]));
}
```
con uno che sceglie le high-VP solo una volta:
```js
const cards = [];
const usedHighVp = new Set();
for (let i = 0; i < TOTAL_PICKS; i++) {
  let candidate = pool[i % pool.length];
  // S9.1: high-VP (≥5) o permanent cards: max 1 instanza per Q
  const isPrecious = candidate.permanent || (candidate.effect?.vp ?? 0) >= 5;
  if (isPrecious && usedHighVp.has(candidate.id)) {
    // skip & try next non-duplicate
    candidate = pool.find(c =>
      !usedHighVp.has(c.id) || (!c.permanent && (c.effect?.vp ?? 0) < 5)
    ) || candidate;
  }
  if (isPrecious) usedHighVp.add(candidate.id);
  cards.push(instCard(candidate));
}
```

### Acceptance criteria
- [ ] In una partita test, un player con Morale 5 (mid) ottiene un
      bronze badge nella sidebar awards forecast (non più "—").
- [ ] In Q3, il button "Salta →" è visibile sul modal pitch e accelera
      il flusso senza saltare la VC reaction.
- [ ] In Q3, il primo pick è del player con MAU più basso.
- [ ] In una pyramid Q3, **non** compaiono 2 instanze di Series B
      (verificabile via console: `state.pyramid.flat().filter(s => s.card.id === "series_b").length <= 1`).
- [ ] Founder Mode test: con morale 9 + talent 7, l'award totale stat è
      `~22pt` (era `~31pt` con 1.5x). Riduzione del ~30%.

---

## 🎭 SESSION 9.2 — Vision Rebalance Deep 🟡 Static analysis Done · 2026-04-28

**Tipo**: balance design + playtest
**Effort**: XL (~3h, di cui ~1.5h playtest) · **Actual S9.2 (static)**: ~1h
**Dipendenze**: S9.1 (quick tweaks già applicati)
**Files toccati**: `js/visions.js`, `js/render-modals.js` (dev hook),
`BALANCE-NOTES.md` (nuovo)
**Changelog**: [`[S9.2]`](CHANGELOG.md#s92--2026-04-28--vision-rebalance-deep-math-analysis)

> **Honest disclosure**: la session S9.2 originale prevedeva 1.5h di
> playtest empirico (40 partite). In questa session ho applicato solo
> *static math analysis*: 3 Vision retunate (Tech First nerf, Bootstrapped
> rework, B2B Veteran buff), dev hook `localStorage.dev.forceVision`
> aggiunto per playtest deterministico in S9.8, e [`BALANCE-NOTES.md`](BALANCE-NOTES.md)
> creato con math + playtest protocol + validation flags.
>
> **Empirical playtest deferito a S9.8** (Playtest Gauntlet) dove il
> giocatore esegue le 40 partite e popola i blocchi `Measured` di
> BALANCE-NOTES.md.

**Goal**: portare le 8 Vision Cards a un win rate stimato di **50% ± 15%**
(non 50% esatto — alcune devono restare "sfide", ma nessuna sotto 35% o
sopra 65%).

### Approach

1. **Setup**: 5 partite per Vision = 40 partite. Director difficulty,
   scenario Standard (per isolare la variabile Vision).
2. **Tracking**: aggiungi un override locale per `chooseAIVision` che
   forza una Vision specifica all'umano (per non aspettare il random
   draft). Gioca 5 partite per ognuna, scrivi su un foglio:
   - Win/Loss
   - MAU finale
   - Award totale (split stat vs synergy)
3. **Aggiusta i numeri** delle Vision con win rate <35% (buff) o >65% (nerf).

### Common pitfalls da aspettarsi

- **Bootstrapped** probabilmente sotto-tier (no Funding cards in Q2/Q3
  significa perdere Series A/B). Possibile fix: `startingBudget: 6`
  invece di 4, o aggiungere `awardMultipliers: { stack: 1.3 }` (premia
  l'investimento in tooling come compensazione).
- **Tech First** probabilmente sopra-tier dopo che Tool cost −1💰
  rende quasi free TUTTI i permanent (5 perm × −1💰 = −5💰 risparmiati,
  inoltre Tech Stack award è facile). Possibile fix: limitare lo sconto
  ai primi 2 Tool cards (richiede tracking nuovo).
- **Growth Hacker** Launch +1K MAU bonus si combina pessimamente con il
  malus Discovery +1⏱ in Q1 (4 Discovery cards × +1⏱ = +4⏱ persi). Forse
  spostare il malus a Q1 only? O renderlo Discovery +1💰 invece di +1⏱.

### Stretch: aggiungere una 9° Vision
Se durante il playtest emerge che mancano archetipi (es. "Indie Hacker"
= focus su singolo dipartimento, "OSS Maintainer" = bonus se 0 Funding),
aggiungerne una. **Solo se il playtest la chiede**, no design speculativo.

### Acceptance criteria
- [ ] In 5 partite × Vision (40 totali), nessuna Vision ha win rate <35%
      o >65%.
- [ ] L'utente può spiegare a parole quale Vision sceglierebbe per quale
      "stile di gioco" (i.e. le Vision sono *leggibili*, non solo
      meccanicamente diverse).
- [ ] Document aggiornato (in `CONTEXT.md` o nuovo `BALANCE-NOTES.md`)
      con le percentuali di win rate misurate per ogni Vision.

---

## 🎯 SESSION 9.3 — OKR Reward Calibration ✅ Done · 2026-04-28

**Tipo**: numeric tuning + 2 OKR nuovi (con tracking infrastructure)
**Effort**: S (~1h) · **Actual**: ~50min
**Dipendenze**: S9.1
**Files toccati**: `js/data.js`, `js/state.js`, `js/game.js`, `js/rules.js`,
`tests/test-rules.js`
**Changelog**: [`[S9.3]`](CHANGELOG.md#s93--2026-04-28--okr-reward-calibration)

> ✅ Implementato anche lo stretch (2 nuovi OKR + tracking) oltre al
> reward retuning base. Pool 14→16, 35/35 test pass.

**Goal**: ricalibrare i 14 OKR esistenti per far sì che il **reward**
sia proporzionale alla **difficoltà** del completamento.

### Requirements

Tabella di calibrazione target:

| OKR | Reward attuale | Difficoltà | Reward proposto |
|-----|---------------:|-----------:|----------------:|
| `morale_high` (Morale ≥7) | 5K | Bassa | **4K** ⬇ |
| `data_target` (5+ Dati) | 5K | Media | 5K ✓ |
| `talent_pool` (≥4 Talento) | 5K | Media | 5K ✓ |
| `ship_features` (2+ Feature/Discovery/Launch) | 6K | Bassa-Media | **5K** ⬇ |
| `hiring_drive` (2+ Hiring) | 4K | Media | 4K ✓ |
| `fix_first` (1+ BugFix) | 3K | Bassa | 3K ✓ |
| `cost_efficiency` (≤4 budget spesi) | 5K | Media | 5K ✓ |
| `permanent_collector` (≥2 Tech Permanents) | 4K | Media-Alta | **6K** ⬆ |
| `funding_streak` (2+ Funding) | 4K | Media | 4K ✓ |
| `morale_boost` (Morale +2 nel Q) | 4K | Media | 4K ✓ |
| `velocity_run` (5+ carte giocate) | 5K | Alta in Q1 | **6K** ⬆ |
| `diversification` (3 dept diversi) | 5K | Media | 5K ✓ |
| **`dept_purist`** (3+ carte mono-dept) | 6K | **Molto alta** | **8K** ⬆⬆ |
| **`no_tech_debt`** (Q-end ≤1 debt) | 6K | Alta in Q3 | **7K** ⬆ |

**Aggiunta opzionale**: 2 nuovi OKR per espandere il pool a 16 (più
varietà = più decision space):

```js
{ id: "synergy_chaser", text: "Trigga 2+ catene questo Q", reward: 5,
  check: (p) => (p._chainsTriggeredThisQ || 0) >= 2 },
// Richiede tracking nuovo: incrementare in applyEffect quando isChainTriggered

{ id: "lean_quarter", text: "Chiudi il Q senza scartare carte", reward: 4,
  check: (p) => p._quarterDiscards === 0 },
// Richiede tracking nuovo: incrementare in takeFromPyramid action="discard"
```

### Acceptance criteria
- [ ] In 5 partite test, l'utente sceglie OKR diversi (non sempre lo stesso).
- [ ] `dept_purist` è scelto almeno 1 volta nelle 5 partite (con
      reward 8K diventa appealing).
- [ ] `morale_high` non è più la "scelta automatica" del Q1.

---

## ⚔️ SESSION 9.4 — Sabotage Diversification ✅ Done · 2026-04-28

**Tipo**: design + content (carte nuove)
**Effort**: M (~2h) · **Actual**: ~1.5h
**Dipendenze**: S9.1
**Files toccati**: `js/data.js`, `js/rules.js`, `tests/test-rules.js`
**Changelog**: [`[S9.4]`](CHANGELOG.md#s94--2026-04-28--sabotage-diversification)

> ⚠️ **Deviation**: Industry Whisper semantica cambiata da "next Q" a
> "subito" (sabotage tutte in Q3 → no next Q). Architettura
> `_nextQTempoMod` non implementata. Dettagli nel CHANGELOG.

**Goal**: rompere il pattern "tutte le sabotage colpiscono il leader"
introducendo varietà di target. Riduce il dogpile-effect.

### Requirements

#### 9.4.a — 2 nuove sabotage cards in Q3
```js
{ id: "hostile_takeover", name: "Hostile Takeover", dept: "product", type: "Sabotage",
  cost: { budget: 5 },
  effect: { stealVpFromLast: 3, vp: 1 },
  desc: "Acquisisci uno dei più piccoli. Il last-place perde 3K MAU." },

{ id: "industry_whisper", name: "Industry Whisper", dept: "data", type: "Sabotage",
  cost: { budget: 2, tempo: 1 },
  effect: { weakenNextPicker: { tempo: -1 }, vp: 1 },
  desc: "Soffia un rumor al concorrente che picca dopo. Perde 1⏱ il prossimo Q." },
```

#### 9.4.b — Implementare i 2 nuovi effect handlers in `rules.js`
In `applySabotageEffects(player, e, allPlayers)`:

```js
// S9.4: Hostile Takeover — target il LAST place (non leader)
if (e.stealVpFromLast) {
  const target = allPlayers
    .filter(p => p !== player)
    .reduce((worst, p) => (p.vp < (worst?.vp ?? Infinity)) ? p : worst, null);
  if (target) {
    const lost = Math.min(e.stealVpFromLast, target.vp);
    target.vp -= lost;
    log(`${player.name} acquisisce: ${target.name} −${lost}K`, ...);
  }
}

// S9.4: Industry Whisper — penalize next picker for next Q
if (e.weakenNextPicker) {
  const nextIdx = state.pickOrder[state.pickIndex + 1];
  if (nextIdx != null && state.players[nextIdx] !== player) {
    state.players[nextIdx]._nextQTempoMod = (state.players[nextIdx]._nextQTempoMod || 0)
      + e.weakenNextPicker.tempo;
  }
}
```

In `startQuarter`, applicare il `_nextQTempoMod`:
```js
p.tempo += (p._nextQTempoMod || 0);
p._nextQTempoMod = 0;
```

#### 9.4.c — Riequilibrare le 4 sabotage esistenti
- `patent_lawsuit`: target *random of top-2* invece di "most features"
  (riduce predictability — non sempre il leader)
- `negative_press`: cost da `2💰` a `3💰` (era a buon mercato per quanto
  forte)

### Acceptance criteria
- [ ] In Q3, almeno 2 sabotage diverse compaiono nella pyramid.
- [ ] `hostile_takeover` sembra giocabile per AI Alessia (Hustler) — non
      ignorato dal scoring.
- [ ] In una partita dove l'umano è in mid-place (rank 2-3), non viene
      mai targettato dai sabotage (perché non è leader né last).

---

## ⏱ SESSION 9.5 — Pacing Fixes ✅ Done · 2026-04-28

**Tipo**: design (Q1 chains) + UX (Q3 modal collapse + auto-dismiss)
**Effort**: M (~1.5h) · **Actual**: ~1.25h
**Dipendenze**: S9.1
**Files toccati**: `js/data.js`, `js/render-modals.js`, `js/game.js`,
`js/render-profile.js`, `styles/main.css`
**Changelog**: [`[S9.5]`](CHANGELOG.md#s95--2026-04-28--pacing-fixes-q1-chains--q3-modal-collapse)

> Implementato anche 9.5.c (auto-dismiss modal achievements) oltre a
> 9.5.a (3 catene Q1) + 9.5.b (collapse Pitch+VC). 40/40 test invariati.

**Goal**: dare al Q1 un *wow moment* e snellire la finale del Q3.

### Requirements

#### 9.5.a — Catene intra-Q1
Aggiungere `chainFrom` + `chainDiscount` a 2-3 carte Q1 esistenti per
creare catene **dentro** il primo Q:

```js
// Modificare in CATALOG_Q1:
{ id: "pitch_deck", ...,
  chainFrom: ["lean_canvas"], chainDiscount: { tempo: 1 },
  // sconto -1⏱ (cost: { tempo: 1 } → 0) se hai già fatto Lean Canvas
},
{ id: "wireframes", ...,
  chainFrom: ["lean_canvas", "user_research"], chainDiscount: { talento: 1 },
  // sconto -1🧠 (cost: { tempo: 1, talento: 1 } → tempo 1) se hai canvas o research
},
{ id: "mvp_proto", ...,
  chainFrom: ["wireframes", "junior_dev"], chainDiscount: { tempo: 1 },
  // chain in-Q1: gratis se hai wireframes O junior_dev
},
```

Effetto narrativo: il giocatore Q1 vede *immediatamente* un ROI dalle
sue scelte, non solo "in Q2 capirai".

#### 9.5.b — Collapse Investor Pitch + VC Reaction
In `game.js`, `showInvestorPitch()`: invece di chiamare
`showInvestorPitchModal` poi `showVcReactionModal` come modali separati,
combinare in **un unico modal con due "scene"** che si succedono via CSS
animation. Il `VC reaction` appare come un `panel slide-in` 1s dopo che
l'utente ha cliccato "Avanti" sulla pitch.

Alternative semplice: aggiungere un unico bottone "Avanti →" sul pitch
modal che mostra un overlay-panel con la VC reaction *senza chiudere*
il modal. L'utente clicca "Vedi classifica →" per chiudere tutto in
una volta.

#### 9.5.c — Achievement modal con auto-dismiss
In `render-profile.js`, `showNewAchievementsModal`: aggiungere
`setTimeout(() => onComplete(), 4000)` dopo il render, cosicché si
auto-dismissa dopo 4s **se l'utente non clicca**. Riduce la friction.

### Acceptance criteria
- [ ] In Q1, l'utente trigga almeno 1 catena (verificare via toast
      "Catena attiva!").
- [ ] Tra l'ultimo pick di Q3 e la classifica finale, l'utente clicca
      max **3 volte** (era 5+).

---

## 🤖 SESSION 9.6 — AI Director Coordination ✅ Done · 2026-04-28

**Tipo**: AI logic + sabotage scoring refactor
**Effort**: M (~2h) · **Actual**: ~1.5h
**Dipendenze**: S9.4 (per le nuove sabotage)
**Files toccati**: `js/ai.js`, `tests/test-rules.js`, `tests/test.html`
**Changelog**: [`[S9.6]`](CHANGELOG.md#s96--2026-04-28--ai-director-coordination)

> Implementati tutti i 3 sub-task (9.6.a/b/c) + bonus refactor del
> sabotage scoring per supportare le 2 nuove carte di S9.4 in modo
> data-driven. 44/44 test pass.

**Goal**: a livello Director, l'AI deve sentirsi *aware* dell'umano.
Non IA reale — euristiche statiche che simulano "threat awareness".

### Requirements

#### 9.6.a — Leader-pressure scoring bonus
In `decideAIPickFromPyramid`, se `state.difficulty === "director"`:

```js
// S9.6: Director-only — pressure on the leader
const leader = state.players.reduce((best, p, idx) =>
  p.vp > (best?.vp ?? -1) ? { p, idx } : best, null);
const isHumanLeading = leader?.p?.isHuman;

if (isHumanLeading && card.type === "Sabotage") {
  score += 2.5; // amplifica il pickup di sabotage contro l'umano leader
}

// E inoltre: se la carta è una high-VP Q3 (≥5K) e il leader è l'umano,
// bonus per sottrarla anche se non è il pick "ottimale" per la persona
if (isHumanLeading && (card.effect?.vp ?? 0) >= 5) {
  score += 1.0; // counter-pick
}
```

#### 9.6.b — Block timing più aggressivo per Director
In `aiSelectBlocker`, abbassare la soglia di `card_value` per Director da
4 a 3. E aggiungere: se l'umano ha già il leader, prob block 0.85 (era
0.7).

#### 9.6.c — Vision draft più strategico
In `chooseAIVision`, Director guarda anche lo **scenario** corrente:
- Se scenario è `bear_market_2008`, preferisci `bootstrapped` (no funding,
  meno sofferenza)
- Se scenario è `ai_hype_wave`, preferisci `data_empire` (hai bonus dati)
- Se scenario è `remote_first`, preferisci `lean_startup` (debt tolerance)

### Acceptance criteria
- [ ] In partita Director con human in vetta, almeno 1 AI gioca una
      sabotage card nei 6 pick di Q3.
- [ ] Block rate AI a Director > 0.7 quando l'umano ha vp >= max(AI vp).
- [ ] AI in scenario `ai_hype_wave` sceglie `data_empire` Vision in
      almeno 50% delle volte (su 4 partite test).

---

## 🛡 SESSION 9.7 — Block & React Tuning ✅ Done · 2026-04-28

**Tipo**: numeric tuning
**Effort**: XS (~30min) · **Actual**: ~10min
**Dipendenze**: S9.1
**Files toccati**: `js/balance.js`
**Changelog**: [`[S9.7]`](CHANGELOG.md#s97--2026-04-28--block--react-tuning)

> Solo `WINDOW_MS: 2500 → 4000`. Stretch (arm-defense pre-arm) **non
> implementato** — vedi razionale nel CHANGELOG. Verificato manualmente.

### Requirements

In `js/balance.js`:
```js
BLOCK: Object.freeze({
  COST_BUDGET: 2,
  COST_TEMPO: 1,
  WINDOW_MS: 4000,             // S9.7: 2500 → 4000 (era troppo stretto)
  REVEAL_DELAY_TURNS: 2,
}),
```

**Stretch (opzionale)**: arm-defense pre-arm. Aggiungere un button
"🛡 Arm Block" disponibile durante il proprio turno che, cliccato,
abilita il block automatico al prossimo reveal AI senza necessità di
reazione. Costa il doppio (4💰+2⏱).

### Acceptance criteria
- [ ] In una partita test, l'umano riesce a cliccare il block in tempo
      almeno 2 volte su 3 opportunità.

---

## 🎲 SESSION 9.8 — Playtest Gauntlet & Final Balance

**Tipo**: validation playtest + tuning di follow-up
**Effort**: XL (~3h)
**Dipendenze**: tutte le altre (S9.1 → S9.7)
**Files toccati**: `js/balance.js` + qualsiasi numero da ritoccare

**Goal**: convalida finale che le 7 session precedenti hanno migliorato
il gioco senza romperlo. Eventuali aggiustamenti finali.

### Protocol

**10 partite focused**:

| # | Scenario | Vision | Difficoltà | Daily? |
|---|----------|--------|------------|--------|
| 1 | Standard | Founder Mode | Senior | No |
| 2 | Standard | Bootstrapped | Senior | No |
| 3 | Standard | B2B Veteran | Senior | No |
| 4 | Standard | Tech First | Director | No |
| 5 | Bear Market 2008 | Lean Startup | Senior | No |
| 6 | Bear Market 2008 | Data Empire | Director | No |
| 7 | AI Hype Wave | Data Empire | Senior | No |
| 8 | AI Hype Wave | Growth Hacker | Director | No |
| 9 | Remote First | Viral Native | Senior | No |
| 10 | Standard | random | Director | Sì (Daily) |

**Per ogni partita, log su un foglio (o nuovo `tests/playtest-log.md`)**:
- Vincitore + MAU finale
- Award totale del player umano (split stat / synergy / Q-bonus)
- Quanti OKR completati
- 1-2 *moment of friction*: "ho dovuto scartare 3 carte di seguito",
  "il modal di pitch è pesante", "Karim ha bloccato e mi ha rotto il combo"
- 1 *moment of joy*: "ho chiuso 3 BugFix → Engineering Excellence",
  "ho rubato Series B all'ultimo pick"

### Decision tree post-playtest

- **Win rate umano <30%** → buff iniziale (es. budget +1 oppure tempo+1)
- **Win rate umano >70%** → nerf personas o boost AI lookahead
- **Una Vision specifica vince >60% delle volte** → nerf in target
- **Player non sceglie mai una specifica OKR** → ricalibra reward
- **Modal frustration ricorrente** → ulteriore collapse

### Stretch goal: documenta i numeri finali

Creare `BALANCE-NOTES.md` con:
- Tabella delle Vision e win rate misurato
- Tabella OKR e tasso di completion (% volte completato quando scelto)
- Note di design su decisioni "controintuitive" (es. perché Founder Mode
  ha il `awardMultipliers: 1.3` e non 1.5)

### Acceptance criteria
- [ ] 10/10 partite completate senza crash o stati incoerenti.
- [ ] Win rate umano (a Senior) tra 40% e 60%.
- [ ] Almeno 5 Vision diverse vincono almeno 1 partita su 10.
- [ ] L'utente può articolare a parole "questo gioco è bilanciato" senza
      hedging.

---

## 🔁 Iteration loop (intra-session)

Per ogni session "playtest-required" (S9.2, S9.6, S9.8):

1. **Apply changes** sui numeri proposti
2. **Playtest** secondo protocol
3. **Identifica 1-2 issue concrete** (non vibe) — es. "Bootstrapped
   underperforma di 12K MAU vs Tech First"
4. **Applica un fix mirato** (non riscrivere tutto)
5. **Re-playtest** 2-3 partite per validare il fix
6. **Documenta** in `BALANCE-NOTES.md`

Ripeti finché le acceptance sono soddisfatte. **Stop loss**: se una
session sfora del +50% l'effort budget, accetta il numero "good enough"
e nota il debt in CHANGELOG per S9.x+1.

---

## 🚫 Out of scope per Phase 9

Idee che potrebbero migliorare il gioco ma sono **fuori dallo scope** di
questa phase (sono nuove feature, non balance):

- 4° quarter (Q4 Scaling) — aumenta significativamente la durata, va
  pianificato come Phase 10 a sé
- Carte event giocabili attivamente (invece che passive)
- Negotiation phase tra umano e AI
- Mobile responsive layout
- Multi-lingua (oggi è italiano-only)
- Card editor in-game

Tutti vivono nel `ROADMAP.md → 📚 BACKLOG`.

---

## 📐 Definition of Done — Phase 9

Phase 9 è chiusa quando:

1. ✅ Tutte le 8 sessions hanno acceptance criteria verificati
2. ✅ Almeno **20 partite di playtest** totali condotte (cumulato
   intra-session + S9.8)
3. ✅ `BALANCE-NOTES.md` esistente con i numeri finali documentati
4. ✅ Win rate Vision: nessuna fuori da [35%, 65%]
5. ✅ Frizioni dal review iniziale (Q1 tiepido, Q3 affollato, dogpile,
   first-player asymmetry, gold-or-nothing) **non più riproducibili**
6. ✅ Fini di nuove frizioni (emerse durante playtest) sono **registrate**
   in CHANGELOG come future work, non lasciate sotto al tappeto

---

## 🗺️ Dependency graph

```
S9.1 ─┬─→ S9.2 ──┐
      ├─→ S9.3   │
      ├─→ S9.4 ──┴─→ S9.6 ──┐
      ├─→ S9.5             │
      └─→ S9.7 ─────────────┴─→ S9.8 (validation)
```

**Critical path**: S9.1 → S9.2 → S9.8 (~7.5h).
**Parallel-friendly**: S9.3, S9.5, S9.7 possono girare in qualsiasi
ordine dopo S9.1.

---

## 🎮 Quando iniziare?

Suggerito: **S9.1 oggi, S9.2 domani**, le altre quando sei in mood di
playtest. Phase 9 non ha urgenza — il gioco è completamente giocabile
*adesso*, queste sono raffinature da "passa al livello successivo".

Se hai poco tempo: **fai solo S9.1 + S9.7** (2h totali) per i fix più
veloci con impatto visibile, e rimanda il resto.

Se hai un weekend: **fai S9.1 → S9.5 → S9.8** (saltando deep balance) per
un *good enough* in ~8h.

---

_Roadmap stilata 2026-04-28 dopo gameplay review post-Phase-8.
Firma: Federica + Claude. Aggiornare lo stato delle session qui sopra
quando completate, e popolare i CHANGELOG.md con entry `[S9.X]` per
tracciare i numeri esatti dei tuning effettuati._
