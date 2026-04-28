"use strict";

// =============================================================
// ai.js — AI decision logic for picks
//
// S5.1: Each AI has a distinct persona with weights, target awards,
//       risk tolerance and reject types. Used by Senior+ difficulty.
// S5.2: Lookahead 1-step + difficulty selector.
// =============================================================

// === S5.1: AI_PERSONAS ===
// Indexed by playerIdx (1..3). The human is index 0 (no persona).
// Junior difficulty disables persona effects (uses BALANCE.AI defaults).
const AI_PERSONAS = {
  1: {
    id: "marco",
    name: "Marco · The Scaler",
    dept: "eng",
    weights: {
      vp: 2.0,
      dati: 1.0,
      talento: 1.8,
      budget: 0.7,
      morale: 0.7,
      permanent: 5,    // chases Tech Stack synergy
      chain: 3,        // values combos
    },
    targetAwards: ["stack", "eng_exc", "clean"],
    riskTolerance: 0.30,        // avoids Crunch Cards
    rejectTypes: [],            // open to any type
    preferredVisions: ["tech_first", "lean_startup"],
  },
  2: {
    id: "alessia",
    name: "Alessia · The Hustler",
    dept: "product",
    weights: {
      vp: 2.5,         // chases users hard
      dati: 0.8,
      talento: 1.2,
      budget: 1.0,
      morale: 0.6,
      permanent: 2,
      chain: 2,
    },
    targetAwards: ["funding", "full_funding", "morale"],
    riskTolerance: 0.85,        // accepts debt for short-term wins
    rejectTypes: [],
    preferredVisions: ["growth_hacker", "viral_native", "founder_mode"],
  },
  3: {
    id: "karim",
    name: "Karim · The Auditor",
    dept: "data",
    weights: {
      vp: 1.5,
      dati: 2.5,       // values data heavily
      talento: 1.2,
      budget: 0.8,
      morale: 0.5,
      permanent: 4,    // tooling matters (esp. Monitoring)
      chain: 2.5,
    },
    targetAwards: ["clean", "data", "bugcrush", "data_empire"],
    riskTolerance: 0.15,        // very risk-averse
    rejectTypes: ["Sabotage"],  // ethical Auditor doesn't backstab
    preferredVisions: ["data_empire", "lean_startup"],
  },
};

// === S5.1: target award → card-feature bias ===
// Returns extra score for cards that contribute to a persona's target awards.
function personaTargetAwardBonus(persona, card, e) {
  let bonus = 0;
  const t = persona.targetAwards || [];
  if (t.includes("stack")        && card.permanent)                              bonus += 2.0;
  if (t.includes("clean")        && card.type === "BugFix" && e.techDebt < 0)    bonus += 2.0;
  if (t.includes("eng_exc")      && card.type === "BugFix")                      bonus += 1.5;
  if (t.includes("data")         && card.dept === "data")                        bonus += 1.5;
  if (t.includes("data_empire")  && (card.id === "data_lake" || card.dept === "data")) bonus += 1.2;
  if (t.includes("funding")      && card.type === "Funding")                     bonus += 2.0;
  if (t.includes("full_funding") && card.type === "Funding")                     bonus += 1.5;
  if (t.includes("morale")       && (e.morale || 0) > 0)                         bonus += 1.5;
  if (t.includes("bugcrush")     && card.type === "BugFix")                      bonus += 2.0;
  if (t.includes("talent")       && (e.talento || 0) > 0)                        bonus += 1.2;
  return bonus;
}

// === S5.2: lookahead 1-step ===
// Estimate the value of the card that'd be revealed by taking (row, col),
// from the perspective of *who picks next*.
// Returns positive if the next picker is the same AI (gift to self in snake draft),
// negative if it's an opponent (gift to enemy).
function lookaheadDelta(playerIdx, row, col) {
  if (row === 0) return 0; // top row, nothing above
  const above = state.pyramid[row - 1]?.[col];
  if (!above || above.taken || above.faceUp) return 0; // nothing to reveal
  const nextIdx = state.pickOrder[state.pickIndex + 1];
  if (nextIdx === undefined) return 0; // last pick of Q

  const c = above.card;
  const e = c.effect || {};
  const value =
    (e.vp || 0) * 1.5 +
    (e.dati || 0) * 0.6 +
    (e.talento || 0) * 0.7 +
    (c.permanent ? 2.5 : 0) +
    (c.type === "Funding" ? 1.0 : 0);

  return (nextIdx === playerIdx) ? value * 0.5 : -value * 0.4;
}

