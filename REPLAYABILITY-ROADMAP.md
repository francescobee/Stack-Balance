# Stack & Balance — Replayability Roadmap (Phase 14)

> **Tipo**: content expansion + opzionale rotation infrastructure.
> **Obiettivo**: portare il pool da 46 → 76 carte (consumption ratio
> 156% → ~95%) per eliminare la sensazione "vedo sempre le solite carte".
> **Origine**: review boardgame designer esperto (2026-04-30) ha
> diagnosticato pool sotto-dimensionato come root cause #1.
> **Natura**: 80% nuovo content (carte), 20% infrastruttura (rotation
> opzionale).

---

## 🎯 Vision

L'esperto ha numerato il problema esattamente:
- **Stack & Balance oggi**: pool 46 carte, consumo 72/partita = **156% ratio**
- **Industry sweet spot** (7 Wonders Duel): 67 carte, 49/partita = **73% ratio**
- **Conseguenza matematica**: ogni partita vedi duplicati. Q3 in particolare
  ha 17 carte uniche per 24 slot → **7 ripetizioni garantite ogni Q3**

L'obiettivo Phase 14 è **espandere il pool a 76 carte** (+30 nuove carte)
preservando i 4 punti che il gioco fa già bene:
1. ✅ **Chain system** elegante (3-4 livelli, multipli path)
2. ✅ **Modifier engine** (Vision + Event + Scenario) — non annegarlo
3. ✅ **Sabotage cards** thematic e bilanciate
4. ✅ **OKR + Awards synergies** (LEAN_OP, ENG_EXC, DATA_EMPIRE,
   FULL_FUNDING) — nuove carte devono rispettarle

**Non-goals**:
- ❌ Nuove meccaniche / nuovi handler sabotage (richiedono game.js code,
  fuori scope content session)
- ❌ Nuovi permanent (richiedono balance.js + bonus logic)
- ❌ Bilanciare AI per le nuove carte (potenziale follow-up Phase 14.X)

---

## 📊 Math target

| | Pool oggi | Pool target | Consumo/partita | Ratio |
|---|---:|---:|---:|---:|
| Q1 | 15 | **25** | 24 | 96% |
| Q2 | 14 | **24** | 24 | 100% |
| Q3 | 17 | **27** | 24 | 89% |
| **Totale** | **46** | **76** | 72 | **95%** |

Con S14.4 (rotation alt-catalogs) il ratio effettivo scende a ~48% su
2 partite, ~32% su 3.

---

## 📅 Macro-timeline (4 sessions · ~6h totali)

| Session | Tema | Effort | Stato |
|---------|------|-------:|------:|
| **S14.1** | Q1 expansion · +10 carte (Discovery / Hiring / Funding diversi) | M (~1.5h) | ✅ Done · 2026-04-30 |
| **S14.2** | Q2 expansion · +10 carte (Build / Tools / BugFix diversi) | M (~1.5h) | ✅ Done · 2026-04-30 |
| **S14.3** | Q3 expansion · +10 carte (Launch / Sabotage / late Funding) | M (~1.5h) | ✅ Done · 2026-04-30 |
| **S14.4** | Quarterly pool rotation (CATALOG_QX_ALT, seed-picked) | M (~1.5h) | ⏸ Deferred — opzionale, valutare dopo playtest delle 30 nuove |

S14.1-S14.3 sono **content** (data.js edits + balance check).
S14.4 è **infra** (game.js setup logic + state seed).

Critical path: S14.1 → S14.2 → S14.3 (sequenziale per testare ogni
quarter incrementalmente). S14.4 standalone, da fare dopo se l'utente
vuole replay anche tra rotazioni.

---

## 🃏 Q1 EXPANSION — 10 NEW CARDS

**Tema Q1**: discovery, MVP, foundational hires, early funding.
**Gap identificati**: solo 1 PM-ish role (UX Designer), no early eng-funding,
no eng-Meeting, Hiring tutte cost-symmetric (budget 2-3-4).

### Le 10 carte proposte

