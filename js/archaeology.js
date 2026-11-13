/* Space Archaeology: a catalogue of physical traces of human activity on the Moon and Mars.
 * Every entry states HOW it is known:
 *   direct        - the trace itself is identified in images / measurements described in the cited sources;
 *   archive       - documented in mission records, photographs or NASA tables; confirmation from orbit was not checked;
 *   reconstructed - position or form is inferred from records or from a feature that is not itself resolved.
 * These classes are assigned by this project from the listed sources (they are not official NASA categories).
 * Coordinates are never invented: a marker is always the position of an existing object from data.js (with its own accuracy
 * level); traces whose location is not known are listed but not plotted ("pos: none").
 * Host interface (app.js): T, esc, fmtDate, loc, mission, objects, planet, setPlanet, refresh, show, openObject, openTimeline,
 *   hasJourney, openJourney, photos, lightbox. */
(function () {
  "use strict";

  var host = null, byId = {};
  var st = { planet: "moon", cat: "", ev: "", q: "", sel: null, tok: 0, list: [], all: null };

  function $(s, r) { return (r || document).querySelector(s); }
  function T(k, v) { return host.T(k, v); }
  function esc(s) { return host.esc(s); }

  /* ---------- verified references (pages that were opened while building the catalogue, or listed in data.js) ---------- */
  var REF = {
    lroc16: ["LROC / ASU: 2016 Coordinates of Human Features on the Moon (PDF)", "https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf"],
    nss: ["NASA NSSDCA: Apollo Lunar Landings 1969-1972", "https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloland.html"],
    asu: ["ASU News: New LROC images offer sharper views of Apollo 12, 14, 17 sites", "https://news.asu.edu/content/new-lroc-images-offer-sharper-views-apollo-12-14-17-sites"],
    luno: ["The Planetary Society: Lunokhod 1 path in an LROC image", "https://www.planetary.org/multimedia/space-images/earth/lunokhod-1-path-lroc.html"],
    sd: ["ScienceDaily (2010): Russian lunar rover found", "https://www.sciencedaily.com/releases/2010/03/100316164950.htm"],
    pia24333: ["NASA/JPL PIA24333: Perseverance and Mars 2020 spacecraft components on the surface", "https://www.jpl.nasa.gov/images/pia24333-perseverance-and-mars-2020-spacecraft-components-on-the-surface/"],
    pia15696: ["NASA/JPL PIA15696: Orbiter view of Curiosity from nearly straight overhead", "https://www.jpl.nasa.gov/images/pia15696-orbiter-view-of-curiosity-from-nearly-straight-overhead/"],
    hrCur: ["HiRISE ESP_028612_1755: Curiosity on the Move", "https://www.uahirise.org/ESP_028612_1755"],
    hrPhx: ["HiRISE PSP_008855_2485: Phoenix Lander and Hardware", "https://www.uahirise.org/PSP_008855_2485"],
    hrIns: ["HiRISE ESP_058005_1845: InSight Lander on Mars", "https://www.uahirise.org/ESP_058005_1845"],
    hrOpp: ["HiRISE ESP_011765_1780: Opportunity Imaged by HiRISE", "https://www.uahirise.org/ESP_011765_1780"],
    viking: ["NASA NSSDCA: Viking mission", "https://nssdc.gsfc.nasa.gov/planetary/viking.html"]
  };
  /* how each kind of evidence is established: orbital instrument (null if not confirmed), observation date, references */
  var OB = {
    surface: { orbit: null, refs: [] },
    lrocTrails: { orbit: "LROC", refs: ["asu"] },
    lrocTracks: { orbit: "LROC", refs: ["asu"] },
    traverse: { orbit: null, refs: ["nss"] },
    lunoRoute: { orbit: null, refs: ["luno"] },
    hiriseTrkCur: { orbit: "HiRISE", when: "2012-09-02", refs: ["hrCur"] },
    hiriseTrkOpp: { orbit: "HiRISE", when: "2009-01-29", refs: ["hrOpp"] },
    lrocCable: { orbit: null, partial: "LROC", refs: ["asu"] },
    alsep: { orbit: null, refs: [] },
    laser: { orbit: null, refs: ["sd"] },
    seis: { orbit: null, refs: [] },
    lrocLm: { orbit: "LROC", refs: ["lroc16", "nss"] },
    lrocRover: { orbit: "LROC", refs: ["lroc16", "nss"] },
    lrocSivb: { orbit: "LROC", refs: ["lroc16"] },
    table: { orbit: null, refs: ["nss"] },
    hirisePhx: { orbit: "HiRISE", when: "2008-06-16", refs: ["hrPhx"] },
    hirisePhxLs: { orbit: "HiRISE", when: "2008-06-16", refs: ["hrPhx"] },
    hiriseCur: { orbit: "HiRISE", when: "2012-08-17", refs: ["pia15696"] },
    hiriseCurLs: { orbit: "HiRISE", when: "2012-08-17", refs: ["pia15696", "hrCur"] },
    hiriseIns: { orbit: "HiRISE", when: "2018-12-11", refs: ["hrIns"] },
    hiriseInsLs: { orbit: "HiRISE", when: "2018-12-11", refs: ["hrIns"] },
    hirisePer: { orbit: "HiRISE", when: "2021-02-19", refs: ["pia24333"] },
    hiriseOpp: { orbit: "HiRISE", when: "2009-01-29", refs: ["hrOpp"] }
  };

  /* ---------- the catalogue ----------
   * E(id, cat, kind, evidence, basis, anchors (objects whose own position carries the marker), position meaning, related (objects without a marker), photo query)
   * pos: "object" = the marker is the object's own position; "site" = the marker is the landing site / parked position of the related object;
   *      "none"   = not plotted. */
  var LM = ["apollo-11-lm", "apollo-12-lm", "apollo-14-lm", "apollo-15-lm", "apollo-16-lm", "apollo-17-lm"];
  var C = [];
  function E(id, cat, kind, ev, ob, a, pos, rel, q) { C.push({ id: id, cat: cat, kind: kind, ev: ev, ob: ob, a: a || [], pos: pos, rel: rel || [], q: q }); }

  // Human Footprints (the marker is the Lunar Module position, not a footprint)
  [["11", "archive", "surface"], ["12", "direct", "lrocTrails"], ["14", "direct", "lrocTrails"], ["15", "archive", "surface"], ["16", "archive", "surface"], ["17", "direct", "lrocTrails"]].forEach(function (r) {
    E("fp-a" + r[0], "fp", "fp", r[1], r[2], ["apollo-" + r[0] + "-lm"], "site", [], "Apollo " + r[0] + (r[0] === "11" ? " bootprint" : " astronaut tracks"));
  });
  // Rover Tracks
  E("rt-a15", "rt", "lrvtrk", "archive", "traverse", ["apollo-15-lrv"], "site", [], "Apollo 15 lunar rover tracks");
  E("rt-a16", "rt", "lrvtrk", "archive", "traverse", ["apollo-16-lrv"], "site", [], "Apollo 16 lunar rover tracks");
  E("rt-a17", "rt", "lrvtrk", "direct", "lrocTracks", ["apollo-17-lrv"], "site", [], "Apollo 17 lunar rover tracks");
  E("rt-luno", "rt", "lunotrk", "reconstructed", "lunoRoute", ["lunokhod-1"], "site", [], "Lunokhod 1 traverse");
  E("rt-cur", "rt", "marstrk", "direct", "hiriseTrkCur", [], "none", ["curiosity"], "Curiosity rover tracks HiRISE");
  E("rt-opp", "rt", "marstrk", "direct", "hiriseTrkOpp", [], "none", ["opportunity"], "Opportunity rover tracks");
  // Landing Sites
  LM.forEach(function (id) { E("ls-" + id, "ls", "site", "direct", "lrocLm", [id], "object", [], id.replace("-lm", "").replace("apollo-", "Apollo ") + " landing site"); });
  [["surveyor-3", "archive", "table", "Surveyor 3 landing site"], ["luna-16", "archive", "table", "Luna 16 landing site"], ["luna-17", "archive", "table", "Luna 17 Lunokhod landing"],
    ["chandrayaan-3", "archive", "table", "Chandrayaan-3 landing site"], ["viking-1", "archive", "table", "Viking 1 landing site"], ["viking-2", "archive", "table", "Viking 2 landing site"],
    ["pathfinder", "archive", "table", "Mars Pathfinder landing site"], ["spirit", "archive", "table", "Spirit rover landing site"], ["opportunity", "archive", "table", "Opportunity rover landing site"],
    ["phoenix", "direct", "hirisePhxLs", "Phoenix lander landing site"], ["curiosity", "direct", "hiriseCurLs", "Curiosity landing site Gale crater"], ["insight", "direct", "hiriseInsLs", "InSight lander landing site"],
    ["perseverance", "direct", "hirisePer", "Perseverance landing site Jezero"]].forEach(function (r) { E("ls-" + r[0], "ls", "site", r[1], r[2], [r[0]], "object", [], r[3]); });
  // Scientific Instruments
  E("si-cable", "si", "cable", "reconstructed", "lrocCable", ["apollo-12-lm"], "site", [], "Apollo 12 ALSEP");
  E("si-alsep", "si", "alsep", "archive", "alsep", LM, "site", [], "Apollo lunar surface experiments package ALSEP");
  E("si-reflector", "si", "reflector", "direct", "laser", ["lunokhod-1"], "site", [], "Lunokhod retroreflector");
  E("si-seis", "si", "seis", "archive", "seis", ["insight"], "site", [], "InSight SEIS seismometer");
  // Abandoned Hardware
  E("ah-lm", "ah", "lmstage", "direct", "lrocLm", LM, "object", [], "Apollo Lunar Module descent stage on the Moon");
  E("ah-lrv", "ah", "lrv", "direct", "lrocRover", ["apollo-15-lrv", "apollo-16-lrv", "apollo-17-lrv"], "object", [], "Apollo lunar roving vehicle");
  [["surveyor-3", "archive", "table"], ["lunokhod-1", "archive", "table"], ["luna-16", "archive", "table"], ["luna-17", "archive", "table"], ["chandrayaan-3", "archive", "table"],
    ["viking-1", "archive", "table"], ["viking-2", "archive", "table"], ["pathfinder", "archive", "table"], ["spirit", "archive", "table"], ["opportunity", "direct", "hiriseOpp"],
    ["phoenix", "direct", "hirisePhx"], ["insight", "direct", "hiriseIns"], ["ingenuity", "archive", "table"]].forEach(function (r) { E("ah-" + r[0], "ah", "hw", r[1], r[2], [r[0]], "object", [], null); });
  // Mission Debris
  E("md-sivb14", "md", "sivb", "direct", "lrocSivb", ["apollo-14-sivb"], "object", [], "Apollo 14 S-IVB impact");
  E("md-sivb17", "md", "sivb", "direct", "lrocSivb", ["apollo-17-sivb"], "object", [], "Apollo 17 S-IVB impact");
  E("md-phx", "md", "edl", "direct", "hirisePhx", ["phoenix"], "site", [], "Phoenix parachute heat shield");
  E("md-cur", "md", "edlcrane", "direct", "hiriseCur", ["curiosity"], "site", [], "Curiosity parachute heat shield descent stage");
  E("md-ins", "md", "edl", "direct", "hiriseIns", ["insight"], "site", [], "InSight heat shield parachute");
  E("md-per", "md", "edlcrane", "direct", "hirisePer", ["perseverance"], "site", [], "Perseverance parachute backshell descent stage");

  var CATS = ["fp", "rt", "ls", "si", "ah", "md"], EVS = ["direct", "archive", "reconstructed"];
  var EVC = { direct: "var(--active)", archive: "var(--ended)", reconstructed: "var(--left)" };

  /* ---------- derived data ---------- */
  function obj(id) { return byId[id]; }
  function base(e) { return obj(e.a[0] || e.rel[0]); }
  function planetOf(e) { return base(e).planet; }
  function view(e) {
    var b = base(e), m = host.mission(b), n = host.loc(b).name;
    return { name: T("ar.n." + e.kind, { m: m, n: n }), origin: T("ar.o." + e.kind, { m: m, n: n }), how: T("ar.b." + e.ob), mission: m };
  }
  function passEntry(e) {
    if (planetOf(e) !== st.planet) return false;
    if (st.cat && e.cat !== st.cat) return false;
    if (st.ev && e.ev !== st.ev) return false;
    if (st.q) { var v = view(e), hay = (v.name + " " + v.mission + " " + v.origin + " " + T("ar.cat." + e.cat)).toLowerCase(); if (hay.indexOf(st.q) === -1) return false; }
    return true;
  }
  function list() { return C.filter(passEntry); }
  function entry(id) { return C.filter(function (e) { return e.id === id; })[0]; }
  function pass(o) { return C.some(function (e) { return e.pos !== "none" && e.a.indexOf(o.id) !== -1 && passEntry(e); }); }
  function plotted() { var s = {}; list().forEach(function (e) { if (e.pos !== "none") e.a.forEach(function (id) { s[id] = 1; }); }); return Object.keys(s).length; }

  /* ---------- UI ---------- */
  function controls() {
    $("#ar-planet").querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.p === st.planet ? "true" : "false"); b.textContent = T("body." + b.dataset.p); });
    $("#ar-cat").innerHTML = '<option value="">' + esc(T("ar.catAll")) + "</option>" + CATS.map(function (c) { return '<option value="' + c + '"' + (st.cat === c ? " selected" : "") + ">" + esc(T("ar.cat." + c)) + "</option>"; }).join("");
    $("#ar-ev").innerHTML = '<option value="">' + esc(T("ar.evAll")) + "</option>" + EVS.map(function (c) { return '<option value="' + c + '"' + (st.ev === c ? " selected" : "") + ">" + esc(T("ar.ev." + c)) + "</option>"; }).join("");
  }
  function renderList() {
    var L = list(), total = C.filter(function (e) { return planetOf(e) === st.planet; }).length, h = "";
    st.list = L;
    $("#ar-count").textContent = T("ar.count", { n: L.length, m: total }) + " · " + T("ar.plotted", { n: plotted() });
    if (!L.length) h = '<li class="ar-empty note">' + esc(T("ar.empty")) + "</li>";
    CATS.forEach(function (c) {
      var part = L.filter(function (e) { return e.cat === c; });
      if (!part.length) return;
      h += '<li class="ar-grp" role="presentation"><h4>' + esc(T("ar.cat." + c)) + '</h4><p class="note">' + esc(T("ar.catd." + c)) + "</p></li>";
      part.forEach(function (e) {
        h += '<li><button type="button" class="ar-item' + (st.sel === e.id ? " on" : "") + '" data-id="' + esc(e.id) + '" style="--c:' + EVC[e.ev] + '"><b>' + esc(view(e).name) + '</b><span class="ar-ev">' + esc(T("ar.ev." + e.ev)) + (e.pos === "none" ? " · —" : "") + "</span></button></li>";
      });
    });
    $("#ar-list").innerHTML = h;
  }
  function renderAll() { controls(); renderList(); }

  function badge(e) { return '<span class="badge" style="--c:' + EVC[e.ev] + '">' + esc(T("ar.ev." + e.ev)) + "</span>"; }
  function refsOf(e) {
    var seen = {}, out = [];
    function add(t, u) { if (u && !seen[u]) { seen[u] = 1; out.push([t, u]); } }
    (OB[e.ob].refs || []).forEach(function (k) { add(REF[k][0], REF[k][1]); });
    e.a.concat(e.rel).forEach(function (id) { (obj(id).sources || []).forEach(function (s) { add(s.t, s.u); }); });
    return out;
  }
  function panel(e) {
    var p = $("#acard"), v = view(e), ob = OB[e.ob], b = base(e), rel = e.a.concat(e.rel.filter(function (x) { return e.a.indexOf(x) === -1; }));
    var acc = e.a.length ? T("acc." + obj(e.a[0]).accuracy.level) : "";
    var rows = [[T("ar.k.cat"), T("ar.cat." + e.cat)], [T("ar.k.ev"), T("ar.ev." + e.ev)]];
    var orbit = ob.orbit ? T("ar.orb.yes", { what: ob.orbit }) : T("ar.orb.no");
    if (ob.partial) orbit = T("ar.orb.partial", { what: ob.partial });
    rows.push([T("ar.k.orbit"), orbit]);
    if (ob.when) rows.push([T("ar.k.obs"), host.fmtDate(ob.when)]);
    rows.push([T("ar.k.mission"), v.mission]);
    var objs = rel.map(function (id) {
      var o = obj(id), l = host.loc(o);
      return "<li><div><b>" + esc(l.name) + '</b><span class="mc-m">' + esc(l.type) + " · " + esc(T("status." + o.status)) + '</span><span class="mono mc-m">' + esc(host.coords(o)) + ' · ' + esc(T("acc." + o.accuracy.level)) + '</span></div>' +
        '<div class="ar-oact">' + (e.pos !== "none" && e.a.length > 1 ? '<button class="ghost" data-fly="' + esc(id) + '">' + esc(T("ar.btn.3d")) + "</button>" : "") + '<button class="ghost" data-oid="' + esc(id) + '">' + esc(T("ar.btn.obj")) + "</button></div></li>";
    }).join("");
    var posNote = e.pos === "object" ? T("ar.pos.object", { acc: acc }) : e.pos === "site" ? T("ar.pos.site", { acc: acc }) : T("ar.pos.none");
    var refs = refsOf(e), search = "https://images.nasa.gov/search?q=" + encodeURIComponent(e.q || host.loc(b).name);
    var site = e.pos === "none";
    p.innerHTML = '<button class="ghost close" id="ar-close">' + esc(T("ar.btn.close")) + '</button><div class="reveal instant">' +
      "<div>" + badge(e) + '</div><h3>' + esc(v.name) + '</h3><p class="mc-sub">' + esc(T("ar.cat." + e.cat)) + " · " + esc(T("body." + planetOf(e))) + "</p>" +
      '<p class="ar-evd">' + esc(T("ar.evd." + e.ev)) + "</p>" +
      '<dl class="kv">' + rows.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + "</dl>" +
      "<h4>" + esc(T("ar.k.origin")) + "</h4><p>" + esc(v.origin) + "</p>" +
      "<h4>" + esc(T("ar.k.how")) + "</h4><p>" + esc(v.how) + "</p>" +
      "<h4>" + esc(T("ar.k.pos")) + '</h4><p class="note ar-pos">' + esc(posNote) + "</p>" +
      "<h4>" + esc(T("ar.k.ctx")) + "</h4><p>" + esc(T("ar.ctx." + e.cat)) + "</p>" + (host.loc(b).desc ? '<p class="note">' + esc(host.loc(b).mission + ": " + host.loc(b).desc) + "</p>" : "") +
      "<h4>" + esc(T("ar.k.rel")) + '</h4><ul class="mc-objs">' + objs + "</ul>" +
      "<h4>" + esc(T("card.photos")) + '</h4><div class="photos" id="ar-photos"><p class="note">' + esc(T("photos.loading")) + "</p></div>" +
      '<div class="cactions"><button class="cta small" id="ar-2d">' + esc(T(site ? "ar.btn.2dSite" : "ar.btn.2d")) + '</button><button class="cta small alt" id="ar-3d">' + esc(T(site ? "ar.btn.3dSite" : "ar.btn.3d")) + "</button>" +
      '<button class="cta small alt" id="ar-tl">' + esc(T("ar.btn.tl")) + "</button>" + (host.hasJourney() ? '<button class="cta small alt" id="ar-mj">' + esc(T("mj.open")) + "</button>" : "") + "</div>" +
      '<div class="links"><h4>' + esc(T("ar.k.src")) + '</h4><ul class="facts">' + refs.map(function (r) { return '<li><a href="' + esc(r[1]) + '" target="_blank" rel="noopener">' + esc(r[0]) + "</a></li>"; }).join("") +
      '<li><a href="' + esc(search) + '" target="_blank" rel="noopener">' + esc(T("ar.nasaSearch")) + "</a></li></ul></div></div>";
    p.hidden = false; p.scrollTop = 0; void p.offsetWidth; p.classList.add("in");
    var tgt = obj(e.a[0] || e.rel[0]);
    $("#ar-close").addEventListener("click", closePanel);
    $("#ar-2d").addEventListener("click", function () { host.show(tgt, "2d"); });
    $("#ar-3d").addEventListener("click", function () { host.show(tgt, "3d"); });
    $("#ar-tl").addEventListener("click", function () { host.openTimeline(tgt); });
    if ($("#ar-mj")) $("#ar-mj").addEventListener("click", function () { host.openJourney(tgt); });
    var tok = ++st.tok;
    host.photos(e.q || host.loc(b).name, function (items) {
      var box = $("#ar-photos"); if (tok !== st.tok || !box) return;
      st.photos = items;
      box.innerHTML = items.length ? items.map(function (it, i) { return '<figure><button class="ph-btn" data-i="' + i + '"><img loading="lazy" src="' + esc(it.thumb) + '" alt="' + esc(it.title) + '"></button><figcaption>' + esc(it.title) + "</figcaption></figure>"; }).join("") +
        '<p class="note" style="grid-column:1/-1">' + esc(T("ar.photoNote", { q: e.q || host.loc(b).name })) + "</p>" : '<p class="note">' + esc(T("ar.noPhotos")) + "</p>";
    }, function () { var box = $("#ar-photos"); if (tok === st.tok && box) box.innerHTML = '<p class="note">' + esc(T("ar.noPhotos")) + "</p>"; });
  }
  function closePanel() { var p = $("#acard"); if (!p) return; p.classList.remove("in"); p.hidden = true; st.tok++; st.sel = null; var on = $("#ar-list .on"); if (on) on.classList.remove("on"); }
  function choose(id, noFly) {
    var e = entry(id); if (!e) return;
    st.sel = id;
    var cur = $("#ar-list .on"); if (cur) cur.classList.remove("on");
    var it = $('#ar-list [data-id="' + id + '"]'); if (it) { it.classList.add("on"); try { it.scrollIntoView({ block: "nearest" }); } catch (x) { /* ignore */ } }
    panel(e);
    if (!noFly && e.a.length && e.pos !== "none") host.show(obj(e.a[0]), host.mode ? host.mode() : "2d", true);
  }
  function syncSelected(oid) {
    if (!st.open) return;
    var e = st.sel && entry(st.sel);
    if (e && e.a.indexOf(oid) !== -1) return;
    var f = list().filter(function (x) { return x.pos !== "none" && x.a.indexOf(oid) !== -1; })[0];
    if (f) choose(f.id, true);
  }
  function setFilter(k, v) { st[k] = v; closePanel(); renderAll(); host.refresh(); }

  function wire() {
    $("#ar-planet").addEventListener("click", function (e) { var b = e.target.closest("button[data-p]"); if (!b || b.dataset.p === st.planet) return; st.planet = b.dataset.p; st.cat = st.cat; closePanel(); host.setPlanet(b.dataset.p); });
    $("#ar-cat").addEventListener("change", function (e) { setFilter("cat", e.target.value); });
    $("#ar-ev").addEventListener("change", function (e) { setFilter("ev", e.target.value); });
    $("#ar-q").addEventListener("input", function (e) { st.q = e.target.value.trim().toLowerCase(); renderList(); host.refresh(); });
    $("#ar-list").addEventListener("click", function (e) { var b = e.target.closest("[data-id]"); if (b) choose(b.dataset.id); });
    $("#acard").addEventListener("click", function (e) {
      var o = e.target.closest("[data-oid]"), f = e.target.closest("[data-fly]"), ph = e.target.closest(".ph-btn");
      if (o) host.openObject(o.dataset.oid);
      else if (f) host.show(obj(f.dataset.fly), "3d");
      else if (ph && st.photos) host.lightbox(st.photos, +ph.dataset.i);
    });
  }

  function init(h) {
    host = h; host.objects().forEach(function (o) { byId[o.id] = o; });
    // every anchor / related id must exist in data.js: otherwise the entry is dropped rather than invented
    C = C.filter(function (e) { return e.a.concat(e.rel).every(function (id) { return !!byId[id]; }); });
    if (!$("#archside")) return;
    wire(); renderAll();
  }
  function show(pl) { st.open = true; if (pl) st.planet = pl; $("#archside").hidden = false; renderAll(); }
  function hide() { st.open = false; var s = $("#archside"); if (s) s.hidden = true; closePanel(); }
  function render() { if (!host || !$("#archside")) return; var sel = st.sel; renderAll(); if (st.open && sel && entry(sel) && !$("#acard").hidden) { st.sel = sel; var it = $('#ar-list [data-id="' + sel + '"]'); if (it) it.classList.add("on"); panel(entry(sel)); } }
  function focusObject(oid, pl) { // used by other sections: show the first trace tied to an object
    var o = byId[oid]; if (!o) return false;
    st.planet = o.planet; st.cat = ""; st.ev = ""; st.q = ""; if ($("#ar-q")) $("#ar-q").value = "";
    var e = C.filter(function (x) { return x.a.concat(x.rel).indexOf(oid) !== -1 && x.cat === "ls"; })[0] || C.filter(function (x) { return x.a.concat(x.rel).indexOf(oid) !== -1; })[0];
    return e ? e.id : null;
  }

  window.ARCH = { init: init, show: show, hide: hide, render: render, pass: pass, closePanel: closePanel, syncSelected: syncSelected, choose: choose, focusObject: focusObject,
    planet: function () { return st.planet; }, isOpen: function () { return !!st.open; },
    state: function () { return { planet: st.planet, cat: st.cat, ev: st.ev, q: st.q, sel: st.sel, shown: st.list.map(function (e) { return e.id; }) }; },
    _entries: function () { return C.map(function (e) { return { id: e.id, cat: e.cat, ev: e.ev, pos: e.pos, a: e.a, rel: e.rel, ob: e.ob, planet: planetOf(e), name: view(e).name }; }); } };
})();
