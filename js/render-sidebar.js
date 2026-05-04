"use strict";

// =============================================================
// render-sidebar.js — pannelli laterali. Estratto da render.js
// in S8.1.
//   • Assets (risorse + permanents)
//   • OKR del trimestre corrente
//   • Awards forecast (con synergies)
//   • Activity log
// =============================================================

// ---------- SIDEBAR: Assets ----------
function renderAssets(p) {
  const prev = state.prevResources;
  const root = el("div", { class: "sidebar-panel" });

  const title = el("div", { class: "sp-title" });
  title.appendChild(el("span", {}, "Assets"));
  title.appendChild(el("em", {}, QUARTER_LABELS[state.quarter - 1].name));
  root.appendChild(title);

  const list = el("div", { class: "assets-list" });
  const items = [
    { k: "budget",   icon: "💰", label: "Budget" },
    { k: "tempo",    icon: "⏱",  label: "Tempo" },
    { k: "talento",  icon: "🧠", label: "Talento" },
    { k: "dati",     icon: "📊", label: "Dati" },
    { k: "morale",   icon: "🚀", label: "Morale" },
    { k: "techDebt", icon: "🐞", label: "Tech Debt" },
  ];
  const talentoUsed = p.talentoUsed || 0;
  const talentoAvailable = (p.talento || 0) - talentoUsed;
  const warn = {
    budget: p.budget < 2,
    tempo: p.tempo < 1,
    talento: talentoAvailable < 1,           // S1.2: warn su disponibile, non totale
    morale: p.morale < 3,
    techDebt: p.techDebt >= 4
  };
  items.forEach(it => {
    const v = p[it.k];
    const direction = prev ? (v > prev[it.k] ? "up" : (v < prev[it.k] ? "down" : "")) : "";
    const row = el("div", { class: `asset ${warn[it.k] ? "warn" : ""}` });
    row.appendChild(el("span", { class: "icon" }, it.icon));
    row.appendChild(el("span", { class: "label" }, it.label));

    // S1.2: per il Talento mostriamo "disponibile / totale" se ne hai usato
    let displayVal = String(v);
    if (it.k === "talento" && talentoUsed > 0) {
      displayVal = `${talentoAvailable}/${v}`;
    }
    row.appendChild(el("span", { class: "val " + direction }, displayVal));
    list.appendChild(row);

    // S1.1.1: tempo penalty hint when bugs are slowing down work
    if (it.k === "tempo" && p._tempoDebtLoss > 0) {
      list.appendChild(el("div", {
        class: "asset-sub",
        title: `I bug ti rubano ${p._tempoDebtLoss}⏱ questo quarter. Riduci il Tech Debt per liberare tempo.`
      }, `⚠ −${p._tempoDebtLoss}⏱ persi a bug-fixing`));
    }
    // S1.2: talento usage hint
    if (it.k === "talento" && talentoUsed > 0) {
      list.appendChild(el("div", {
        class: "asset-sub muted",
        title: `Capacità di Talento per questo quarter. Si resetta a inizio Q.`
      }, `${talentoUsed} di ${v} usati questo Q`));
    }
  });
  root.appendChild(list);

  // Permanents
  const permsDiv = el("div", { class: "permanents" });
  permsDiv.appendChild(el("div", { class: "perm-label" }, "Tech Permanents"));
  const perms = Object.keys(p.permanents);
  if (perms.length === 0) {
    permsDiv.appendChild(el("div", { class: "permanents-empty" }, "Nessuno ancora"));
  } else {
    const lookup = {
      ci_cd: "CI/CD Pipeline",
      data_lake: "Data Lake",
      design_system: "Design System",
      monitoring: "Monitoring",
      // S20.2 + S20.4: new permanents
      personalization: "Personalization Engine",
      feature_flags: "Feature Flags",
      incident_runbook: "Incident Runbook",
      growth_dashboard: "Growth Dashboard",
    };
    perms.forEach(k => {
      permsDiv.appendChild(el("div", { class: "perm-item" }, lookup[k] || k));
    });
  }
  root.appendChild(permsDiv);

  return root;
}

// ---------- SIDEBAR: OKR ----------
function renderOKRs(p) {
  const root = el("div", { class: "sidebar-panel" });
  const title = el("div", { class: "sp-title" });
  title.appendChild(el("span", {}, "OKR"));
  title.appendChild(el("em", {}, `Q${state.quarter}`));
  root.appendChild(title);

  p.okrs.forEach(o => {
    const done = o.check(p, state.quarter);
    const div = el("div", { class: "okr" + (done ? " done" : "") });
    div.appendChild(el("span", { class: "okr-text" }, o.text));
    div.appendChild(el("span", { class: "okr-prog" }, `+${o.reward}K`));
    root.appendChild(div);
  });
  return root;
}