```
═══════════════════════════════════════════════════════════════
01. PRODUCT MANAGER · Hiring · product
   cost: budget 3, tempo 1
   effect: morale 1, talento 1, vp 1
   chainFrom: [ux_designer]  → discount { budget: 1 }
   desc: "Owner di prodotto. +1 Morale, +1 Talento, +1K utenti."
   ─ Why: ruolo canonico mancante. Chain UX→PM naturale, apre
     path a morale-builders. ENG_EXC neutro, LEAN_OP friendly.

02. CUSTOMER INTERVIEWS · Discovery · product
   cost: tempo 2
   effect: dati 2, morale 1
   chainFrom: [lean_canvas]  → discount { tempo: 1 }
   desc: "Chiacchierate dirette. +2 Dati, +1 Morale."
   ─ Why: alt al user_research (data-dept). Gives product players
     un Discovery con dati, supporta DATA_EMPIRE per builds product-heavy.

03. TECHNICAL CO-FOUNDER · Hiring · eng
   cost: tempo 2, budget 2
   effect: talento 2, morale 1
   chainFrom: [junior_dev]  → discount { budget: 2 }
   desc: "CTO co-founder. +2 Talento, +1 Morale. -2💰 con Junior Dev."
   ─ Why: alt eng-flavored al co_founder (oggi product). Chain
     intra-Q1, premia early commitment a eng path.

04. ANGEL INVESTOR · Funding · product
   cost: tempo 1, talento 1
   effect: budget 3, morale 1
   desc: "Round angel. +3 Budget, +1 Morale. Richiede Talento."
   ─ Why: Funding alternativo. NO chain a series_a (è laterale).
     Costa talento → non spammable da chi non ha già hired. FULL_FUNDING
     friendly (è 5° tipo di Funding nel pool).

05. HACKATHON · Meeting · eng
   cost: tempo 1, budget 1
   effect: dati 1, morale 2, vp 1
   desc: "+1 Dati, +2 Morale, +1K utenti."
   ─ Why: il pool eng ha 0 Meeting in Q1 (solo Sprint Retro Q2).
     LEAN_OP friendly (high morale, basso talento richiesto).

06. ROADMAP WORKSHOP · Discovery · product
   cost: tempo 2
   effect: vp 2, morale 1
   chainFrom: [lean_canvas, user_research]  → discount { tempo: 1 }
   desc: "Allinea team su roadmap. +2K utenti, +1 Morale."
   ─ Why: Discovery vp-focused. Multi-chain (canvas o research)
     riduce dipendenza da un singolo anchor.

07. OSS CONTRIBUTOR · Hiring · eng
   cost: budget 1, tempo 1
   effect: talento 1, dati 1, vp 1
   desc: "Hire un open-source contrib. +1 Talento, +1 Dati, +1K utenti."
   ─ Why: Hiring economico. DATA_EMPIRE friendly (eng+dati fusion).
     Costo unico: cheapest hiring del Q1.

08. BRAND IDENTITY · Discovery · product
   cost: budget 2, tempo 1
   effect: vp 2, morale 1
   chainFrom: [ux_designer]  → discount { budget: 1 }
   desc: "Logo + visual language. +2K utenti, +1 Morale."
   ─ Why: Discovery design-driven. Chain UX → Brand naturale,
     premia un picking precoce di UX Designer.

09. CODE BOOTCAMP · Training · eng
   cost: budget 1, tempo 2
   effect: talento 1, morale 1, vp 1
   desc: "Bootcamp interno. +1 Talento, +1 Morale, +1K utenti."
   ─ Why: alt al "Formazione" (oggi product). Eng-flavored Training
     a basso costo budget.

10. BRIDGE LOAN · Funding · eng
    cost: tempo 1, dati 1
    effect: budget 4, techDebt 1
    desc: "Prestito ponte. +4 Budget, +1 Tech Debt. Costa 1 Dati."
    ─ Why: Funding eng-dept (oggi tutte product). Trade-off
     interessante: hai dati → puoi convertire in budget al costo di debt.
     ENG_EXC anti-friendly (debt up), ma utile per Crunch builds.
═══════════════════════════════════════════════════════════════
```

