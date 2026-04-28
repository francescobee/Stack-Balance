"use strict";

// =============================================================
// data.js — card catalogs (Q1/Q2/Q3) + OKR pool + lookups
// =============================================================
//
// Card structure:
//   { id, name, dept, type, cost, effect, desc,
//     [chainFrom: [ids]], [chainDiscount: {res:n}],
//     [permanent: "key"] }
//
// chainFrom: list of card ids; if player owns any of them, chainDiscount applies
// chainDiscount: amount subtracted from cost (per resource)
//
// effect.vp represents thousands of users (1 vp = 1K MAU)

// === Q1 DISCOVERY: research, planning, MVP, foundational hires ===
const CATALOG_Q1 = [
  { id: "user_research", name: "User Research", dept: "data", type: "Discovery",
    cost: { budget: 2, tempo: 1 }, effect: { dati: 2, vp: 1 },
    desc: "Interviste utenti. +2 Dati, +1K utenti." },
  { id: "lean_canvas", name: "Lean Canvas", dept: "product", type: "Discovery",
    cost: { tempo: 1 }, effect: { vp: 1, morale: 1 },
    desc: "Modello di business. +1K utenti, +1 Morale." },
  // S9.5.a: catena intra-Q1 — Lean Canvas → Pitch Deck (free se hai canvas)
  { id: "pitch_deck", name: "Pitch Deck", dept: "product", type: "Discovery",
    cost: { tempo: 1 },
    chainFrom: ["lean_canvas"], chainDiscount: { tempo: 1 },
    effect: { vp: 2 },
    desc: "Slide per investitori. +2K utenti. Gratis se hai Lean Canvas." },
  // S9.5.a: catena intra-Q1 — Canvas/Research → Wireframes (no talento req)
  { id: "wireframes", name: "Wireframes", dept: "product", type: "Discovery",
    cost: { tempo: 1, talento: 1 },
    chainFrom: ["lean_canvas", "user_research"], chainDiscount: { talento: 1 },
    effect: { dati: 1, vp: 1 },
    desc: "Mock UI. +1 Dati, +1K utenti. -1🧠 con Canvas o Research." },
  { id: "junior_dev", name: "Junior Dev", dept: "eng", type: "Hiring",
    cost: { budget: 2 }, effect: { talento: 1 },
    desc: "Junior dev. +1 Talento." },
  { id: "ux_designer", name: "UX Designer", dept: "product", type: "Hiring",
    cost: { budget: 3 }, effect: { talento: 1, morale: 1 },
    desc: "Designer UX. +1 Talento, +1 Morale." },
  { id: "data_scientist", name: "Data Scientist", dept: "data", type: "Hiring",
    cost: { budget: 4 }, effect: { talento: 1, dati: 1 },
    desc: "Esperto analytics. +1 Talento, +1 Dati." },
  { id: "preseed", name: "Pre-seed Round", dept: "product", type: "Funding",
    cost: { tempo: 1 }, effect: { budget: 4 },
    desc: "Round pre-seed. +4 Budget." },
  { id: "co_founder", name: "Co-Founder", dept: "product", type: "Hiring",
    cost: { tempo: 1 }, effect: { talento: 1, morale: 2, vp: 1 },
    desc: "+1 Talento, +2 Morale, +1K utenti." },
  // S9.5.a: catena intra-Q1 — Wireframes/Junior Dev → MVP Proto (-1⏱)
  { id: "mvp_proto", name: "MVP Prototype", dept: "eng", type: "Feature",
    cost: { tempo: 2, talento: 1 },
    chainFrom: ["wireframes", "junior_dev"], chainDiscount: { tempo: 1 },
    effect: { dati: 2, vp: 2 },
    desc: "Prototipo MVP. +2 Dati, +2K utenti. -1⏱ con Wireframes o Junior Dev." },
  { id: "training", name: "Formazione", dept: "product", type: "Training",
    cost: { budget: 2, tempo: 1 }, effect: { talento: 2, morale: 1 },
    desc: "Up-skill. +2 Talento, +1 Morale." },
  { id: "team_building", name: "Team Building", dept: "product", type: "Meeting",
    cost: { budget: 2 }, effect: { morale: 3 },
    desc: "+3 Morale." },
  { id: "market_validation", name: "Market Validation", dept: "data", type: "Discovery",
    cost: { tempo: 2 }, effect: { dati: 3, vp: 1 },
    desc: "Validazione mercato. +3 Dati, +1K utenti." },
  { id: "founder_hustle", name: "Founder's Hustle", dept: "product", type: "Funding",
    cost: {}, effect: { budget: 3, techDebt: 1 },
    desc: "Notti insonni. +3 Budget, +1 Tech Debt." },
];

