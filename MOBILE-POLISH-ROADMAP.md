# Stack & Balance — Mobile Polish Roadmap (Phase 13)

> **Tipo**: polish iterativo, frutto di una review critica esterna
> post-Phase-12.
> **Obiettivo**: chiudere i gap di friction emersi nella review (touch
> feedback mancanti, glanceability, Hot Seat pacing) prima dei
> playtest reali a freddo.
> **Origine**: design review esperto (sessione 2026-04-30) ha
> classificato 1 issue 🔴 critical, 3 🟡 worth-doing, 5 🟢 nice-to-have.
> **Natura**: 100% migliorativa. Nessun cambio architetturale, nessun
> nuovo flow di gioco.

---

## 🎯 Vision

La Phase 12 ha portato Stack & Balance first-class su mobile. La review
esterna conferma il design "90% al traguardo" e identifica il 10% di
polish che separa "shippa-bile" da "non-mi-stanca-di-giocarlo".

I temi sono tre:
1. **Touch feedback completo** — `:active` mancanti, tap target sotto-misura
2. **Glanceability** — segnali importanti (tier, turn, blind-pick) richiedono troppe interazioni per essere letti
3. **Hot Seat pacing** — il modo "killer" su phone ha valore latente non sfruttato

**Non-goals** (esplicitamente fuori scope V1 polish):
- ❌ Cambi al pyramid layout o detail overlay (la review li valida)
- ❌ Nuove modalità di gioco
- ❌ Push notifications, background sync, deep linking
- ❌ Sostituzione icona placeholder PWA (follow-up indipendente)

---

## 🌐 Architettura tech

### Pattern condivisi con Phase 12

- **Mobile-first overrides** dentro `@media (max-width: 600px)` — nessun
  refactor desktop
- **Cache versioning** SW: ogni session che tocca CSS/JS user-visible
  bumpa `CACHE_VERSION` (`sb-v4` → `sb-v5` → ...)
- **Helper viewport** già presenti (`isMobileViewport`,
  `isTabletViewport` in [util.js](js/util.js))
- **Render layer split** già esistente — nuove additions in file
  esistenti, no nuovi file render-*

### Decisioni dalla review (validate implicitamente)

- ✅ Aspect ratio thumb 0.72 ≈ desktop 0.73: **non toccare**
- ✅ Full-width breakout `clamp()` margin: **estendere ad altri primary UI**
- ✅ Tap-to-detail con confirm step: **mantenere**
- ✅ Face-down "Pesca alla cieca" preservation: **mantenere**

---

## 📅 Macro-timeline (3 sessions · ~5h totali)

| Session | Tema | Effort | Stato |
|---------|------|-------:|------:|
| **S13.1** | Touch feedback + glanceability fixes (critical + worth-doing) | M (~1.5h) | ✅ Done · 2026-04-30 |
| **S13.2** | Discoverability — persistent turn + blind-pick cue | M (~1.5h) | ✅ Done · 2026-04-30 |
| **S13.3** | Hot Seat phone pacing (reveal delay + up-next) | M (~2h) | ⬜ |

**Critical path**: S13.1 standalone, può andare in parallelo a S13.2.
S13.3 indipendente (tocca solo Hot Seat). Tutte e tre eseguibili in un
weekend.

---

## ⚡ SESSION 13.1 — Touch feedback + glanceability fixes

**Tipo**: friction removal (90% CSS, 10% JS)
**Effort**: M (~1.5h)
**Dipendenze**: nessuna
**Outputs**: chiude i 4 gap che la review ha classificato 🔴+🟡 — è la
session minima da fare prima di un playtest pubblico.

### Tasks

#### A. 🔴 `:active` feedback nel card-detail modal

Il modal `card-detail` (S12.3) è il bottone più cliccato dell'esperienza
mobile (conferma pesca/scarta). In S12.5 ho aggiunto `:active` globale
ai bottoni primary, ma `.modal.card-detail .cd-actions button` vive in
un selector più specifico e non riceve la rule.

