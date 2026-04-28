"use strict";

// =============================================================
// balance.js — Single source of truth for all tunable constants.
// Modify here to retune the game; never hard-code numbers in
// rules.js, game.js, or ai.js.
//
// Conventions:
//  - Resource names match player state (budget, tempo, talento, …)
//  - Numbers represent: K MAU, resource units, multipliers, etc.
//  - Frozen at top level to surface accidental mutations as errors.
// =============================================================

const BALANCE = Object.freeze({
  // ────────────────────────────────────────────
  // Initial player state (used by newPlayer)
  // ────────────────────────────────────────────
  PLAYER_INIT: Object.freeze({
    budget:   6,
    talento:  1,
    morale:   5,
    dati:     0,
    techDebt: 0,
    vp:       0,
  }),

  // ────────────────────────────────────────────
  // Per-quarter setup
  // ────────────────────────────────────────────
  QUARTER: Object.freeze({
    BASE_TEMPO:        5,    // base tempo each Q before bonuses/penalties
    CI_CD_TEMPO_BONUS: 1,    // +tempo if player has CI/CD permanent
    MIN_TEMPO:         1,    // never go below this even with heavy debt
    OKRS_PER_QUARTER:  1,    // S2.1: drafted, only one OKR per Q
    OKR_DRAFT_SIZE:    3,    // S2.1: pick 1 from N random options
  }),

  // ────────────────────────────────────────────
  // Tech Debt — penalties and tempo loss
  // ────────────────────────────────────────────
  DEBT: Object.freeze({
    // Tempo loss from bug-fixing (S1.1.1)
    // tempoLoss = max(0, floor((debt - TEMPO_LOSS_OFFSET) / TEMPO_LOSS_DIVISOR))
    TEMPO_LOSS_OFFSET:   2,   // debt up to this is "free"
    TEMPO_LOSS_DIVISOR:  2,   // every N debt above offset = -1⏱

    // Per-Q VP penalty (S1.1)
    Q_PENALTY_THRESHOLD: 3,   // penalty kicks in at debt >= this
    Q_PENALTY_OFFSET:    2,   // penalty = max(0, debt - this)

    // End-game VP penalty (S1.1)
    ENDGAME_PENALTY_MULT: 2,  // -X K MAU per debt remaining

    // Permanent removal effect (Monitoring)
    MONITORING_REMOVAL: 1,    // -debt per Q if monitoring permanent owned
  }),

  // ────────────────────────────────────────────
  // Budget pressure (S1.2)
  // ────────────────────────────────────────────
  BUDGET: Object.freeze({
    Q_CARRYOVER_DIVISOR: 2,   // budget /= this between Q (so half stays)
    CONVERSION_DIVISOR:  3,   // K MAU = floor(evaporated / this)
  }),

  // ────────────────────────────────────────────
  // Discard (when player can't afford a card)
  // ────────────────────────────────────────────
  DISCARD: Object.freeze({
    BUDGET_REFUND: 2,         // +budget when discarding
    DEBT_PENALTY:  1,         // +tech debt when discarding
  }),

  // ────────────────────────────────────────────
  // End-game Awards (S1.1, S1.2, S2.2)
  // S2.2: linear awards rebuilt as tiered thresholds; +4 synergy awards.
  // ────────────────────────────────────────────
  AWARDS: Object.freeze({
    // Tier-based stat awards — tiers in DESCENDING threshold order.
    // First match wins. {threshold, points, label}
    // S9.1.a: aggiunto bronze tier (low threshold, ~2pt) per smussare il
    // gold-or-nothing. Premia investimenti moderati invece che solo go-all-in.
    MORALE_TIERS: Object.freeze([
      Object.freeze({ threshold: 9, points: 12, label: "≥ 9" }),
      Object.freeze({ threshold: 7, points:  5, label: "≥ 7" }),
      Object.freeze({ threshold: 5, points:  2, label: "≥ 5" }),  // S9.1.a bronze
    ]),
    TALENT_TIERS: Object.freeze([
      Object.freeze({ threshold: 7, points: 12, label: "≥ 7" }),
      Object.freeze({ threshold: 5, points:  5, label: "≥ 5" }),
      Object.freeze({ threshold: 3, points:  2, label: "≥ 3" }),  // S9.1.a bronze
    ]),
    DATA_TIERS: Object.freeze([
      Object.freeze({ threshold: 10, points: 15, label: "≥ 10" }),
      Object.freeze({ threshold:  6, points:  5, label: "≥ 6"  }),
      Object.freeze({ threshold:  3, points:  2, label: "≥ 3"  }), // S9.1.a bronze
    ]),
    FUNDING_TIERS: Object.freeze([
      Object.freeze({ threshold: 3, points: 8, label: "≥ 3 round" }),
      Object.freeze({ threshold: 2, points: 3, label: "2 round" }),
    ]),
    BUGFIX_TIERS: Object.freeze([
      Object.freeze({ threshold: 3, points: 8, label: "≥ 3 fix" }),
      Object.freeze({ threshold: 2, points: 3, label: "2 fix" }),
      Object.freeze({ threshold: 1, points: 1, label: "1 fix" }),
    ]),

    // Existing threshold-keyed maps (S1.1)
    CLEAN_CODE: Object.freeze({ 0: 8, 1: 5, 2: 2 }),
    TECH_STACK: Object.freeze({ 4: 8, 3: 4, 2: 1 }),

    // S2.2: Synergy awards — multi-condition, all-or-nothing
    SYNERGIES: Object.freeze({
      LEAN_OP:        Object.freeze({ points: 10, MORALE_MIN: 8, TALENT_MAX: 4 }),
      ENG_EXC:        Object.freeze({ points: 12, BUGFIX_MIN: 3, DEBT_MAX: 1 }),
      DATA_EMPIRE:    Object.freeze({ points: 15, DATA_MIN: 8, DATA_CARDS_MIN: 3 }),
      FULL_FUNDING:   Object.freeze({ points: 10, UNIQUE_MIN: 3 }),
    }),
  }),

  // ────────────────────────────────────────────
  // Per-Q Departmental dominance bonuses (S3.1: now tiered 1°/2°/3°)
  // 1° = full bonus, 2° = half (floor), 3° = DOMINANCE_THIRD_VP, ties = 0
  // ────────────────────────────────────────────
  DOMINANCE: Object.freeze({
    product: Object.freeze({ vp: 2, dati: 1,    label: "Product Lead"     }),
    eng:     Object.freeze({ vp: 2, talento: 1, label: "Engineering Lead" }),
    data:    Object.freeze({ vp: 2, dati: 2,    label: "Data Lead"        }),
  }),
  DOMINANCE_THIRD_VP: 1,         // S3.1: bronze prize for 3° posto

  // ────────────────────────────────────────────
  // Block & React mechanic (S3.2)
  // ────────────────────────────────────────────
  BLOCK: Object.freeze({
    COST_BUDGET: 2,
    COST_TEMPO: 1,
    // S9.7: 2500 → 4000ms. Il review post-launch ha rilevato che 2.5s sono
    // troppo pochi per un giocatore casual che sta leggendo bacheca / forecast
    // mentre l'AI gioca. Block è attivo solo per reveals high-value (filtro
    // affordability già applicato), quindi una finestra più larga non lo
    // rende abusabile. 4s = ~lettura di una notification panel.
    WINDOW_MS: 4000,             // human reaction window in ms
    REVEAL_DELAY_TURNS: 2,       // blocked reveal fires N picks later
  }),

  // ────────────────────────────────────────────
  // AI scoring weights (used by decideAIPickFromPyramid)
  // ────────────────────────────────────────────
  AI: Object.freeze({
    VP_WEIGHT:           2,
    DATI_WEIGHT:         1.2,
    TALENTO_WEIGHT:      1.5,
    BUDGET_WEIGHT:       0.8,
    MORALE_WEIGHT:       0.5,
    PERMANENT_BONUS:     3,
    CHAIN_BONUS:         2.5,
    LOW_BUDGET_THRESHOLD:    3,
    LOW_BUDGET_BONUS:        2,
    LOW_TALENT_THRESHOLD:    2,
    LOW_TALENT_BONUS:        2,
    LOW_MORALE_THRESHOLD:    4,
    LOW_MORALE_BONUS:        1.5,
    BUGFIX_NEEDED_THRESHOLD: 3,    // when to crave real BugFix
    BUGFIX_NEEDED_MULT:      2,    // multiplier on |techDebt removed|
    DEBT_PENALTY_MULT:       1.5,  // base discouragement for crunch cards
    DEBT_AMPLIFY_THRESHOLD:  3,    // amplify penalty when own debt is here
    DEBT_AMPLIFY_MULT:       2,    // additional penalty multiplier when in trouble
    DEPT_BIAS_BONUS:         1.2,  // each AI's preferred-department nudge
    UNAFFORDABLE_PENALTY:    5,    // base penalty for cards we can't actually pay
    RANDOMNESS:              0.6,  // random jitter to avoid identical AI behavior
  }),
});
