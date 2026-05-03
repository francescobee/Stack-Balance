"use strict";

// =============================================================
// weekly-challenges.js — Weekly Challenge mode (S18.3)
//
// Daily-like alternative: a single seeded run per ISO week with
// EXPLICIT mutators (cost/effect/award). Reuses the modifier
// engine in rules.js (third pass alongside Vision + Event +
// Scenario). 6 challenges rotated by week-of-year hash.
//
// Each entry shape:
//   id, name, icon, description
//   modifiers: { ...applyEffectModifiers/applyCostModifiers keys }
//              also: startingBudget / startingTalento / startingMorale
//              applied through the same Vision-style helpers.
//   winBonusXP: extra XP awarded when winning this week's challenge
//   noteBeforeStart?: extra UX line shown in the intro modal
//
// state.weeklyChallenge is populated on startGame when isWeekly=true.
// Persistence: profile.weeklyHistory[weekKey] = { won, finalUsers, ts, ... }
// hasPlayedWeeklyThisWeek() gates the splash button.
// =============================================================

const WEEKLY_POOL = [
  {
    id: "debt_free",
    name: "Debt-Free Zone",
    icon: "🛡️",
    description: "Tech Debt non penalizza in questa settimana. Spingi il crunch a piacere.",
    modifiers: {
      // Push the Q-penalty threshold above any reachable debt level.
      debtPenaltyOffset: 999,
      debtTempoLossOffset: 999,
    },
    winBonusXP: 100,
  },
  {
    id: "frugal_founder",
    name: "Frugal Founder",
    icon: "🪙",
    description: "Inizi con 3 budget in meno. Sopravvivi e vinci comunque.",
    modifiers: {
      startingBudget: -3,
    },
    winBonusXP: 150,
    noteBeforeStart: "Hard mode: ogni decisione conta.",
  },
  {
    id: "no_sabotage",
    name: "No Sabotage Allowed",
    icon: "🕊️",
    description: "Le carte Sabotage sono escluse dal pool. Niente colpi bassi.",
    modifiers: {
      excludeCardTypes: ["Sabotage"],
    },
    winBonusXP: 80,
  },
  {
    id: "data_drought",
    name: "Data Drought",
    icon: "📉",
    description: "Le carte Discovery rendono metà dei dati. Trova un'altra via.",
    modifiers: {
      effectMultipliersByType: { Discovery: { dati: 0.5 } },
    },
    winBonusXP: 120,
  },
  {
    id: "crunch_time",
    name: "Crunch Time",
    icon: "⏰",
    description: "Le Feature costano +1⏱. Ogni quarter è una corsa contro il tempo.",
    modifiers: {
      costModifiersByType: { Feature: { tempo: 1 } },
    },
    winBonusXP: 100,
  },
  {
    id: "talent_war",
    name: "Talent War",
    icon: "🥊",
    description: "Le carte Hiring costano +1💰. Si fa fatica a scalare il team.",
    modifiers: {
      costModifiersByType: { Hiring: { budget: 1 } },
    },
    winBonusXP: 100,
  },
];

function getWeeklyChallengeById(id) {
  return WEEKLY_POOL.find(w => w.id === id) || null;
}

// =============================================================
// Week key & seed — ISO 8601 week number (Mon-Sun) keyed as
// "YYYY-Www" (e.g. "2026-W18"). Deterministic across browsers.
// =============================================================
function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);             // Thursday of this week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function currentWeekKey() {
  return isoWeekKey(new Date());
}

// Hash week key → integer seed for setRngSeed (xorshift32-friendly).
function weeklySeed() {
  const key = currentWeekKey();
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h) + key.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) || 1;
}

// =============================================================
// Pick the active weekly challenge based on the week hash. Same
// week → same challenge for every player on Earth.
// =============================================================
function getCurrentWeeklyChallenge() {
  const key = currentWeekKey();
  // Hash separately from weeklySeed so changing one curve doesn't
  // rotate the challenge unexpectedly.
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 3) + h + key.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % WEEKLY_POOL.length;
  return WEEKLY_POOL[idx];
}

function hasPlayedWeeklyThisWeek() {
  const profile = (typeof getProfile === "function") ? getProfile() : null;
  if (!profile?.weeklyHistory) return false;
  return !!profile.weeklyHistory[currentWeekKey()];
}