**Aggiungere** in [`styles/main.css`](styles/main.css), nel blocco card-detail:

```css
.modal.card-detail .cd-actions button:active:not(:disabled) {
  transform: scale(0.96);
  transition: transform 0.05s ease-out;
}
.modal.card-detail .cd-actions .cd-confirm.primary:active:not(:disabled) {
  background: var(--accent);
  border-color: var(--accent);
  filter: brightness(0.92);
}
.modal.card-detail .cd-actions .cd-confirm.warn:active:not(:disabled) {
  background: var(--warn);
  border-color: var(--warn);
  filter: brightness(0.92);
}
.modal.card-detail .cd-actions .cd-cancel:active:not(:disabled) {
  background: var(--paper-2);
}
.modal.card-detail .cd-close:active {
  background: var(--paper-2);
  transform: scale(0.95);
}
```

#### B. 🟡 Mostrare `.type-label` sui thumb

La review nota che la perdita del `type-label` ("Junior Dev", "Senior
Dev", "Tier B" etc.) sui thumb riduce la **glanceability** — devi
tappare per scoprire se una carta è high-tier. Industry leaders
(MTG Arena, 7 Wonders Duel) la mostrano sempre.

**Modificare** in [`styles/board.css`](styles/board.css), dentro il blocco
`@media (max-width: 600px)`:

```css
/* PRIMA: .pcard .card-mast .type-label era in display: none */
/* RIMUOVERE da quella lista, AGGIUNGERE nuova rule: */
.pcard .card-mast .type-label {
  display: inline;
  font-size: 7px;
  letter-spacing: 0.04em;
  /* abbreviato + ellisi se ancora troppo largo */
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
```

Per non sacrificare verticale, valutare se ridurre `name` da
line-clamp 2 → 2 con line-height 1 (~20px → 18px).

#### C. 🟡 Riordinare risorse per priorità decisionale

In [`js/render-masthead.js`](js/render-masthead.js) la funzione
`renderMobileResourcesStrip` ha l'array `items` nell'ordine schema
(budget, tempo, talento, dati, morale, techDebt). La review propone:

```js
// Riordinare a:
const items = [
  { k: "budget",   ... },   // 1° gate per pesca
  { k: "tempo",    ... },   // 2° gate
  { k: "morale",   ... },   // ↑ priorità: gate-a carte morale-dependent
  { k: "talento",  ... },   // capacità acquisita
  { k: "dati",     ... },   // defensive
  { k: "techDebt", ... },   // penalty, plan-around
];
```

Razionale: durante il pick, il giocatore decide nell'ordine
"posso permettermi → ho il tempo → mi cambia il morale?".
Mettere techDebt in fondo (è una conseguenza, non un input).

#### D. 🟡 Bumpare tap target del card-detail modal

In [`styles/main.css`](styles/main.css):

```css
/* PRIMA: min-height: 48px */
.modal.card-detail .cd-actions button { min-height: 52px; }

/* PRIMA: width/height: 32px */
.modal.card-detail .cd-close { width: 40px; height: 40px; font-size: 22px; }
```

Razionale review: 48px è guideline minima ma il modal ha padding interno
che riduce l'effective tap-zone. 52px copre la perdita; close X a 40px
sale dalla zona "below guideline" a "comfortable".

### Files

| File | Change |
|------|--------|
| `styles/main.css` | `:active` rules per card-detail (~20 LOC) + size bump |
| `styles/board.css` | rimuovere `.type-label` da `display: none`, aggiungere rule mobile (~6 LOC) |
| `js/render-masthead.js` | riordinare array `items` in renderMobileResourcesStrip |
| `sw.js` | bump `CACHE_VERSION` `sb-v4` → `sb-v5` |

### Acceptance criteria

- [ ] Tap su "Pesca" / "Scarta" / "Annulla" in card-detail → press
      animation visibile (scale 0.96)
- [ ] Tap su X close → press animation (scale 0.95) + bg paper-2
- [ ] Cards thumb mostrano "Junior", "Senior", etc. (type-label) sopra il
      nome, abbreviati con ellisi se troppo lunghi
- [ ] Resources strip ordine: 💰 ⏱ 🚀 🧠 📊 🐞
- [ ] Cd-actions buttons 52px alti, close X 40×40
- [ ] Desktop bit-identical (verifica: tutti i cambi vivono in
      `@media (max-width: 600px)` o aggiungono `:active` che era assente)

---

## 🧭 SESSION 13.2 — Discoverability: persistent turn + blind-pick cue

**Tipo**: information surfacing (CSS + lieve JS render)
**Effort**: M (~1.5h)
**Dipendenze**: nessuna
**Outputs**: due segnali importanti (di chi è il turno, quali carte
sono blind-pick) sono ora glanceable senza scroll né tap.

### Tasks

#### A. 🟢 Turn-indicator persistente

Oggi `makeTurnIndicator()` vive in `.pyramid-area > .stage-meta` —
quindi è dentro l'area board. Su phone, quando si scrolla giù per
vedere assets/sidebar/tableau, l'indicator scompare. In Hot Seat questo
è particolarmente fastidioso (devi sapere chi sta giocando ora).

**Approccio A — masthead-row injection** (preferito):
Aggiungere una micro-bar tra `progress-strip` e `mobile-resources-strip`
che mostri `[avatar piccolo] Nome · Ruolo · "Tocca a te" | "In attesa..."`.
Visibile solo su phone (CSS toggle).

**Modificare** [`js/render.js`](js/render.js):
```js
// Inserire nuovo render call DOPO renderProgress, PRIMA di renderMobileResourcesStrip:
app.appendChild(renderMobileTurnBar(localPlayer));   // nuovo
app.appendChild(renderMobileResourcesStrip(localPlayer));
```

**Nuovo helper** in [`js/render-masthead.js`](js/render-masthead.js):
```js
function renderMobileTurnBar(localPlayer) {
  const root = el("div", { class: "mobile-turn-bar" });
  const idx = state.activePicker;
  if (idx == null) return root;  // pre-pyramid phase
  const p = state.players[idx];
  const isMe = idx === state.localSlotIdx;
  // [avatar] Nome — "Tocca a te" / "In attesa di X..."
  // ... 12-15 LOC
  return root;
}
```

**CSS** [`styles/main.css`](styles/main.css) phone @media block:
```css
.mobile-turn-bar { display: none; }
@media (max-width: 600px) {
  .mobile-turn-bar {
    display: flex; align-items: center; gap: 8px;
    padding: 6px clamp(8px, 3vw, 28px);
    margin: 0 calc(-1 * clamp(8px, 3vw, 28px));
    border-bottom: 1px dashed var(--rule);
    background: var(--paper-3);
    font-family: var(--mono); font-size: 12px;
  }
  .mobile-turn-bar.is-me {
    background: linear-gradient(90deg, var(--accent) 0 4px, var(--paper-3) 4px);
  }
  .mobile-turn-bar .mtb-avatar { /* 22×22 */ }
  .mobile-turn-bar .mtb-name { font-weight: 600; }
  .mobile-turn-bar .mtb-status { color: var(--ink-soft); font-style: italic; }
}
```

#### B. 🟢 Blind-pick visual cue

I cards face-down d1/d2/d3 hanno il monogram pattern, ma quando uno è
**pickable** (tutto sotto è preso → sta diventando d0 al prossimo
reveal) è solo "una carta in più" sul board. La review nota che
sapere "questo è un blind-pick" è valore per i giocatori esperti.

**Modificare** [`styles/board.css`](styles/board.css), dentro phone
`@media`:
```css
/* Solo per face-down PICKABLE — gli altri restano "decorativi" */
.pcard.face-down.pickable.d0::after {
  content: "✨";
  font-size: 14px;
  position: absolute;
  top: 4px; right: 4px;
  z-index: 5;
  filter: drop-shadow(0 0 2px rgba(193, 154, 61, 0.6));
  pointer-events: none;
  animation: blindSparkle 2s ease-in-out infinite;
}
@keyframes blindSparkle {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.15); }
}
body.reduced-motion .pcard.face-down.pickable.d0::after {
  animation: none;
  opacity: 0.7;
}
```

Solo `.pickable.d0` per non mettere sparkle su carte ancora "dietro".

#### C. 🟢 320px fallback documentation

Aggiungere una nota in [`MOBILE-ROADMAP.md`](MOBILE-ROADMAP.md) sezione
"Open follow-ups": **320px non è target ufficiale, ma documentiamo il
fallback per chi vuole supportarlo**.

```markdown
### 320px fallback (sub-target)

iPhone 5/SE classico ha viewport 320px. Le rule attuali shrinkano a 48px
(clamp floor) ma 6×48 + 5×1 + 0 padding = 293, fits 320 - 0 (#app
breakout) = 320 ✓. La tipografia compatta diventa molto stretta.

**Strategia raccomandata se serve target ufficiale**:
- Reduce d0 floor a 44 (e proporzionali per d1-d3)
- Ridurre `name` font-size a 9px (was 10)
- Eventualmente rimuovere il `.type-label` re-introduced in S13.1A
- Documentare come "supported but compact"
```

### Files

| File | Change |
|------|--------|
| `js/render-masthead.js` | nuovo `renderMobileTurnBar()` (~25 LOC) |
| `js/render.js` | call al nuovo render in posizione corretta |
| `styles/main.css` | rule `.mobile-turn-bar` con phone media query |
| `styles/board.css` | sparkle pseudo-element + keyframe + reduced-motion |
| `MOBILE-ROADMAP.md` | sezione 320px fallback in Open follow-ups |
| `sw.js` | bump cache `sb-v5` → `sb-v6` |

### Acceptance criteria

- [ ] Su phone, sopra la resources strip vedo "Sta giocando: [avatar] Marco · ⏳ in attesa..."
- [ ] Quando tocca a me, la bar diventa "Tocca a te! 🎯" con accento sinistro accent
- [ ] Carte face-down pickable (di solito d0 dopo che si peeala il livello sotto) hanno una piccola sparkle ✨ animata
- [ ] Reduced-motion utenti: sparkle fissa (no animation)
- [ ] Desktop invariato (display:none)

---

## 🪑 SESSION 13.3 — Hot Seat phone pacing

**Tipo**: UX polish per modalità specifica
**Effort**: M (~2h)
**Dipendenze**: nessuna (ma incompatibile in parallelo con S13.1 perché
entrambe potenzialmente toccano `render-hotseat.js`)
**Outputs**: il pass-screen Hot Seat su phone diventa un "moment" — il
nuovo player non vede istantaneamente la mossa precedente, ha 1s di
"reveal delay", sa chi gioca dopo, riceve una notifica visuale del
passaggio.

### Tasks

#### A. 🟢 Reveal delay (1s) prima del board nuovo

Quando il pass-screen modal si chiude, oggi il board è già aggiornato
con la mossa precedente (carta presa, reveal della successiva). Il
nuovo player vede tutto subito. La review propone un breve delay
"pre-reveal" così il pass diventa un "moment of surprise".

**Modificare** [`js/render-hotseat.js`](js/render-hotseat.js)
funzione `showPassScreenModal`:

```js
// PRIMA del root.remove() in onAcknowledge:
const onAcknowledge = () => {
  // Add a "veil" overlay that briefly hides the board
  const veil = document.createElement("div");
  veil.className = "hs-pass-veil";
  document.body.appendChild(veil);

  root.classList.add("dismissing");
  setTimeout(() => root.remove(), 240); // existing slide-out

  // After modal gone, hold the veil 700ms then fade
  setTimeout(() => {
    veil.classList.add("fade-out");
    setTimeout(() => veil.remove(), 400);
    if (typeof onAcknowledgeOriginal === "function") onAcknowledgeOriginal();
  }, 240 + 700);
};
```

CSS per `.hs-pass-veil`:
```css
.hs-pass-veil {
  position: fixed; inset: 0; z-index: 9998;
  background: var(--paper);
  background-image: /* same noise texture */ ;
  opacity: 0.95;
  transition: opacity 0.4s ease-out;
}
.hs-pass-veil.fade-out { opacity: 0; }
```

Solo su phone (`(max-width: 600px)`) — su desktop il pass-screen è già
abbastanza "ceremonioso", il veil sarebbe overkill.

#### B. 🟢 "Up next" indicator nel pass-screen

Oggi il pass-screen mostra "Tocca a [Marco]". La review propone di
aggiungere "**Up next:** Alessia" così i giocatori percepiscono il
ritmo del giro.

**Modificare** [`js/render-hotseat.js`](js/render-hotseat.js) nel
template del pass-screen:

```js
// Calcolare il next-after-current usando state.pickOrder + pickIndex
const nextAfter = ...
const ps = el("div", { class: "ps-up-next" });
ps.appendChild(el("span", { class: "ps-up-label" }, "Up next:"));
ps.appendChild(el("span", { class: "ps-up-name" }, nextAfterName));
ps.appendChild(el("span", { class: "ps-up-avatar" }, nextAfterInitial));
```

CSS posizionato sotto la mini-classifica:
```css
.modal.pass-screen .ps-up-next {
  display: flex; align-items: center; gap: 6px;
  margin-top: 12px; padding-top: 8px;
  border-top: 1px dashed var(--rule);
  font-family: var(--mono); font-size: 11px;
  color: var(--ink-muted);
}
.modal.pass-screen .ps-up-name { color: var(--ink); font-weight: 600; }
```

#### C. 🟢 Audio cue al pass

Oggi `sndPassScreen` (3-note chime in audio.js) suona QUANDO il
pass-screen si apre. La review propone aggiungere un **secondo cue**
quando il giocatore acknowledge il pass (premendo "Tocca a me"), per
ribadire "ok, sei tu adesso".

**Aggiungere** in [`js/audio.js`](js/audio.js):
```js
function sndPassConfirm() {
  // Single "ding" descendente — meno cerimonioso del 3-note iniziale
  if (!getAudioEnabled()) return;
  unlockAudio();
  // ~80 LOC tra noteC4 + noteG4 ascending pair
}
```

E chiamarlo nell'onAcknowledge del pass-screen (prima del veil
in 13.3.A).

