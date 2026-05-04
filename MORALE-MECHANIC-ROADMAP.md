# Stack & Balance — Morale Mechanic Roadmap (Phase 19)

> **Tipo**: gameplay enhancement — trasformare il morale da stat
> monodirezionale (solo ↑) a risorsa viva con costi e conseguenze.
> **Origine**: design review utente — "vorrei che il morale costasse
> qualcosa, una sorta di overtime/crunch per gli sviluppatori".
> **Natura**: aggiunge meccanica nuova allo schema cost (`cost.morale`),
> tocca il modifier engine, aggiunge content (carte + sinergie + OKR
> + 1 v2 Vision).

---

## 🎯 Vision

**Problema oggi**: il morale è una stat che il giocatore **collezziona**.
~12 carte lo aumentano, solo Burnout event (10% per Q) e Negative Press
sabotage (-2 al leader) lo abbassano. La pressione downward è
trascurabile, e il giocatore raramente lo vede sotto 5.

**Obiettivo**: rendere il morale una **risorsa accoppiata** che si
spende attivamente per output (vp / dati / talento), con conseguenze
visibili a stato basso. Pattern industriale: "la stat che curi se vuoi
performance, brucia se vuoi risultato veloce" (Crunch culture
narrative).

**Differenza chiave morale vs tempo**:
- **Tempo**: capacità per Q, si resetta (5/Q base)
- **Morale**: stato persistente 0-10, va ricostruito attivamente

Decisione meccanica reale: bruciare 2 morale ora costa 2 morale per
sempre finché non recuperi.

**Non-goals**:
- ❌ Multi-stat morale (un solo numero, no morale dept-specific)
- ❌ Morale negativo (clamp a 0, già esistente)
- ❌ Random morale loss casuale (solo cost-driven)

---

## 📅 Macro-timeline (2 sessions · ~3.5h totali)

| Session | Tema | Effort | Stato |
|---------|------|-------:|------:|
| **S19.1** | Schema `cost.morale` + Burnout scaling + Block guard | M (~1.5h) | ⬜ |
| **S19.2** | Content: 8 carte + 2 sinergie + 1 OKR + 1 v2 Vision | M (~2h) | ⬜ |

**Critical path**: S19.1 → S19.2. La S19.2 dipende dallo schema
introdotto in S19.1 per le 5 carte crunch.

---

## 🛠 SESSION 19.1 — Schema + system effects (foundation)

**Tipo**: engine change (rules.js) + tests
**Effort**: M (~1.5h)
**Dipendenze**: nessuna

### Tasks

#### A. Schema `cost.morale` end-to-end

**`js/rules.js`** — `canAfford(player, card)`:
```js
const adj = adjustedCost(player, card);
return (adj.budget  || 0) <= player.budget
    && (adj.tempo   || 0) <= player.tempo
    && (adj.talento || 0) <= player.talento  // talento available, not total
    && (adj.dati    || 0) <= player.dati
    && (adj.morale  || 0) <= player.morale;  // NEW
```

**`js/rules.js`** — `payCost(player, card)`:
```js
if (adj.budget)  player.budget  -= adj.budget;
if (adj.tempo)   player.tempo   -= adj.tempo;
if (adj.talento) player.talentoUsed += adj.talento;
if (adj.dati)    player.dati    -= adj.dati;
if (adj.morale)  player.morale  = Math.max(0, player.morale - adj.morale);  // NEW, clamp
```

**`js/rules.js`** — `adjustedCost(player, card)` and the modifier engine
already iterate `Object.entries(cost)`, so `costModifiersByType` /
`costModifiersByCardId` / chain discounts automatically support `morale`
once we add it to a card's `cost`. **Verify**: trace `applyCostModifiers`
to confirm morale is not hardcoded-excluded anywhere. (Spot-check at
write-time.)

#### B. Burnout debt scaling — end-of-quarter

**`js/rules.js`** o **`js/game.js`** — `endOfQuarter()`:

Current pattern (already exists for normal debt accumulation): debt is
calculated additively. Add a new line:

```js
// S19.1: Burnout debt scaling — tired teams write buggier code.
// Slope: morale 3 → +1 debt, morale 0 → +4 debt. No effect at ≥ 4.
if (player.morale < 4) {
  const burnoutDebt = 4 - player.morale;
  player.techDebt += burnoutDebt;
  log(`${player.name}: +${burnoutDebt}🐞 burnout (morale ${player.morale})`,
      player.isHuman ? "you" : "");
}
```