**Q1 dopo S14.1**: 25 carte (era 15) — Discovery 6 → 9, Hiring 4 → 6,
Funding 2 → 4, Meeting 1 → 2, Training 1 → 2, Feature 1 → 1.

---

## 🃏 Q2 EXPANSION — 10 NEW CARDS

**Tema Q2**: infrastructure, dev work, tools, refactor, crunch.
**Gap identificati**: solo 1 product-Hiring (Q1 di rivela hire continuano in Q2 via chain), Q2 ha 0 product-Meeting, BugFix tutti tempo-cost.

### Le 10 carte proposte

```
═══════════════════════════════════════════════════════════════
11. DATABASE MIGRATION · BugFix · eng
    cost: tempo 2, talento 1
    effect: techDebt -1, dati 2, vp 1
    chainFrom: [refactoring]  → discount { tempo: 1 }
    desc: "Migrazione DB. -1🐞, +2 Dati, +1K utenti."
    ─ Why: BugFix ibrido che genera dati (oggi nessun BugFix dà dati).
      DATA_EMPIRE + ENG_EXC double-friendly. Chain refactor → migration.

12. ENGINEERING MANAGER · Hiring · eng
    cost: budget 4, tempo 1
    effect: talento 2, morale 2
    chainFrom: [senior_dev]  → discount { budget: 2 }
    desc: "EM senior. +2 Talento, +2 Morale."
    ─ Why: estende chain junior→senior→EM. Alta morale (LEAN_OP path).

13. PERFORMANCE OPTIMIZATION · Feature · eng
    cost: tempo 3, talento 1
    effect: vp 4, techDebt -1
    chainFrom: [monitoring]  → discount { tempo: 1 }
    desc: "Riduci latency. +4K utenti, -1🐞. -1⏱ con Monitoring."
    ─ Why: rara Feature che riduce debt (sinergia ENG_EXC). Premia
      monitoring chain nel modo giusto.

14. API DOCUMENTATION · Tool · eng
    cost: tempo 2, talento 1
    effect: vp 2, dati 1
    desc: "Docs API pulite. +2K utenti, +1 Dati."
    ─ Why: Tool eng senza permanent (no nuovi handler). Cheap
      late-Q2 prep per Q3 launches.

15. PAIR PROGRAMMING · Meeting · eng
    cost: tempo 1, talento 1
    effect: morale 2, vp 2
    desc: "Coding insieme. +2 Morale, +2K utenti."
    ─ Why: Meeting morale-heavy (LEAN_OP friendly). Diverso da
      sprint_retro (che è meno morale).

16. PRODUCT ANALYTICS · Tool · data
    cost: budget 3, tempo 1
    effect: dati 3, vp 2
    chainFrom: [data_scientist]  → discount { tempo: 1 }
    desc: "Strumenti analytics. +3 Dati, +2K utenti."
    ─ Why: Tool data NO permanent (non compete con Data Lake che resta
      requisito DATA_EMPIRE). Path alternativo per chi non punta DATA_EMPIRE.

17. WEBINAR SERIES · Launch · product
    cost: tempo 2, talento 1
    effect: vp 3, dati 1, morale 1
    desc: "Serie webinar. +3K utenti, +1 Dati, +1 Morale."
    ─ Why: Q2 ha 0 Launch oggi (tutti in Q3). Esperienza early-launch.
      Bilanciato low-mid (5 effetto totale per 3 cost).

18. STRESS TEST · BugFix · eng
    cost: tempo 2
    effect: techDebt -2, vp 1, dati 1
    chainFrom: [monitoring, ci_cd]  → discount { tempo: 1 }
    desc: "Test di carico. -2🐞, +1K utenti, +1 Dati."
    ─ Why: BugFix con dati (alt a database_migration). Multi-chain
      monitoring/ci_cd → entrambi i path eng valgono.

19. INTERNAL DEMO DAY · Meeting · product
    cost: tempo 1, budget 1
    effect: morale 1, vp 2, talento 1
    desc: "Showcase interno. +1 Morale, +2K utenti, +1 Talento."
    ─ Why: Meeting product (zero in Q2 oggi). All-rounder.

20. CUSTOMER ONBOARDING FLOW · Feature · product
    cost: tempo 2, talento 1, budget 1
    effect: vp 3, dati 1, morale 1
    chainFrom: [ux_designer, design_system]  → discount { tempo: 1 }
    desc: "Flow di onboarding. +3K utenti, +1 Dati, +1 Morale."
    ─ Why: Feature product economica vs api_integration / mobile_app
      (entrambe pesanti). Chain UX/design_system extension.
═══════════════════════════════════════════════════════════════
```

