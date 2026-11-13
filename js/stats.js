/* STATISTICS DASHBOARD: every figure is computed at render time from window.OBJECTS (and the equipment-condition records).
 * No preset numbers: add an object to data.js and it appears here after the next render.
 * Definitions are stated in the UI next to the figures (landers / rovers by the `type` field, "science platforms" by type,
 * "confirmed status" = curated condition record with a source and a state other than Unknown).
 * Public API: window.STATS = { init, show, render, state, pick, reset, metrics }. */
(function () {
  "use strict";
  var H = null, F = { planet: "", from: "", to: "" }, drill = null;

  function $(s) { return document.querySelector(s); }
  function T(k, v) { return H.T(k, v); }
  function esc(s) { return H.esc(s); }
  function num(n) { try { return new Intl.NumberFormat(window.I18N && I18N.locale ? I18N.locale() : "en").format(n); } catch (e) { return String(n); } }
  function yr(s) { return s ? +String(s).slice(0, 4) : null; }
  function oyear(o) { return yr(o.landing) || yr(o.launch); }
  function condState(o) { return window.COND ? COND.stateOf(o) : "unknown"; }
  function mkey(o) { return o.planet + ":" + o.mission; }

  function allYears() {
    return H.objects().map(oyear).filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();
  }
  function filtered() {
    return H.objects().filter(function (o) {
      if (F.planet && o.planet !== F.planet) return false;
      var y = oyear(o);
      if (F.from && (!y || y < +F.from)) return false;
      if (F.to && (!y || y > +F.to)) return false;
      return true;
    });
  }
  function isLander(o) { return /lander/i.test(o.type); }
  function isRover(o) { return /rover/i.test(o.type); }
  function isPlatform(o) { return /science platform/i.test(o.type); }
  function confirmed(o) { return !!(o.condition && o.condition.curated && o.condition.sources && o.condition.sources.length && condState(o) !== "unknown"); }

  function groupsOf(os) {
    var map = {}, order = [];
    os.forEach(function (o) { var k = mkey(o); if (!map[k]) { map[k] = { key: k, planet: o.planet, objs: [] }; order.push(k); } map[k].objs.push(o); });
    return order.map(function (k) {
      var g = map[k], l = g.objs.map(function (o) { return o.launch; }).filter(Boolean).sort()[0] || null, ld = g.objs.map(function (o) { return o.landing; }).filter(Boolean).sort()[0] || null;
      g.launch = l; g.landing = ld; g.year = yr(l) || yr(ld);
      var ends = g.objs.map(function (o) { return o.end; }).filter(Boolean).sort(); g.end = ends.length ? ends[ends.length - 1] : null;
      g.active = g.objs.some(function (o) { return o.status === "active"; });
      g.name = H.loc(g.objs[0]).mission;
      return g;
    });
  }

  function metrics() {
    var os = filtered(), gs = groupsOf(os);
    return {
      objects: os, groups: gs, total: os.length,
      moon: os.filter(function (o) { return o.planet === "moon"; }).length, mars: os.filter(function (o) { return o.planet === "mars"; }).length,
      missions: gs.length, landers: os.filter(isLander).length, rovers: os.filter(isRover).length, instr: os.filter(isPlatform).length,
      confirmed: os.filter(confirmed).length, unknown: os.filter(function (o) { return condState(o) === "unknown"; }).length
    };
  }

  // ---- drill-down
  function select(key, M) {
    var os = M.objects;
    var p = key.split(":"), k = p[0], v = p.slice(1).join(":");
    if (k === "total") return os;
    if (k === "planet") return os.filter(function (o) { return o.planet === v; });
    if (k === "missions") return os;
    if (k === "landers") return os.filter(isLander);
    if (k === "rovers") return os.filter(isRover);
    if (k === "instr") return os.filter(isPlatform);
    if (k === "confirmed") return os.filter(confirmed);
    if (k === "unknown") return os.filter(function (o) { return condState(o) === "unknown"; });
    if (k === "type") return os.filter(function (o) { return o.type === v; });
    if (k === "cond") return os.filter(function (o) { return condState(o) === v; });
    if (k === "legacy") return os.filter(function (o) { return o.status === v; });
    if (k === "year") { var keys = M.groups.filter(function (g) { return String(g.year) === v; }).map(function (g) { return g.key; }); return os.filter(function (o) { return keys.indexOf(mkey(o)) >= 0; }); }
    if (k === "mission") return os.filter(function (o) { return mkey(o) === v; });
    return [];
  }
  function whatLabel(key) {
    var p = key.split(":"), k = p[0], v = p.slice(1).join(":");
    if (k === "planet") return T("st.w.planet", { p: T("body." + v) });
    if (k === "type") return T("st.w.type", { t: H.typeLabel(v) });
    if (k === "cond") return T("st.w.cond", { c: T("cond.s." + v) });
    if (k === "legacy") return T("st.w.legacy", { c: T("status." + v) });
    if (k === "year") return T("st.w.year", { y: v });
    if (k === "mission") { var g = groupsOf(H.objects()).filter(function (x) { return x.key === v; })[0]; return T("st.w.mission", { m: g ? g.name : v }); }
    return T("st.w." + k);
  }
  function btn(key, inner, cls, title) {
    return '<button type="button" class="' + (cls || "") + (drill === key ? " on" : "") + '" data-pick="' + esc(key) + '" aria-pressed="' + (drill === key) + '"' + (title ? ' title="' + esc(title) + '"' : "") + ">" + inner + "</button>";
  }

  // ---- charts
  var PCOL = { moon: "var(--moon)", mars: "var(--mars)" };
  function donut(M) {
    var parts = [{ k: "moon", n: M.moon }, { k: "mars", n: M.mars }], tot = M.moon + M.mars, a0 = -Math.PI / 2, R = 60, r = 36, cx = 80, cy = 80, svg = "";
    if (!tot) return '<p class="note">' + esc(T("st.none")) + "</p>";
    parts.forEach(function (p) {
      if (!p.n) return;
      var a1 = a0 + 2 * Math.PI * p.n / tot, big = a1 - a0 > Math.PI ? 1 : 0, full = p.n === tot;
      var P = function (a, rr) { return (cx + rr * Math.cos(a)).toFixed(2) + " " + (cy + rr * Math.sin(a)).toFixed(2); };
      var d = full ? "M" + (cx - R) + " " + cy + "a" + R + " " + R + " 0 1 0 " + 2 * R + " 0a" + R + " " + R + " 0 1 0 " + (-2 * R) + " 0M" + (cx - r) + " " + cy + "a" + r + " " + r + " 0 1 1 " + 2 * r + " 0a" + r + " " + r + " 0 1 1 " + (-2 * r) + " 0"
        : "M" + P(a0, R) + "A" + R + " " + R + " 0 " + big + " 1 " + P(a1, R) + "L" + P(a1, r) + "A" + r + " " + r + " 0 " + big + " 0 " + P(a0, r) + "Z";
      svg += '<path class="st-seg' + (drill === "planet:" + p.k ? " on" : "") + '" fill="' + PCOL[p.k] + '" fill-rule="evenodd" d="' + d + '" data-pick="planet:' + p.k + '" tabindex="0" role="button" aria-label="' + esc(T("body." + p.k) + ": " + p.n) + '"><title>' + esc(T("body." + p.k) + ": " + p.n) + "</title></path>";
      a0 = a1;
    });
    return '<div class="st-donut"><svg viewBox="0 0 160 160" role="img" aria-label="' + esc(T("st.c.split")) + '">' + svg + '<text x="80" y="86" text-anchor="middle" class="st-big">' + tot + "</text></svg><ul>" +
      parts.map(function (p) { return "<li>" + btn("planet:" + p.k, '<i style="background:' + PCOL[p.k] + '"></i>' + esc(T("body." + p.k)) + " <b>" + p.n + "</b> (" + (tot ? Math.round(100 * p.n / tot) : 0) + "%)", "st-lg") + "</li>"; }).join("") + "</ul></div>";
  }
  function hbars(rows, keyFn, colorFn) {
    rows = rows.filter(function (r) { return r.n > 0; });
    if (!rows.length) return '<p class="note">' + esc(T("st.none")) + "</p>";
    var max = Math.max.apply(null, rows.map(function (r) { return r.n; }));
    return '<ul class="st-hb">' + rows.map(function (r) {
      return "<li>" + btn(keyFn(r), '<span class="st-hl">' + (r.glyph ? "<b aria-hidden=\"true\">" + r.glyph + "</b> " : "") + esc(r.label) + '</span><span class="st-ht"><i style="width:' + (100 * r.n / max).toFixed(1) + "%;background:" + (colorFn ? colorFn(r) : "var(--accent)") + '"></i></span><span class="st-hv">' + r.n + "</span>", "st-row") + "</li>";
    }).join("") + "</ul>";
  }
  function yearsChart(M) {
    var by = {};
    M.groups.forEach(function (g) { if (!g.year) return; var o = by[g.year] = by[g.year] || { moon: 0, mars: 0 }; o[g.planet]++; });
    var ys = Object.keys(by).map(Number).sort(function (a, b) { return a - b; });
    if (!ys.length) return '<p class="note">' + esc(T("st.none")) + "</p>";
    var max = Math.max.apply(null, ys.map(function (y) { return by[y].moon + by[y].mars; })), bw = 30, H0 = 120, W = Math.max(300, ys.length * bw + 20);
    var s = ys.map(function (y, i) {
      var x = 10 + i * bw, m = by[y].moon, r = by[y].mars, hm = H0 * m / (max || 1), hr = H0 * r / (max || 1), tot = m + r;
      return '<g class="st-col' + (drill === "year:" + y ? " on" : "") + '" data-pick="year:' + y + '" tabindex="0" role="button" aria-label="' + y + ": " + tot + '"><title>' + y + ": " + tot + "</title><rect x=\"" + x + "\" y=\"0\" width=\"" + (bw - 4) + "\" height=\"" + (H0 + 40) + '" fill="transparent"/>' +
        (m ? '<rect x="' + x + '" y="' + (H0 - hm - hr + 10).toFixed(1) + '" width="' + (bw - 6) + '" height="' + hm.toFixed(1) + '" fill="' + PCOL.moon + '"/>' : "") +
        (r ? '<rect x="' + x + '" y="' + (H0 - hr + 10).toFixed(1) + '" width="' + (bw - 6) + '" height="' + hr.toFixed(1) + '" fill="' + PCOL.mars + '"/>' : "") +
        '<text class="st-tv" x="' + (x + (bw - 6) / 2) + '" y="' + (H0 - hm - hr + 6).toFixed(1) + '" text-anchor="middle">' + tot + "</text>" +
        '<text class="st-ty" transform="translate(' + (x + (bw - 6) / 2 + 3) + " " + (H0 + 16) + ') rotate(-60)" text-anchor="end">' + y + "</text></g>";
    }).join("");
    return '<div class="st-scroll"><svg viewBox="0 0 ' + W + " " + (H0 + 44) + '" style="min-width:' + Math.min(W, 640) + 'px" role="img" aria-label="' + esc(T("st.c.years")) + '">' + s + "</svg></div>" +
      '<ul class="st-leg"><li><i style="background:' + PCOL.moon + '"></i>' + esc(T("body.moon")) + '</li><li><i style="background:' + PCOL.mars + '"></i>' + esc(T("body.mars")) + "</li></ul>";
  }
  function timeline(M) {
    var gs = M.groups.filter(function (g) { return g.launch || g.landing; }).sort(function (a, b) { return (a.launch || a.landing).localeCompare(b.launch || b.landing); });
    if (!gs.length) return '<p class="note">' + esc(T("st.none")) + "</p>";
    function t(s) { var p = String(s).split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
    function yf(ms) { return 1970 + ms / (365.25 * 864e5); }
    var vals = []; gs.forEach(function (g) { [g.launch, g.landing, g.end].forEach(function (d) { if (d) vals.push(yf(t(d))); }); });
    var lo = Math.floor(Math.min.apply(null, vals) / 5) * 5, hi = Math.ceil(Math.max.apply(null, vals) / 5) * 5 + (gs.some(function (g) { return g.active; }) ? 0 : 0);
    var W = 720, L = 190, h = 24, X = function (y) { return L + (W - L - 20) * (y - lo) / ((hi - lo) || 1); };
    var rows = gs.map(function (g, i) {
      var y = i * h + 4, a = g.launch ? yf(t(g.launch)) : null, l = g.landing ? yf(t(g.landing)) : null, e = g.end ? yf(t(g.end)) : null, out = "";
      var cx = (a != null ? X(a) : X(l));
      out += '<text class="st-tl-n" x="' + (L - 6) + '" y="' + (y + 12) + '" text-anchor="end">' + esc(g.name) + "</text>";
      if (l != null && (e != null || g.active)) out += '<rect class="' + (e == null ? "st-ong" : "") + '" x="' + X(l).toFixed(1) + '" y="' + (y + 5) + '" width="' + Math.max(2, (e != null ? X(e) : X(hi)) - X(l)).toFixed(1) + '" height="7" rx="2" fill="' + PCOL[g.planet] + '" opacity="' + (e == null ? ".45" : "1") + '"/>';
      if (a != null) out += '<circle cx="' + X(a).toFixed(1) + '" cy="' + (y + 8.5) + '" r="3" fill="var(--text)"/>';
      if (l != null) out += '<rect x="' + (X(l) - 3).toFixed(1) + '" y="' + (y + 5.5) + '" width="6" height="6" transform="rotate(45 ' + X(l).toFixed(1) + " " + (y + 8.5) + ')" fill="' + PCOL[g.planet] + '" stroke="var(--bg)"/>';
      return '<g class="st-tl' + (drill === "mission:" + g.key ? " on" : "") + '" data-pick="mission:' + esc(g.key) + '" tabindex="0" role="button" aria-label="' + esc(g.name) + '"><rect x="0" y="' + y + '" width="' + W + '" height="' + (h - 2) + '" fill="transparent"/>' + out + "</g>";
    }).join("");
    var ticks = ""; for (var y0 = lo; y0 <= hi; y0 += 5) ticks += '<line x1="' + X(y0) + '" x2="' + X(y0) + '" y1="0" y2="' + gs.length * h + '" class="st-grid"/><text class="st-ty" x="' + X(y0) + '" y="' + (gs.length * h + 14) + '" text-anchor="middle">' + y0 + "</text>";
    return '<div class="st-scroll"><svg viewBox="0 0 ' + W + " " + (gs.length * h + 22) + '" style="min-width:560px" role="img" aria-label="' + esc(T("st.c.tl")) + '">' + ticks + rows + "</svg></div><p class=\"note\">" + esc(T("st.tl.note")) + "</p>";
  }

  // ---- render
  function renderFilters() {
    var ys = allYears();
    function opts(cur) { return '<option value="">' + esc(T("st.f.any")) + "</option>" + ys.map(function (y) { return '<option value="' + y + '"' + (String(cur) === String(y) ? " selected" : "") + ">" + y + "</option>"; }).join(""); }
    $("#st-from").innerHTML = opts(F.from); $("#st-to").innerHTML = opts(F.to);
    $("#st-planet").innerHTML = [["", T("st.f.all")], ["moon", T("body.moon")], ["mars", T("body.mars")]].map(function (x) { return '<option value="' + x[0] + '"' + (F.planet === x[0] ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join("");
  }
  function kpi(key, label, n, hint) {
    return btn(key, '<span class="st-kn">' + num(n) + '</span><span class="st-kl">' + esc(label) + "</span>", "st-kpi", hint);
  }
  function renderList(M) {
    var box = $("#st-list");
    if (!drill) { box.innerHTML = '<p class="note">' + esc(T("st.pickHint")) + "</p>"; return; }
    var list = select(drill, M).slice().sort(function (a, b) { return (oyear(a) || 0) - (oyear(b) || 0); });
    var planets = list.map(function (o) { return o.planet; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    box.innerHTML = '<div class="st-lh"><h3>' + esc(T("st.list")) + '</h3><span class="note">' + esc(T("st.listFor", { w: whatLabel(drill) })) + " · " + esc(T("st.count", { n: list.length })) + '</span><button type="button" class="cta small alt" data-clear="1">' + esc(T("st.clear")) + "</button>" +
      (planets.length === 1 ? '<a class="cta small alt" href="#' + planets[0] + '">' + esc(T("st.open")) + "</a>" : "") + "</div>" +
      (list.length ? '<ul class="st-ol">' + list.map(function (o) {
        var l = H.loc(o), k = condState(o), c = window.COND ? ' <span class="cchip k-' + k + '" style="--k:' + COND.color(o) + '"><b aria-hidden="true">' + COND.glyph(o) + "</b>" + esc(T("cond.s." + k)) + "</span>" : "";
        return '<li class="b-' + o.planet + '"><div><b>' + esc(l.name) + "</b><span class=\"note\">" + esc(l.mission) + " · " + esc(T("body." + o.planet)) + " · " + (oyear(o) || "?") + " · " + esc(l.type) + "</span>" + c + '</div><div class="st-ob"><button type="button" class="cta small alt" data-go="' + esc(o.id) + '">' + esc(T("st.show")) + '</button><button type="button" class="cta small alt" data-go3="' + esc(o.id) + '">' + esc(T("st.show3d")) + "</button></div></li>";
      }).join("") + "</ul>" : '<p class="note">' + esc(T("st.none")) + "</p>");
  }
  function render() {
    if (!H || !$("#st-kpis")) return;
    renderFilters();
    var M = metrics();
    $("#st-kpis").innerHTML = kpi("total", T("st.k.total"), M.total) + kpi("planet:moon", T("st.k.moon"), M.moon) + kpi("planet:mars", T("st.k.mars"), M.mars) + kpi("missions", T("st.k.missions"), M.missions) +
      kpi("landers", T("st.k.landers"), M.landers, T("st.kh.landers")) + kpi("rovers", T("st.k.rovers"), M.rovers, T("st.kh.rovers")) + kpi("instr", T("st.k.instr"), M.instr, T("st.kh.instr")) +
      kpi("confirmed", T("st.k.confirmed"), M.confirmed, T("st.kh.confirmed")) + kpi("unknown", T("st.k.unknown"), M.unknown, T("st.kh.unknown"));
    $("#st-defs").innerHTML = ["landers", "instr", "confirmed", "unknown"].map(function (k) { return "<li>" + esc(T("st.k." + k)) + ": " + esc(T("st.kh." + k)) + "</li>"; }).join("");
    $("#st-split").innerHTML = donut(M);
    $("#st-years").innerHTML = yearsChart(M);
    var types = {}; M.objects.forEach(function (o) { types[o.type] = (types[o.type] || 0) + 1; });
    $("#st-cat").innerHTML = hbars(Object.keys(types).map(function (t) { return { t: t, label: H.typeLabel(t), n: types[t] }; }).sort(function (a, b) { return b.n - a.n; }), function (r) { return "type:" + r.t; });
    var cs = window.COND ? COND.ORDER : [];
    $("#st-cond").innerHTML = hbars(cs.map(function (k) { return { k: k, label: T("cond.s." + k), glyph: COND.STATES[k].glyph, n: M.objects.filter(function (o) { return condState(o) === k; }).length }; }), function (r) { return "cond:" + r.k; }, function (r) { return COND.STATES[r.k].color; });
    var st = {}; M.objects.forEach(function (o) { st[o.status] = (st[o.status] || 0) + 1; });
    $("#st-legacy").innerHTML = hbars(Object.keys(st).map(function (k) { return { k: k, label: T("status." + k), n: st[k] }; }).sort(function (a, b) { return b.n - a.n; }), function (r) { return "legacy:" + r.k; });
    $("#st-tl").innerHTML = timeline(M);
    renderList(M);
  }
  function pick(key) { drill = drill === key ? null : key; render(); var l = $("#st-list"); if (drill && l && l.scrollIntoView) l.scrollIntoView({ behavior: H.reduce() ? "auto" : "smooth", block: "nearest" }); }
  function reset() { F = { planet: "", from: "", to: "" }; drill = null; render(); }
  function init(host) {
    H = host; var root = $("#view-stats");
    root.addEventListener("change", function (e) {
      var id = e.target.id;
      if (id === "st-planet") F.planet = e.target.value; else if (id === "st-from") F.from = e.target.value; else if (id === "st-to") F.to = e.target.value; else return;
      render();
    });
    root.addEventListener("click", function (e) {
      var p = e.target.closest("[data-pick]"), g = e.target.closest("[data-go]"), g3 = e.target.closest("[data-go3]");
      if (p) pick(p.getAttribute("data-pick")); else if (g) H.go(g.dataset.go, false); else if (g3) H.go(g3.dataset.go3, true);
      else if (e.target.closest("[data-clear]")) { drill = null; render(); } else if (e.target.closest("#st-reset")) reset();
    });
    root.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-pick]") && e.target.tagName !== "BUTTON") { e.preventDefault(); pick(e.target.getAttribute("data-pick")); }
    });
  }
  window.STATS = { init: init, show: render, render: render, pick: pick, reset: reset, metrics: metrics, state: function () { return { filters: F, drill: drill }; } };
})();