Fires once per player per Q-end, after other end-of-Q processing
(award computation, etc.). Visible in log + included in next-Q's
`p.techDebt`.

#### C. Block guard at low morale

**`js/game.js`** — `offerBlockOpportunity(actingIdx, toReveal)`:

Add an early return:

```js
// S19.1: Block disabled at morale ≤ 3. Team disengaged, no energy
// to intercept. Affects single-player only (already disabled in MP/HS).
const localPlayer = state.players[state.localSlotIdx];
if (localPlayer.morale <= 3) {
  return { blocked: false };
}
```

Place this check **after** the existing `state.isMultiplayer ||
state.isSharedScreen` short-circuit, so the new gate only applies
when block is otherwise available.

#### D. Tests (`tests/test-rules.js`)

Add new test group:

```js
describe("morale cost mechanic [S19.1]", () => {
  it("canAfford rejects when morale insufficient", () => {
    const p = mockPlayer({ morale: 1 });
    const c = mockCard({ cost: { morale: 2 } });
    assertEq(canAfford(p, c), false);
  });
  it("canAfford accepts at exact morale", () => {
    const p = mockPlayer({ morale: 2 });
    const c = mockCard({ cost: { morale: 2 } });
    assertEq(canAfford(p, c), true);
  });
  it("payCost deducts morale (clamped at 0)", () => {
    const p = mockPlayer({ morale: 3 });
    const c = mockCard({ cost: { morale: 2 } });
    payCost(p, c);
    assertEq(p.morale, 1);
  });
  it("payCost clamps morale floor at 0", () => {
    // Defensive — canAfford should prevent this, but clamp guards.
    const p = mockPlayer({ morale: 1 });
    const c = mockCard({ cost: { morale: 5 } });
    payCost(p, c);
    assertEq(p.morale, 0);
  });
  it("burnout debt scaling fires at morale < 4", () => {
    withState({ quarter: 1 }, () => {
      state.players = [mockPlayer({ morale: 1, techDebt: 0 })];
      // ... call endOfQuarter or extract burnoutDebtCheck()
      // assertEq(state.players[0].techDebt, 3);   // 4 - 1 = 3
    });
  });
});
```

Target: **3-4 nuovi test**, mantengono il count globale a 110+/110+.

### Files

| File | Change |
|------|--------|
| `js/rules.js` | `canAfford` + `payCost` + verify `adjustedCost`/modifier engine support `morale` |
| `js/rules.js` o `js/game.js` | Burnout debt scaling in `endOfQuarter` |
| `js/game.js` | Block guard at morale ≤ 3 |
| `tests/test-rules.js` | +4 test |
| `sw.js` | Bump `CACHE_VERSION` `sb-v14` → `sb-v15` |

### Acceptance criteria

- [ ] Una carta con `cost: { morale: 2 }` non si può pescare con
  morale ≤ 1; si pesca con morale ≥ 2 e poi morale -2.
- [ ] A fine Q, un player con morale 2 riceve +2 debt (oltre al debt
  base). Player con morale 5 riceve 0 burnout extra.
- [ ] Single-player con morale 3: l'AI pesca, **showBlockOverlay non
  appare**, l'AI rivela.
- [ ] Single-player con morale 4: il block si comporta come prima.
- [ ] Tutti i 107 test esistenti + 4 nuovi passano.
- [ ] Nessuna change al MP/HS (già block-disabled, schema cost morale
  invariato per loro perché nessuna carta esistente usa morale-cost).

---

## 🃏 SESSION 19.2 — Content (5 crunch + 3 recovery + synergies + OKR + v2 Vision)

**Tipo**: content design (data.js + visions.js + synergies.js)
**Effort**: M (~2h)
**Dipendenze**: S19.1 schema deve funzionare end-to-end
**Outputs**: la nuova meccanica viene **utilizzata** dal gioco. Senza
S19.2 lo schema esiste ma nessuna carta lo usa.

### Le 8 nuove carte

#### Crunch / Overtime (5 cards: 1-2 per Q)