// === Q2 BUILD: infrastructure, dev work, scaling, refactoring ===
const CATALOG_Q2 = [
  { id: "senior_dev", name: "Senior Dev", dept: "eng", type: "Hiring",
    cost: { budget: 4, tempo: 1 },
    chainFrom: ["junior_dev"], chainDiscount: { budget: 2 },
    effect: { talento: 2, morale: 1 },
    desc: "Senior dev. +2 Talento, +1 Morale." },
  { id: "ci_cd", name: "CI/CD Pipeline", dept: "eng", type: "Tool",
    cost: { budget: 3, tempo: 1 },
    chainFrom: ["junior_dev", "senior_dev"], chainDiscount: { tempo: 1 },
    effect: { vp: 1 }, permanent: "ci_cd",
    desc: "Sconto Tempo su Feature future." },
  { id: "data_lake", name: "Data Lake", dept: "data", type: "Tool",
    cost: { budget: 4 },
    chainFrom: ["data_scientist", "user_research"], chainDiscount: { budget: 2 },
    effect: { vp: 2 }, permanent: "data_lake",
    desc: "Ogni Feature dà +1 Dati extra." },
  { id: "design_system", name: "Design System", dept: "product", type: "Tool",
    cost: { budget: 2, tempo: 1 },
    chainFrom: ["ux_designer", "wireframes"], chainDiscount: { tempo: 1 },
    effect: { morale: 1, vp: 1 }, permanent: "design_system",
    desc: "+1 Morale per Hiring." },
  { id: "monitoring", name: "Monitoring", dept: "eng", type: "Tool",
    cost: { budget: 2, tempo: 1 }, effect: { vp: 1 }, permanent: "monitoring",
    desc: "Riduci Tech Debt subito e a fine quarter." },
  { id: "api_integration", name: "API Integration", dept: "eng", type: "Feature",
    cost: { tempo: 3, talento: 2 },
    chainFrom: ["mvp_proto"], chainDiscount: { tempo: 1 },
    effect: { dati: 3, vp: 4 },
    desc: "Integra API esterna. +3 Dati, +4K utenti." },
  { id: "mobile_app", name: "Mobile App", dept: "product", type: "Feature",
    cost: { tempo: 4, talento: 2, budget: 2 },
    chainFrom: ["mvp_proto", "wireframes"], chainDiscount: { tempo: 1, budget: 1 },
    effect: { dati: 4, vp: 6 },
    desc: "Lanciamo l'app mobile. +4 Dati, +6K utenti." },
  { id: "series_a", name: "Series A", dept: "product", type: "Funding",
    cost: { tempo: 2 },
    chainFrom: ["preseed", "pitch_deck"], chainDiscount: { tempo: 1 },
    effect: { budget: 6 },
    desc: "Round Series A. +6 Budget." },
  { id: "refactoring", name: "Refactoring", dept: "eng", type: "BugFix",
    cost: { tempo: 2 }, effect: { techDebt: -2, vp: 1 },
    desc: "-2 Tech Debt, +1K utenti." },
  { id: "qa_sprint", name: "QA Sprint", dept: "eng", type: "BugFix",
    cost: { tempo: 2, talento: 1 }, effect: { techDebt: -3, vp: 2 },
    desc: "-3 Tech Debt, +2K utenti." },
  { id: "code_review", name: "Code Review", dept: "eng", type: "BugFix",
    cost: { tempo: 1 }, effect: { techDebt: -1, morale: 1 },
    desc: "-1 Tech Debt, +1 Morale." },
  { id: "sprint_retro", name: "Sprint Retro", dept: "eng", type: "Meeting",
    cost: { tempo: 1 }, effect: { morale: 1, vp: 2 },
    desc: "+1 Morale, +2K utenti." },
  { id: "consulting", name: "Consulenza", dept: "eng", type: "Funding",
    cost: { tempo: 2, talento: 1 }, effect: { budget: 4 },
    desc: "Progetto a contratto. +4 Budget." },
  { id: "tech_talk", name: "Tech Talk", dept: "eng", type: "Meeting",
    cost: { tempo: 1 }, effect: { morale: 1, talento: 1 },
    desc: "+1 Morale, +1 Talento." },
  // --- Crunch Cards (S1.1) — ship-now-pay-later trade-off ---
  { id: "hotfix_push", name: "Hotfix Push", dept: "eng", type: "Feature",
    cost: { tempo: 1, talento: 1 }, effect: { vp: 4, techDebt: 2 },
    desc: "Patch veloce in produzione. +4K utenti, +2 Tech Debt." },
  { id: "outsource_dev", name: "Outsource Dev", dept: "eng", type: "Hiring",
    cost: { budget: 2 }, effect: { talento: 2, techDebt: 1 },
    desc: "Freelance & outsourcing. +2 Talento, +1 Tech Debt." },
  { id: "ship_it", name: "Ship It", dept: "product", type: "Feature",
    cost: { tempo: 2, talento: 1 }, effect: { dati: 2, vp: 5, techDebt: 2 },
    desc: "Release affrettata. +2 Dati, +5K utenti, +2 Tech Debt." },
];

