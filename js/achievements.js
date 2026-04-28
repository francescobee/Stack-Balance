"use strict";

// =============================================================
// achievements.js — Career-spanning collectibles (S6.2)
//
// Each achievement has a `check(ctx)` that runs at end-of-game.
// Context provided:
//   ctx = { won, you, state, profile, finalUsers, scenarioId, visionId,
//           bugfixCount, chainCount, dominanceSweeps }
//
// Storage: profile.achievements = { [id]: timestamp }
// =============================================================

const ACHIEVEMENTS = [
  {
    id: "first_win",
    icon: "🥇",
    name: "First Win",
    description: "Vinci la tua prima partita.",
    check: (ctx) => ctx.won,
  },
  {
    id: "clean_slate",
    icon: "✨",
    name: "Clean Slate",
    description: "Vinci una partita con 0 Tech Debt.",
    check: (ctx) => ctx.won && ctx.you.techDebt === 0,
  },
  {
    id: "ipo",
    icon: "📈",
    name: "IPO",
    description: "Vinci con almeno 80K MAU finali.",
    check: (ctx) => ctx.won && ctx.finalUsers >= 80,
  },
  {
    id: "underdog",
    icon: "🥋",
    name: "Underdog",
    description: "Vinci a difficoltà Director.",
    check: (ctx) => ctx.won && ctx.state.difficulty === "director",
  },
  {
    id: "bug_hunter",
    icon: "🐞",
    name: "Bug Hunter",
    description: "Gioca 6+ BugFix in una singola partita.",
    check: (ctx) => ctx.bugfixCount >= 6,
  },
  {
    id: "founder_mode",
    icon: "🎯",
    name: "Founder Mode",
    description: "Vinci con la Vision \"Founder Mode\".",
    check: (ctx) => ctx.won && ctx.visionId === "founder_mode",
  },
  {
    id: "data_emperor",
    icon: "📊",
    name: "Data Emperor",
    description: "Vinci con la Vision \"Data Empire\" e attiva la synergy omonima.",
    check: (ctx) => ctx.won && ctx.visionId === "data_empire" &&
                   (ctx.you._awards || []).some(a => a.id === "data_empire" && a.points > 0),
  },
  {
    id: "hustler_streak",
    icon: "🔥",
    name: "Hustler Streak",
    description: "Vinci 3 partite consecutive.",
    check: (ctx) => ctx.profile?.stats?.winStreak >= 3,
  },
  {
    id: "marathon",
    icon: "🏃",
    name: "Marathon",
    description: "Gioca 10 partite (vinte o perse).",
    check: (ctx) => (ctx.profile?.stats?.games || 0) >= 10,
  },
  {
    id: "centenarian",
    icon: "💎",
    name: "Centenarian",
    description: "Accumula 1000K MAU totali nella carriera.",
    check: (ctx) => (ctx.profile?.stats?.totalUsers || 0) >= 1000,
  },
  {
    id: "speedrun",
    icon: "⚡",
    name: "Speedrun",
    description: "Vinci con ≤14 carte giocate totali.",
    check: (ctx) => ctx.won && ctx.you.played.length <= 14,
  },
  {
    id: "combo_master",
    icon: "🔗",
    name: "Combo Master",
    description: "Triggera 5+ catene di carte in una partita.",
    check: (ctx) => ctx.chainCount >= 5,
  },
  {
    id: "dominator",
    icon: "👑",
    name: "Dominator",
    description: "Vinci tutte e 3 le dominanze (Product / Eng / Data) in un singolo Q.",
    check: (ctx) => ctx.dominanceSweeps >= 1,
  },
];

// Compute per-game context counters
function buildAchievementContext(state, won, you) {
  return {
    won,
    you,
    state,
    profile: getProfile(),
    finalUsers: you.vp,
    scenarioId: state.scenario?.id || "standard",
    visionId: you.vision?.id || null,
    bugfixCount: you.played.filter(c => c.type === "BugFix").length,
    // chainCount: count of cards we played that triggered a chain (we cached on play)
    chainCount: you._chainsTriggered || 0,
    dominanceSweeps: you._dominanceSweeps || 0,
  };
}

// Returns array of achievement objects newly unlocked in this game.
function checkNewAchievements(ctx) {
  const profile = getProfile();
  if (!profile) return [];
  const owned = profile.achievements || {};
  const newly = [];
  ACHIEVEMENTS.forEach(a => {
    if (owned[a.id]) return; // already unlocked
    try {
      if (a.check(ctx)) newly.push(a);
    } catch (e) { console.error("achievement.check failed", a.id, e); }
  });
  return newly;
}

function unlockAchievements(achievements) {
  if (!achievements || achievements.length === 0) return;
  updateProfile(p => {
    p.achievements = p.achievements || {};
    achievements.forEach(a => { p.achievements[a.id] = Date.now(); });
  });
}