```
═══════════════════════════════════════════════════════════════
A. ALL-NIGHTER SPRINT · Feature · eng (Q2)
   cost: { morale: 2 }
   effect: { vp: 4, dati: 1, techDebt: 1 }
   desc: "Notte in ufficio. +4K, +1 Dati, +1🐞. Spreme il team (-2 morale)."
   ─ Pure morale-cost. vp/effort competitivo con MVP Proto (2⏱+1🧠 → 2vp+2dati)
     ma trade morale per tempo. Viable solo con team fresh.

B. PIVOT SPRINT · Discovery · product (Q1)
   cost: { morale: 2, tempo: 1 }
   effect: { dati: 3, vp: 2 }
   desc: "Cambia direzione in corsa. +3 Dati, +2K. Esauriente (-2 morale)."
   ─ Q1 morale ancora alto (~5), questa è l'unica crunch early-game.
     Insegna la meccanica senza castigare troppo.

C. EMERGENCY HIRE · Hiring · eng (Q2)
   cost: { morale: 1, budget: 5 }
   effect: { talento: 2, techDebt: 1 }
   desc: "Hire frettoloso. +2 Talento, +1🐞 (-1 morale)."
   ─ Morale-cost light (1) ma alto budget. Compromise: prendi talento
     veloce paying friction aziendale.

D. WEEKEND PUSH · Launch · product (Q3)
   cost: { morale: 3, budget: 1 }
   effect: { vp: 6, techDebt: 1 }
   desc: "Sprint nel weekend. +6K, +1🐞. Devasta il team (-3 morale)."
   ─ Q3 morale-heavy ma vp esplosivo (6). Costo 3 morale è significativo
     (sotto morale 7 ti porta a burnout-zone). Choice momentum reale.

E. SHIP AT ANY COST · Feature · product (Q3)
   cost: { morale: 2, tempo: 2, talento: 1 }
   effect: { vp: 7, techDebt: 3 }
   desc: "Spedisci tutto. +7K, +3🐞 (-2 morale)."
   ─ Top-tier crunch: vp 7 è il massimo del Q3. -2 morale + 3 debt
     = penalty severe. Per chi è dietro nel rate ma ha morale alto.
═══════════════════════════════════════════════════════════════
```

#### Recovery (3 cards: 1 per Q)

```
═══════════════════════════════════════════════════════════════
F. SABBATICAL DAY · Meeting · product (Q1)
   cost: { tempo: 1 }
   effect: { morale: 3, vp: -1 }
   desc: "Ferie obbligatorie. +3 Morale, -1K (qualcuno se ne va)."
   ─ Recovery economico, costa 1K MAU che è basso. Asymmetric:
     "i ferie costano un po' di traction".
   ─ NOTE: vp negativo è già supportato (founder_hustle ha techDebt:1
     in effect, è additivo). Verificare clamp a 0.

G. MENTAL HEALTH WORKSHOP · Meeting · product (Q2)
   cost: { budget: 2 }
   effect: { morale: 2, dati: 1 }
   desc: "Workshop wellness. +2 Morale, +1 Dati."
   ─ Recovery clean, no penalty. Q2 budget-cost rende questa carta
     scelta consapevole non automatica.

H. CULTURE DAY · Meeting · product (Q3)
   cost: { budget: 2, tempo: 1 }
   effect: { morale: 3, talento: 1 }
   desc: "Offsite di cultura. +3 Morale, +1 Talento."
   ─ Late-game recovery che dà anche talento. Premia chi vuole
     un'ultima ricarica prima dello sprint finale di Q3.
═══════════════════════════════════════════════════════════════
```

### 2 nuove sinergie (synergies.js)

