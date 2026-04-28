# Stack & Balance — Balance Notes

> Documento vivo di analisi balance e protocollo di playtest.
> Iniziato in S9.2 (Vision Rebalance Deep) per documentare le decisioni
> di tuning e fornire baseline tabellari da confrontare con misurazioni
> empiriche di playtest.
>
> **NOTA HONEST**: i numeri in questo file sono *stime tabletop* basate
> sulla matematica del gioco (carte, costi, reward, multipliers). Non
> sono *misurazioni di partite reali* finché non verranno popolati i
> blocchi `### Measured (post-S9.8)` da playtest empirico.

---

## 🎴 Vision Cards — analisi balance (post-S9.2)

### Methodology

Per ogni Vision, calcolo:
- **Bonus stimato** (in K MAU equivalent): contributo positivo medio
- **Malus stimato** (in K MAU equivalent): costo negativo medio
- **Net**: bonus − malus
- **Tier**: ⚖️ balanced (-2..+4K), 💪 strong (+5..+8K), 💪💪 dominant (>+8K), 🥶 weak (-3..-7K)

I numeri assumono **scenario Standard, difficoltà Senior, partita con
partecipazione "tipica"** del player (non min/max estremo).

### Summary table

| Vision | Bonus | Malus | Net | Tier (stimato) | Note |
|--------|------:|------:|----:|:--------------:|------|
| 🎯 Founder Mode    | +5..+8K | -2..-3K | +3..+5K | ⚖️ | Post-S9.1.d (1.3x): meno dominante, ancora forte |
| 🌱 Lean Startup    | +4..+6K | -1..-2K | +3..+4K | ⚖️ | Tolerance debt + Crunch viable |
| 🚀 Growth Hacker   | +2..+3K | -1..-2K | +1..+2K | ⚖️ | Launch +1K vs Discovery +1⏱ Q1 |
| ⚙️ Tech First      | +6..+8K | -2..-4K | +2..+4K | ⚖️ | Post-S9.2 funding award ×0.5 |
| 💪 Bootstrapped    | +6..+10K | -10..-15K | -2..0K | 🥶/⚖️ | Post-S9.2 rework, ancora challenging |
| 📈 Data Empire     | +5..+7K | -3..-5K | +1..+3K | ⚖️ | Post-S9.1.d (-3 morale): trade-off vero |
| 💼 B2B Veteran     | +3..+5K | -3..-4K | 0..+1K | ⚖️/🥶 | Post-S9.2 funding boost, borderline |
| 📣 Viral Native    | +4..+6K | -1..-2K | +3..+4K | ⚖️/💪 | Launch ×1.5 forte, da validare |

**Range totale stimato**: -2K a +5K. Tutte le Vision in [⚖️ balanced]
o [🥶 weak edge]. Nessuna 💪💪 dominant. Bootstrapped e B2B Veteran
restano i candidati più rischiosi: da validare in S9.8 con misurazione
win rate effettiva.

---

## 🔬 Per-Vision math breakdown

### 🎯 Founder Mode — `awardMultipliers: { morale: 1.3, talent: 1.3, funding: 0.5 }`

**Bonus**:
- Morale silver (5pt) × 1.3 = 7. Net +2pt.
- Morale gold (12pt) × 1.3 = 16. Net +4pt.
- Talent stesso pattern.
- Avg realistic player: silver+silver = 14pt (era 10pt). **+4pt**.
- Avg morale-focused player: gold+gold = 32pt (era 24pt). **+8pt**.

**Malus**:
- Funding silver (3pt) × 0.5 = 2. Loss -1pt.
- Funding gold (8pt) × 0.5 = 4. Loss -4pt.
- Avg realistic: -1 to -2pt.

**Net**: +3 to +6pt awards = +3 to +6K MAU. ⚖️ Balanced.

### 🌱 Lean Startup — debt tolerance + Hiring +1💰

