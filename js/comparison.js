/* MISSION COMPARISON: side-by-side comparison of 2-4 missions of the project catalogue, or Moon vs Mars aggregates.
 *
 * Data policy:
 *  - Names, agency, type, dates, achievements come from window.OBJECTS; reasons for the end come from the
 *    equipment-condition records (COND); counts of left components are computed from the catalogue.
 *  - Mass, dimensions and science tasks come from SPEC below: ONLY values read from the listed sources. Nothing else is
 *    filled in: a missing value is shown as "No data".
 *  - Each mass / size keeps its own label (launch, landed, dry, rover...) and unit; charts only group identical labels.
 * Public API: window.MCMP = { init, show, render, state, select, reset, setMode, _groups, _spec }. */
(function () {
  "use strict";
  var H = null, sel = [], mode = "sel", F = { planet: "", type: "", from: "", to: "" }, photos = {}, MAXSEL = 4;

  var SRC = {
    data: { tk: "mc.src.data" },
    msl: { t: "NASA/JPL: Mars Science Laboratory landing press kit (PDF)", u: "https://www.jpl.nasa.gov/news/press_kits/MSLLanding.pdf" },
    m20: { t: "NASA/JPL: Mars 2020 press kit, Perseverance rover", u: "https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/mission/spacecraft/perseverance_rover/" },
    ins: { t: "NASA/JPL: InSight landing press kit, facts", u: "https://www.jpl.nasa.gov/news/press_kits/insight/landing/facts" },
    mer: { t: "NASA/JPL: Mars Exploration Rover spacecraft (web archive)", u: "https://webarchive.library.unt.edu/web/20130217082848/http://marsrovers.jpl.nasa.gov/mission/spacecraft.html" },
    v1: { t: "Wikipedia: Viking 1", u: "https://en.wikipedia.org/wiki/Viking_1" },
    v2: { t: "Wikipedia: Viking 2", u: "https://en.wikipedia.org/wiki/Viking_2" },
    s3: { t: "Wikipedia: Surveyor 3", u: "https://en.wikipedia.org/wiki/Surveyor_3" },
    l16: { t: "Wikipedia: Luna 16", u: "https://en.wikipedia.org/wiki/Luna_16" },
    lk1: { t: "Wikipedia: Lunokhod 1", u: "https://en.wikipedia.org/wiki/Lunokhod_1" },
    prag: { t: "Wikipedia: Pragyan (Chandrayaan-3)", u: "https://en.wikipedia.org/wiki/Pragyan_(Chandrayaan-3)" },
    c3: { t: "Wikipedia: Chandrayaan-3", u: "https://en.wikipedia.org/wiki/Chandrayaan-3" },
    phx: { t: "Wikipedia: Phoenix (spacecraft)", u: "https://en.wikipedia.org/wiki/Phoenix_(spacecraft)" },
    pf: { t: "NASA NSSDCA: Mars Pathfinder / Sojourner", u: "https://nssdc.gsfc.nasa.gov/planetary/mesur.html" },
    lm: { t: "Wikipedia: Apollo Lunar Module", u: "https://en.wikipedia.org/wiki/Apollo_LM" },
    lrv: { t: "Wikipedia: Lunar Roving Vehicle (web archive)", u: "https://webarchive.library.unt.edu/web/20110503171050/http://en.wikipedia.org/wiki/Lunar_Roving_Vehicle" },
    ing: { t: "Universe Today: Ingenuity suffers rotor damage, ending the mission", u: "https://www.universetoday.com/articles/ingenuity-suffers-rotor-damage-ending-the-mission" }
  };

  // mass: [kind, kg, source, noteKey?]; dims: [labelKey, value (number or text), "m", source]; tasks: [textKey, source]
  var LM = { mass: [["desc", 10334, "lm", "lm"]], dims: [["hgtDesc", 3.231, "m", "lm"], ["gear", 9.4, "m", "lm"]] };
  var SPEC = {
    "moon:Apollo 11": LM, "moon:Apollo 12": LM, "moon:Apollo 14": LM,
    "moon:Apollo 15": { mass: LM.mass.concat([["rover", 210, "lrv"]]), dims: LM.dims.concat([["len", 3, "m", "lrv"], ["hgt", 1.1, "m", "lrv"]]) },
    "moon:Apollo 16": { mass: LM.mass.concat([["rover", 210, "lrv"]]), dims: LM.dims.concat([["len", 3, "m", "lrv"], ["hgt", 1.1, "m", "lrv"]]) },
    "moon:Apollo 17": { mass: LM.mass.concat([["rover", 210, "lrv"]]), dims: LM.dims.concat([["len", 3, "m", "lrv"], ["hgt", 1.1, "m", "lrv"]]) },
    "moon:Surveyor 3": { mass: [["launch", 1026, "s3"], ["landed", 296, "s3"]], tasks: ["surv3", "s3"] },
    "moon:Luna 16": { mass: [["launch", 5725, "l16"], ["landed", 1880, "l16"]], tasks: ["luna16", "l16"] },
    "moon:Luna 17": { mass: [["rover", 756, "lk1", "lunok"]], dims: [["hgt", 1.35, "m", "lk1"], ["len", 1.7, "m", "lk1"], ["wid", 1.6, "m", "lk1"]], tasks: ["lk1", "lk1"] },
    "moon:Chandrayaan-3": { mass: [["launch", 3900, "c3"], ["lander", 1726, "c3"], ["rover", 26, "c3"]], dims: [["lwh", "0.9 × 0.75 × 0.85", "m", "prag"]], tasks: ["c3", "c3"] },
    "mars:Viking": { mass: [["dry", 572, "v1"]], tasks: ["viking", "v1"] },
    "mars:Mars Pathfinder": { mass: [["lander", 264, "pf"], ["rover", 10.5, "pf"]] },
    "mars:Mars Exploration Rover": { mass: [["rover", 185, "mer"], ["launch", 1063, "mer"]] },
    "mars:Phoenix": { mass: [["lander", 350, "phx"], ["launch", 670, "phx", "ls"]], dims: [["lenArr", 5.5, "m", "phx"], ["deck", 1.5, "m", "phx"], ["hgtMast", 2.2, "m", "phx"]] },
    "mars:Mars Science Laboratory": { mass: [["rover", 899, "msl"], ["launch", 3893, "msl"]], dims: [["lenArm", 3.0, "m", "msl"], ["wid", 2.8, "m", "msl"], ["hgtMast", 2.1, "m", "msl"]] },
    "mars:InSight": { mass: [["lander", 358, "ins"]], dims: [["hgtLegs", "0.83–1.08", "m", "ins"], ["deckW", 1.56, "m", "ins"], ["span", 6.0, "m", "ins"]] },
    "mars:Mars 2020": { mass: [["rover", 1025, "m20"]], dims: [["lenArm", 3.0, "m", "m20"], ["wid", 2.7, "m", "m20"], ["hgtMast", 2.2, "m", "m20"], ["rotor", 1.2, "m", "ing"], ["hgtIng", 0.49, "m", "ing"]] }
  };
  var SMOKE = { data: 1 };

  // ---- helpers
  function $(s) { return document.querySelector(s); }
  function T(k, v) { return H.T(k, v); }
  function esc(s) { return H.esc(s); }
  function num(n) { try { return new Intl.NumberFormat(window.I18N && I18N.locale ? I18N.locale() : "en", { maximumFractionDigits: 3 }).format(n); } catch (e) { return String(n); } }
  function fdate(s) { return window.COND ? COND.fmt(s) : s; }
  function pdate(s) { if (!s) return null; var p = String(s).split("-"); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function yr(s) { return s ? +String(s).slice(0, 4) : null; }
  function nodata() { return '<span class="mc-nd">' + esc(T("mc.nodata")) + "</span>"; }

  var groups = null;
  function buildGroups() {
    var map = {}, order = [];
    H.objects().forEach(function (o) {
      var k = o.planet + ":" + o.mission;
      if (!map[k]) { map[k] = { key: k, planet: o.planet, objs: [] }; order.push(k); }
      map[k].objs.push(o);
    });
    groups = order.map(function (k) {
      var g = map[k], os = g.objs;
      g.main = os[0];
      g.launch = os.map(function (o) { return o.launch; }).filter(Boolean).sort()[0] || null;
      g.landing = os.map(function (o) { return o.landing; }).filter(Boolean).sort()[0] || null;
      g.year = yr(g.launch) || yr(g.landing);
      g.types = os.map(function (o) { return o.type; }).filter(function (t, i, a) { return a.indexOf(t) === i; });
      g.spec = SPEC[k] || {};
      return g;
    });
  }
  function mname(g) { return H.loc(g.main).mission; }
  function matches(g) {
    if (F.planet && g.planet !== F.planet) return false;
    if (F.type && g.types.indexOf(F.type) < 0) return false;
    if (F.from && (g.year || 0) < +F.from) return false;
    if (F.to && (g.year || 9999) > +F.to) return false;
    return true;
  }
  function byKey(k) { for (var i = 0; i < groups.length; i++) if (groups[i].key === k) return groups[i]; return null; }

  // ---- sources numbering
  function SrcBook() { this.order = []; }
  SrcBook.prototype.n = function (id) { var i = this.order.indexOf(id); if (i < 0) { this.order.push(id); i = this.order.length - 1; } return i + 1; };
  SrcBook.prototype.cite = function (id) {
    var n = this.n(id), s = SRC[id];
    return s.u ? '<a class="mc-cite" href="' + esc(s.u) + '" target="_blank" rel="noopener" title="' + esc(s.t) + '">[' + n + "]</a>" : '<span class="mc-cite" title="' + esc(T(s.tk)) + '">[' + n + "]</span>";
  };

  // ---- duration
  function durations(g) {
    return g.objs.map(function (o) {
      var a = pdate(o.landing), name = H.loc(o).name, c = o.condition || {}, val;
      if (o.status === "active" && c.state === "operational" && c.asOf && a != null) {
        var days = Math.round((pdate(c.asOf) - a) / 864e5);
        return { name: name, days: days, html: T("mc.dur.ongoing", { n: num(days), d: fdate(c.asOf) }), src: "data" };
      }
      var e = o.end; if (!a || !e || e === o.landing) return { name: name, html: null };
      var days2 = Math.round((pdate(e) - a) / 864e5);
      val = String(e).length === 7 ? T("mc.dur.approx", { n: num(days2) }) : T("mc.dur.days", { n: num(days2) });
      return { name: name, days: days2, html: val, src: "data" };
    });
  }

  // ---- left components
  function leftInfo(g) {
    var left = g.objs.filter(function (o) { return !(o.condition && o.condition.state === "operational"); }), by = {};
    left.forEach(function (o) { var t = H.loc(o).type; by[t] = (by[t] || 0) + 1; });
    return { n: left.length, by: by, objs: left };
  }

  // ---- photo
  function loadPhoto(g) {
    var q = g.main.imageQuery || (g.main.name + " " + g.main.mission);
    if (photos[q] !== undefined) return;
    photos[q] = null;
    H.nasaFetch(q, "image", 6, function (all) {
      var it = (all || []).filter(function (x) { return x.links && x.links[0] && x.links[0].href; })[0];
      photos[q] = it ? { href: it.links[0].href, title: (it.data[0].title || ""), id: it.data[0].nasa_id || "" } : false;
      if (mode === "sel" && sel.length > 1) paintPhotos();
    }, function () { photos[q] = false; if (mode === "sel" && sel.length > 1) paintPhotos(); });
  }
  function photoHtml(g) {
    var q = g.main.imageQuery || (g.main.name + " " + g.main.mission), p = photos[q];
    if (p) return '<figure class="mc-ph"><a href="https://images.nasa.gov/details/' + encodeURIComponent(p.id) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(p.href) + '" alt="' + esc(p.title) + '"></a><figcaption>' + esc(p.title) + " · NASA " + esc(p.id) + "</figcaption></figure>";
    return '<p class="note">' + esc(T(p === false ? "mc.photoNone" : "mc.photoLoad")) + "</p>";
  }
  function paintPhotos() {
    document.querySelectorAll("[data-ph]").forEach(function (el) { var g = byKey(el.dataset.ph); if (g) el.innerHTML = photoHtml(g); });
  }

  // ---- charts (SVG)
  function barChart(title, rows, unit) {
    rows = rows.filter(function (r) { return r.v != null; });
    if (!rows.length) return '<div class="mc-chart"><h4>' + esc(title) + '</h4><p class="note">' + esc(T("mc.ch.none")) + "</p></div>";
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; })), h = 26, W = 480, L = 150, R = 110;
    var svg = rows.map(function (r, i) {
      var w = Math.max(2, (W - L - R) * r.v / max), y = i * h + 4;
      return '<text class="mc-bt" x="' + (L - 6) + '" y="' + (y + 13) + '" text-anchor="end">' + esc(r.label) + "</text>" +
        '<rect class="mc-bar b-' + r.planet + '" x="' + L + '" y="' + y + '" width="' + w.toFixed(1) + '" height="16" rx="2"/>' +
        '<text class="mc-bv" x="' + (L + w + 6).toFixed(1) + '" y="' + (y + 13) + '">' + esc(num(r.v) + " " + unit) + "</text>";
    }).join("");
    return '<div class="mc-chart"><h4>' + esc(title) + '</h4><svg viewBox="0 0 ' + W + " " + (rows.length * h + 8) + '" role="img" aria-label="' + esc(title) + '">' + svg + "</svg></div>";
  }
  function massRows(kind, gs) {
    return gs.map(function (g) {
      var m = (g.spec.mass || []).filter(function (x) { return x[0] === kind; })[0];
      return { label: mname(g), v: m ? m[1] : null, planet: g.planet };
    });
  }
  function timelineChart(gs) {
    var lo = 1960, hi = 2030, W = 480, L = 150, h = 26, X = function (y) { return L + (W - L - 20) * (y - lo) / (hi - lo); };
    var rows = gs.map(function (g, i) {
      var y = i * h + 4, a = pdate(g.launch), l = pdate(g.landing), ends = g.objs.map(function (o) { return o.end; }).filter(Boolean).sort(), e = ends.length ? pdate(ends[ends.length - 1]) : null;
      var yf = function (t) { return 1970 + t / (365.25 * 864e5); }, out = '<text class="mc-bt" x="' + (L - 6) + '" y="' + (y + 13) + '" text-anchor="end">' + esc(mname(g)) + "</text>";
      if (l != null && e != null && e > l) out += '<rect class="mc-bar b-' + g.planet + '" x="' + X(yf(l)).toFixed(1) + '" y="' + (y + 4) + '" width="' + Math.max(2, X(yf(e)) - X(yf(l))).toFixed(1) + '" height="8" rx="2"/>';
      if (a != null) out += '<circle class="mc-dot" cx="' + X(yf(a)).toFixed(1) + '" cy="' + (y + 8) + '" r="3"/>';
      if (l != null) out += '<rect class="mc-land b-' + g.planet + '" x="' + (X(yf(l)) - 3).toFixed(1) + '" y="' + (y + 5) + '" width="6" height="6" transform="rotate(45 ' + X(yf(l)).toFixed(1) + " " + (y + 8) + ')"/>';
      return out;
    }).join("");
    var ticks = [1970, 1990, 2010, 2030].map(function (t) { return '<text class="mc-bt" x="' + X(t) + '" y="' + (gs.length * h + 20) + '" text-anchor="middle">' + t + "</text>"; }).join("");
    return '<div class="mc-chart"><h4>' + esc(T("mc.ch.tl")) + '</h4><svg viewBox="0 0 ' + W + " " + (gs.length * h + 28) + '" role="img" aria-label="' + esc(T("mc.ch.tl")) + '">' + rows + ticks + "</svg><p class=\"note\">● " + esc(T("mc.r.launch")) + " · ◆ " + esc(T("mc.r.landing")) + "</p></div>";
  }

  // ---- table
  function row(label, hint, cells) {
    return "<tr><th scope=\"row\">" + esc(label) + (hint ? '<small>' + esc(hint) + "</small>" : "") + "</th>" + cells.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
  }
  function renderResult() {
    var gs = sel.map(byKey).filter(Boolean), B = new SrcBook(), out = "";
    if (gs.length < 2) return '<p class="note mc-hint">' + esc(T("mc.hintMore")) + "</p>";
    gs.forEach(loadPhoto);
    var dur = gs.map(durations);
    out += "<h3>" + esc(T("mc.charts")) + '</h3><div class="mc-charts">' +
      barChart(T("mc.ch.launch"), massRows("launch", gs), "kg") + barChart(T("mc.ch.rover"), massRows("rover", gs), "kg") +
      barChart(T("mc.ch.lander"), massRows("lander", gs).map(function (r, i) { if (r.v == null) { var m = (gs[i].spec.mass || []).filter(function (x) { return x[0] === "dry" || x[0] === "landed"; })[0]; if (m) r.v = m[1]; } return r; }), "kg") +
      barChart(T("mc.ch.dur"), gs.map(function (g, i) { var best = dur[i].filter(function (d) { return d.days != null; }).sort(function (a, b) { return b.days - a.days; })[0]; return { label: mname(g), v: best ? best.days : null, planet: g.planet }; }), T("mc.u.day")) +
      timelineChart(gs) + "</div>";
    var rows = "";
    rows += row(T("mc.r.name"), "", gs.map(function (g) {
      return '<b>' + esc(mname(g)) + '</b><div data-ph="' + esc(g.key) + '">' + photoHtml(g) + "</div><div class=\"mc-go\">" + g.objs.map(function (o) {
        return '<span>' + esc(H.loc(o).name) + '</span><button type="button" class="cta small alt" data-go="' + esc(o.id) + '">' + esc(T("mc.showMap")) + '</button><button type="button" class="cta small alt" data-go3="' + esc(o.id) + '">' + esc(T("mc.show3d")) + "</button>";
      }).join("") + "</div>";
    }));
    rows += row(T("mc.r.body"), "", gs.map(function (g) { return esc(T("body." + g.planet)); }));
    rows += row(T("mc.r.agency"), "", gs.map(function (g) { var a = g.objs.map(function (o) { return H.loc(o).agency; }).filter(function (x, i, r) { return r.indexOf(x) === i; }); return esc(a.join("; ")) + " " + B.cite("data"); }));
    rows += row(T("mc.r.launch"), "", gs.map(function (g) { return (g.year ? esc(String(g.year)) + " " + B.cite("data") : nodata()); }));
    rows += row(T("mc.r.landing"), "", gs.map(function (g) {
      var ds = g.objs.filter(function (o) { return o.landing; }).map(function (o) { return (g.objs.length > 1 ? esc(H.loc(o).name) + ": " : "") + esc(fdate(o.landing)); });
      return ds.length ? ds.join("<br>") + " " + B.cite("data") : nodata();
    }));
    rows += row(T("mc.r.duration"), T("mc.h.duration"), dur.map(function (d) {
      var any = d.filter(function (x) { return x.html; });
      return any.length ? any.map(function (x) { return (d.length > 1 ? esc(x.name) + ": " : "") + esc(x.html); }).join("<br>") + " " + B.cite("data") : nodata();
    }));
    rows += row(T("mc.r.type"), "", gs.map(function (g) { return g.types.map(function (t) { return esc(H.typeLabel(t)); }).join("; ") + " " + B.cite("data"); }));
    rows += row(T("mc.r.mass"), T("mc.h.mass"), gs.map(function (g) {
      var m = g.spec.mass; if (!m || !m.length) return nodata();
      return m.map(function (x) { return "<div><b>" + esc(num(x[1])) + " " + esc(T("mc.u.kg")) + "</b> " + B.cite(x[2]) + "<small>" + esc(T("mc.m." + x[0])) + (x[3] ? " · " + esc(T("mc.m.note." + x[3])) : "") + "</small></div>"; }).join("");
    }));
    rows += row(T("mc.r.dims"), T("mc.h.dims"), gs.map(function (g) {
      var d = g.spec.dims; if (!d || !d.length) return nodata();
      return d.map(function (x) { return "<div><b>" + esc(typeof x[1] === "number" ? num(x[1]) : x[1]) + " " + esc(T("mc.u.m")) + "</b> " + B.cite(x[3]) + "<small>" + esc(T("mc.d." + x[0])) + "</small></div>"; }).join("");
    }));
    rows += row(T("mc.r.tasks"), "", gs.map(function (g) { var t = g.spec.tasks; return t ? esc(T("mc.t." + t[0])) + " " + B.cite(t[1]) : nodata(); }));
    rows += row(T("mc.r.ach"), T("mc.h.ach"), gs.map(function (g) {
      var f = []; g.objs.slice(0, 2).forEach(function (o) { var fs = H.loc(o).facts || []; if (fs[0]) f.push(fs[0]); });
      return f.length ? "<ul class=\"mc-ul\">" + f.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" + B.cite("data") : nodata();
    }));
    rows += row(T("mc.r.end"), T("mc.h.end"), gs.map(function (g) {
      var seen = {}, parts = [];
      g.objs.forEach(function (o) {
        var c = o.condition; if (!c || !c.curated || c.state === "operational") return;
        var txt = c.reasons.filter(function (r) { return r !== "none"; }).map(function (r) { return T("cr." + r); }).join(" ");
        if (txt && !seen[txt]) { seen[txt] = 1; parts.push((g.objs.length > 1 ? "<b>" + esc(H.loc(o).name) + ":</b> " : "") + esc(txt) + " " + (c.sources || []).slice(0, 1).map(function () { return B.cite("data"); }).join("")); }
      });
      if (g.objs.every(function (o) { return o.condition && o.condition.state === "operational"; })) return esc(T("cond.d.operational"));
      return parts.length ? parts.join("<br><br>") : nodata();
    }));
    rows += row(T("mc.r.left"), T("mc.h.left"), gs.map(function (g) {
      var li = leftInfo(g);
      if (!li.n) return esc(T("mc.left.none")) + " " + B.cite("data");
      return "<b>" + esc(T("mc.left.n", { n: li.n })) + "</b> " + B.cite("data") + "<ul class=\"mc-ul\">" + li.objs.map(function (o) {
        var k = window.COND ? COND.stateOf(o) : "unknown";
        return "<li>" + esc(H.loc(o).type) + ": " + esc(H.loc(o).name) + ' <span class="cchip k-' + k + '" style="--k:' + (window.COND ? COND.color(o) : "") + '"><b aria-hidden="true">' + (window.COND ? COND.glyph(o) : "") + "</b>" + esc(T("cond.s." + k)) + "</span></li>";
      }).join("") + "</ul>";
    }));
    out += "<h3>" + esc(T("mc.table")) + '</h3><div class="mc-scroll"><table class="mc-table"><thead><tr><th></th>' + gs.map(function (g) { return '<th scope="col" class="b-' + g.planet + '">' + esc(mname(g)) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<p class="note">' + esc(T("mc.photoNote")) + "</p>";
    out += "<h4>" + esc(T("mc.sources")) + '</h4><ol class="mc-src">' + B.order.map(function (id) {
      var s = SRC[id]; return "<li>" + (s.u ? '<a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + "</a>" : esc(T(s.tk))) + "</li>";
    }).join("") + "</ol>";
    return out;
  }

  // ---- Moon vs Mars
  function renderBodies() {
    var gs = groups.filter(matches), cols = ["moon", "mars"].map(function (p) {
      var g = gs.filter(function (x) { return x.planet === p; }), os = [].concat.apply([], g.map(function (x) { return x.objs; })), cnt = COND_COUNT(os), yrs = g.map(function (x) { return yr(x.landing); }).filter(Boolean).sort();
      var ag = {}, ty = {}; os.forEach(function (o) { ag[H.loc(o).agency] = 1; var t = H.loc(o).type; ty[t] = (ty[t] || 0) + 1; });
      return { p: p, g: g, os: os, cnt: cnt, yrs: yrs, ag: Object.keys(ag), ty: ty, mass: g.filter(function (x) { return (x.spec.mass || []).length; }).length };
    });
    function r(label, f) { return row(label, "", cols.map(f)); }
    var tbl = r(T("mc.agg.missions"), function (c) { return String(c.g.length); }) + r(T("mc.agg.objects"), function (c) { return String(c.os.length); }) +
      r(T("mc.agg.agencies"), function (c) { return c.ag.length ? esc(c.ag.join("; ")) : nodata(); }) +
      r(T("mc.agg.first"), function (c) { return c.yrs.length ? String(c.yrs[0]) : nodata(); }) + r(T("mc.agg.last"), function (c) { return c.yrs.length ? String(c.yrs[c.yrs.length - 1]) : nodata(); }) +
      r(T("mc.agg.types"), function (c) { var k = Object.keys(c.ty); return k.length ? k.map(function (t) { return esc(t) + ": " + c.ty[t]; }).join("<br>") : nodata(); }) +
      r(T("mc.agg.cond"), function (c) { return COND.ORDER.filter(function (k) { return c.cnt[k]; }).map(function (k) { return '<span class="cchip k-' + k + '" style="--k:' + COND.STATES[k].color + '"><b aria-hidden="true">' + COND.STATES[k].glyph + "</b>" + esc(T("cond.s." + k)) + ": " + c.cnt[k] + "</span>"; }).join(" ") || nodata(); }) +
      r(T("mc.agg.mass"), function (c) { return c.mass + " / " + c.g.length + " " + '<span class="mc-cite" title="' + esc(T("mc.src.data")) + '">[SPEC]</span>'; });
    // stacked condition bars
    var W = 480, L = 70, max = Math.max.apply(null, cols.map(function (c) { return c.os.length; })) || 1;
    var bars = cols.map(function (c, i) {
      var x = L, y = i * 34 + 6, s = '<text class="mc-bt" x="' + (L - 6) + '" y="' + (y + 15) + '" text-anchor="end">' + esc(T("body." + c.p)) + "</text>";
      COND.ORDER.forEach(function (k) { var n = c.cnt[k]; if (!n) return; var w = (W - L - 10) * n / max; s += '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="22" fill="' + COND.STATES[k].color + '" stroke="var(--bg)" stroke-width="1"><title>' + esc(T("cond.s." + k) + ": " + n) + "</title></rect>"; x += w; });
      return s;
    }).join("");
    return "<h3>" + esc(T("mc.agg.title")) + '</h3><p class="note">' + esc(T("mc.agg.note")) + '</p><div class="mc-scroll"><table class="mc-table"><thead><tr><th></th>' + cols.map(function (c) { return '<th class="b-' + c.p + '">' + esc(T("body." + c.p)) + "</th>"; }).join("") + "</tr></thead><tbody>" + tbl + "</tbody></table></div>" +
      '<div class="mc-chart"><h4>' + esc(T("mc.agg.chart")) + '</h4><svg viewBox="0 0 ' + W + ' 80" role="img" aria-label="' + esc(T("mc.agg.chart")) + '">' + bars + "</svg><ul class=\"mc-leg\">" + COND.ORDER.map(function (k) { return '<li style="--k:' + COND.STATES[k].color + '"><i></i>' + esc(T("cond.s." + k)) + "</li>"; }).join("") + "</ul></div>";
  }
  function COND_COUNT(os) { return window.COND ? COND.counts(os) : {}; }

  // ---- shell
  function renderControls() {
    var yrsAll = groups.map(function (g) { return g.year; }).filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(),
      types = [].concat.apply([], groups.map(function (g) { return g.types; })).filter(function (v, i, a) { return a.indexOf(v) === i; });
    function opts(list, cur, lab) { return '<option value="">' + esc(T("mc.f.all")) + "</option>" + list.map(function (v) { return '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? " selected" : "") + ">" + esc(lab ? lab(v) : v) + "</option>"; }).join(""); }
    $("#mc-planet").innerHTML = opts(["moon", "mars"], F.planet, function (p) { return T("body." + p); });
    $("#mc-type").innerHTML = opts(types, F.type, function (t) { return H.typeLabel(t); });
    $("#mc-from").innerHTML = opts(yrsAll, F.from); $("#mc-to").innerHTML = opts(yrsAll, F.to);
    document.querySelectorAll("#mc-mode button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.m === mode)); });
  }
  function renderPicker() {
    var list = groups.filter(matches);
    sel.forEach(function (k) { var g = byKey(k); if (g && list.indexOf(g) < 0) list.push(g); });
    $("#mc-count").textContent = T("mc.count", { n: groups.filter(matches).length, s: sel.length });
    $("#mc-picker").innerHTML = list.map(function (g) {
      var on = sel.indexOf(g.key) >= 0, dis = !on && sel.length >= MAXSEL;
      return '<li><label class="mc-opt b-' + g.planet + (on ? " on" : "") + '"><input type="checkbox" data-k="' + esc(g.key) + '"' + (on ? " checked" : "") + (dis ? " disabled" : "") + '><span class="mc-opt-n">' + esc(mname(g)) + '</span><span class="mc-opt-s">' + esc(T("body." + g.planet)) + (g.year ? " · " + g.year : "") + "</span></label></li>";
    }).join("");
    $("#mc-max").hidden = sel.length < MAXSEL; $("#mc-max").textContent = T("mc.max");
  }
  function render() {
    if (!H || !$("#mc-picker")) return;
    if (!groups) buildGroups();
    renderControls();
    $("#mc-pick-wrap").hidden = mode !== "sel";
    renderPicker();
    $("#mc-result").innerHTML = mode === "sel" ? renderResult() : renderBodies();
  }
  function select(k, on) { var i = sel.indexOf(k); if (on && i < 0 && sel.length < MAXSEL && byKey(k)) sel.push(k); if (!on && i >= 0) sel.splice(i, 1); render(); }
  function reset() { sel = []; F = { planet: "", type: "", from: "", to: "" }; mode = "sel"; render(); }
  function setMode(m) { if (m === "sel" || m === "body") { mode = m; render(); } }
  function init(host) {
    H = host; var root = $("#view-comparison");
    root.addEventListener("change", function (e) {
      var t = e.target;
      if (t.dataset && t.dataset.k) select(t.dataset.k, t.checked);
      else if (t.id === "mc-planet") { F.planet = t.value; render(); } else if (t.id === "mc-type") { F.type = t.value; render(); }
      else if (t.id === "mc-from") { F.from = t.value; render(); } else if (t.id === "mc-to") { F.to = t.value; render(); }
    });
    root.addEventListener("click", function (e) {
      var m = e.target.closest("#mc-mode button"), g = e.target.closest("[data-go]"), g3 = e.target.closest("[data-go3]");
      if (e.target.closest("#mc-reset")) reset(); else if (m) setMode(m.dataset.m);
      else if (g) H.go(g.dataset.go, false); else if (g3) H.go(g3.dataset.go3, true);
    });
  }
  window.MCMP = {
    init: init, show: render, render: render, state: function () { return { sel: sel.slice(), mode: mode, filters: F }; },
    select: select, reset: reset, setMode: setMode, _groups: function () { if (!groups) buildGroups(); return groups; }, _spec: function () { return SPEC; }, _src: function () { return SRC; }
  };
})();
