"use strict";

// =============================================================
// user.js — Player profile management.
// Stores the user's name, avatar, and lifetime stats in
// localStorage. Designed to grow into preferences/leaderboard.
// =============================================================

const PROFILE_STORAGE_KEY = "stack-balance.profile.v1";

// In-memory cache (loaded once, mutated then re-saved)
let _profile = null;

function newProfile(name, avatar) {
  const trimmed = (name || "").trim();
  return {
    name: trimmed || "Anonimo",
    avatar: (avatar || trimmed.charAt(0) || "?").toUpperCase().slice(0, 2),
    createdAt: Date.now(),
    stats: {
      games: 0,
      wins: 0,
      losses: 0,
      bestUsers: 0,        // best MAU score ever
      totalUsers: 0,       // cumulative MAU across games
      lastPlayed: null,
    },
    prefs: {
      // reserved for future: animationSpeed, soundOn, etc.
    },
  };
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    // Defensive: ensure stats object exists for older versions
    if (!p.stats) p.stats = newProfile("").stats;
    if (!p.prefs) p.prefs = {};
    return p;
  } catch (e) { return null; }
}

function saveProfile(profile) {
  try { localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile)); }
  catch (e) { /* storage full or disabled — silent */ }
}

function getProfile() {
  if (!_profile) _profile = loadProfile();
  return _profile;
}

function setProfile(p) {
  _profile = p;
  saveProfile(p);
}

function clearProfile() {
  _profile = null;
  try { localStorage.removeItem(PROFILE_STORAGE_KEY); } catch (e) {}
}

function updateProfile(mutator) {
  const p = getProfile() || newProfile("");
  mutator(p);
  setProfile(p);
  return p;
}

// Called by game flow at end of a match.
// Returns { newLevel, oldLevel, xpGained } so the UI can show a level-up toast.
function recordGameResult({ won, finalUsers, scenarioId, visionId, isDaily, winConditionId, isWeekly }) {
  let outcome = { newLevel: 1, oldLevel: 1, xpGained: 0 };
  updateProfile(p => {
    p.stats.games = (p.stats.games || 0) + 1;
    if (won) {
      p.stats.wins = (p.stats.wins || 0) + 1;
      p.stats.winStreak = (p.stats.winStreak || 0) + 1;
    } else {
      p.stats.losses = (p.stats.losses || 0) + 1;
      p.stats.winStreak = 0;
    }
    p.stats.totalUsers = (p.stats.totalUsers || 0) + (finalUsers || 0);
    if ((finalUsers || 0) > (p.stats.bestUsers || 0)) {
      p.stats.bestUsers = finalUsers;
    }
    p.stats.lastPlayed = Date.now();

    // S6.3: daily history (if applicable)
    if (isDaily) {
      p.dailyHistory = p.dailyHistory || {};
      const dayKey = todayKey();
      p.dailyHistory[dayKey] = {
        date: dayKey, won, finalUsers, scenarioId, visionId, winConditionId, ts: Date.now(),
      };
      // recompute streak (consecutive days played up to today)
      p.stats.dailyStreak = computeDailyStreak(p.dailyHistory);
    }

    // S17: track per-win-condition victories (used for "Versatile" achievement
    // and any future meta-progression tied to win condition mastery).
    if (won && winConditionId) {
      p.winConditionWins = p.winConditionWins || {};
      p.winConditionWins[winConditionId] = (p.winConditionWins[winConditionId] || 0) + 1;
    }

    // S18.2: per-Vision stats (wins/plays/totalMau) — required for variant unlock
    if (visionId) {
      p.visionStats = p.visionStats || {};
      p.visionStats[visionId] = p.visionStats[visionId] || { wins: 0, plays: 0, totalMau: 0 };
      p.visionStats[visionId].plays += 1;
      p.visionStats[visionId].totalMau += (finalUsers || 0);
      if (won) p.visionStats[visionId].wins += 1;
    }

    // S18.3: weekly challenge history (one-shot per ISO week)
    if (isWeekly && typeof currentWeekKey === "function") {
      p.weeklyHistory = p.weeklyHistory || {};
      const wk = currentWeekKey();
      p.weeklyHistory[wk] = {
        week: wk, won, finalUsers, scenarioId, visionId, ts: Date.now(),
      };
      // Track total weekly wins (for "Weekly Warrior" achievement)
      if (won) p.stats.weeklyWins = (p.stats.weeklyWins || 0) + 1;
    }

    // S18.1: Founder Level — XP awarded per match, level derived from total
    const oldXp = p.xp || 0;
    const oldLevel = computeLevel(oldXp);
    const xpGained = computeXP({ won, finalUsers, isDaily, isWeekly, difficulty: p.prefs?.difficulty });
    p.xp = oldXp + xpGained;
    p.level = computeLevel(p.xp);
    outcome = { newLevel: p.level, oldLevel, xpGained };
  });
  return outcome;
}