**Bonus**:
- Debt offset +1 = penalty kicks in at 4 instead of 3
- A debt 4: normal -2K MAU/Q, Lean -1K → save 1K/Q × 3Q = +3K
- A debt 5+: save 2K+/Q
- Crunch cards diventano *viable* (Hotfix +4K +2 debt: gestibile)

**Malus**:
- Hiring +1💰 × 2-3 plays = -2 to -3💰 = -1K MAU eq.

**Net**: +2 to +5K MAU. ⚖️ Balanced.

### 🚀 Growth Hacker — Launch +1K vs Discovery +1⏱ Q1

**Bonus**: 2-3 Launch plays × +1 vp = +2 to +3K MAU.

**Malus**: Discovery +1⏱ in Q1.
- 5 Discovery cards in Q1, ma sono OPZIONALI
- Realistic: 1-2 Discovery played = +1 to +2⏱ Q1
- Tempo è il vero collo di bottiglia Q1: -1 a -2K MAU eq.

**Net**: 0 to +2K. ⚖️ Balanced (forse leggermente sotto).

### ⚙️ Tech First — `Tool -1💰 + Funding +1⏱ + funding award ×0.5`

**Bonus**:
- 4 Tool cards (ci_cd, data_lake, design_system, monitoring)
- −1💰 ciascuno se pescati = -4💰 = +1-2K MAU eq.
- Più importante: facilita 4-permanents → Tech Stack gold 8pt (vs 4pt silver default) = +4pt
- Sinergia Engineering Excellence se ci si pulisce il debt = +12pt synergy

**Malus**:
- Funding +1⏱: 2-3 funding plays = +2-3⏱ = -1K MAU eq.
- Funding award gold (8) × 0.5 = 4. Loss -4pt.
- Funding silver (3) × 0.5 = 2. Loss -1pt.

**Net**: +6-8K bonus - 5-6K malus = **+1 to +3K**. ⚖️ Balanced (post-S9.2 nerf).

### 💪 Bootstrapped — startBudget +6, +1 talento, no Funding, Hiring -1💰, talent ×1.3

**Bonus**:
- +6💰 +1🧠 start ≈ +1-2K MAU eq.
- Hiring −1💰 × 4-5 plays = -4 a -5💰 = +1-2K MAU eq.
- Talent gold (12) × 1.3 = 16. +4pt. Silver (5) × 1.3 = 7. +2pt.
- Avg realistic: +2-3pt talent boost = +2-3K
- **Total bonus stimato: +6-10K MAU**

**Malus** (no Funding):
- Pre-seed (+4💰), founder_hustle (+3💰), series_a (+6💰), consulting (+4💰), series_b (+10💰), ent_deal (+6💰)
- Total Funding lost: 33💰 max = ~11K MAU end-game conversion
- Funding award (gold 8pt = 8K MAU eq.) gone = -8K
- Full Funding synergy (10pt) gone = -10K
- **Total malus stimato: -10 to -15K MAU** (depends on RNG hit rate)

**Net**: -2K a +0K. **🥶 Borderline weak**.

> **⚠️ Validation flag**: Bootstrapped è il maggior candidato a fallire
> il criterio "win rate ≥35%". Da playtest in S9.8. Se confermato weak,
> step successivi:
> - Bumping `startingBudget: 6 → 8`
> - O aggiungere `effectBonusByType: { Hiring: { vp: 1 } }` (Hiring +1K MAU)
> - O aggiungere `awardMultipliers: { eng_exc: 1.5 }` (engineering excellence boost — Bootstrapped builds team and code)

### 📈 Data Empire — Data Lake gratis + morale -3

**Bonus**:
- Data Lake: 4💰 saved + +1📊 per Feature/Launch/Discovery
- 5-7 cards triggering Data Lake = +5-7 dati extra
- Push verso Data tier silver (≥6 = 5pt) o gold (≥10 = 15pt)
- Data Empire synergy unlock (Data Lake + 8📊 + 3 carte data = 15pt)
- **Total bonus**: +6-10K MAU eq.

