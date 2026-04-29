# Stack & Balance — Multiplayer Roadmap (Phase 10)

> **Tipo**: feature architecturale grossa, ortogonale al gameplay esistente.
> **Obiettivo**: aggiungere modalità multiplayer **P2P via WebRTC** che gira
> su GitHub Pages senza backend. Posti vuoti riempiti da AI per mantenere
> sempre 4 player totali (no sbilanciamento).
> **Origine**: chiesta dall'utente nel contesto post-Phase-9.
> **Natura**: 100% additiva al codice esistente. Single-player resta default.

---

## 🎯 Vision

Permettere che 2-4 amici giochino a Stack & Balance da remoto, su browser
diversi, senza nessun server da gestire né account da creare. Posti
vuoti coperti da AI in modo che la dinamica a 4 player resti invariata.
Hosting completamente gratuito su GitHub Pages.

**Non-goals** (esplicitamente fuori scope):
- ❌ Spectator mode
- ❌ Voice/video chat
- ❌ Friend list, login persistente, matchmaking pubblico
- ❌ Riprendere partita dopo che tutti chiudono il browser
- ❌ Daily Run multiplayer (gli scenari multiplayer hanno seed random)

---

## 🌐 Architettura tech

### Stack

- **WebRTC DataChannels** via [PeerJS](https://peerjs.com/) (CDN, ~5KB gzip)
- **Signaling**: PeerJS Cloud (server pubblico gratuito; no setup)
- **Fallback** se PeerJS Cloud è giù: documentato come "use local
  Trystero build", non implementato in MVP

### Pattern: Authoritative Host

```
                    ┌──────────┐
                    │  HOST    │  ← uno dei player umani
                    │ player N │     - mantiene IL state autoritativo
                    └────┬─────┘     - applica rules.js / game.js
                         │            - runa l'AI per i posti vuoti
            ┌────────────┼────────────┐
            ▼            ▼            ▼
        ┌───────┐    ┌───────┐    ┌───────┐
        │client │    │client │    │client │   ← ricevono state dall'host,
        │ (peer)│    │ (peer)│    │ (peer)│      inviano i loro pick
        └───────┘    └───────┘    └───────┘
```

**Perché authoritative host e non lockstep**:
- Niente refactor di `Math.random()` sparsi (sabotage handlers, etc.)
- Tutto il codice esistente (`rules.js`, `game.js`, `ai.js`) gira identico
- Anti-cheat naturale (l'host non si fida dei messaggi client)
- Più semplice da debuggare

**Tradeoff accettato**: se il host disconnette, la partita finisce.
MVP non ha host migration.

### Player slot model

```js
state.playerSlots = [
  { type: "human-host",   peerId: "...", name: "Federica" },  // host (you)
  { type: "human-remote", peerId: "...", name: "Marco" },     // network player
  { type: "ai",           peerId: null,  name: "Alessia",     // AI seat
    persona: AI_PERSONAS[2] },
  { type: "ai",           peerId: null,  name: "Karim",
    persona: AI_PERSONAS[3] },
];
```

**Slot 0 è sempre il "POV locale"** del client che renderizza. Per il
host coincide con `playerSlots[0]`. Per un client remoto, i suoi pick
vanno verso il proprio peerId nello state autoritativo dell'host.

---

## 📅 Macro-timeline (6 sessions · ~10-12h totali)

| Session | Tema | Effort | Stato |
|---------|------|-------:|------:|
| **S10.1** | PeerJS Integration & Lobby UI | M (~2h) | ✅ Done · 2026-04-28 |
| **S10.2** | Authoritative Host State Replication | L (~2.5h) | ✅ Done · 2026-04-28 |
| **S10.3** | Networked Picks (humans + AI seats) | L (~2.5h) | ✅ Done · 2026-04-28 |
| **S10.4** | Lobby Polish & Game Setup | M (~1.5h) | ✅ Done · 2026-04-28 |
| **S10.5** | Disconnect Handling | S (~1h) | ✅ Done · 2026-04-28 |
| **S10.6** | Testing & Documentation | M (~1.5h) | ✅ Done · 2026-04-28 |

> **🟡 Empirical playtest deferred**: il codice è completo e i test
> pass, ma il playtest reale con 2-4 browser su rete reale richiede
> validazione manuale (vedi Manual playtest checklist in S10.6).

### S10.7 — Post-MVP synchronization hardening (2026-04-28)

Dopo lo ship di S10.1-S10.6, playtest reale ha rivelato 8+ bug di
sincronizzazione progressivi (closure capture race, isMultiplayer flag
non serializzato, modal mirror mancanti, phase stale, broadcast race,
TypeError in renderPyramid, etc.). Vedi entry [`[S10.7]`](CHANGELOG.md#s107--2026-04-28--mp-synchronization-hardening-post-mvp-fix-pass)
in CHANGELOG per il dettaglio.

**Stato post-S10.7**: ✅ Multiplayer end-to-end funzionante. Tutti i
modal (lobby / vision / OKR / market news / quarter-end / final
sequence / end-game) sono mirrorati host→guest. Game procede
linearmente in MP esattamente come in single-player.

| Fix | Commit | Bug |
|-----|--------|-----|
| CSS button override on entry modal | 27644c8 | bottoni neri |
| Error guards on draft chains | 27dc7ea | stuck after vision pick |
| Lobby modal close on guest | 49f6bb0 | "in attesa che l'host avvii" forever |
| Host pre-render after Vision (Q1) | 54537c2 | host on splash |
| **isMultiplayer in serializeState** | **1e1abc1** | **client picks divergent from host** |
| Q-end + Market News modal mirror | 987771e | guest non vede modal Q-end |
| Pre-render Q2/Q3 board on host | 0212983 | host vede board bianco |
| Phase reset + broadcast linearization | 798738f | "..." indicator stuck |
| **Closure capture race in OKR modal** | **99fd28c** | **OKR closed but no okr was chosen** |
| Final sequence + end-game mirror | f6923c4 | guest stuck dopo Q3 |

**Critical path**: S10.1 → S10.2 → S10.3. Le ultime 3 sessioni sono polish.

**Strategia raccomandata**: spezza in 2 weekend.
- WK1: S10.1 + S10.2 (core architecture)
- WK2: S10.3 + S10.4 + S10.5 + S10.6 (gameplay + polish)

---

## 🧱 SESSION 10.1 — PeerJS Integration & Lobby UI

**Tipo**: foundation infrastructure
**Effort**: M (~2h)
**Dipendenze**: nessuna
**Files toccati**: `index.html`, `js/multiplayer.js` (nuovo),
`js/render-multiplayer.js` (nuovo o fold in render-modals), `styles/main.css`

**Goal**: due browser possono connettersi via room code. Non gioca ancora;
solo "lobby con player names visibili".

### Requirements

#### 10.1.a — Add PeerJS dependency
In `index.html`:
```html
<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
```
Subito prima del primo script `js/data.js`. Verifica che `Peer` sia
globale dopo il load.

#### 10.1.b — Create `js/multiplayer.js` skeleton
Esporta come globali (vanilla JS pattern):
```js
let mp = {
  active: false,         // true durante una partita multiplayer
  isHost: false,
  peer: null,            // PeerJS instance
  roomCode: null,        // 4-char ID condivisibile (es. "ABCD")
  connections: [],       // host: array verso N client; client: [hostConn]
  remotePlayers: [],     // [{peerId, name}, ...] (tracked dal host)
};

async function mpCreateRoom(hostName) { /* ... */ }
async function mpJoinRoom(code, playerName) { /* ... */ }
function mpSendToHost(msg) { /* ... */ }
function mpBroadcast(msg) { /* ... */ }    // host only
function mpDisconnect() { /* ... */ }
```

Implementazione: vedi snippet in [§ Code preview](#-code-preview-s101-skeleton)
sotto.

#### 10.1.c — Lobby modal UI
Nuovo modal `showMultiplayerLobbyModal(role, onComplete)` con:
- Se `role === "host"`: mostra **room code** (~24px font, copyable),
  lista player connessi (parte con solo te), counter "1/4 player",
  bottone **Avvia partita →** (disabled finché >= 2 player connessi)
- Se `role === "join"`: input **Room code** + input **Il tuo nome**,
  bottone **Connetti →**, poi waiting state "Connesso, attendo l'host…"

Aggiungi a splash:
```
[ Avvia nuova partita → ]    ← single-player (default)
[ Daily Run · ✓ ]            ← S6.3
[ 🌐 Multiplayer (host) ]    ← NEW
[ 🌐 Multiplayer (join) ]    ← NEW
[ Profilo ]
```

Il bottone "Multiplayer" può essere uno solo che apre un sub-chooser
(host/join) per non affollare lo splash. Decision UX: 1 bottone con
sub-chooser.

### Acceptance criteria

- [ ] Apri 2 browser tabs in incognito (per evitare conflitti localStorage)
- [ ] Tab A: click "Multiplayer (host)" → vedi room code (es. "DKQM")
- [ ] Tab B: click "Multiplayer (join)" → inserisci "DKQM" + nome → click Connetti
- [ ] Tab A vede ora 2/4 player, tab B vede "connesso, attendo host"
- [ ] Console pulita (no errors)
- [ ] Room code è 4 caratteri alfabetici uppercase (alta leggibilità,
      no `0/O` confusione)

### Edge cases da gestire

- Room code già preso (collision PeerJS): retry con codice diverso
  fino a max 5 tentativi
- Browser senza WebRTC support: mostra error toast + fallback su single-player
- PeerJS Cloud irraggiungibile: timeout 10s, error toast "Servizio
  multiplayer non disponibile, riprova più tardi"

---

## 🔄 SESSION 10.2 — Authoritative Host State Replication

**Tipo**: core networking
**Effort**: L (~2.5h)
**Dipendenze**: S10.1
**Files toccati**: `js/multiplayer.js`, `js/game.js`, `js/state.js`,
`tests/test-rules.js`

**Goal**: l'host avvia partita; tutti i client vedono lo stesso stato
in real-time.

### Requirements

#### 10.2.a — State serialization helpers
In `js/multiplayer.js` o nuovo `js/serialize.js`:

```js
function serializeState(s) {
  // Deep clone, ma sostituisce funzioni (OKR.check, scenario.onQuarterStart)
  // con riferimenti per ID. Esempio OKR:
  //   { id: "morale_high", text: "...", reward: 5, check: fn }
  // diventa:
  //   { id: "morale_high" }   // text/reward/check si lookup-ano via OKR_POOL
  return {
    quarter: s.quarter,
    pickIndex: s.pickIndex,
    pickOrder: [...s.pickOrder],
    pyramid: s.pyramid.map(row => row.map(slot => ({
      card: slot.card,  // cards sono pure data — clonable
      faceUp: slot.faceUp,
      taken: slot.taken,
    }))),
    players: s.players.map(p => ({
      ...p,
      // Sostituisce OKR objects con array di id
      okrs: p.okrs.map(o => o.id),
      okrOptions: p.okrOptions.map(o => o.id),
      // Vision è già pure data (modifiers obj senza fn) — passthrough
      vision: p.vision,
    })),
    log: s.log.slice(0, 10),  // solo gli ultimi 10 entries (saving bandwidth)
    phase: s.phase,
    activePicker: s.activePicker,
    activeEvent: s.activeEvent,  // event ha onActivate fn — strip
    scenario: s.scenario ? { id: s.scenario.id } : null,  // strip onQuarterStart
    // ... altri campi UI flags
  };
}

function deserializeState(serialized) {
  return {
    ...serialized,
    players: serialized.players.map(p => ({
      ...p,
      okrs: p.okrs.map(id => OKR_POOL.find(o => o.id === id)),
      okrOptions: p.okrOptions.map(id => OKR_POOL.find(o => o.id === id)),
    })),
    activeEvent: serialized.activeEvent
      ? EVENT_POOL.find(e => e.id === serialized.activeEvent.id) || serialized.activeEvent
      : null,
    scenario: serialized.scenario
      ? getScenarioById(serialized.scenario.id)
      : null,
  };
}
```

#### 10.2.b — Hook broadcast in game flow
In `game.js`, ovunque chiamiamo `render()` dopo state changes (`processNextPick`,
`endOfQuarter`, etc.):

```js
function broadcastIfHost() {
  if (mp.active && mp.isHost) {
    mpBroadcast({ type: "stateUpdate", state: serializeState(state) });
  }
}
```

Hooks da aggiungere:
- Dopo `processNextPick` → state cambia (pyramid, player resources)
- Dopo `endOfQuarter` → tutti i bonus applicati
- Dopo `startQuarter` → pyramid resettata
- Dopo `pickAndShowMarketEvent` → activeEvent settato
- Dopo `endGame` → final scores

#### 10.2.c — Client receives state
Nel `handlePeerMessage` di `multiplayer.js`:

```js
case "stateUpdate":
  if (mp.isHost) return;  // host non si auto-aggiorna
  state = deserializeState(msg.state);
  render();  // re-render full UI
  break;
```

#### 10.2.d — Tests
- `serializeState(state)` ↔ `deserializeState(serialized)` roundtrip
  preserva: pyramid, players, OKR refs, scenario refs
- Funzioni asincrone (OKR.check) sopravvivono al roundtrip via lookup

### Acceptance criteria

- [ ] Host inizia una partita single-player con 3 AI (lobby skip per ora)
- [ ] Lato host: gioca 1 pick, lo state cambia
- [ ] Connetti un client (lobby di S10.1)
- [ ] Manualmente fai broadcast e verifica che il client renderizzi
      esattamente lo stesso state (pyramid, bacheche, masthead, sidebar)
- [ ] OKR cliccabili sul client (anche se non possono ancora pickare)
- [ ] +5-8 nuovi test su serialize/deserialize

### Edge cases

- **Cards con `effect: { onActivate: fn }`** (Market Events): strip dalla
  serializzazione, si lookup-a via id sul client
- **Players con `vision.modifiers.onQuarterStart`** (scenarios): idem
- **Card instances (`instCard`)** sono già clones JSON-safe — nessun
  problema
- **Bandwidth**: una serializzazione completa di 4 players × pyramid 24
  slots è ~5-10KB. Per 24 picks/Q × 3 Q = 72 broadcasts × 10KB = ~720KB
  totali. Trascurabile

---

## 🎮 SESSION 10.3 — Networked Picks (humans + AI seats)

**Tipo**: gameplay networking
**Effort**: L (~2.5h)
**Dipendenze**: S10.2
**Files toccati**: `js/multiplayer.js`, `js/game.js`, `js/render-pyramid.js`

**Goal**: 2 umani + 2 AI giocano una partita completa da inizio a fine.

### Requirements

#### 10.3.a — Slot model
Sostituisci la logica `state.players` corrente con:

```js
state.playerSlots = [...]; // vedi sezione Architettura sopra
state.localSlotIdx = 0;    // l'idx del player POV-locale (host: 0; client: il suo)
```

Helper:
```js
function isMyTurn() {
  return state.activePicker === state.localSlotIdx;
}

function isAISlot(idx) {
  return state.playerSlots[idx].type === "ai";
}
```

#### 10.3.b — Host pick orchestration
Modifica `processNextPick` per:
1. Determina il prossimo slot via `state.pickOrder[state.pickIndex]`
2. Se è AI → chiama `decideAIPickFromPyramid` come ora, applica, broadcast
3. Se è human-host → mostra controllo locale (existing behavior)
4. Se è human-remote → broadcast `{ type: "yourTurn", slot: idx }` al peer
   corrispondente, attendi `{ type: "pick", row, col, action }` in risposta

#### 10.3.c — Client UI gating
Solo il player il cui turno è attivo vede i controlli interattivi:

```js
// In render-pyramid.js renderPyramidCard:
const interactive = isHumanTurn && pickable && isMyTurn();  // S10.3
```

Quando NON è il mio turno, mostro nel masthead:
```
👀 In attesa di Marco (Eng VP)…
```
Con avatar + spinner discreto.

#### 10.3.d — Pick validation (host anti-cheat)
Quando l'host riceve `{ type: "pick", row, col, action }` da un client:

```js
function handleNetworkedPick(msg, fromConn) {
  const senderSlotIdx = findSlotByPeerId(fromConn.peer);
  // 1. È davvero il turno di questo peer?
  if (state.activePicker !== senderSlotIdx) {
    fromConn.send({ type: "pickRejected", reason: "not your turn" });
    return;
  }
  // 2. La carta è pickable?
  if (!isPickable(msg.row, msg.col)) {
    fromConn.send({ type: "pickRejected", reason: "card not pickable" });
    return;
  }
  // 3. Validation OK → applica come pick locale
  // (riusa la logica esistente, niente fork)
  // ...
  broadcastIfHost();
}
```

#### 10.3.e — OKR/Vision draft sync
Ai draft (Vision pre-Q1, OKR a inizio Q):
- Host genera `pickRandom(OKR_POOL, 3)` per ogni human-remote slot
- Host invia al peer: `{ type: "draftOKR", options: [id1, id2, id3] }`
- Client mostra il modal e risponde: `{ type: "okrChosen", id: "morale_high" }`
- Stesso pattern per Vision draft pre-game
- AI slots: host applica `chooseAIOKR` / `chooseAIVision` come ora

### Acceptance criteria

- [ ] Setup: 2 humans + 2 AI in lobby, host avvia
- [ ] Tutti vedono il modal "Scegli Vision" (3 random per ognuno)
- [ ] Vision draft completato → tutti vedono il proprio Vision badge nel masthead
- [ ] Q1 inizia: ogni human vede modal "Scegli OKR" (3 random)
- [ ] OKR draft completato → game inizia con processNextPick
- [ ] Snake draft funziona: ogni player può pickare solo nel proprio turno
- [ ] AI slots picano automaticamente (gestito dall'host)
- [ ] Q3 finale: investor pitch + VC reaction visibili a tutti
- [ ] Classifica finale identica su tutti i client

### Edge cases

- **Human picks una carta unaffordable**: forza discard come gestito
  da rules.js, broadcast normale
- **Block & React**: la finestra di block viene offerta via
  `{ type: "blockOpportunity", reveal: ... }` solo agli human che possono
  permetterselo. Risposta `{ type: "blockResponse", action: "block"|"pass" }`
  con timeout server-side (host) di 4s (S9.7).
- **Sabotage che colpisce specifico player**: lo state viene aggiornato
  dall'host normalmente, broadcast successivo include la modifica

---

## 🛋️ SESSION 10.4 — Lobby Polish & Game Setup

**Tipo**: UX polish + matchmaking quality-of-life
**Effort**: M (~1.5h)
**Dipendenze**: S10.3
**Files toccati**: `js/multiplayer.js`, `js/render-multiplayer.js`,
`styles/main.css`

**Goal**: rendere la creazione partita gradevole. Riempie auto i posti
vuoti con AI.

### Requirements

#### 10.4.a — Shareable URL
Il host genera un URL del tipo:
```
https://francescobee.github.io/Stack-Balance/#room=ABCD
```
Click sul "Copy room link" copia quell'URL. Quando un altro player apre
quel link:
- All'avvio, `main.js` legge `location.hash.match(/room=(\w+)/)`
- Se trovato, salta lo splash e va dritto al join modal con room code prefilled

#### 10.4.b — Auto-fill AI seats
Quando l'host clicca "Avvia partita":
- Se `humanCount < 4`, riempi `playerSlots` con AI per i seat rimanenti
- Le AI usano i nomi di default (Marco, Alessia, Karim) prendendo i primi
  N disponibili
- L'host può scegliere la **difficoltà delle AI** dal modal lobby (junior /
  senior / director). Default: Senior.

#### 10.4.c — Player slot config UI
Lobby modal mostra una griglia 4 slot:
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Federica   │ │  + Invita   │ │ 🤖 Marco    │ │ 🤖 Alessia  │
│  HOST       │ │  (vuoto)    │ │ (Eng VP)    │ │ (CMO)       │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```
- "+ Invita" button mostra il room code per condividere
- Quando un human si connette, prende il primo slot vuoto
- L'host può **swappare** slot vuoti tra AI/human (toggle)
- Counter "2 humans + 2 AI · 4/4 ready"

#### 10.4.d — Difficulty selection per game
Modal lobby ha un selector difficulty AI (junior/senior/director). Si
applica solo per quella partita. Persiste in profile? No, è contesto
multiplayer.

### Acceptance criteria

- [ ] Host crea room → URL shareable visibile + button "Copia link"
- [ ] Apri il link in incognito → modal join apparso con codice prefilled
- [ ] Connetti 1 secondo player → vedi "1 human + 3 AI" auto
- [ ] Click "Avvia" → la partita parte con i 4 slot configurati
- [ ] AI slots usano la difficoltà selezionata in lobby
- [ ] Disconnect un client mid-lobby → il suo slot torna "vuoto"

### Edge cases

- URL hash ma room non esiste: error toast "Room ABCD non trovata", fallback splash
- 4 humans connessi: button "Avvia" attivo subito, niente AI
- 1 human (host solo): button "Avvia" attivo, partita 1+3 AI come single-player
  (ma usando il network layer — overhead trascurabile)

---

## 🔌 SESSION 10.5 — Disconnect Handling

**Tipo**: robustness
**Effort**: S (~1h)
**Dipendenze**: S10.3
**Files toccati**: `js/multiplayer.js`, `js/render-multiplayer.js`

**Goal**: gestione graceful di disconnessioni. MVP, no host migration.

### Requirements

#### 10.5.a — Detect disconnect
Listener su `connection.on("close")`:
- Se sei host e si disconnette un client: chiama `handleClientDisconnect(slotIdx)`
- Se sei client e si disconnette il host: mostra "Host disconnesso"

#### 10.5.b — Host: disconnect modal
Quando un client human disconnette mid-game:

```
┌─────────────────────────────────────┐
│  ⚠ Marco si è disconnesso          │
│                                     │
│  Vuoi continuare con un'AI al suo  │
│  posto, o terminare la partita?    │
│                                     │
│  [ Continua con AI ]  [ Termina ]  │
└─────────────────────────────────────┘
```

- "Continua con AI" → cambia `playerSlots[idx].type` da "human-remote" a "ai",
  assegna persona random tra quelle non usate, broadcast del nuovo state ai
  client rimanenti, processNextPick prosegue
- "Termina" → broadcast `{ type: "gameEnded", reason: "host-decision" }`,
  tutti tornano a splash

#### 10.5.c — Client: host disconnect
Se il client perde la connessione all'host:
```
┌─────────────────────────────────────┐
│  📡 Host disconnesso                │
│                                     │
│  La partita è terminata. Torna     │
│  alla home per iniziarne una nuova.│
│                                     │
│  [ Torna alla home ]               │
└─────────────────────────────────────┘
```
Click → `renderSplash()`.

### Acceptance criteria

- [ ] 4-player game in corso (1 host + 3 humans)
- [ ] Chiudi tab di uno dei client (non l'host)
- [ ] Host vede modal disconnect entro 5s
- [ ] Click "Continua con AI" → la partita prosegue, lo slot disconnesso
      è ora un'AI (visibile nel masthead/byline come "🤖 [persona]")
- [ ] AI gioca i suoi turni successivi normalmente
- [ ] Stesso scenario: chiudi tab dell'host
- [ ] I client vedono modal "Host disconnesso" entro 5s
- [ ] Click "Torna alla home" → splash mostrato, mp state pulito

### Edge cases

- **Disconnessione durante OKR/Vision draft**: il modal del player
  disconnesso si chiude (non più draft), AI fa la scelta automatica via
  `chooseAIOKR/chooseAIVision`
- **Host disconnect durante AI turn**: i client semplicemente vedono
  "Host disconnesso" — non importa di chi era il turno
- **Reconnect** (stesso peer torna entro 30s): NON supportato in MVP. Il
  re-join deve passare per un nuovo "join room" che però fallisce perché
  la partita è già iniziata. Documenta come limitation.

---

## 🧪 SESSION 10.6 — Testing & Documentation

**Tipo**: validation + docs
**Effort**: M (~1.5h)
**Dipendenze**: tutte le precedenti
**Files toccati**: `tests/test-rules.js` (o nuovo `tests/test-multiplayer.js`),
`README.md`, `CONTEXT.md`, `tests/test.html`

**Goal**: chiudere la fase 10 con test pass + doc utenti.

### Requirements

#### 10.6.a — Unit tests sulle pure functions
Testabile via headless test runner (le connections no, ma la logica sì):

- `serializeState`/`deserializeState` roundtrip preserva tutti i campi
  attesi (~5 test)
- Pick validation (host-side): turno corretto, carta pickable, peer
  autorizzato (~4 test)
- Slot model helpers: `findSlotByPeerId`, `isAISlot`, `isMyTurn` (~3 test)
- Auto-fill AI: dato 2 humans, riempi 4 slot con 2 AI (deterministico per ID) (~2 test)

Target: ~14 test nuovi → totale 58/58 pass.

#### 10.6.b — Manual playtest checklist
Sezione in `MULTIPLAYER-ROADMAP.md` con i test manuali:

```
☐ Browser A (host) crea room, copia link
☐ Browser B incognito join via link
☐ Browser A vede 2/4 player, click "Avvia"
☐ Vision draft funziona su entrambi
☐ Q1 OKR draft funziona su entrambi
☐ Snake draft picks: A pesca, B vede update; B pesca, A vede update
☐ AI slots picano automaticamente
☐ Block & React: A vede finestra di block quando B sta per rivelare
☐ Q-end modal mostra stessi numeri su entrambi
☐ End-game classifica identica
☐ Browser B chiude tab → A vede modal disconnect
☐ A click "Continua con AI" → partita prosegue
☐ Browser A chiude tab → B vede "Host disconnesso"
```

#### 10.6.c — Documentazione utente
Sezione "🌐 Multiplayer" in README:
- Come crear una partita (host)
- Come unirsi (link or room code)
- Cosa succede se qualcuno disconnette
- Limiti noti (no reconnect, no persistence)

#### 10.6.d — Architecture notes in CONTEXT.md
Aggiungi sezione "🆕 Phase 10 additions":
- Stack: PeerJS + DataChannels + authoritative host
- File map: `js/multiplayer.js`, `js/render-multiplayer.js`
- Principi: state serializable, OKR/scenario via id-lookup, host runs AI
- Critical gotchas (es. `_chainsTriggeredThisQ` deve serializzare → sì,
  è un numero pure)
- Migration cheatsheet: come aggiungere un nuovo type di message

### Acceptance criteria

- [ ] Test runner: 58+/58+ pass
- [ ] Manual playtest: tutti i 13 punti della checklist confermati ✓
- [ ] README ha sezione multiplayer con screenshot/flow
- [ ] CONTEXT.md ha file map aggiornato

---

## 🗺️ Dependency graph

```
S10.1 ──→ S10.2 ──→ S10.3 ──┬─→ S10.4
                            ├─→ S10.5
                            └─→ S10.6
```

S10.4, S10.5, S10.6 possono andare in parallel dopo che S10.3 è stabile.

---

## 📐 Definition of Done — Phase 10

Phase 10 è chiusa quando:

1. ✅ 4 amici da 4 città diverse (test reale, non solo localhost) possono
   completare una partita
2. ✅ Disconnect non rompe la partita (almeno via "Continua con AI")
3. ✅ Posti vuoti riempiti da AI mantenendo balance del gioco invariato
4. ✅ URL shareable funziona da mobile + desktop (testa Chrome iOS,
   Firefox Android, ecc.)
5. ✅ Test suite continua a passare
6. ✅ README aggiornato

---

## 💻 Code preview (S10.1 skeleton)

Per dare un'idea concreta di quanto è "leggero" il codice:

```js
// js/multiplayer.js (FUTURE)

let mp = {
  active: false,
  isHost: false,
  peer: null,
  roomCode: null,
  connections: [],
  remotePlayers: [],   // [{peerId, name, slotIdx?}, ...]
  onLobbyUpdate: null, // callback for UI re-render
};

const ROOM_PREFIX = "stackandbalance-";  // namespace per evitare collisioni
const PEER_OPTIONS = { debug: 1 };

function generateRoomCode() {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ";  // no I/O
  return Array.from({ length: 4 }, () =>
    alpha[Math.floor(Math.random() * alpha.length)]).join("");
}

async function mpCreateRoom(hostName) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryCreate = () => {
      const code = generateRoomCode();
      const peerInstance = new Peer(ROOM_PREFIX + code, PEER_OPTIONS);

      peerInstance.on("open", (id) => {
        mp = {
          ...mp, active: true, isHost: true, peer: peerInstance,
          roomCode: code, connections: [],
          remotePlayers: [{ peerId: id, name: hostName, slotIdx: 0 }],
        };
        console.log(`[mp] Room ${code} created`);
        resolve(code);
      });

      peerInstance.on("error", (err) => {
        if (err.type === "unavailable-id" && attempts < 5) {
          attempts++;
          setTimeout(tryCreate, 200);
        } else {
          reject(err);
        }
      });

      peerInstance.on("connection", (conn) => {
        conn.on("open", () => {
          mp.connections.push(conn);
          conn.on("data", (msg) => handlePeerMessage(msg, conn));
          conn.on("close", () => handlePeerClose(conn));
          // Notifica gli altri della join
          mpBroadcast({
            type: "lobbyUpdate",
            players: mp.remotePlayers,
          });
          mp.onLobbyUpdate?.();
        });
      });
    };
    tryCreate();
  });
}

async function mpJoinRoom(code, playerName) {
  return new Promise((resolve, reject) => {
    const peerInstance = new Peer(PEER_OPTIONS);
    peerInstance.on("open", () => {
      const conn = peerInstance.connect(ROOM_PREFIX + code, {
        reliable: true,
        metadata: { name: playerName },
      });
      conn.on("open", () => {
        mp = {
          ...mp, active: true, isHost: false, peer: peerInstance,
          roomCode: code, connections: [conn],
        };
        conn.on("data", (msg) => handlePeerMessage(msg, conn));
        conn.on("close", () => handleHostDisconnect());
        // Annuncia nome al host
        mpSendToHost({ type: "join", name: playerName });
        resolve();
      });
      conn.on("error", reject);
    });
    peerInstance.on("error", reject);
  });
}

function mpSendToHost(msg) {
  if (mp.connections[0]) mp.connections[0].send(msg);
}

function mpBroadcast(msg) {
  if (!mp.isHost) return;
  mp.connections.forEach(c => c.send(msg));
}

function mpDisconnect() {
  mp.peer?.destroy();
  mp = { active: false, isHost: false, peer: null, roomCode: null,
         connections: [], remotePlayers: [] };
}

// Stub — implementato in S10.2/S10.3
function handlePeerMessage(msg, conn) {
  switch (msg.type) {
    case "join":
      // Host: registra il nuovo player
      if (mp.isHost) {
        const slotIdx = mp.remotePlayers.length;
        mp.remotePlayers.push({ peerId: conn.peer, name: msg.name, slotIdx });
        mp.onLobbyUpdate?.();
      }
      break;
    case "lobbyUpdate":
      // Client: aggiorna lista player
      mp.remotePlayers = msg.players;
      mp.onLobbyUpdate?.();
      break;
    // S10.2/S10.3: stateUpdate, pick, draftOKR, etc.
  }
}

function handlePeerClose(conn) { /* S10.5 */ }
function handleHostDisconnect() { /* S10.5 */ }
```

**~120 LOC per S10.1**. Aggiungiamo lobby UI (~80 LOC) e si chiude la
sessione.

---

## 📚 BACKLOG (post-Phase-10)

Idee fuori scope ma interessanti per future iterazioni:

- **Host migration**: se l'host disconnette, uno dei client diventa nuovo
  host (richiede che i client mantengano state shadowed, non solo
  ricevuto)
- **Reconnect**: stesso peerId entro N secondi può rejoiare
- **Spectator mode**: revisitare se richiesta gameplay-driven
- **Persistent rooms**: serializza state in localStorage, riprendi domani
- **Cross-game stats**: chi ha vinto contro chi (richiede backend per
  cross-device persistence — fuori scope GitHub Pages)
- **Voice chat opzionale**: WebRTC ce l'ha nativamente, ~30 LOC in più
- **Mobile-friendly UI**: adatta lobby + game per touch (overlap con
  backlog del ROADMAP.md originale)
- **Trystero fallback**: se PeerJS Cloud è giù, try Trystero con
  BitTorrent trackers
- **Self-hosted PeerJS server**: docker su Render/Railway free tier

---

## 🎮 Quando iniziare?

Le fasi di Phase 9 (gameplay) sono indipendenti da Phase 10. Possono
girare in parallelo se vuoi. Suggerito:

1. Chiudi Phase 9 prima (S9.8 playtest gauntlet)
2. Fai release `v1.2-balance-validated`
3. Apri Phase 10 fresh

Oppure se vuoi attaccare Phase 10 subito perché Phase 9 ti ha esaurito:
parti da S10.1 — è infrastructure pura, non interagisce con il
balance del gameplay.

**Effort totale Phase 10**: ~10-12h. Target completion: **2 weekend**
focused, o ~3 settimane part-time.

---

_Roadmap stilata 2026-04-28 dopo che l'utente ha chiesto multiplayer
P2P gratuito su GitHub Pages, con vincoli: posti vuoti = AI, no
spectator, seed random, no voice chat. Aggiornare lo stato delle
session quando completate, e popolare i CHANGELOG.md con entry
`[S10.X]` per tracciare le decisioni implementative._
