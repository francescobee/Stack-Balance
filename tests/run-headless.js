"use strict";

// =============================================================
// run-headless.js — Node-based test runner (no browser required)
//
// Usage:
//   node tests/run-headless.js
//
// What it does:
//   • Loads all production scripts (data, visions, scenarios, util,
//     balance, state, rules, ai) into a Node `vm` context with a
//     minimal DOM stub
//   • Loads tests/runner.js + tests/test-rules.js
//   • Intercepts `it()` calls (since `const __tests` in runner.js
//     isn't exposed across vm.runInContext boundaries)
//   • Runs all tests, prints pass/fail summary to stdout
//   • Exits 0 if all pass, 1 if any fail
//
// Used by:
//   • Local development (quick feedback without opening tests/test.html)
//   • GitHub Actions CI (.github/workflows/test.yml)
// =============================================================

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Minimal DOM stub — only the few APIs the production scripts touch at
// load-time. We're only running pure-function tests; render/UI code
// would need a real DOM.
const ctx = {
  console,
  setTimeout,
  document: {
    getElementById: () => ({ innerHTML: "", appendChild: () => {} }),
    createElement: () => ({
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      appendChild: () => {},
      set innerHTML(v) {},
      set textContent(v) {},
      set className(v) {},
      querySelector: () => null,
      querySelectorAll: () => [],
    }),
  },
  window: { addEventListener: () => {} },
};
ctx.global = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

const root = path.join(__dirname, "..");
function load(rel) {
  const code = fs.readFileSync(path.join(root, rel), "utf8");
  vm.runInContext(code, ctx, { filename: rel });
}

// Production logic (game-only, no render/main).
[
  "js/data.js",
  "js/visions.js",
  "js/scenarios.js",
  "js/util.js",
  "js/balance.js",
  "js/synergies.js",    // S15: synergy pool + drawSynergies
  "js/archetypes.js",   // S16: AI archetype pool + drawArchetypes
  "js/win-conditions.js", // S17: scenario-locked alternative win rules
  "js/user.js",         // S18.1: pure XP/level helpers (loadProfile etc. require localStorage stub — not used by tests)
  "js/state.js",
  "js/rules.js",
  "js/ai.js",
  "js/multiplayer.js",  // S10: serialization + slot helpers (PeerJS calls graceful no-op since `Peer` undefined)
  "js/hotseat.js",      // S11: hot-seat helpers (isHumanSlot, countHumans, shouldShowPassScreen)
  "tests/runner.js",
].forEach(load);

// Intercept describe/it before loading test files. Why: in runner.js,
// `const __tests = []` is a script-scoped binding that doesn't appear on
// the vm context object. So we can't reach __tests externally. Instead
// we shadow `it` and `describe` in the context to capture tests as they
// register.
const captured = [];
let __currentGroup = "(top-level)";
ctx.it = (name, fn) => captured.push({ group: __currentGroup, name, fn });
ctx.describe = (name, fn) => {
  const prev = __currentGroup;
  __currentGroup = name;
  try { fn(); }
  finally { __currentGroup = prev; }
};

// Test files
load("tests/test-rules.js");

// Run captured tests directly.
let pass = 0, fail = 0;
const failures = [];
captured.forEach(({ group, name, fn }) => {
  try { fn(); pass++; }
  catch (e) { fail++; failures.push({ group, name, err: e }); }
});

const total = pass + fail;
console.log(`\n${total} tests · ${pass} pass · ${fail} fail`);

if (failures.length) {
  console.log("\nFailures:");
  failures.forEach(({ group, name, err }) => {
    console.log(`  ✗ [${group}] ${name}`);
    console.log(`      ${err.message || err}${err.detail ? "\n      " + err.detail : ""}`);
  });
  process.exit(1);
}
process.exit(0);