**Q2 dopo S14.2**: 24 carte (era 14) — BugFix 3 → 5, Tools 4 → 6 (tot,
incl. data e prodotto), Hiring 1 → 2, Meetings 2 → 4, Feature 4 → 5,
Launch 0 → 1.

---

## 🃏 Q3 EXPANSION — 10 NEW CARDS

**Tema Q3**: launch, scaling, optimization, sales, sabotage, late funding.
**Gap identificati**: Q3 è il drought peggiore (17 → 24 slot = 7 ripetizioni).
Solo 1 eng-Launch, sabotage tutti product (1 data ed). Late funding solo
series_b.

### Le 10 carte proposte

```
═══════════════════════════════════════════════════════════════
21. DATA PLATFORM · Tool · data
    cost: budget 3, tempo 2
    effect: dati 3, vp 3
    chainFrom: [data_lake]  → discount { budget: 2 }
    desc: "Platform unificata. +3 Dati, +3K utenti."
    ─ Why: secondo data Tool in Q3 (oggi solo data_lake e dashboard
      come "data" Q3). NO permanent (no conflict con DATA_EMPIRE req).

22. INFLUENCER DEAL · Launch · product
    cost: budget 4, tempo 1
    effect: vp 5, morale 1
    chainFrom: [viral_campaign]  → discount { budget: 2 }
    desc: "Sponsorship influencer. +5K utenti, +1 Morale."
    ─ Why: Launch budget-heavy (alternativa a tempo-heavy). Chain
      viral → influencer naturale.

23. OPEN SOURCE RELEASE · Launch · eng
    cost: tempo 2, talento 2
    effect: vp 3, dati 2, morale 2
    chainFrom: [ci_cd]  → discount { tempo: 1 }
    desc: "Apri il source. +3K utenti, +2 Dati, +2 Morale."
    ─ Why: eng-Launch (rarissimo: oggi solo perf_tuning). Bilanciato
      come "moltiplicatore di stati" (vp+dati+morale tutti +2-3).

24. SALES DIRECTOR · Hiring · product
    cost: budget 5, tempo 1
    effect: talento 2, vp 3
    chainFrom: [sales_team]  → discount { budget: 2 }
    desc: "Direttore commerciale. +2 Talento, +3K utenti."
    ─ Why: progressione sales_team → director. Forte ma costoso
      (budget 5 = top tier).

25. INVESTOR DAY · Funding · product
    cost: tempo 2, talento 1
    effect: budget 7, morale 1
    chainFrom: [pitch_deck, series_a]  → discount { tempo: 1 }
    desc: "Pitch agli investor. +7 Budget, +1 Morale."
    ─ Why: Funding alt a series_b. Multi-chain (pitch_deck OR series_a).
      FULL_FUNDING-friendly senza requisito series_a stretto.

26. BUG BOUNTY PROGRAM · BugFix · eng
    cost: budget 3
    effect: techDebt -2, dati 1, vp 1
    desc: "Bounty per bug esterni. -2🐞, +1 Dati, +1K utenti."
    ─ Why: Q3 BugFix budget-cost (oggi solo tempo-cost). Alt path
      late-game ENG_EXC.

27. GEO EXPANSION · Launch · product
    cost: tempo 2, talento 2, budget 3
    effect: vp 6, dati 2
    chainFrom: [premium_tier, series_a]  → discount { budget: 2 }
    desc: "Espansione internazionale. +6K utenti, +2 Dati."
    ─ Why: heavy late-game launch. Multi-chain (premium o series_a)
      = molteplici percorsi viable.

28. CUSTOMER SUCCESS DIRECTOR · Hiring · product
    cost: budget 4, tempo 1
    effect: morale 2, talento 2, vp 1
    chainFrom: [customer_success]  → discount { budget: 2 }
    desc: "CS Director. +2 Morale, +2 Talento, +1K utenti."
    ─ Why: estende customer_success path. LEAN_OP friendly per builds
      morale-heavy.

29. CRISIS PR · Sabotage · product
    cost: budget 2, tempo 1
    effect: targetLeaderMorale: -1, vp 2
    desc: "Tieni a bada il leader. -1 Morale leader, +2K utenti."
    ─ Why: sabotage "soft" — meno aggressive di patent_lawsuit (-3K).
      Riusa handler esistente, no nuovo code. Cheaper alt.

30. CONFERENCE TALK · Meeting · eng
    cost: tempo 2
    effect: morale 2, talento 1, dati 1
    desc: "Talk a conferenza. +2 Morale, +1 Talento, +1 Dati."
    ─ Why: Q3 eng-Meeting (zero oggi). All-rounder boost economico.
═══════════════════════════════════════════════════════════════
```

