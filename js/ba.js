/* BEFORE / AFTER: compare a mission-era NASA image with a later NASA image of the same object or site.
 *
 * Nothing is hard-coded: no image address or NASA id appears in this project. Candidates are searched at run time in
 * the NASA Image and Video Library (images-api.nasa.gov) and kept ONLY if their NASA metadata (title, description,
 * keywords, date) identifies the same object. Place correspondence is therefore established by NAME in the metadata,
 * not by coordinates, and the interface says so. When nothing qualifies the panel shows nothing instead of a doubtful pair.
 *
 * Rules (see KEYS and classify):
 *  - the text must match the object's own name pattern (and a context pattern for ambiguous words such as "Spirit");
 *  - Apollo records that name a different Apollo mission and not this one are rejected;
 *  - BEFORE: dated within the mission era (landing year -1 .. +3);
 *  - AFTER: dated at least 3 years after landing and not before the orbiter era (Moon 2009 / Mars 2006), and the
 *    text must name an orbiter instrument (LRO, LROC, HiRISE, MRO, CTX ...);
 *  - the dates shown are the dates stored in NASA's metadata (for archive scans this can be a record date). */
(function () {
  "use strict";

  var API = "https://images-api.nasa.gov/search";
  // re: name pattern; ctx: extra context for ambiguous names; q: search words; num: Apollo mission number; prefer: ranking hint
  var KEYS = {
    "apollo-11-lm": { re: /apollo[ -]?11\b/i, q: "Apollo 11", num: 11 }, "apollo-12-lm": { re: /apollo[ -]?12\b/i, q: "Apollo 12", num: 12 },
    "apollo-14-lm": { re: /apollo[ -]?14\b/i, q: "Apollo 14", num: 14 }, "apollo-15-lm": { re: /apollo[ -]?15\b/i, q: "Apollo 15", num: 15 },
    "apollo-16-lm": { re: /apollo[ -]?16\b/i, q: "Apollo 16", num: 16 }, "apollo-17-lm": { re: /apollo[ -]?17\b/i, q: "Apollo 17", num: 17 },
    "apollo-15-lrv": { re: /apollo[ -]?15\b/i, q: "Apollo 15 rover", num: 15, prefer: /rover|lrv/i },
    "apollo-16-lrv": { re: /apollo[ -]?16\b/i, q: "Apollo 16 rover", num: 16, prefer: /rover|lrv/i },
    "apollo-17-lrv": { re: /apollo[ -]?17\b/i, q: "Apollo 17 rover", num: 17, prefer: /rover|lrv/i },
    "apollo-14-sivb": { re: /apollo[ -]?14\b/i, ctx: /s-?ivb|impact|third stage/i, q: "Apollo 14 S-IVB impact", num: 14 },
    "apollo-17-sivb": { re: /apollo[ -]?17\b/i, ctx: /s-?ivb|impact|third stage/i, q: "Apollo 17 S-IVB impact", num: 17 },
    "surveyor-3": { re: /surveyor[ -]?3\b/i, q: "Surveyor 3" },
    "luna-16": { re: /luna[ -]?16\b/i, q: "Luna 16" }, "luna-17": { re: /luna[ -]?17\b|lunokhod/i, q: "Luna 17 Lunokhod" },
    "lunokhod-1": { re: /lunokhod[ -]?1\b|luna[ -]?17\b/i, q: "Lunokhod 1" }, "chandrayaan-3": { re: /chandrayaan/i, q: "Chandrayaan-3 Vikram" },
    "viking-1": { re: /viking[ -]?(1|one)\b|chryse/i, ctx: /mars|lander/i, q: "Viking 1 lander" },
    "viking-2": { re: /viking[ -]?(2|two)\b|utopia/i, ctx: /mars|lander/i, q: "Viking 2 lander" },
    "pathfinder": { re: /pathfinder|sojourner/i, ctx: /mars|lander|rover/i, q: "Mars Pathfinder Sojourner" },
    "spirit": { re: /\bspirit\b/i, ctx: /mars|rover|gusev|mer[ -]?a\b/i, q: "Spirit rover Gusev" },
    "opportunity": { re: /\bopportunity\b/i, ctx: /mars|rover|meridiani|mer[ -]?b\b/i, q: "Opportunity rover Meridiani" },
    "phoenix": { re: /\bphoenix\b/i, ctx: /mars|lander|polar/i, q: "Phoenix Mars lander" },
    "curiosity": { re: /\bcuriosity\b/i, ctx: /mars|rover|gale|msl/i, q: "Curiosity rover Gale" },
    "insight": { re: /\binsight\b/i, ctx: /mars|lander|elysium/i, q: "InSight Mars lander" },
    "perseverance": { re: /\bperseverance\b/i, ctx: /mars|rover|jezero/i, q: "Perseverance rover Jezero" },
    "ingenuity": { re: /ingenuity/i, ctx: /mars|helicopter/i, q: "Ingenuity Mars helicopter" }
  };
  var ORBITER = /\b(LRO|LROC|lunar reconnaissance|HiRISE|MRO|mars reconnaissance|CTX|context camera)\b/i;

  var host = null, cache = {}, cur = null, st = null, lastFocus = null;
  function $(s) { return document.querySelector(s); }
  function yr(d) { var y = parseInt(String(d || "").slice(0, 4), 10); return isFinite(y) ? y : null; }
  function textOf(d) { return [d.title, d.description, d.description_508, (d.keywords || []).join(" ")].join(" "); }

  function matches(o, key, text) {
    if (!key.re.test(text)) return false;
    if (key.ctx && !key.ctx.test(text)) return false;
    if (key.num) {   // an Apollo record that names other missions but not this one is somebody else's
      var nums = (text.match(/apollo[ -]?(\d+)/gi) || []).map(function (m) { return parseInt(m.replace(/\D/g, ""), 10); });
      if (nums.length && nums.indexOf(key.num) === -1) return false;
    }
    return true;
  }
  function toCand(it, hit) {
    var d = it.data[0], href = it.links && it.links[0] && it.links[0].href;
    if (!href || (d.media_type && d.media_type !== "image")) return null;
    return { id: d.nasa_id, title: d.title || "", date: String(d.date_created || "").slice(0, 10), center: d.center || "", desc: d.description || "",
      thumb: href, full: href.replace("~thumb", "~medium"), basis: hit };
  }
  // exported for tests: pure selection logic
  function classify(o, items) {
    var key = KEYS[o.id]; if (!key) return { before: [], after: [], reason: "nokey" };
    var ly = yr(o.landing) || yr(o.launch), seen = {}, before = [], after = [];
    var instStart = o.planet === "moon" ? 2009 : 2006, afterFrom = ly ? Math.max(instStart, ly + 3) : instStart;
    items.forEach(function (it) {
      var d = it.data && it.data[0]; if (!d || !d.nasa_id || seen[d.nasa_id]) return; seen[d.nasa_id] = 1;
      var text = textOf(d); if (!matches(o, key, text)) return;
      var y = yr(d.date_created); if (y === null) return;
      var hit = (text.match(key.re) || [""])[0];
      var c = toCand(it, hit); if (!c) return;
      c.score = (key.prefer && key.prefer.test(text) ? 2 : 0) + (ORBITER.test(text) ? 1 : 0);
      if (ly && y >= ly - 1 && y <= ly + 3) before.push(c);
      else if (y >= afterFrom && ORBITER.test(text)) after.push(c);
    });
    function rank(a) { return a.map(function (c, i) { c.i = i; return c; }).sort(function (x, y) { return (y.score - x.score) || (x.i - y.i); }).slice(0, 6); }
    return { before: rank(before), after: rank(after) };
  }

  function search(q, extra) {
    var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
    var url = API + "?media_type=image&page_size=40&q=" + encodeURIComponent(q) + (extra || "");
    return fetch(url, ctl ? { signal: ctl.signal } : undefined).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { clearTimeout(timer); return ((j.collection || {}).items || []).filter(function (it) { return it.data && it.data[0]; }); },
        function (e) { clearTimeout(timer); throw e; });
  }
  function find(o) {
    if (cache[o.id]) return cache[o.id];
    var key = KEYS[o.id];
    if (!key) return (cache[o.id] = Promise.resolve({ before: [], after: [], reason: "nokey" }));
    var ly = yr(o.landing) || yr(o.launch) || 1970, inst = o.planet === "moon" ? ["LRO", "LROC"] : ["HiRISE", "MRO"];
    var afterFrom = Math.max(o.planet === "moon" ? 2009 : 2006, ly + 3);
    var reqs = [search(key.q, "&year_start=" + (ly - 1) + "&year_end=" + (ly + 3)),
      search(key.q + " " + inst[0], "&year_start=" + afterFrom), search(key.q + " " + inst[1], "&year_start=" + afterFrom)];
    // allSettled-like: one failing request must not hide the others
    var failed = 0;
    var p = Promise.all(reqs.map(function (r) { return r.catch(function () { failed++; return []; }); })).then(function (lists) {
      var res = classify(o, [].concat.apply([], lists));
      if (failed === reqs.length) res.reason = "fail";
      return res;
    });
    cache[o.id] = p;
    p.then(function (r) { if (r.reason === "fail") delete cache[o.id]; });
    return p;
  }

  // ------------------------------------------------------------------ UI
  function T(k, v) { return host.T(k, v); }
  function esc(s) { return host.esc(s); }
  function setImg(img, c) {
    img.onerror = null;
    if (!c) { img.removeAttribute("src"); img.alt = ""; img.style.visibility = "hidden"; return; }
    img.style.visibility = "visible"; img.alt = c.title;
    img.onerror = function () { img.onerror = null; img.src = c.thumb; };
    img.src = c.full;
  }
  function dateText(c) { return c && c.date ? host.fmtDate(c.date) : T("k.na"); }
  function meta(c, side, o) {
    if (!c) return '<div class="ba-m"><h4>' + esc(T("ba." + side)) + '</h4><p class="note">' + esc(T(side === "before" ? "ba.noBefore" : "ba.noAfter")) + "</p></div>";
    return '<div class="ba-m"><h4>' + esc(T("ba." + side)) + " · " + esc(dateText(c)) + "</h4>" +
      '<p class="ba-t">' + esc(c.title) + "</p>" +
      '<p class="ba-k"><b>' + esc(T("k.mission")) + ":</b> " + esc(host.mission(o)) + "</p>" +
      '<p class="ba-k"><b>' + esc(T("ba.source")) + ":</b> " + esc(T("ba.srcLib")) + (c.center ? " · " + esc(c.center) : "") + " · " + esc(c.id) + "</p>" +
      '<p class="ba-k"><a href="https://images.nasa.gov/details/' + encodeURIComponent(c.id) + '" target="_blank" rel="noopener">' + esc(T("lb.open")) + "</a></p></div>";
  }
  function render() {
    if (!cur) return;
    var o = cur, c = st, B = c.res && c.res.before[c.b], A = c.res && c.res.after[c.a], loaded = !!c.res;
    $("#ba-title").textContent = T("ba.title");
    $("#ba-sub").textContent = host.name(o);
    $("#ba-full").textContent = T(document.fullscreenElement || $("#ba-box").classList.contains("ba-full") ? "ba.exitFull" : "ba.fullscreen");
    var stage = $("#ba-stage"), both = !!(B && A);
    setImg($("#ba-img-before"), B); setImg($("#ba-img-after"), A);
    stage.classList.toggle("ba-single", loaded && !both && !!(A || B));
    stage.classList.toggle("ba-empty", !loaded || !(A || B));
    var state = $("#ba-state");
    if (!loaded) state.textContent = T("ba.loading");
    else if (c.res.reason === "fail") state.textContent = T("ba.fail");
    else if (!A && !B) state.textContent = T("ba.none");
    else state.textContent = "";
    $("#ba-tag-b").textContent = T("ba.before") + (B ? " · " + dateText(B) : "");
    $("#ba-tag-a").textContent = T("ba.after") + (A ? " · " + dateText(A) : "");
    $("#ba-tag-b").hidden = !B || c.mode === "after"; $("#ba-tag-a").hidden = !A || c.mode === "before";
    document.querySelectorAll("#ba-modes [data-m]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.m === c.mode));
      b.textContent = T(b.dataset.m === "slider" ? "ba.modeSlider" : "ba." + b.dataset.m);
      b.disabled = !both && b.dataset.m === "slider";
    });
    var pos = c.mode === "before" ? 100 : c.mode === "after" ? 0 : c.pos;
    if (!A && B) pos = 100; if (A && !B) pos = 0;
    $("#ba-clip").style.clipPath = "inset(0 " + (100 - pos) + "% 0 0)";
    $("#ba-handle").style.left = pos + "%"; $("#ba-handle").hidden = !(both && c.mode === "slider");
    var rng = $("#ba-range"); rng.value = c.pos; rng.hidden = !(both && c.mode === "slider"); rng.setAttribute("aria-label", T("ba.slider"));
    rng.setAttribute("aria-valuetext", T("ba.sliderVal", { p: Math.round(c.pos) }));
    $("#ba-meta").innerHTML = loaded && (A || B) ? meta(B, "before", o) + meta(A, "after", o) : "";
    // honest warnings
    var w = [];
    if (loaded && (A || B)) {
      w.push(T("ba.warn")); w.push(T("ba.warnDate"));
      if (!both) w.push(T("ba.single"));
      else {
        var yb = yr(B.date), ya = yr(A.date); if (yb && ya && ya >= yb) w.push(T("ba.gap", { n: ya - yb }));
        w.push(T("ba.basis", { t: [B.basis, A.basis].filter(function (v, i, a) { return v && a.indexOf(v) === i; }).join(", ") }));
      }
    }
    $("#ba-warn").innerHTML = w.length ? "<h4>" + esc(T("ba.warnTitle")) + "</h4><ul>" + w.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "";
    // candidate pickers
    function pick(list, side, idx) {
      if (!list || list.length < 2) return "";
      return '<div class="ba-c"><h4>' + esc(T("ba.pick" + (side === "before" ? "Before" : "After"))) + '</h4><div class="ba-thumbs">' + list.map(function (x, i) {
        return '<button class="ba-th" data-side="' + side + '" data-i="' + i + '" aria-pressed="' + (i === idx) + '" title="' + esc(x.title + " · " + dateText(x)) + '"><img loading="lazy" src="' + esc(x.thumb) + '" alt="' + esc(x.title) + '"></button>';
      }).join("") + "</div></div>";
    }
    $("#ba-cands").innerHTML = loaded ? pick(c.res.before, "before", c.b) + pick(c.res.after, "after", c.a) : "";
  }

  function open(o) {
    cur = o; st = { res: null, b: 0, a: 0, pos: 50, mode: "slider" }; lastFocus = document.activeElement;
    $("#ba").hidden = false; render(); $("#ba-close").focus();
    var mine = o;
    find(o).then(function (res) { if (cur !== mine) return; st.res = res; st.mode = res.before.length && res.after.length ? "slider" : "slider"; render(); },
      function () { if (cur !== mine) return; st.res = { before: [], after: [], reason: "fail" }; render(); });
  }
  function close() {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
    $("#ba-box").classList.remove("ba-full"); $("#ba").hidden = true; cur = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function toggleFull() {
    var box = $("#ba-box");
    if (box.requestFullscreen) {
      if (document.fullscreenElement) document.exitFullscreen(); else box.requestFullscreen().catch(function () { box.classList.toggle("ba-full"); render(); });
    } else box.classList.toggle("ba-full");
    render();
  }
  function init(h) {
    host = h;
    $("#ba-close").addEventListener("click", close);
    $("#ba").addEventListener("click", function (e) { if (e.target.id === "ba") close(); });
    $("#ba-full").addEventListener("click", toggleFull);
    document.addEventListener("fullscreenchange", render);
    $("#ba-range").addEventListener("input", function (e) { st.pos = +e.target.value; render(); });
    $("#ba-modes").addEventListener("click", function (e) { var b = e.target.closest("[data-m]"); if (b && !b.disabled) { st.mode = b.dataset.m; render(); } });
    $("#ba-cands").addEventListener("click", function (e) {
      var b = e.target.closest(".ba-th"); if (!b) return;
      if (b.dataset.side === "before") st.b = +b.dataset.i; else st.a = +b.dataset.i; render();
    });
    $("#ba-3d").addEventListener("click", function () { var o = cur; close(); if (o) host.show3d(o); });
    $("#ba-obj").addEventListener("click", function () { var o = cur; close(); if (o) host.details(o); });
  }
  window.BA = { init: init, open: open, close: close, render: render, isOpen: function () { return !$("#ba").hidden; }, hasKey: function (id) { return !!KEYS[id]; }, _classify: classify };
})();