#### D. 🟢 Document hapticpass come post-Phase-13 follow-up

La review nota che Vibration API darebbe il "feel" definitivo del pass
(buzz quando passi il telefono). L'utente in MOBILE-ROADMAP ha esplicitamente
escluso vibration per V1. Mantieniamo escluso, ma documentiamo come
"Phase 14+ candidate" in `MOBILE-POLISH-ROADMAP.md` open follow-ups.

### Files

| File | Change |
|------|--------|
| `js/render-hotseat.js` | veil overlay logic in `showPassScreenModal`, "Up next" in template |
| `js/audio.js` | nuovo `sndPassConfirm` |
| `styles/main.css` | `.hs-pass-veil` + `.ps-up-next` styling |
| `sw.js` | bump cache `sb-v6` → `sb-v7` |

### Acceptance criteria

- [ ] Hot Seat 2+ umani: dopo "Tocca a me", il modal scompare ma il board
      resta "velato" (paper opaco) per ~700ms, poi rivela
- [ ] Pass-screen include riga "Up next: [avatar] Alessia" sotto la mini-classifica
- [ ] Audio cue su acknowledge (sndPassConfirm) — distinto dal cue iniziale
      di apertura
- [ ] Single-human Hot Seat (degrade): nessun veil, no "Up next" (passing skipped)
- [ ] Reduced-motion: il veil rimane presente ma senza fade transition

