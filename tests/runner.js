"use strict";

// =============================================================
// runner.js — minimal test runner. No libraries.
//
// API:
//   describe("Group", () => { ... });
//   it("does X", () => { assert(...); });
//   assert(cond, msg?)
//   assertEq(a, b, msg?)        — strict deep equality for primitives;
//                                  reference equality for objects (use
//                                  assertDeepEq for objects/arrays)
//   assertDeepEq(a, b, msg?)    — recursive structural compare
//   assertClose(a, b, eps, msg?) — for floats
//
// Behaviour:
//   - Tests register synchronously via describe()/it() blocks.
//   - Call runAllTests() to execute and write a report into #report.
//   - Failures don't throw out — they're collected; final summary
//     shows counts + list of failing assertions.
// =============================================================

const __tests = []; // [{group, name, fn}]
let __currentGroup = "(top-level)";

function describe(name, fn) {
  const prev = __currentGroup;
  __currentGroup = name;
  try { fn(); }
  finally { __currentGroup = prev; }
}

function it(name, fn) {
  __tests.push({ group: __currentGroup, name, fn });
}

// ---------- Assertions ----------
class AssertionError extends Error {
  constructor(msg, detail) { super(msg); this.detail = detail; this.name = "AssertionError"; }
}

function assert(cond, msg) {
  if (!cond) throw new AssertionError(msg || "assert failed");
}

function assertEq(a, b, msg) {
  if (a !== b) {
    throw new AssertionError(
      msg || "assertEq failed",
      `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`
    );
  }
}

function assertDeepEq(a, b, msg) {
  if (!__deepEq(a, b)) {
    throw new AssertionError(
      msg || "assertDeepEq failed",
      `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`
    );
  }
}

function assertClose(a, b, eps, msg) {
  eps = eps != null ? eps : 1e-6;
  if (Math.abs(a - b) > eps) {
    throw new AssertionError(
      msg || "assertClose failed",
      `expected ${b} ± ${eps}, got ${a}`
    );
  }
}

function __deepEq(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!__deepEq(a[k], b[k])) return false;
  }
  return true;
}

// ---------- Runner ----------
function runAllTests() {
  const reportEl = document.getElementById("report");
  reportEl.innerHTML = "";

  let passed = 0, failed = 0;
  const failures = [];
  const groupBuckets = new Map(); // group → {pass, fail, items: []}

  __tests.forEach(({ group, name, fn }) => {
    let ok = true, err = null;
    try { fn(); }
    catch (e) { ok = false; err = e; }

    if (ok) passed++;
    else { failed++; failures.push({ group, name, err }); }

    if (!groupBuckets.has(group)) groupBuckets.set(group, { pass: 0, fail: 0, items: [] });
    const bucket = groupBuckets.get(group);
    bucket[ok ? "pass" : "fail"]++;
    bucket.items.push({ name, ok, err });
  });

  // Summary banner
  const total = passed + failed;
  const banner = document.createElement("div");
  banner.className = "banner " + (failed === 0 ? "ok" : "fail");
  banner.innerHTML = failed === 0
    ? `✅ <strong>All ${total} assertions passed.</strong>`
    : `❌ <strong>${failed} of ${total} assertions failed.</strong> · ${passed} passed.`;
  reportEl.appendChild(banner);

  // Per-group breakdown
  groupBuckets.forEach((bucket, group) => {
    const sec = document.createElement("section");
    sec.className = "group" + (bucket.fail ? " has-fail" : "");
    const h = document.createElement("h3");
    h.textContent = `${group} — ${bucket.pass} pass / ${bucket.fail} fail`;
    sec.appendChild(h);
    const ul = document.createElement("ul");
    bucket.items.forEach(({ name, ok, err }) => {
      const li = document.createElement("li");
      li.className = ok ? "pass" : "fail";
      li.innerHTML = (ok ? "✓ " : "✗ ") + escapeHtmlBasic(name);
      if (!ok && err) {
        const detail = document.createElement("pre");
        detail.textContent = (err.message || String(err)) + (err.detail ? "\n  " + err.detail : "");
        li.appendChild(detail);
      }
      ul.appendChild(li);
    });
    sec.appendChild(ul);
    reportEl.appendChild(sec);
  });

  return { passed, failed, total };
}

function escapeHtmlBasic(s) {
  return String(s).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
}
