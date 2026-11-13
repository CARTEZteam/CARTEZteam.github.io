/* Environmental Impact: educational section about how left-behind hardware interacts with the surface of the Moon and Mars.
 *
 * Honesty rules:
 *  - "Scientific Facts" hold only statements taken from a listed source (SRC); the wording is the project's paraphrase.
 *  - Assessment lines are labelled by the project: real (documented effect), potential (plausible, not measured here),
 *    hyp (hypothesis / disputed), gap (no verified data used). No claim that all equipment is equally threatening.
 *  - Illustrations are schematic drawings by the project. Photographs are fetched live from the NASA Image and Video Library.
 *  - Equipment links point only to objects that exist in window.OBJECTS.
 * Public API: window.IMP = { init, show, hide, render, state, open, setPlanet, _topics }. */
(function () {
  "use strict";
  var H = null, planet = "moon", topic = null, shownOnce = false, photoTok = 0;

  var SRC = {
    lroc: { t: "LROC / ASU: 2016 Coordinates of Human Features on the Moon (PDF)", u: "https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf" },
    list: { t: "List of artificial objects on Mars (summary table, cites NSSDC)", u: "https://en.wikipedia.org/wiki/List_of_artificial_objects_on_Mars" },
    temp: { t: "Space.com: What is the temperature of the Moon? (NASA figures, LRO Diviner)", u: "https://www.space.com/18175-moon-temperature.html" },
    s3: { t: "Wikipedia: Surveyor 3", u: "https://en.wikipedia.org/wiki/Surveyor_3" },
    s3n: { t: "NASA Science: Apollo 12 and Surveyor 3", u: "https://science.nasa.gov/resource/apollo-12-and-surveyor-3/" },
    marsT: { t: "Universe Today: How cold is Mars? (cites NASA fact sheets)", u: "https://universetoday.com/14705/how-cold-is-mars" },
    phx: { t: "Mars Daily (AFP): Phoenix probe mission on Mars ends", u: "https://www.marsdaily.com/reports/Phoenix_probe_mission_on_Mars_ends_NASA_999.html" },
    rad: { t: "Space.com: Radiation on Mars 'manageable' (Curiosity RAD, Science, Dec 2013)", u: "https://space.com/23875-mars-radiation-life-manned-mission.html" },
    dust: { t: "Space.com: Moon dust could be a problem for future lunar explorers", u: "https://www.space.com/moon-dust-problem-lunar-exploration.html" },
    ins: { t: "Spaceflight Now: InSight lander bows out (21 Dec 2022)", u: "https://spaceflightnow.com/2022/12/21/nasas-insight-lander-bows-out-after-ground-shaking-mars-mission/" },
    lro: { t: "NASA: Lunar Reconnaissance Orbiter looks at Apollo 12 / Surveyor 3 landing sites", u: "https://www.nasa.gov/missions/lunar-reconnaissance-orbiter-looks-at-apollo-12-surveyor-3-landing-sites/" },
    lroc609: { t: "LROC: Surveyor Crater, before and after", u: "https://lroc.im-ldi.com/images/609" },
    live: { t: "Live Science: Moon microbe mystery finally solved (2011)", u: "https://www.livescience.com/13999-moon-microbe-mystery-solved-apollo-12.html" },
    astro: { t: "NASA Astrobiology: Planetary protection is a wicked problem", u: "https://astrobiology.nasa.gov/news/planetary-protection-is-a-wicked-problem/" },
    nas: { t: "National Academies (2021): Mars planetary protection, Appendix C", u: "https://www.nationalacademies.org/read/26336/chapter/11" },
    jpl: { t: "NASA/JPL: Scars on Mars from 2012 rover landing fade, usually", u: "https://www.jpl.nasa.gov/news/scars-on-mars-from-2012-rover-landing-fade-usually/" }
  };

  // item: [key, class, planet, source refs]; class "fact" = Scientific Facts, others = Assessment.
  var TOPICS = [
    { id: "debris", p: "d", items: [["f1", "fact", "moon", ["lroc"]], ["f2", "fact", "mars", ["list"]], ["r1", "real", "both", ["lroc", "list"]], ["r2", "potential", "both", []]],
      ex: { moon: ["apollo-11-lm", "apollo-15-lrv", "apollo-14-sivb"], mars: ["viking-1", "spirit", "insight"] },
      q: { moon: "Apollo 11 landing site LRO", mars: "Viking lander Mars" } },
    { id: "temp", p: "t", items: [["f1", "fact", "moon", ["temp"]], ["f2", "fact", "moon", ["s3"]], ["f3", "fact", "mars", ["marsT"]], ["f4", "fact", "mars", ["phx"]], ["r1", "real", "moon", ["s3"]], ["r2", "potential", "both", []]],
      ex: { moon: ["surveyor-3"], mars: ["phoenix", "spirit"] },
      q: { moon: "lunar temperature Diviner LRO", mars: "Phoenix lander Mars winter" } },
    { id: "rad", p: "r", items: [["f1", "fact", "mars", ["rad"]], ["f2", "fact", "moon", ["s3"]], ["r1", "real", "moon", ["s3"]], ["r2", "potential", "both", []], ["g1", "gap", "moon", []]],
      ex: { moon: ["surveyor-3"], mars: ["curiosity"] },
      q: { moon: "Surveyor 3 Apollo 12 camera", mars: "Curiosity RAD radiation assessment detector" } },
    { id: "dust", p: "u", items: [["f1", "fact", "moon", ["dust"]], ["f2", "fact", "mars", ["ins"]], ["f3", "fact", "mars", ["list"]], ["r1", "real", "both", ["dust", "ins"]], ["r2", "potential", "both", []]],
      ex: { moon: ["apollo-17-lm", "apollo-17-lrv"], mars: ["insight", "opportunity"] },
      q: { moon: "Apollo 17 lunar dust", mars: "InSight lander dust solar panels" } },
    { id: "mat", p: "m", items: [["f1", "fact", "moon", ["lro"]], ["f2", "fact", "moon", ["s3", "s3n"]], ["r1", "real", "moon", ["s3", "lro"]], ["r2", "potential", "both", []], ["g1", "gap", "mars", []]],
      ex: { moon: ["surveyor-3", "apollo-12-lm"], mars: ["viking-2", "pathfinder"] },
      q: { moon: "Surveyor 3 Apollo 12 Conrad", mars: "Viking 2 lander Utopia Planitia" } },
    { id: "bio", p: "b", items: [["f1", "fact", "moon", ["live"]], ["f2", "fact", "mars", ["astro"]], ["r1", "hyp", "moon", ["live", "s3"]], ["r2", "potential", "mars", []]],
      ex: { moon: ["surveyor-3"], mars: ["viking-1", "phoenix"] },
      q: { moon: "Surveyor 3 camera returned", mars: "planetary protection clean room Mars spacecraft" } },
    { id: "pp", p: "p", items: [["f1", "fact", "mars", ["nas"]], ["f2", "fact", "mars", ["nas"]], ["f3", "fact", "mars", ["astro"]], ["r1", "real", "mars", ["nas"]], ["g1", "gap", "moon", []]],
      ex: { moon: [], mars: ["viking-1", "phoenix", "curiosity"] },
      q: { moon: "planetary protection spacecraft", mars: "Mars 2020 clean room spacecraft assembly" } },
    { id: "surf", p: "s", items: [["f1", "fact", "moon", ["lro", "lroc609"]], ["f2", "fact", "mars", ["jpl"]], ["f3", "fact", "mars", ["jpl"]], ["r1", "real", "both", ["lro", "jpl"]], ["r2", "potential", "both", []]],
      ex: { moon: ["apollo-12-lm", "surveyor-3"], mars: ["curiosity", "insight"] },
      q: { moon: "Apollo 12 Surveyor 3 LRO Intrepid", mars: "Curiosity landing site blast zone HiRISE" } }
  ];

  var ICON = { fact: "●", real: "●", potential: "◐", hyp: "?", gap: "○" };

  // ---- schematic illustrations (drawn by the project)
  function ill(id) {
    var g = '<line class="il-g" x1="8" y1="96" x2="232" y2="96"/>', b = "";
    if (id === "debris") b = g + '<rect class="il-fm" x="26" y="68" width="28" height="22"/><line class="il-g" x1="26" y1="90" x2="18" y2="96"/><line class="il-g" x1="54" y1="90" x2="62" y2="96"/>' +
      '<rect class="il-fa" x="96" y="80" width="34" height="8"/><circle class="il-g" cx="103" cy="91" r="5"/><circle class="il-g" cx="123" cy="91" r="5"/>' +
      '<ellipse class="il-g" cx="188" cy="96" rx="26" ry="6"/><polygon class="il-fm" points="176,94 184,88 188,95"/><polygon class="il-fm" points="196,95 204,90 206,96"/>';
    else if (id === "temp") b = g + '<circle class="il-fh" cx="46" cy="34" r="12"/><path class="il-g" d="M46 12v6M46 50v6M24 34h6M62 34h6M30 18l4 4M62 46l4 4M62 22l4-4M30 50l4-4"/>' +
      '<rect class="il-fh" x="118" y="22" width="26" height="74"/><rect class="il-fc" x="170" y="76" width="26" height="20"/><text x="125" y="14" class="il-t">+</text><text x="177" y="70" class="il-t">−</text>';
    else if (id === "rad") b = g + '<circle class="il-fa" cx="206" cy="20" r="11"/><path class="il-a" d="M60 6l0 68M60 74l-5-8M60 74l5-8M100 6l0 68M100 74l-5-8M100 74l5-8M140 6l0 68M140 74l-5-8M140 74l5-8M180 6l0 68M180 74l-5-8M180 74l5-8"/>' +
      '<rect class="il-fm" x="86" y="78" width="68" height="18"/>';
    else if (id === "dust") b = g + '<circle class="il-g" cx="90" cy="72" r="22"/><circle class="il-fm" cx="90" cy="72" r="4"/><path class="il-g" d="M90 50v44M68 72h44M74 56l32 32M106 56l-32 32"/>' +
      '<g class="il-fa"><circle cx="128" cy="84" r="2"/><circle cx="140" cy="76" r="2"/><circle cx="150" cy="88" r="2"/><circle cx="162" cy="80" r="2"/><circle cx="172" cy="90" r="2"/><circle cx="136" cy="92" r="2"/><circle cx="156" cy="68" r="2"/><circle cx="182" cy="82" r="2"/></g>';
    else if (id === "mat") b = g + '<rect class="il-fm" x="24" y="26" width="48" height="56" opacity="1"/><rect class="il-fm" x="96" y="26" width="48" height="56" opacity=".6"/><rect class="il-fm" x="168" y="26" width="48" height="56" opacity=".25"/>' +
      '<path class="il-a" d="M24 106h190M214 106l-6-4M214 106l-6 4"/>';
    else if (id === "bio") b = g + '<rect class="il-fm" x="80" y="36" width="60" height="46"/><g class="il-fa"><circle cx="92" cy="30" r="2.5"/><circle cx="108" cy="32" r="2.5"/><circle cx="124" cy="29" r="2.5"/><circle cx="100" cy="24" r="2.5"/></g>' +
      '<path class="il-a" d="M164 40c8-8 8 8 16 0s8 8 16 0M164 58c8-8 8 8 16 0s8 8 16 0M164 76c8-8 8 8 16 0s8 8 16 0"/>';
    else if (id === "pp") b = '<circle class="il-fc" cx="36" cy="60" r="22"/><circle class="il-fh" cx="204" cy="60" r="22" opacity=".8"/><rect class="il-fm" x="106" y="26" width="8" height="68"/><rect class="il-fm" x="126" y="26" width="8" height="68"/>' +
      '<path class="il-a" d="M62 60h40M138 60h40M172 60l-6-4M172 60l-6 4"/>';
    else if (id === "surf") b = g + '<ellipse class="il-g" cx="120" cy="96" rx="84" ry="9"/><ellipse class="il-fm" cx="120" cy="96" rx="26" ry="5"/><polygon class="il-fa" points="108,66 132,66 148,94 92,94" opacity=".4"/>' +
      '<polygon class="il-fm" points="104,40 136,40 142,64 98,64"/><line class="il-g" x1="100" y1="64" x2="86" y2="86"/><line class="il-g" x1="140" y1="64" x2="154" y2="86"/>';
    return '<svg viewBox="0 0 240 120" role="img" aria-label="' + H.esc(H.T("imp.i." + id)) + '">' + b + "</svg>";
  }

  function $(s) { return document.querySelector(s); }
  function T(k, v) { return H.T(k, v); }
  function esc(s) { return H.esc(s); }
  function T0(id) { for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i].id === id) return TOPICS[i]; return null; }
  function visible(it) { return it[2] === planet || it[2] === "both"; }
  function key(t, it) { return "imp." + t.p + "." + it[0]; }

  function chip(cls) {
    return '<span class="imp-cls c-' + cls + '" title="' + esc(T("imp.cd." + cls)) + '"><b aria-hidden="true">' + ICON[cls] + "</b>" + esc(T("imp.cls." + cls)) + "</span>";
  }
  function refsFor(t) {
    var order = [], idx = {};
    t.items.filter(visible).forEach(function (it) { it[3].forEach(function (r) { if (idx[r] == null) { idx[r] = order.length + 1; order.push(r); } }); });
    return { order: order, idx: idx };
  }
  function cites(it, R) {
    return it[3].length ? '<span class="imp-cite">' + it[3].map(function (r) { return '<a href="' + esc(SRC[r].u) + '" target="_blank" rel="noopener" title="' + esc(SRC[r].t) + '">[' + R.idx[r] + "]</a>"; }).join("") + "</span>" : "";
  }

  function renderTiles() {
    $("#imp-tiles").innerHTML = TOPICS.map(function (t) {
      var vis = t.items.filter(visible), cls = {};
      vis.forEach(function (it) { cls[it[1]] = 1; });
      return '<li><button type="button" class="imp-tile' + (topic === t.id ? " on" : "") + '" data-topic="' + t.id + '" aria-pressed="' + (topic === t.id) + '">' +
        '<span class="imp-tile-ill" aria-hidden="true">' + ill(t.id) + "</span>" +
        '<span class="imp-tile-t">' + esc(T("imp.t." + t.id + ".title")) + "</span>" +
        '<span class="imp-tile-l">' + esc(T("imp.t." + t.id + ".lede")) + "</span>" +
        '<span class="imp-tile-c">' + Object.keys(cls).map(function (c) { return '<i class="c-' + c + '" title="' + esc(T("imp.cls." + c)) + '">' + ICON[c] + "</i>"; }).join("") + "</span></button></li>";
    }).join("");
  }

  function renderDetail() {
    var el = $("#imp-detail"), t = topic && T0(topic);
    if (!t) { el.innerHTML = '<p class="note">' + esc(T("imp.pick")) + "</p>"; return; }
    var R = refsFor(t), vis = t.items.filter(visible);
    var facts = vis.filter(function (i) { return i[1] === "fact"; }), assess = vis.filter(function (i) { return i[1] !== "fact"; });
    var ex = (t.ex[planet] || []).filter(function (id) { return H.byId(id); });
    el.innerHTML =
      '<h3 id="imp-h">' + esc(T("imp.t." + t.id + ".title")) + ' <small>· ' + esc(T("body." + planet)) + "</small></h3>" +
      "<p>" + esc(T("imp.t." + t.id + ".lede")) + "</p>" +
      '<figure class="imp-fig">' + ill(t.id) + "<figcaption>" + esc(T("imp.illus")) + "</figcaption></figure>" +
      "<h4>" + esc(T("imp.assess")) + '</h4><ul class="imp-list">' + assess.map(function (it) {
        return '<li class="c-' + it[1] + '">' + chip(it[1]) + "<p>" + esc(T(key(t, it))) + cites(it, R) + "</p></li>";
      }).join("") + "</ul>" +
      '<section class="imp-facts" aria-labelledby="imp-fh"><h4 id="imp-fh">' + esc(T("imp.facts")) + '</h4><p class="note">' + esc(T("imp.factsNote")) + "</p>" +
      (facts.length ? '<ul class="imp-list">' + facts.map(function (it) { return '<li class="c-fact"><p>' + esc(T(key(t, it))) + cites(it, R) + "</p></li>"; }).join("") + "</ul>"
        : '<p class="note">' + esc(T("imp.cls.gap")) + "</p>") + "</section>" +
      "<h4>" + esc(T("imp.examples")) + "</h4>" + (ex.length ? '<ul class="imp-ex">' + ex.map(function (id) {
        var o = H.byId(id), l = H.loc(o);
        return '<li><span class="imp-ex-n">' + esc(l.name) + '</span><span class="imp-ex-s">' + esc(l.mission) + '</span><button type="button" class="cta small alt" data-go="' + esc(id) + '">' + esc(T("imp.show")) + "</button></li>";
      }).join("") + "</ul>" : '<p class="note">' + esc(T("imp.noEx")) + "</p>") +
      "<h4>" + esc(T("imp.photos")) + '</h4><div class="imp-photos" id="imp-photos"><p class="note">' + esc(T("imp.loading")) + '</p></div><p class="note">' + esc(T("imp.photosNote")) + "</p>" +
      "<h4>" + esc(T("imp.sources")) + '</h4><ol class="imp-src">' + R.order.map(function (r) { return '<li><a href="' + esc(SRC[r].u) + '" target="_blank" rel="noopener">' + esc(SRC[r].t) + "</a></li>"; }).join("") + "</ol>";
    loadPhotos(t);
  }

  function loadPhotos(t) {
    var tok = ++photoTok, q = t.q[planet], box = $("#imp-photos"), search = "https://images.nasa.gov/search?q=" + encodeURIComponent(q);
    function link() { return '<p><a href="' + esc(search) + '" target="_blank" rel="noopener">' + esc(T("imp.nasaSearch")) + "</a></p>"; }
    H.nasaFetch(q, "image", 8, function (all) {
      if (tok !== photoTok || !$("#imp-photos")) return;
      var items = all.filter(function (it) { return it.links && it.links[0] && it.links[0].href; }).slice(0, 3);
      $("#imp-photos").innerHTML = items.length ? '<div class="imp-ph">' + items.map(function (it) {
        var d = it.data[0], id = d.nasa_id || "";
        return '<figure><a href="https://images.nasa.gov/details/' + encodeURIComponent(id) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(it.links[0].href) + '" alt="' + esc(d.title || "") + '"></a>' +
          "<figcaption>" + esc(d.title || "") + (d.center ? " · " + esc(d.center) : "") + " · NASA " + esc(id) + "</figcaption></figure>";
      }).join("") + "</div>" + link() : '<p class="note">' + esc(T("imp.noPhotos")) + "</p>" + link();
    }, function () { if (tok === photoTok && $("#imp-photos")) $("#imp-photos").innerHTML = '<p class="note">' + esc(T("imp.noPhotos")) + "</p>" + link(); });
  }

  function renderLegend() {
    $("#imp-legend").innerHTML = ["real", "potential", "hyp", "gap"].map(function (c) {
      return "<li>" + chip(c) + '<span class="note">' + esc(T("imp.cd." + c)) + "</span></li>";
    }).join("");
  }
  function render() {
    if (!H || !$("#imp-tiles")) return;
    document.querySelectorAll("#imp-planet button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.p === planet)); });
    renderLegend(); renderTiles(); renderDetail();
  }
  function setPlanet(p) {
    if (p !== "moon" && p !== "mars") return;
    planet = p; render();
  }
  function open(id) {
    if (!T0(id)) return;
    topic = id; render();
    var d = $("#imp-detail"); if (d && d.scrollIntoView) d.scrollIntoView({ behavior: H.reduce() ? "auto" : "smooth", block: "nearest" });
  }
  function init(host) {
    H = host;
    var root = $("#view-impact");
    root.addEventListener("click", function (e) {
      var pb = e.target.closest("#imp-planet button"), tb = e.target.closest("[data-topic]"), gb = e.target.closest("[data-go]");
      if (pb) setPlanet(pb.dataset.p);
      else if (tb) open(tb.dataset.topic);
      else if (gb) H.go(gb.dataset.go);
    });
  }
  function show() {
    if (!shownOnce) { shownOnce = true; var p = H.planet(); if (p === "moon" || p === "mars") planet = p; }
    render();
  }
  window.IMP = {
    init: init, show: show, hide: function () {}, render: render, open: open, setPlanet: setPlanet,
    state: function () { return { planet: planet, topic: topic }; },
    _topics: function () { return TOPICS; }, _src: function () { return SRC; }
  };
})();