// === Q3 LAUNCH: marketing, scaling, optimization, sales ===
const CATALOG_Q3 = [
  { id: "viral_campaign", name: "Campagna Virale", dept: "product", type: "Launch",
    cost: { budget: 3, tempo: 1 },
    chainFrom: ["mobile_app", "design_system"], chainDiscount: { budget: 1 },
    effect: { dati: 3, vp: 2, morale: 1 },
    desc: "Marketing aggressivo. +3 Dati, +2K utenti, +1 Morale." },
  { id: "ab_testing", name: "A/B Testing", dept: "data", type: "Launch",
    cost: { tempo: 2, talento: 1 },
    chainFrom: ["data_lake", "data_scientist"], chainDiscount: { tempo: 1 },
    effect: { dati: 2, vp: 3 },
    desc: "Esperimenti continui. +2 Dati, +3K utenti." },
  { id: "reco_engine", name: "Recommendation Engine", dept: "data", type: "Launch",
    cost: { tempo: 3, talento: 2 },
    chainFrom: ["data_lake"], chainDiscount: { tempo: 2 },
    effect: { dati: 4, vp: 5 },
    desc: "Sistema di raccomandazione. +4 Dati, +5K utenti." },
  { id: "dashboard", name: "Dashboard Analytics", dept: "data", type: "Launch",
    cost: { tempo: 2, talento: 1 },
    chainFrom: ["data_scientist", "data_lake"], chainDiscount: { tempo: 1 },
    effect: { dati: 3, vp: 3 },
    desc: "Pannello analitico. +3 Dati, +3K utenti." },
  { id: "premium_tier", name: "Premium Tier", dept: "product", type: "Launch",
    cost: { budget: 2, tempo: 2 },
    chainFrom: ["mobile_app", "api_integration"], chainDiscount: { budget: 2 },
    effect: { budget: 5, vp: 3 },
    desc: "Tier a pagamento. +5 Budget, +3K utenti." },
  { id: "sales_team", name: "Sales Team", dept: "product", type: "Hiring",
    cost: { budget: 4 }, effect: { talento: 2, vp: 2 },
    desc: "Forza vendita. +2 Talento, +2K utenti." },
  { id: "growth_hacker", name: "Growth Hacker", dept: "data", type: "Hiring",
    cost: { budget: 3 },
    chainFrom: ["data_scientist"], chainDiscount: { budget: 1 },
    effect: { talento: 1, dati: 2 },
    desc: "+1 Talento, +2 Dati." },
  { id: "pr_push", name: "PR Push", dept: "product", type: "Launch",
    cost: { budget: 2 }, effect: { vp: 2, morale: 1 },
    desc: "Comunicazione stampa. +2K utenti, +1 Morale." },
  { id: "series_b", name: "Series B", dept: "product", type: "Funding",
    cost: { tempo: 3, dati: 2 },
    chainFrom: ["series_a"], chainDiscount: { tempo: 2 },
    effect: { budget: 10, vp: 2 },
    desc: "Round Series B. +10 Budget, +2K utenti." },
  { id: "all_hands", name: "All-Hands Launch", dept: "product", type: "Meeting",
    cost: { tempo: 1 }, effect: { morale: 2, opponentsTempo: -1 },
    desc: "+2 Morale a te, -1 Tempo agli avversari." },
  { id: "perf_tuning", name: "Performance Tuning", dept: "eng", type: "BugFix",
    cost: { tempo: 2 },
    chainFrom: ["monitoring", "ci_cd"], chainDiscount: { tempo: 1 },
    effect: { techDebt: -2, vp: 2 },
    desc: "-2 Tech Debt, +2K utenti." },
  { id: "customer_success", name: "Customer Success", dept: "product", type: "Hiring",
    cost: { budget: 3 }, effect: { talento: 1, morale: 2 },
    desc: "+1 Talento, +2 Morale." },
  { id: "ent_deal", name: "Enterprise Deal", dept: "product", type: "Funding",
    cost: { tempo: 2, talento: 1 },
    chainFrom: ["sales_team"], chainDiscount: { tempo: 1 },
    effect: { budget: 6, vp: 1 },
    desc: "Contratto enterprise. +6 Budget, +1K utenti." },
  { id: "post_launch_retro", name: "Post-Launch Retro", dept: "eng", type: "Meeting",
    cost: { tempo: 1 }, effect: { morale: 1, vp: 1, talento: 1 },
    desc: "+1 Morale, +1K utenti, +1 Talento." },
  // --- Sabotage Cards (S3.1, expanded S9.4) — competitive plays for Q3 finale ---
  // Targeting variety in S9.4: leader / top-2 / last / next-picker — evita
  // dogpile sul leader e dà più decision-making strategico.
  { id: "talent_poach", name: "Talent Poach", dept: "product", type: "Sabotage",
    cost: { budget: 3, tempo: 1 },
    effect: { stealHiringFromLeader: true, vp: 1 },
    desc: "Ruba 1 Hiring random dalla bacheca del leader. +1K utenti." },
  { id: "patent_lawsuit", name: "Patent Lawsuit", dept: "product", type: "Sabotage",
    cost: { budget: 4 },
    effect: { targetMostFeatures: -3 },
    desc: "Uno dei top-2 produttori di Feature/Launch perde 3K utenti." }, // S9.4: targeting random of top-2
  { id: "negative_press", name: "Negative Press", dept: "product", type: "Sabotage",
    cost: { budget: 3 }, // S9.4: 2→3 (era a buon mercato per quanto forte)
    effect: { targetLeaderMorale: -2, vp: 1 },
    desc: "Il leader perde 2 Morale. +1K utenti." },
  { id: "counter_marketing", name: "Counter-Marketing", dept: "product", type: "Sabotage",
    cost: { budget: 2, tempo: 1 },
    effect: { cancelNextLaunch: true, vp: 1 },
    desc: "Annulla la prossima Launch avversaria. +1K utenti." },
  // --- S9.4: 2 nuove sabotage con target diverso dal leader ---
  { id: "hostile_takeover", name: "Hostile Takeover", dept: "product", type: "Sabotage",
    cost: { budget: 5 },
    effect: { stealVpFromLast: 3, vp: 1 },
    desc: "Acquisisci uno dei più piccoli. Il last-place perde 3K utenti. +1K a te." },
  { id: "industry_whisper", name: "Industry Whisper", dept: "data", type: "Sabotage",
    cost: { budget: 2, tempo: 1 },
    effect: { weakenNextPicker: { tempo: -1 }, vp: 1 },
    desc: "Soffia un rumor al concorrente che picca dopo di te. Perde 1⏱ subito. +1K a te." },
  // --- Crunch Cards (S1.1) — push-to-prod-no-tests trade-off ---
  { id: "black_friday", name: "Black Friday Push", dept: "product", type: "Launch",
    cost: { budget: 2, tempo: 1 }, effect: { vp: 6, techDebt: 3 },
    desc: "Picco marketing brutale. +6K utenti, +3 Tech Debt." },
  { id: "last_minute_fix", name: "Last Minute Fix", dept: "eng", type: "BugFix",
    cost: { tempo: 1 }, effect: { vp: 2, techDebt: 1 },
    desc: "Workaround invece di fix vero. +2K utenti, ma il bug torna (+1 Tech Debt)." },
];

