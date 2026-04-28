"use strict";

// =============================================================
// render-masthead.js — header / chrome del gioco. Estratto da
// render.js in S8.1.
//   • Profile chip (avatar + nome + W/G stats)
//   • Masthead (titolo testata + edition + badges + meta)
//   • Progress strip (Q1→Q2→Q3 con fill)
//   • Byline strip (rivali in alto, con tableau mini)
//   • Turn indicator (helper riusato dalla pyramid)
// =============================================================

// ---------- PROFILE CHIP (in masthead) ----------
function renderProfileChip() {
  const p = getProfile();
  if (!p) return null;
  const chip = el("button", {
    class: "profile-chip",
    title: "Profilo · click per modificare",
    onclick: showProfileSettings
  });
  chip.appendChild(el("span", { class: "pc-avatar" }, p.avatar || "?"));
  chip.appendChild(el("span", { class: "pc-name" }, p.name));
  const g = p.stats?.games || 0;
  const w = p.stats?.wins || 0;
  if (g > 0) {
    chip.appendChild(el("span", { class: "pc-stats" }, `${w}/${g}`));
  }
  return chip;
}

// ---------- MASTHEAD ----------
function renderMasthead() {
  const ql = QUARTER_LABELS[state.quarter - 1];
  const root = el("div", { class: "masthead" });
  const inner = el("div", { class: "masthead-inner" });

  const np = el("div", { class: "nameplate" });
  const title = el("h1", { class: "title" });
  title.innerHTML = `Stack <em>&amp;</em> Balance`;
  np.appendChild(title);
  np.appendChild(el("span", { class: "tagline" }, "— The Quarterly Rivals Chronicle"));
  inner.appendChild(np);

  const ed = el("div", { class: "edition" });
  ed.innerHTML = `Issue Nº ${state.quarter} · <strong>${ql.name.toUpperCase()}</strong>`;
  inner.appendChild(ed);

  const meta = el("div", { class: "meta" });
  const us = el("div", { class: "users-stat" });
  us.innerHTML = `<span class="label">Your MAU</span><span class="num">${state.players[0].vp}K</span>`;
  meta.appendChild(us);

  // S2.3: Vision badge (your founder identity)
  const vis = state.players[0]?.vision;
  if (vis) {
    const visBadge = el("div", {
      class: "vision-badge",
      title: `${vis.name}\n+ ${vis.bonus}\n− ${vis.malus}`
    });
    visBadge.appendChild(el("span", { class: "vb-icon" }, vis.icon));
    visBadge.appendChild(el("span", { class: "vb-name" }, vis.name));
    meta.appendChild(visBadge);
  }

  // S4.1: Active Market Event badge
  const ev = state.activeEvent;
  if (ev) {
    const evBadge = el("div", {
      class: "event-badge",
      title: `${ev.name}\n+ ${ev.bonus}\n− ${ev.malus}\n${ev.description}`
    });
    evBadge.appendChild(el("span", { class: "eb-icon" }, ev.icon));
    evBadge.appendChild(el("span", { class: "eb-name" }, ev.name));
    meta.appendChild(evBadge);
  }

  // S6.1: Active Scenario badge (only if non-Standard)
  const sc = state.scenario;
  if (sc && sc.id !== "standard") {
    const scBadge = el("div", {
      class: "scenario-badge",
      title: `${sc.name}\n+ ${sc.bonus}\n− ${sc.malus}`
    });
    scBadge.appendChild(el("span", { class: "sb-icon" }, sc.icon));
    scBadge.appendChild(el("span", { class: "sb-name" }, sc.name));
    meta.appendChild(scBadge);
  }
  // S6.3: Daily Run badge
  if (state.isDaily) {
    const dailyBadge = el("div", { class: "daily-badge", title: "Daily Run · seed condiviso" });
    dailyBadge.innerHTML = `🌅 <span class="db-name">Daily</span>`;
    meta.appendChild(dailyBadge);
  }

  const chip = renderProfileChip();
  if (chip) meta.appendChild(chip);
  const helpBtn = el("button", {
    class: "help-btn", title: "Come si gioca", onclick: showHelpModal
  }, "?");
  meta.appendChild(helpBtn);
  inner.appendChild(meta);

  root.appendChild(inner);
  root.appendChild(el("div", { class: "double-rule" }));
  return root;
}

