/* ENV 401 Assessment Dashboard
 * Everything below is computed from window.STUDENT_ROWS (data.js), so swapping
 * in a new data file updates every chart, tile and table.
 */
(function () {
  "use strict";

  // ---- Settings --------------------------------------------------------
  const TARGET = 0.80;      // illustrative program target (share meeting expectations)
  const MEETS = 3;          // a score of 3 or 4 meets expectations
  const DIMS = [
    { key: "ev", name: "Evidence", short: "Evidence", tiny: "Evid." },
    { key: "sr", name: "Systems Reasoning", short: "Systems", tiny: "Syst." },
    { key: "sa", name: "Stakeholder Analysis", short: "Stakeholder", tiny: "Stake." },
    { key: "rec", name: "Recommendation", short: "Recommend.", tiny: "Rec." },
  ];
  const LEVELS = [
    { v: 1, name: "Below expectations" },
    { v: 2, name: "Approaching" },
    { v: 3, name: "Meets" },
    { v: 4, name: "Exceeds" },
  ];

  // ---- Data ------------------------------------------------------------
  const STUDENTS = window.STUDENT_ROWS.map(([id, section, ev, sr, sa, rec]) => {
    const s = { id, section, ev, sr, sa, rec };
    s.met = DIMS.filter(d => s[d.key] >= MEETS).length;
    return s;
  });
  const SECTIONS = [...new Set(STUDENTS.map(s => s.section))].sort((a, b) => a - b);

  const state = { section: "all", onlyBelow: false, sortKey: "id", sortDir: 1 };

  // ---- Helpers ---------------------------------------------------------
  const $ = sel => document.querySelector(sel);
  const pct = x => `${Math.round(x * 100)}%`;
  const fmt2 = x => x.toFixed(2);
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const variance = a => { const m = mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1); };
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function selected() {
    return state.section === "all" ? STUDENTS : STUDENTS.filter(s => s.section === state.section);
  }
  function dimStats(rows, d) {
    const vals = rows.map(r => r[d.key]);
    const counts = LEVELS.map(l => vals.filter(v => v === l.v).length);
    const meet = vals.filter(v => v >= MEETS).length;
    return { dim: d, n: vals.length, mean: mean(vals), meet, rate: meet / vals.length, counts };
  }
  function cronbach(rows) {
    if (rows.length < 3) return NaN;
    const k = DIMS.length;
    const itemVar = DIMS.reduce((s, d) => s + variance(rows.map(r => r[d.key])), 0);
    const totVar = variance(rows.map(r => DIMS.reduce((s, d) => s + r[d.key], 0)));
    return (k / (k - 1)) * (1 - itemVar / totVar);
  }

  function svgEl(w, h, label) {
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">`;
  }
  function tip(html) { return `data-tip="${esc(html)}" tabindex="0"`; }
  function widthOf(el) { return Math.max(280, Math.floor(el.getBoundingClientRect().width)); }
  function textOn(bgVar) { return css(bgVar + "-ink") || css("--text"); }

  // ---- Filter ----------------------------------------------------------
  function renderFilter() {
    const opts = [{ v: "all", label: "All sections" }, ...SECTIONS.map(s => ({ v: s, label: `Section ${s}` }))];
    $("#section-filter").innerHTML = opts.map(o =>
      `<button role="radio" aria-checked="${state.section === o.v}" data-v="${o.v}">${o.label}</button>`).join("");
    $("#section-filter").querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      const v = b.dataset.v === "all" ? "all" : Number(b.dataset.v);
      setSection(v);
    }));
    const n = selected().length;
    $("#filter-note").textContent = state.section === "all"
      ? `Showing all ${n} students`
      : `Showing ${n} students in Section ${state.section}. Small samples: treat differences as directional.`;
  }
  function setSection(v) { state.section = v; renderAll(); }

  // ---- KPI tiles -------------------------------------------------------
  function renderKpis(rows, stats) {
    const allFour = rows.filter(r => r.met === DIMS.length).length;
    const low = stats.reduce((a, b) => (b.rate < a.rate ? b : a));
    const alpha = cronbach(rows);
    const tiles = [
      { label: "Students assessed", value: rows.length, detail: state.section === "all" ? `${SECTIONS.length} sections × ${rows.length / SECTIONS.length} students` : `Section ${state.section}` },
      { label: "Met expectations on all four", value: pct(allFour / rows.length), detail: `${allFour} of ${rows.length} students` },
      { label: "Lowest dimension", value: pct(low.rate), detail: `${low.dim.name} (${low.meet} of ${low.n} meeting)` },
      { label: "Internal consistency (α)", value: isNaN(alpha) ? "–" : fmt2(alpha), detail: alpha >= 0.7 ? "Acceptable (0.70 or higher)" : "Below 0.70; small samples vary" },
    ];
    $("#kpis").innerHTML = tiles.map(t =>
      `<div class="kpi"><p class="kpi-label">${t.label}</p><p class="kpi-value">${t.value}</p><p class="kpi-detail">${esc(t.detail)}</p></div>`).join("");
  }

  // ---- Chart 1: % meeting by dimension ---------------------------------
  function renderMeet(stats) {
    const host = $("#chart-meet");
    const W = widthOf(host);
    const narrow = W < 520;
    const left = narrow ? 112 : 168, right = 56, y0 = 22, rowH = 44, barH = 22;
    const H = y0 + stats.length * rowH + 28;
    const x = v => left + v * (W - left - right);
    const sorted = [...stats].sort((a, b) => b.rate - a.rate);
    const low = sorted[sorted.length - 1];
    $("#meet-title").textContent = `${low.dim.name} has the lowest share meeting expectations (${pct(low.rate)})`;

    let s = svgEl(W, H, "Percent meeting expectations by dimension");
    // gridlines + axis labels
    [0, 0.25, 0.5, 0.75, 1].forEach(t => {
      s += `<line x1="${x(t)}" x2="${x(t)}" y1="${y0 - 6}" y2="${H - 24}" stroke="var(--grid)"/>`;
      s += `<text x="${x(t)}" y="${H - 6}" text-anchor="middle" font-size="12" fill="var(--text-3)">${t * 100}%</text>`;
    });
    sorted.forEach((st, i) => {
      const yc = y0 + i * rowH + rowH / 2;
      const isLow = st === low;
      const fill = isLow ? "var(--accent)" : "var(--muted)";
      const w = Math.max(2, x(st.rate) - left);
      s += `<text x="${left - 10}" y="${yc + 4}" text-anchor="end" font-size="${narrow ? 12.5 : 14}" fill="var(--text)" ${isLow ? 'font-weight="700"' : ""}>${esc(narrow ? st.dim.short : st.dim.name)}</text>`;
      s += `<path d="${roundedRight(left, yc - barH / 2, w, barH, 4)}" fill="${fill}"/>`;
      const inside = w > 52;
      s += `<text x="${inside ? x(st.rate) - 8 : x(st.rate) + 8}" y="${yc + 5}" text-anchor="${inside ? "end" : "start"}" font-size="14" font-weight="700" fill="${inside && isLow ? "#fff" : "var(--text)"}">${pct(st.rate)}</text>`;
      s += `<rect class="hit" x="${left}" y="${yc - rowH / 2}" width="${W - left - right + right}" height="${rowH}" fill="transparent" ${tip(`<strong>${st.dim.name}</strong>${st.meet} of ${st.n} meeting (${pct(st.rate)})<br>Mean score ${fmt2(st.mean)} of 4`)}/>`;
    });
    // target line
    s += `<line x1="${x(TARGET)}" x2="${x(TARGET)}" y1="${y0 - 10}" y2="${H - 24}" stroke="var(--target)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    s += `<text x="${x(TARGET)}" y="${y0 - 12}" text-anchor="middle" font-size="12" fill="var(--text-2)">Target ${pct(TARGET)}</text>`;
    s += `</svg>`;
    host.innerHTML = s;
  }
  function roundedRight(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
  }

  // ---- Chart 2: diverging score distribution ---------------------------
  function renderDist(stats) {
    $("#dist-legend").innerHTML = LEVELS.map(l =>
      `<span><i class="swatch" style="background:var(--lvl-${l.v})"></i>${l.v} · ${l.name}</span>`).join("");
    const host = $("#chart-dist");
    const W = widthOf(host);
    const narrow = W < 520;
    const left = narrow ? 92 : 168, right = 12, y0 = 8, rowH = 44, barH = 26, gap = 2;
    const H = y0 + stats.length * rowH + 28;
    // symmetric scale around the 2|3 boundary
    const maxBelow = Math.max(...stats.map(s => (s.counts[0] + s.counts[1]) / s.n));
    const maxMeet = Math.max(...stats.map(s => (s.counts[2] + s.counts[3]) / s.n));
    const span = maxBelow + maxMeet;
    const usable = W - left - right;
    const cx = left + usable * (maxBelow / span);
    const sc = v => v / span * usable;

    let s = svgEl(W, H, "Score distribution by dimension, diverging around the meets-expectations line");
    const ticks = [0.5, 0.25, 0, 0.25, 0.5, 0.75, 1].map((t, i) => (i < 2 ? -t : t)).filter(t => t >= -maxBelow - 1e-9 && t <= maxMeet + 1e-9);
    ticks.forEach(t => {
      const xx = cx + sc(t);
      s += `<line x1="${xx}" x2="${xx}" y1="${y0}" y2="${H - 24}" stroke="var(--grid)"/>`;
      s += `<text x="${xx}" y="${H - 6}" text-anchor="middle" font-size="12" fill="var(--text-3)">${Math.round(Math.abs(t) * 100)}%</text>`;
    });
    stats.forEach((st, i) => {
      const yc = y0 + i * rowH + rowH / 2, yt = yc - barH / 2;
      s += `<text x="${left - 10}" y="${yc + 4}" text-anchor="end" font-size="${narrow ? 12.5 : 14}" fill="var(--text)">${esc(narrow ? st.dim.short : st.dim.name)}</text>`;
      // left side: level 2 next to the line, then level 1
      let xr = cx;
      [2, 1].forEach(v => {
        const c = st.counts[v - 1], w = sc(c / st.n);
        if (!c) return;
        const x0 = xr - w;
        s += seg(x0 + gap / 2, yt, w - gap, v, c, st);
        xr = x0;
      });
      let xl = cx;
      [3, 4].forEach(v => {
        const c = st.counts[v - 1], w = sc(c / st.n);
        if (!c) return;
        s += seg(xl + gap / 2, yt, w - gap, v, c, st);
        xl += w;
      });
    });
    s += `<line x1="${cx}" x2="${cx}" y1="${y0 - 4}" y2="${H - 24}" stroke="var(--axis)" stroke-width="1.5"/>`;
    s += `</svg>`;
    host.innerHTML = s;

    function seg(x, y, w, v, c, st) {
      const w2 = Math.max(1, w);
      const label = w2 >= 26 ? `<text x="${x + w2 / 2}" y="${y + barH / 2 + 4.5}" text-anchor="middle" font-size="12" font-weight="700" fill="${textOn(`--lvl-${v}`)}" pointer-events="none">${c}</text>` : "";
      return `<rect x="${x}" y="${y}" width="${w2}" height="${barH}" rx="3" fill="var(--lvl-${v})" class="hit" ${tip(`<strong>${st.dim.name}</strong>Score ${v} (${LEVELS[v - 1].name}): ${c} of ${st.n} students (${pct(c / st.n)})`)}/>` + label;
    }
  }

  // ---- Chart 3: section × dimension heatmap ----------------------------
  function renderHeat() {
    const host = $("#chart-heat");
    const W = widthOf(host);
    const left = 84, y0 = 34, rowH = 40, gap = 3;
    const cellW = (W - left) / DIMS.length;
    const rowsDef = [...SECTIONS.map(s => ({ key: s, label: `Section ${s}`, rows: STUDENTS.filter(r => r.section === s) })),
                     { key: "all", label: "All", rows: STUDENTS }];
    const H = y0 + rowsDef.length * rowH + 6;
    const lo = hex(css("--seq-lo") || "#cde2fb"), hi = hex(css("--seq-hi") || "#104281");
    const isDark = css("color-scheme") === "dark" || document.documentElement.dataset.theme === "dark" ||
      (!document.documentElement.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const [cLo, cHi] = isDark ? [hex("#1f3350"), hex("#86b6ef")] : [lo, hi];
    const DMIN = 0.4, DMAX = 1.0;

    let s = svgEl(W, H, "Percent meeting expectations by section and dimension");
    DIMS.forEach((d, j) => {
      s += `<text x="${left + j * cellW + cellW / 2}" y="${y0 - 12}" text-anchor="middle" font-size="12" fill="var(--text-2)">${cellW < 90 ? d.tiny : d.short}</text>`;
    });
    rowsDef.forEach((r, i) => {
      const y = y0 + i * rowH + (r.key === "all" ? 4 : 0);
      const sel = state.section === r.key;
      s += `<g class="heat-row" data-section="${r.key}">`;
      s += `<text class="heat-label" x="${left - 10}" y="${y + rowH / 2 + 4}" text-anchor="end" font-size="13" fill="var(--text)" ${sel ? 'font-weight="700"' : ""}>${r.label}</text>`;
      DIMS.forEach((d, j) => {
        const st = dimStats(r.rows, d);
        const t = Math.min(1, Math.max(0, (st.rate - DMIN) / (DMAX - DMIN)));
        const col = mix(cLo, cHi, t);
        const L = luminance(col), ink = (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? "#0b0b0b" : "#ffffff";
        const x = left + j * cellW;
        s += `<rect x="${x + gap / 2}" y="${y + gap / 2}" width="${cellW - gap}" height="${rowH - gap}" rx="4" fill="${col}" class="hit" ${tip(`<strong>${r.label} · ${d.name}</strong>${st.meet} of ${st.n} meeting (${pct(st.rate)})<br>Mean ${fmt2(st.mean)}`)}/>`;
        s += `<text x="${x + cellW / 2}" y="${y + rowH / 2 + 4.5}" text-anchor="middle" font-size="13" font-weight="700" fill="${ink}" pointer-events="none">${pct(st.rate)}</text>`;
      });
      if (sel) s += `<rect x="${left - 1}" y="${y - 1}" width="${W - left + 2}" height="${rowH + 2}" rx="5" fill="none" stroke="var(--text)" stroke-width="2" pointer-events="none"/>`;
      s += `</g>`;
    });
    s += `</svg>`;
    host.innerHTML = s;
    host.querySelectorAll(".heat-row").forEach(g => g.addEventListener("click", () => {
      const v = g.dataset.section === "all" ? "all" : Number(g.dataset.section);
      setSection(state.section === v ? "all" : v);
    }));
  }
  function hex(h) { h = h.replace("#", ""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
  function mix(a, b, t) { return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join(""); }
  function luminance(h) {
    return hex(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
      .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  }

  // ---- Chart 4: dimensions met per student -----------------------------
  function renderCount(rows) {
    const host = $("#chart-count");
    const W = widthOf(host);
    const left = 12, right = 12, y0 = 26, bottom = 40;
    const H = 230;
    const bins = [0, 1, 2, 3, 4].map(k => ({ k, n: rows.filter(r => r.met === k).length }));
    const maxN = Math.max(...bins.map(b => b.n), 1);
    const band = (W - left - right) / bins.length, bw = Math.min(56, band * 0.6);
    const yb = H - bottom, y = n => yb - n / maxN * (yb - y0);

    let s = svgEl(W, H, "Number of students by count of dimensions met");
    s += `<line x1="${left}" x2="${W - right}" y1="${yb}" y2="${yb}" stroke="var(--axis)"/>`;
    bins.forEach((b, i) => {
      const cx = left + band * i + band / 2;
      const isAll = b.k === DIMS.length;
      const h = yb - y(b.n);
      if (b.n) s += `<path d="${roundedTop(cx - bw / 2, y(b.n), bw, h, 4)}" fill="${isAll ? "var(--accent)" : "var(--muted)"}"/>`;
      s += `<text x="${cx}" y="${y(b.n) - 7}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text)">${b.n}</text>`;
      s += `<text x="${cx}" y="${yb + 17}" text-anchor="middle" font-size="13" fill="var(--text)" ${isAll ? 'font-weight="700"' : ""}>${b.k} of 4</text>`;
      s += `<rect class="hit" x="${cx - band / 2}" y="${y0 - 20}" width="${band}" height="${yb - y0 + 20}" fill="transparent" ${tip(`<strong>Met ${b.k} of 4 dimensions</strong>${b.n} of ${rows.length} students (${pct(b.n / rows.length)})`)}/>`;
    });
    s += `<text x="${W / 2}" y="${H - 4}" text-anchor="middle" font-size="12" fill="var(--text-3)">Dimensions scored 3 or higher</text>`;
    s += `</svg>`;
    host.innerHTML = s;
  }
  function roundedTop(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
  }

  // ---- Table -----------------------------------------------------------
  function renderTable(rows) {
    const cols = [
      { key: "id", label: "Student" }, { key: "section", label: "Section", num: true },
      ...DIMS.map(d => ({ key: d.key, label: d.name, num: true, score: true })),
      { key: "met", label: "Dimensions met", num: true },
    ];
    let list = state.onlyBelow ? rows.filter(r => r.met < DIMS.length) : rows.slice();
    list.sort((a, b) => {
      const va = a[state.sortKey], vb = b[state.sortKey];
      return (va < vb ? -1 : va > vb ? 1 : a.id < b.id ? -1 : 1) * state.sortDir;
    });
    const head = `<thead><tr>${cols.map(c => `<th scope="col" data-key="${c.key}" class="${c.num ? "num" : ""}" aria-sort="${state.sortKey === c.key ? (state.sortDir > 0 ? "ascending" : "descending") : "none"}">${c.label}</th>`).join("")}</tr></thead>`;
    const body = `<tbody>${list.map(r => `<tr>${cols.map(c => {
      const v = r[c.key];
      const cls = [c.num ? "num" : "", c.score && v < MEETS ? "below" : ""].join(" ");
      const txt = c.key === "met" ? `${v} of 4` : v;
      return `<td class="${cls}">${txt}</td>`;
    }).join("")}</tr>`).join("")}</tbody>`;
    const t = $("#student-table");
    t.innerHTML = `<caption class="sr-only" style="position:absolute;left:-9999px">Student rubric scores (${list.length} shown)</caption>` + head + body;
    t.querySelectorAll("th").forEach(th => th.addEventListener("click", () => {
      const k = th.dataset.key;
      if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = k === "id" ? 1 : -1; }
      renderTable(selected());
    }));
  }

  // ---- Tooltip ---------------------------------------------------------
  const tt = $("#tooltip");
  function showTip(el, x, y) {
    tt.innerHTML = el.getAttribute("data-tip");
    tt.hidden = false;
    const r = tt.getBoundingClientRect();
    const px = Math.min(window.innerWidth - r.width - 8, x + 14);
    const py = y + r.height + 20 > window.innerHeight ? y - r.height - 12 : y + 14;
    tt.style.left = `${Math.max(8, px)}px`; tt.style.top = `${py}px`;
  }
  document.addEventListener("mousemove", e => {
    const el = e.target.closest && e.target.closest("[data-tip]");
    if (el) showTip(el, e.clientX, e.clientY); else tt.hidden = true;
  });
  document.addEventListener("focusin", e => {
    const el = e.target.closest && e.target.closest("[data-tip]");
    if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.top + r.height / 2); }
  });
  document.addEventListener("focusout", () => { tt.hidden = true; });

  // ---- Render ----------------------------------------------------------
  function renderAll() {
    const rows = selected();
    const stats = DIMS.map(d => dimStats(rows, d));
    renderFilter();
    renderKpis(rows, stats);
    renderMeet(stats);
    renderDist(stats);
    renderHeat();
    renderCount(rows);
    renderTable(rows);
  }
  $("#only-below").addEventListener("change", e => { state.onlyBelow = e.target.checked; renderTable(selected()); });
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(renderAll, 120); });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderAll);
  renderAll();
})();
