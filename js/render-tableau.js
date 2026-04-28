"use strict";

// =============================================================
// render-tableau.js — bacheca / "The Build". Estratto da
// render.js in S8.1. Visualizzazione delle carte giocate dal
// player umano, raggruppate per dipartimento, con visual del
// Tech Debt (S7.2: crepe SVG + shake animation).
// =============================================================

// ---------- BACHECA (your build) ----------
function renderTableau(p) {
  const root = el("div", { class: "stage bacheca" });
  root.appendChild(el("span", { class: "stage-label" }, "The Build"));
  root.appendChild(el("span", { class: "stage-meta" }, `${p.played.length} carte giocate`));

  const groups = { product: [], eng: [], data: [] };
  p.played.forEach((c, idx) => {
    groups[c.dept].push({ card: c, idx });
  });

  // S7.2: visual debt — cracks overlay when techDebt >= 3, shake when just increased
  const debtCls = p.techDebt >= 3 ? " high-debt" : "";
  const shakeCls = (state._debtShakeTs && Date.now() - state._debtShakeTs < 600) ? " shaking" : "";
  const grouped = el("div", { class: "tableau-grouped" + debtCls + shakeCls });
  ["product", "eng", "data"].forEach(d => {
    const group = el("div", { class: "tab-group" });

    const header = el("div", { class: `tab-group-header ${d}` });
    header.appendChild(el("span", {}, deptLabel(d)));
    header.appendChild(el("span", { class: "count" }, String(groups[d].length).padStart(2, '0')));
    group.appendChild(header);

    if (groups[d].length === 0) {
      group.appendChild(el("div", { class: "tab-empty" }, "—"));
    } else {
      const stack = el("div", { class: "tab-stack" });
      groups[d].forEach(({ card: c, idx }) => {
        const justPlayed = state.justPlayedCardId === (c.id + "_" + idx);
        const tc = el("div", {
          class: `tab-card ${c.dept} ${justPlayed ? "just-played" : ""}`,
          title: `${c.name}\n${c.type} · ${deptLabel(c.dept)}\n${c.desc}`
        });
        const e = c.effect || {};
        // Mini wax-seal MAU (top-right circle)
        if (e.vp) tc.appendChild(el("div", { class: "tc-seal" }, `+${e.vp}`));

        // Mast: emblem + type
        const tcMast = el("div", { class: "tc-mast" });
        tcMast.appendChild(el("span", { class: `tc-emblem ${c.dept}` }, DEPT_LETTER[c.dept] || "?"));
        tcMast.appendChild(el("span", { class: "tc-type" }, c.type));
        tc.appendChild(tcMast);

        tc.appendChild(el("div", { class: "tc-name" }, c.name));

        const effParts = [];
        if (e.budget) effParts.push(`💰+${e.budget}`);
        if (e.tempo) effParts.push(`⏱+${e.tempo}`);
        if (e.talento) effParts.push(`🧠+${e.talento}`);
        if (e.dati) effParts.push(`📊+${e.dati}`);
        if (e.morale) effParts.push(`🚀+${e.morale}`);
        if (e.techDebt) effParts.push(`🐞${e.techDebt}`);
        if (e.opponentsTempo) effParts.push(`⏱ avv.${e.opponentsTempo}`);
        if (effParts.length) tc.appendChild(el("div", { class: "tc-effects" }, effParts.join(" ")));
        if (c.permanent) tc.appendChild(el("div", { class: "tc-effects perm" }, "Permanente"));
        if (c.desc) tc.appendChild(el("div", { class: "tc-desc" }, c.desc));
        stack.appendChild(tc);
      });
      group.appendChild(stack);
    }
    grouped.appendChild(group);
  });
  root.appendChild(grouped);
  return root;
}