// ---------- PROGRESS STRIP (replaces Gantt) ----------
function renderProgress() {
  const root = el("div", { class: "progress-strip" });
  for (let qIdx = 0; qIdx < NUM_QUARTERS; qIdx++) {
    const qNum = qIdx + 1;
    const isCurrent = state.quarter === qNum;
    const isPast = state.quarter > qNum;
    const ql = QUARTER_LABELS[qIdx];

    const cell = el("div", {
      class: `q-cell ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`
    });
    cell.appendChild(el("div", { class: "q-label" }, `${ql.icon} ${ql.name}`));

    const bar = el("div", { class: "q-bar" });
    const fill = el("div", { class: "fill" });
    let pct = 0;
    if (isCurrent) pct = (state.pickIndex / TOTAL_PICKS) * 100;
    else if (isPast) pct = 100;
    fill.style.width = pct + "%";
    bar.appendChild(fill);
    cell.appendChild(bar);

    let status;
    if (isCurrent) status = `${state.pickIndex}/${TOTAL_PICKS}`;
    else if (isPast) status = ql.milestone;
    else status = ql.milestone;
    cell.appendChild(el("div", { class: "q-status" }, status));

    root.appendChild(cell);
  }
  return root;
}

// ---------- BYLINE STRIP (rivals) ----------
function renderByline() {
  const root = el("div", { class: "byline-strip" });
  root.appendChild(el("div", { class: "byline-label" }, "Rivals"));

  const list = el("div", { class: "byline-list" });
  for (let i = 1; i < NUM_PLAYERS; i++) {
    const p = state.players[i];
    const isActive = state.activePicker === i;
    const initial = p.name[0];
    const m = p.name.match(/^(.+?)\s*\((.*?)\)/);
    const cleanName = m ? m[1] : p.name;
    const role = m ? m[2] : "";

    const cell = el("div", { class: `byline player-${i}` + (isActive ? " active" : "") });
    cell.appendChild(el("div", { class: "byline-avatar" }, initial));

    const info = el("div", { style: "min-width: 0;" });
    const nameEl = el("div", { class: "byline-name" }, cleanName);
    info.appendChild(nameEl);
    if (role) info.appendChild(el("span", { class: "byline-role" }, role));
    cell.appendChild(info);

    const stats = el("div", { class: "byline-stats" });
    const usersSpan = el("span", { class: "users" }, String(p.vp));
    usersSpan.appendChild(el("span", {}, "K"));
    stats.appendChild(usersSpan);
    cell.appendChild(stats);

    const tabRow = el("div", { class: "byline-tableau" });
    p.played.forEach((c, idx) => {
      const isJustPlayed = state.aiJustPlayed
        && state.aiJustPlayed.playerIdx === i
        && idx === state.aiJustPlayed.count - 1;
      tabRow.appendChild(el("div", {
        class: `pip ${c.dept} ${isJustPlayed ? "just-played-mini" : ""}`,
        title: c.name
      }));
    });
    cell.appendChild(tabRow);
    list.appendChild(cell);
  }
  root.appendChild(list);
  return root;
}

// ---------- TURN INDICATOR ----------
function makeTurnIndicator() {
  if (state.phase === "human") {
    const e = el("span", { class: "turn-indicator your-turn" });
    e.appendChild(el("span", { class: "dot" }));
    e.appendChild(el("span", {}, "Tocca a te"));
    return e;
  }
  if (state.phase === "ai") {
    const p = state.players[state.activePicker];
    const cleanName = (p.name.split(' (')[0] || p.name);
    const e = el("span", { class: "turn-indicator" });
    e.appendChild(el("span", { class: "spinner" }));
    e.appendChild(el("span", {}, `${cleanName} sta scegliendo`));
    return e;
  }
  return el("span", { class: "turn-indicator" }, "...");
}