// Per-AI department bias (index 0 = human, 1..3 = AI personalities)
const AI_DEPT_BIAS = ["", "eng", "product", "data"];

// S2.1: per-persona OKR preferences — each AI prefers OKRs aligned to their dept
const AI_OKR_PREFERENCES = {
  eng: ["fix_first", "no_tech_debt", "hiring_drive", "ship_features", "velocity_run", "permanent_collector"],
  product: ["funding_streak", "morale_high", "morale_boost", "ship_features", "diversification", "cost_efficiency"],
  data: ["data_target", "permanent_collector", "diversification", "ship_features", "dept_purist"],
};

// S3.2 + S5.2 + S9.6.b: AI decides whether to block a pending reveal.
// Junior: never blocks. Senior: 0.45 prob. Director: 0.7 prob (default).
// S9.6.b: Director adatta threshold+prob quando l'umano è leader (pressure mode):
//   - blockProb 0.7 → 0.85 (più aggressivo nel denying gold)
//   - value threshold 4 → 3 (blocca anche reveal medi-alti)
function aiSelectBlocker(actingIdx, toReveal) {
  if (!toReveal) return null;
  if (state.difficulty === "junior") return null;

  const isDirector = state.difficulty === "director";
  // Detect human-leader for adaptive block (Director only)
  const human = state.players[0];
  const isHumanLeading = isDirector
    && state.players.every(pp => pp === human || pp.vp <= human.vp);

  let blockProb = isDirector ? 0.7 : 0.45;
  let valueThreshold = 4;
  if (isHumanLeading) {
    blockProb = 0.85;
    valueThreshold = 3;
  }

  for (let i = 1; i < state.players.length; i++) {
    if (i === actingIdx) continue;
    const ai = state.players[i];
    if (ai.blockUsedThisQ) continue;
    if (ai.budget < BALANCE.BLOCK.COST_BUDGET) continue;
    if (ai.tempo  < BALANCE.BLOCK.COST_TEMPO)  continue;

    const c = toReveal.card;
    const value = (c.effect?.vp || 0) + (c.effect?.dati || 0) * 0.5 + (c.effect?.talento || 0) * 0.5;
    const picker = state.players[actingIdx];
    if (value >= valueThreshold && picker.vp >= ai.vp) {
      if (Math.random() < blockProb) return i;
    }
  }
  return null;
}

