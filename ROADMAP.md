# Stack & Balance — Development Roadmap

> Piano di sviluppo dal prototipo attuale al gioco "deep & replayable".
> Ogni **Session** è dimensionata per essere completata in una singola chat
> di lavoro focalizzato (1–3h di sviluppo). Le sessions sono ordinate per
> dipendenze e per impatto sul divertimento.
>
> 👉 **Stai riprendendo lo sviluppo?** Leggi prima [`CONTEXT.md`](CONTEXT.md)
> per orientarti rapidamente: architettura, convenzioni, gotchas e stato corrente.

---

## 🎯 Vision

Trasformare l'attuale prototipo (drafting funzionale ma "solitario") in un
gioco con:

1. **Decisioni dolorose** — ogni pesca è un trade-off, non una scelta ovvia.
2. **Identità di gioco** — gli stili "Builder / Hustler / Auditor" portano a
   strategie distinte e tutte vincenti.
3. **Interazione tra giocatori** — quello che fa l'avversario conta, non sei
   in una bolla.
4. **Tensione narrativa** — Q2 non si trascina, Q3 ha un climax.
5. **Replayability** — almeno 30+ partite prima di "aver visto tutto".
6. **AI interessante** — 3 personalità distinte, difficoltà scalabile.

---

## 📅 Macro-timeline (8 fasi · ~19 sessions)

| Fase | Tema | Sessions | Priorità | Stato |
|------|------|----------|----------|-------|
| **1** | Decision Pressure | 3 | 🔥🔥🔥 | ✅ **Completata** (3/3) |
| **2** | Strategic Identity | 3 | 🔥🔥🔥 | ✅ **Completata** (3/3) |
| **3** | Player Interaction | 2 | 🔥🔥 | ✅ **Completata** (2/2) |
| **4** | Pacing & Climax | 2 | 🔥🔥 | ✅ **Completata** (2/2) |
| **5** | AI Quality | 2 | 🔥🔥 | ✅ **Completata** (2/2) |
| **6** | Replayability | 3 | 🔥 | ✅ **Completata** (3/3) |
| **7** | Feel & Polish | 2 | 🔥 | ✅ **Completata** (2/2) |
| **8** | Code Quality | 2 | 🔧 | ✅ **Completata** (2/2) |

Ordine consigliato: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8.
Pause/playtest di 30min consigliate dopo le fasi 2, 4 e 6 per validare
le scelte di design prima di procedere.

---

## 🔥 PHASE 1 — DECISION PRESSURE

**Obiettivo**: rendere le risorse scarse e i trade-off reali. Eliminare le
"scelte ovvie".

---

### Session 1.1 — Crunch Cards & Tech Debt Rework ✅ Done · 2026-04-27

**Tipo**: meccanica core
**Effort**: M (~2h) · **Actual**: ~1.5h
**Dipendenze**: nessuna
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S1.1]`

#### Patch S1.1.1 ✅ Done · 2026-04-27 — Bug Interrupt
Estensione realistica: quando il Tech Debt cresce, perdi `⏱` nel quarter
successivo (i bug rallentano lo sviluppo). Soglia: debt ≥ 4 → −1⏱, ≥ 6 → −2⏱.
Sub-row UI sotto Tempo + toast "BUG INTERRUPT".
Changelog: [`[S1.1.1]`](CHANGELOG.md).

**Goal**: dare al Tech Debt un ruolo centrale invece che cosmetico.

**Requirements**:
- Aggiungere flag `addsDebt: N` a una nuova categoria di "Crunch Cards"
- Catalog Q2: aggiungere 3 carte con trade-off forte
  - `Hotfix Push` (eng, Feature) — costo basso, +4K MAU, +2 Tech Debt
  - `Outsource Dev` (eng, Hiring) — +2 Talento sconto, +1 Tech Debt
  - `MVP Ship It` (product, Feature) — basso costo, +5K MAU subito, +2 Debt
- Catalog Q3: aggiungere 2 carte
  - `Black Friday Push` (product, Launch) — +6K MAU, +3 Debt
  - `Last Minute Fix` (eng, BugFix) — costo zero ma +1 Debt invece di -1
- Rivedere penalità Tech Debt:
  - Penalità per Q ora parte da 3 (era 4): −1K per ogni debt sopra 2
  - Penalità end-game raddoppiata: −2K per ogni debt
- Buff Clean Code Award:
  - 0 debt → +8K (era 5), 1 → +5, 2 → +2

**Acceptance criteria**:
- [ ] Almeno 1 partita di test in cui il giocatore vede il dilemma "shippo o pulisco"
- [ ] Tech Debt è > 0 in almeno il 70% delle partite (oggi è ~10%)
- [ ] Le Crunch Cards vengono pescate ma non sono no-brain take

**File toccati**: `js/data.js`, `js/rules.js`, `js/game.js` (endOfQuarter penalty)

---

### Session 1.2 — Talent Pool & Budget Pressure ✅ Done · 2026-04-27

**Tipo**: meccanica core
**Effort**: M (~1.5h) · **Actual**: ~1h
**Dipendenze**: 1.1
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S1.2]`

