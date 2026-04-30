# Stack & Balance — Mobile Roadmap (Phase 12)

> **Tipo**: feature trasversale, tocca tutti i layer di rendering ma non
> cambia game logic.
> **Obiettivo**: rendere il gioco **first-class** su smartphone portrait
> (iPhone SE 375px → iPhone Pro Max ~430px) e tablet portrait (iPad ~768px),
> mantenendo il desktop attuale invariato.
> **Origine**: chiesta dall'utente dopo Phase 11 (Hot Seat).
> **Natura**: layer aggiuntivo — single-player, P2P MP e Hot Seat restano
> tutti accessibili e completamente giocabili da mobile.

---

## 🎯 Vision

Permettere di giocare **una partita intera da telefono** — sia da soli
(single-player), sia in P2P MP (ognuno dal proprio device), sia in Hot Seat
(passandosi il telefono come un party game tascabile). Niente compromessi
di leggibilità: a ogni breakpoint il gioco resta giocabile e bello.

**Differenziatori vs "responsive base"**:
- Non è solo "le modali si adattano". È un **redesign del board** per
  schermi piccoli, con interaction model nativo touch (tap-to-detail).
- PWA installabile (manifest + service worker minimale) → "Add to Home
  Screen" su iOS/Android, partita completa giocabile offline (in
  single-player; MP richiede ovviamente la rete).
- Pattern industry-standard: stesso approccio di **7 Wonders Duel mobile**,
  **Hearthstone**, **MTG Arena** — thumbnails leggibili sul board, dettaglio
  fullscreen al tap per la conferma.

**Non-goals** (esplicitamente fuori scope V1):
- ❌ **Landscape phone**: portrait-only. Sotto 900px in landscape mostriamo
  un overlay "ruota in verticale". Tablet/desktop landscape restano OK.
- ❌ **Vibration API** per haptic feedback (valutiamo dopo, è un nice-to-have).
- ❌ **Push notifications** via service worker (out of scope, niente backend).
- ❌ **Offline-first per MP**: MP per natura è online; la PWA sarà offline-capable
  solo per single-player + Hot Seat.
- ❌ **Native app (Capacitor / Cordova)**: PWA è sufficiente per il caso d'uso
  e mantiene zero-build / zero-deps.
- ❌ **Custom touch gestures** (swipe, pinch-zoom). Tap + scroll standard.

---

## 🌐 Architettura tech

### Strategia generale: progressive enhancement

Il desktop **non si tocca** in S12.1-S12.5. Tutte le rules CSS mobile
vivono dentro `@media (max-width: 600px)` (phone) o
`@media (max-width: 900px)` (tablet/big-phone). Niente refactor del
codice esistente — solo override.

L'unica eccezione è S12.3 (tap-to-detail overlay): aggiunge un nuovo modal
e un piccolo wrapping in `render-pyramid.js`/`humanPickCard` con feature
detection runtime — ma il flusso desktop passa dritto come prima.

### Breakpoint system

Tre fasce, esplicite e poche:

| Nome | Range | Target tipici | Layout |
|------|-------|--------------|--------|
| **Phone** | `≤ 600px` | iPhone SE/12/14/15, Pixel 6, Galaxy S | Mobile-first, thumbs piramide, tap-to-detail |
| **Tablet** | `601-900px` | iPad portrait, iPad mini, Surface Go | Layout desktop scalato, no detail-overlay obbligatorio |
| **Desktop** | `≥ 901px` | Tutto il resto | Identico a oggi |

Niente CSS custom properties per i breakpoint (non funzionano dentro
`@media`). Hardcoded `600px` e `900px` ovunque, allineati a un commento
all'inizio di `main.css` che li dichiara come "single source of truth".

Per JS che deve sapere il breakpoint corrente:

```js
const isMobileViewport = () =>
  window.matchMedia("(max-width: 600px)").matches;
const isTabletViewport = () =>
  window.matchMedia("(max-width: 900px)").matches;
```

