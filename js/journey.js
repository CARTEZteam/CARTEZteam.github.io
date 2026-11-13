/* Mission Journey: a step-by-step presentation of a mission from launch to legacy.
 * - stages are built from data.js (launch / landing / end dates, objects, descriptions) plus a small table
 *   of additional dates (VAR) that were checked against NASA NSSDCA and mission documentation;
 * - the moving pictures are SCHEMATIC ANIMATIONS of the flight scheme (not recordings, not to scale) and are labelled as such;
 * - photos and videos are search results from the NASA Image and Video Library for "<mission> <stage word>".
 * Host interface (from app.js): T, esc, fmtDate, loc, typeLabel, coords, reduce, objects, mission, nasa, lightbox, openObject, go, onState. */
(function () {
  "use strict";

  var host = null, st = { open: false, key: null, i: 0, t: 0, playing: true, g: null, stages: [], scene: null, raf: 0, last: 0, tok: 0 };
  var ANIM = 5200, DWELL = 1600, NS = "http://www.w3.org/2000/svg";
  var media = {}; // query -> {photos, videos, state}

  function $(s, r) { return (r || document).querySelector(s); }
  function T(k, v) { return host.T(k, v); }
  function esc(s) { return host.esc(s); }

  /* ---------- additional, checked dates and flight-scheme variants (per data.js "mission") ---------- */
  var APOLLO = function (loi, lift, splash, q) { return { kind: "crewed", q: q, x: { loi: loi, lift: lift, ret: splash } }; };
  var VAR = {
    "Apollo 11": APOLLO("1969-07-19", "1969-07-21", "1969-07-24", "Apollo 11"),
    "Apollo 12": APOLLO("1969-11-18", "1969-11-20", "1969-11-24", "Apollo 12"),
    "Apollo 14": APOLLO("1971-02-04", "1971-02-06", "1971-02-09", "Apollo 14"),
    "Apollo 15": APOLLO("1971-07-29", "1971-08-02", "1971-08-07", "Apollo 15"),
    "Apollo 16": APOLLO("1972-04-19", "1972-04-24", "1972-04-27", "Apollo 16"),
    "Apollo 17": APOLLO("1972-12-10", "1972-12-14", "1972-12-19", "Apollo 17"),
    "Surveyor 3": { kind: "robotic", q: "Surveyor 3" },
    "Luna 16": { kind: "sample", q: "Luna 16", x: { loi: "1970-09-17", lift: "1970-09-21", ret: "1970-09-24" } },
    "Luna 17": { kind: "robotic", q: "Luna 17 Lunokhod" },
    "Chandrayaan-3": { kind: "robotic", q: "Chandrayaan-3", x: { loi: "2023-08-05", sep: "2023-08-17" } },
    "Viking": { kind: "mars", edl: "retro", orbiter: true, q: "Viking Mars lander", arrive: { "viking-1": "1976-06-19", "viking-2": "1976-08-07" } },
    "Mars Pathfinder": { kind: "mars", edl: "airbag", q: "Mars Pathfinder" },
    "Mars Exploration Rover": { kind: "mars", edl: "airbag", q: "Mars Exploration Rover" },
    "Phoenix": { kind: "mars", edl: "retro", q: "Phoenix Mars lander" },
    "Mars Science Laboratory": { kind: "mars", edl: "crane", q: "Curiosity rover" },
    "InSight": { kind: "mars", edl: "retro", q: "InSight Mars lander" },
    "Mars 2020": { kind: "mars", edl: "crane", q: "Perseverance rover" }
  };
  var WORD = { launch: "launch", cruise: "cruise", coast: "trans-lunar", approach: "approach", orbit: "lunar orbit", entry: "entry descent landing", descent: "descent landing",
    landing: "landing", ops: "surface", ascent: "liftoff moon", end: "mission", endReturn: "return", legacy: "landing site" };

  /* ---------- missions ---------- */
  function iso(s) { return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : null; }
  function days(a, b) { var x = iso(a), y = iso(b); return x != null && y != null ? Math.round((y - x) / 864e5) : null; }
  function minD(list) { var v = list.filter(Boolean).sort(); return v[0] || null; }

  function missions() {
    var map = {}, order = [];
    host.objects().forEach(function (o) {
      var k = o.planet + ":" + o.mission;
      if (!map[k]) { map[k] = { key: k, name: o.mission, planet: o.planet, objs: [] }; order.push(k); }
      map[k].objs.push(o);
    });
    return order.map(function (k) {
      var g = map[k], v = VAR[g.name] || { kind: g.planet === "mars" ? "mars" : "robotic", edl: "retro", q: g.name };
      g.v = v; g.o = g.objs[0];
      g.launch = minD(g.objs.map(function (o) { return o.launch; }));
      g.landing = minD(g.objs.map(function (o) { return o.landing; }));
      g.active = g.objs.some(function (o) { return o.status === "active"; });
      return g;
    });
  }

  /* ---------- stage list ---------- */
  function landingRows(g) {
    var seen = {}, rows = [];
    g.objs.forEach(function (o) { if (o.landing && !seen[o.landing]) { seen[o.landing] = host.loc(o).name; } });
    var ds = Object.keys(seen).sort();
    if (ds.length > 1) ds.forEach(function (d) { rows.push([seen[d], host.fmtDate(d)]); });
    else if (ds.length) rows.push([T("mj.date"), host.fmtDate(ds[0])]);
    else rows.push([T("mj.date"), T("mj.noDate")]);
    return rows;
  }
  function endRows(g) {
    var rows = [];
    if (g.active) return [[T("mc.operating"), T("mc.continues")]];
    g.objs.forEach(function (o) { if (o.end && o.end !== o.landing && o.status !== "impact") rows.push([host.loc(o).name, host.fmtDate(o.end)]); });
    return rows;
  }
  function dur(a, b) { var n = days(a, b); return n == null ? null : [T("mj.duration"), n === 1 ? T("mj.day1") : T("mj.days", { n: n })]; }
  function R(label, d) { return [label, d ? host.fmtDate(d) : T("mj.noDate")]; }

  function build(g) {
    var v = g.v, x = v.x || {}, S = [], L = g.landing, la = g.launch;
    function add(id, scene, title, desc, rows, date, notes) { S.push({ id: id, scene: scene, title: T("mj.s." + title), desc: T("mj.d." + desc), rows: rows || [], date: date || "", notes: notes || [] }); }
    var legacyDesc = null;
    if (v.kind === "mars") {
      var edl = v.edl, rover = g.objs.some(function (o) { return /rover/i.test(o.type) && !/helicopter/i.test(o.type); });
      add("launch", "launch", "launch", "m.launch", [R(T("mj.date"), la)], la);
      add("cruise", "cruise", "cruise", "m.cruise", [R(T("mj.date"), la ? la : null)].slice(0, 0).concat(la && L ? [[T("mj.dates"), host.fmtDate(la) + " – " + host.fmtDate(L)], dur(la, L)] : [[T("mj.date"), T("mj.noDate")]]).filter(Boolean), la);
      var ar = [];
      if (v.orbiter) g.objs.forEach(function (o) { if (v.arrive && v.arrive[o.id]) ar.push([T("mj.x.arrive") + " · " + host.loc(o).name, host.fmtDate(v.arrive[o.id])]); });
      add("approach", v.orbiter ? "orbit" : "approach", "approach", v.orbiter ? "m.approach.orbit" : "m.approach.direct", ar, v.orbiter ? minD(Object.keys(v.arrive || {}).map(function (k) { return v.arrive[k]; })) : "");
      add("entry", "entry", "entry", "m.entry", [R(T("mj.date"), L), [T("mj.date") + " ", T("mj.sameDay")]].slice(0, 1), L);
      add("descent", "descent", "descent", "m.descent." + edl, [R(T("mj.date"), L)], L);
      add("landing", "landing", "landing", "m.landing." + edl, landingRows(g), L);
      var er = endRows(g), ops = [];
      ops.push(L ? [T("mj.dates"), host.fmtDate(L) + " – " + (g.active ? T("mc.continues") : (er.length ? er.map(function (r) { return r[1]; }).join(" / ") : "?"))] : [T("mj.date"), T("mj.noDate")]);
      add("ops", rover ? "opsRover" : "opsLander", "ops", rover ? "m.ops.rover" : "m.ops.lander", ops, L);
      var notes = [];
      if (g.name === "Viking" && g.objs.some(function (o) { return o.id === "viking-1" && o.end === "1982-11-11"; })) notes.push(T("mj.vikEnd"));
      add("end", "end", "end", g.active ? "m.end.active" : "m.end", er.length ? er : [[T("mj.date"), T("mj.noDate")]], g.active ? "" : minD(g.objs.map(function (o) { return o.end; })), notes);
      legacyDesc = "m.legacy";
    } else if (v.kind === "crewed" || v.kind === "sample") {
      var cr = v.kind === "crewed", p = cr ? "c" : "s";
      var loiD = dur(la, x.loi);
      add("launch", "launch", "launch", p + ".launch", [R(T("mj.date"), la)], la);
      add("coast", "cruise", "coast", p + ".coast", [R(T("mj.date"), la)].concat(loiD ? [loiD] : []).slice(1).length ? [[T("mj.dates"), host.fmtDate(la) + " – " + host.fmtDate(x.loi)], loiD] : [R(T("mj.date"), la)], la, []);
      add("orbit", "orbit", "orbit", p + ".orbit", [R(T("mj.x.loi"), x.loi)], x.loi);
      add("descent", "descent", "descent", p + ".descent", [R(T("mj.date"), L)], L);
      var ln = landingRows(g), lnNotes = [];
      if (g.name === "Apollo 16") lnNotes.push(T("mj.a16Note"));
      add("landing", "landing", "landing", p + ".landing", ln, L, lnNotes);
      var stay = dur(L, x.lift);
      add("ops", cr ? "opsCrew" : "opsSample", cr ? "ops" : "opsSample", p + ".ops", [[T("mj.dates"), host.fmtDate(L) + " – " + host.fmtDate(x.lift)]].concat(stay ? [[T("mj.duration"), stay[1]]] : []), L);
      add("ascent", "ascent", "ascent", p + ".ascent", [R(T("mj.x.liftoff"), x.lift)], x.lift);
      add("end", cr ? "splash" : "capsule", cr ? "end" : "endReturn", p + ".end", [R(cr ? T("mj.x.splash") : T("mj.x.ret"), x.ret)], x.ret, [T("mj.tzNote")]);
      legacyDesc = p + ".legacy";
    } else { // robotic Moon mission
      var rows8 = [];
      add("launch", "launch", "launch", "r.launch", [R(T("mj.date"), la)], la);
      add("coast", "cruise", "coast", "r.coast", la && L ? [[T("mj.dates"), host.fmtDate(la) + " – " + host.fmtDate(L)], dur(la, L)] : [R(T("mj.date"), la)], la);
      var arow = [];
      if (x.loi) arow.push(R(T("mj.x.loi"), x.loi));
      if (x.sep) arow.push(R(T("mj.x.sep"), x.sep));
      add("approach", x.loi ? "orbit" : "approach", x.loi ? "orbit" : "approach", "r.approach", arow, x.loi || "");
      add("descent", "descent", "descent", "r.descent", [R(T("mj.date"), L)], L);
      add("landing", "landing", "landing", "r.landing", landingRows(g), L);
      var e2 = endRows(g), rov = g.objs.some(function (o) { return /rover/i.test(o.type); });
      add("ops", rov ? "opsRover" : "opsLander", "ops", "r.ops", L ? [[T("mj.dates"), host.fmtDate(L) + " – " + (g.active ? T("mc.continues") : (e2.length ? e2.map(function (r) { return r[1]; }).join(" / ") : "?"))]] : [R(T("mj.date"), L)], L);
      var en = [];
      if (g.name === "Chandrayaan-3") en.push(T("mj.x.chandEnd"));
      add("end", "end", "end", "r.end", e2.length ? e2 : [[T("mj.date"), T("mj.noDate")]], g.active ? "" : minD(g.objs.map(function (o) { return o.end; })), en);
      legacyDesc = "r.legacy";
    }
    add("legacy", "legacy", "legacy", legacyDesc, [], "");
    S[S.length - 1].legacy = true;
    return S;
  }

  /* ---------- schematic scenes (SVG) ---------- */
  function el(tag, a, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in a) n.setAttribute(k, a[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function ease(p) { return p * p * (3 - 2 * p); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function tf(n, x, y, r, s) { n.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ")" + (r ? " rotate(" + r.toFixed(1) + ")" : "") + (s != null ? " scale(" + s.toFixed(3) + ")" : "")); }
  function text(parent, x, y, s, cls, anchor) { var t = el("text", { x: x, y: y, class: cls || "mj-lbl", "text-anchor": anchor || "start" }, parent); t.textContent = s; return t; }

  function lander(parent, cls) { // generic legged lander (reconstruction-style icon)
    var g = el("g", { class: cls || "mj-craft" }, parent);
    el("rect", { x: -13, y: -16, width: 26, height: 14, rx: 2 }, g);
    el("path", { d: "M-11 -2 L-19 12 M11 -2 L19 12 M-21 12 H-15 M15 12 H21", class: "mj-line" }, g);
    return g;
  }
  function rover(parent, cls) {
    var g = el("g", { class: cls || "mj-craft" }, parent);
    el("rect", { x: -17, y: -16, width: 34, height: 9, rx: 2 }, g);
    el("path", { d: "M10 -16 L14 -26 M14 -26 H8", class: "mj-line" }, g);
    [-12, 0, 12].forEach(function (cx) { el("circle", { cx: cx, cy: -3, r: 4.2, class: "mj-wheel" }, g); });
    return g;
  }
  function flame(parent) { var f = el("path", { d: "M-5 0 L0 16 L5 0 Z", class: "mj-flame" }, parent); return f; }
  function ground(svg, y, col) { el("rect", { x: 0, y: y, width: 640, height: 280 - y, class: col || "mj-ground" }, svg); }
  function stars(svg) {
    var g = el("g", { class: "mj-stars" }, svg), s = 7;
    for (var i = 0; i < 38; i++) { s = (s * 9301 + 49297) % 233280; var x = s / 233280 * 640; s = (s * 9301 + 49297) % 233280; el("circle", { cx: x.toFixed(0), cy: (s / 233280 * 280).toFixed(0), r: i % 5 ? 0.9 : 1.5 }, g); }
  }
  function signal(parent, x, y) {
    var rings = [0, 1, 2].map(function () { return el("circle", { cx: x, cy: y, r: 4, class: "mj-ring" }, parent); });
    return function (p, fade) { rings.forEach(function (c, i) { var q = (p * 3 + i / 3) % 1; c.setAttribute("r", (6 + q * 44).toFixed(1)); c.setAttribute("opacity", ((1 - q) * 0.8 * fade).toFixed(2)); }); };
  }

  var SC = {
    launch: function (svg, c) {
      stars(svg);
      el("circle", { cx: 320, cy: 560, r: 340, class: "mj-earth" }, svg);
      text(svg, 320, 262, T("mj.earth"), "mj-lbl", "middle");
      var tr = el("line", { class: "mj-trail", x1: 320, y1: 222, x2: 320, y2: 222 }, svg), r = el("g", { class: "mj-craft" }, svg);
      el("path", { d: "M0 -26 L5 -14 V6 H-5 V-14 Z M-5 2 L-10 10 L-5 6 Z M5 2 L10 10 L5 6 Z" }, r);
      var f = el("path", { d: "M-4 6 L0 22 L4 6 Z", class: "mj-flame" }, r);
      return function (p) { var q = ease(p), x = 320 + q * q * 90, y = 222 - q * 200, a = 4 + q * 52; tf(r, x, y, a); tr.setAttribute("x2", x); tr.setAttribute("y2", y + 8); f.setAttribute("opacity", p < 0.02 ? 0.3 : 1); };
    },
    cruise: function (svg, c) {
      stars(svg);
      var d = "M104 205 Q 330 -30 556 84";
      el("circle", { cx: 70, cy: 215, r: 32, class: "mj-earth" }, svg); text(svg, 70, 262, T("mj.earth"), "mj-lbl", "middle");
      var rr = c.planet === "mars" ? 20 : 13;
      el("circle", { cx: 580, cy: 76, r: rr, class: c.planet === "mars" ? "mj-mars" : "mj-moon" }, svg); text(svg, 580, 76 + rr + 16, T("body." + c.planet), "mj-lbl", "middle");
      var base = el("path", { d: d, class: "mj-path" }, svg), done = el("path", { d: d, class: "mj-trail" }, svg), len = base.getTotalLength(), cr = el("g", { class: "mj-craft" }, svg);
      el("circle", { r: 5 }, cr);
      done.setAttribute("stroke-dasharray", "0 " + len);
      return function (p) { var l = p * len, pt = base.getPointAtLength(l); done.setAttribute("stroke-dasharray", l.toFixed(1) + " " + len); tf(cr, pt.x, pt.y); };
    },
    approach: function (svg, c) {
      stars(svg);
      var rr = 74, cx = 430, cy = 150, mars = c.planet === "mars";
      if (mars) el("circle", { cx: cx, cy: cy, r: rr + 9, class: "mj-atmo" }, svg);
      el("circle", { cx: cx, cy: cy, r: rr, class: mars ? "mj-mars" : "mj-moon" }, svg);
      text(svg, cx, cy + rr + 34, T("body." + c.planet), "mj-lbl", "middle");
      var d = "M20 40 Q 250 20 372 112", base = el("path", { d: d, class: "mj-path" }, svg), done = el("path", { d: d, class: "mj-trail" }, svg), len = base.getTotalLength(), cr = el("g", { class: "mj-craft" }, svg);
      el("circle", { r: 5 }, cr);
      return function (p) { var l = p * len, pt = base.getPointAtLength(l); done.setAttribute("stroke-dasharray", l.toFixed(1) + " " + len); tf(cr, pt.x, pt.y); };
    },
    orbit: function (svg, c) {
      stars(svg);
      var mars = c.planet === "mars", cx = 330, cy = 150, rr = 62;
      el("circle", { cx: cx, cy: cy, r: rr, class: mars ? "mj-mars" : "mj-moon" }, svg);
      text(svg, cx, cy + 4, T("body." + c.planet), "mj-lbl mj-lbl-in", "middle");
      var d = "M20 50 Q 150 50 188 150 A142 54 0 0 0 472 150 A142 54 0 0 0 188 150", base = el("path", { d: d, class: "mj-path" }, svg), done = el("path", { d: d, class: "mj-trail" }, svg), len = base.getTotalLength(), cr = el("g", { class: "mj-craft" }, svg);
      el("circle", { r: 5 }, cr);
      return function (p) { var l = p * len, pt = base.getPointAtLength(l); done.setAttribute("stroke-dasharray", l.toFixed(1) + " " + len); tf(cr, pt.x, pt.y); };
    },
    entry: function (svg, c) {
      stars(svg);
      el("circle", { cx: 320, cy: 640, r: 440, class: "mj-atmo" }, svg);
      el("circle", { cx: 320, cy: 660, r: 440, class: c.planet === "mars" ? "mj-mars" : "mj-moon" }, svg);
      text(svg, 320, 262, T("body." + c.planet), "mj-lbl", "middle");
      var g = el("g", { class: "mj-craft" }, svg), glow = el("ellipse", { cx: -16, cy: 0, rx: 22, ry: 9, class: "mj-heat" }, g);
      el("path", { d: "M0 -8 L10 -4 V4 L0 8 Z" }, g);
      var lb = text(svg, 0, 0, T("mj.heat"), "mj-lbl", "start");
      return function (p) { var x = 40 + p * 290, y = 14 + p * p * 176 + p * 14, a = Math.atan2(190 * p + 14, 290) * 57; tf(g, x, y, a * 0.9 + 12); glow.setAttribute("opacity", clamp((p - 0.25) * 2, 0, 1)); lb.setAttribute("x", x + 22); lb.setAttribute("y", y - 14); lb.setAttribute("opacity", p > 0.35 && p < 0.9 ? 1 : 0); };
    },
    descent: function (svg, c) {
      var mars = c.planet === "mars", edl = c.edl, crane = mars && edl === "crane";
      el("rect", { x: 0, y: 0, width: 640, height: 250, class: mars ? "mj-sky-mars" : "mj-sky-moon" }, svg);
      if (!mars) stars(svg);
      ground(svg, 232);
      var g = el("g", {}, svg), chute = el("g", { class: "mj-chute" }, g);
      el("path", { d: "M-30 -64 Q0 -92 30 -64 Z M-30 -64 L-3 -22 M30 -64 L3 -22 M0 -64 L0 -22", class: "mj-chute-p" }, chute);
      var body = lander(g), fl = flame(g), bag = el("circle", { r: 26, cy: -8, class: "mj-bag" }, g);
      var cr = el("g", {}, svg), stg = el("g", { class: "mj-craft" }, cr), cab = el("path", { class: "mj-line" }, cr), rv = rover(cr), cfl = [-14, 14].map(function (dx) { var f = flame(cr); f.setAttribute("transform", "translate(" + dx + " 0)"); return f; });
      el("rect", { x: -20, y: -8, width: 40, height: 9, rx: 2 }, stg);
      var lbl = text(svg, 320, 262, "", "mj-lbl", "middle");
      return function (p) {
        var x = 320 + Math.sin(p * 3) * 14, chuteP = crane ? 0.5 : 0.72, chuteOn = mars && p > 0.08 && p < chuteP;
        if (crane && p >= 0.5) {
          // rocket-powered descent stage hovers and lowers the rover on cables
          g.setAttribute("opacity", 0); cr.setAttribute("opacity", 1);
          var hy = 70 + ease(clamp((p - 0.5) / 0.3, 0, 1)) * 60, low = clamp((p - 0.8) / 0.2, 0, 1), ry = hy + 24 + low * (222 - hy - 24);
          tf(stg, x, hy); tf(rv, x, ry, 0, 0.9);
          cab.setAttribute("d", "M" + (x - 14) + " " + (hy + 1) + " L" + (x - 8) + " " + (ry - 15) + " M" + (x + 14) + " " + (hy + 1) + " L" + (x + 8) + " " + (ry - 15));
          cfl.forEach(function (f, i) { tf(f, x + (i ? 14 : -14), hy + 1); f.setAttribute("opacity", 0.6 + 0.4 * Math.sin(p * 90 + i)); });
          chute.setAttribute("opacity", 0); lbl.textContent = "";
          return;
        }
        cr.setAttribute("opacity", 0); g.setAttribute("opacity", 1);
        var y = 24 + ease(crane ? p / 0.5 : p) * (crane ? 70 : 168);
        tf(g, x, y);
        chute.setAttribute("opacity", chuteOn ? 1 : 0);
        var engine = !mars ? p > 0.05 : p > 0.6;
        fl.setAttribute("opacity", engine ? 0.6 + 0.4 * Math.sin(p * 90) : 0);
        bag.setAttribute("opacity", mars && edl === "airbag" && p > 0.8 ? 0.9 : 0);
        lbl.textContent = chuteOn ? T("mj.chute") : "";
      };
    },
    landing: function (svg, c) {
      var mars = c.planet === "mars", edl = c.edl;
      el("rect", { x: 0, y: 0, width: 640, height: 250, class: mars ? "mj-sky-mars" : "mj-sky-moon" }, svg);
      if (!mars) stars(svg);
      ground(svg, 232);
      var g = el("g", {}, svg), bag = el("circle", { r: 28, cy: -6, class: "mj-bag" }, g), body, cab = el("path", { class: "mj-line" }, svg), stg = el("g", { class: "mj-craft" }, svg);
      el("rect", { x: -20, y: -8, width: 40, height: 9, rx: 2 }, stg);
      var fl = flame(g), dust = [0, 1, 2, 3].map(function (i) { return el("circle", { cy: 232, r: 4, class: "mj-dust" }, svg); });
      body = (mars && edl === "crane") ? rover(g) : lander(g);
      return function (p) {
        var x = 320, y, i;
        if (mars && edl === "crane") {
          var low = clamp(p / 0.62, 0, 1); y = 150 + ease(low) * 80; tf(g, x, y, 0, 1.0);
          cab.setAttribute("d", p < 0.66 ? "M" + (x - 14) + " 78 L" + (x - 8) + " " + (y - 15) + " M" + (x + 14) + " 78 L" + (x + 8) + " " + (y - 15) : "");
          var up = clamp((p - 0.66) / 0.34, 0, 1); tf(stg, x + up * 260, 70 - up * 70); stg.setAttribute("opacity", 1 - up * 0.6);
          fl.setAttribute("opacity", 0); bag.setAttribute("opacity", 0);
        } else if (mars && edl === "airbag") {
          cab.setAttribute("d", ""); stg.setAttribute("opacity", 0);
          var q = clamp(p / 0.78, 0, 1), h = Math.abs(Math.cos(q * Math.PI * 3.5)) * (1 - q) * 150;
          y = 232 - 6 - h * (q < 1 ? 1 : 0) - (q >= 1 ? 0 : 0); x = 150 + q * 170;
          tf(g, x, Math.min(y + 8, 232 + 0), 0); bag.setAttribute("opacity", p < 0.8 ? 0.9 : 0.9 * (1 - (p - 0.8) / 0.2));
          fl.setAttribute("opacity", 0);
        } else {
          cab.setAttribute("d", ""); stg.setAttribute("opacity", 0);
          var s = clamp(p / 0.5, 0, 1); y = 190 + ease(s) * 42 + Math.sin(clamp((p - 0.5) / 0.5, 0, 1) * Math.PI) * -3;
          tf(g, x, y + 0); fl.setAttribute("opacity", p < 0.5 ? 0.9 : 0); bag.setAttribute("opacity", 0);
        }
        var d0 = clamp((p - 0.45) / 0.55, 0, 1);
        for (i = 0; i < dust.length; i++) { var s2 = (i % 2 ? 1 : -1) * (14 + d0 * (30 + i * 18)); dust[i].setAttribute("cx", (mars && edl === "airbag" ? 150 + clamp(p / 0.78, 0, 1) * 170 : 320) + s2); dust[i].setAttribute("opacity", d0 > 0 && d0 < 1 ? (1 - d0) * 0.6 : 0); dust[i].setAttribute("r", 3 + d0 * 7); }
      };
    },
    opsRover: function (svg, c) { return SC._ops(svg, c, true, false); },
    opsLander: function (svg, c) { return SC._ops(svg, c, false, false); },
    opsCrew: function (svg, c) { return SC._ops(svg, c, false, true); },
    opsSample: function (svg, c) { return SC._ops(svg, c, false, false, true); },
    _ops: function (svg, c, rov, crew, drill) {
      var mars = c.planet === "mars";
      el("rect", { x: 0, y: 0, width: 640, height: 232, class: mars ? "mj-sky-mars" : "mj-sky-moon" }, svg);
      if (!mars) stars(svg);
      ground(svg, 232);
      var l = lander(svg); tf(l, 250, 232);
      var sig = signal(svg, 520, 52); text(svg, 520, 24, T("mj.toEarth"), "mj-lbl", "middle");
      var mover = rov ? rover(svg) : null, man = null;
      if (crew) { man = el("g", { class: "mj-craft" }, svg); el("circle", { cy: -22, r: 4 }, man); el("rect", { x: -3, y: -18, width: 6, height: 14, rx: 2 }, man); el("path", { d: "M-2 -4 L-4 0 M2 -4 L4 0", class: "mj-line" }, man); }
      var dr = null; if (drill) { dr = el("path", { class: "mj-line", d: "M300 232 V200" }, svg); }
      return function (p) {
        sig(p, 1);
        if (mover) { var x = 340 + Math.sin(p * Math.PI) * 190 * (p < 1 ? 1 : 1); tf(mover, 300 + p * 240, 232 - Math.sin(p * 18) * 1.2); }
        if (man) { tf(man, 300 + Math.sin(p * Math.PI * 2) * 80, 232); }
        if (dr) { dr.setAttribute("d", "M300 " + (232 - 16 + Math.abs(Math.sin(p * 12)) * 12) + " V196"); }
      };
    },
    ascent: function (svg, c) {
      el("rect", { x: 0, y: 0, width: 640, height: 232, class: "mj-sky-moon" }, svg); stars(svg); ground(svg, 232);
      var base = el("g", { class: "mj-craft" }, svg); el("rect", { x: -16, y: -12, width: 32, height: 12, rx: 2 }, base); el("path", { d: "M-14 0 L-22 14 M14 0 L22 14", class: "mj-line" }, base); tf(base, 250, 224);
      var up = el("g", { class: "mj-craft" }, svg); el("rect", { x: -12, y: -26, width: 24, height: 16, rx: 3 }, up); var f = flame(up); f.setAttribute("transform", "translate(0 -10)");
      var tr = el("line", { class: "mj-trail", x1: 250, y1: 190, x2: 250, y2: 190 }, svg);
      return function (p) { var q = p < 0.12 ? 0 : (p - 0.12) / 0.88, y = 200 - q * q * 170, x = 250 + q * q * 220; tf(up, x, y, q * 30); f.setAttribute("opacity", p > 0.05 ? 1 : 0); tr.setAttribute("x2", x); tr.setAttribute("y2", y - 14); tr.setAttribute("y1", 196); };
    },
    splash: function (svg, c) { return SC._ret(svg, c, true); },
    capsule: function (svg, c) { return SC._ret(svg, c, false); },
    _ret: function (svg, c, sea) {
      el("rect", { x: 0, y: 0, width: 640, height: 220, class: "mj-sky-earth" }, svg);
      el("rect", { x: 0, y: 220, width: 640, height: 60, class: sea ? "mj-sea" : "mj-steppe" }, svg);
      text(svg, 320, 262, T("mj.earth"), "mj-lbl", "middle");
      var g = el("g", { class: "mj-craft" }, svg), ch = el("path", { d: "M-34 -50 Q0 -86 34 -50 Z M-34 -50 L-5 -12 M34 -50 L5 -12 M0 -50 V-12", class: "mj-chute-p" }, g);
      el("path", { d: "M-8 -12 H8 L5 0 H-5 Z" }, g);
      var rings = [0, 1].map(function () { return el("ellipse", { cx: 320, cy: 222, rx: 4, ry: 1.5, class: "mj-ring" }, svg); });
      return function (p) { var q = clamp(p / 0.82, 0, 1), y = 28 + ease(q) * 190; tf(g, 320 + Math.sin(q * 5) * 10, y); ch.setAttribute("opacity", q < 1 ? 1 : 0.5); var s = clamp((p - 0.82) / 0.18, 0, 1); rings.forEach(function (r, i) { r.setAttribute("rx", 4 + s * (40 + i * 28)); r.setAttribute("ry", 1.5 + s * (6 + i * 4)); r.setAttribute("opacity", s > 0 ? (1 - s) * 0.8 : 0); }); };
    },
    end: function (svg, c) {
      var mars = c.planet === "mars";
      el("rect", { x: 0, y: 0, width: 640, height: 232, class: mars ? "mj-sky-mars" : "mj-sky-moon" }, svg);
      if (!mars) stars(svg);
      ground(svg, 232);
      var l = c.rover ? rover(svg) : lander(svg); tf(l, 320, 232);
      var sig = signal(svg, 520, 52); var lbl = text(svg, 520, 24, T("mj.toEarth"), "mj-lbl", "middle");
      return function (p) { var f = c.active ? 1 : 1 - ease(clamp(p / 0.7, 0, 1)); sig(p, f); l.setAttribute("opacity", c.active ? 1 : 1 - 0.55 * ease(p)); lbl.setAttribute("opacity", f); };
    },
    legacy: function (svg, c) {
      var mars = c.planet === "mars";
      el("rect", { x: 0, y: 0, width: 640, height: 232, class: mars ? "mj-sky-mars" : "mj-sky-moon" }, svg);
      if (!mars) stars(svg);
      ground(svg, 232);
      var objs = c.objs.slice(0, 6), n = objs.length, pins = [];
      objs.forEach(function (o, i) {
        var x = n === 1 ? 320 : 90 + i * (460 / (n - 1)), t = o.type || "", g;
        if (/rover/i.test(t) && !/helicopter/i.test(t)) g = rover(svg); else if (/helicopter/i.test(t)) { g = el("g", { class: "mj-craft" }, svg); el("rect", { x: -8, y: -12, width: 16, height: 8, rx: 2 }, g); el("path", { d: "M-18 -16 H18 M0 -16 V-12", class: "mj-line" }, g); }
        else if (/impact/i.test(t)) { g = el("g", { class: "mj-craft" }, svg); el("ellipse", { cy: -2, rx: 16, ry: 5, class: "mj-crater" }, g); }
        else g = lander(svg);
        tf(g, x, 232);
        pins.push(el("circle", { cx: x, cy: 232, r: 8, class: "mj-ring" }, svg));
      });
      return function (p) { pins.forEach(function (c2, i) { var q = ((p * 2 + i * 0.17) % 1); c2.setAttribute("r", (10 + q * 26).toFixed(1)); c2.setAttribute("opacity", ((1 - q) * 0.7).toFixed(2)); }); };
    }
  };

  /* ---------- rendering ---------- */
  function sceneCtx(g, s) {
    var rov = g.objs.some(function (o) { return /rover/i.test(o.type) && !/helicopter/i.test(o.type); });
    return { planet: g.planet, edl: g.v.edl || "retro", objs: g.objs, active: g.active, rover: rov, kind: g.v.kind };
  }
  function mountScene() {
    var svg = $("#mj-svg"), s = st.stages[st.i];
    svg.innerHTML = "";
    el("rect", { x: 0, y: 0, width: 640, height: 280, class: "mj-bg" }, svg);
    var fn = SC[s.scene] || SC.cruise, ctx = sceneCtx(st.g, s);
    st.scene = fn(svg, ctx);
    svg.setAttribute("aria-label", s.title + " — " + T("mj.sketch"));
    apply();
  }
  function apply() {
    var p = clamp(st.t / ANIM, 0, 1);
    if (st.scene) st.scene(p);
    var tot = ANIM + DWELL, bar = $("#mj-bar"); if (bar) bar.style.width = (clamp(st.t / tot, 0, 1) * 100).toFixed(1) + "%";
  }
  function stepsHtml() {
    return st.stages.map(function (s, i) {
      return '<li><button type="button" data-i="' + i + '"' + (i === st.i ? ' class="on" aria-current="step"' : "") + '><span class="n">' + (i + 1) + '</span><b>' + esc(s.title) + '</b><span class="d">' + esc(s.date ? host.fmtDate(s.date) : "—") + "</span></button></li>";
    }).join("");
  }
  function mediaHtml(s) {
    var q = (st.g.v.q || st.g.name) + " " + (WORD[s.legacy ? "legacy" : (s.id === "end" && st.g.v.kind === "sample" ? "endReturn" : s.id)] || ""), m = media[q];
    q = q.trim();
    var h = '<h4>' + esc(T("mj.media")) + "</h4>";
    if (!m || m.state === "loading") return h + '<p class="note">' + esc(T("mj.mediaLoading")) + "</p>";
    if (m.state === "fail") return h + '<p class="note">' + esc(T("mj.mediaFail")) + ' <a href="https://images.nasa.gov/search?q=' + encodeURIComponent(q) + '" target="_blank" rel="noopener">' + esc(T("mj.nasaPage")) + "</a></p>";
    if (!m.photos.length && !m.videos.length) return h + '<p class="note">' + esc(T("mj.mediaNone")) + ' <a href="https://images.nasa.gov/search?q=' + encodeURIComponent(q) + '" target="_blank" rel="noopener">' + esc(T("mj.nasaPage")) + "</a></p>";
    if (m.photos.length) h += '<h5>' + esc(T("mj.photos")) + '</h5><div class="photos">' + m.photos.map(function (it, i) { return '<figure><button class="ph-btn" data-ph="' + i + '"><img loading="lazy" src="' + esc(it.thumb) + '" alt="' + esc(it.title) + '"></button><figcaption>' + esc(it.title) + "</figcaption></figure>"; }).join("") + "</div>";
    if (m.videos.length) h += '<h5>' + esc(T("mj.videos")) + '</h5><div class="mj-vids">' + m.videos.map(function (v, i) {
      return '<div class="mj-vid" data-v="' + i + '"><button type="button" class="mj-vplay" data-v="' + i + '" aria-label="' + esc(T("mj.play1") + ": " + v.title) + '">' + (v.thumb ? '<img loading="lazy" src="' + esc(v.thumb) + '" alt="">' : "") + '<span class="tri" aria-hidden="true"></span></button><p>' + esc(v.title) + "</p></div>";
    }).join("") + "</div>";
    return h + '<p class="note">' + esc(T("mj.mediaNote", { q: q })) + ' <a href="https://images.nasa.gov/search?q=' + encodeURIComponent(q) + '" target="_blank" rel="noopener">' + esc(T("mj.nasaPage")) + "</a></p>";
  }
  function infoHtml() {
    var s = st.stages[st.i], g = st.g, h = "";
    h += '<p class="mj-kick">' + esc(T("mj.step", { n: st.i + 1, m: st.stages.length })) + "</p><h3>" + esc(s.title) + "</h3>";
    if (s.rows.length) h += '<dl class="kv">' + s.rows.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + "</dl>";
    h += "<p>" + esc(s.desc) + "</p>";
    s.notes.forEach(function (n) { h += '<p class="note">' + esc(n) + "</p>"; });
    if (s.legacy) {
      h += "<h4>" + esc(T("mj.legacy")) + '</h4><ul class="mc-objs">' + g.objs.map(function (o) {
        var l = host.loc(o);
        return '<li><div><b>' + esc(l.name) + '</b><span class="mc-m">' + esc(l.type) + " · " + esc(T("status." + o.status)) + '</span><span class="mono mc-m">' + esc(host.coords(o)) + '</span></div><button class="ghost" data-oid="' + esc(o.id) + '">' + esc(T("mj.openCard")) + "</button></li>";
      }).join("") + "</ul>";
    }
    if (s.id === "landing" || s.legacy) h += '<div class="cactions"><button class="cta small" id="mj-3d">' + esc(T("mj.go3d")) + '</button><button class="cta small alt" id="mj-2d">' + esc(T("mj.go2d")) + "</button></div>";
    var src = {}; g.objs.forEach(function (o) { (o.sources || []).forEach(function (x) { if (x && x.url) src[x.url] = x.title || x.url; }); });
    var u = Object.keys(src);
    if (u.length && (s.id === "launch" || s.legacy)) h += '<div class="links"><h4>' + esc(T("card.sources")) + '</h4><ul class="facts">' + u.map(function (k) { return '<li><a href="' + esc(k) + '" target="_blank" rel="noopener">' + esc(src[k]) + "</a></li>"; }).join("") + "</ul></div>";
    return h;
  }
  function renderStatic() {
    var s = st.stages[st.i];
    $("#mj-steps").innerHTML = stepsHtml();
    $("#mj-info").innerHTML = infoHtml();
    $("#mj-media").innerHTML = mediaHtml(s);
    $("#mj-n").textContent = T("mj.step", { n: st.i + 1, m: st.stages.length });
    $("#mj-prev").disabled = st.i === 0;
    $("#mj-next").disabled = st.i === st.stages.length - 1;
    var pl = $("#mj-play"), atEnd = st.i === st.stages.length - 1 && st.t >= ANIM + DWELL;
    pl.textContent = atEnd ? T("mj.replay") : (st.playing ? T("mj.pause") : T("mj.play"));
    pl.setAttribute("aria-pressed", st.playing ? "true" : "false");
    var on = $("#mj-steps .on"), box = $("#mj-steps");
    if (on && box) box.scrollLeft = Math.max(0, on.parentNode.offsetLeft - box.clientWidth / 2 + on.offsetWidth / 2);
    loadMedia(s);
  }
  function loadMedia(s) {
    var q = ((st.g.v.q || st.g.name) + " " + (WORD[s.legacy ? "legacy" : (s.id === "end" && st.g.v.kind === "sample" ? "endReturn" : s.id)] || "")).trim();
    if (media[q] && media[q].state !== "loading") return;
    if (media[q]) return;
    var m = media[q] = { state: "loading", photos: [], videos: [] }, pend = 2, fails = 0, key = st.key + "|" + st.i;
    function done() { if (--pend) return; m.state = fails === 2 ? "fail" : "ok"; if (st.open && st.key + "|" + st.i === key) $("#mj-media").innerHTML = mediaHtml(st.stages[st.i]); }
    host.nasa(q, "image", 12, function (all) {
      m.photos = all.filter(function (it) { return it.links && it.links[0]; }).slice(0, 6).map(function (it) {
        var d = it.data[0], thumb = it.links[0].href;
        return { thumb: thumb, full: thumb.replace("~thumb", "~medium"), title: d.title || "", nasaId: d.nasa_id, date: (d.date_created || "").slice(0, 10), desc: d.description || "", center: d.center || "" };
      }); done();
    }, function () { fails++; done(); });
    host.nasa(q, "video", 6, function (all) {
      m.videos = all.slice(0, 3).map(function (it) { var d = it.data[0]; return { title: d.title || "", nasaId: d.nasa_id, thumb: it.links && it.links[0] ? it.links[0].href : "", manifest: it.href || "" }; }); done();
    }, function () { fails++; done(); });
  }
  function playVideo(i) {
    var s = st.stages[st.i], q = ((st.g.v.q || st.g.name) + " " + (WORD[s.legacy ? "legacy" : (s.id === "end" && st.g.v.kind === "sample" ? "endReturn" : s.id)] || "")).trim(), v = media[q] && media[q].videos[i];
    var box = $('.mj-vid[data-v="' + i + '"]'); if (!v || !box) return;
    setPlaying(false);
    function fail() { box.querySelector("p").innerHTML = esc(T("mj.videoFail")) + ' <a href="https://images.nasa.gov/details/' + encodeURIComponent(v.nasaId) + '" target="_blank" rel="noopener">' + esc(T("mj.nasaPage")) + "</a>"; }
    if (!v.manifest) return fail();
    fetch(v.manifest.replace(/^http:/, "https:")).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (list) {
      list = (list || []).filter(function (u) { return /\.mp4$/i.test(u); });
      var pick = null; [/~mobile\.mp4$/i, /~small\.mp4$/i, /~medium\.mp4$/i, /~large\.mp4$/i, /\.mp4$/i].some(function (re) { return list.some(function (u) { if (re.test(u)) { pick = u; return true; } }); });
      if (!pick) throw 0;
      var vd = document.createElement("video"); vd.controls = true; vd.preload = "metadata"; vd.playsInline = true; vd.src = pick.replace(/^http:/, "https:"); if (v.thumb) vd.poster = v.thumb;
      vd.addEventListener("error", fail);
      box.replaceChild(vd, box.querySelector(".mj-vplay")); vd.play && vd.play().catch(function () {});
    }).catch(fail);
  }

  /* ---------- player ---------- */
  function setPlaying(v) { st.playing = v; var pl = $("#mj-play"); if (!pl) return; var atEnd = st.i === st.stages.length - 1 && st.t >= ANIM + DWELL; pl.textContent = atEnd ? T("mj.replay") : (v ? T("mj.pause") : T("mj.play")); pl.setAttribute("aria-pressed", v ? "true" : "false"); if (v) loop(); }
  function loop() { if (st.raf || !st.open) return; st.last = 0; st.raf = requestAnimationFrame(frame); }
  function frame(ts) {
    st.raf = 0; if (!st.open || !st.playing) return;
    var dt = st.last ? Math.min(ts - st.last, 80) : 0; st.last = ts;
    st.t += dt; apply();
    if (st.t >= ANIM + DWELL) {
      if (st.i < st.stages.length - 1) { goTo(st.i + 1, true); return; }
      setPlaying(false); return;
    }
    st.raf = requestAnimationFrame(frame);
  }
  function goTo(i, keepPlay) {
    i = clamp(i, 0, st.stages.length - 1);
    st.i = i; st.t = host.reduce() ? ANIM : 0;
    if (!keepPlay) { /* manual navigation keeps the current play state */ }
    mountScene(); renderStatic();
    if (st.playing && !host.reduce()) loop();
  }

  /* ---------- open / close ---------- */
  function fillPicker() {
    var ms = missions(), sel = $("#mj-mission"), pl = st.g ? st.g.planet : "moon";
    $("#mj-planet").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.p === pl); b.setAttribute("aria-pressed", b.dataset.p === pl ? "true" : "false"); b.textContent = T("body." + b.dataset.p); });
    sel.innerHTML = ms.filter(function (m) { return m.planet === pl; }).map(function (m) { return '<option value="' + esc(m.key) + '"' + (st.g && m.key === st.g.key ? " selected" : "") + ">" + esc(host.mission(m.o)) + "</option>"; }).join("");
  }
  function choose(key, restart) {
    var g = missions().filter(function (m) { return m.key === key; })[0] || missions()[0];
    st.g = g; st.key = g.key; st.stages = build(g); fillPicker();
    if (restart !== false) { st.i = 0; st.t = host.reduce() ? ANIM : 0; }
    mountScene(); renderStatic();
  }
  function open(key) {
    var root = $("#mj"); if (!root) return;
    if (st.open && !key) return;
    var first = missions().filter(function (m) { return m.planet === "mars"; })[0];
    st.playing = !host.reduce();
    st.open = true; root.hidden = false; document.body.classList.add("mj-open");
    st.opener = document.activeElement;
    choose(key || (st.key) || (first && first.key), true);
    setTimeout(function () { var c = $("#mj-close"); if (c) c.focus(); }, 30);
    if (st.playing) loop();
    if (host.onState) host.onState(true);
  }
  function close(silent) {
    if (!st.open) return;
    st.open = false; $("#mj").hidden = true; document.body.classList.remove("mj-open");
    if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
    if (!silent && st.opener && st.opener.focus) try { st.opener.focus(); } catch (e) { /* ignore */ }
    if (host.onState) host.onState(false, silent);
  }
  function go(mode) { var o = st.g && st.g.o; if (!o) return; close(true); host.go(o, mode); }

  function init(h) {
    host = h;
    var root = $("#mj"); if (!root) return;
    $("#mj-close").addEventListener("click", function () { close(); });
    root.addEventListener("click", function (e) { if (e.target === root) close(); });
    $("#mj-prev").addEventListener("click", function () { goTo(st.i - 1); });
    $("#mj-next").addEventListener("click", function () { goTo(st.i + 1); });
    $("#mj-play").addEventListener("click", function () {
      var atEnd = st.i === st.stages.length - 1 && st.t >= ANIM + DWELL;
      if (atEnd) { st.playing = true; goTo(0); setPlaying(true); return; }
      if (!st.playing && host.reduce()) { st.t = 0; }
      setPlaying(!st.playing);
    });
    $("#mj-planet").addEventListener("click", function (e) { var b = e.target.closest("button[data-p]"); if (!b) return; var f = missions().filter(function (m) { return m.planet === b.dataset.p; })[0]; if (f) choose(f.key, true); });
    $("#mj-mission").addEventListener("change", function (e) { choose(e.target.value, true); });
    $("#mj-steps").addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (b) goTo(+b.dataset.i); });
    $("#mj-info").addEventListener("click", function (e) {
      var b = e.target.closest("[data-oid]"); if (b) { var id = b.dataset.oid; close(true); host.openObject(id); return; }
      if (e.target.closest("#mj-3d")) go("3d"); else if (e.target.closest("#mj-2d")) go("2d");
    });
    $("#mj-media").addEventListener("click", function (e) {
      var ph = e.target.closest("[data-ph]"), vp = e.target.closest(".mj-vplay");
      if (ph) { var s = st.stages[st.i], q = ((st.g.v.q || st.g.name) + " " + (WORD[s.legacy ? "legacy" : (s.id === "end" && st.g.v.kind === "sample" ? "endReturn" : s.id)] || "")).trim(); host.lightbox(media[q].photos, +ph.dataset.ph); }
      else if (vp) playVideo(+vp.dataset.v);
    });
    root.addEventListener("keydown", function (e) {
      if (e.target.tagName === "SELECT" || e.target.tagName === "VIDEO") return;
      if (e.key === "ArrowRight") { goTo(st.i + 1); e.preventDefault(); } else if (e.key === "ArrowLeft") { goTo(st.i - 1); e.preventDefault(); }
      else if (e.key === " " && e.target.tagName !== "BUTTON") { setPlaying(!st.playing); e.preventDefault(); }
      else if (e.key === "Tab") { // keep focus inside the dialog
        var f = [].slice.call(root.querySelectorAll("button:not([disabled]),select,a[href],video")).filter(function (n) { return n.offsetParent !== null; });
        if (!f.length) return; var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { z.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === z) { a.focus(); e.preventDefault(); }
      }
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden && st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; } else if (!document.hidden && st.open && st.playing) loop(); });
    window.I18N.onChange(function () { if (st.open) render(); });
  }
  function render() {
    if (!st.open || !st.g) return;
    var keep = st.t; st.stages = build(st.g); fillPicker(); mountScene(); st.t = keep; apply(); renderStatic();
    if (window.I18N) window.I18N.apply($("#mj"));
  }

  window.MJ = { init: init, open: open, close: close, render: render, isOpen: function () { return st.open; }, key: function (o) { return o.planet + ":" + o.mission; },
    state: function () { return { open: st.open, key: st.key, i: st.i, n: st.stages.length, playing: st.playing, t: st.t, titles: st.stages.map(function (s) { return s.title; }), stages: st.stages.map(function (s) { return { id: s.id, rows: s.rows, date: s.date }; }) }; },
    _goto: function (i) { goTo(i); }, _seek: function (p) { setPlaying(false); st.t = p * ANIM; apply(); }, _build: function (k) { var g = missions().filter(function (m) { return m.key === k; })[0]; return g ? build(g) : null; } };
})();