**Goal**: evitare che Talento e Budget si accumulino linearmente. Creare
"colli di bottiglia" temporali.

**Requirements**:
- **Talento parzialmente consumato per Q**:
  - Aggiungere `state.players[i].talentoUsed` (reset a 0 per Q)
  - `canAfford` controlla `(talento - talentoUsed) >= cost.talento`
  - `payCost` incrementa `talentoUsed` (non decrementa `talento`)
  - Il Talento permanente cresce col gioco; il *disponibile* per Q è limitato
- **Budget non si accumula tra Q**:
  - A fine Q: `budget` rimanente dimezzato (floor) e convertito (`/3` → +K MAU)
  - Forza a spendere o a investire in Tooling
- UI:
  - Mostrare in panel risorse `🧠 3 (1 used)` o simile
  - Hint a fine Q: "fra 3 turni il budget si dimezza, spendi!"

**Acceptance criteria**:
- [ ] Hire massivi early game non dominano l'intera partita
- [ ] I giocatori sono incentivati a spendere il Budget invece di accumularlo
- [ ] La UI delle risorse rimane leggibile

**File toccati**: `js/state.js`, `js/rules.js`, `js/game.js`, `js/render.js`, `styles/player.css`

---

### Session 1.3 — Balance Pass + Tuning ✅ Done · 2026-04-27

**Tipo**: tuning + refactor infrastrutturale
**Effort**: S (~1h) · **Actual**: ~1h
**Dipendenze**: 1.1, 1.2
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S1.3]`

**Goal**: dopo le sessions 1.1 e 1.2 servirà ribilanciare numeri.

**Requirements**:
- Playtest manuale: 3 partite complete contro AI
- Annotare frizioni: carte mai pescate / carte sempre pescate
- Ritoccare i seguenti parametri secondo i dati raccolti:
  - Costi delle carte powerhouse (Mobile App, Series B)
  - Reward OKR (potrebbero essere troppo alti ora che il gioco è più stretto)
  - Award morale: linear vs threshold (test entrambi)
- Aggiungere `js/balance.js` come unico file di costanti tunable per future
  iterations (estrai i numeri da rules.js)

**Acceptance criteria**:
- [ ] Almeno 8 carte differenti vengono pescate dal vincitore in partite distinte
- [ ] Nessuna carta mai pescata in 5 partite consecutive
- [ ] Tutti i numeri tuning sono in `balance.js`

**File toccati**: `js/data.js`, `js/balance.js` (nuovo), `js/rules.js`

---

## 🎭 PHASE 2 — STRATEGIC IDENTITY

**Obiettivo**: dare ai giocatori archetipi di gioco distinti e vincenti.
Eliminare "tutti puntano sullo stesso stack".

---

### Session 2.1 — OKR Drafted at Quarter Start ✅ Done · 2026-04-27

**Tipo**: meccanica
**Effort**: M (~2h) · **Actual**: ~1.5h
**Dipendenze**: nessuna (può andare in parallelo a 1.x)
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S2.1]`

**Goal**: gli OKR diventano scelte strategiche, non regali random.

**Requirements**:
- A inizio di ogni Q, mostrare modal "Pick your OKRs":
  - Pesca 3 OKR random dal pool
  - Player sceglie 1 (con reward più alto rispetto a oggi)
  - AI sceglie 1 in base alla strategia (algoritmo: prende quello con
    reward/probabilità più alta)
- Aumentare reward OKR (+50% medio): "ship_features" da 4K → 6K, etc.
- Espandere `OKR_POOL` a 14 (da 8) per dare più varietà di scelta:
  - Aggiungere: `cost_efficiency`, `permanent_collector`, `funding_streak`,
    `dept_purist`, `morale_boost`, `velocity_run`
