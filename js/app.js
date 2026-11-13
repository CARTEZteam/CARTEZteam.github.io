/* ABANDONED BUT NOT FORGOTTEN: application logic.
 * Stack: plain HTML/CSS/JS + Leaflet (equirectangular CRS) + own WebGL 3D globe (js/globe.js)
 *        + NASA Trek WMTS tiles + NASA Image and Video Library API + i18n (js/i18n.js, js/data.i18n.js).
 * No build step: open index.html through any static web server. */
(function () {
  "use strict";

  var OBJ = window.OBJECTS, ST = window.STATUS, I = window.I18N, Globe = window.Globe;
  var T = function (k, v) { return I.t(k, v); };
  var byId = {};
  OBJ.forEach(function (o) { byId[o.id] = o; });

  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ------------------------------------------------------------------ localisation helpers
  function num(x, d) {
    var s = Number(x).toFixed(d);
    return I.lang === "en" ? s : s.replace(".", ",");
  }
  var KK_MONTHS = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
  function fmtDate(iso) {
    if (!iso) return "";
    var p = iso.split("-"), y = Number(p[0]), m = (Number(p[1]) || 1) - 1, d = Number(p[2]) || 1;
    // Kazakh month names are written out here: some browsers ship without Kazakh calendar data.
    if (I.lang === "kk") {
      if (p.length === 3) return d + " " + KK_MONTHS[m] + " " + y + " ж.";
      if (p.length === 2) return KK_MONTHS[m] + " " + y + " ж.";
      return y + " ж.";
    }
    var month = I.lang === "en" ? "short" : "long";
    try {
      var utc = Date.UTC(y, m, d, 12);
      if (p.length === 3) return new Intl.DateTimeFormat(I.locale(), { day: "numeric", month: month, year: "numeric", timeZone: "UTC" }).format(utc);
      if (p.length === 2) return new Intl.DateTimeFormat(I.locale(), { month: month, year: "numeric", timeZone: "UTC" }).format(utc);
    } catch (e) { /* fall through to a plain year */ }
    return String(y);
  }
  function toMs(iso) {
    var p = iso.split("-");
    return Date.UTC(Number(p[0]), (Number(p[1]) || 1) - 1, Number(p[2]) || 1);
  }
  function yearOf(o) { return Number((o.landing || o.launch || "0000").slice(0, 4)); }
  function eraOf(o) { return Math.floor(yearOf(o) / 10) * 10 + "s"; }
  function eraLabel(e) {
    var y = e.replace("s", "");
    return I.lang === "ru" ? y + "-е" : I.lang === "kk" ? y + " жж." : e;
  }
  function fmtLat(v, d) { return num(Math.abs(v), d) + "° " + T(v >= 0 ? "dir.N" : "dir.S"); }
  function fmtLon(v, d) { return num(Math.abs(v), d) + "° " + T(v >= 0 ? "dir.E" : "dir.W"); }
  function fmtCoord(o) { return fmtLat(o.lat, 4) + ", " + fmtLon(o.lon, 4); }
  function isDone(o) { return o.status !== "active"; }

  // Localised view of an object record: texts come from data.i18n.js, everything else from data.js.
  function loc(o) {
    var pack = (window.OBJ_I18N || {})[I.lang], it = (pack && pack.items[o.id]) || {}, terms = (pack && pack.terms) || {}, t = o.timeline || {};
    function term(f, v) { return (terms[f] && terms[f][v]) || v; }
    return {
      name: it.name || o.name, mission: term("mission", o.mission), site: it.site || o.site,
      agency: term("agency", o.agency), type: term("type", o.type),
      desc: it.desc || o.desc, why: it.why || o.why, note: it.note || o.accuracy.note,
      facts: it.facts || o.facts || [], ops: it.ops || t.ops, legacy: it.legacy || t.legacy
    };
  }
  function typeLabel(type) {
    var pack = (window.OBJ_I18N || {})[I.lang];
    return (pack && pack.terms.type && pack.terms.type[type]) || type;
  }

  // ------------------------------------------------------------------ basemaps
  var TREK = "https://trek.nasa.gov/tiles/";
  var BODIES = {
    moon: {
      center: [8, 0], zoom: 1, nativeZoom: 6, radiusKm: 1737.4, rim: [0.45, 0.55, 0.8],
      layers: [TREK + "Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg"]
    },
    mars: {
      center: [10, 0], zoom: 1, nativeZoom: 6, radiusKm: 3389.5, rim: [0.9, 0.45, 0.25],
      layers: [
        TREK + "Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg",
        TREK + "Mars/EQ/Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg"
      ]
    }
  };

  var maps = {}, markerLayers = {}, gridLayers = {}, pulses = {}, notes = {}, attrs = {};
  var route = null, planet = "moon", selectedId = null, flightToken = 0;
  var compare = [];
  var mode = "2d", gridOn = true, globeReady = false, globeTex = null, lastSurface = null;

  // ------------------------------------------------------------------ hero planets (procedural, stylized)
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6d2b79f5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function drawPlanet(cv, base, seed, kind) {
    if (!cv || !cv.getContext) return;
    var c = cv.getContext("2d"), w = cv.width, r = rng(seed), i;
    c.save();
    c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2); c.clip();
    c.fillStyle = "rgb(" + base.join(",") + ")"; c.fillRect(0, 0, w, w);
    for (i = 0; i < 220; i++) {
      var x = r() * w, y = r() * w, rad = 6 + r() * (kind === "moon" ? 60 : 90);
      var dark = r() > 0.5;
      var g = c.createRadialGradient(x, y, 0, x, y, rad);
      var a = 0.05 + r() * 0.09;
      g.addColorStop(0, dark ? "rgba(0,0,0," + a + ")" : "rgba(255,255,255," + a * 0.8 + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    if (kind === "moon") {
      for (i = 0; i < 70; i++) {
        var cx = r() * w, cy = r() * w, cr = 4 + Math.pow(r(), 2.4) * 46;
        c.beginPath(); c.arc(cx, cy, cr, 0, Math.PI * 2);
        c.fillStyle = "rgba(0,0,0,0.18)"; c.fill();
        c.lineWidth = Math.max(1, cr * 0.12); c.strokeStyle = "rgba(255,255,255,0.14)";
        c.beginPath(); c.arc(cx - cr * 0.06, cy - cr * 0.06, cr, 0, Math.PI * 2); c.stroke();
      }
    } else {
      c.fillStyle = "rgba(60,20,10,0.35)";
      c.beginPath(); c.ellipse(w * 0.55, w * 0.52, w * 0.2, w * 0.08, -0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(255,240,230,0.55)";
      c.beginPath(); c.ellipse(w / 2, w * 0.03, w * 0.16, w * 0.05, 0, 0, Math.PI * 2); c.fill();
    }
    var sh = c.createRadialGradient(w * 0.32, w * 0.3, w * 0.08, w * 0.5, w * 0.5, w * 0.62);
    sh.addColorStop(0, "rgba(255,255,255,0.12)");
    sh.addColorStop(0.55, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(0,0,8,0.88)");
    c.fillStyle = sh; c.fillRect(0, 0, w, w);
    c.restore();
  }

  // ------------------------------------------------------------------ statistics
  function agencySet() {
    var s = {};
    OBJ.forEach(function (o) { s[o.agency] = 1; });
    return Object.keys(s);
  }
  function renderStats() {
    var moon = OBJ.filter(function (o) { return o.planet === "moon"; }).length;
    var rows = [
      ["stats.total", OBJ.length],
      ["stats.moon", moon],
      ["stats.mars", OBJ.length - moon],
      ["stats.done", OBJ.filter(isDone).length],
      ["stats.agencies", agencySet().length],
      ["stats.active", OBJ.filter(function (o) { return o.status === "active"; }).length]
    ];
    $("#stats").innerHTML = rows.map(function (r) {
      return "<div><dt>" + esc(T(r[0])) + "</dt><dd>" + r[1] + "</dd></div>";
    }).join("");
  }
  function renderDoors() {
    ["moon", "mars"].forEach(function (b) {
      var n = OBJ.filter(function (o) { return o.planet === b; });
      var done = n.filter(isDone).length;
      $("#door-" + b + "-meta").textContent = T("door.meta", { n: n.length, k: n.length - done });
    });
  }

  // ------------------------------------------------------------------ maps (2D, Leaflet)
  function graticule(map) {
    var g = L.layerGroup(), lat, lon, st = { color: "#9fb4e0", weight: 0.6, opacity: 0.28, interactive: false };
    for (lon = -180; lon <= 180; lon += 30) g.addLayer(L.polyline([[-90, lon], [90, lon]], st));
    for (lat = -60; lat <= 60; lat += 30) {
      g.addLayer(L.polyline([[lat, -180], [lat, 180]], lat === 0 ? { color: "#9fb4e0", weight: 1, opacity: 0.45, interactive: false } : st));
    }
    return g.addTo(map);
  }
  function showNote(el, text, persistent) {
    el.textContent = text; el.hidden = !text;
    if (el._t) clearTimeout(el._t);
    if (text && persistent === false) el._t = setTimeout(function () { el.hidden = true; }, 4500);
  }
  function setNote(body, key) {
    notes[body] = key;
    var n = $("#tiles-note");
    var onB = route === body || ((route === "timeline" || route === "archaeology") && planet === body);
    if (onB && key && mode === "2d") { n.textContent = T(key); n.hidden = false; } else if (onB) n.hidden = true;
  }
  function localizeMap(body) {
    var map = maps[body]; if (!map) return;
    var ac = map.attributionControl;
    if (ac) {
      if (attrs[body]) ac.removeAttribution(attrs[body]);
      attrs[body] = T("map.attr." + body);
      ac.addAttribution(attrs[body]);
      ac.setPrefix('<a href="https://leafletjs.com" title="' + esc(T("map.leafletTitle")) + '">Leaflet</a>');
    }
    var zc = map.zoomControl;
    if (zc && zc._zoomInButton) {
      zc._zoomInButton.title = zc._zoomInButton.setAttribute("aria-label", T("map.zoomIn")) || T("map.zoomIn");
      zc._zoomOutButton.title = zc._zoomOutButton.setAttribute("aria-label", T("map.zoomOut")) || T("map.zoomOut");
    }
  }
  function initMap(body) {
    if (maps[body]) return maps[body];
    if (typeof L === "undefined") return null;
    var cfg = BODIES[body];
    var map = L.map("map-" + body, {
      crs: L.CRS.EPSG4326, minZoom: 0, maxZoom: 9, zoomSnap: 0.25,
      maxBounds: [[-90, -180], [90, 180]], maxBoundsViscosity: 1, worldCopyJump: false
    }).setView(cfg.center, cfg.zoom);

    var idx = 0, loaded = 0, errs = 0;
    var base = L.tileLayer(cfg.layers[0], {
      noWrap: true, tileSize: 256, maxNativeZoom: cfg.nativeZoom, maxZoom: 9,
      bounds: [[-90, -180], [90, 180]]
    }).addTo(map);
    base.on("tileload", function () { loaded++; setNote(body, ""); });
    base.on("tileerror", function () {
      errs++;
      if (loaded) return;
      if (errs >= 4 && idx < cfg.layers.length - 1) { idx++; errs = 0; base.setUrl(cfg.layers[idx]); }
      else if (errs >= 8) setNote(body, "map.tilesFail");
    });

    // Space background (js/space.js) shows through the transparent map container. This opaque plate in its own pane
    // under the tiles (tilePane z-index 200) keeps the sky outside the map area only, also while tiles load or fail.
    map.createPane("spacePlate").style.zIndex = 150;
    L.rectangle([[-90, -180], [90, 180]], { pane: "spacePlate", stroke: false, fillColor: "#04060c", fillOpacity: 1, interactive: false }).addTo(map);

    // zoom buttons at the top right, where the globe's are in 3D (at the top left the legend covered them)
    if (map.zoomControl) map.zoomControl.setPosition("topright");
    map.on("movestart zoomstart", function () { if (window.SpaceBG) SpaceBG.motion(true); });
    map.on("moveend", function () { if (window.SpaceBG) SpaceBG.motion(false); });

    gridLayers[body] = graticule(map);
    markerLayers[body] = L.layerGroup().addTo(map);
    maps[body] = map;
    localizeMap(body);
    return map;
  }
  function pinIcon(o) {
    return L.divIcon({
      className: "",
      html: '<div class="pin ' + (o.accuracy.level === "area" ? "area" : "") + (window.COND ? " kc k-" + COND.stateOf(o) : "") + '" style="--c:' + ST[o.status].color + (window.COND ? ";--k:" + COND.color(o) : "") + '"></div>',
      iconSize: [16, 16], iconAnchor: [8, 8]
    });
  }

  // ------------------------------------------------------------------ filters, list, markers
  function filtered() {
    var q = $("#q").value.trim().toLowerCase(), st = $("#f-status").value, co = $("#f-cond").value, ty = $("#f-type").value,
      era = $("#f-era").value, done = $("#f-done").checked;
    if (route === "archaeology") return OBJ.filter(function (o) { return o.planet === planet && (!window.ARCH || ARCH.pass(o)); });
    if (route === "timeline") return OBJ.filter(function (o) { return o.planet === planet && (!window.MTL || MTL.pass(o)); });
    return OBJ.filter(function (o) {
      if (o.planet !== planet) return false;
      if (st && o.status !== st) return false;
      if (co && window.COND && COND.stateOf(o) !== co) return false;
      if (ty && o.type !== ty) return false;
      if (era && eraOf(o) !== era) return false;
      if (done && !isDone(o)) return false;
      if (q) {
        var l = loc(o);
        var hay = (o.name + " " + o.mission + " " + o.site + " " + o.agency + " " + o.type + " " + l.name + " " + l.mission + " " + l.site + " " + l.agency + " " + l.type).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }
  var modelsPref = true, modelState = null;
  try { modelsPref = localStorage.getItem("abnf.models") !== "0"; } catch (e) {}
  function modelKind(o) { return window.ModelLib ? window.ModelLib.kindFor(o.id) : null; }
  function modelItems(items) {
    return items.filter(modelKind).map(function (o) { return { id: o.id, kind: modelKind(o), lat: o.lat, lon: o.lon }; });
  }
  function renderModelNote() {
    var n = $("#mnote"), b = $("#g-models"), st = modelState;
    b.setAttribute("aria-pressed", String(modelsPref));
    var lbl = T(modelsPref ? "models.hide" : "models.show"); b.title = lbl; b.setAttribute("aria-label", lbl);
    if (mode !== "3d" || !st || !st.supported || !modelsPref || !st.total) { n.hidden = true; return; }
    var glb = Object.keys(st.sources).some(function (k) { return st.sources[k] === "glb"; });
    n.textContent = (!st.zoomed && !st.shown) ? T("models.zoomHint") : T(glb ? "models.noteGlb" : "models.note");
    n.hidden = false;
    placeModelNote();
  }
  // keep the models note just below the legend, whose height depends on the width and the language (it used to overlap it)
  function placeModelNote() {
    var n = $("#mnote"), lg = $("#legend");
    if (n.hidden) return;
    n.style.top = lg && lg.offsetParent && getComputedStyle(lg).display !== "none" ? (lg.offsetTop + lg.offsetHeight + 8) + "px" : "";
  }
  function globeItem(o) {
    return { id: o.id, lat: o.lat, lon: o.lon, color: ST[o.status].color, area: o.accuracy.level === "area", name: loc(o).name };
  }
  function refresh() {
    var items = filtered(), layer = markerLayers[planet];
    if (layer) {
      layer.clearLayers();
      items.forEach(function (o) {
        var n = loc(o).name + (window.COND ? " (" + T("cond.s." + COND.stateOf(o)) + ")" : "");
        var m = L.marker([o.lat, o.lon], { icon: pinIcon(o), title: n, alt: n, keyboard: true });
        m.on("click", function () { select(o.id); });
        layer.addLayer(m);
      });
    }
    if (globeReady) { Globe.setMarkers(items.map(globeItem), selectedId); Globe.setModels(modelItems(items)); }
    $("#count").textContent = T("count", { n: items.length, m: OBJ.filter(function (o) { return o.planet === planet; }).length });
    $("#list").innerHTML = items.map(function (o) {
      var on = compare.indexOf(o.id) !== -1, l = loc(o);
      return '<li class="item' + (o.id === selectedId ? " sel" : "") + '" data-id="' + esc(o.id) + '" tabindex="0" role="button">' +
        '<span class="dot" style="--c:' + ST[o.status].color + '"></span>' +
        '<span><div class="item-name">' + esc(l.name) + '</div><div class="item-sub">' + esc(l.mission) + " · " + yearOf(o) + "</div>" + condChip(o) + "</span>" +
        '<button class="mini' + (on ? " on" : "") + '" data-cmp="' + esc(o.id) + '" aria-label="' + esc(T("list.cmpAria", { name: l.name })) + '">' + esc(T(on ? "list.cmpOn" : "list.cmp")) + "</button></li>";
    }).join("") || '<li class="note">' + esc(T("list.empty")) + "</li>";
  }
  function buildFilterOptions(keep) {
    var prev = keep ? { ty: $("#f-type").value, era: $("#f-era").value, co: $("#f-cond").value } : null;
    buildCondOptions();
    var list = OBJ.filter(function (o) { return o.planet === planet; });
    var types = {}, eras = {};
    list.forEach(function (o) { types[o.type] = 1; eras[eraOf(o)] = 1; });
    var all = '<option value="">' + esc(T("f.all")) + "</option>";
    $("#f-type").innerHTML = all + Object.keys(types).sort(function (a, b) { return typeLabel(a).localeCompare(typeLabel(b), I.locale()); })
      .map(function (t) { return '<option value="' + esc(t) + '">' + esc(typeLabel(t)) + "</option>"; }).join("");
    $("#f-era").innerHTML = all + Object.keys(eras).sort().map(function (e) { return '<option value="' + e + '">' + esc(eraLabel(e)) + "</option>"; }).join("");
    if (prev) { $("#f-type").value = prev.ty; $("#f-era").value = prev.era; $("#f-cond").value = prev.co; }
    else { $("#f-status").value = ""; $("#f-cond").value = ""; $("#q").value = ""; $("#f-done").checked = false; }
  }
  function buildLegend() {
    $("#legend").innerHTML = Object.keys(ST).map(function (k) {
      return '<span style="--c:' + ST[k].color + '"><i></i>' + esc(T("status." + k)) + "</span>";
    }).join("") + "<span>◆ " + esc(T("legend.area")) + "</span>" + condLegend();
  }
  function condChip(o) {
    if (!window.COND) return "";
    var k = COND.stateOf(o);
    return '<div class="cchip k-' + k + '" style="--k:' + COND.color(o) + '"><b aria-hidden="true">' + COND.glyph(o) + "</b>" + esc(T("cond.s." + k)) + "</div>";
  }
  function condLegend() {
    if (!window.COND) return "";
    return '<span class="lg-sep" role="presentation"></span>' + COND.ORDER.map(function (k) {
      return '<span class="lg-c" style="--k:' + COND.STATES[k].color + '" title="' + esc(T("cond.d." + k)) + '"><i class="ring k-' + k + '"></i>' + esc(T("cond.s." + k)) + "</span>";
    }).join("");
  }
  function buildCondOptions() {
    if (!window.COND) return;
    var el = $("#f-cond"), cur = el.value, c = COND.counts(OBJ.filter(function (o) { return o.planet === planet; }));
    el.innerHTML = '<option value="">' + esc(T("cond.all")) + "</option>" + COND.ORDER.map(function (k) {
      return '<option value="' + k + '">' + COND.STATES[k].glyph + " " + esc(T("cond.s." + k)) + " (" + c[k] + ")</option>";
    }).join("");
    el.value = cur;
  }
  function condPanel(o) {
    if (!window.COND) return "";
    var c = o.condition || {}, k = COND.stateOf(o), L = I.locale();
    var reasons = (c.reasons || ["none"]).map(function (r) { return "<p>" + esc(T("cr." + r)) + "</p>"; }).join("");
    var src = (c.sources || []).map(sourceItem).join("");
    var hist = (c.history || []).map(function (h) {
      return '<li style="--k:' + COND.STATES[h.state].color + '"><b>' + esc(COND.fmt(h.date)) + "</b><i aria-hidden=\"true\">" + COND.STATES[h.state].glyph + " </i>" + esc(T("cond.s." + h.state)) + " — " + esc(T("ch." + h.note)) + "</li>";
    }).join("");
    return '<div class="cond-panel k-' + k + '" style="--k:' + COND.color(o) + '"><h4>' + esc(T("cond.title")) + "</h4>" +
      '<div class="cond-head"><span class="cond-badge"><b aria-hidden="true">' + COND.glyph(o) + "</b>" + esc(T("cond.s." + k)) + "</span>" +
      '<span class="cond-def">' + esc(T("cond.d." + k)) + "</span></div>" +
      '<dl class="kv"><dt>' + esc(T("cond.asof")) + "</dt><dd>" + esc(c.asOf ? COND.fmt(c.asOf) : T("cond.nodate")) + "</dd></dl>" +
      "<h5>" + esc(T("cond.reason")) + "</h5>" + reasons +
      (src ? "<h5>" + esc(T("cond.source")) + '</h5><ul class="facts">' + src + "</ul>" : "") +
      "<h5>" + esc(T("cond.history")) + "</h5>" + (hist ? '<ol class="mtl cond-hist">' + hist + "</ol>" : '<p class="note">' + esc(T("cond.nohist")) + "</p>") +
      '<p class="note">' + esc(T(c.curated ? "cond.curated" : "cond.uncurated")) + " " + esc(T("cond.note")) + "</p></div>";
  }

  // ------------------------------------------------------------------ discovery: camera flight, highlight, card
  function select(id, opts) {
    var o = byId[id], keep = !!(opts && opts.keep && !$("#card").hidden), noCard = !!(opts && opts.noCard);
    if (!o) return;
    if (route === "archaeology") noCard = true;
    if (route === "timeline" || route === "archaeology") { if (o.planet !== planet) showRoute(route, o.planet); }
    else if (o.planet !== planet || route !== o.planet) showRoute(o.planet);
    if (window.MTL) { if (!noCard) MTL.closePanel(); MTL.syncSelected(id); }
    if (window.ARCH && route === "archaeology") ARCH.syncSelected(id);
    selectedId = id;
    if (keep && !noCard) openCard(o, true); else closeCard(true);
    hideSurface();
    var tok = ++flightToken, finished = false, area = o.accuracy.level === "area";
    if (pulses[o.planet] && maps[o.planet]) { maps[o.planet].removeLayer(pulses[o.planet]); pulses[o.planet] = null; }
    refresh();
    if (globeReady) Globe.select(id);
    if (window.matchMedia("(max-width: 900px)").matches) collapseSide(true);

    function finish() {
      if (finished || tok !== flightToken) return;
      finished = true;
      if (mode === "2d" && maps[o.planet]) {
        pulses[o.planet] = L.marker([o.lat, o.lon], {
          icon: L.divIcon({ className: "", html: '<div class="pulse"></div>', iconSize: [0, 0] }),
          interactive: false, keyboard: false
        }).addTo(maps[o.planet]);
      }
      runScan();
      if (!keep && !noCard) setTimeout(function () { if (tok === flightToken) openCard(o); }, reduce ? 0 : 450);
    }
    if (mode === "3d" && globeReady) {
      Globe.flyTo(o.lat, o.lon, area ? 2.1 : 1.6, 3200, finish, modelKind(o) && modelsPref ? 0.3 : 0);
      setTimeout(finish, 4600);
      return;
    }
    var map = maps[o.planet], zoom = area ? 4 : 6;
    if (!map) { finish(); return; }
    if (reduce) { map.setView([o.lat, o.lon], zoom, { animate: false }); finish(); return; }
    map.once("moveend", finish);
    map.flyTo([o.lat, o.lon], zoom, { duration: 3.2, easeLinearity: 0.25 });
    setTimeout(finish, 4300);
  }
  function runScan() {
    var s = $("#scan");
    s.hidden = false; s.innerHTML = "<i></i>";
    setTimeout(function () { s.hidden = true; }, 1600);
  }
  function timelineRows(o) {
    var l = loc(o), t = o.timeline || {}, rows = [];
    var launch = t.launch || o.launch, landing = t.landing || o.landing, end = t.end || (o.end && o.end !== o.landing ? o.end : null);
    if (launch) rows.push([T("tl.launch"), fmtDate(launch)]);
    if (landing) rows.push([T(o.status === "impact" ? "tl.impact" : "tl.landing"), fmtDate(landing)]);
    if (l.ops) rows.push([T("tl.ops"), l.ops]);
    if (end) rows.push([T("tl.end"), fmtDate(end)]);
    if (l.legacy) rows.push([T("tl.legacy"), l.legacy]);
    return rows;
  }
  // ------------------------------------------------------------------ object explorer: card, photos, archive
  var detailsOpen = false, photoItems = [], lbIndex = -1, lbReturn = null;
  function periodText(o) {
    if (o.status === "active" && o.landing) return fmtDate(o.landing) + " – " + T("period.present");
    if (o.landing && o.end && o.end !== o.landing) return fmtDate(o.landing) + " – " + fmtDate(o.end);
    return T("period.unknown");
  }
  function isNasaHost(u) {
    try { var h = new URL(u).hostname; return h === "nasa.gov" || /\.nasa\.gov$/.test(h); } catch (e) { return false; }
  }
  function navList(o) {
    var list = filtered();
    if (!list.some(function (x) { return x.id === o.id; })) list = OBJ.filter(function (x) { return x.planet === o.planet; });
    return list;
  }
  function stepObject(o, dir) {
    var list = navList(o), i = list.findIndex(function (x) { return x.id === o.id; });
    if (list.length < 2) return;
    select(list[(i + dir + list.length) % list.length].id, { keep: true });
  }
  function explore3d(o) {
    var close = o.accuracy.level === "area" ? 1.9 : 1.32;
    detailsOpen = false; syncDetails();
    if (window.matchMedia("(max-width: 900px)").matches) { collapseSide(true); $("#card").classList.add("peek"); }
    if (mode !== "3d") {
      setMode("3d");
      if (mode !== "3d") {   // WebGL unavailable: go to the closest 2D zoom instead
        var m = maps[o.planet]; if (m) m.flyTo([o.lat, o.lon], 8, { duration: 2.4 });
        return;
      }
    }
    flightToken++;
    Globe.flyTo(o.lat, o.lon, close, 2800, null, modelKind(o) && modelsPref ? 0.3 : 0);
  }
  function syncDetails() {
    var card = $("#card"), b = $("#card-details-btn");
    card.classList.toggle("expanded", detailsOpen);
    if (b) { b.textContent = T(detailsOpen ? "card.hideDetails" : "card.viewDetails"); b.setAttribute("aria-expanded", String(detailsOpen)); }
  }
  function sourceItem(x) { return '<li><a href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(x.t) + "</a></li>"; }
  function openCard(o, instant) {
    var s = ST[o.status], card = $("#card"), l = loc(o), na = T("k.na");
    var list = navList(o), idx = list.findIndex(function (x) { return x.id === o.id; });
    var kvTop = [
      [T("k.mission"), esc(l.mission)], [T("k.equipment"), esc(l.type)],
      [T("k.launch"), esc(o.launch ? fmtDate(o.launch) : na)],
      [T(o.status === "impact" ? "k.impact" : "k.landing"), esc(o.landing ? fmtDate(o.landing) : na)],
      [T("k.period"), esc(periodText(o))],
      [T("k.coords"), '<span class="mono">' + esc(fmtCoord(o)) + "</span>"]
    ];
    var kvMore = [
      [T("k.agency"), esc(l.agency)], [T("k.location"), esc(l.site)],
      [T("k.accuracy"), esc(T("acc." + o.accuracy.level)) + " – " + esc(l.note)], [T("k.status"), esc(T("status." + o.status))]
    ];
    if (modelKind(o)) kvMore.push([T("k.model"), esc(T("model.kind"))]);
    function dl(rows) { return rows.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + r[1] + "</dd>"; }).join(""); }
    var facts = l.facts.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");
    var tl = timelineRows(o).map(function (r) { return "<li><b>" + esc(r[0]) + "</b>" + esc(r[1]) + "</li>"; }).join("");
    var lib = "https://images.nasa.gov/search?q=" + encodeURIComponent(o.imageQuery);
    var nasa = (o.sources || []).filter(function (x) { return isNasaHost(x.u); }).map(sourceItem).join("") +
      '<li><a href="' + esc(lib) + '" target="_blank" rel="noopener">' + esc(T("card.nasaLib")) + "</a></li>";
    var other = (o.sources || []).filter(function (x) { return !isNasaHost(x.u); }).map(sourceItem).join("");
    var cmpOn = compare.indexOf(o.id) !== -1;

    card.innerHTML =
      '<button class="ghost close" id="card-close">' + esc(T("card.close")) + "</button>" +
      '<div class="reveal' + (instant ? " instant" : "") + '">' +
      '<div class="cnav" role="group" aria-label="' + esc(T("card.navAria")) + '">' +
      '<button class="ghost" id="card-prev" aria-label="' + esc(T("card.prev")) + '" title="' + esc(T("card.prev")) + '"' + (list.length < 2 ? " disabled" : "") + '>‹</button>' +
      '<span class="cpos">' + esc(T("card.pos", { i: idx + 1, n: list.length })) + "</span>" +
      '<button class="ghost" id="card-next" aria-label="' + esc(T("card.next")) + '" title="' + esc(T("card.next")) + '"' + (list.length < 2 ? " disabled" : "") + ">›</button></div>" +
      '<div><span class="badge" style="--c:' + s.color + '">' + esc(T("status." + o.status)) + "</span>" +
      (window.COND ? '<span class="cond-badge k-' + COND.stateOf(o) + '" style="--k:' + COND.color(o) + '" title="' + esc(T("cond.d." + COND.stateOf(o))) + '"><b aria-hidden="true">' + COND.glyph(o) + "</b>" + esc(T("cond.s." + COND.stateOf(o))) + "</span>" : "") +
      (o.coordChecked ? "" : '<span class="warn" title="' + esc(T("card.pendingTitle")) + '">' + esc(T("card.pending")) + "</span>") + "</div>" +
      "<h3>" + esc(l.name) + "</h3>" +
      '<div class="hero-photo" id="hero-photo"><p class="note">' + esc(T("photos.loading")) + "</p></div>" +
      '<dl class="kv">' + dl(kvTop) + "</dl>" +
      '<div class="cactions"><button class="cta small" id="card-details-btn" aria-expanded="false" aria-controls="card-details">' + esc(T("card.viewDetails")) + "</button>" +
      '<button class="cta small alt" id="card-explore">' + esc(T("card.explore3d")) + "</button>" +
      (window.BA && window.BA.hasKey(o.id) ? '<button class="cta small alt" id="card-ba">' + esc(T("ba.open")) + "</button>" : "") + (window.MJ ? '<button class="cta small alt" id="card-mj">' + esc(T("mj.open")) + "</button>" : "") + (window.ARCH ? '<button class="cta small alt" id="card-ar">' + esc(T("ar.open")) + "</button>" : "") + "</div>" +
      '<div class="cd" id="card-details">' +
      '<dl class="kv">' + dl(kvMore) + "</dl>" +
      condPanel(o) +
      "<div><h4>" + esc(T("card.purpose")) + "</h4><p>" + esc(l.desc) + "</p><p>" + esc(l.why) + "</p></div>" +
      "<div><h4>" + esc(T("card.objhist")) + "</h4>" + (tl ? '<ol class="mtl">' + tl + "</ol>" : '<p class="note">' + esc(T("k.na")) + "</p>") +
      (facts ? '<h5>' + esc(T("card.facts")) + '</h5><ul class="facts">' + facts + "</ul>" : "") + "</div>" +
      "<div><h4>" + esc(T("card.photos")) + '</h4><div class="photos" id="photos"><p class="note">' + esc(T("photos.loading")) + "</p></div></div>" +
      "<div><h4>" + esc(T("card.archive")) + '</h4><ul class="facts" id="archive"><li class="note">' + esc(T("archive.loading")) + "</li></ul></div>" +
      '<div class="links"><h4>' + esc(T("card.nasaOfficial")) + '</h4><ul class="facts">' + nasa + "</ul>" +
      (other ? "<h4>" + esc(T("card.otherSources")) + '</h4><ul class="facts">' + other + "</ul>" : "") + "</div>" +
      '<div><button class="cta small" id="card-compare">' + esc(T(cmpOn ? "card.cmpOn" : "card.cmp")) + "</button></div>" +
      "</div></div>";
    if (window.MTL) MTL.closePanel();
    card.hidden = false;
    card.scrollTop = 0;
    card.classList.remove("peek");
    void card.offsetWidth;
    card.classList.add("in");
    syncDetails();
    $("#card-close").addEventListener("click", function () { closeCard(false); });
    $("#card-prev").addEventListener("click", function () { stepObject(o, -1); });
    $("#card-next").addEventListener("click", function () { stepObject(o, 1); });
    $("#card-details-btn").addEventListener("click", function () { detailsOpen = !detailsOpen; syncDetails(); if (detailsOpen) $("#card-details").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" }); });
    $("#card-explore").addEventListener("click", function () { explore3d(o); });
    if ($("#card-ba")) $("#card-ba").addEventListener("click", function () { window.BA.open(o); });
    if ($("#card-mj")) $("#card-mj").addEventListener("click", function () { MJ.open(MJ.key(o)); });
    if ($("#card-ar")) $("#card-ar").addEventListener("click", function () { openArch(o); });
    $("#card-compare").addEventListener("click", function () { toggleCompare(o.id); $("#card-compare").textContent = T(compare.indexOf(o.id) !== -1 ? "card.cmpOn" : "card.cmp"); });
    loadPhotos(o); loadArchive(o);
  }
  function closeCard(quick) {
    var card = $("#card");
    card.classList.remove("in");
    if (quick) { card.hidden = true; return; }
    setTimeout(function () { if (!card.classList.contains("in")) card.hidden = true; }, 700);
  }
  function nasaFetch(q, types, size, ok, fail) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    fetch("https://images-api.nasa.gov/search?media_type=" + types + "&page_size=" + size + "&q=" + encodeURIComponent(q), ctl ? { signal: ctl.signal } : undefined)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { clearTimeout(timer); ok(((j.collection || {}).items || []).filter(function (it) { return it.data && it.data[0]; })); })
      .catch(function () { clearTimeout(timer); fail(); });
  }
  function loadPhotos(o) {
    var q = o.imageQuery, search = "https://images.nasa.gov/search?q=" + encodeURIComponent(q), id = o.id;
    function alive() { return selectedId === id && document.body.contains($("#photos")); }
    photoItems = [];
    nasaFetch(q, "image", 12, function (all) {
      if (!alive()) return;
      var items = all.filter(function (it) { return it.links && it.links[0]; }).slice(0, 6), hero = $("#hero-photo"), box = $("#photos");
      if (!items.length) { var m = '<p class="note">' + T("photos.none", { url: esc(search) }) + "</p>"; box.innerHTML = m; hero.innerHTML = m; return; }
      photoItems = items.map(function (it) {
        var d = it.data[0], thumb = it.links[0].href;
        return { thumb: thumb, full: thumb.replace("~thumb", "~medium"), title: d.title || "", nasaId: d.nasa_id, date: (d.date_created || "").slice(0, 10), desc: d.description || "", center: d.center || "" };
      });
      hero.innerHTML = '<button class="hero-btn" data-i="0" aria-label="' + esc(photoItems[0].title) + '"><img src="' + esc(photoItems[0].thumb) + '" alt="' + esc(photoItems[0].title) + '"></button>' +
        '<p class="note">' + esc(photoItems[0].title) + "</p>";
      box.innerHTML = photoItems.map(function (p, i) {
        return '<figure><button class="ph-btn" data-i="' + i + '"><img loading="lazy" src="' + esc(p.thumb) + '" alt="' + esc(p.title) + '"></button><figcaption>' + esc(p.title) + "</figcaption></figure>";
      }).join("") + '<p class="note" style="grid-column:1/-1">' + T("photos.live", { q: esc(q), url: esc(search) }) + "</p>";
    }, function () {
      if (!alive()) return;
      var m = '<p class="note">' + T("photos.fail", { url: esc(search) }) + "</p>";
      $("#photos").innerHTML = m; $("#hero-photo").innerHTML = m;
    });
  }
  function loadArchive(o) {
    var id = o.id;
    function alive() { return selectedId === id && $("#archive"); }
    nasaFetch(o.imageQuery, "video,audio", 8, function (all) {
      if (!alive()) return;
      var items = all.slice(0, 5);
      $("#archive").innerHTML = items.length ? items.map(function (it) {
        var d = it.data[0];
        return '<li><a href="https://images.nasa.gov/details/' + encodeURIComponent(d.nasa_id) + '" target="_blank" rel="noopener">' + esc(d.title) + "</a> <span class=\"tag\">" + esc(T("media." + (d.media_type === "audio" ? "audio" : "video"))) + "</span></li>";
      }).join("") : '<li class="note">' + esc(T("archive.none")) + "</li>";
    }, function () { if (alive()) $("#archive").innerHTML = '<li class="note">' + esc(T("archive.fail")) + "</li>"; });
  }

  // photo viewer
  function renderLightbox() {
    var p = photoItems[lbIndex], lb = $("#lightbox"); if (!p) return;
    var img = $("#lb-img"); img.onerror = function () { img.onerror = null; img.src = p.thumb; };
    img.src = p.full; img.alt = p.title;
    $("#lb-title").textContent = p.title;
    $("#lb-meta").textContent = [p.date ? fmtDate(p.date) : "", p.center, p.nasaId].filter(Boolean).join(" · ");
    $("#lb-desc").textContent = p.desc ? (p.desc.length > 420 ? p.desc.slice(0, 420) + "…" : p.desc) : T("lb.noDesc");
    $("#lb-link").href = p.page || "https://images.nasa.gov/details/" + encodeURIComponent(p.nasaId);
    $("#lb-prov").innerHTML = (p.prov || []).map(function (x) { return esc(x); }).join("<br>");
    $("#lb-note").textContent = p.note || "";
    var acts = $("#lb-acts"); acts.innerHTML = "";
    (p.actions || []).forEach(function (a) { var b = document.createElement("button"); b.type = "button"; b.className = "cta small alt"; b.textContent = a.label; b.onclick = a.fn; acts.appendChild(b); });
    $("#lb-fs").hidden = !(document.documentElement.requestFullscreen);
    $("#lb-prev").disabled = $("#lb-next").disabled = photoItems.length < 2;
    lb.hidden = false;
  }
  function openLightbox(i) { lbIndex = i; lbReturn = document.activeElement; renderLightbox(); $("#lb-close").focus(); }
  function localizeLightbox() { I.apply($("#lightbox")); }
  function closeLightbox() { $("#lightbox").hidden = true; $("#lb-img").removeAttribute("src"); if (lbReturn && lbReturn.focus) lbReturn.focus(); }
  function stepLightbox(d) { if (photoItems.length) { lbIndex = (lbIndex + d + photoItems.length) % photoItems.length; renderLightbox(); } }

  // ------------------------------------------------------------------ compare
  function toggleCompare(id) {
    var i = compare.indexOf(id);
    if (i !== -1) compare.splice(i, 1);
    else { if (compare.length === 2) compare.shift(); compare.push(id); }
    renderTray(); refresh();
  }
  function renderTray() {
    $("#tray").hidden = compare.length === 0;
    $("#tray-list").innerHTML = compare.map(function (id) { return "<li>" + esc(loc(byId[id]).name) + "</li>"; }).join("");
    $("#open-compare").disabled = compare.length < 2;
    $("#open-compare").textContent = T(compare.length < 2 ? "tray.more" : "tray.open");
  }
  function span(o) {
    if (!o.landing || !o.end || o.end === o.landing) return T("k.na");
    var y = (toMs(o.end) - toMs(o.landing)) / 31557600000;
    return y < 0.1 ? T("span.short") : T("span.years", { y: num(y, 1) });
  }
  function openCompare() {
    if (compare.length < 2) return;
    var a = byId[compare[0]], b = byId[compare[1]], na = T("k.na");
    var rows = [
      ["cmp.planet", function (o) { return T("body." + o.planet); }],
      ["cmp.mission", function (o) { return loc(o).mission; }],
      ["cmp.agency", function (o) { return loc(o).agency; }],
      ["cmp.equipment", function (o) { return loc(o).type; }],
      ["cmp.status", function (o) { return T("status." + o.status); }],
      ["cmp.launch", function (o) { return o.launch ? fmtDate(o.launch) : na; }],
      ["cmp.landing", function (o) { return o.landing ? fmtDate(o.landing) : na; }],
      ["cmp.end", function (o) { return o.end && o.end !== o.landing ? fmtDate(o.end) : na; }],
      ["cmp.span", span],
      ["cmp.dist", function (o) { return o.distanceKm != null ? num(o.distanceKm, o.distanceKm % 1 ? (String(o.distanceKm).split(".")[1] || "").length : 0) + " " + T("unit.km") : na; }],
      ["cmp.acc", function (o) { return T("acc." + o.accuracy.level); }]
    ];
    $("#compare-body").innerHTML = "<table><thead><tr><th></th><th>" + esc(loc(a).name) + "</th><th>" + esc(loc(b).name) + "</th></tr></thead><tbody>" +
      rows.map(function (r) { return "<tr><th>" + esc(T(r[0])) + "</th><td>" + esc(r[1](a)) + "</td><td>" + esc(r[1](b)) + "</td></tr>"; }).join("") + "</tbody></table>";
    $("#compare").hidden = false;
    $("#close-compare").focus();
  }

  // ------------------------------------------------------------------ pages
  function renderTimeline() {
    var sorted = OBJ.slice().sort(function (a, b) { return toMs(a.landing || a.launch) - toMs(b.landing || b.launch); });
    $("#tl").innerHTML = sorted.map(function (o) {
      return '<li style="--c:' + (o.planet === "moon" ? "var(--moon)" : "var(--mars)") + '"><button data-open="' + esc(o.id) + '">' +
        '<div class="y">' + yearOf(o) + '</div><div class="n">' + esc(loc(o).name) + '</div><div class="p">' + esc(T("body." + o.planet)) + " · " + esc(T("status." + o.status)) + "</div></button></li>";
    }).join("");
  }
  function renderAbout() {
    var unchecked = OBJ.filter(function (o) { return !o.coordChecked; });
    var srcs = {};
    OBJ.forEach(function (o) { (o.sources || []).forEach(function (s) { srcs[s.u] = s.t; }); });
    $("#about").innerHTML =
      "<h3>" + esc(T("about.h.map")) + "</h3><p>" + esc(T("about.p.map", { n: OBJ.length })) + "</p>" +
      "<h3>" + esc(T("about.h.status")) + "</h3><ul>" +
      Object.keys(ST).map(function (k) { return '<li><b style="color:' + ST[k].color + '">' + esc(T("status." + k)) + "</b></li>"; }).join("") + "</ul>" +
      "<h3>" + esc(T("about.h.check")) + "</h3><ul>" +
      (unchecked.map(function (o) { var l = loc(o); return "<li>" + esc(l.name) + ": " + esc(l.note) + "</li>"; }).join("") || "<li>" + esc(T("about.none")) + "</li>") + "</ul>" +
      "<h3>" + esc(T("about.h.src")) + "</h3><ul>" + Object.keys(srcs).map(function (u) { return '<li><a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(srcs[u]) + "</a></li>"; }).join("") + "</ul>" +
      '<p class="note">' + esc(T("about.svc.lang")) + "</p>" +
      "<h3>" + esc(T("about.h.svc")) + "</h3><ul>" +
      "<li>" + T("about.svc.maps") + "</li>" +
      "<li>" + T("about.svc.photos") + "</li></ul>";
  }

  // ------------------------------------------------------------------ 3D globe wiring
  function globeSpec(b) { return { kind: b, radiusKm: BODIES[b].radiusKm, rim: BODIES[b].rim, urls: BODIES[b].layers.slice() }; }
  function ensureGlobe() {
    if (globeReady) return true;
    if (!Globe || !Globe.supported()) return false;
    globeReady = Globe.init({
      canvas: $("#globe-gl"), overlay: $("#globe-ov"), reduce: reduce,
      fontFamily: window.getComputedStyle(document.body).fontFamily,
      onPick: function (id) { select(id); },
      onSurface: function (info) { if (info) showSurface(info); else hideSurface(); },
      onTexture: function (state) { globeTex = state; renderGlobeNote(); },
      onModels: function (st) { modelState = st; renderModelNote(); },
      onMotion: function (m) { if (window.SpaceBG) SpaceBG.motion(m); },
      onLost: onGlobeLost
    });
    return globeReady;
  }
  function renderGlobeNote() {
    var n = $("#globe-note");
    if (mode !== "3d" || !globeTex) { n.hidden = true; return; }
    if (globeTex === "fallback") showNote(n, T("globe.texFallback"));
    else if (globeTex === "nasa") showNote(n, T("globe.texNasa"), false);
    else showNote(n, T("globe.texLoading"));
  }
  function onGlobeLost() {
    if (mode === "3d") { setMode("2d", { instant: true }); }
    showNote($("#tiles-note"), T("globe.lost"), false);
  }
  function updateGlobeAria() {
    $("#globe-ov").setAttribute("aria-label", T("globe.aria", { body: T("body." + planet) }));
  }
  function showSurface(info) {
    lastSurface = info; renderSurface();
  }
  function hideSurface() {
    lastSurface = null;
    $("#ginfo").hidden = true;
    if (globeReady) Globe.clearSurface();
  }
  function renderSurface() {
    var el = $("#ginfo"), s = lastSurface;
    if (!s) { el.hidden = true; return; }
    var nearest = s.nearest && byId[s.nearest.id], km = s.nearest ? Math.round(s.nearest.km).toLocaleString(I.locale()) : "";
    el.innerHTML =
      '<button class="ghost x" id="ginfo-x" aria-label="' + esc(T("globe.close")) + '">×</button>' +
      "<h4>" + esc(T("globe.point")) + " · " + esc(T("body." + planet)) + "</h4>" +
      '<dl><dt>' + esc(T("globe.lat")) + '</dt><dd class="mono">' + esc(fmtLat(s.lat, 3)) + "</dd>" +
      "<dt>" + esc(T("globe.lon")) + '</dt><dd class="mono">' + esc(fmtLon(s.lon, 3)) + "</dd>" +
      (nearest ? "<dt>" + esc(T("globe.nearest")) + "</dt><dd>" + esc(loc(nearest).name) + "</dd><dt>" + esc(T("globe.distance")) + '</dt><dd class="mono">' + esc(km + " " + T("unit.km")) + "</dd>" : "<dt></dt><dd>" + esc(T("globe.none")) + "</dd>") +
      "</dl>" +
      (nearest ? '<button class="cta small" id="ginfo-open" data-id="' + esc(nearest.id) + '">' + esc(T("globe.open")) + "</button>" : "") +
      '<p class="note">' + esc(T("globe.radiusNote")) + "</p>";
    el.hidden = false;
    $("#ginfo-x").addEventListener("click", hideSurface);
    var ob = $("#ginfo-open");
    if (ob) ob.addEventListener("click", function () { select(ob.dataset.id); });
  }
  function syncModeButtons() {
    document.querySelectorAll("#viewmode button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.mode === mode)); });
  }
  function setMode(m, opts) {
    opts = opts || {};
    if (m === mode) { syncModeButtons(); return; }
    var wrap = $("#mapwrap"), gl = $("#globe-gl"), ov = $("#globe-ov");
    if (m === "3d") {
      if (!ensureGlobe()) { showNote($("#tiles-note"), T("globe.unsupported"), false); syncModeButtons(); return; }
      var map = maps[planet], c = map ? map.getCenter() : { lat: BODIES[planet].center[0], lng: BODIES[planet].center[1] };
      mode = "3d";
      gl.hidden = false; ov.hidden = false; void ov.offsetWidth;
      wrap.classList.add("is3d");
      $("#gctl").hidden = false; $("#ghint").hidden = false; $("#tiles-note").hidden = true;
      updateGlobeAria();
      Globe.setBody(planet, globeSpec(planet));
      Globe.setGrid(gridOn);
      Globe.setMarkers(filtered().map(globeItem), selectedId);
      Globe.setModels(modelItems(filtered())); Globe.setModelsVisible(modelsPref);
      Globe.enter(c.lat, c.lng);
      renderGlobeNote();
      if (window.SpaceBG) SpaceBG.set(planet, "3d");
    } else {
      mode = "2d";
      $("#gctl").hidden = true; $("#ghint").hidden = true; $("#globe-note").hidden = true; hideSurface();
      var back = function (center) {
        wrap.classList.remove("is3d");
        var map = maps[planet];
        if (map && center) { map.invalidateSize(); map.setView([center.lat, center.lon], map.getZoom(), { animate: false }); }
        setTimeout(function () { if (mode === "2d") { gl.hidden = true; ov.hidden = true; } }, 450);
        if (notes[planet]) setNote(planet, notes[planet]);
      };
      if (opts.instant || !globeReady) back(globeReady ? Globe.view() : null); else Globe.exit(back);
      if (window.SpaceBG) SpaceBG.set(planet, "2d");
    }
    syncModeButtons();
  }

  // ------------------------------------------------------------------ routing
  function collapseSide(c) {
    var side = $("#side");
    side.classList.toggle("collapsed", c);
    $("#side-toggle").setAttribute("aria-expanded", String(!c));
  }
  function showRoute(r, pl) {
    if (["home", "relics", "moon", "mars", "timeline", "archaeology", "impact", "comparison", "statistics", "photos", "quiz", "ar", "about"].indexOf(r) === -1) r = "home";
    var tl = r === "timeline", ar = r === "archaeology", explorer = r === "moon" || r === "mars" || tl || ar;
    var bodyKey = (tl || ar) ? (pl || planet || "moon") : r;   // the Mission Timeline shows the map of the chosen body
    ["home", "relics", "explorer", "impact", "comparison", "statistics", "photos", "quiz", "ar", "about"].forEach(function (v) { $("#view-" + (v === "statistics" ? "stats" : v)).hidden = v !== (explorer ? "explorer" : r); });
    if (window.IMP && r === "impact") IMP.show();
    if (window.MCMP && r === "comparison") MCMP.show();
    if (window.STATS && r === "statistics") STATS.show();
    if (window.PHOTOS && r === "photos") PHOTOS.show();
    if (window.QUIZ && r === "quiz") QUIZ.show();
    if (window.FR && r === "relics") FR.show();
    if (window.AR) { if (r === "ar") AR.show(); else AR.hide(); }   // AR table: hide() also stops the camera
    document.body.classList.toggle("armode", r === "ar");
    document.body.classList.toggle("tlmode", tl);
    document.body.classList.toggle("archmode", ar);
    if (window.ARCH) { if (ar) ARCH.show(bodyKey); else ARCH.hide(); }
    if (window.MTL) { if (tl) { MTL.show(); } else MTL.hide(); }
    document.querySelectorAll(".nav a").forEach(function (a) { a.classList.toggle("on", a.dataset.route === r); });
    syncNavCur(); closeNav();
    document.body.dataset.planet = explorer ? bodyKey : "";
    $("#tiles-note").hidden = true;
    if (explorer) {
      var changed = planet !== bodyKey || route === null || !maps[bodyKey];
      planet = bodyKey; route = r;
      $("#map-moon").hidden = bodyKey !== "moon"; $("#map-mars").hidden = bodyKey !== "mars";
      var map = initMap(bodyKey);
      $("#side-title").textContent = T("body." + bodyKey);
      if (tl && window.MTL) MTL.show();
      if (changed) { buildFilterOptions(false); selectedId = null; closeCard(true); hideSurface(); }
      if (!map && mode === "2d") {
        // The 2D library could not load: fall back to the 3D globe, which has no external dependencies.
        if (ensureGlobe()) { setMode("3d"); showNote($("#tiles-note"), T("map.noLeaflet"), false); $("#viewmode").classList.add("no2d"); }
      }
      if (notes[bodyKey]) setNote(bodyKey, notes[bodyKey]);
      $("#grid-toggle").setAttribute("aria-pressed", String(gridOn));
      if (mode === "3d" && globeReady) {
        updateGlobeAria();
        Globe.setBody(bodyKey, globeSpec(bodyKey));
        if (changed) Globe.select(null);
        Globe.pause(false);
        renderGlobeNote();
      }
      refresh();
      if (map) setTimeout(function () { map.invalidateSize(); }, 30);
      if (window.SpaceBG) SpaceBG.set(bodyKey, mode);
    } else {
      route = r;
      closeCard(true);
      if (globeReady) Globe.pause(true);
    }
    window.scrollTo(0, 0);
  }
  function openArch(o) {
    var id = window.ARCH ? ARCH.focusObject(o.id) : null;
    showRoute("archaeology", o.planet); restoreHash();
    if (id) ARCH.choose(id);
  }
  function restoreHash() { try { history.replaceState(null, "", "#" + (route || "home")); } catch (e) { /* ignore */ } }
  function onHash() {
    var r = (location.hash || "#home").slice(1);
    if (r === "journey") { if (!route) showRoute("home"); if (window.MJ && !MJ.isOpen()) MJ.open(); return; }
    if (window.MJ && MJ.isOpen()) MJ.close(true);
    if (r !== route) showRoute(r);
  }

  // ------------------------------------------------------------------ language switching
  function syncLangButtons() {
    document.querySelectorAll("#lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === I.lang)); });
  }
  // ------------------------------------------------------------------ main menu: one row when it fits, otherwise a drop-down
  function syncNavCur() {
    var on = $(".nav a.on"), cur = $("#nav-cur");
    if (cur) cur.textContent = on ? on.textContent : T("nav.menu");
    var nav = $(".nav");   // wide screens: keep the active item visible if the row scrolls
    if (on && nav && !document.body.classList.contains("nav-compact") && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, on.offsetLeft - nav.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2);
  }
  function closeNav() {
    document.body.classList.remove("nav-open");
    var t = $("#nav-toggle"); if (t) t.setAttribute("aria-expanded", "false");
  }
  function fitNav() {
    var b = document.body, nav = $(".nav"); if (!nav) return;
    var wasOpen = b.classList.contains("nav-open");
    b.classList.remove("nav-compact", "nav-open");
    // compact when the items do not fit in one row, or when they squeeze the site name into an ellipsis
    var bn = $(".brand-name"), cut = bn && bn.offsetParent && bn.scrollWidth > bn.clientWidth + 1;
    var compact = nav.scrollWidth > nav.clientWidth + 2 || !!cut;
    b.classList.toggle("nav-compact", compact);
    if (compact && wasOpen) { b.classList.add("nav-open"); }
    else $("#nav-toggle").setAttribute("aria-expanded", "false");
    syncNavCur();
  }
  function applyLang() {
    syncLangButtons(); fitNav();
    renderStats(); buildLegend(); renderTimeline(); renderAbout(); renderTray(); renderDoors();
    $("#side-title").textContent = T("body." + planet);
    Object.keys(maps).forEach(localizeMap);
    if (window.MTL) MTL.render();
    if (window.ARCH) ARCH.render();
    if (window.IMP) IMP.render();
    if (window.MCMP) MCMP.render();
    if (window.STATS) STATS.render();
    if (window.PHOTOS) PHOTOS.render();
    if (window.QUIZ) QUIZ.render();
    if (window.FR) FR.render();
    if (window.AR) AR.render();
    if (window.MJ && MJ.isOpen()) { I.apply($("#mj")); MJ.render(); }
    if (route === "moon" || route === "mars" || route === "timeline" || route === "archaeology") {
      buildFilterOptions(true);
      refresh();
      if (notes[planet] && mode === "2d") setNote(planet, notes[planet]);
    }
    if (!$("#card").hidden && selectedId) openCard(byId[selectedId], true);
    if (!$("#compare").hidden) openCompare();
    if (!$("#lightbox").hidden) { localizeLightbox(); renderLightbox(); }
    if (window.BA && BA.isOpen()) { I.apply($("#ba")); BA.render(); }
    renderModelNote();
    if (globeReady) { updateGlobeAria(); renderGlobeNote(); renderSurface(); Globe.redraw(); }
  }

  // ------------------------------------------------------------------ boot
  function boot() {
    I.setLang(I.lang, true);
    drawPlanet($("#cv-moon"), [150, 152, 160], 11, "moon");
    drawPlanet($("#cv-mars"), [176, 92, 58], 7, "mars");
    renderStats(); buildLegend(); renderTimeline(); renderAbout(); renderTray(); renderDoors(); syncLangButtons();
    I.onChange(applyLang);
    fitNav();
    var fitT = null;
    window.addEventListener("resize", function () { clearTimeout(fitT); fitT = setTimeout(function () { fitNav(); placeModelNote(); }, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNav);
    $("#nav-toggle").addEventListener("click", function () {
      var open = !document.body.classList.contains("nav-open");
      document.body.classList.toggle("nav-open", open);
      this.setAttribute("aria-expanded", String(open));
      if (open) { var a = $(".nav a.on") || $(".nav a"); if (a) a.focus(); }
    });
    $(".nav").addEventListener("click", function (e) { if (e.target.closest("a")) closeNav(); });
    document.addEventListener("click", function (e) { if (document.body.classList.contains("nav-open") && !e.target.closest(".nav, #nav-toggle")) closeNav(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && document.body.classList.contains("nav-open")) { closeNav(); $("#nav-toggle").focus(); } }, true);

    $("#lang").addEventListener("click", function (e) {
      var b = e.target.closest("[data-lang]");
      if (b) I.setLang(b.dataset.lang);
    });
    $("#viewmode").addEventListener("click", function (e) {
      var b = e.target.closest("[data-mode]");
      if (!b) return;
      if (b.dataset.mode === "2d" && typeof L === "undefined") { showNote($("#tiles-note"), T("map.noLeaflet"), false); return; }
      setMode(b.dataset.mode);
    });
    $("#g-in").addEventListener("click", function () { Globe.zoomBy(0.75); });
    $("#g-out").addEventListener("click", function () { Globe.zoomBy(1.33); });
    $("#g-reset").addEventListener("click", function () { Globe.reset(); });
    $("#g-models").addEventListener("click", function () {
      modelsPref = !modelsPref;
      try { localStorage.setItem("abnf.models", modelsPref ? "1" : "0"); } catch (e) {}
      if (globeReady) Globe.setModelsVisible(modelsPref);
      renderModelNote();
    });
    $("#globe-ov").addEventListener("pointerdown", function () { $("#ghint").hidden = true; });

    ["#q", "#f-status", "#f-cond", "#f-type", "#f-era", "#f-done"].forEach(function (s) {
      $(s).addEventListener("input", refresh);
      $(s).addEventListener("change", refresh);
    });
    $("#list").addEventListener("click", function (e) {
      var c = e.target.closest("[data-cmp]");
      if (c) { e.stopPropagation(); toggleCompare(c.dataset.cmp); return; }
      var li = e.target.closest("[data-id]");
      if (li) select(li.dataset.id);
    });
    $("#list").addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var li = e.target.closest("[data-id]");
      if (li && e.target === li) { e.preventDefault(); select(li.dataset.id); }
    });
    $("#tl").addEventListener("click", function (e) {
      var b = e.target.closest("[data-open]");
      if (b) select(b.dataset.open);
    });
    $("#side-toggle").addEventListener("click", function () { collapseSide(!$("#side").classList.contains("collapsed")); });
    $("#open-compare").addEventListener("click", openCompare);
    $("#clear-compare").addEventListener("click", function () { compare = []; renderTray(); refresh(); });
    $("#close-compare").addEventListener("click", function () { $("#compare").hidden = true; });
    $("#compare").addEventListener("click", function (e) { if (e.target.id === "compare") $("#compare").hidden = true; });
    $("#grid-toggle").addEventListener("click", function () {
      var btn = $("#grid-toggle");
      gridOn = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(gridOn));
      Object.keys(maps).forEach(function (b) {
        var map = maps[b], g = gridLayers[b];
        if (map && g) { if (gridOn) map.addLayer(g); else map.removeLayer(g); }
      });
      if (globeReady) Globe.setGrid(gridOn);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (window.MJ && MJ.isOpen() && !$("#lightbox").hidden) closeLightbox();
      else if (window.MJ && MJ.isOpen()) MJ.close();
      else if (window.BA && BA.isOpen()) BA.close();
      else if (!$("#mcard").hidden) MTL.closePanel();
      else if (window.ARCH && !$("#acard").hidden) ARCH.closePanel();
      else if (!$("#lightbox").hidden) closeLightbox();
      else if (!$("#compare").hidden) $("#compare").hidden = true;
      else if (!$("#ginfo").hidden) hideSurface();
      else if (!$("#card").hidden) closeCard(false);
    });
    if (window.matchMedia("(max-width: 900px)").matches) collapseSide(true);
    if (window.MTL) MTL.init({
      T: T, esc: esc, fmtDate: fmtDate, loc: loc, typeLabel: typeLabel, coords: fmtCoord, reduce: function () { return reduce; },
      objects: function () { return OBJ; }, planet: function () { return planet; },
      mission: function (o) { return loc(o).mission; }, statusColor: function (o) { return ST[o.status].color; },
      setPlanet: function (p) { showRoute("timeline", p); },
      refresh: function () { refresh(); },
      fly: function (o) { select(o.id, { noCard: true }); },
      show: function (o, m) { if (mode !== m) setMode(m); select(o.id, { noCard: true }); },
      openObject: function (id) { select(id); },
      hasJourney: function () { return !!window.MJ; }, openJourney: function (o) { MJ.open(MJ.key(o)); },
      hasArch: function () { return !!window.ARCH; }, openArch: function (o) { openArch(o); },
      hasBA: function (id) { return !!(window.BA && BA.hasKey(id)); }, openBA: function (o) { BA.open(o); },
      photos: function (q, ok, fail) {
        nasaFetch(q, "image", 12, function (all) {
          ok(all.filter(function (it) { return it.links && it.links[0]; }).slice(0, 6).map(function (it) {
            var d = it.data[0], thumb = it.links[0].href;
            return { thumb: thumb, full: thumb.replace("~thumb", "~medium"), title: d.title || "", nasaId: d.nasa_id, date: (d.date_created || "").slice(0, 10), desc: d.description || "", center: d.center || "" };
          }));
        }, fail);
      },
      lightbox: function (items, i) { photoItems = items; openLightbox(i); }
    });
    if (window.PHOTOS) PHOTOS.init({
      T: T, esc: esc, loc: loc, fmtDate: fmtDate, objects: function () { return OBJ; }, byId: function (id) { return byId[id]; },
      lightbox: function (items, i) { photoItems = items; openLightbox(i); },
      go: function (id, onMap) { closeLightbox(); select(id); restoreHash(); if (onMap) explore3d(byId[id]); }
    });
    if (window.FR) FR.init({
      T: T, esc: esc, loc: loc, fmtDate: fmtDate, byId: function (id) { return byId[id]; }, nasaFetch: nasaFetch,
      lightbox: function (items, i) { photoItems = items; openLightbox(i); },
      go: function (id, three) { closeLightbox(); select(id); restoreHash(); if (three) explore3d(byId[id]); },
      hasModel: function (id) { return !!(byId[id] && modelKind(byId[id])); },
      hasBA: function (id) { return !!(window.BA && BA.hasKey(id)); }, openBA: function (o) { BA.open(o); },
      openTimeline: function (o) { showRoute("timeline", o.planet); restoreHash(); if (window.MTL) MTL.pickMission(o.planet + ":" + o.mission); },
      hasJourney: function () { return !!window.MJ; }, openJourney: function (o) { MJ.open(MJ.key(o)); },
      hasArch: function () { return !!window.ARCH; }, openArch: function (o) { openArch(o); },
      hasPhotos: function () { return !!window.PHOTOS; },
      openPhotos: function (o) { showRoute("photos"); restoreHash(); if (PHOTOS.focus) PHOTOS.focus(o.planet, o.mission); }
    });
    if (window.AR) AR.init({
      T: T, esc: esc, loc: loc, fmtDate: fmtDate, objects: function () { return OBJ; },
      statusColor: function (o) { return ST[o.status].color; },
      tiles: function (b) { return BODIES[b].layers.slice(); },
      go: function (id) { select(id); restoreHash(); }   // the museum has no per-object URL: this opens the object on its map
    });
    if (window.STATS) STATS.init({
      T: T, esc: esc, loc: loc, typeLabel: typeLabel, objects: function () { return OBJ; }, reduce: function () { return reduce; },
      go: function (id, three) { select(id); restoreHash(); if (three) explore3d(byId[id]); }
    });
    if (window.MCMP) MCMP.init({
      T: T, esc: esc, loc: loc, typeLabel: typeLabel, objects: function () { return OBJ; }, nasaFetch: nasaFetch,
      go: function (id, three) { select(id); restoreHash(); if (three) explore3d(byId[id]); }
    });
    if (window.IMP) IMP.init({
      T: T, esc: esc, loc: loc, byId: function (id) { return byId[id]; }, planet: function () { return planet; },
      reduce: function () { return reduce; }, nasaFetch: nasaFetch,
      go: function (id) { select(id); restoreHash(); }
    });
    if (window.ARCH) ARCH.init({
      T: T, esc: esc, fmtDate: fmtDate, loc: loc, coords: fmtCoord, objects: function () { return OBJ; },
      mission: function (o) { return loc(o).mission; }, mode: function () { return mode; },
      setPlanet: function (p) { showRoute("archaeology", p); },
      refresh: function () { refresh(); },
      show: function (o, m) { if (mode !== m) setMode(m); select(o.id, { noCard: true }); },
      openObject: function (id) { var o = byId[id]; if (!o) return; showRoute(o.planet); restoreHash(); select(id); },
      openTimeline: function (o) { showRoute("timeline", o.planet); restoreHash(); if (window.MTL) MTL.pickMission(o.planet + ":" + o.mission); },
      hasJourney: function () { return !!window.MJ; }, openJourney: function (o) { MJ.open(MJ.key(o)); },
      photos: function (q, ok, fail) {
        nasaFetch(q, "image", 12, function (all) {
          ok(all.filter(function (it) { return it.links && it.links[0]; }).slice(0, 6).map(function (it) {
            var d = it.data[0], thumb = it.links[0].href;
            return { thumb: thumb, full: thumb.replace("~thumb", "~medium"), title: d.title || "", nasaId: d.nasa_id, date: (d.date_created || "").slice(0, 10), desc: d.description || "", center: d.center || "" };
          }));
        }, fail);
      },
      lightbox: function (items, i) { photoItems = items; openLightbox(i); }
    });
    if (window.MJ) MJ.init({
      T: T, esc: esc, fmtDate: fmtDate, loc: loc, coords: fmtCoord, reduce: function () { return reduce; }, objects: function () { return OBJ; },
      mission: function (o) { return loc(o).mission; }, nasa: nasaFetch,
      lightbox: function (items, i) { photoItems = items; openLightbox(i); },
      openObject: function (id) { restoreHash(); select(id); },
      go: function (o, m) {
        restoreHash();
        if (route === "timeline") { if (o.planet !== planet) showRoute("timeline", o.planet); }
        else if (o.planet !== planet || route !== o.planet) showRoute(o.planet);
        if (mode !== m) setMode(m);
        select(o.id);
      },
      onState: function (open, silent) {
        document.querySelectorAll(".nav a").forEach(function (x) { x.classList.toggle("on", open ? x.dataset.route === "journey" : x.dataset.route === route); });
        if (open) { if (location.hash !== "#journey") try { history.replaceState(null, "", "#journey"); } catch (e) { /* ignore */ } }
        else if (!silent) restoreHash();
      }
    });
    if (window.BA) BA.init({
      T: T, esc: esc, fmtDate: fmtDate, name: function (o) { return loc(o).name; }, mission: function (o) { return loc(o).mission; },
      show3d: function (o) {
        if (route === "timeline") { if (o.planet !== planet) showRoute("timeline", o.planet); }
        else if (o.planet !== planet || route !== o.planet) showRoute(o.planet);
        if (mode !== "3d") setMode("3d");
        select(o.id);
      },
      details: function (o) { detailsOpen = true; if (selectedId === o.id && !$("#card").hidden) { syncDetails(); } else select(o.id); }
    });
    $("#card").addEventListener("click", function (e) { var b = e.target.closest("[data-i]"); if (b) openLightbox(+b.dataset.i); });
    $("#lb-close").addEventListener("click", closeLightbox);
    $("#lb-fs").addEventListener("click", function () {
      var lb = $("#lightbox");
      try { if (document.fullscreenElement) document.exitFullscreen(); else if (lb.requestFullscreen) lb.requestFullscreen(); } catch (e) { /* not allowed */ }
    });
    $("#lb-prev").addEventListener("click", function () { stepLightbox(-1); });
    $("#lb-next").addEventListener("click", function () { stepLightbox(1); });
    $("#lightbox").addEventListener("click", function (e) { if (e.target.id === "lightbox") closeLightbox(); });
    document.addEventListener("keydown", function (e) {
      if ($("#lightbox").hidden) return;
      if (e.key === "ArrowLeft") stepLightbox(-1); else if (e.key === "ArrowRight") stepLightbox(1);
    });
    window.addEventListener("hashchange", onHash);
    onHash();
    // PWA (AR table): offline cache of the site files. Service workers need HTTPS or localhost.
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register("sw.js").catch(function () { /* the site works without it */ });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