**Q3 dopo S14.3**: 27 carte (era 17) — Launch 5 → 8, Hiring 3 → 5,
Funding 3 → 4, BugFix 2 → 3, Meeting 2 → 3, Sabotage 6 → 7, Tool 0 → 1.

---

## 🔄 SESSION 14.4 — Quarterly pool rotation (OPZIONALE)

**Tipo**: infrastructure (game.js + state seed)
**Effort**: M (~1.5h)
**Dipendenze**: S14.1+S14.2+S14.3 completate

### Cosa fa

Aggiunge un secondo catalog "alt" per ogni quarter (CATALOG_Q1_ALT etc.,
~15 carte per variant) e seed-picks una variant per game. Effetto:
- Su 2 partite consecutive con seed diverso, vedi due pool diversi
- Ratio effective scende a ~48%
- Multiplayer P2P deterministico (host seed condiviso)
- Daily mode usa `dailySeed()` esistente (già seedato)

### Implementazione

```js
// data.js — già esistente CATALOG_Q1; aggiungere:
const CATALOG_Q1_ALT = [/* 15 carte tweakate, costo simile, flavor diverso */];
const CATALOG_Q2_ALT = [/* idem */];
const CATALOG_Q3_ALT = [/* idem */];

// rules.js — modify getCatalog():
function getCatalog(quarter, variant) {
  const base = [CATALOG_Q1, CATALOG_Q2, CATALOG_Q3][quarter - 1];
  const alt  = [CATALOG_Q1_ALT, CATALOG_Q2_ALT, CATALOG_Q3_ALT][quarter - 1];
  return variant === 1 ? alt : base;
}

// state.js — aggiungere:
state.catalogVariant = pickVariant(state.seed);   // 0 or 1

// MP serialization — already broadcasts seed/variant
```

### Le carte ALT (~15/Q)

NON le specifico in dettaglio in questa roadmap — sarebbero ~45 carte
addizionali. Approccio raccomandato:

- **Riutilizzare 50% delle carte base con flavor diverso**: stesso
  cost/effect, nome+desc cambiati (es. "User Research" → "User
  Discovery Session"). Variazione thematic, no balance changes.
- **30% varianti meccaniche leggere**: stesso archetipo, +/-1 cost o
  effect (es. "Lean Canvas Alt" → tempo 1, vp 2 invece di vp 1+morale 1).
- **20% nuove**: +3 carte completamente originali per variant.

Total effort per S14.4: ~1.5h se principalmente tweaks, ~3h se più
originali.

---

## 🗺️ Dependency graph

```
S14.1 (Q1) ──┐
             ├─→ playtest baseline ──┐
S14.2 (Q2) ──┤                       │
             ├─→ playtest cumulative ┤
S14.3 (Q3) ──┘                       │
                                     ├─→ S14.4 (rotation opzionale)
```

**Critical path**: S14.1 → S14.2 → S14.3 (~4.5h totali). Ogni session
chiude con un playtest del quarter espanso prima di passare al
successivo, così se una carta è sbilanciata si scopre presto.

---

## 📐 Definition of Done — Phase 14

Phase 14 è **DONE** quando:

1. ✅ Pool totale ≥ 76 carte (15+10 / 14+10 / 17+10 = 76)
2. ✅ Ogni nuova carta ha: id univoco, nome, dept, type, cost, effect,
   desc Italian, chainFrom (opz) con chainDiscount valido
3. ✅ Nessun chain pointer rotto (test che usa ALL_CARDS_BY_ID lookup)
4. ✅ AI personas non rompono di fronte a nuove carte (chooseAIVision
   / chooseAIOKR / decideAIPickFromPyramid usano euristici generali,
   non hardcoded id-list — verifica)
5. ✅ 58/58 test pass (tutto il game logic resta invariato)
6. ✅ Playtest rapido ogni Q (~5 min Q1 + Q2 + Q3) per verificare:
   - Nessuna carta è strettamente dominata (sempre evitata)
   - Nessuna carta è OP (sempre pickata)
   - Chain integrity (le chain dichiarate funzionano)
7. ✅ CHANGELOG entry per S14.1+S14.2+S14.3 (+S14.4 se done)
8. ✅ REPLAYABILITY-ROADMAP.md (questo file) marca session ✅

---

## 🤔 Open follow-ups (post-Phase-14)

- **AI tuning per nuove carte**: le AI personas hanno `cardWeights` /
  preferenze euristiche. Per ora valutano nuove carte con stessa logica
  delle vecchie (effect.vp, dept match). Potenziale Phase 15: tunare
  pesi specifici per nuove carte se playtest mostra AI sub-optimale.
- **Booster Pack injection**: la review menzionava 30% di slot da
  booster pool extra. Approccio diverso da rotation, valutabile come
  alt a S14.4.
- **EVENT_POOL expansion**: oggi 9 events, l'esperto suggerisce 15.
  +6 nuovi eventi (~30 min effort, no nuova logic). Rinviato per non
  espandere lo scope di Phase 14.
- **Scenario-specific pool overrides**: scenari come Bear Market o AI
  Hype hanno gameplay distintivi ma il pool è uguale. Aggiungere
  `poolOverrides: {include, exclude}` agli scenari renderebbe ogni
  scenario più identitario.
- **Card retirement**: dopo 30 carte nuove + rotation, alcune carte
  base potrebbero essere dominate (es. "Founder's Hustle" vs
  "Bridge Loan"). Valutare un audit a Phase 15.
- **Card art**: oggi le carte sono testo + dept-color. Asset visuale
  per le 30+ nuove (e possibilmente tutte le 76) — Phase 15+.

---

## 🎮 Quando iniziare?

Suggerito: **una serata** per S14.1 (~1.5h) — review + design + impl
+ playtest + commit.

**Pattern raccomandato per ogni session**:
1. Review/validate carte (~10 min)
2. Implementare in `data.js` (~30 min)
3. Verifica chain pointers (~5 min) + 58/58 test
4. Quick playtest del Q (~15 min)
5. Aggiustamenti eventuali (~15 min)
6. CHANGELOG + commit (~10 min)

Totale ~1h 25min per session, 4.5h S14.1-S14.3.

---

_Roadmap stilata 2026-04-30 dopo review boardgame designer esperto.
30 carte progettate dettagliatamente per review utente prima dello
sviluppo tecnico. Nessuna nuova meccanica (rispetta il vincolo
"orthogonal to existing system"), tutte usano effect fields esistenti.
Le carte coprono i gap tematici identificati e diversificano gli
archetipi senza diluire le sinergie esistenti._