- Modal di scelta in stile editorial (consistente con resto)
- L'OKR scelto rimane visibile nel panel OKR durante il Q

**Acceptance criteria**:
- [ ] Player vede e sceglie attivamente i suoi OKR
- [ ] AI sceglie OKR coerenti con il suo profilo dipartimentale
- [ ] Modal di scelta è visivamente in linea con stile editoriale

**File toccati**: `js/data.js` (espansione pool), `js/game.js` (flusso start Q),
`js/render.js` (modal), `styles/main.css` (modal styling)

---

### Session 2.2 — Synergy Awards & Threshold Bonuses ✅ Done · 2026-04-27

**Tipo**: meccanica
**Effort**: M (~2h) · **Actual**: ~1.5h
**Dipendenze**: 1.1
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S2.2]`

**Goal**: premiare build *focused*, scoraggiare lo "spread" generico.

**Requirements**:
- Trasformare gli award attuali da lineari a soglia non-lineare:
  - `Team Motivato`: Morale ≥7 → +5K, ≥9 → +12K, altrimenti 0
  - `Talent Pool`: ≥5 talento → +5K, ≥7 → +12K
  - `Data-Driven`: ≥6 dati → +5K, ≥10 → +15K
  - Stesso pattern per gli altri
- Aggiungere 4 **Synergy Awards** che richiedono 2+ condizioni:
  - `Lean Operation`: Morale ≥8 ∧ Talento ≤4 → +10K
  - `Engineering Excellence`: 3+ BugFix ∧ Tech Debt ≤1 → +12K
  - `Data Empire`: Data Lake permanente ∧ ≥8 Dati ∧ ≥3 carte data → +15K
  - `Full Funding Round`: 3+ Funding cards diversi → +10K
- Il forecast in-game mostra anche le synergie quasi-attive ("manca 1 BugFix
  per Engineering Excellence")

**Acceptance criteria**:
- [ ] In partite test, 2+ stili di gioco diversi (focused vs spread) producono
      vittorie comparabili
- [ ] Almeno 1 synergy award scatta in 60%+ delle partite
- [ ] Il forecast suggerisce visibilmente le synergie possibili

**File toccati**: `js/rules.js` (computeAwards rework), `js/render.js` (forecast),
`styles/player.css` (forecast highlighting per quasi-active)

---

### Session 2.3 — Strategic Vision Cards (game-start identity) ✅ Done · 2026-04-27

**Tipo**: meccanica grossa
**Effort**: L (~3h) · **Actual**: ~2.5h
**Dipendenze**: 2.2
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S2.3]`

**Goal**: ogni partita inizia con un'identità strategica scelta dal player.

**Requirements**:
- A inizio gioco (dopo profile setup, prima di Q1), modal "Choose your Vision":
  - 3 Vision Cards pescate da pool di 8
  - Ogni Vision dà 1 bonus + 1 malus permanente per la partita
- Pool iniziale di 8 Visions:
  - `Founder Mode` — +50% award Morale & Talento, -50% award Funding
  - `Lean Startup` — Tech Debt non penalizza fino a 3, Hiring costa +1💰
  - `Growth Hacker` — Launch cards +1K MAU bonus, Discovery cards costano +1⏱
  - `Tech First` — tutti i Tool costano −1, Funding costa +1⏱
  - `Bootstrapped` — start con Budget+4 e talento 2, no Funding cards (filtrate)
  - `Data Empire` — Data Lake gratis a inizio, ma -2 Morale di base
  - `B2B Veteran` — Enterprise Deal e Series A scontati, no Mobile App
  - `Viral Native` — Marketing/Launch +50% MAU, Tooling -50% effetto
- Le Visions sono storate nel `state.vision` e modificano le regole
- AI scelgono Vision casuale (o coerente con personalità Phase 5)
- UI: piccolo badge "Your Vision: Founder Mode" nella masthead

**Acceptance criteria**:
- [ ] 3+ Visions diverse producono partite radicalmente diverse
- [ ] Vision visibile in masthead durante tutta la partita
- [ ] Le carte filtrate (es. Bootstrapped no Funding) non appaiono nella piramide

**File toccati**: `js/data.js` (pool visions), `js/state.js` (state.vision), `js/rules.js`
(applicazione modificatori), `js/game.js` (modal pre-Q1), `js/render.js`,
`styles/main.css`

---

## ⚔️ PHASE 3 — PLAYER INTERACTION

