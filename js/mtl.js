/* MISSION TIMELINE: horizontal, zoomable, draggable timeline of the missions in the project's collection.
 *
 * Scope (shown in the UI): only the objects in js/data.js are on the axis, i.e. hardware left on the Moon and Mars.
 * It is not a list of every mission in history. One event = one mission (objects with the same `mission`).
 *
 * Dates are never mixed up and never invented. Each row is labelled and appears only if the data holds it:
 *   Launch          = earliest `launch` of the mission's objects
 *   Landing/Impact  = earliest `landing`
 *   Mission end     = `end`, but only when it differs from `landing` (for the Apollo hardware `end` equals the landing
 *                     date and does not describe the end of anything, so it is not shown)
 *   Operating       = shown for objects whose status is "active"
 * The event sits on the axis at its landing date, or at its launch date when no landing date exists (impact sites). */
(function () {
  "use strict";
  var host = null, st = { pl: null, from: null, to: null, type: "", view: "line", ppy: null, sel: null, tok: 0 }, cache = {};
  var drag = null, pinch = null, suppress = false, touches = {};
  function $(s) { return document.querySelector(s); }
  function T(k, v) { return host.T(k, v); }
  function esc(s) { return host.esc(s); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function frac(iso) {   // "YYYY[-MM[-DD]]" -> fractional year
    if (!iso) return null;
    var p = iso.split("-"), y = Number(p[0]), m = Number(p[1]) || 1, d = Number(p[2]) || 1;
    return y + (m - 1) / 12 + (d - 1) / 365;
  }
  function minIso(a) { a = a.filter(Boolean).sort(); return a[0] || null; }
  function maxIso(a) { a = a.filter(Boolean).sort(); return a[a.length - 1] || null; }

  function groups(pl) {
    if (cache[pl]) return cache[pl];
    var map = {}, order = [];
    host.objects().filter(function (o) { return o.planet === pl; }).forEach(function (o) {
      if (!map[o.mission]) { map[o.mission] = { key: pl + ":" + o.mission, objs: [] }; order.push(o.mission); }
      map[o.mission].objs.push(o);
    });
    cache[pl] = order.map(function (k) {
      var g = map[k], objs = g.objs, p = objs[0];
      g.primary = p;
      g.launch = minIso(objs.map(function (o) { return o.launch; }));
      g.landing = minIso(objs.map(function (o) { return o.landing; }));
      g.end = maxIso(objs.filter(function (o) { return o.end && o.end !== o.landing; }).map(function (o) { return o.end; }));
      g.active = objs.some(function (o) { return o.status === "active"; });
      g.impact = objs.every(function (o) { return o.status === "impact"; });
      g.at = g.landing || g.launch;                 // axis position
      g.t = frac(g.at); g.y = g.t === null ? null : Math.floor(g.t);
      g.types = objs.map(function (o) { return o.type; });
      return g;
    }).filter(function (g) { return g.t !== null; })
      .sort(function (a, b) { return a.t - b.t; });
    return cache[pl];
  }
  function typePass(g) { return !st.type || g.types.indexOf(st.type) !== -1; }
  function bounds(pl) {
    var all = groups(pl); if (!all.length) return { min: 1960, max: 2025 };
    var ys = all.map(function (g) { return g.y; }).concat(all.map(function (g) { return g.end ? Math.floor(frac(g.end)) : 0; }));
    return { min: Math.min.apply(null, ys.filter(Boolean)), max: Math.max.apply(null, ys) };
  }
  function visible() {
    var pl = st.pl, b = bounds(pl), from = st.from || b.min, to = st.to || b.max;
    return groups(pl).filter(function (g) { return g.y >= from && g.y <= to && typePass(g); });
  }
  // exported for the map: does this object belong to a mission that passes the filters?
  function pass(o) {
    var from = st.from, to = st.to, y = Math.floor(frac(o.landing || o.launch) || 0);
    if (from && y < from) return false; if (to && y > to) return false;
    return !st.type || o.type === st.type;
  }

  // ------------------------------------------------------------------ controls
  function fillSelect(sel, opts, val) {
    sel.innerHTML = opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("");
  }
  function controls() {
    var pl = st.pl, b = bounds(pl), years = [], y;
    for (y = b.min; y <= b.max; y++) years.push([y, y]);
    fillSelect($("#tld-from"), years, st.from || b.min); fillSelect($("#tld-to"), years, st.to || b.max);
    var types = [], seen = {};
    groups(pl).forEach(function (g) { g.types.forEach(function (t) { if (!seen[t]) { seen[t] = 1; types.push([t, host.typeLabel(t)]); } }); });
    fillSelect($("#tld-type"), [["", T("f.all")]].concat(types), st.type);
    document.querySelectorAll("#tld-planet [data-p]").forEach(function (bt) { bt.setAttribute("aria-pressed", String(bt.dataset.p === pl)); bt.textContent = T("body." + bt.dataset.p); });
    document.querySelectorAll("#tld-view [data-v]").forEach(function (bt) { bt.setAttribute("aria-pressed", String(bt.dataset.v === st.view)); bt.textContent = T("tld.view." + bt.dataset.v); });
  }

  // ------------------------------------------------------------------ track
  var CHIP_W = 138, LANE_H = 50, PAD_L = 56, PAD_R = 120;
  function render() {
    var dock = $("#tldock"); if (dock.hidden) return;
    var pl = host.planet();
    if (st.pl !== pl) { st.pl = pl; st.from = st.to = null; st.type = ""; st.ppy = null; st.sel = null; closePanel(); }
    controls();
    var b = bounds(pl), from = st.from || b.min, to = st.to || b.max;
    if (to < from) { var t = to; to = from; from = t; }
    var vis = visible(), all = groups(pl), scroll = $("#tld-scroll"), w = scroll.clientWidth || 600;
    $("#tld-count").textContent = T("tld.count", { n: vis.length, m: all.length });
    $("#tld-line").hidden = st.view !== "line"; $("#tld-list").hidden = st.view !== "list";
    $("#tld-zoom").hidden = st.view !== "line";
    if (st.view !== "line") return;
    var span = Math.max(1, to - from + 1);
    var ppy = st.ppy || clamp((w - PAD_L - PAD_R) / span, 14, 70);
    st.eff = ppy;
    var X = function (t) { return PAD_L + (t - from) * ppy; };
    var laneEnd = [], items = vis.map(function (g) {
      var x = X(g.t), lane = 0; while (laneEnd[lane] !== undefined && laneEnd[lane] > x - 6) lane++;
      laneEnd[lane] = x + CHIP_W; return { g: g, x: x, lane: lane };
    });
    var lanes = Math.max(1, laneEnd.length), H = lanes * LANE_H + 62, axisY = H - 34, width = X(to + 1) + PAD_R;
    var step = ppy >= 40 ? 1 : ppy >= 20 ? 2 : ppy >= 10 ? 5 : 10, ticks = "", y;
    for (y = Math.ceil(from / step) * step; y <= to + 1; y += step) ticks += '<span class="tld-tick" style="left:' + X(y).toFixed(1) + 'px"><i></i>' + y + "</span>";
    var html = '<div class="tld-axis" style="top:' + axisY + 'px;width:' + width + 'px"></div>' + ticks;
    html += items.map(function (it) {
      var g = it.g, o = g.primary, col = host.statusColor(o), top = axisY - 12 - (it.lane + 1) * LANE_H + 6;
      var date = g.landing ? host.fmtDate(g.landing) : host.fmtDate(g.launch);
      return '<span class="tld-dot" style="left:' + it.x.toFixed(1) + "px;top:" + (axisY - 5) + "px;--c:" + col + '"></span>' +
        '<button class="tle' + (st.sel === g.key ? " on" : "") + '" data-k="' + esc(g.key) + '" style="left:' + it.x.toFixed(1) + "px;top:" + top + "px;--c:" + col + ";--stem:" + (axisY - top - 44) + 'px" title="' + esc(host.mission(o) + " · " + date) + '">' +
        "<b>" + g.y + "</b><span>" + esc(host.mission(o)) + "</span></button>";
    }).join("");
    if (!vis.length) html += '<p class="tld-empty">' + esc(T("tld.empty")) + "</p>";
    var track = $("#tld-track"); track.style.height = H + "px"; track.style.width = width + "px"; track.innerHTML = html;
    track.dataset.from = from;
    var scr = $("#tld-scroll"); if (scr && !st.vsDone) { scr.scrollTop = scr.scrollHeight; st.vsDone = true; }
  }
  function centerOn(key) {
    var el = $('#tld-track [data-k="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]'), sc = $("#tld-scroll");
    if (el) sc.scrollTo({ left: el.offsetLeft - sc.clientWidth / 2 + 60, behavior: host.reduce() ? "auto" : "smooth" });
  }
  function zoom(f, anchorPx) {
    var sc = $("#tld-scroll"), old = st.eff || 20, nu = clamp(old * f, 8, 90);
    if (nu === old) return;
    var a = anchorPx === undefined ? sc.clientWidth / 2 : anchorPx, yearAtAnchor = (sc.scrollLeft + a - PAD_L) / old;
    st.ppy = nu; render();
    sc.scrollLeft = PAD_L + yearAtAnchor * nu - a - PAD_L + PAD_L;
  }

  // ------------------------------------------------------------------ mission panel
  function groupByKey(k) { var r = null; ["moon", "mars"].forEach(function (p) { groups(p).forEach(function (g) { if (g.key === k) r = g; }); }); return r; }
  function closePanel() { var p = $("#mcard"); if (!p) return; p.classList.remove("in"); p.hidden = true; st.tok++; }
  function groupOf(id) { var r = null; ["moon", "mars"].forEach(function (p) { groups(p).forEach(function (g) { g.objs.forEach(function (o) { if (o.id === id) r = g; }); }); }); return r; }
  function panel(g) {
    var p = $("#mcard"), o = g.primary, l = host.loc(o), na = T("k.na");
    var rows = [];
    if (g.launch) rows.push([T("tl.launch"), host.fmtDate(g.launch)]);
    rows.push([T(g.impact ? "tl.impact" : "tl.landing"), g.landing ? host.fmtDate(g.landing) : na]);
    if (g.end && !g.active) rows.push([T("tl.end"), host.fmtDate(g.end)]);   // an end date of one object (e.g. a helicopter) is not the end of an operating mission
    if (g.active) rows.push([T("mc.operating"), T("mc.continues")]);
    var facts = [], seenF = {};
    g.objs.forEach(function (x) { host.loc(x).facts.forEach(function (f) { if (!seenF[f]) { seenF[f] = 1; facts.push(f); } }); });
    var srcs = {}; g.objs.forEach(function (x) { (x.sources || []).forEach(function (s) { srcs[s.u] = s.t; }); });
    var objs = g.objs.map(function (x) {
      var lx = host.loc(x);
      return '<li><div><b>' + esc(lx.name) + '</b><span class="mc-m">' + esc(lx.type) + " · " + esc(T("status." + x.status)) + '</span><span class="mono mc-m">' + esc(host.coords(x)) + "</span></div>" +
        '<button class="ghost" data-oid="' + esc(x.id) + '">' + esc(T("mc.openCard")) + "</button></li>";
    }).join("");
    p.innerHTML = '<button class="ghost close" id="mc-close">' + esc(T("card.close")) + "</button><div class=\"reveal instant\">" +
      '<div><span class="badge" style="--c:' + host.statusColor(o) + '">' + esc(T("status." + (g.active ? "active" : o.status))) + "</span></div>" +
      "<h3>" + esc(host.mission(o)) + "</h3><p class=\"mc-sub\">" + esc(l.agency) + " · " + esc(T("body." + o.planet)) + "</p>" +
      "<h4>" + esc(T("mc.dates")) + '</h4><dl class="kv">' + rows.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + '</dl><p class="note">' + esc(T("mc.datesNote")) + "</p>" +
      "<h4>" + esc(T("mc.ach")) + "</h4><p>" + esc(l.desc) + "</p>" + (facts.length ? '<ul class="facts">' + facts.slice(0, 5).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>" : "") +
      "<h4>" + esc(T("mc.left")) + '</h4><ul class="mc-objs">' + objs + "</ul>" +
      "<h4>" + esc(T("card.photos")) + '</h4><div class="photos" id="mc-photos"><p class="note">' + esc(T("photos.loading")) + "</p></div>" +
      '<div class="cactions"><button class="cta small" id="mc-2d">' + esc(T("mc.show2d")) + '</button><button class="cta small alt" id="mc-3d">' + esc(T("mc.show3d")) + "</button>" +
      (host.hasBA(o.id) ? '<button class="cta small alt" id="mc-ba">' + esc(T("ba.open")) + "</button>" : "") + (host.hasJourney && host.hasJourney() ? '<button class="cta small alt" id="mc-mj">' + esc(T("mj.open")) + "</button>" : "") + (host.hasArch && host.hasArch() ? '<button class="cta small alt" id="mc-ar">' + esc(T("ar.open")) + "</button>" : "") + "</div>" +
      '<div class="links"><h4>' + esc(T("card.sources")) + '</h4><ul class="facts">' + Object.keys(srcs).map(function (u) { return '<li><a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(srcs[u]) + "</a></li>"; }).join("") + "</ul></div></div>";
    p.hidden = false; p.scrollTop = 0; void p.offsetWidth; p.classList.add("in");
    $("#mc-close").addEventListener("click", closePanel);
    $("#mc-2d").addEventListener("click", function () { host.show(o, "2d"); });
    $("#mc-3d").addEventListener("click", function () { host.show(o, "3d"); });
    if ($("#mc-ba")) $("#mc-ba").addEventListener("click", function () { host.openBA(o); });
    if ($("#mc-mj")) $("#mc-mj").addEventListener("click", function () { host.openJourney(o); });
    if ($("#mc-ar")) $("#mc-ar").addEventListener("click", function () { host.openArch(o); });
    var tok = ++st.tok;
    host.photos(o.imageQuery, function (items) {
      var box = $("#mc-photos"); if (tok !== st.tok || !box) return;
      st.photos = items;
      box.innerHTML = items.length ? items.map(function (it, i) { return '<figure><button class="ph-btn" data-i="' + i + '"><img loading="lazy" src="' + esc(it.thumb) + '" alt="' + esc(it.title) + '"></button><figcaption>' + esc(it.title) + "</figcaption></figure>"; }).join("") +
        '<p class="note" style="grid-column:1/-1">' + esc(T("mc.photoNote")) + "</p>" : '<p class="note">' + esc(T("mc.noPhotos")) + "</p>";
    }, function () { var box = $("#mc-photos"); if (tok === st.tok && box) box.innerHTML = '<p class="note">' + esc(T("mc.noPhotos")) + "</p>"; });
  }
  function choose(key, noFly) {
    var g = groupByKey(key); if (!g) return;
    st.sel = key; panel(g); render(); centerOn(key);
    if (!noFly) host.fly(g.primary);
  }

  // ------------------------------------------------------------------ input
  function wire() {
    var sc = $("#tld-scroll");
    $("#tld-planet").addEventListener("click", function (e) { var b = e.target.closest("[data-p]"); if (b && b.dataset.p !== st.pl) host.setPlanet(b.dataset.p); });
    $("#tld-view").addEventListener("click", function (e) { var b = e.target.closest("[data-v]"); if (b) { st.view = b.dataset.v; render(); } });
    $("#tld-from").addEventListener("change", function (e) { st.from = +e.target.value; if (st.to && st.to < st.from) st.to = st.from; st.sel = null; render(); host.refresh(); });
    $("#tld-to").addEventListener("change", function (e) { st.to = +e.target.value; if (st.from && st.from > st.to) st.from = st.to; st.sel = null; render(); host.refresh(); });
    $("#tld-type").addEventListener("change", function (e) { st.type = e.target.value; st.sel = null; render(); host.refresh(); });
    $("#tld-zin").addEventListener("click", function () { zoom(1.3); });
    $("#tld-zout").addEventListener("click", function () { zoom(1 / 1.3); });
    $("#tld-track").addEventListener("click", function (e) { if (suppress) { suppress = false; return; } var b = e.target.closest("[data-k]"); if (b) choose(b.dataset.k); });
    $("#mcard").addEventListener("click", function (e) {
      var ob = e.target.closest("[data-oid]"); if (ob) { var id = ob.dataset.oid; closePanel(); host.openObject(id); return; }
      var ph = e.target.closest("[data-i]"); if (ph && st.photos) host.lightbox(st.photos, +ph.dataset.i);
    });
    // mouse drag to pan (touch uses native scrolling; two fingers pinch-zoom)
    sc.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") {
        touches[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(touches); if (ids.length === 2) { pinch = { d: Math.hypot(touches[ids[0]].x - touches[ids[1]].x, touches[ids[0]].y - touches[ids[1]].y), ppy: st.eff }; }
        return;
      }
      if (e.button !== 0) return;
      drag = { x: e.clientX, left: sc.scrollLeft, moved: false, id: e.pointerId };
    });
    sc.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") {
        if (!touches[e.pointerId]) return; touches[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(touches);
        if (ids.length === 2 && pinch && pinch.d > 10) {
          var d = Math.hypot(touches[ids[0]].x - touches[ids[1]].x, touches[ids[0]].y - touches[ids[1]].y);
          var target = clamp(pinch.ppy * d / pinch.d, 8, 90); if (Math.abs(target - st.eff) > 0.4) zoom(target / st.eff);
        }
        return;
      }
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; sc.classList.add("grabbing"); try { sc.setPointerCapture(e.pointerId); } catch (x) {} }
      if (drag.moved) sc.scrollLeft = drag.left - dx;
    });
    function up(e) {
      if (e.pointerType === "touch") { delete touches[e.pointerId]; if (Object.keys(touches).length < 2) pinch = null; return; }
      if (drag && drag.moved) suppress = true;   // the click that follows a drag must not select an event
      drag = null; sc.classList.remove("grabbing");
      setTimeout(function () { suppress = false; }, 0);
    }
    sc.addEventListener("pointerup", up); sc.addEventListener("pointercancel", up);
    sc.addEventListener("wheel", function (e) {
      if (e.ctrlKey) { e.preventDefault(); var r = sc.getBoundingClientRect(); zoom(Math.exp(-e.deltaY * 0.01), e.clientX - r.left); return; }
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && (e.shiftKey || sc.scrollHeight <= sc.clientHeight + 1)) { e.preventDefault(); sc.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 16 : 1); }
    }, { passive: false });
    sc.addEventListener("keydown", function (e) {
      var chips = [].slice.call(document.querySelectorAll("#tld-track .tle")), i = chips.indexOf(document.activeElement);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if (!chips.length) return; e.preventDefault();
        var n = i < 0 ? 0 : clamp(i + (e.key === "ArrowRight" ? 1 : -1), 0, chips.length - 1); chips[n].focus();
        chips[n].scrollIntoView({ inline: "center", block: "nearest" });
      } else if (e.key === "+" || e.key === "=") zoom(1.3); else if (e.key === "-") zoom(1 / 1.3);
    });
    if (window.ResizeObserver) new ResizeObserver(function () { if (!$("#tldock").hidden && !st.ppy) render(); }).observe(sc);
  }

  window.MTL = {
    pickMission: function (key) { choose(key); },
    init: function (h) { host = h; wire(); },
    show: function () { $("#tldock").hidden = false; render(); },
    hide: function () { $("#tldock").hidden = true; closePanel(); },
    render: function () { cache = {}; if (!$("#tldock").hidden) { render(); var g = st.sel && groupByKey(st.sel); if (g && !$("#mcard").hidden) panel(g); } },
    pass: pass, closePanel: closePanel,
    // the map selected an object (marker click, list): highlight its mission on the axis
    syncSelected: function (id) { var g = groupOf(id); if (g && !$("#tldock").hidden) { st.sel = g.key; render(); centerOn(g.key); } },
    state: function () { return { pl: st.pl, from: st.from, to: st.to, type: st.type, view: st.view, ppy: st.eff, sel: st.sel, shown: visible().map(function (g) { return g.key; }) }; },
    _groups: groups
  };
})();