**Malus**:
- Morale -3 start (5 → 2). Need +3 recovery just per bronze tier.
- 2-3 carte morale-positive needed = -4 to -6💰 cost
- Risk of morale tier-none = -2 to -5pt
- **Total malus**: -3 to -5K MAU eq.

**Net**: +2 to +5K. ⚖️ Balanced (post-S9.1.d).

### 💼 B2B Veteran — Series A/Ent. Deal -1⏱, Funding +1 vp, +30% award, no Mobile App

**Bonus**:
- Series A -1⏱ (single instance), Ent. Deal -1⏱ (Q3) = -2⏱ saved on 2 cards
- Funding +1 vp × 2-3 plays = +2-3K MAU
- Funding award gold (8) × 1.3 = 10.4 → 10. +2pt.
- Full Funding synergy (10) × 1.3 = 13. +3pt.
- **Total bonus**: +5-7K MAU eq.

**Malus**:
- No Mobile App (vp 6, dati 4)
- Mobile App affordance ~50-60% in random pyramid → expected loss = 0.55 × 6K = ~3.3K
- **Total malus**: -3 to -4K MAU eq.

**Net**: +1 to +4K. ⚖️ Balanced (post-S9.2 boost).

> **⚠️ Validation flag**: secondo candidato a fallire balance — il
> Mobile App exclusion è strutturale e RNG-dependent (se Mobile App
> non esce nella pyramid, B2B non perde nulla ma neanche ottiene un
> bonus). Da playtest in S9.8.

### 📣 Viral Native — Launch ×1.5 + Tool +1⏱

**Bonus**:
- Launch cards: 7 in Q3 (campagna_virale, ab_testing, reco_engine, dashboard, premium_tier, pr_push, all_hands)
- Avg 2-3 Launch plays × ~+2 vp boost (from 5 base × 1.5 = 8) = +4-6K MAU
- **Total bonus**: +4-6K MAU eq.

**Malus**:
- Tool +1⏱ = 1-2 Tool plays = +1-2⏱ = -1K MAU eq.
- **Total malus**: -1 to -2K MAU eq.

**Net**: +3 to +5K. ⚖️ Balanced (forse leggero edge superiore).

> **Note**: il roadmap suggeriva 1.5 → 1.3 ma la matematica suggerisce
> che 1.5 è ancora dentro range balanced. Validate in S9.8.

---

## 🧪 Playtest protocol (per S9.8 e ricerche balance)

### Setup deterministico

Per testare una Vision specifica senza dipendere dal random draft di 3:

```js
// In browser console:
localStorage.setItem("dev.forceVision", "founder_mode");
// poi avvia partita normalmente — il modal Vision Draft viene skippato
// e Founder Mode viene auto-pickata.

// Per resettare:
localStorage.removeItem("dev.forceVision");
```

ID validi: `founder_mode`, `lean_startup`, `growth_hacker`, `tech_first`,
`bootstrapped`, `data_empire`, `b2b_veteran`, `viral_native`.

### Procedura per misurazione win rate

Per ogni Vision:
1. Setup `localStorage.setItem("dev.forceVision", "<id>")`
2. Difficoltà: **Senior** (per playtest balance — Junior troppo facile,
   Director introduce variance da AI quality)
3. Scenario: **Standard** (isola la variabile Vision)
4. Gioca 5 partite di seguito
5. Annota per ogni partita:
   - Win/Loss (1° posto = win)
   - Final MAU (umano)
   - Award totale split: stat / synergy / Q-bonus

### Decision tree

| Win rate misurato | Azione |
|-------------------|--------|
| < 25% | 💪 Strong buff: +1 startingBudget OR add positive modifier |
| 25-35% | 🟡 Moderate buff: aggiusta un numero del +20% |
| 35-65% | ✅ OK, lascia così |
| 65-75% | 🟡 Moderate nerf: aggiusta un numero del -20% |
| > 75% | 🔥 Strong nerf: rimuovi un bonus o aggiungi un malus |

### Recording template

Crea un foglio (o sezione qui) per ogni Vision:

```markdown
### Founder Mode — measured (data inserimento)

| # | Win? | MAU | Award stat | Award syn | Note |
|---|:----:|----:|----:|----:|------|
| 1 | ✅   | 67K | 22 | 0 | morale gold + talent silver |
| 2 | ❌   | 45K | 14 | 0 | morale silver only |
| 3 | ✅   | 71K | 28 | 10 | hit Lean Op synergy! |
| 4 | ❌   | 52K | 16 | 0 | data empire stole the win |
| 5 | ✅   | 64K | 18 | 0 | nothing notable |

Win rate: 3/5 = 60%. ✅ OK.
```

---

## 📊 Per-Q OKR — completion rate stimato (post-S9.3)

| OKR | Reward | Difficoltà soggettiva | Completion rate stimato |
|-----|-------:|:---------------------:|:----------------------:|
| `morale_high` (≥7) | 4K | Bassa | ~75% |
| `data_target` (≥5) | 5K | Media | ~50% |
| `talent_pool` (≥4) | 5K | Media | ~50% |
| `ship_features` (2+) | 5K | Bassa-Media | ~60% |
| `hiring_drive` (2+) | 4K | Media | ~50% |
| `fix_first` (1+) | 3K | Bassa | ~80% (in Q2/Q3) |
| `cost_efficiency` (≤4 budget) | 5K | Media | ~40% |
| `permanent_collector` (≥2 perm) | 6K | Media-Alta | ~30% (richiede commitment) |
| `funding_streak` (2+) | 4K | Media | ~40% |
| `dept_purist` (3+ mono-dept) | **8K** | **Molto alta** | ~20% (random pyramid!) |
| `morale_boost` (+2 morale) | 4K | Media | ~50% |
| `velocity_run` (5+ carte) | **6K** | Alta in Q1 | ~35% Q1, ~60% Q2/Q3 |
| `no_tech_debt` (≤1) | **7K** | Alta in Q3 | ~40% (Crunch tentanti) |
| `diversification` (3 dept) | 5K | Media | ~60% |
| `synergy_chaser` (2+ chains) | 5K | Media | ~40% (chains = play-style dependent) |
| `lean_quarter` (0 discards) | 4K | Bassa-Media | ~50% (richiede affordability) |

> Nota: i valori non sono misurati. Da popolare in S9.8 con dati reali.

---

## 🎲 Scenarios — feel notes

### Standard
Baseline. Tutte le partite balance assume Standard.

### Bear Market 2008
- Funding +2💰 cost: scoraggia funding play
- Funding award ×2: ma chi riesce è premiato
- **Predizione**: B2B Veteran (post-S9.2) dovrebbe brillare qui
  (Funding +1 MAU + funding award ×1.3 da Vision × ×2 da scenario = ×2.6).
- Tipo gioco: tooling-first o crunch-heavy.

### AI Hype Wave
- Data dept ×1.5 effetto: power spike per Data Empire
- Tool -1💰: simile a Tech First passive
- **Predizione**: Data Empire dominante (Data Lake + ×1.5 effetti dati).
- Tipo gioco: data-stack heavy.

### Remote First
- Tutte cards: 0⏱ cost
- Max Talento 3: cap fortissimo, blocca synergy Talent gold
- -1 Morale Q-start: pressure costante
- **Predizione**: Lean Startup ottima qui (debt tolerance + Hiring +1💰
  cap su salary in un Q senza tempo cost).
- Tipo gioco: VP-rush sfruttando 0⏱.

---

## 📝 Change log

- **2026-04-28** (S9.2): inizializzato. Documentate le 8 Vision post-S9.1+S9.4
  con math analysis. Apply: Tech First nerf (funding ×0.5), Bootstrapped
  full rework, B2B Veteran buff (funding ×1.3, full_funding ×1.3).
- **(future S9.8)**: popolate i blocchi `Measured` con win rate effettivi
  da 40 partite (5 × 8 Vision).

---

_Documento iniziato da Federica + Claude. Tienilo aggiornato man mano
che misuri win rate empirici e fai tweak. È la knowledge base per
future iterazioni di balance._