**Obiettivo**: rendere gli avversari "vivi" e influenzabili. Aggiungere
combattimento.

---

### Session 3.1 — Sabotage Cards & Tiered Dominance ✅ Done · 2026-04-27

**Tipo**: meccanica
**Effort**: M (~2h) · **Actual**: ~1.5h
**Dipendenze**: 1.x
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S3.1]`

**Goal**: introdurre l'aggressione e premiare anche il 2° posto.

**Requirements**:
- Aggiungere a Catalog Q3 4 carte "Aggressive":
  - `Talent Poach` — ruba 1 Hiring random dalla bacheca del leader (lui −1 talento)
  - `Patent Lawsuit` — chi ha più Feature perde 3K MAU
  - `Negative Press` — il leader perde 2 Morale
  - `Counter-Marketing` — annulla l'effetto della prossima Launch dell'avversario
- **Tiered Department Dominance** in `endOfQuarter`:
  - 1° posto in dept → bonus pieno (come oggi)
  - 2° posto → metà bonus
  - 3° posto → 1K MAU
  - Ties non danno nulla a nessuno (come ora)
- Animazione/toast: quando una sabotage card colpisce, animazione speciale (rosso scuro)

**Acceptance criteria**:
- [ ] Le sabotage cards sono giocabili dal player e pescate dall'AI
- [ ] In partite multi-Q, almeno 1 dominance tier = 2° posto
- [ ] Il feedback visivo del sabotaggio è chiaro

**File toccati**: `js/data.js`, `js/rules.js` (effetti speciali), `js/game.js`
(endOfQuarter), `js/render.js`, `styles/board.css`

---

### Session 3.2 — Block & React Mechanic ✅ Done · 2026-04-27

**Tipo**: meccanica avanzata
**Effort**: L (~3h) · **Actual**: ~2h
**Dipendenze**: 3.1
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S3.2]`

**Goal**: dare al player una mossa di reazione tra il pick di un avversario
e il prossimo turno.

**Requirements**:
- Dopo che un AI pesca e prima del rendere, finestra di 2-3 secondi:
  - Player può cliccare un bottone "Block" (costa 2💰 e 1⏱)
  - Block = la prossima carta dietro nella stessa colonna NON si gira
    (resta face-down per 1 turno extra)
- Limite: max 1 block per Q
- AI può fare block contro il player (logica: lo fa se il player sta per
  rivelare una carta high-value che gli serve)
- UI: pulsante temporaneo che appare con timer countdown circle
- Sound/feedback quando il block riesce

**Acceptance criteria**:
- [ ] Il timing è chiaro (timer visibile, non opprimente)
- [ ] Block costa abbastanza da non essere abusato (max 2 volte/partita)
- [ ] AI usa block in modo intelligente

**File toccati**: `js/game.js` (timing windows), `js/render.js` (overlay),
`js/ai.js` (block logic), `styles/board.css`

---

## ⏱️ PHASE 4 — PACING & CLIMAX

**Obiettivo**: spezzare la monotonia di Q2 e creare un climax in Q3.

---

### Session 4.1 — Inter-Quarter Market Events ✅ Done · 2026-04-27

**Tipo**: meccanica
**Effort**: M (~2h) · **Actual**: ~1.5h
**Dipendenze**: 1.x
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S4.1]`

**Goal**: tra Q1→Q2 e Q2→Q3, un evento di mercato cambia le regole del Q
successivo.

**Requirements**:
- Pool di 10 eventi:
  - `Recessione` — tutti −2 Budget, Funding cards +1K MAU questo Q
  - `Mobile Boom` — Feature mobile +1K MAU, Tooling +1⏱ costo
  - `Critical CVE` — chi ha 0 Monitoring perde 3K MAU subito
  - `Talent War` — Hiring costano +1💰
  - `AI Hype` — carte Data +1K MAU
  - `VC Drought` — Funding cards −1K MAU effetto
  - `Open Source Wave` — Tool cards costano −1
  - `Burnout Wave` — chi ha Morale ≤4 perde 1K MAU
  - `Pivot Required` — discard 2 carte (random), +5💰
  - `Black Swan` — random tra altri 3, sorpresa totale
- Modal "Market News" tra i Q con animazione tipo "BREAKING NEWS"
- Effetti visibili in masthead per tutto il Q ("⚡ Mobile Boom active")

**Acceptance criteria**:
- [ ] L'evento cambia il valore relativo delle carte (es. con AI Hype, Data Lake è game-changer)
- [ ] Modal di evento è visivamente distinto e memorable
- [ ] AI adatta la strategia in base all'evento attivo

**File toccati**: `js/data.js` (event pool), `js/state.js` (state.activeEvent),
`js/rules.js`, `js/game.js`, `js/render.js`, `styles/main.css`

---

### Session 4.2 — Final Investor Pitch ✅ Done · 2026-04-27

**Tipo**: feature climax
**Effort**: M (~2h) · **Actual**: ~1h
**Dipendenze**: 4.1
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S4.2]`

