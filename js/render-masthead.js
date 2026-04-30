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
  const localIdx = state.localSlotIdx ?? 0;
  const localPlayer = state.players[localIdx];
  const us = el("div", { class: "users-stat" });
  us.innerHTML = `<span class="label">Your MAU</span><span class="num">${localPlayer.vp}K</span>`;
  meta.appendChild(us);

  // S2.3: Vision badge (your founder identity)
  const vis = localPlayer?.vision;
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

// ---------- MOBILE RESOURCES STRIP (S12 / mobile UX iter 4) ----------
// Compact horizontal strip with the local POV player's 6 resources.
// Visible only on phone (≤600px) via CSS; hidden on tablet/desktop.
// Replaces the byline-strip (rivals) at the top of the board on mobile —
// rationale: when picking on a thumb-sized pyramid you need to see your
// own resources to plan, more than the rivals' user count. Rivals
// info still accessible scrolling the tableau / sidebar below.
function renderMobileResourcesStrip(p) {
  const root = el("div", { class: "mobile-resources-strip" });
  const talentoUsed = p.talentoUsed || 0;
  const talentoAvailable = (p.talento || 0) - talentoUsed;

  // S13.1.C: ordered by decision priority (per design review), not schema:
  //   budget+tempo are picking gates → first
  //   morale ↑ — gates morale-dependent cards earlier in thought
  //   talento, dati — follow-on capacity / defensive
  //   techDebt — penalty (consequence, not input) → last
  const items = [
    { k: "budget",   icon: "💰", val: p.budget,
      warn: p.budget < 2 },
    { k: "tempo",    icon: "⏱",  val: p.tempo,
      warn: p.tempo < 1 },
    { k: "morale",   icon: "🚀", val: p.morale,
      warn: p.morale < 3 },
    { k: "talento",  icon: "🧠",
      val: talentoUsed > 0 ? `${talentoAvailable}/${p.talento}` : String(p.talento),
      warn: talentoAvailable < 1 },
    { k: "dati",     icon: "📊", val: p.dati,
      warn: false },
    { k: "techDebt", icon: "🐞", val: p.techDebt,
      warn: p.techDebt >= 4 },
  ];

  items.forEach(it => {
    const cell = el("div", { class: "mrs-item" + (it.warn ? " warn" : "") });
    cell.appendChild(el("span", { class: "icon" }, it.icon));
    cell.appendChild(el("span", { class: "val" }, String(it.val)));
    root.appendChild(cell);
  });

  return root;
}

// ---------- MOBILE TURN BAR (S13.2.A — Phase 13) ----------
// Persistent "whose turn is it" bar between progress strip and resources
// strip on phone. Visible only ≤ 600px via CSS. Solves the discoverability
// gap noted in design review: turn-indicator inside .pyramid-area scrolls
// out of view when reading sidebar/tableau.
function renderMobileTurnBar() {
  const root = el("div", { class: "mobile-turn-bar" });
  const idx = state.activePicker;
  const localIdx = state.localSlotIdx ?? 0;

  // Pass phase (Hot Seat) — already covered by full-screen pass modal,
  // but show a placeholder for consistency
  if (state.phase === "passing") {
    root.appendChild(el("span", { class: "mtb-status" }, "🪑 Passa il mouse…"));
    return root;
  }
  if (idx == null) {
    // pre-pyramid (vision/okr draft) — show neutral placeholder
    root.appendChild(el("span", { class: "mtb-status" }, "Setup in corso…"));
    return root;
  }

  const p = state.players[idx];
  const cleanName = (p?.name?.split(" (")[0] || p?.name || "?");
  const initial = (cleanName[0] || "?").toUpperCase();
  const isMe = idx === localIdx && state.phase === "human";

  if (isMe) root.classList.add("is-me");

  const avatar = el("span", { class: `mtb-avatar player-${idx}` }, initial);
  root.appendChild(avatar);

  const nameSpan = el("span", { class: "mtb-name" }, cleanName);
  root.appendChild(nameSpan);

  // Status text varies by phase
  let statusText = "";
  if (state.phase === "human") {
    statusText = isMe ? "🎯 Tocca a te" : "in attesa…";
  } else if (state.phase === "ai") {
    statusText = "sta pescando…";
  } else if (state.phase === "animating") {
    statusText = "…";
  } else if (state.phase === "between") {
    statusText = "fine pesca";
  }
  root.appendChild(el("span", { class: "mtb-status" }, statusText));

  return root;
}

// ---------- BYLINE STRIP (rivals) ----------
function renderByline() {
  const root = el("div", { class: "byline-strip" });
  root.appendChild(el("div", { class: "byline-label" }, "Rivals"));

  const list = el("div", { class: "byline-list" });
  // S10: show all players except local POV (was hard-coded to "1, 2, 3")
  const localIdx = state.localSlotIdx ?? 0;
  for (let i = 0; i < NUM_PLAYERS; i++) {
    if (i === localIdx) continue;
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
  const localIdx = state.localSlotIdx ?? 0;
  // S11.2: hot-seat "passing" phase = pass-screen modal is open, gameplay paused
  if (state.phase === "passing") {
    return el("span", { class: "turn-indicator" }, "🪑 Passa il mouse...");
  }
  if (state.phase === "human") {
    const isMine = state.activePicker === localIdx;
    if (isMine) {
      const e = el("span", { class: "turn-indicator your-turn" });
      e.appendChild(el("span", { class: "dot" }));
      e.appendChild(el("span", {}, "Tocca a te"));
      return e;
    }
    // S10: another human's turn
    const p = state.players[state.activePicker];
    const cleanName = (p?.name?.split(' (')[0] || p?.name || "?");
    const e = el("span", { class: "turn-indicator" });
    e.appendChild(el("span", { class: "spinner" }));
    e.appendChild(el("span", {}, `In attesa di ${cleanName}…`));
    return e;
  }
  if (state.phase === "ai") {
    const p = state.players[state.activePicker];
    const cleanName = (p?.name?.split(' (')[0] || p?.name || "?");
    const e = el("span", { class: "turn-indicator" });
    e.appendChild(el("span", { class: "spinner" }));
    e.appendChild(el("span", {}, `${cleanName} sta scegliendo`));
    return e;
  }
  return el("span", { class: "turn-indicator" }, "...");
}