```
═══════════════════════════════════════════════════════════════
S1. BURNOUT SURVIVOR · 🔥 · 8 punti · medium
    Tag: ["crunch", "resilience"]
    detailInactive: "Sinergia: hai retto la pressione fino in fondo"
    detailActive: () => "Crunchato senza cedere"
    check(p) {
      return {
        requirements: [
          { label: "Morale finale ≥ 6", current: p.morale,
            target: 6, met: p.morale >= 6 },
          { label: "Tech Debt ≥ 5",     current: p.techDebt,
            target: 5, met: p.techDebt >= 5 },
        ],
        active: ...
      };
    }
    ─ Premia chi ha pushato hard e tenuto botta. Vp moderato (8) per
      condizione possibile ma controintuitiva (debt alto + morale alto).

S2. WORKPLACE UTOPIA · ☮️ · 10 punti · medium
    Tag: ["lean", "morale", "team"]
    detailInactive: "Sinergia: cultura aziendale al top"
    detailActive: () => "Squadra felice e investita"
    check(p) {
      const recoveryCount = p.played.filter(c =>
        ["sabbatical_day", "mental_health_workshop", "culture_day",
         "team_building", "sprint_retro"].includes(c.id)
      ).length;
      return {
        requirements: [
          { label: "Morale finale ≥ 9", current: p.morale,
            target: 9, met: p.morale >= 9 },
          { label: "Recovery cards ≥ 2", current: recoveryCount,
            target: 2, met: recoveryCount >= 2 },
        ],
        active: ...
      };
    }
    ─ Forza investimento attivo in cultura. Sinergia con LEAN_OP
      (entrambe morale-high) ma indipendente.
═══════════════════════════════════════════════════════════════
```

### 1 nuovo OKR (data.js OKR_POOL)

```
═══════════════════════════════════════════════════════════════
HEALTHY SPRINT · 4 punti
text: "Chiudi il Q con morale ≥ 6 e zero carte morale-cost"
check(p) {
  const noCrunch = !p._quarterPlays.some(c => (c.cost?.morale || 0) > 0);
  return p.morale >= 6 && noCrunch;
}
─ Anti-crunch OKR. Premia disciplina. Reward 4 (basso) perché è
  facilmente raggiungibile da chi sceglie di non crunchare proattivamente.
═══════════════════════════════════════════════════════════════
```

### 1 nuova v2 Vision (visions.js)

```
═══════════════════════════════════════════════════════════════
CRUNCH CULTURE v2 · base: founder_mode (o lean_startup) · ⚡
unlocksAfter: { visionId: "founder_mode", wins: 3 }

bonus: "Carte morale-cost: vp +1 effetto"
malus: "Burnout debt scaling raddoppiato (morale ≤ 3 = 8 invece di 4)"

modifiers: {
  effectBonusByCondition: {
    cardHasCost: { resource: "morale", amount: 1 },
    bonus: { vp: 1 }
  },
  burnoutDebtMultiplier: 2,   // hooks endOfQuarter scaling
  startingMorale: -1,         // partenza morale 4 invece di 5
}

unlocked: false (default)

desc: "Crunch è la cultura. +1K bonus su ogni morale-cost giocata.
       Ma il burnout fa più male."
═══════════════════════════════════════════════════════════════
```

**Note tecnica**: la modifier `effectBonusByCondition.cardHasCost` è
una nuova chiave nel modifier engine. Implementazione richiesta in
`applyEffectModifiers`. Effort minore (~10 righe). In alternativa
hardcoda lookup `cardHasMoraleCost(card)` come funzione helper.

`burnoutDebtMultiplier` è una nuova chiave letta da `endOfQuarter`
durante il calcolo del burnout debt scaling. ~3 righe.

### Files

| File | Change |
|------|--------|
| `js/data.js` CATALOG_Q1 | +Pivot Sprint, +Sabbatical Day |
| `js/data.js` CATALOG_Q2 | +All-Nighter Sprint, +Emergency Hire, +Mental Health Workshop |
| `js/data.js` CATALOG_Q3 | +Weekend Push, +Ship at Any Cost, +Culture Day |
| `js/data.js` OKR_POOL | +Healthy Sprint OKR |
| `js/synergies.js` SYNERGY_POOL | +Burnout Survivor, +Workplace Utopia |
| `js/visions.js` VISION_POOL | +Crunch Culture v2 |
| `js/rules.js` | Modifier engine: `effectBonusByCondition` + `burnoutDebtMultiplier` (se andiamo via modifier-driven; alternativa: helper inline) |
| `tests/test-rules.js` | +3-4 test (sinergie, OKR, v2 vision unlock state) |
| `sw.js` | Bump `CACHE_VERSION` `sb-v15` → `sb-v16` |

### Acceptance criteria