**Goal**: dopo l'ultimo pick di Q3, prima del modal finale, un mini-momento
narrativo.

**Requirements**:
- Sequenza:
  1. Tutti hanno pescato l'ultima carta
  2. Modal "Investor Pitch": ogni player (in ordine di MAU corrente) presenta
     la sua "best card" della bacheca
  3. Sull'ultima carta presentata, il player tira una carta-bonus dal "VC Reaction Pool"
     - 5 carte: `Star Investor` (+5K), `Skeptical Board` (-2K), `Standing Ovation` (+10K),
       `Polite Applause` (+1K), `Walk Out` (+0K)
  4. Animazione cinematografica con stili da gala
- Solo dopo questo, mostra il classifica finale

**Acceptance criteria**:
- [ ] La sequenza è skipable se il player vuole (button "skip pitch")
- [ ] Il bonus VC può ribaltare l'esito in caso di stretta partita
- [ ] L'animazione è curata (non un semplice modal)

**File toccati**: `js/data.js` (VC pool), `js/game.js` (endGame flow),
`js/render.js`, `styles/main.css` (gala styling)

---

## 🤖 PHASE 5 — AI QUALITY

**Obiettivo**: gli AI diventano avversari interessanti, ognuno con personalità
distinta.

---

### Session 5.1 — AI Personas ✅ Done · 2026-04-27

**Tipo**: AI logic
**Effort**: M (~2h) · **Actual**: ~1.5h
**Dipendenze**: 2.3 (Visions)
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S5.1]`

**Goal**: i 3 AI hanno strategie distinte e prevedibili (in modo positivo).

**Requirements**:
- Definire 3 personas in `js/ai.js`:
  - **Marco "The Scaler"** (eng VP) — preferisce Tooling+chains, evita rischio,
    target award: Tech Stack + Engineering Excellence
  - **Alessia "The Hustler"** (CMO) — Funding aggressivi, accetta debt,
    target award: Funding Diversity + Data Empire
  - **Karim "The Auditor"** (CDO) — Slow burn, BugFix+Clean Code,
    target award: Clean Code + Data-Driven
- Ogni persona ha:
  - `weights`: { vp: 1.5, dati: 0.8, ... } per scoring
  - `targetAwards`: array di award priority
  - `riskTolerance`: 0..1 (Karim 0.2, Alessia 0.9)
  - `rejectTypes`: array di card type che evita (es. Karim evita Crunch cards)
- AI scegli persona automaticamente in base a `playerIdx` (1=Marco, 2=Alessia, 3=Karim)
- Bonus: AI sceglie Vision coerente con persona

**Acceptance criteria**:
- [ ] In partite di test, ogni AI ha bacheca visibilmente diversa
- [ ] Marco vince spesso award Tech Stack, Alessia vince Funding, etc.
- [ ] Le scelte sono "leggibili" (player capisce cosa l'AI sta facendo)

**File toccati**: `js/ai.js` (rewrite), `js/data.js` (persona configs)

---

### Session 5.2 — Lookahead & Difficulty Selector ✅ Done · 2026-04-27

**Tipo**: AI advanced
**Effort**: M (~2h) · **Actual**: ~1h
**Dipendenze**: 5.1
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S5.2]`

**Goal**: rendere l'AI più "smart" e dare al player la scelta della difficoltà.

**Requirements**:
- **Lookahead 1-step**: prima di pescare, l'AI valuta cosa verrà rivelato
  per ogni colonna possibile, e simula il valore della prossima carta + il
  rischio di "gift" all'avversario
- **Difficulty selector** (modal pre-game o nei settings):
  - Junior — AI senza lookahead, weights base
  - Senior — lookahead 1-step
  - Director — lookahead 1-step + AI usa block (3.2) + AI gioca Vision strategiche
- Persistere la scelta nel profile (`profile.prefs.difficulty`)
- Impact previsto: Junior winrate ~60% per player avg, Director ~30%