function getCatalog(quarter) {
  return [CATALOG_Q1, CATALOG_Q2, CATALOG_Q3][quarter - 1];
}

// Lookup any card by id across all catalogs (for chain prerequisite name display)
const ALL_CARDS_BY_ID = {};
// Stable card numbering (Nº 01..42) and quarter origin — gives each card
// a "collectible" identity for editorial flair on the front.
const CARD_META = {};
(function() {
  let i = 1;
  [CATALOG_Q1, CATALOG_Q2, CATALOG_Q3].forEach((cat, qi) => {
    cat.forEach(c => {
      ALL_CARDS_BY_ID[c.id] = c;
      CARD_META[c.id] = { num: String(i).padStart(2, "0"), quarter: qi + 1 };
      i++;
    });
  });
})();
function chainNameById(id) {
  return ALL_CARDS_BY_ID[id]?.name || id;
}
function cardNum(id) { return CARD_META[id]?.num || "??"; }
function cardOriginQ(id) { return CARD_META[id]?.quarter || 0; }

// Per-department typographic ornament for cards
const DEPT_ORNAMENT = { product: "❦", eng: "◈", data: "⁂" };
const DEPT_LETTER   = { product: "P", eng: "E", data: "D" };

// ---------- MARKET EVENTS POOL (S4.1) ----------
// Triggered between Q1→Q2 and Q2→Q3. One random event per transition.
// Modifiers schema reuses Vision's: costModifiersByType, effectBonusByType,
// effectBonusByDept (NEW), effectBonusByCardId (NEW).
// onActivate(state) fires immediate effects before Q starts.
const EVENT_POOL = [
  {
    id: "recession", icon: "📉", name: "Recessione",
    description: "Mercato in contrazione. Le startup tagliano costi.",
    bonus: "Funding cards: +1K MAU effetto",
    malus: "Tutti −2💰 subito",
    onActivate: (s) => s.players.forEach(p => { p.budget = Math.max(0, p.budget - 2); }),
    modifiers: { effectBonusByType: { Funding: { vp: 1 } } },
  },
  {
    id: "mobile_boom", icon: "📱", name: "Mobile Boom",
    description: "App mobile esplodono di adozione.",
    bonus: "Mobile App: +2K MAU",
    malus: "Tool cards: +1⏱",
    modifiers: {
      effectBonusByCardId: { mobile_app: { vp: 2 } },
      costModifiersByType: { Tool: { tempo: 1 } },
    },
  },
  {
    id: "critical_cve", icon: "🚨", name: "Critical CVE",
    description: "Vulnerabilità grave nel framework. Chi non ha Monitoring soffre.",
    bonus: "(nessuno)",
    malus: "Senza Monitoring: −3K MAU subito",
    onActivate: (s) => s.players.forEach(p => {
      if (!p.permanents.monitoring) p.vp = Math.max(0, p.vp - 3);
    }),
    modifiers: {},
  },
  {
    id: "talent_war", icon: "💸", name: "Talent War",
    description: "Le big tech rilanciano. Stipendi alle stelle.",
    bonus: "(nessuno)",
    malus: "Hiring: +1💰 costo",
    modifiers: { costModifiersByType: { Hiring: { budget: 1 } } },
  },
  {
    id: "ai_hype", icon: "🤖", name: "AI Hype",
    description: "Tutti vogliono prodotti AI. Data è la nuova oro.",
    bonus: "Carte Data dept: +1K MAU",
    malus: "(nessuno)",
    modifiers: { effectBonusByDept: { data: { vp: 1 } } },
  },
  {
    id: "vc_drought", icon: "🏜", name: "VC Drought",
    description: "Capitali introvabili. Le valutazioni crollano.",
    bonus: "(nessuno)",
    malus: "Funding cards: −1K MAU effetto",
    modifiers: { effectBonusByType: { Funding: { vp: -1 } } },
  },
  {
    id: "open_source", icon: "📦", name: "Open Source Wave",
    description: "Wave open-source democratizza il tooling.",
    bonus: "Tool cards: −1💰 costo",
    malus: "(nessuno)",
    modifiers: { costModifiersByType: { Tool: { budget: -1 } } },
  },
  {
    id: "burnout", icon: "😩", name: "Burnout Wave",
    description: "Stress diffuso. Chi non cura il team paga.",
    bonus: "(nessuno)",
    malus: "Morale ≤4: −1K MAU subito; +1🐞 a tutti",
    onActivate: (s) => s.players.forEach(p => {
      if (p.morale <= 4) p.vp = Math.max(0, p.vp - 1);
      p.techDebt += 1;
    }),
    modifiers: {},
  },
  {
    id: "pivot", icon: "🔄", name: "Pivot Required",
    description: "Il PM convince il board: cambiamo direzione.",
    bonus: "Tutti +5💰",
    malus: "Tutti scartano 2 carte random dalla bacheca",
    onActivate: (s) => s.players.forEach(p => {
      p.budget += 5;
      for (let i = 0; i < 2 && p.played.length > 0; i++) {
        const idx = Math.floor(Math.random() * p.played.length);
        const removed = p.played.splice(idx, 1)[0];
        if (removed.permanent && p.permanents[removed.permanent]) {
          delete p.permanents[removed.permanent];
        }
      }
    }),
    modifiers: {},
  },
  {
    id: "black_swan", icon: "🦢", name: "Black Swan",
    description: "L'imprevedibile. Sorpresa totale.",
    bonus: "Sorpresa",
    malus: "Sorpresa",
    isBlackSwan: true, // resolved at draw time to a random other event
    modifiers: {},
  },
];