- [ ] Le 5 crunch cards sono pescabili **solo** con morale sufficiente
- [ ] Le 3 recovery cards sono pescabili sempre (nessun cost.morale)
- [ ] Synergy `burnout_survivor` si attiva con morale 6 + debt 5
- [ ] Synergy `workplace_utopia` richiede contare le recovery cards
- [ ] OKR `healthy_sprint` valuta morale ≥ 6 AND no crunch this Q
- [ ] Vision `crunch_culture_v2` appare nel draft solo dopo 3 win con
  Founder Mode base
- [ ] Vision `crunch_culture_v2` con due crunch cards giocate genera
  +2 vp bonus (1 per carta) e +6 debt invece di +3 a morale 1
- [ ] AI personas (decideAIPickFromPyramid) pickano sensatamente le
  morale-cost cards (verifica score positive con weights default)
- [ ] Tutti i 110+ test passano

---

## 🗺️ Dependency graph

```
S19.1 (schema + system)  ──→  S19.2 (content)
                                  │
                                  ▼
                              playtest 3-5 partite
                                  │
                                  ▼
                          tuning if needed (out of scope)
```

S19.1 è prerequisite stretto. S19.2 introduce content che USA lo
schema; senza S19.1 le carte sono unplayable.

---

## 📐 Definition of Done — Phase 19

Phase 19 è **DONE** quando:

1. ✅ `cost.morale` funziona end-to-end (canAfford, payCost, modifier engine)
2. ✅ Burnout debt scaling fires correttamente a end-of-Q
3. ✅ Block guard at morale ≤ 3 attivo (single-player)
4. ✅ 8 nuove carte, 2 sinergie, 1 OKR, 1 v2 vision implementate
5. ✅ AI gioca le morale-cost in modo sensato (no spam, no avoidance)
6. ✅ 110+/110+ test pass
7. ✅ Cache bumpato `sb-v14` → `sb-v16`
8. ✅ CHANGELOG entries S19.1 + S19.2
9. ✅ README aggiornato (sezione "Profondità di gameplay" + "Estendere"
   con nuovo schema cost)
10. ✅ Playtest 3-5 partite per verificare che il morale ora SI muova
    in entrambe le direzioni

---

## 🤔 Open follow-ups (post-Phase-19)

- **Recovery card discount sotto morale 4**: se playtest mostra che
  i giocatori restano stuck a morale basso, abilitare il discount
  proposto in design (`cost.tempo - 1` su recovery cards quando
  `morale ≤ 4`). Effort: ~30 min.
- **Talent Poach opportunism a morale ≤ 3**: la sabotage card ruba
  un Hiring extra se target ha morale basso. Effort: ~20 min, va
  in `js/game.js` sabotage handler.
- **AI morale-cost weighting**: tunare AI personas per usare le
  crunch cards in modo persona-coerente (Aggressor le ama, Bootstrapper
  le evita). Già parzialmente coperto da archetypes Phase 16, ma
  nuove carte potrebbero richiedere weight tweaks.
- **More crunch variety**: se la mechanic prende, espandere a 8-10
  total crunch cards (2-3 per Q) con archetipi diversi (high-vp /
  high-dati / cross-dept).
- **More recovery variety**: 3 sembrano poche, valutare +2 (es.
  "Remote Work Day" Q2 morale+2 dati+1).
- **Visualization**: badge animato sul morale stat quando passa sotto
  4 (warning state già esiste su mobile resources strip — verificare
  che la threshold matcha il burnout trigger).

---

## 🎮 Quando iniziare?

Suggerito: **una serata** intera per S19.1 + S19.2 in sequenza.
- S19.1 (~1.5h): schema + tests + sanity check con 1 carta crunch
  hardcoded (es. all_nighter_sprint) per validare end-to-end
- S19.2 (~2h): aggiunta del resto del content
- Playtest finale (~30 min): 2-3 partite per validare il flow

**Effort totale Phase 19**: ~4h V1 mechanic.

---

_Roadmap stilata 2026-05-04 dopo design review utente sulla
monodirezionalità del morale. 5 design questions validate dall'utente:
(1) 5 crunch cards (1-2/Q), (2) burnout slope `4-morale`, (3) Block
disabled a morale ≤ 3, (4) Sabbatical Day mantiene -1K vp asimmetrico,
(5) v2 Vision "Crunch Culture" inclusa. Tutte e 5 incorporate nel
design._