**Acceptance criteria**:
- [ ] I 3 livelli producono win rate tangibilmente diversi
- [ ] Selettore difficoltà visibile e intuitivo
- [ ] Persistenza funziona (next game ricorda la difficoltà)

**File toccati**: `js/ai.js`, `js/user.js` (prefs), `js/render.js` (selettore),
`js/game.js`

---

## 🔁 PHASE 6 — REPLAYABILITY

**Obiettivo**: dopo 5 partite il player vuole ancora rigiocare. Sblocchi e
varianti.

---

### Session 6.1 — Scenario System ✅ Done · 2026-04-27

**Tipo**: feature architecture
**Effort**: L (~3h) · **Actual**: ~2h
**Dipendenze**: 1-3
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S6.1]`

**Goal**: i player possono scegliere scenari speciali invece della partita standard.

**Requirements**:
- Architettura `js/scenarios.js`:
  - `Scenario` = { id, name, description, modifiers: {...}, locked: bool }
  - I modifiers possono toccare: catalogs, costs, awards, events, victory conditions
- 4 scenari iniziali:
  - `Standard` — il gioco base (default)
  - `Bear Market 2008` — tutti i Funding −2💰, awards Funding ×2
  - `AI Hype Wave` — Data cards ×1.5 effetto, Tool cards −1 costo
  - `Remote First` — no costo Tempo (gratis), max Talento 3, −1 Morale a Q
- Modal "Choose Scenario" dopo pre-game (o "Quick Play" per default)
- Scenari sbloccabili dopo prima vittoria con "Standard"

**Acceptance criteria**:
- [ ] I 4 scenari producono partite con feel diverso
- [ ] Il sistema è estendibile (aggiungere uno scenario = aggiungere oggetto)
- [ ] Lock/unlock funziona via profile.stats

**File toccati**: `js/scenarios.js` (nuovo), `js/data.js` (modifier hooks),
`js/rules.js`, `js/game.js`, `js/render.js`

---

### Session 6.2 — Achievement System ✅ Done · 2026-04-27

**Tipo**: feature engagement
**Effort**: M (~2h) · **Actual**: ~1h
**Dipendenze**: 6.1, 1-2 phases
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S6.2]`

**Goal**: collectibles persistenti che danno senso di progressione.

**Requirements**:
- 12 achievements iniziali in `js/achievements.js`:
  - `First Win` — vinci una partita
  - `Clean Slate` — finisci con 0 Tech Debt
  - `IPO` — vinci con ≥80K MAU
  - `Underdog` — vinci a Director difficulty
  - `Bug Hunter` — gioca 6+ BugFix in una partita
  - `Founder Mode` — vinci con Founder Vision
  - `Hustler Streak` — vinci 3 partite di seguito
  - `Marathon` — gioca 10 partite
  - `Centenarian` — accumula 1000K MAU totali (career)
  - `Speedrun` — vinci con ≤30 carte giocate totali
  - `Combo Master` — trigga 5+ catene in una partita
  - `Dominator` — vinci tutte e 3 le dominanze in un Q
- A fine partita: modal "Achievements unlocked" se ce n'è di nuovi
- Pannello achievements nel modal Profile Settings
- Salvati in `profile.achievements: { id: timestamp }`

**Acceptance criteria**:
- [ ] Achievements visibili nel profilo
- [ ] Unlock animato (modal celebrativo)
- [ ] Persistenti tra sessioni

**File toccati**: `js/achievements.js` (nuovo), `js/user.js` (storage),
`js/game.js` (check post-game), `js/render.js`, `styles/main.css`

---

### Session 6.3 — Daily Seed Mode ✅ Done · 2026-04-27

**Tipo**: feature
**Effort**: M (~2h) · **Actual**: ~1h
**Dipendenze**: 6.1
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S6.3]`

**Goal**: una partita al giorno con la stessa configurazione per tutti.
Crea attaccamento giornaliero.

**Requirements**:
- Generatore RNG seedable in `js/util.js` (sostituire Math.random in startQuarter)
- Il seed del giorno = hash di YYYY-MM-DD
- Nuovo button "Daily Run" in splash
- La daily usa: stesso shuffle catalog, stesso evento di mercato, stesso pick
  order start (ma player è sempre primo)
- A fine daily, salva il risultato in `profile.dailyHistory[date]`
- "Streak" counter (giorni consecutivi giocati)

**Acceptance criteria**:
- [ ] Due browser/profili diversi che giocano la daily lo stesso giorno
      ottengono la stessa piramide iniziale
- [ ] Il player può giocare la daily 1 volta sola al giorno
- [ ] Streak persiste correttamente

**File toccati**: `js/util.js` (RNG), `js/game.js`, `js/user.js`,
`js/render.js` (splash button)

---

## ✨ PHASE 7 — FEEL & POLISH

**Obiettivo**: trasformare azioni meccaniche in momenti di gioia.

---

### Session 7.1 — Combo Animations & Threshold Celebrations ✅ Done · 2026-04-27

**Tipo**: polish
**Effort**: M (~2h) · **Actual**: ~1h
**Dipendenze**: 1, 2
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S7.1]`