---

## 🗺️ Dependency graph

```
S13.1 (touch + glanceability)  ──┐
                                  │
S13.2 (turn-bar + blind-cue)   ──┼── all deployed before next playtest
                                  │
S13.3 (hot-seat pacing)        ──┘
```

**Critical path**: S13.1 da fare prima di qualsiasi playtest pubblico
(la review l'ha classificata "removes the 2 most likely friction points
in week 1").

S13.2 e S13.3 indipendenti, possono partire in parallelo dopo S13.1
(ma in pratica solo se l'agent/dev sa lavorare su due file diversi
contemporaneamente).

---

## 📐 Definition of Done — Phase 13

Phase 13 è **DONE** quando:

1. ✅ S13.1: tutti i 4 punti (active feedback, type-label, ordine
   risorse, tap target bumps) verificati su iPhone 16 + iPhone SE
2. ✅ S13.2: turn-bar visibile in cima alla view phone in ogni momento
   non-modale; sparkle blind-pick visibile sui pickable face-down
3. ✅ S13.3: pass-screen con veil + up-next + audio cue
4. ✅ Cache bumpato (`sb-v7`); README sezione "📱 Mobile / PWA"
   aggiornata con le nuove micro-feature
5. ✅ 58/58 test pass (game logic invariata)
6. ✅ Desktop visivamente bit-identical (verifica con screenshot diff)
7. ✅ CHANGELOG entry per S13.1, S13.2, S13.3
8. ✅ MOBILE-POLISH-ROADMAP.md (questo file) marca tutte le session ✅

---

## 🤔 Open follow-ups (post-Phase-13, candidate Phase 14+)

Items che la review ha menzionato ma sono fuori dal V1 polish:

- **Vibration API** per pass haptic feedback (Hot Seat) — utente già
  esplicitamente "no per V1" in design Phase 12, mantieni esclusione
  ma documenta candidate Phase 14
- **Wake Lock API** per evitare screen-off durante partite lunghe
- **Web Share API** per condividere room code via system share menu
- **Deep linking** `https://...?join=ABCD` per join via WhatsApp/Telegram
- **PWA Install banner** custom (oggi i prompt sono passive iOS / banner
  Android default)
- **Sostituzione SVG placeholder** con asset finale + apple-touch-icon
  PNG dedicato (oggi punta allo stesso SVG)
- **320px target ufficiale** se i dati uso lo giustificano
- **Lighthouse audit** + ottimizzazioni performance (PWA score, A11y)
- **Pass-screen 3D card flip animation** invece del veil semplice
  (richiede `transform-style: preserve-3d`, complex)

---

## 🎮 Quando iniziare?

Suggerito: **una sera dedicata** per S13.1 (~1.5h) + bug-bash di
verifica. Poi un **weekend successivo** per S13.2 + S13.3 (~3.5h)
combinandole con un playtest reale Hot Seat 2-4 amici.

Alternativa **express** (1 sera intera, ~5h tutto):
1. S13.1 (1.5h)
2. S13.2 (1.5h)
3. S13.3 (2h)
4. Push + smoke test su iPhone reale

**Effort totale Phase 13**: ~5h V1 polish completo.

---

_Roadmap stilata 2026-04-30 dopo review esterna critica del design
mobile post-Phase-12. Le 9 issue identificate (1 🔴, 3 🟡, 5 🟢) sono
state raggruppate in 3 session tematiche (touch+glanceability,
discoverability, Hot Seat pacing). Tutte le issue 🔴+🟡 sono in S13.1
("must do" prima del prossimo playtest); le 🟢 in S13.2/S13.3 hanno
priorità minore ma alto valore percepito._