// ---------- SIDEBAR: Awards forecast ----------
function renderAwardsForecast(p) {
  const root = el("div", { class: "sidebar-panel" });
  const title = el("div", { class: "sp-title" });
  title.appendChild(el("span", {}, "End-game Awards"));
  title.appendChild(el("em", {}, "forecast"));
  root.appendChild(title);

  const awards = computeAwards(p);

  // S2.2: split into stat awards + synergies for visual hierarchy
  const stats = awards.filter(a => !a.isSynergy);
  const synergies = awards.filter(a => a.isSynergy);

  const list = el("div", { class: "awards-list" });
  stats.forEach(a => list.appendChild(renderAwardRow(a)));
  root.appendChild(list);

  // ── Synergies section (S2.2) ──
  if (synergies.length > 0) {
    const synTitle = el("div", { class: "sp-subtitle" });
    synTitle.appendChild(el("span", {}, "Synergies"));
    synTitle.appendChild(el("em", {}, "multi-condition"));
    root.appendChild(synTitle);

    const synList = el("div", { class: "awards-list synergies-list" });
    synergies.forEach(a => synList.appendChild(renderSynergyRow(a)));
    root.appendChild(synList);
  }

  const total = awards.reduce((s, a) => s + a.points, 0);
  const totalRow = el("div", { class: "a-total" });
  totalRow.appendChild(el("span", {}, "Stimato"));
  totalRow.appendChild(el("span", { class: "num" }, `+${total}K`));
  root.appendChild(totalRow);

  return root;
}

// S2.2: simple row for tier-based stat awards
function renderAwardRow(a) {
  const row = el("div", {
    class: `award-row tier-${a.tier || (a.points > 0 ? "silver" : "none")}` + (a.points === 0 ? " empty" : ""),
    title: a.detail || ""
  });
  row.appendChild(el("span", { class: "a-icon" }, a.icon));
  const name = el("span", { class: "a-name" });
  name.appendChild(el("span", {}, a.name));
  if (a.detail) name.appendChild(el("span", { class: "a-detail" }, a.detail));
  row.appendChild(name);
  row.appendChild(el("span", { class: "a-points" }, a.points > 0 ? `+${a.points}K` : "—"));
  return row;
}

// S2.2: synergy row with per-requirement ✓/✗ indicators
function renderSynergyRow(a) {
  const reqsMet = (a.requirements || []).filter(r => r.met).length;
  const reqsTotal = (a.requirements || []).length;
  const isAlmost = !a.points && reqsTotal > 0 && (reqsTotal - reqsMet === 1);

  const row = el("div", {
    class: `award-row synergy ${a.points > 0 ? "active" : "inactive"}${isAlmost ? " almost" : ""}`,
    title: a.detail || ""
  });
  row.appendChild(el("span", { class: "a-icon" }, a.icon));

  const name = el("span", { class: "a-name" });
  name.appendChild(el("span", {}, a.name));
  if (a.detail) name.appendChild(el("span", { class: "a-detail" }, a.detail));

  // Requirement chips ✓/✗
  if (a.requirements) {
    const reqs = el("div", { class: "synergy-reqs" });
    a.requirements.forEach(r => {
      reqs.appendChild(el("span", {
        class: "req " + (r.met ? "met" : "miss"),
        title: r.met ? "Soddisfatto" : `Manca: ${r.label} (ora ${r.current})`
      }, (r.met ? "✓ " : "✗ ") + r.label));
    });
    name.appendChild(reqs);
  }
  row.appendChild(name);

  row.appendChild(el("span", { class: "a-points" }, a.points > 0 ? `+${a.points}K` : "—"));
  return row;
}

// ---------- SIDEBAR: Activity log ----------
function renderLog() {
  const root = el("div", { class: "sidebar-panel" });
  const title = el("div", { class: "sp-title" });
  title.appendChild(el("span", {}, "Activity"));
  root.appendChild(title);

  const list = el("div", { class: "log" });
  state.log.slice(0, 6).forEach(entry => {
    list.appendChild(el("div", { class: `entry ${entry.cls}` }, entry.msg));
  });
  root.appendChild(list);
  return root;
}