**Goal**: ogni "buon momento" è celebrato visivamente.

**Requirements**:
- Quando trigga una catena: lampo dorato sulla carta + tinkle d'animazione
  ("✨ Chain triggered!")
- Quando un award supera una soglia: toast trionfale animato con il numero che pop
  ("🚀 Team Motivato unlocked +12K!")
- Quando un'OKR si completa: tick animato sulla card OKR
- Quando peschi una carta target di una synergy: mini-firework
- Tutti gli effetti sono CSS-only (no librerie esterne)

**Acceptance criteria**:
- [ ] I momenti chiave hanno feedback distintivo
- [ ] Le animazioni non rallentano il flow di gioco
- [ ] Possono essere disabilitate via `profile.prefs.reducedMotion`

**File toccati**: `styles/main.css`, `styles/board.css`, `js/render.js`,
`js/game.js`

---

### Session 7.2 — Tech Debt Visuals & Audio Cues ✅ Done · 2026-04-27

**Tipo**: polish
**Effort**: M (~2h) · **Actual**: ~1h
**Dipendenze**: 1.1, 7.1
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S7.2]`

**Goal**: rendere il Tech Debt visibilmente "doloroso" e aggiungere cue audio
opzionali.

**Requirements**:
- Quando Tech Debt ≥ 3: overlay SVG "crepe" sulla carta della bacheca
- Animazione ondulatoria della crepa quando Tech Debt aumenta
- Sound system minimale (Web Audio API):
  - `pick` — soft click
  - `chain-trigger` — bell ding
  - `bug-add` — glitch sound
  - `award-unlock` — chime
- Toggle audio in profile settings
- Opzione `reducedMotion` rispettata
- Crepe rimovibili tramite refactoring

**Acceptance criteria**:
- [ ] Tech Debt è viscerale: il player VEDE che la sua bacheca è "rotta"
- [ ] Audio è on/off opzionale e default OFF
- [ ] Performance non degrada

**File toccati**: `styles/player.css`, `js/audio.js` (nuovo), `js/render.js`,
`js/user.js` (prefs)

---

## 🔧 PHASE 8 — CODE QUALITY

**Obiettivo**: dopo le feature, il codice è cresciuto. Refactor per
sostenibilità futura.

---

### Session 8.1 — Refactor render.js & Extract Sub-Modules ✅ Done · 2026-04-27

**Tipo**: tech debt (meta!)
**Effort**: M (~2h) · **Actual**: ~1.5h
**Dipendenze**: tutte le altre fasi (questo è meta-tech debt)
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S8.1]`

**Goal**: render.js era a 1281 righe, troppe. Splittare per coerenza.

**Requirements**:
- ✅ Estratto da `render.js`:
  - `js/render-pyramid.js` (144) — renderPyramid, renderPyramidCard
  - `js/render-tableau.js` (74) — renderTableau (bacheca)
  - `js/render-sidebar.js` (207) — assets, OKR, awards forecast, log
  - `js/render-masthead.js` (206) — masthead, progress strip, byline, profile chip, turn indicator
  - `js/render-modals.js` (329) — modali di flusso (vision/OKR/scenario/event/pitch/VC/block/help)
  - `js/render-profile.js` (282) — modali profilo (setup/settings/achievements)
    *Splittato extra dal piano originale per restare <500 LOC.*
- ✅ `js/render.js` (118) resta orchestrator: `render()`, `renderSplash`, `escapeHtml`
- ✅ `index.html` aggiornato con 7 script tag (6 sub-moduli + render.js orchestrator)

**Acceptance criteria**:
- [x] Nessun file > 500 righe (max: render-modals.js 329 LOC)
- [x] Funzionalità invariata (regression test manuale: tutte le 29 funzioni
      migrate, syntax-check `node -c` OK su tutti i 7 file)
