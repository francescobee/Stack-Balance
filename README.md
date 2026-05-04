# Stack & Balance — Quarterly Rivals

[![Tests](https://github.com/francescobee/Stack-Balance/actions/workflows/test.yml/badge.svg)](https://github.com/francescobee/Stack-Balance/actions/workflows/test.yml)

Un boardgame in stile *7 Wonders* ambientato in una scale-up tech. Quattro
manager (1 umano + 3 AI) draftano carte da una piramide condivisa stile
Mahjong (4×6) per costruire la migliore app. Vince chi accumula più
**utenti (K MAU)** alla fine del Q3 — o, in scenari speciali, chi sopravvive
al mercato / chi raggiunge prima 40K MAU / chi è più efficiente.

> **Editorial design** · parchment + Fraunces italic + Newsreader serif.
> **Vanilla JS** · zero build step, zero librerie. Apri `index.html` e gioca.
> **Mobile-first PWA** · installabile da iOS/Android, single-player offline-capable.

🎮 **Live demo**: https://francescobee.github.io/Stack-Balance/
🧪 **Test harness**: https://francescobee.github.io/Stack-Balance/tests/test.html

---

## 🎮 Come giocare

1. Apri **`index.html`** in un browser moderno (o usa il [live demo](https://francescobee.github.io/Stack-Balance/)).
2. Crea un profilo (nome) — viene salvato in localStorage.
3. Scegli **modalità** dalla splash:
   - **Avvia nuova partita** → scegli scenario standard o sbloccato
   - **🌅 Daily Run** → seed condiviso quotidiano (worldwide stesso pool)
   - **⚡ Weekly Challenge** → 1 partita/settimana con mutator esplicito + bonus XP
   - **🌐 Multiplayer** → P2P online o Hot Seat locale
4. Pesca la tua **Vision Card** (1 di 3 random da pool di 16 — 8 base + 8 v2
   sbloccabili dopo 3 vittorie con la base).
5. **Synergy Showcase** (S15): vedi le 5 sinergie pescate per questa partita
   (su 24 totali). Ognuna è un obiettivo multi-condizione che vale 8-15K
   MAU se completato.
6. Per ogni quarter (Q1 Discovery → Q2 Build → Q3 Launch):
   - Pesca il tuo **OKR** (1 di 3 random).
   - Pesca 6 carte dalla piramide via **snake draft** (Tu→Marco→Alessia→Karim,
     poi reverse).
   - Tra Q1→Q2 e Q2→Q3 un **Market Event** cambia le regole.
7. A fine Q3 (o early-end nei scenari **Acquisition**): **Investor Pitch**
   + **VC Reaction** + classifica con **7 Awards** + **5 Synergies attive** +
   conversione budget − tech debt.
8. Post-game: il tuo **Founder Level** sale (XP per partita giocata + vinta +
   K MAU + bonus daily/weekly). Cap a Lv 20.

> 💡 Premi `?` nel masthead in alto a destra durante il gioco per il riassunto
> rapido delle regole. La masthead mostra anche badge per **Vision attiva**,
> **Market Event corrente**, **Scenario**, **Win Condition** (se non MAU
> standard) e **Weekly Challenge** (se attiva).

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
│   ├── main.css              # vars, layout, masthead, modali, toast, mobile @media
│   ├── board.css             # piramide + opponents byline + mobile thumbs
│   └── player.css            # bacheca + assets + OKR + awards forecast
│
├── js/                       # game logic — tutti vanilla JS classic scripts
│   ├── data.js               # CATALOG_Q1/2/3 (83 carte) + OKR_POOL + EVENT_POOL + VC_POOL
│   ├── visions.js            # 16 Vision Cards (8 base + 8 v2 sbloccabili) (S18.2)
│   ├── scenarios.js          # 4 Scenarios — ognuno locka una win condition (S17)
│   ├── synergies.js          # 24 sinergie, pesca 5/partita con flavour scenario (S15)
│   ├── archetypes.js         # 5 AI archetypes layered su personas (S16)
│   ├── win-conditions.js     # 4 regole vittoria (mau/survival/acquisition/efficiency) (S17)
│   ├── weekly-challenges.js  # 6 weekly mutators rotated by ISO week (S18.3)
│   ├── util.js               # el(), shuffle, rng (seedable), showToast, viewport helpers
│   ├── user.js               # profile + prefs + XP/Founder Level + visionStats + weeklyHistory
│   ├── audio.js              # Web Audio API — 7 sintetizzati (incl. sndPassConfirm S13.3)
│   ├── achievements.js       # achievements + check helpers (incl. Founder Lv + Weekly chains)
│   ├── balance.js            # ⭐ TUTTE le costanti tunable (Object.freeze)
│   ├── state.js              # newPlayer, NUM_PLAYERS, PYR_ROWS, log
│   ├── rules.js              # adjustedCost, applyEffect, computeAwards, computeSynergies (4-pass)
│   ├── ai.js                 # AI_PERSONAS + archetype overlay + decideAIPickFromPyramid
│   ├── game.js               # startGame (single/daily/weekly), processNextPick, endOfQuarter
│   ├── multiplayer.js        # P2P multiplayer via PeerJS (Phase 10)
│   ├── hotseat.js            # Hot Seat / pass-and-play locale (Phase 11)
│   │
│   ├── render.js             # ⭐ orchestrator: render(), renderSplash, escapeHtml
│   ├── render-pyramid.js     # board: renderPyramidCard, renderPyramid       (S8.1)
│   ├── render-tableau.js     # bacheca: renderTableau                        (S8.1)
│   ├── render-sidebar.js     # assets/OKR/awards/synergies/log panels        (S8.1)
│   ├── render-masthead.js    # header + progress + byline + mobile turn-bar/resources strip
│   ├── render-modals.js      # game-flow modali (incl. SynergyShowcase, WeeklyIntro)
│   ├── render-profile.js     # profile + Founder Level + Vision Mastery + achievements
│   ├── render-multiplayer.js # MP entry/lobby/join modali (Phase 10)
│   ├── render-hotseat.js     # Hot Seat lobby + pass-screen modal (Phase 11)
│   ├── render-card-detail.js # tap-to-detail fullscreen overlay (mobile, S12.3)
│   │
│   └── main.js               # boot — chiama showProfileSetup o renderSplash
│
├── manifest.json             # PWA manifest (Phase 12.6)
├── sw.js                     # service worker · cache-first · CACHE_VERSION bumped per deploy
├── icons/icon.svg            # placeholder app icon (sostituibile)
│
└── tests/
    ├── test.html             # apri in browser per eseguire i test
    ├── runner.js             # describe/it/assert/assertEq/assertDeepEq
    ├── run-headless.js       # Node CLI runner (CI compatibile)
    └── test-rules.js         # 58 test su rules/synergies/archetypes/win-conditions/...
```

### Script load order (in `index.html`)

```
data → visions → scenarios → util → user → audio → achievements
  → balance → synergies → archetypes → win-conditions → weekly-challenges
  → state → rules → ai → game
  → multiplayer → hotseat
  → render-pyramid → render-tableau → render-sidebar
  → render-masthead → render-modals → render-profile
  → render-multiplayer → render-hotseat → render-card-detail → render
  → main
```

L'ordine *conta* per `balance.js` (deve precedere chi lo usa: state/rules/ai/game),
`synergies.js` / `archetypes.js` / `win-conditions.js` / `weekly-challenges.js` (devono
precedere `game.js` che li chiama in startGame), e `util.js` (deve precedere ogni
`render-*.js` per `el()`/`showToast`). Tra i sub-moduli `render-*` l'ordine è libero.

---

## 🎯 Profondità di gameplay (Phase 15-17)

Tre sistemi orthogonali aggiunti dopo il core gameplay per aumentare la
**variety run-to-run** e dare profondità strategica senza nuove meccaniche
di gioco.

### Synergy pool (S15) — sinergie pescate per partita

Le 4 sinergie hardcoded del core (Lean Op / Eng Excellence / Data Empire /
Full Funding) sono diventate un **pool di 24 sinergie**, da cui se ne
pescano 5 random a inizio partita. Pesca **flavorata dallo scenario**:
Bear Market boosta tag `lean`/`frugal`, AI Hype boosta `data`/`ai`,
Remote First boosta `morale`/`async`, etc.

- Tier mix: 4 hard (8-15K MAU, multi-condizione stretta) + 12 medium
  (5-9K, condizioni accessibili) + 8 easy (3-6K, soglie semplici)
- **Showcase modal** all'inizio della partita (post-Vision draft, pre-OKR)
  mostra le 5 pescate con icone + criteri + reward
- A fine partita: ogni sinergia attiva contribuisce ai punti come gli
  Awards
- Il modifier engine ha un **4° pass** dedicato che valuta le sinergie
  active al game-end

### AI archetypes (S16) — 15 stili di gioco AI

Ogni AI persona (Marco/Alessia/Karim) mantiene la sua dept-bias e i
weights base, ma ora ottiene un **archetype layered on top** pescato a
inizio partita:

| Archetype | Stile |
|-----------|------|
| **⚔️ Aggressor** | Punta MAU subito, Sabotage senza esitare, blocca spesso |
| **💰 Hoarder** | Accumula budget/dati, raramente spende |
| **🔥 Disruptor** | Crunch tollerante, debt high, vp aggressivo |
| **🤖 Hype Master** | Insegue trend del Market Event corrente |
| **🌱 Bootstrapper** | Lean, morale-focused, cheap hires |

3 personas × 5 archetypes = **15 stili distinti**. L'archetype modifica:
`weightMultipliers` per resource score, `cardTypeBias` (es. Aggressor +3
su Sabotage), `blockModifier` per la probabilità di blocco, e
`riskMultiplier` per la tolleranza al Tech Debt (Crunch cards).

L'archetype del rivale è visibile nella **byline-strip** sotto al ruolo
(tag tratteggiato accanto al nome), così il giocatore può adattare la
strategia di counter-pick.

### Win conditions (S17) — vittoria scenario-locked

I 4 scenari ora **lockano una regola di vittoria diversa** (no chooser
mid-game, è strutturale):

| Scenario | Win Condition | Come si vince |
|----------|---------------|---|
| **Standard** | 🏆 MAU Race | Più K MAU a fine Q3 (originale) |
| **Bear Market** | 🩺 Survival | Tutti gli altri sotto morale=0; tu sopravvivi |
| **AI Hype** | 🚀 Acquisition | Primo a 40K MAU **early-end** (può finire in Q2!) |
| **Remote First** | ⚡ Efficiency | Miglior ratio MAU / risorse spese |

Masthead in-game mostra un **win-condition badge** con icona + label +
hint contestuale (es. Acquisition mostra "32/40K MAU"), così il
giocatore non dimentica il criterio attivo. La modale di end-game
adatta il titolo (es. "Sei sopravvissuto al mercato" invece di "Promosso
a CTO").

---

## ⭐ Profilo · Founder Level · Vision Mastery (Phase 18.1-18.2)

Il profilo persistente in localStorage ora traccia **progressione
long-term** oltre alle statistiche per partita.

### Founder Level (S18.1)

Sistema XP / livelli a **20 livelli totali** (cap):

| Evento | XP |
|--------|---:|
| Partita giocata | +100 |
| Partita vinta | +300 |
| Per K MAU finale | +10 ciascuno |
| Bonus Daily Run | +50 |
| Bonus Weekly Challenge (vinta) | +80-150 (per challenge) |

**Curva progressiva**: L1→L2 = 1000 XP, L2→L3 = 4000 XP, ..., L20 = 88000
XP cumulativi. Toast "Level up!" al raggiungimento di una soglia.

UI: chip **⭐ Founder Lv. N** + barra di progresso ("1200 / 3000 XP al
Lv 5") nel pannello Profilo. Achievements specifici per milestone Lv 5
/ Lv 10 / Lv 20.

### Vision Mastery (S18.2)

Le 8 Vision originali (Founder Mode, Lean Startup, Tech First, Data
Empire, Bootstrapped, B2B Veteran, Risk Taker, Open Source) hanno
ognuna una **variante v2 sbloccabile** dopo **3 vittorie con la base**.
Pool finale: **16 Vision** (8 base sempre + 8 v2 unlock-by-mastery).

Le v2 amplificano le caratteristiche della base (es. Founder Mode v2
porta morale ×1.3 e talento ×1.3 più aggressivo della base, in cambio
di +1 budget cost per Hiring). Sono pesate nel draft come carte
"prestigiose" — appaiono nelle 3 opzioni con probability moderata se
unlocked.

UI: pannello **Vision Mastery** nel profilo con grid 16 Vision; le v2
mostrano lock icon + "X/3 wins to unlock". Draft modal flagga le v2 con
badge `(v2)` e tooltip della differenza vs base.

---

## ⚡ Weekly Challenge (Phase 18.3)

Modalità **una-shot a settimana** con mutator esplicito. Pulsante
splash visibile se la challenge della settimana corrente non è ancora
stata giocata.

| Challenge | Mutator |
|-----------|---------|
| 🛡️ **Debt-Free Zone** | Tech Debt non penalizza |
| 💸 **Frugal Founder** | Budget iniziale −3, Funding scontate |
| 🤝 **No Sabotage** | Sabotage cards rimosse dal pool |
| 🏜 **Data Drought** | Discovery yield dati −50% |
| ⏱ **Crunch Time** | Feature cards +1⏱ |
| 💼 **Talent War** | Hiring +1💰 |

Rotation: la challenge attiva è derivata dall'**ISO week key**
(`hashOfYearWeek`) — tutti i giocatori del mondo vedono la stessa
challenge nella stessa settimana, con seed deterministico (stessa
piramide / pool).

Reward: **bonus XP** per vittoria (80-150 specifico per challenge,
oltre il +300 win standard). Storico in `profile.weeklyHistory[weekKey]`.

UI: pulsante splash `⚡ Weekly Challenge` (✓ se già giocata),
intro modal con icona + descrizione + nota strategica + "Inizia →".
Masthead in-game mostra il **weekly-badge** con il nome della
challenge attiva.

---

## 🌐 Multiplayer P2P

Il gioco supporta multiplayer **fino a 4 player** via **WebRTC peer-to-peer**.
Niente server da gestire: il signaling è gratis tramite [PeerJS Cloud](https://peerjs.com/),
i dati di gioco fluiscono direttamente tra browser. Funziona out-of-the-box
su GitHub Pages.

### Come giocare in multiplayer

1. **Host**: dalla splash, click **🌐 Multiplayer** → **Crea partita**
2. Condividi il **room code** (4 caratteri, es. `ABCD`) o il **link copiato**
   con i tuoi amici (il link apre direttamente il join modal con codice prefilled)
3. **Client**: dalla splash → **🌐 Multiplayer** → **Unisciti** + codice + nome
4. L'host vede i player che si connettono. **Posti vuoti = AI** (non serve
   essere in 4 — il game balance resta intatto perché AI riempiono)
5. L'host può scegliere la **difficoltà AI** (Junior / Senior / Director)
   dal selector in lobby
6. L'host clicca **Avvia partita →** quando pronto

### Cosa funziona end-to-end (post-MVP)

- ✅ **Vision draft parallelo** — ogni human umano picca la propria Vision
  simultaneamente; AI auto-pickano
- ✅ **OKR draft per Q** — stesso pattern, parallelo per tutti gli umani
- ✅ **Snake draft** — turni rispettati: solo l'`activePicker` può pescare
- ✅ **AI auto-play** — l'host runa la logica AI, broadcasta lo state ai client
- ✅ **Market News modal** — entrambi vedono lo stesso evento tra Q1↔Q2↔Q3
- ✅ **Quarter-end milestone** — entrambi vedono dominanze + OKR + budget burn-down
- ✅ **Investor Pitch + VC reaction** — pitch mirrorato sul guest con
  auto-reveal del VC panel dopo 1.5s (cinematic effect)
- ✅ **Classifica finale** — ogni player vede i propri award e il proprio
  rank, con messaggio "🎉 Promosso a CTO" se ha vinto
- ✅ **Profile + achievements per-player** — ogni client traccia il proprio
  storico nel localStorage indipendentemente
- ✅ **Disconnect graceful** — se il guest si disconnette mid-game, lo slot
  diventa AI; se l'host si disconnette, i client vedono "Host disconnesso"
  e tornano allo splash
- ✅ **Shareable URL** — `https://.../#room=ABCD` apre direttamente il
  join modal

### Limitazioni MVP (by design)

- 🚫 **Block & React disabilitato** in multiplayer (single-player lo conserva).
  La sync di un timer 4s tra host e target client introdurrebbe edge case
  troppo complessi per un MVP.
- 🚫 **No host migration** — se l'host si disconnette, la partita finisce
- 🚫 **No reconnect** — disconnessi non possono rejoinare partite in corso
- 🚫 **No spectator mode** (esplicitamente fuori scope)
- 🚫 **No voice chat** (esplicitamente fuori scope)
- 🚫 **No persistence** — chiudendo il browser, la partita è persa
- 🚫 **No friend list / login** — share via room code/URL
- ⚠️ **NAT traversal severo** — qualche network corporate/mobile potrebbe
  impedire la connessione P2P (PeerJS Cloud usa STUN ma TURN gratuito è
  limitato)

### Architettura — authoritative host

```
                    ┌──────────┐
                    │  HOST    │  ← uno dei player umani è authoritative
                    │ player N │     - mantiene IL state
                    └────┬─────┘     - applica rules.js / game.js / ai.js
                         │            - runa l'AI per i posti vuoti
            ┌────────────┼────────────┐
            ▼            ▼            ▼
        ┌───────┐    ┌───────┐    ┌───────┐
        │client │    │client │    │client │   ← ricevono state via broadcast,
        │ (peer)│    │ (peer)│    │ (peer)│      inviano i loro pick all'host
        └───────┘    └───────┘    └───────┘
```

L'host runa tutta la logica di gioco. I client sono "smart UIs": rendono
lo state che ricevono e mandano action requests. Il host valida ogni
pick (anti-cheat naturale) e broadcasta il nuovo state autoritativo.

Vedi [`MULTIPLAYER-ROADMAP.md`](MULTIPLAYER-ROADMAP.md) per dettagli
architetturali completi e [`CHANGELOG.md`](CHANGELOG.md) entry `[S10.1-S10.6]`
per la cronologia delle fix di sincronizzazione.

### Setup deterministico (per dev)

```js
// In console:
localStorage.setItem("dev.forceVision", "tech_first");
// Bypassa il modal Vision draft — utile per S9.8 playtest
```

---

## 🪑 Hot Seat Mode (pass-and-play locale)

Per chi vuole giocare con amici fisicamente nello stesso luogo, il gioco
supporta una modalità **Hot Seat**: 2-4 giocatori condividono **un unico
PC**, si passano il mouse a turno tra una mossa e l'altra. Niente network,
niente setup: party game classico.

### Come iniziare

1. Dalla splash, click **🌐 Multiplayer** → card **🪑 Pass-and-play** nella sezione "Locale"
2. Setup tavolo:
   - 4 slot configurabili: ognuno **👤 Umano** o **🤖 AI**
   - Per umani: input nome (slot 1 default = nome del profilo)
   - Per AI: dropdown persona (Marco / Alessia / Karim — riusano le
     personas di S5.1)
   - Selettore **scenario** (Standard sblocca dopo prima win, gli altri
     in base alla cronologia profilo)
   - Selettore **difficoltà AI** globale (Junior / Senior / Director)
3. Click **Avvia →**
4. Sequenza Vision draft: ogni umano sceglie la propria Vision, intervallato
   da pass-screen modal "PASSA IL MOUSE A X"
5. Sequenza OKR draft: stesso pattern
6. Snake draft delle carte: ogni turno umano è preceduto da pass-screen
   (a meno che non sia consecutivo allo stesso umano)

### Il pass-screen modal

```
┌─────────────────────────────────────────┐
│         🪑  PASS THE MOUSE              │
│                                         │
│         ┌─────────┐                     │
│         │    M    │  ← avatar grande    │
│         └─────────┘                     │
│                                         │
│           MARCO                         │
│           (Eng VP)                      │
│                                         │
│     Classifica attuale                  │
│     #1 Federica  17K MAU                │
│     #2 Marco     12K MAU                │
│     #3 Alessia    8K MAU                │
│     #4 Karim      5K MAU                │
│                                         │
│       [ Tocca a me, procedi → ]         │
└─────────────────────────────────────────┘
```

Modal grande, backdrop scuro, **impossibile non vedere**. Click sul
pulsante per assumere il controllo. Animazioni di slide-in + breath
sull'avatar + sound cue (se audio abilitato).

### Quando NON appare il pass-screen

- Tra due AI consecutive (non interessa nessun umano)
- Tra l'AI e il prossimo turno dello **stesso umano** che ha appena giocato
- Single-human degrade: 1 umano + 3 AI funziona come single-player
  normale, niente pass-screen mai
- Modal pubblici (Q-end, Market News, Investor Pitch, Classifica finale):
  visibili a tutti, sono il "momento sociale" del party game

### Differenze vs P2P Multiplayer

| Aspetto | 🌐 P2P Multiplayer | 🪑 Hot Seat |
|---------|:------------------:|:-----------:|
| Dispositivi | Uno per giocatore | **Uno solo** condiviso |
| Network | WebRTC P2P | **Nessuno** |
| Player setup | Lobby con room code | Lobby tavolo (4 slot) |
| Privacy info | Ogni client vede il proprio | **Open table** (tutti vedono tutto) |
| Block & React | 🚫 Disabled | 🚫 Disabled |
| AI fillers | Auto sui posti vuoti | Configurabili per slot |
| Profile tracking | Per-client | Solo slot 1 (per ora) |

### Limitazioni MVP

- 🚫 **Block & React** disabilitato (consistente con P2P)
- 🚫 **Multi-profile**: solo lo slot 1 traccia stats nel localStorage. Gli
  altri umani giocano "anonimi". V2 valuterà multi-profile.
- 🚫 **Daily mode** non disponibile in Hot Seat (per ora)
- 🚫 **Hidden info mode**: tutto pubblico (Vision, OKR, resources del
  player attivo). Più "party game friendly" che strategico.

---

## 📱 Mobile / PWA (Phase 12)

Stack & Balance è giocabile **first-class su smartphone portrait**
(iPhone SE 375px → iPhone Pro Max ~430px) e tablet portrait (iPad ~768px).
Il desktop resta visivamente identico al pre-Phase-12.

### Highlight

- **Pyramid responsive** (S12.2): su phone le carte diventano thumb
  ~52px×120px con dipartimento + nome + costo visibili. Tablet:
  layout desktop scalato ~70%.
- **Tap-to-detail overlay** (S12.3): tap su qualsiasi carta apre un
  modal fullscreen con dettaglio completo + bottoni espliciti
  "🃏 Pesca" / "❌ Scarta" / "← Annulla". Pattern 7 Wonders Duel /
  MTG Arena / Hearthstone.
- **Modali responsive** (S12.4): tutte le modali (scenario, vision,
  OKR, MP entry/lobby/join, Hot Seat lobby, market news, end-game)
  adattate a 95vw, grid 2/3-col → 1-col, tap target ≥ 44px.
- **Input mobile-friendly** (S12.4): `inputmode`, `autocapitalize`,
  `enterkeyhint` su tutti i form. Font-size ≥ 16px per evitare
  auto-zoom iOS al focus.
- **Touch UX** (S12.5): no più sticky-hover dopo tap, press-feedback
  `:active` su tutti i controlli, niente flash blu iOS.
- **Portrait-lock**: phone in landscape mostra "📱 Ruota il telefono
  in verticale per giocare". Tablet/desktop landscape unaffected.
- **PWA installabile** (S12.6): manifest + service worker. Add to Home
  Screen su iOS/Android, single-player + Hot Seat **completamente
  giocabili offline** dopo il primo load. P2P MP richiede ovviamente
  la rete.

### Installare come app

**iOS Safari**:
1. Apri il sito
2. Tap su Condividi (□↑) → "Aggiungi a Home"
3. L'icona appare sulla home, apertura full-screen senza chrome browser

**Android Chrome**:
1. Apri il sito
2. Banner automatico "Installa app" dopo qualche minuto, oppure
   menu ⋮ → "Aggiungi a schermata Home"
3. Apertura standalone

### Limitazioni V1 (placeholder + follow-up)

- **Icona PWA**: V1 usa un placeholder SVG con monogramma "S&B".
  Sostituibile post-ship senza toccare manifest/SW.
- **Phone landscape**: bloccato (overlay "Ruota in verticale"). Layout
  landscape dedicato è un follow-up futuro.
- **Vibration / haptic feedback**: scartato per V1, valutiamo dopo.
- **Push notifications**: non implementate (richiederebbero backend).
- **Cache versioning**: il SW è attualmente a `sb-v14` (bump per deploy
  che tocca CSS/JS user-visible — vedi storico nei commenti di `sw.js`).
  Se la PWA installata mostra una versione vecchia: chiudi/riapri o
  bump cache lato server.

### Tabella feature parity

| Feature | Desktop | Tablet | Phone |
|---------|:------:|:------:|:----:|
| Single-player end-to-end | ✅ | ✅ | ✅ |
| Hot Seat 2-4 umani | ✅ | ✅ | ✅ |
| P2P Multiplayer | ✅ | ✅ | ✅ |
| Daily Run | ✅ | ✅ | ✅ |
| Weekly Challenge | ✅ | ✅ | ✅ |
| Synergy showcase | ✅ | ✅ | ✅ |
| Win condition badge (masthead) | ✅ | ✅ | ✅ |
| Founder Level + Vision Mastery | ✅ | ✅ | ✅ |
| Tap-to-detail card overlay | — | — | ✅ |
| PWA installabile | ✅ | ✅ | ✅ |
| Offline (single-player + HS) | ✅ | ✅ | ✅ |

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

> ⚠️ Il pool della piramide è 24 carte/Q. Se aggiungi carte, il `data.js`
> ne pesca random `TOTAL_PICKS=24` a inizio Q (cards in eccesso ruotano
> tra game e game). Pool attuale: **83 carte** (Q1 24 + Q2 27 + Q3 32),
> ratio consumption ~87% — sweet spot tipo 7 Wonders Duel.

I numeri di carta (`Nº NN`) e i lookup (`ALL_CARDS_BY_ID`, `CARD_META`) si
ricostruiscono automaticamente al load — non serve sincronizzare nulla.

### Aggiungere una **synergia** (S15)

Apri **`js/synergies.js`** e aggiungi a `SYNERGY_POOL`:

```js
{
  id: "growth_master",
  name: "Growth Master",
  icon: "📈",
  points: 12,
  tags: ["growth", "data", "vp"],          // pesca flavorata da scenario
  difficulty: "hard",                       // easy | medium | hard
  detailInactive: "Sinergia: launches + dati alti",
  detailActive: () => "Macchina di crescita totale",
  check(p) {
    const launchCount = p.played.filter(c => c.type === "Launch").length;
    const reqs = [
      { label: "Launch ≥ 4", current: launchCount, target: 4, met: launchCount >= 4 },
      { label: "Dati ≥ 8",   current: p.dati,      target: 8, met: p.dati >= 8 },
    ];
    return { requirements: reqs, active: reqs.every(r => r.met) };
  },
}
```

A inizio partita `drawSynergies()` ne pesca 5 random pesati per
scenario (`tags` matchano `scenario.synergyFlavor`). Il rendering nel
synergy-showcase modal e nel pannello sidebar è automatico.

### Aggiungere un **AI archetype** (S16)

Apri **`js/archetypes.js`** e aggiungi a `ARCHETYPE_POOL`:

```js
{
  id: "specialist",
  name: "Specialist",
  icon: "🎓",
  description: "Picca quasi solo Hiring di alto tier, evita Sabotage.",
  weightMultipliers: { talento: 1.5, vp: 0.8 },     // moltiplica weights persona
  cardTypeBias:      { Hiring: +4, Sabotage: -3 },  // +/- score per type
  blockModifier: 0.6,                                // multipler probabilità blocco
  riskMultiplier: 1.2,                               // >1 = più cauto su Crunch
}
```

Gli archetypes vengono pescati a inizio partita (`drawArchetypes` →
`assignArchetypesToAIs`) e applicati come overlay sopra i weights della
persona. Il rendering del tag nella byline è automatico.

### Aggiungere una **Win Condition** (S17)

Apri **`js/win-conditions.js`** e aggiungi a `WIN_CONDITION_POOL`, poi
linkalo a uno scenario via `winConditionId`:

```js
{
  id: "morale_king",
  name: "Morale Champion",
  icon: "🚀",
  description: "Vince chi finisce con il morale più alto.",
  selectWinner(players) {
    return [...players].sort((a, b) => b.morale - a.morale)[0];
  },
  endGameTitleYou: () => "🏆 Hai costruito il team più felice",
  endGameTitleOther: (w) => `Vince ${w.name} con morale ${w.morale}`,
  masthead: {
    icon: "🚀",
    label: "Morale King",
    hint: (s) => `Morale tuo: ${s.players[s.localSlotIdx].morale}/10`,
  },
}
```

Poi in `js/scenarios.js` aggiungi `winConditionId: "morale_king"` allo
scenario desiderato. Il modale end-game e il masthead badge si
aggiornano automaticamente.

### Aggiungere una **Weekly Challenge** (S18.3)

Apri **`js/weekly-challenges.js`** e aggiungi a `WEEKLY_POOL`:

```js
{
  id: "open_source_friday",
  name: "Open Source Friday",
  icon: "📦",
  description: "Tool cards −2💰. Tutti gli avversari iniziano +2 dati.",
  modifiers: {
    costModifiersByType: { Tool: { budget: -2 } },
    onQuarterStart(state) {
      if (state.quarter === 1) {
        state.players.forEach((p, i) => { if (i !== 0) p.dati += 2; });
      }
    },
  },
  winBonusXP: 100,
  noteBeforeStart: "Hard mode: gli AI partono in vantaggio sul stack data.",
}
```

La rotation è data dall'ISO week dell'anno (`isoWeekKey()` in
`weekly-challenges.js`). 6 entries → 1 challenge per ~2 mesi.

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

### Roadmap per fase

- **[ROADMAP.md](ROADMAP.md)** — piano core a 8 fasi (Phase 1-8 ✅, MVP)
- **[MULTIPLAYER-ROADMAP.md](MULTIPLAYER-ROADMAP.md)** — Phase 10 P2P
- **[HOTSEAT-ROADMAP.md](HOTSEAT-ROADMAP.md)** — Phase 11 pass-and-play
- **[MOBILE-ROADMAP.md](MOBILE-ROADMAP.md)** — Phase 12 mobile-first + PWA
- **[MOBILE-POLISH-ROADMAP.md](MOBILE-POLISH-ROADMAP.md)** — Phase 13 polish post-review
- **[REPLAYABILITY-ROADMAP.md](REPLAYABILITY-ROADMAP.md)** — Phase 14 pool expansion
- **[GAMEPLAY-ROADMAP.md](GAMEPLAY-ROADMAP.md)** — Phase 15-18 (synergies, archetypes, win conditions, founder level, vision variants, weekly)

### Riferimenti continui

- **[CHANGELOG.md](CHANGELOG.md)** — log dettagliato session-by-session
  (da S1.1 a S18.3, ~50 entries con math, decisioni, file map per session).
- **[CONTEXT.md](CONTEXT.md)** — handoff doc per riprendere lo sviluppo
  dopo una pausa: architettura, gotchas, conventions, file map.
- **[BALANCE-NOTES.md](BALANCE-NOTES.md)** — note di tuning balance per
  carte / synergies / archetypes / weekly.
- **[GIT-WORKFLOW.md](GIT-WORKFLOW.md)** — convenzioni di commit, branch,
  cache-version bumping.

---

## 🧠 Architecture highlights

- **Modifier engine** (S2.3 → S6.1 → S18.3): Vision (per-player) +
  Event (per-Q) + Scenario (game-wide) + Weekly Challenge (game-wide,
  S18.3) sono uniformemente schemi dichiarativi processati da
  `applyCostModifiers` / `applyEffectModifiers` in **4 pass**.
  Aggiungere un nuovo trigger = aggiungere una entry, niente codice
  procedurale.
- **Synergy engine** (S15): le sinergie sono drawn-at-game-start
  (5 da pool di 24, flavorate per scenario) e valutate a end-game
  via `computeSynergies(player, state)`. Pattern `requirements: [{label,
  current, target, met}]` per UI riusabile.
- **AI archetype overlay** (S16): `archetypes.js` definisce 5 stili
  layered sui weights persona. `assignArchetypesToAIs(state)` chiamato
  in startGame applica `weightMultipliers` / `cardTypeBias` /
  `blockModifier` / `riskMultiplier` ai 3 AI.
- **Win condition pluggable** (S17): `state.winCondition` punta a una
  entry di `WIN_CONDITION_POOL`. `endGame()` chiama `selectWinner()` per
  determinare il vincitore; `earlyTermination()` permette acquisition
  win mid-Q.
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
