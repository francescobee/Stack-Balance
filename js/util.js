"use strict";

// =============================================================
// util.js — generic helpers (no game logic)
// =============================================================

// === S6.3: Seedable RNG for Daily mode ===
// xorshift32 — small/fast/deterministic. When _rngSeeded=false, falls back
// to Math.random for normal play.
let _rngSeeded = false;
let _rngState = 1;

function setRngSeed(seed) {
  _rngSeeded = true;
  _rngState = (seed | 0) || 1;
}
function clearRngSeed() {
  _rngSeeded = false;
}
function rng() {
  if (!_rngSeeded) return Math.random();
  let x = _rngState | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  _rngState = x;
  return ((x >>> 0) / 0x100000000);
}

// Daily seed = hash of YYYY-MM-DD (UTC)
function dailySeed() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let h = 5381;
  for (let i = 0; i < today.length; i++) {
    h = ((h << 5) + h) + today.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) || 1;
}
function todayKey() { return new Date().toISOString().slice(0, 10); }

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function pickRandom(arr, n) { const c = [...arr]; shuffle(c); return c.slice(0, n); }
function instCard(t) { return JSON.parse(JSON.stringify(t)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// DOM helpers
//
// Attribute conventions:
//   • "class"   → assigned to el.className
//   • "html"    → assigned to el.innerHTML (use sparingly)
//   • "on*"     → registered as event handler property (e.g. onclick)
//   • null/undefined values → attribute SKIPPED entirely (defensive against
//     callers passing `disabled: cond ? "disabled" : null` — without this
//     guard, setAttribute("disabled", null) would set disabled="null" which
//     HTML treats as PRESENT, disabling the element regardless of intent)
//   • everything else → setAttribute(k, v)
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null) continue; // skip null/undefined — see comment above
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e[k.toLowerCase()] = v;
    else e.setAttribute(k, v);
  }
  kids.flat().forEach(k => {
    if (k == null) return;
    if (typeof k === "string") e.appendChild(document.createTextNode(k));
    else e.appendChild(k);
  });
  return e;
}
function deptLabel(d) { return d === "product" ? "Product" : d === "eng" ? "Engineering" : "Data"; }

// Toast notification (transient, top-right)
function showToast({ who, what, kind }) {
  let cont = document.getElementById("toastContainer");
  if (!cont) {
    cont = document.createElement("div");
    cont.id = "toastContainer";
    cont.className = "toast-container";
    document.body.appendChild(cont);
  }
  const t = document.createElement("div");
  t.className = "toast " + (kind || "");
  t.innerHTML = `<div class="who">${who}</div><div class="what">${what}</div>`;
  cont.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}