// =============================================================
// S18.1: Founder Level — pure helpers, no localStorage side effects.
// Curve: L1 starts at 0; threshold to advance L_n → L_{n+1} is
//   1000 + (n - 1) * 2000  XP
// Total XP at start of L_n = sum_{k=1..n-1} (1000 + (k-1)*2000)
//                          = (n - 1) * 1000 + 2000 * T(n-2)  where T(k)=k(k+1)/2
// L1 → L2: 1000 cumulative
// L2 → L3: 4000
// L3 → L4: 9000
// L20 cap (no further levels).
// =============================================================
const FOUNDER_LEVEL_CAP = 20;

function xpToReachLevel(level) {
  if (level <= 1) return 0;
  let total = 0;
  for (let k = 1; k < level; k++) {
    total += 1000 + (k - 1) * 2000;
  }
  return total;
}

function computeLevel(xp) {
  for (let lv = FOUNDER_LEVEL_CAP; lv >= 1; lv--) {
    if (xp >= xpToReachLevel(lv)) return lv;
  }
  return 1;
}

function xpProgressInLevel(xp) {
  const lv = computeLevel(xp);
  const base = xpToReachLevel(lv);
  const next = (lv >= FOUNDER_LEVEL_CAP) ? base : xpToReachLevel(lv + 1);
  const span = Math.max(1, next - base);
  return {
    level: lv,
    current: xp - base,
    needed: next - base,
    pct: Math.min(100, Math.round(((xp - base) / span) * 100)),
    capped: lv >= FOUNDER_LEVEL_CAP,
  };
}

function computeXP({ won, finalUsers, isDaily, isWeekly, difficulty }) {
  let xp = 100;                              // base per partita giocata
  if (won) xp += 300;
  xp += Math.floor((finalUsers || 0) / 10);  // 1 XP per 10K MAU
  if (isDaily)  xp += 50;                    // S6.3 incentive
  if (isWeekly) xp += 50;                    // S18.3 incentive (small bonus; per-challenge winBonusXP is added separately)
  // Difficulty scaling — applied on the partial sum
  const mult = difficulty === "director" ? 1.5
             : difficulty === "junior"   ? 0.8
             : 1.0;                          // default = senior
  return Math.floor(xp * mult);
}

// S6.3: count consecutive days ending today that have a daily entry
function computeDailyStreak(history) {
  if (!history) return 0;
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const k = d.toISOString().slice(0, 10);
    if (history[k]) { streak += 1; d.setUTCDate(d.getUTCDate() - 1); }
    else break;
  }
  return streak;
}

function hasPlayedDailyToday() {
  const p = getProfile();
  return !!(p?.dailyHistory?.[todayKey()]);
}

// Returns the win rate as a percentage (0..100), or null if no games played
function profileWinRate(p) {
  const g = p?.stats?.games || 0;
  if (g === 0) return null;
  return Math.round(((p.stats.wins || 0) / g) * 100);
}

// === S5.2: Difficulty preference ===
const DIFFICULTY_DEFAULT = "senior";
const DIFFICULTY_LEVELS = ["junior", "senior", "director"];

function getDifficulty() {
  const lv = getProfile()?.prefs?.difficulty;
  return DIFFICULTY_LEVELS.includes(lv) ? lv : DIFFICULTY_DEFAULT;
}

function setDifficulty(level) {
  if (!DIFFICULTY_LEVELS.includes(level)) return;
  let p = getProfile();
  if (!p) p = newProfile("Anonimo");
  if (!p.prefs) p.prefs = {};
  p.prefs.difficulty = level;
  setProfile(p);
}

// === S7.1+S7.2: UI/UX preferences ===
function getReducedMotion() {
  // System preference fallback if no explicit setting
  const fromProfile = getProfile()?.prefs?.reducedMotion;
  if (typeof fromProfile === "boolean") return fromProfile;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
}
function setReducedMotion(enabled) {
  let p = getProfile();
  if (!p) return;
  if (!p.prefs) p.prefs = {};
  p.prefs.reducedMotion = !!enabled;
  setProfile(p);
}

// S7.2: Audio preference (default OFF — many users dislike unexpected sound)
function getAudioEnabled() {
  return !!getProfile()?.prefs?.audioEnabled;
}
function setAudioEnabled(enabled) {
  let p = getProfile();
  if (!p) return;
  if (!p.prefs) p.prefs = {};
  p.prefs.audioEnabled = !!enabled;
  setProfile(p);
}
