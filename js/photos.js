/* PHOTO ARCHIVE: gallery of NASA photographs of the Moon and Mars, fetched live.
 *
 * Sources: NASA Image and Video Library API (images-api.nasa.gov; includes the Apollo archive and LRO / MRO / HiRISE items that NASA
 * publishes there). The NASA Mars Rover Photos API loader is kept but switched off (RAW_API_ENABLED, API archived by NASA). LROC and HiRISE sites are linked, not embedded (no public search API used).
 * Rules:
 *  - Each collection is a mission-specific search; a result is kept only if the mission terms appear in its title/description/keywords
 *    (so a query cannot bring in unrelated pictures). Duplicates (same NASA id) are shown once.
 *  - Nothing is copied into the project database. Only titles / links / short text are cached in the browser (localStorage, 12 h).
 *  - Coordinates are never taken from a photo: the map button uses the coordinates of the linked catalogue object and says so.
 * Public API: window.PHOTOS = { init, show, render, state, load, _collections }. */
(function () {
  "use strict";
  var H = null, TTL = 12 * 3600e3, PAGE = 24;
  // The NASA Mars Rover Photos API (api.nasa.gov/mars-photos) has been archived by NASA (see the notice on
  // https://api.nasa.gov/). The "latest raw rover photos" panel is therefore switched off so that judges and visitors
  // never see a button that always fails. The loader below is kept: set this to true if NASA restores the service.
  var RAW_API_ENABLED = false;
  var S = { body: "moon", mission: "", cat: "", from: "", to: "", q: "", shown: PAGE, custom: [] };
  var mem = {}, status = {}, photos = {}, raw = { state: "idle", items: [] }, queue = [], running = 0, started = {};

  // c(id, body, cat, query, must[], objs[])
  function c(id, body, cat, q, must, objs) { return { id: id, body: body, cat: cat, q: q, must: must, objs: objs }; }
  var COLL = [
    c("a11", "moon", "crewed", "Apollo 11 lunar surface", ["apollo 11"], ["apollo-11-lm"]),
    c("a12", "moon", "crewed", "Apollo 12 lunar surface", ["apollo 12"], ["apollo-12-lm", "surveyor-3"]),
    c("a14", "moon", "crewed", "Apollo 14 lunar surface", ["apollo 14"], ["apollo-14-lm"]),
    c("a15", "moon", "crewed", "Apollo 15 lunar surface rover", ["apollo 15"], ["apollo-15-lm", "apollo-15-lrv"]),
    c("a16", "moon", "crewed", "Apollo 16 lunar surface rover", ["apollo 16"], ["apollo-16-lm", "apollo-16-lrv"]),
    c("a17", "moon", "crewed", "Apollo 17 lunar surface rover", ["apollo 17"], ["apollo-17-lm", "apollo-17-lrv"]),
    c("s3", "moon", "rovers", "Surveyor 3 lunar lander", ["surveyor 3"], ["surveyor-3"]),
    c("l16", "moon", "rovers", "Luna 16", ["luna 16"], ["luna-16"]),
    c("l17", "moon", "rovers", "Lunokhod 1 Luna 17", ["lunokhod|luna 17"], ["lunokhod-1", "luna-17"]),
    c("c3", "moon", "rovers", "Chandrayaan-3 Vikram lander", ["chandrayaan"], ["chandrayaan-3"]),
    c("lro11", "moon", "orbital", "LRO Apollo 11 landing site", ["apollo 11", "lro|lunar reconnaissance"], ["apollo-11-lm"]),
    c("lro12", "moon", "orbital", "LRO Apollo 12 Surveyor 3 landing site", ["apollo 12|surveyor", "lro|lunar reconnaissance"], ["apollo-12-lm", "surveyor-3"]),
    c("lro14", "moon", "orbital", "LRO Apollo 14 landing site", ["apollo 14", "lro|lunar reconnaissance"], ["apollo-14-lm"]),
    c("lro15", "moon", "orbital", "LRO Apollo 15 landing site", ["apollo 15", "lro|lunar reconnaissance"], ["apollo-15-lm"]),
    c("lro16", "moon", "orbital", "LRO Apollo 16 landing site", ["apollo 16", "lro|lunar reconnaissance"], ["apollo-16-lm"]),
    c("lro17", "moon", "orbital", "LRO Apollo 17 landing site", ["apollo 17", "lro|lunar reconnaissance"], ["apollo-17-lm"]),
    c("v1", "mars", "rovers", "Viking 1 lander Mars", ["viking 1|viking lander"], ["viking-1"]),
    c("v2", "mars", "rovers", "Viking 2 lander Mars", ["viking 2|viking lander"], ["viking-2"]),
    c("pf", "mars", "rovers", "Mars Pathfinder Sojourner", ["pathfinder|sojourner"], ["pathfinder"]),
    c("sp", "mars", "rovers", "Spirit rover Mars", ["spirit"], ["spirit"]),
    c("op", "mars", "rovers", "Opportunity rover Mars", ["opportunity"], ["opportunity"]),
    c("ph", "mars", "rovers", "Phoenix Mars lander", ["phoenix"], ["phoenix"]),
    c("cu", "mars", "rovers", "Curiosity rover Mars", ["curiosity"], ["curiosity"]),
    c("in", "mars", "rovers", "InSight lander Mars", ["insight"], ["insight"]),
    c("pe", "mars", "rovers", "Perseverance rover Mars", ["perseverance"], ["perseverance"]),
    c("ig", "mars", "rovers", "Ingenuity Mars helicopter", ["ingenuity"], ["ingenuity"]),
    c("hi-cu", "mars", "orbital", "HiRISE Curiosity Gale crater", ["hirise|mars reconnaissance orbiter", "curiosity"], ["curiosity"]),
    c("hi-op", "mars", "orbital", "HiRISE Opportunity rover Mars Reconnaissance Orbiter", ["hirise|mars reconnaissance orbiter", "opportunity"], ["opportunity"]),
    c("hi-sp", "mars", "orbital", "HiRISE Spirit rover Mars Reconnaissance Orbiter", ["hirise|mars reconnaissance orbiter", "spirit"], ["spirit"]),
    c("hi-ph", "mars", "orbital", "HiRISE Phoenix lander", ["hirise|mars reconnaissance orbiter", "phoenix"], ["phoenix"]),
    c("hi-pe", "mars", "orbital", "HiRISE Perseverance Jezero", ["hirise|mars reconnaissance orbiter", "perseverance"], ["perseverance"]),
    c("hi-in", "mars", "orbital", "HiRISE InSight lander", ["hirise|mars reconnaissance orbiter", "insight"], ["insight"]),
    c("hi-vk", "mars", "orbital", "Mars Reconnaissance Orbiter Viking lander site", ["hirise|mars reconnaissance orbiter", "viking"], ["viking-1", "viking-2"])
  ];
  var CATS = ["crewed", "surface", "rovers", "orbital", "raw", "search"];

  // ---- helpers
  function $(s) { return document.querySelector(s); }
  function T(k, v) { return H.T(k, v); }
  function esc(s) { return H.esc(s); }
  function yr(s) { return s ? +String(s).slice(0, 4) : null; }
  function allColl() { return COLL.concat(S.custom); }
    function mlabel(m) { var o = H.objects().filter(function (x) { return x.mission === m; })[0]; return o ? H.loc(o).mission : m; }
  function mKey(cl) { return cl.objs && cl.objs.length ? H.byId(cl.objs[0]).mission : cl.label; }

  // ---- cache + fetch
  function cacheGet(q) {
    if (mem[q]) return mem[q];
    try { var j = JSON.parse(localStorage.getItem("pa:" + q) || "null"); if (j && Date.now() - j.t < TTL) { mem[q] = j.items; return j.items; } } catch (e) { /* storage unavailable */ }
    return null;
  }
  function cachePut(q, items) { mem[q] = items; try { localStorage.setItem("pa:" + q, JSON.stringify({ t: Date.now(), items: items })); } catch (e) { /* quota or private mode */ } }
  function compact(it) {
    var d = it.data[0] || {};
    return { id: d.nasa_id, title: d.title || "", date: (d.date_created || "").slice(0, 10), desc: (d.description || "").slice(0, 260), center: d.center || "",
      by: d.photographer || d.secondary_creator || "", kw: (d.keywords || []).slice(0, 12).join(" "), thumb: it.links[0].href };
  }
  function fetchQuery(q, ok, fail) {
    var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
    fetch("https://images-api.nasa.gov/search?media_type=image&page_size=60&q=" + encodeURIComponent(q), ctl ? { signal: ctl.signal } : undefined)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        clearTimeout(timer);
        ok(((j.collection || {}).items || []).filter(function (it) { return it.data && it.data[0] && it.data[0].nasa_id && it.links && it.links[0] && it.links[0].href; }).map(compact));
      })
      .catch(function () { clearTimeout(timer); fail(); });
  }
  function relevant(p, cl) {
    var hay = (p.title + " " + p.desc + " " + p.kw).toLowerCase();
    return cl.must.every(function (m) { return new RegExp(m).test(hay); });
  }
  function ingest(cl, items) {
    items.filter(function (p) { return relevant(p, cl); }).forEach(function (p) {
      var ex = photos[p.id];
      if (ex) { if (ex.colls.indexOf(cl.id) < 0) ex.colls.push(cl.id); return; }   // same NASA id: one entry, several tags
      photos[p.id] = { p: p, cl: cl, colls: [cl.id], body: cl.body, cat: cl.cat, mission: mKey(cl), objs: cl.objs || [], src: "nasa" };
    });
  }
  function pump() {
    while (running < 4 && queue.length) {
      var cl = queue.shift(); running++;
      (function (cl) {
        var hit = cacheGet(cl.q);
        function done(ok) { running--; status[cl.id] = ok ? "ok" : "fail"; paintStatus(); render(true); pump(); }
        if (hit) { ingest(cl, hit); done(true); return; }
        fetchQuery(cl.q, function (items) { cachePut(cl.q, items); ingest(cl, items); done(true); }, function () { done(false); });
      })(cl);
    }
  }
  function load(body) {
    allColl().filter(function (cl) { return cl.body === body && !status[cl.id] && queue.indexOf(cl) < 0; }).forEach(function (cl) { status[cl.id] = "wait"; queue.push(cl); });
    pump();
  }
  function retry() { allColl().forEach(function (cl) { if (status[cl.id] === "fail") { status[cl.id] = "wait"; queue.push(cl); } }); pump(); paintStatus(); }

  // ---- Mars Rover Photos API (optional, user-triggered)
  var ROVERS = [["curiosity", "curiosity"], ["perseverance", "perseverance"]];
  function loadRaw() {
    raw.state = "loading"; paintRaw();
    var left = ROVERS.length, okAny = false;
    ROVERS.forEach(function (r) {
      var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
      fetch("https://api.nasa.gov/mars-photos/api/v1/rovers/" + r[0] + "/latest_photos?api_key=DEMO_KEY", ctl ? { signal: ctl.signal } : undefined)
        .then(function (x) { if (!x.ok) throw new Error(x.status); return x.json(); })
        .then(function (j) {
          clearTimeout(timer);
          (j.latest_photos || j.photos || []).slice(0, 12).forEach(function (ph) {
            var id = "rover-" + ph.id; if (photos[id]) return;
            var cam = ph.camera && ph.camera.full_name ? ph.camera.full_name : "";
            photos[id] = { p: { id: id, title: T("pa.raw.title1", { cam: cam, sol: ph.sol }), date: ph.earth_date || "", desc: "", center: "", by: "NASA/JPL-Caltech", kw: "", thumb: ph.img_src, rover: r[0] },
              cl: null, colls: [], body: "mars", cat: "raw", mission: H.byId(r[1]).mission, objs: [r[1]], src: "rover" };
            okAny = true;
          });
        }).catch(function () { clearTimeout(timer); })
        .then(function () { if (--left === 0) { raw.state = okAny ? "ok" : "fail"; paintRaw(); render(true); } });
    });
  }

  // ---- filtering
  function list() {
    var q = S.q.trim().toLowerCase();
    return Object.keys(photos).map(function (k) { return photos[k]; }).filter(function (r) {
      if (r.body !== S.body) return false;
      if (S.mission && r.mission !== S.mission) return false;
      if (S.cat && r.cat !== S.cat) return false;
      var y = yr(r.p.date); if (S.from && (!y || y < +S.from)) return false; if (S.to && (!y || y > +S.to)) return false;
      if (q && (r.p.title + " " + r.p.desc).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return (b.p.date || "").localeCompare(a.p.date || "") || a.p.title.localeCompare(b.p.title); });
  }

  // ---- viewer (reuses the project's lightbox)
  function openViewer(items, i) {
    var arr = items.map(function (r) {
      var cred = r.p.by ? r.p.by : T("pa.credit.unknown"), obj = r.objs.map(function (id) { return H.byId(id); }).filter(Boolean);
      var acts = [];
      obj.forEach(function (o) {
        acts.push({ label: T("pa.v.obj", { n: H.loc(o).name }), fn: function () { H.go(o.id, false); } });
        if (isFinite(o.lat) && isFinite(o.lon)) acts.push({ label: T("pa.v.map", { n: H.loc(o).name }), fn: function () { H.go(o.id, true); } });
      });
      return {
        thumb: r.p.thumb, full: r.src === "rover" ? r.p.thumb : r.p.thumb.replace("~thumb", "~medium"), title: r.p.title, nasaId: r.p.id, date: r.p.date, desc: r.p.desc, center: r.p.center,
        page: r.src === "rover" ? r.p.thumb : null,
        prov: [T("pa.v.source") + ": " + T(r.src === "rover" ? "pa.src.rover" : "pa.src.nasa"), T("pa.v.mission") + ": " + mlabel(r.mission), T("pa.v.cat") + ": " + T("pa.cat." + r.cat), T("pa.v.credit") + ": " + cred, T("pa.v.date") + ": " + (r.p.date ? H.fmtDate(r.p.date) : T("pa.v.dateNone"))],
        note: obj.length ? T("pa.v.mapNote") : T("pa.v.noCoord"), actions: acts
      };
    });
    H.lightbox(arr, i);
  }

  // ---- rendering
  function paintStatus() {
    var el = $("#pa-status"); if (!el) return;
    var all = allColl().filter(function (cl) { return cl.body === S.body; }), t = all.length;
    var d = all.filter(function (cl) { return status[cl.id] === "ok" || status[cl.id] === "fail"; }).length, f = all.filter(function (cl) { return status[cl.id] === "fail"; }).length;
    el.innerHTML = (d < t ? esc(T("pa.status.loading", { d: d, t: t })) : esc(T("pa.status.done", { t: t }))) + (f ? ' <span class="pa-err">' + esc(T("pa.status.fail", { f: f, t: t })) + '</span> <button type="button" class="cta small alt" id="pa-retry">' + esc(T("pa.retry")) + "</button>" : "");
  }
  function paintRaw() {
    var el = $("#pa-raw-state"); if (!el) return;
    el.textContent = raw.state === "loading" ? T("pa.status.loading", { d: 0, t: ROVERS.length }) : raw.state === "ok" ? T("pa.raw.ok") : raw.state === "fail" ? T("pa.raw.fail") : "";
    var b = $("#pa-raw-btn"); if (b) b.disabled = raw.state === "loading";
  }
  function renderControls() {
    var cl = allColl().filter(function (x) { return x.body === S.body; });
    var ms = cl.map(function (x) { return mKey(x); }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var cats = CATS.filter(function (k) { return cl.some(function (x) { return x.cat === k; }) || (k === "raw" && RAW_API_ENABLED && S.body === "mars"); });
    var ys = Object.keys(photos).map(function (k) { return photos[k]; }).filter(function (r) { return r.body === S.body; }).map(function (r) { return yr(r.p.date); }).filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();
    function opts(list, cur, lab, all) { return '<option value="">' + esc(all) + "</option>" + list.map(function (v) { return '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? " selected" : "") + ">" + esc(lab ? lab(v) : v) + "</option>"; }).join(""); }
    var mlab = mlabel;
    $("#pa-mission").innerHTML = opts(ms, S.mission, mlab, T("pa.all"));
    $("#pa-cat").innerHTML = opts(cats, S.cat, function (k) { return T("pa.cat." + k); }, T("pa.all"));
    $("#pa-from").innerHTML = opts(ys, S.from, null, T("pa.any")); $("#pa-to").innerHTML = opts(ys, S.to, null, T("pa.any"));
    document.querySelectorAll("#pa-body button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.b === S.body)); });
    $("#pa-raw").hidden = !RAW_API_ENABLED || S.body !== "mars";
    $("#pa-q").value = S.q;
  }
  function render(light) {
    if (!H || !$("#pa-grid")) return;
    if (!light) { renderControls(); paintStatus(); paintRaw(); } else { renderControls(); paintStatus(); }
    var L = list(), vis = L.slice(0, S.shown), loading = allColl().some(function (cl) { return cl.body === S.body && (status[cl.id] === "wait" || !status[cl.id]); });
    $("#pa-grid").innerHTML = vis.map(function (r, i) {
      return '<li class="pa-card"><button type="button" data-open="' + i + '" aria-label="' + esc(r.p.title) + '"><span class="pa-th"><img loading="lazy" decoding="async" src="' + esc(r.p.thumb) + '" alt="' + esc(r.p.title) + '"></span></button>' +
        '<div class="pa-cap"><b>' + esc(r.p.title) + '</b><span class="note">' + esc(mlabel(r.mission)) + (r.p.date ? " · " + esc(r.p.date.slice(0, 4)) : "") + '</span><span class="pa-tag">' + esc(T("pa.cat." + r.cat)) + "</span></div></li>";
    }).join("") || (loading ? Array(8).join('<li class="pa-card pa-sk" aria-hidden="true"></li>') : "");
    $("#pa-empty").hidden = !!L.length || loading; $("#pa-empty").textContent = T("pa.empty");
    $("#pa-more").hidden = L.length <= S.shown; $("#pa-count").textContent = L.length ? T("pa.count", { n: vis.length, m: L.length }) : "";
    var nq = S.q.trim(); $("#pa-nasa").hidden = !nq;
    if (nq) { $("#pa-nasa").href = "https://images.nasa.gov/search?q=" + encodeURIComponent(nq + " " + (S.body === "moon" ? "moon" : "mars")); $("#pa-nasa").textContent = T("pa.nasaSearch"); }
    window.__paList = L;
  }
  function setBody(b) { if (b !== "moon" && b !== "mars") return; S.body = b; S.mission = ""; S.cat = ""; S.from = ""; S.to = ""; S.shown = PAGE; load(b); render(); }
  function reset() { S = { body: S.body, mission: "", cat: "", from: "", to: "", q: "", shown: PAGE, custom: S.custom }; render(); }
  function init(host) {
    H = host; var root = $("#view-photos");
    root.addEventListener("change", function (e) {
      var id = e.target.id, m = { "pa-mission": "mission", "pa-cat": "cat", "pa-from": "from", "pa-to": "to" }[id]; if (!m) return;
      S[m] = e.target.value; S.shown = PAGE; render();
    });
    var tm = null; root.addEventListener("input", function (e) { if (e.target.id === "pa-q") { clearTimeout(tm); tm = setTimeout(function () { S.q = e.target.value; S.shown = PAGE; render(true); }, 200); } });
    root.addEventListener("click", function (e) {
      var b = e.target.closest("#pa-body button"), o = e.target.closest("[data-open]");
      if (b) setBody(b.dataset.b); else if (o) openViewer(list(), +o.dataset.open);
      else if (e.target.closest("#pa-more")) { S.shown += PAGE; render(true); } else if (e.target.closest("#pa-reset")) reset();
      else if (e.target.closest("#pa-retry")) retry(); else if (e.target.closest("#pa-raw-btn")) loadRaw();
    });
    // broken thumbnails: swap to a placeholder, keep the caption
    root.addEventListener("error", function (e) { var im = e.target; if (im.tagName === "IMG" && !im.dataset.bad) { im.dataset.bad = 1; im.removeAttribute("src"); im.parentNode.classList.add("pa-bad"); im.parentNode.setAttribute("data-missing", T("pa.ph.missing")); } }, true);
  }
  function show() { if (!started[S.body]) { started[S.body] = 1; } load(S.body); render(); }
  // used by Forgotten Relics: open the archive filtered to one body and one mission (mission = OBJECTS[].mission)
  function focus(body, mission) { setBody(body); S.mission = mission || ""; S.shown = PAGE; render(); }
  window.PHOTOS = { init: init, show: show, render: render, load: load, setBody: setBody, reset: reset, focus: focus, state: function () { return { S: S, status: status, n: Object.keys(photos).length }; }, _collections: function () { return COLL; } };
})();