// S2.1: AI drafts an OKR from the offered options.
// Score = base reward + persona bias + tiny noise.
function chooseAIOKR(playerIdx, options) {
  const W = BALANCE.AI;
  const persona = AI_PERSONAS[playerIdx];
  const dept = persona?.dept || AI_DEPT_BIAS[playerIdx] || "";
  const liked = AI_OKR_PREFERENCES[dept] || [];
  const scored = options.map(okr => {
    let score = okr.reward;
    if (liked.includes(okr.id)) score += 2;
    score += Math.random() * (W.RANDOMNESS || 0.5);
    return { okr, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].okr;
}

// S9.6.c: per-scenario preferred Vision IDs (Director-only nudge).
// Returns the Visions that are mechanically advantageous for the given
// scenario. Used additively on top of persona.preferredVisions in
// chooseAIVision — Director combines both.
function scenarioPreferredVisions(scenarioId) {
  switch (scenarioId) {
    // Bear Market: Funding cards costano +2💰 → Bootstrapped (no funding)
    // o Tech First (tooling instead of funding) sono i migliori adattamenti.
    case "bear_market_2008": return ["bootstrapped", "tech_first"];
    // AI Hype Wave: Data dept ×1.5 effetto → Data Empire amplifica massivo.
    case "ai_hype_wave":     return ["data_empire"];
    // Remote First: 0⏱ cost + max Talento 3 + -1 Morale/Q → Lean Startup
    // tolerance debt è il vantaggio (puoi fare crunch senza penalty).
    case "remote_first":     return ["lean_startup"];
    default: return [];
  }
}

// S5.1 + S9.6.c: AI drafts a Vision aligned with persona's preferredVisions.
// Director also weighs in the active scenario's preferred Visions.
function chooseAIVision(playerIdx, options) {
  // Junior: pure random
  if (state.difficulty === "junior") {
    return options[Math.floor(Math.random() * options.length)];
  }
  const persona = AI_PERSONAS[playerIdx];
  if (!persona) return options[Math.floor(Math.random() * options.length)];

  // S9.6.c: scenario-aligned bonus (Director only)
  const scenarioPrefs = (state.difficulty === "director" && state.scenario)
    ? scenarioPreferredVisions(state.scenario.id)
    : [];

  const scored = options.map(v => {
    let s = persona.preferredVisions?.includes(v.id) ? 5 : 0;
    if (scenarioPrefs.includes(v.id)) s += 4; // S9.6.c: forte nudge scenario
    s += Math.random() * 1.5;
    return { v, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[0].v;
}

function decideAIPickFromPyramid(playerIdx) {
  const player = state.players[playerIdx];
  const pickable = getPickableSlots();
  if (pickable.length === 0) return null;
  const W = BALANCE.AI;
  // S5.1: persona only active in Senior+ (Junior uses BALANCE defaults)
  const persona = (state.difficulty !== "junior") ? AI_PERSONAS[playerIdx] : null;
  const pw = persona?.weights || {};
  const myDept = persona?.dept || AI_DEPT_BIAS[playerIdx];
  // S5.2: lookahead enabled in Senior+
  const useLookahead = state.difficulty !== "junior";

  // Score visible (face-up) pickable cards
  const scored = pickable.map(({ row, col, slot }) => {
    const card = slot.card;
    let s = 0;
    // S4.1: AI looks at effective effect (after Vision + active Event modifiers)
    const e = effectiveCardEffect(player, card);

    // S5.1: persona-resolved weights (override defaults from BALANCE.AI)
    s += (e.vp      || 0) * (pw.vp        ?? W.VP_WEIGHT);
    s += (e.dati    || 0) * (pw.dati      ?? W.DATI_WEIGHT);
    s += (e.talento || 0) * (pw.talento   ?? W.TALENTO_WEIGHT);
    s += (e.budget  || 0) * (pw.budget    ?? W.BUDGET_WEIGHT);
    s += (e.morale  || 0) * (pw.morale    ?? W.MORALE_WEIGHT);
    s += card.permanent  ?  (pw.permanent ?? W.PERMANENT_BONUS) : 0;
    if (isChainTriggered(player, card)) s += (pw.chain ?? W.CHAIN_BONUS);

    // Need-driven adjustments (universal, not persona-bound)
    if (player.budget  < W.LOW_BUDGET_THRESHOLD  && e.budget)  s += W.LOW_BUDGET_BONUS;
    if (player.talento < W.LOW_TALENT_THRESHOLD  && e.talento) s += W.LOW_TALENT_BONUS;
    if (player.morale  < W.LOW_MORALE_THRESHOLD  && e.morale)  s += W.LOW_MORALE_BONUS;

    // S1.1: real BugFix bonus scales with the actual debt removed
    if (player.techDebt >= W.BUGFIX_NEEDED_THRESHOLD && e.techDebt && e.techDebt < 0) {
      s += Math.abs(e.techDebt) * W.BUGFIX_NEEDED_MULT;
    }

    // S1.1 + S5.1: Crunch Card penalty scaled by persona risk tolerance
    if (e.techDebt && e.techDebt > 0) {
      const riskMult = persona ? (1 / (persona.riskTolerance + 0.15)) : 2;
      s -= e.techDebt * W.DEBT_PENALTY_MULT * (riskMult / 2);
      if (player.techDebt >= W.DEBT_AMPLIFY_THRESHOLD) s -= e.techDebt * W.DEBT_AMPLIFY_MULT;
    }

    // S5.1: persona target awards bias
    if (persona) s += personaTargetAwardBonus(persona, card, e);

    // S5.1: persona reject types — strong negative
    if (persona?.rejectTypes?.includes(card.type)) s -= 10;

    // S3.1 + S9.6: Sabotage cards — scoring per effect-type (data-driven)
    // S9.4 ha introdotto sabotage con target diverso dal leader; lo scoring
    // generico "valore scala con quanto sono dietro" è giusto solo per le
    // sabotage anti-leader. Le altre richiedono context-aware scoring.
    if (card.type === "Sabotage") {
      const myVp = player.vp;
      const leaderVp = Math.max(...state.players.map(pp => pp.vp));

      // Anti-leader sabotage (talent_poach, patent_lawsuit, negative_press,
      // counter_marketing): value scala con quanto sono dietro.
      const isAntiLeader = e.stealHiringFromLeader || e.targetMostFeatures
                        || e.targetLeaderMorale || e.cancelNextLaunch;
      if (isAntiLeader) {
        if (myVp < leaderVp) {
          s += (leaderVp - myVp) * 0.3;
        } else {
          s -= 2; // sono io il leader, anti-leader è auto-sabotaggio
        }
      }

      // S9.4 + S9.6: Anti-last sabotage (hostile_takeover) — utile se SONO
      // leader e voglio staccare il last-place. Bonus scala con la prossimità
      // del last-place (gap < 15 = leadership fragile).
      if (e.stealVpFromLast) {
        if (myVp >= leaderVp) {
          const lastVp = Math.min(...state.players
            .filter(pp => pp !== player).map(pp => pp.vp));
          const gap = myVp - lastVp;
          if (lastVp > 0 && gap < 15) s += 3;
          else if (lastVp > 0) s += 1; // leadership comoda, meno utile
        } else {
          s -= 1; // not the right tool quando non sono leader
        }
      }

      // S9.4 + S9.6: Anti-next-picker sabotage (industry_whisper) — utile se
      // il next picker è un threat (vp ≥ mio). Skip self (snake transition).
      if (e.weakenNextPicker) {
        const nextIdx = state?.pickOrder?.[state.pickIndex + 1];
        if (nextIdx != null && nextIdx !== playerIdx) {
          const nextPlayer = state.players[nextIdx];
          if (nextPlayer.vp >= myVp) s += 2; // threatening next picker
          else s += 0.5;
        } else {
          s -= 1; // self-targeted (snake fold) → wasted
        }
      }
    }

    // S9.6.a: Director-only — leader-pressure su umano in vetta
    // Quando l'umano è leader, l'AI Director:
    //   1) prende sabotage anche se non target-persona (counter sul leader)
    //   2) counter-pick high-VP cards per sottrarle (greedy denial)
    if (state.difficulty === "director") {
      const human = state.players[0];
      const isHumanLeading = state.players
        .every(pp => pp === human || pp.vp <= human.vp);
      if (isHumanLeading) {
        if (card.type === "Sabotage") s += 2.5;
        if ((e.vp || 0) >= 5) s += 1.0; // counter-pick
      }
    }

    // Department bias per AI personality (persona.dept or fallback)
    if (myDept && card.dept === myDept) s += W.DEPT_BIAS_BONUS;

    // S5.2: lookahead 1-step (Senior+ only)
    if (useLookahead) s += lookaheadDelta(playerIdx, row, col);

    // Randomness + affordability gate
    s += Math.random() * W.RANDOMNESS;
    if (!canAfford(player, card)) s -= W.UNAFFORDABLE_PENALTY;

    return { row, col, card, score: s };
  });
  scored.sort((a, b) => b.score - a.score);

  const topAffordable = scored.find(x => canAfford(player, x.card));
  if (topAffordable) return { row: topAffordable.row, col: topAffordable.col, card: topAffordable.card, action: "play" };

  // Nothing affordable: take best card and discard for budget
  const fb = scored[0];
  return { row: fb.row, col: fb.col, card: fb.card, action: "discard" };
}