// ---------- VC REACTION POOL (S4.2) ----------
// Drawn by the leader after the Investor Pitch sequence.
const VC_POOL = [
  { id: "star_investor", icon: "⭐", name: "Star Investor",
    reaction: "Un VC celebrità si appassiona alla pitch.", vpDelta: 5 },
  { id: "skeptical_board", icon: "🤨", name: "Skeptical Board",
    reaction: "La board pone domande dure su unit economics.", vpDelta: -2 },
  { id: "standing_ovation", icon: "🎉", name: "Standing Ovation",
    reaction: "L'intera platea si alza ad applaudire.", vpDelta: 10 },
  { id: "polite_applause", icon: "👏", name: "Polite Applause",
    reaction: "Riconoscimento misurato, niente di più.", vpDelta: 1 },
  { id: "walk_out", icon: "🚪", name: "Walk Out",
    reaction: "Un VC esce a metà presentazione.", vpDelta: 0 },
];

// ---------- OKR POOL ----------
// S2.1: pool espanso a 14 + reward bumped (~+50% medio).
// S9.3: reward ricalibrati in base a difficoltà reale + 2 nuovi OKR aggiunti
// (synergy_chaser, lean_quarter) per varietà nel draft di 3 random.
// Il player ne "draft" 1 da 3 random options ogni Q.
const OKR_POOL = [
  // ── Existing 8 (S2.1 bumped, S9.3 retuned) ──
  { id: "ship_features", text: "Pesca 2+ carte produttive (Feature / Discovery / Launch)", reward: 5, // S9.3: 6→5 (era troppo facile per il reward dato)
    check: (p) => p._quarterPlays.filter(c => c.type === "Feature" || c.type === "Launch" || c.type === "Discovery").length >= 2 },
  { id: "morale_high", text: "Mantieni Morale ≥ 7", reward: 4, // S9.3: 5→4 (era la "scelta automatica" del Q1)
    check: (p) => p.morale >= 7 },
  { id: "data_target", text: "Raggiungi 5+ Dati totali", reward: 5,
    check: (p) => p.dati >= 5 },
  { id: "no_tech_debt", text: "Chiudi con Tech Debt ≤ 1", reward: 7, // S9.3: 6→7 (alta in Q3 quando i Crunch sono tentanti)
    check: (p) => p.techDebt <= 1 },
  { id: "talent_pool", text: "Avere ≥ 4 Talento attivo", reward: 5,
    check: (p) => p.talento >= 4 },
  { id: "diversification", text: "Pesca 3 dipartimenti diversi", reward: 5,
    check: (p) => new Set(p._quarterPlays.map(c => c.dept)).size >= 3 },
  { id: "fix_first", text: "Pesca almeno 1 BugFix", reward: 3,
    check: (p) => p._quarterPlays.some(c => c.type === "BugFix") },
  { id: "hiring_drive", text: "Esegui 2+ Hiring", reward: 4,
    check: (p) => p._quarterPlays.filter(c => c.type === "Hiring").length >= 2 },

  // ── 6 added in S2.1 (S9.3 retuned) ──
  { id: "cost_efficiency", text: "Spendi ≤ 4 budget totali questo Q", reward: 5,
    check: (p) => p._quarterPlays.reduce((s, c) => s + (c.cost?.budget || 0), 0) <= 4 },
  { id: "permanent_collector", text: "Possiedi ≥ 2 Tech Permanents", reward: 6, // S9.3: 4→6 (richiede commitment cross-Q)
    check: (p) => Object.keys(p.permanents).length >= 2 },
  { id: "funding_streak", text: "Pesca 2+ carte Funding", reward: 4,
    check: (p) => p._quarterPlays.filter(c => c.type === "Funding").length >= 2 },
  { id: "dept_purist", text: "Pesca solo carte di un dipartimento (≥ 3 carte)", reward: 8, // S9.3: 6→8 (molto restrittivo, era underrated)
    check: (p) => p._quarterPlays.length >= 3 && new Set(p._quarterPlays.map(c => c.dept)).size === 1 },
  { id: "morale_boost", text: "Aumenta Morale di ≥ 2 questo Q", reward: 4,
    check: (p) => p.morale - (p._quarterStartMorale || p.morale) >= 2 },
  { id: "velocity_run", text: "Pesca e gioca 5+ carte (no scarti)", reward: 6, // S9.3: 5→6 (alta in Q1 quando il budget è basso)
    check: (p) => p._quarterPlays.length >= 5 },

  // ── 2 added in S9.3 — varietà al draft via tracking fields nuovi ──
  { id: "synergy_chaser", text: "Trigga 2+ catene questo Q", reward: 5,
    check: (p) => (p._chainsTriggeredThisQ || 0) >= 2 },
  { id: "lean_quarter", text: "Chiudi il Q senza scartare carte", reward: 4,
    check: (p) => (p._quarterDiscards || 0) === 0 },
];