Re-evaluato ad ogni call (matchMedia è cheap, non c'è bisogno di cache).

### Touch / hover detection

Per disambiguare "device touch" da "device con mouse" usiamo:

```css
@media (hover: none) and (pointer: coarse) { /* solo touch */ }
@media (hover: hover) { /* mouse — preserva :hover esistente */ }
```

Tutti i `:hover` con feedback visivo vengono **wrappati** in `(hover: hover)`,
così su touch non si attivano (sticky hover dopo tap) e si fornisce un
sostituto via `:active` o via overlay esplicito.

### Pattern: tap-to-detail (S12.3)

Su phone (≤ 600px), tap su qualunque carta della piramide apre un nuovo
modal **fullscreen** (90vw × 90vh) con:

- Big card art al centro (~70% width modal)
- Sotto: nome, dipartimento, costo completo, effetto, chain icons,
  tier metadata
- Bottom action bar fissa:
  - Carta **pickable** + affordable: `← Annulla` + `🃏 Pesca`
  - Carta **pickable** + non-affordable: `← Annulla` + `❌ Scarta (+2 💰)`
  - Carta non-pickable (dietro o presa): solo `← Chiudi`

Il modal è un nuovo file `js/render-card-detail.js` (S12.3). Su desktop
e tablet il flusso resta diretto (click → `humanPickCard` immediate).

### PWA architecture (S12.6)

Files nuovi:
- `manifest.json` — app name, icon set, theme/bg color, `display: "standalone"`,
  `orientation: "portrait"`
- `sw.js` — service worker con cache-first per asset statici (HTML, CSS,
  JS, fonts), bypass per requests di rete (PeerJS signaling).
- `icons/` — directory nuova con `icon-192.png`, `icon-512.png`,
  `apple-touch-icon-180.png`. Design: typographic mark "S&B" su sfondo
  paper. **Asset da generare** (vedi S12.6 "Open question").

Registrazione:
```html
<!-- index.html, prima di </body> -->
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#faf6ef">
<meta name="apple-mobile-web-app-capable" content="yes">
<link rel="apple-touch-icon" href="icons/apple-touch-icon-180.png">
<script>
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("sw.js").catch(console.warn));
  }
</script>
```

### State invariants (cosa non cambia)

- Game logic: **invariata**. `state` schema, `processNextPick`,
  `humanPickCard`, AI loop, ending — tutto identico.
- Rendering: i render funcs (`renderPyramid`, `renderTableau`,
  `renderSidebar`, `renderMasthead`) emettono lo **stesso DOM**. È solo
  il CSS a riadattare visualmente, e la handler-chain si arricchisce di
  un wrap su mobile.
- Single-player, P2P MP, Hot Seat: tutti e tre i mode girano su mobile
  con la stessa architettura. Nessun fork.

---

## 📅 Macro-timeline (6 sessions · ~13h totali, V1 full-scope)

| Session | Tema | Effort | Stato |
|---------|------|-------:|------:|
| **S12.1** | Foundational shell + breakpoint system | S (~1.5h) | ✅ Done · 2026-04-30 |
| **S12.2** | Pyramid responsive (thumbs + grid scaling) | M (~2.5h) | ✅ Done · 2026-04-30 |
| **S12.3** | Tap-to-detail card overlay | M (~2.5h) | ✅ Done · 2026-04-30 |
| **S12.4** | Modali + form + input mobile-friendly | M (~2h) | ✅ Done · 2026-04-30 |
| **S12.5** | Touch UX (`:active`, `(hover: none)`, tap targets) | S (~1.5h) | ✅ Done · 2026-04-30 |
| **S12.6** | PWA manifest + service worker + portrait-lock + testing | M (~3h) | ✅ Done · 2026-04-30 |

**Critical path**: S12.1 → S12.2 → S12.3 (board mobile completo).
S12.4/S12.5 partono in parallelo dopo S12.1. S12.6 alla fine —
richiede asset (icons) e device testing reale.

---

## 📐 SESSION 12.1 — Foundational shell + breakpoint system ✅ Done · 2026-04-30

**Tipo**: foundation (CSS-only)
**Effort**: S (~1.5h)
**Dipendenze**: nessuna
**Outputs**: il sito non sembra rotto su mobile, anche se l'esperienza è
ancora identica al desktop scalato. Pone la base per S12.2-S12.5.

### Tasks

1. **Top-of-file comment in `main.css`**: documenta i 3 breakpoint
   (`600px` phone, `900px` tablet/below) come "single source of truth".
2. **`#app` overflow + width**: aggiungere `overflow-x: hidden` per
   evitare scroll orizzontale parassita.
3. **Body padding fluid**: `padding: clamp(8px, 3vw, 28px) clamp(8px, 3vw, 28px) 64px`.
   A 375px diventa ~11px di lato; a 1480px resta 28px.
4. **Tipografia fluida globale**:
   ```css
   :root { font-size: clamp(14px, 1.5vw + 8px, 16px); }
   ```
   Effetto: a 375px = 14px (compatto), a 1024px = 16px (full readability).
   Niente cambi alle classi specifiche.
5. **Headline scaling**: i `h1`, `.masthead h1`, `.modal h2` ottengono
   `font-size: clamp(...)` invece dei 38px / 28px / 22px fissi.
6. **`<meta name="theme-color">`** nell'head — colore paper `#faf6ef`
   per la status bar Android/iOS PWA.
7. **iOS safe-area inset**: aggiungere `padding-top: env(safe-area-inset-top)`
   al body via CSS, così la PWA installata non finisce sotto la notch.

### Files

| File | Change |
|------|--------|
| `index.html` | nuovo `<meta name="theme-color">`, già presente viewport |
| `styles/main.css` | top-of-file breakpoint comment, body/`#app` adjustments, fluid typography |

### Acceptance criteria

- [ ] Apertura del gioco su iPhone (Safari iOS) — niente scroll orizzontale,
  splash leggibile, tutti i bottoni cliccabili (anche se layout non ottimizzato).
- [ ] Apertura su iPad portrait — layout identico al desktop, scrollabile
  se necessario.
- [ ] Desktop (≥ 1024px) — **bit-identical visualmente** allo stato pre-S12.

### Note di design

Niente `*, *::before, *::after { box-sizing: border-box }` reset — è già
ereditato. Niente normalize / reset library — il progetto è vanilla, manteniamolo
così.

Le modali grandi (Vision/OKR `1080px`, scenarios `1080px`) **fanno overflow
orizzontale** in S12.1 (nessuna media query ancora). È previsto: si
risolvono in S12.4. S12.1 è solo "non rompere niente".

---

## 🔺 SESSION 12.2 — Pyramid responsive (thumbs + grid scaling) ✅ Done · 2026-04-30

**Tipo**: layout work (CSS-only, niente JS)
**Effort**: M (~2.5h)
**Dipendenze**: S12.1
**Outputs**: piramide leggibile su iPhone SE (375px) — carte ridotte ma
con segnale sufficiente (icona + dipartimento + nome compresso + costo).

### Concept layout phone (≤ 600px)

```
┌────────────────────────────────────┐
│  Quarter 1 · Talento 4 · Tempo 6   │  ← masthead compatta
├────────────────────────────────────┤
│ ┌──┬──┬──┬──┬──┬──┐                │
│ │d3│d3│d3│d3│d3│d3│ ← face-down    │
│ ├──┼──┼──┼──┼──┼──┤                │
│ │d2│d2│d2│d2│d2│d2│ ← face-up      │
│ ├──┼──┼──┼──┼──┼──┤                │
│ │d1│d1│d1│d1│d1│d1│ ← face-down    │
│ ├──┼──┼──┼──┼──┼──┤                │
│ │D0│D0│D0│D0│D0│D0│ ← pickable     │
│ └──┴──┴──┴──┴──┴──┘                │
│      Sidebar tableau (scroll ↓)    │
└────────────────────────────────────┘
```

### Tasks

1. **`.pyramid` mobile media query** in `board.css`:
   ```css
   @media (max-width: 600px) {
     .pyramid { gap: 4px; padding: 6px 2px 0; min-height: 200px; }
     .pcol { height: 180px; }  /* da 300 → 180 */
   }
   ```

2. **`.pcard` mobile sizing** — nuove altezze + max-width per ogni layer:
   ```css
   @media (max-width: 600px) {
     .pcard.d0 { max-width: 56px; height: 130px; padding: 4px 3px 6px; }
     .pcard.d1 { max-width: 50px; height: 24px; bottom: 124px; }
     .pcard.d2 { max-width: 44px; height: 16px; bottom: 152px; }
     .pcard.d3 { max-width: 38px; height: 10px; bottom: 170px; }
   }
   ```

3. **Hide non-essential card content** (delegato al detail overlay):
   ```css
   @media (max-width: 600px) {
     .pcard .pcard-effect-text,
     .pcard .pcard-chain-icons,
     .pcard .pcard-tier-meta { display: none; }
     .pcard .pcard-name { font-size: 9px; line-height: 1.1; }
     .pcard .pcard-cost { font-size: 10px; }
     .pcard .pcard-dept-icon { width: 16px; height: 16px; }
   }
   ```

4. **Tablet (601-900px) scaling**: una via di mezzo — riduce le carte ~25%
   senza nascondere dettagli:
   ```css
   @media (min-width: 601px) and (max-width: 900px) {
     .pcard.d0 { max-width: 120px; height: 175px; }
     /* ... d1/d2/d3 proporzionali ... */
   }
   ```

5. **Pickable visual cue**: la border-bottom accent (oggi 2.5px) diventa
   3px su mobile per restare visibile a thumb size.

6. **Selettori pcard-* effettivi** — controllare prima i class names
   correnti emessi da `render-pyramid.js`. Se non ci sono `.pcard-name`,
   `.pcard-cost`, etc. (ma per esempio innerHTML diretto), va aggiunto
   un wrapping minimale a render-pyramid.js (rare cambio; preferire CSS-only
   se possibile usando `:has()` o positional selectors).

### Files

| File | Change |
|------|--------|
| `styles/board.css` | nuove media query per `.pyramid`, `.pcol`, `.pcard.d0-d3`, contenuto carta |
| `js/render-pyramid.js` (forse) | wrapping CSS-friendly dei sub-elementi se non già presente |

### Acceptance criteria

- [ ] iPhone SE 375px portrait: la piramide ci sta interamente in larghezza
  (6 colonne × ~56px + 5 gap × 4px = ~356px, dentro i ~360px utili).
- [ ] Cards leggibili: dipartimento (colore + icona), nome (compresso ma
  identificabile), costo principale visibile.
- [ ] Effetto/descrizione **non visibili** sul thumb (delegate a S12.3 detail).
- [ ] Tablet portrait (768px): layout fluido, tutto leggibile senza
  detail overlay obbligatorio.
- [ ] Desktop (≥ 901px): visualmente identico a pre-S12.

### Open question

A 320px (iPhone 5/SE old, < 1% market): 6 colonne × 50px = 300px, OK al
limite. **Non target ufficiale** ma vediamo se non rompe. Se rompe, valuta
overflow-x scroll-snap come fallback documentato.

---

## 🃏 SESSION 12.3 — Tap-to-detail card overlay ✅ Done · 2026-04-30

**Tipo**: feature (nuovo modal + interaction wrapping)
**Effort**: M (~2.5h)
**Dipendenze**: S12.2 (per avere thumbs reali da tappare)
**Outputs**: tap su qualsiasi carta del board su phone apre un overlay
fullscreen con dettagli completi e action bar. Conferma esplicita per
pesca/scarta. Desktop e tablet: comportamento invariato.

### Modal structure

```
┌────────────────────────────────────┐
│ ←                          ✕       │ ← header (back + close)
│        ┌──────────────────┐        │
│        │                  │        │
│        │   BIG CARD ART   │        │
│        │   (~280×360)     │        │
│        │                  │        │
│        └──────────────────┘        │
│                                    │
│   Senior Developer                 │ ← name (display font)
│   Engineering · Tier B             │ ← dept + tier
│                                    │
│   💰 5  ⏱ 2  👥 1                 │ ← costs (full)
│   +3 K MAU, +1 dato                │ ← effect
│   ⛓ Chain: Junior Dev → -2 💰     │ ← chain (if applicable)
│                                    │
│  ──────────────────────────────    │
│   ← Annulla         🃏 Pesca →    │ ← action bar (sticky bottom)
└────────────────────────────────────┘
```

### Function signature

```js
// js/render-card-detail.js (nuovo file ~140 LOC)
function showCardDetailModal({
  row, col, slot,           // pyramid coordinates
  isPickable,               // bool (state.phase === "human" && isPickable(row,col))
  canAfford,                // bool (canAfford(player, slot.card))
  onConfirm,                // () => void  — l'utente conferma, parte humanPickCard
  onCancel,                 // () => void  — esce senza azione (default: just close)
}) { ... }
```

Il modal:
- Renderizza il card-art via la stessa funzione che fa il render-pyramid
  (estratta in helper riutilizzabile, evita duplicazione).
- Mostra costo / effetto / chain testo completo da `slot.card.*`.
- Action bar in basso: `← Annulla` + `🃏 Pesca` se affordable, `❌ Scarta`
  se non-affordable (riusa lo stesso flow `humanPickCard` che decide
  internamente play vs discard via `canAfford`).
- ESC su desktop chiude (per consistency anche se l'overlay non si attiva
  su desktop ≥ 600px).

### Wrap nel handler pyramid

In `render-pyramid.js`, dove oggi:

```js
const onClick = interactive
  ? (ev) => humanPickCard(row, col, ev.currentTarget)
  : null;
```

Diventa:

```js
const onClick = interactive
  ? (ev) => onPyramidCardTap(row, col, ev.currentTarget)
  : null;

function onPyramidCardTap(row, col, cardEl) {
  if (typeof isMobileViewport === "function" && isMobileViewport()) {
    const slot = state.pyramid[row][col];
    const player = state.players[state.localSlotIdx];
    const pickable = state.phase === "human" && isPickable(row, col) && !slot.taken;
    showCardDetailModal({
      row, col, slot,
      isPickable: pickable,
      canAfford: pickable && canAfford(player, slot.card),
      onConfirm: () => humanPickCard(row, col, cardEl),
    });
  } else {
    humanPickCard(row, col, cardEl);
  }
}
```

`humanPickCard` resta invariata. Il wrap è limitato all'entry point.

Edge case: se l'utente tappa una carta non-pickable, `humanPickCard` oggi
fa early-return silenzioso. Su mobile vogliamo aprire comunque il detail
(read-only) — quindi il wrap apre l'overlay anche se `pickable=false`,
con action bar ridotta a "Chiudi".

### Cross-mode behavior

- Single-player: detail-overlay attivo, conferma → `humanPickCard` locale.
- P2P MP (host o client): detail-overlay attivo. Conferma:
  - Host: `humanPickCard` → mpBroadcastState (via il path esistente).
  - Client: `humanPickCard` → `mpSendToHost` (path esistente).
- Hot Seat: detail-overlay attivo. Conferma → `humanPickCard` locale,
  che procede con la rotation di `localSlotIdx` come oggi.

Nessuno dei tre modi richiede branching in `showCardDetailModal`.

### Files

| File | Change |
|------|--------|
| `js/render-card-detail.js` (NEW) | `showCardDetailModal()` |
| `js/render-pyramid.js` | wrap `onClick` con `onPyramidCardTap` |
| `js/util.js` | `isMobileViewport()`, `isTabletViewport()` helpers |
| `index.html` | `<script src="js/render-card-detail.js">` (after render-modals.js) |
| `styles/main.css` | `.modal.card-detail` styling (fullscreen, action bar sticky) |

### Acceptance criteria

- [ ] Phone: tap su carta pickable apre overlay → "Pesca" → carta presa,
  overlay chiuso, render aggiornato.
- [ ] Phone: tap su carta non-affordable apre overlay → "Scarta" funziona
  (refund +2 budget, +1 tech debt come oggi).
- [ ] Phone: tap su carta dietro (d2, d3) apre overlay con dettaglio,
  bottone "Chiudi" come unica azione.
- [ ] Desktop ≥ 601px: tap diretto, **niente overlay**. Stesso behavior
  di pre-S12.
- [ ] Switch live: ridimensionando la finestra (es. dev tools) sotto 600px
  il next-tap apre overlay; sopra 600px no. Funziona senza reload.
- [ ] Hot Seat su phone: pass-screen → tap carta → detail overlay → pesca →
  chiusura → next pass-screen. Tutto fluido.

### Sound design

Riusa `sndPick` per "Pesca" confermato, `sndDiscard` (se esiste) per
"Scarta". Apertura overlay: nessun suono (rumoroso). Chiusura via Annulla:
nessun suono. Niente nuovi audio asset.

---

## 📋 SESSION 12.4 — Modali + form + input mobile-friendly ✅ Done · 2026-04-30

**Tipo**: layout + UX work (CSS + lieve JS sui form)
**Effort**: M (~2h)
**Dipendenze**: S12.1 (può partire in parallelo a S12.2)
**Outputs**: tutte le modali (Scenario, Vision, OKR, Multiplayer Entry,
Hot Seat Lobby, Market News, Final Sequence, End Game) si adattano a
phone portrait senza overflow orizzontale e senza bottoni tagliati.

### Tasks

1. **Modal sizing fluido**: per ogni `.modal.<X>` con `max-width >= 700px`,
   override mobile:

   ```css
   @media (max-width: 600px) {
     .modal { max-width: 95vw; max-height: 92vh; padding: 16px 14px; }
     .modal.scenario-chooser,
     .modal.vision-draft,
     .modal.okr-draft,
     .modal.market-news,
     .modal.investor-pitch,
     .modal.mp-entry,
     .modal.mp-join,
     .modal.mp-lobby,
     .modal.hotseat-lobby { max-width: 95vw; }
   }
   ```

2. **Option grids collapse**: tutte le grid `1fr 1fr` o `1fr 1fr 1fr`
   diventano `1fr` sotto 600px:

   ```css
   @media (max-width: 600px) {
     .scenario-options-grid,
     .vision-options-grid,
     .okr-options-grid,
     .mp-options-grid,
     .hs-slots-grid { grid-template-columns: 1fr; gap: 10px; }
   }
   ```

3. **Hot Seat lobby**: la 2×2 grid degli slot diventa 1×4 verticale,
   altezza ridotta per stare sopra la fold (~640px).

4. **Pass-screen modal (Hot Seat)**: già fullscreen, ma su phone l'avatar
   `ps-avatar-large` (oggi ~100px) può salire a ~140px per impatto
   visivo, e la mini-classifica si compatta.

5. **Card detail overlay** (S12.3): già designed mobile-first; nessun
   override desktop necessario perché l'overlay non si apre su desktop.

6. **Input UX**:
   - **Tutti i text input**: `font-size: 16px` minimo (sotto, iOS auto-zooms
     al focus). Verifica current sizes (oggi sono 14-15px in vari posti).
   - **Room code** (mp-join): `inputmode="text"`, `autocapitalize="characters"`,
     `autocomplete="off"`, `enterkeyhint="go"`. Già `text-transform: uppercase`
     in CSS — manteniamo, ma documentiamo che il `value` letto è
     già toUpperCase'd in JS.
   - **Player name** (profile + lobby): `autocapitalize="words"`,
     `autocomplete="nickname"`.
   - **Numeric inputs** (se presenti): `inputmode="numeric"` per mostrare
     tastiera numerica.

7. **Action bar bottoni**: `min-height: 44px` su mobile per rispettare
   guideline tap-target Apple/Google. Tutti i `.actions button` ricevono
   l'override sotto 600px.

### Files

| File | Change |
|------|--------|
| `styles/main.css` | media query block dedicato a modali responsive (~80 LOC) |
| `js/render-multiplayer.js` | `inputmode`/`autocapitalize` su `#mpRoomCodeInput`, `#mpJoinNameInput` |
| `js/render-profile.js` | `autocapitalize="words"` su input nome profilo |
| `js/render-hotseat.js` | `autocapitalize="words"` su input nome slot umani |

### Acceptance criteria

- [ ] iPhone SE: ogni modal apre senza scrollbar orizzontale, padding
  visibile, tutti i bottoni tappabili.
- [ ] Vision/OKR draft: 3 opzioni in 1 colonna verticale, scrollabili
  se non entrano tutte (acceptable).
- [ ] Hot Seat lobby: 4 slot configurazione visibili scrollando, scenario
  selector + difficulty selector + start button raggiungibili.
- [ ] Room code input: tastiera mobile mostra letter-keys uppercase
  (autocapitalize=characters).
- [ ] Tap su input: niente zoom iOS (font-size ≥ 16px confermato).
- [ ] Desktop: modali invariate.

---

## 👆 SESSION 12.5 — Touch UX (`:active`, `(hover: none)`, tap targets) ✅ Done · 2026-04-30

**Tipo**: UX polish (CSS + minimi JS)
**Effort**: S (~1.5h)
**Dipendenze**: S12.1
**Outputs**: nessuno sticky-hover su touch, feedback `:active` chiaro,
tap target ≥ 44×44px su mobile.

### Tasks

1. **Wrap esistenti `:hover` in `(hover: hover)`**: scan `main.css` /
   `board.css` / `player.css` per ogni rule con `:hover`. Per ogni rule
   con feedback puramente visivo (es. lift card on hover):

   ```css
   /* before */
   .pcard.d0.pickable:hover { transform: translateX(-50%) translateY(-3px); }

   /* after */
   @media (hover: hover) {
     .pcard.d0.pickable:hover { transform: translateX(-50%) translateY(-3px); }
   }
   ```

   **Lista hover-states identificati nell'audit**:
   - `.pcard.d0.pickable:hover` (board.css)
   - `.profile-chip:hover` (main.css)
   - `.modal .vision-option-card:hover/:focus`
   - `.modal .okr-option-card:hover/:focus`
   - `.modal .scenario-option-card:hover`
   - `.modal .mp-option-card:hover/:focus`
   - `.hs-slot:hover` (hotseat lobby)
   - `button:hover` globale

2. **Aggiungere `:active` parallelo** dove serve press-feedback su touch:

   ```css
   .pcard.d0.pickable:active { transform: translateX(-50%) scale(0.96); }
   .modal .vision-option-card:active { transform: scale(0.98); border-color: var(--accent); }
   /* ... etc per tutti gli option-card */
   button:active { background: var(--ink); color: var(--paper); }
   ```

3. **Tap target sizing** (`min-height: 44px`):
   - Splash buttons (Daily Run, Multiplayer, Profilo)
   - `.actions button` in tutti i modali
   - Hot Seat slot toggle (`.hs-toggle`)
   - Scenario card (già grandi per via di icon+name)

4. **Disabilita user-select sui controlli** che non sono testo:
   `.pcard, .pcol, button { user-select: none; -webkit-tap-highlight-color: transparent; }`
   (alcuni già presenti, verifica completezza).

5. **iOS bounce / overscroll** sulle modali fullscreen (S12.3 detail,
   pass-screen): `overscroll-behavior: contain` per evitare che lo scroll
   nella modal trascini il body sotto.

### Files

| File | Change |
|------|--------|
| `styles/main.css` | wrap `:hover` in `(hover: hover)`, aggiunge `:active`, tap target sizing |
| `styles/board.css` | wrap `.pcard:hover` in `(hover: hover)`, aggiunge `:active` |
| `styles/player.css` | scan + wrap se presenti hover (sidebar, tableau) |

### Acceptance criteria

- [ ] iPhone Safari: tap su una carta pickable, dito a terra → vedo
  feedback `:active` (scale-down). Rimuovo dito → nessun "stuck hover"
  che resta evidenziato.
- [ ] Tap on multiplayer card → press feedback visibile, no sticky border.
- [ ] Bottoni splash: ogni bottone ha almeno 44px alto (misurato in
  Chrome DevTools mobile).
- [ ] Desktop (mouse): comportamento `:hover` identico a prima — `(hover: hover)`
  matcha sui device con mouse.

### Note

`(hover: hover)` è supportato Safari 9+, Chrome 38+, FF 64+ → universale
ormai. `(pointer: coarse)` di backup non necessario — `(hover: none)` è
abbastanza preciso.

---

## 🚀 SESSION 12.6 — PWA manifest + service worker + portrait-lock + testing ✅ Done · 2026-04-30

**Tipo**: integration + ops
**Effort**: M (~3h)
**Dipendenze**: S12.1-S12.5 tutte completate (la PWA installa lo stato
finale del gioco — meglio non installare un mid-state visualmente rotto)
**Outputs**: il gioco è installabile da iPhone/Android come app, gira
offline in single-player, mostra splash screen di iOS, tema corretto.
Phone landscape mostra prompt di rotazione.

### Tasks

#### A. Manifest

`manifest.json` alla root del repo:

```json
{
  "name": "Stack & Balance",
  "short_name": "S&B",
  "description": "Drafting boardgame in una scale-up tech.",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#faf6ef",
  "theme_color": "#faf6ef",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" }
  ],
  "categories": ["games", "strategy", "card"],
  "lang": "it"
}
```

#### B. Service worker

`sw.js` alla root, **minimal**:

```js
"use strict";
const CACHE = "sb-v1";
const ASSETS = [
  "./", "./index.html",
  "./styles/main.css", "./styles/board.css", "./styles/player.css",
  "./js/data.js", "./js/visions.js", "./js/scenarios.js",
  "./js/util.js", "./js/balance.js", "./js/state.js",
  "./js/rules.js", "./js/ai.js", "./js/audio.js",
  "./js/multiplayer.js", "./js/hotseat.js",
  "./js/render.js", "./js/render-modals.js", "./js/render-multiplayer.js",
  "./js/render-pyramid.js", "./js/render-tableau.js", "./js/render-sidebar.js",
  "./js/render-masthead.js", "./js/render-hotseat.js",
  "./js/render-card-detail.js", "./js/render-profile.js",
  "./js/main.js",
  "./icons/icon-192.png", "./icons/icon-512.png",
  "./manifest.json"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Bypass non-GET + non-same-origin (PeerJS signaling, CDN PeerJS lib)
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => cached ||
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return resp;
      }).catch(() =>
        caches.match("./index.html") // fallback offline
      )
    )
  );
});
```

**Cache versioning**: bump `sb-v1` a `sb-v2` ad ogni deploy che cambia
asset critici (CSS/JS). Documentato nel CHANGELOG.

#### C. Portrait-lock overlay (CSS-only)

```css
@media (max-width: 900px) and (orientation: landscape) {
  body::before {
    content: "📱  Ruota il telefono in verticale per giocare";
    position: fixed; inset: 0; z-index: 99999;
    background: var(--paper);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; padding: 40px;
    text-align: center; line-height: 1.5;
  }
  #app { display: none; }
}
```

L'overlay scompare automaticamente quando si ruota in portrait. Nessun
JS richiesto.

#### D. Icons

Asset richiesti (in `icons/`):
- `icon-192.png` — 192×192 PNG, app icon Android
- `icon-512.png` — 512×512 PNG, splash + adaptive
- `icon-maskable-192.png` — 192×192 con safe zone 80% (per Android adaptive)
- `apple-touch-icon-180.png` — 180×180 PNG, iOS home screen

**Design proposto**: typographic mark "S&B" in serif italic
(`var(--serif-display)`) su sfondo `--paper`, con piccola sottolineatura
accent color. Generabili via Figma export o tool online (icogen, realfavicongenerator).

✅ **Risolto in chat (2026-04-30)**: opzione **(c) placeholder solid-color
"S&B" basic**. Generabili in S12.6 con un mini-tool one-shot (canvas →
PNG) o online quick-export. Sostituibili in un follow-up dedicato senza
toccare il manifest.

#### E. Testing matrix

Dispositivi/browser da testare manualmente prima del merge:

| Device | Browser | Test |
|--------|---------|------|
| iPhone (iOS 16+) | Safari | Splash, single-player Q1-Q3, install PWA, Hot Seat |
| iPhone (iOS 16+) | Chrome | Stesso minimo |
| Android (12+) | Chrome | Stesso + install via beforeinstallprompt |
| iPad portrait | Safari | Layout tablet, modali, Hot Seat |
| iPad landscape | Safari | Niente overlay (è tablet), layout desktop scalato |
| Desktop Chrome (1024px) | — | Regression check, visualmente identico |
| Desktop Chrome (1480px) | — | Identico bit-per-bit a pre-S12 |

Edge case da verificare:
- [ ] Portrait → landscape mid-game (smartphone): overlay appare, niente
  state corruption, ritornando in portrait il gioco riprende.
- [ ] Install PWA con partita Hot Seat in corso: state localStorage
  preservato? (Probabilmente sì, è stesso origin).
- [ ] Service worker update flow: dopo cache bump, primo caricamento
  serve old cache, secondo prende new (acceptable).
- [ ] iOS notch/dynamic-island: safe-area-inset-top in S12.1 evita
  sovrapposizioni.
- [ ] Tastiera mobile aperta su input nome lobby: form non si nasconde
  sotto la tastiera (uso `position: relative`, non `fixed`).

#### F. Documentation

Aggiornamenti:
- `README.md`: nuova section "📱 Mobile / PWA" con istruzioni install,
  feature parity table.
- `CONTEXT.md`: nuova section "Phase 12 additions" con file map, breakpoint
  conventions, gotchas mobile (safe-area, sticky hover, iOS auto-zoom).
- `CHANGELOG.md`: entry S12.1-S12.6 con tutte le modifiche.
- `MOBILE-ROADMAP.md` (questo file): mark sessions ✅ Done.

### Files

| File | Change |
|------|--------|
| `manifest.json` (NEW) | metadata PWA |
| `sw.js` (NEW) | service worker cache-first |
| `icons/*.png` (NEW) | 4 file PNG (vedi C) |
| `index.html` | link manifest + meta + sw register |
| `styles/main.css` | portrait-lock overlay (~15 LOC) |
| Docs: README, CONTEXT, CHANGELOG, MOBILE-ROADMAP | aggiornamenti |

### Acceptance criteria

- [ ] iOS Safari: "Add to Home Screen" mostra app con icon corretta,
  apertura full-screen senza chrome browser.
- [ ] Android Chrome: prompt PWA appare; install OK; app standalone.
- [ ] Phone landscape: overlay "Ruota in verticale" appare; ruotando
  in portrait il gioco riprende senza reload.
- [ ] Offline: in single-player, partita avviabile e completabile senza
  rete (dopo first load + install).
- [ ] PWA aggiornata: ricaricando dopo deploy nuovo, service worker
  prende le nuove versioni (entro 1-2 reload).
- [ ] Lighthouse audit (Chrome DevTools): PWA score ≥ 90, accessibility
  ≥ 90, performance ≥ 80.

### Out-of-scope follow-ups

- Push notifications (richiede backend, fuori scope)
- Background sync (per MP riconnessione, valutiamo dopo)
- Web Share API per condivisione room code (nice-to-have, banale)
- App Store / Play Store listing (TWA Android: in futuro forse)

---

## 🗺️ Dependency graph

```
S12.1 (foundational)
  ├── S12.2 (pyramid layout)
  │     └── S12.3 (tap-to-detail)
  │           └── S12.6 (PWA wrapping the polished state)
  ├── S12.4 (modals)
  │     └── S12.6
  └── S12.5 (touch UX)
        └── S12.6
```

**Critical path**: S12.1 → S12.2 → S12.3 → S12.6 (~9.5h).
S12.4/S12.5 in parallelo dopo S12.1 (riducono il critical path solo se
parallelizzate).

---

## 📐 Definition of Done — Phase 12

Phase 12 è **DONE** quando tutti i seguenti sono veri:

1. ✅ Single-player giocabile end-to-end su iPhone SE (375×667).
2. ✅ Hot Seat 2 umani giocabile su iPhone SE passandosi il telefono.
3. ✅ P2P Multiplayer host+1client con uno dei due da phone, partita
   completa Q1-Q3 senza desync.
4. ✅ Tablet portrait (iPad) layout pulito, niente overflow.
5. ✅ Desktop ≥ 1024px: visualmente identico a pre-S12 (regression check
   con screenshot diff).
6. ✅ Touch feedback `:active` su tutti i controlli interattivi.
7. ✅ PWA installabile iOS + Android.
8. ✅ Offline single-player funzionante.
9. ✅ Lighthouse mobile: PWA ≥ 90, A11y ≥ 90, Performance ≥ 80.
10. ✅ Tutti i 58 test esistenti passano (la game logic non cambia).
11. ✅ README + CONTEXT + CHANGELOG aggiornati.

---

## 🤔 Open follow-ups (post-Phase-12)

- **Vibration API** sui pick (haptic feedback, ~5min implementation)
- **Web Share API** per condividere room code via system share
- **Wake Lock API** per evitare screen-off durante partite lunghe
- **Apertura via deep-link** `https://...?join=ABCD` per join MP via
  link condiviso da WhatsApp/Telegram
- **Card thumbnail prefetching** per migliorare scroll-perf su Hot Seat
- **Local notification** "tocca a te" se Hot Seat passa in background
- **Portrait variant Vision/OKR draft**: oggi su mobile diventa lista
  verticale; valutare se serve un layout dedicato (es. carousel orizzontale
  con dot indicator)
- **Landscape support su tablet+phone**: oggi blocchiamo phone landscape
  con overlay; in futuro design un layout orizzontale dedicato (cards
  in fila, sidebar a destra). Effort: ~6h.

---

## 🎮 Quando iniziare?

Suggerito: **2 weekend** distribuiti — il primo S12.1+S12.2+S12.3 (core
mobile playability), il secondo S12.4+S12.5+S12.6 (polish + PWA + testing).
Tra un weekend e l'altro: usare il gioco da telefono nella vita reale
per scoprire bug d'uso non ovvi a tavolino.

Alternativa **incrementale** (per minimizzare rischio):
1. Solo S12.1 (~1.5h) — non rompe nulla, layout base mobile decente
2. Bug-bash una settimana
3. S12.2+S12.3 (~5h) — board mobile + detail, sblocca giocabilità phone
4. Bug-bash
5. S12.4+S12.5 (~3.5h) — polish modali e touch
6. S12.6 (~3h) — PWA + ship

**Effort totale Phase 12**: ~13h V1 full-scope.

---

_Roadmap stilata 2026-04-30 dopo che l'utente ha chiesto la mobile experience
come Phase 12. Decisioni di design validate dall'utente in chat: **(1d)
tap-to-detail fullscreen** (industry standard 7 Wonders Duel / MTG Arena /
Hearthstone), **(2) portrait only** con overlay rotation per phone landscape,
**(3) target iPhone SE 375px + iPad portrait 768px**, **(4) full scope —
phone first-class**, **(5) tutti i mode (single-player + P2P MP + Hot Seat)
giocabili da mobile**, **(6) PWA add-to-home-screen sì, vibration no per ora**._
