"use strict";

// =============================================================
// synergies.js — pool of multi-condition awards (synergies),
// drawn at game start and tinted by scenario flavour. (S15)
//
// Each entry has:
//   id, name, icon, points        // identity + reward (K MAU)
//   tags: [string]                // for scenario flavour weighting
//   difficulty: "easy" | "medium" | "hard"  // design hint, not used at runtime
//   detailInactive: string        // forecast hint when not yet active
//   detailActive: (p, result) => string   // descriptor when active
//   check: (p, state) => { requirements: [{label, current, target, met}], active }
//
// `state.synergies` is populated by drawSynergies() at game start
// and consumed by computeSynergies() in rules.js. When state has no
// synergies (tests, edge cases), the full pool is evaluated as a
// fallback so unit tests remain deterministic.
// =============================================================

const SYNERGY_POOL = [
  // ───────────────────────────────────────────────────────────
  // HARD-TIER PRESTIGE — original 4 (S2.2), thresholds unchanged.
  // ───────────────────────────────────────────────────────────
  {
    id: "lean_op", name: "Lean Operation", icon: "🌿",
    points: 10, tags: ["lean", "team", "morale"], difficulty: "hard",
    detailInactive: "Sinergia: morale alto + team contenuto",
    detailActive: () => "Squadra snella ad alto morale",
    check(p) {
      const reqs = [
        { label: "Morale ≥ 8",  current: p.morale,  target: 8, met: p.morale  >= 8 },
        { label: "Talento ≤ 4", current: p.talento, target: 4, met: p.talento <= 4 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "eng_exc", name: "Engineering Excellence", icon: "⚙️",
    points: 12, tags: ["eng", "quality"], difficulty: "hard",
    detailInactive: "Sinergia: codebase pulito a regola d'arte",
    detailActive: (p) => `${p.played.filter(c => c.type === "BugFix").length} fix · debt ${p.techDebt}`,
    check(p) {
      const bugCount = p.played.filter(c => c.type === "BugFix").length;
      const reqs = [
        { label: "BugFix ≥ 3",   current: bugCount,   target: 3, met: bugCount   >= 3 },
        { label: "Tech Debt ≤ 1", current: p.techDebt, target: 1, met: p.techDebt <= 1 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "data_empire", name: "Data Empire", icon: "📈",
    points: 15, tags: ["data", "ai"], difficulty: "hard",
    detailInactive: "Sinergia: stack data completo",
    detailActive: (p) => {
      const dc = p.played.filter(c => c.dept === "data").length;
      return `Lake + ${p.dati}📊 + ${dc} carte`;
    },
    check(p) {
      const dataCardsCount = p.played.filter(c => c.dept === "data").length;
      const reqs = [
        { label: "Data Lake (perm.)", current: p.permanents.data_lake ? 1 : 0, target: 1, met: !!p.permanents.data_lake },
        { label: "Dati ≥ 8",         current: p.dati,            target: 8, met: p.dati            >= 8 },
        { label: "Carte data ≥ 3",   current: dataCardsCount,    target: 3, met: dataCardsCount    >= 3 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "full_funding", name: "Full Funding Round", icon: "🏦",
    points: 10, tags: ["funding", "capital"], difficulty: "medium",
    detailInactive: "Sinergia: capitali da fonti multiple",
    detailActive: (p) => {
      const ids = new Set(p.played.filter(c => c.type === "Funding").map(c => c.id));
      return `${ids.size} round diversi`;
    },
    check(p) {
      const fundIds = new Set(p.played.filter(c => c.type === "Funding").map(c => c.id));
      const reqs = [
        { label: "Round diversi ≥ 3", current: fundIds.size, target: 3, met: fundIds.size >= 3 },
      ];
      return { requirements: reqs, active: reqs[0].met };
    },
  },

  // ───────────────────────────────────────────────────────────
  // LEAN / FRUGAL — flavour Bear Market 2008
  // ───────────────────────────────────────────────────────────
  {
    id: "bootstrapped_run", name: "Bootstrapped Run", icon: "💪",
    points: 13, tags: ["lean", "frugal", "capital"], difficulty: "hard",
    detailInactive: "Sinergia: cresci senza un round di Funding",
    detailActive: (p) => `0 Funding · ${p.vp}K MAU`,
    check(p) {
      const fundCount = p.played.filter(c => c.type === "Funding").length;
      const reqs = [
        { label: "0 Funding played", current: fundCount, target: 0, met: fundCount === 0 },
        { label: "MAU ≥ 25",         current: p.vp,      target: 25, met: p.vp >= 25 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "frugal_quarter", name: "Frugal Studio", icon: "🪙",
    points: 8, tags: ["lean", "frugal"], difficulty: "easy",
    detailInactive: "Sinergia: spendi poco, gioca molto",
    detailActive: (p) => {
      const totalBudget = p.played.reduce((s, c) => s + ((c.cost && c.cost.budget) || 0), 0);
      return `${p.played.length} carte · ${totalBudget}💰 totali`;
    },
    check(p) {
      const totalBudget = p.played.reduce((s, c) => s + ((c.cost && c.cost.budget) || 0), 0);
      const reqs = [
        { label: "Spesa Budget ≤ 8", current: totalBudget,   target: 8, met: totalBudget   <= 8 },
        { label: "Carte ≥ 6",        current: p.played.length, target: 6, met: p.played.length >= 6 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "peaceful_studio", name: "Peaceful Studio", icon: "🕊️",
    points: 10, tags: ["lean", "team"], difficulty: "medium",
    detailInactive: "Sinergia: niente Sabotage, debito controllato",
    detailActive: (p) => `0 Sabotage · debt ${p.techDebt}`,
    check(p) {
      const sabotageCount = p.played.filter(c => c.type === "Sabotage").length;
      const reqs = [
        { label: "0 Sabotage",      current: sabotageCount, target: 0, met: sabotageCount === 0 },
        { label: "Tech Debt ≤ 2",   current: p.techDebt,    target: 2, met: p.techDebt    <= 2 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },

  // ───────────────────────────────────────────────────────────
  // DATA / AI — flavour AI Hype Wave
  // ───────────────────────────────────────────────────────────
  {
    id: "ai_first", name: "AI-First Stack", icon: "🤖",
    points: 12, tags: ["data", "ai"], difficulty: "medium",
    detailInactive: "Sinergia: due tool data + dati raccolti",
    detailActive: (p) => `Lake + Monitoring · ${p.dati}📊`,
    check(p) {
      const reqs = [
        { label: "Data Lake (perm.)", current: p.permanents.data_lake  ? 1 : 0, target: 1, met: !!p.permanents.data_lake },
        { label: "Monitoring (perm.)", current: p.permanents.monitoring ? 1 : 0, target: 1, met: !!p.permanents.monitoring },
        { label: "Dati ≥ 6",          current: p.dati,                  target: 6, met: p.dati >= 6 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "analytics_lite", name: "Analytics Lite", icon: "📊",
    points: 8, tags: ["data"], difficulty: "easy",
    detailInactive: "Sinergia: insight base, una Discovery",
    detailActive: (p) => {
      const dc = p.played.filter(c => c.type === "Discovery").length;
      return `${p.dati}📊 · ${dc} Discovery`;
    },
    check(p) {
      const discoveryCount = p.played.filter(c => c.type === "Discovery").length;
      const reqs = [
        { label: "Dati ≥ 5",       current: p.dati,         target: 5, met: p.dati         >= 5 },
        { label: "Discovery ≥ 1",  current: discoveryCount, target: 1, met: discoveryCount >= 1 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "data_driven_launch", name: "Data-Driven Launch", icon: "🛰",
    points: 11, tags: ["data", "ai", "launch"], difficulty: "medium",
    detailInactive: "Sinergia: dati prima, lancio dopo",
    detailActive: (p) => {
      const lc = p.played.filter(c => c.type === "Launch").length;
      return `${lc} Launch · ${p.dati}📊`;
    },
    check(p) {
      const launchCount = p.played.filter(c => c.type === "Launch").length;
      const reqs = [
        { label: "Launch ≥ 1", current: launchCount, target: 1, met: launchCount >= 1 },
        { label: "Dati ≥ 6",   current: p.dati,      target: 6, met: p.dati      >= 6 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },

  // ───────────────────────────────────────────────────────────
  // TEAM / MORALE — flavour Remote First
  // ───────────────────────────────────────────────────────────
  {
    id: "happy_team", name: "Happy Team", icon: "😊",
    points: 8, tags: ["team", "morale"], difficulty: "easy",
    detailInactive: "Sinergia: morale alto a fine partita",
    detailActive: (p) => `Morale ${p.morale}`,
    check(p) {
      const reqs = [
        { label: "Morale ≥ 7", current: p.morale, target: 7, met: p.morale >= 7 },
      ];
      return { requirements: reqs, active: reqs[0].met };
    },
  },
  {
    id: "talent_magnet", name: "Talent Magnet", icon: "🧲",
    points: 11, tags: ["team"], difficulty: "medium",
    detailInactive: "Sinergia: scale-up del team via Hiring",
    detailActive: (p) => {
      const hc = p.played.filter(c => c.type === "Hiring").length;
      return `${p.talento}🧠 · ${hc} Hiring`;
    },
    check(p) {
      const hireCount = p.played.filter(c => c.type === "Hiring").length;
      const reqs = [
        { label: "Talento ≥ 5", current: p.talento, target: 5, met: p.talento  >= 5 },
        { label: "Hiring ≥ 3",  current: hireCount, target: 3, met: hireCount  >= 3 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "culture_first", name: "Culture First", icon: "🎭",
    points: 13, tags: ["team", "morale"], difficulty: "hard",
    detailInactive: "Sinergia: morale + Training + low debt",
    detailActive: (p) => {
      const tc = p.played.filter(c => c.type === "Training").length;
      return `Morale ${p.morale} · ${tc} Training · debt ${p.techDebt}`;
    },
    check(p) {
      const trainCount = p.played.filter(c => c.type === "Training").length;
      const reqs = [
        { label: "Morale ≥ 8",     current: p.morale,    target: 8, met: p.morale    >= 8 },
        { label: "Training ≥ 1",   current: trainCount,  target: 1, met: trainCount  >= 1 },
        { label: "Tech Debt ≤ 3",  current: p.techDebt,  target: 3, met: p.techDebt  <= 3 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "remote_unity", name: "Remote Unity", icon: "🌐",
    points: 10, tags: ["team", "morale", "remote"], difficulty: "medium",
    detailInactive: "Sinergia: meeting + morale per team distribuito",
    detailActive: (p) => {
      const mc = p.played.filter(c => c.type === "Meeting").length;
      return `Morale ${p.morale} · ${mc} Meeting`;
    },
    check(p) {
      const meetCount = p.played.filter(c => c.type === "Meeting").length;
      const reqs = [
        { label: "Morale ≥ 6",  current: p.morale,   target: 6, met: p.morale   >= 6 },
        { label: "Meeting ≥ 2", current: meetCount,  target: 2, met: meetCount  >= 2 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },

  // ───────────────────────────────────────────────────────────
  // ENGINEERING / QUALITY
  // ───────────────────────────────────────────────────────────
  {
    id: "clean_codebase", name: "Clean Codebase", icon: "🧹",
    points: 9, tags: ["eng", "quality"], difficulty: "medium",
    detailInactive: "Sinergia: zero debito, almeno un BugFix",
    detailActive: (p) => {
      const bc = p.played.filter(c => c.type === "BugFix").length;
      return `0 debt · ${bc} BugFix`;
    },
    check(p) {
      const bugCount = p.played.filter(c => c.type === "BugFix").length;
      const reqs = [
        { label: "Tech Debt = 0", current: p.techDebt, target: 0, met: p.techDebt === 0 },
        { label: "BugFix ≥ 1",    current: bugCount,   target: 1, met: bugCount    >= 1 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "dev_velocity", name: "Dev Velocity", icon: "⚡",
    points: 10, tags: ["eng"], difficulty: "medium",
    detailInactive: "Sinergia: CI/CD + tante carte giocate",
    detailActive: (p) => `CI/CD · ${p.played.length} carte`,
    check(p) {
      const reqs = [
        { label: "CI/CD (perm.)", current: p.permanents.ci_cd ? 1 : 0, target: 1, met: !!p.permanents.ci_cd },
        { label: "Carte ≥ 6",     current: p.played.length, target: 6, met: p.played.length >= 6 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "monitor_ops", name: "Observability Ops", icon: "🔭",
    points: 8, tags: ["eng", "quality"], difficulty: "easy",
    detailInactive: "Sinergia: monitoring + debt sotto controllo",
    detailActive: (p) => `Monitoring · debt ${p.techDebt}`,
    check(p) {
      const reqs = [
        { label: "Monitoring (perm.)", current: p.permanents.monitoring ? 1 : 0, target: 1, met: !!p.permanents.monitoring },
        { label: "Tech Debt ≤ 2",      current: p.techDebt, target: 2, met: p.techDebt <= 2 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },

  // ───────────────────────────────────────────────────────────
  // PRODUCT / LAUNCH
  // ───────────────────────────────────────────────────────────
  {
    id: "triple_launch", name: "Triple Launch", icon: "🚀",
    points: 13, tags: ["launch", "product"], difficulty: "hard",
    detailInactive: "Sinergia: 3 Launch e MAU consistenti",
    detailActive: (p) => {
      const lc = p.played.filter(c => c.type === "Launch").length;
      return `${lc} Launch · ${p.vp}K MAU`;
    },
    check(p) {
      const launchCount = p.played.filter(c => c.type === "Launch").length;
      const reqs = [
        { label: "Launch ≥ 3", current: launchCount, target: 3, met: launchCount >= 3 },
        { label: "MAU ≥ 20",   current: p.vp,        target: 20, met: p.vp >= 20 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "design_polish", name: "Design Polish", icon: "🎨",
    points: 10, tags: ["product"], difficulty: "medium",
    detailInactive: "Sinergia: Design System + Feature curate",
    detailActive: (p) => {
      const fc = p.played.filter(c => c.type === "Feature").length;
      return `Design System · ${fc} Feature`;
    },
    check(p) {
      const featureCount = p.played.filter(c => c.type === "Feature").length;
      const reqs = [
        { label: "Design System (perm.)", current: p.permanents.design_system ? 1 : 0, target: 1, met: !!p.permanents.design_system },
        { label: "Feature ≥ 2",           current: featureCount, target: 2, met: featureCount >= 2 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "mvp_to_market", name: "MVP-to-Market", icon: "🏁",
    points: 8, tags: ["product", "launch"], difficulty: "easy",
    detailInactive: "Sinergia: Discovery → Feature → Launch",
    detailActive: () => "Pipeline completa: D → F → L",
    check(p) {
      const has = (t) => p.played.some(c => c.type === t);
      const reqs = [
        { label: "Discovery ≥ 1", current: p.played.filter(c => c.type === "Discovery").length, target: 1, met: has("Discovery") },
        { label: "Feature ≥ 1",   current: p.played.filter(c => c.type === "Feature").length,   target: 1, met: has("Feature") },
        { label: "Launch ≥ 1",    current: p.played.filter(c => c.type === "Launch").length,    target: 1, met: has("Launch") },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "full_stack_play", name: "Full-Stack Play", icon: "🧩",
    points: 12, tags: ["product", "mixed"], difficulty: "medium",
    detailInactive: "Sinergia: una carta per ogni dipartimento",
    detailActive: () => "P + E + D coperti",
    check(p) {
      const has = (d) => p.played.some(c => c.dept === d);
      const reqs = [
        { label: "Product ≥ 1", current: p.played.filter(c => c.dept === "product").length, target: 1, met: has("product") },
        { label: "Eng ≥ 1",     current: p.played.filter(c => c.dept === "eng").length,     target: 1, met: has("eng") },
        { label: "Data ≥ 1",    current: p.played.filter(c => c.dept === "data").length,    target: 1, met: has("data") },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },

  // ───────────────────────────────────────────────────────────
  // FUNDING / CAPITAL
  // ───────────────────────────────────────────────────────────
  {
    id: "seed_to_series", name: "Seed → Series", icon: "🌱",
    points: 10, tags: ["funding", "capital"], difficulty: "medium",
    detailInactive: "Sinergia: due round di Funding diversi",
    detailActive: (p) => {
      const ids = new Set(p.played.filter(c => c.type === "Funding").map(c => c.id));
      return `${ids.size} round diversi`;
    },
    check(p) {
      const fundIds = new Set(p.played.filter(c => c.type === "Funding").map(c => c.id));
      const reqs = [
        { label: "Round diversi ≥ 2", current: fundIds.size, target: 2, met: fundIds.size >= 2 },
      ];
      return { requirements: reqs, active: reqs[0].met };
    },
  },
  {
    id: "runway_secured", name: "Runway Secured", icon: "🛬",
    points: 8, tags: ["funding", "capital"], difficulty: "easy",
    detailInactive: "Sinergia: cassa solida + un round",
    detailActive: (p) => {
      const fc = p.played.filter(c => c.type === "Funding").length;
      return `${p.budget}💰 · ${fc} Funding`;
    },
    check(p) {
      const fundCount = p.played.filter(c => c.type === "Funding").length;
      const reqs = [
        { label: "Budget ≥ 6",  current: p.budget,  target: 6, met: p.budget   >= 6 },
        { label: "Funding ≥ 1", current: fundCount, target: 1, met: fundCount  >= 1 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },

  // ───────────────────────────────────────────────────────────
  // GENERALISTE / MIXED
  // ───────────────────────────────────────────────────────────
  {
    id: "balanced_op", name: "Balanced Operation", icon: "⚖️",
    points: 9, tags: ["mixed"], difficulty: "easy",
    detailInactive: "Sinergia: tutto in equilibrio, niente eccessi",
    detailActive: (p) => `M${p.morale} T${p.talento} D${p.dati} debt${p.techDebt}`,
    check(p) {
      const reqs = [
        { label: "Morale ≥ 5",    current: p.morale,   target: 5, met: p.morale   >= 5 },
        { label: "Talento ≥ 3",   current: p.talento,  target: 3, met: p.talento  >= 3 },
        { label: "Dati ≥ 3",      current: p.dati,     target: 3, met: p.dati     >= 3 },
        { label: "Tech Debt ≤ 3", current: p.techDebt, target: 3, met: p.techDebt <= 3 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },

  // ───────────────────────────────────────────────────────────
  // S19.2 — MORALE-COUPLED (Phase 19 mechanic)
  // ───────────────────────────────────────────────────────────
  {
    id: "burnout_survivor", name: "Burnout Survivor", icon: "🔥",
    points: 8, tags: ["crunch", "resilience"], difficulty: "medium",
    detailInactive: "Sinergia: hai retto la pressione fino in fondo",
    detailActive: (p) => `Crunchato senza cedere: morale ${p.morale}, debt ${p.techDebt}`,
    check(p) {
      const reqs = [
        { label: "Morale finale ≥ 6", current: p.morale,   target: 6, met: p.morale   >= 6 },
        { label: "Tech Debt ≥ 5",     current: p.techDebt, target: 5, met: p.techDebt >= 5 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
  {
    id: "workplace_utopia", name: "Workplace Utopia", icon: "☮️",
    points: 10, tags: ["lean", "morale", "team"], difficulty: "medium",
    detailInactive: "Sinergia: cultura aziendale al top + investimento attivo",
    detailActive: (p) => `Squadra felice e investita: morale ${p.morale}`,
    check(p) {
      // Recovery cards: gli "esciti dal pozzo" del morale (cura attiva del team).
      // Include S19.2 + le morale-recovery storiche (team_building, sprint_retro).
      const RECOVERY_IDS = new Set([
        "sabbatical_day", "mental_health_workshop", "culture_day",
        "team_building", "sprint_retro", "pair_programming",
      ]);
      const recoveryCount = p.played.filter(c => RECOVERY_IDS.has(c.id)).length;
      const reqs = [
        { label: "Morale finale ≥ 9",    current: p.morale,      target: 9, met: p.morale      >= 9 },
        { label: "Recovery cards ≥ 2",   current: recoveryCount, target: 2, met: recoveryCount >= 2 },
      ];
      return { requirements: reqs, active: reqs.every(r => r.met) };
    },
  },
];

// Lookup helper, used by deserializeState() in multiplayer.js
function getSynergyById(id) {
  return SYNERGY_POOL.find(s => s.id === id) || null;
}

// =============================================================
// drawSynergies(scenario, count) — pesca a inizio partita.
//
// Step 1: pin scenario.synergyFlavor.guaranteed (in order, dedup).
// Step 2: weighted random fill — ogni candidato ha peso (1 + #tag in
//         boostedTags), quindi tag matched = peso ×2/×3. Usa rng() per
//         coerenza con Daily seed e pickRandom altrove.
// Step 3: ritorna array di synergy refs (con check fns intatte).
//
// Nessuna esclusione esplicita di default: la "tensione" tra scenario
// e sinergie counter-themed è un meccanismo di design intenzionale
// (es. Bear Market con full_funding pescato = sfida di salita).
// =============================================================
function drawSynergies(scenario, count) {
  const flavor = scenario && scenario.synergyFlavor ? scenario.synergyFlavor : {};
  const excluded = new Set(flavor.excluded || []);
  const guaranteedIds = flavor.guaranteed || [];
  const boostedTags = new Set(flavor.boostedTags || []);
  const target = count > 0 ? count : 5;

  const eligible = SYNERGY_POOL.filter(s => !excluded.has(s.id));
  const active = [];

  // Step 1: pin guaranteed (in order)
  for (const id of guaranteedIds) {
    const s = eligible.find(x => x.id === id);
    if (s && !active.includes(s)) active.push(s);
  }

  // Step 2: weighted random fill
  const remaining = eligible.filter(s => !active.includes(s));
  while (active.length < target && remaining.length > 0) {
    const weights = remaining.map(s => {
      const matching = (s.tags || []).filter(t => boostedTags.has(t)).length;
      return 1 + matching;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    const r = rng() * total;
    let acc = 0;
    let pickedIdx = remaining.length - 1; // safe fallback
    for (let i = 0; i < weights.length; i++) {
      acc += weights[i];
      if (r < acc) { pickedIdx = i; break; }
    }
    active.push(remaining[pickedIdx]);
    remaining.splice(pickedIdx, 1);
  }

  return active;
}