- [x] Nuova struttura file documentata (CHANGELOG entry S8.1 + CONTEXT.md
      file map; README sarà generato in S8.2)

**File toccati**: 6 nuovi `js/render-*.js`, `index.html`, `js/render.js` (ridotto)

---

### Session 8.2 — Light Test Harness & Documentation ✅ Done · 2026-04-28

**Tipo**: tech infrastructure
**Effort**: M (~2h) · **Actual**: ~1.5h
**Dipendenze**: 8.1
**Changelog**: vedi [`CHANGELOG.md`](CHANGELOG.md) entry `[S8.2]`

**Goal**: avere uno smoke-test e documentazione di base per future iterazioni.

**Requirements**:
- ✅ `tests/test.html` — pagina con bottone "Run Tests" (auto-run on load)
- ✅ ~15 test asserzioni per funzioni pure di `rules.js` — superato: **30 test
  in 9 gruppi · 59 assertions · 30/30 pass**:
  - `canAfford` con/senza chain ✓ — 3 test
  - `adjustedCost` con CI/CD + chain + Vision + Scenario + clamp 0 ✓ — 5 test
  - `applyEffect` (clamps, data_lake bonus, permanents, opponentsTempo) ✓ — 5 test
  - `computeAwards` per ogni soglia + scenario multipliers ✓ — 3 test
  - bonus: `isChainTriggered`, `effectiveCardEffect`, `computeSynergies`,
    `pointsForTier`, `isPickable/getDepth/getPickableSlots`
- ✅ `tests/runner.js` minimale (no librerie) — 130 LOC, mocha-style API
- ✅ `README.md` con:
  - Architettura attuale (albero ASCII commentato + load order diagram)
  - Come aggiungere una carta (esempio + note su pool size)
  - Come aggiungere uno scenario (con tabella dei 14 modifier keys)
  - Come aggiungere un'AI persona (esempio + spiegazione weights/targetAwards)
  - Bonus: come aggiungere event/achievement, tuning, editorial style

**Acceptance criteria**:
- [x] Test runner mostra 15+ verde — **30/30 pass** (verificato headless)
- [x] README permette a nuovo dev di estendere senza guidance — 4 sotto-sezioni
      "Come aggiungere..." copy-pasteable + reference table modifier keys

**File toccati**: `tests/test.html` (nuovo), `tests/runner.js` (nuovo),
`tests/test-rules.js` (nuovo), `README.md` (nuovo)

---

## 📚 BACKLOG (idee fuori piano)

Nice-to-have da riconsiderare dopo phase 8:

- **Multiplayer asincrono** (richiede backend)
- **Mobile responsive** (richiede ridisegno layout)
- **Card editor** (creazione di custom cards)
- **Tutorial guidato** (overlay step-by-step alla prima partita)
- **Statistiche aggregate globali** (richiede backend)
- **Soundtrack ambient** (musica di sottofondo)
- **Dark mode** (palette alternativa)
- **Export bacheca come immagine condivisibile** (canvas snapshot)
- **Modalità "rapida" 12 carte/Q** invece di 24

---

## 🗺️ Dependency Graph (visuale)

```
1.1 ─┬─→ 1.2 ──→ 1.3
     │
     ├─→ 2.2 ──→ 2.3 ──→ 5.1 ──→ 5.2
     │            │
     │            └────→ 6.1 ──┬─→ 6.2
     │                         └─→ 6.3
     │
     ├─→ 3.1 ──→ 3.2
     │
     ├─→ 4.1 ──→ 4.2
     │
     ├─→ 7.1 ──→ 7.2
     │
     └─→ 8.1 ──→ 8.2

2.1 (parallelo a tutte le 1.x)
```

---

## ✅ Definition of Done (per sessione)

Una sessione è "done" quando:

1. ✅ Tutti i requirements implementati
2. ✅ Tutti gli acceptance criteria verificati (manualmente)
3. ✅ Nessuna regressione visibile in una partita di test completa
4. ✅ Eventuali magic number sono in `balance.js`
5. ✅ Questo `ROADMAP.md` aggiornato con stato (✅ Done, data, note)

---

## 🎮 Quando iniziare?

Dimmi pure quale session vuoi affrontare per prima. Suggerito:
**S1.1 (Crunch Cards & Tech Debt)** perché ha il più alto ROI e
nessuna dipendenza.
