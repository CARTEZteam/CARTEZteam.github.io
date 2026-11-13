/* FORGOTTEN RELICS — storytelling exhibition (route #relics, section #view-relics).
 *
 * Data: window.RELICS / window.RELIC_STORIES (js/relics.data.js), texts in js/relics.i18n.js.
 * Object names, missions and descriptions come from window.OBJECTS through host.loc() (existing translations).
 * Photographs: searched live in the NASA Image and Video Library through host.nasaFetch and kept only when the NASA
 * metadata matches the relic's `must` patterns. Nothing is cached outside memory; nothing is written to the database.
 * Links to the other sections go through host callbacks set in app.js (Object Explorer, 3D map / 3D models,
 * Before/After, Mission Timeline, Mission Journey, Space Archaeology, Photo Archive).
 *
 * Public API: window.FR = { init, show, render, open(storyId), home(), state() }
 */
(function () {
  "use strict";
  var H = null;
  var st = { view: "home", story: null, body: "all" };
  var mem = {}, waiting = {}, queue = [], running = 0, MAX = 4;
  var io = null;

  function $(s, r) { return (r || document).querySelector(s); }
  function T(k, v) { return H.T(k, v); }
  function esc(s) { return H.esc(s); }
  function root() { return $("#view-relics"); }
  function stories() { return window.RELIC_STORIES || []; }
  function relics() { return (window.RELICS || []).filter(function (r) { return !!H.byId(r.id); }); }
  function storyById(id) { return stories().filter(function (s) { return s.id === id; })[0] || null; }
  function relicById(id) { return relics().filter(function (r) { return r.id === id; })[0] || null; }
  function bodyLabel(b) { return b === "both" ? T("rl.both") : T("body." + b); }
  function yearOf(o) { var d = o.landing || o.launch; return d ? String(d).slice(0, 4) : ""; }
  function firstSentence(s) {
    s = String(s || "");
    var m = s.match(/^.{40,220}?[.!?](\s|$)/);
    return m ? m[0].trim() : (s.length > 220 ? s.slice(0, 217) + "…" : s);
  }
  function storiesWith(id) { return stories().filter(function (s) { return s.rel.indexOf(id) !== -1 || s.hero === id; }); }

  /* ------------------------------------------------------------------ NASA photos (memory cache, small queue) */
  function matchAll(text, must) {
    return (must || []).every(function (p) { return new RegExp(p, "i").test(text); });
  }
  function photos(q, must, cb) {
    var key = q + "|" + (must || []).join(",");
    if (mem[key]) { cb(mem[key]); return; }
    (waiting[key] = waiting[key] || []).push(cb);
    if (waiting[key].length > 1) return;
    queue.push(function (done) {
      H.nasaFetch(q, "image", 30, function (all) {
        var seen = {}, out = [];
        all.forEach(function (it) {
          var d = it.data[0], href = it.links && it.links[0] && it.links[0].href;
          if (!href || seen[d.nasa_id]) return;
          var text = [d.title, d.description, (d.keywords || []).join(" ")].join(" ");
          if (!matchAll(text, must)) return;
          seen[d.nasa_id] = 1;
          out.push({ thumb: href, full: href.replace("~thumb", "~medium"), title: d.title || "", nasaId: d.nasa_id, date: String(d.date_created || "").slice(0, 10), desc: d.description || "", center: d.center || "" });
        });
        finish(key, { ok: true, items: out.slice(0, 8) }); done();
      }, function () { finish(key, { ok: false, items: [] }); done(); });
    });
    pump();
  }
  function finish(key, res) {
    if (res.ok) mem[key] = res;            // failures are not cached: the next render retries
    var cbs = waiting[key] || []; delete waiting[key];
    cbs.forEach(function (f) { try { f(res); } catch (e) { if (window.console) console.error(e); } });
  }
  function pump() {
    while (running < MAX && queue.length) {
      running++;
      queue.shift()(function () { running--; pump(); });
    }
  }
  function searchUrl(q) { return "https://images.nasa.gov/search?q=" + encodeURIComponent(q) + "&media=image"; }

  /* fill an element [data-ph] with the first matching photo */
  function fillPhoto(el) {
    if (!el || el.dataset.done) return;
    el.dataset.done = "1";
    var q = el.dataset.q, must = JSON.parse(el.dataset.must || "[]");
    photos(q, must, function (res) {
      if (!document.body.contains(el)) return;
      var p = res.items[0];
      if (p) {
        el.classList.remove("rl-sk");
        el.innerHTML = '<img loading="lazy" decoding="async" src="' + esc(p.thumb) + '" alt="' + esc(p.title) + '">' +
          '<span class="rl-cap">' + esc(T("rl.photo.cap", { id: p.nasaId })) + "</span>";
        el.dataset.nasa = p.nasaId;
        var img = el.querySelector("img");
        img.addEventListener("error", function () { el.classList.add("rl-noimg"); img.remove(); });
      } else {
        el.classList.remove("rl-sk"); el.classList.add("rl-noimg");
        el.innerHTML = '<span class="rl-ph-msg">' + esc(T(res.ok ? "rl.photo.none" : "rl.photo.fail")) +
          (el.hasAttribute("data-nolink") ? "" : ' <a href="' + esc(searchUrl(q)) + '" target="_blank" rel="noopener">' + esc(T("rl.photo.search")) + "</a>") + "</span>";
        if (!res.ok) delete el.dataset.done;
      }
    });
  }
  function observePhotos(scope) {
    var els = scope.querySelectorAll("[data-ph]");
    if (!("IntersectionObserver" in window)) { Array.prototype.forEach.call(els, fillPhoto); return; }
    if (!io) io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); fillPhoto(e.target); } });
    }, { rootMargin: "300px 0px" });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }
  function phSlot(q, must, cls, extra) {
    return '<span class="rl-ph rl-sk ' + (cls || "") + '" data-ph data-q="' + esc(q) + '" data-must="' + esc(JSON.stringify(must || [])) + '"' + (extra || "") +
      ' role="img" aria-label="' + esc(T("rl.photo.loading")) + '"><span class="rl-ph-msg">' + esc(T("rl.photo.loading")) + "</span></span>";
  }

  /* open the project's lightbox with provenance lines and links */
  function viewer(items, i, storyTitle, objs) {
    var arr = items.map(function (p) {
      var acts = (objs || []).map(function (o) {
        return { label: T("rl.lb.obj", { n: H.loc(o).name }), fn: function () { H.go(o.id, false); } };
      });
      return {
        thumb: p.thumb, full: p.full, title: p.title, nasaId: p.nasaId, date: p.date, desc: p.desc, center: p.center,
        prov: [T("rl.lb.src"), storyTitle ? T("rl.lb.story", { s: storyTitle }) : "", p.date ? T("rl.lb.date", { d: H.fmtDate(p.date) }) : T("rl.lb.noDate")].filter(Boolean),
        note: T("rl.lb.note"), actions: acts
      };
    });
    if (arr.length) H.lightbox(arr, i || 0);
  }

  /* ------------------------------------------------------------------ action buttons (links to other sections) */
  function actions(o, full) {
    var a = [["explorer", "rl.a.explorer"], ["map", "rl.a.map"]];
    if (full) {
      if (H.hasModel(o.id)) a.push(["model", "rl.a.model"]);
      if (H.hasBA(o.id)) a.push(["ba", "rl.a.ba"]);
      a.push(["timeline", "rl.a.timeline"]);
      if (H.hasJourney()) a.push(["journey", "rl.a.journey"]);
      if (H.hasArch()) a.push(["arch", "rl.a.arch"]);
      if (H.hasPhotos()) a.push(["photos", "rl.a.photos"]);
    }
    return '<div class="rl-acts">' + a.map(function (x) {
      return '<button type="button" class="rl-act' + (x[0] === "model" ? " rl-recon" : "") + '" data-act="' + x[0] + '" data-id="' + esc(o.id) + '">' + esc(T(x[1])) + "</button>";
    }).join("") + "</div>";
  }
  function runAction(act, id) {
    var o = H.byId(id); if (!o) return;
    switch (act) {
      case "explorer": H.go(id, false); break;
      case "map": case "model": H.go(id, true); break;
      case "ba": H.openBA(o); break;
      case "timeline": H.openTimeline(o); break;
      case "journey": H.openJourney(o); break;
      case "arch": H.openArch(o); break;
      case "photos": H.openPhotos(o); break;
    }
  }

  /* ------------------------------------------------------------------ home: hero, stories, gallery */
  function storyCard(s, i) {
    var hero = relicById(s.hero) || { q: s.img[0].q, must: s.img[0].must };
    var title = T("rl.st." + s.id + ".title");
    return '<li class="rl-story" style="--i:' + i + '">' +
      '<button type="button" class="rl-story-btn" data-story="' + esc(s.id) + '" aria-label="' + esc(T("rl.open") + ": " + title) + '">' +
        phSlot(hero.q, hero.must, "rl-story-ph", " data-nolink") +
        '<span class="rl-story-body"><span class="rl-num">' + String(i + 1).padStart(2, "0") + " · " + esc(bodyLabel(s.body)) + "</span>" +
        '<span class="rl-story-t">' + esc(title) + "</span>" +
        '<span class="rl-story-tag">' + esc(T("rl.st." + s.id + ".tag")) + "</span>" +
        '<span class="rl-story-go">' + esc(T("rl.open")) + " →</span></span>" +
      "</button></li>";
  }
  function relicCard(r, i) {
    var o = H.byId(r.id), l = H.loc(o), y = yearOf(o);
    var inStories = storiesWith(r.id);
    return '<li class="rl-card" style="--i:' + (i % 12) + '" data-body="' + o.planet + '">' +
      '<div class="rl-card-ph" data-photo="' + esc(r.id) + '" role="button" tabindex="0" aria-label="' + esc(l.name) + '">' + phSlot(r.q, r.must, "", "") + "</div>" +
      '<div class="rl-card-b">' +
        '<h4 class="rl-card-t">' + esc(l.name) + "</h4>" +
        '<dl class="rl-meta"><div><dt>' + esc(T("rl.k.mission")) + "</dt><dd>" + esc(l.mission) + "</dd></div>" +
          "<div><dt>" + esc(T("rl.k.body")) + "</dt><dd>" + esc(T("body." + o.planet)) + "</dd></div>" +
          "<div><dt>" + esc(T("rl.k.year")) + "</dt><dd>" + esc(y || T("rl.yearNone")) + "</dd></div></dl>" +
        '<p class="rl-desc">' + esc(firstSentence(l.desc)) + "</p>" +
        '<p class="rl-sig"><b>' + esc(T("rl.k.sig")) + ".</b> " + esc(T("rl.sig." + r.id)) + "</p>" +
        '<p class="rl-src">' + esc(T("rl.k.sources")) + ": " + r.src.map(function (s) { return '<a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.t) + "</a>"; }).join(" · ") + "</p>" +
        (inStories.length ? '<p class="rl-in">' + inStories.map(function (s) { return '<button type="button" class="rl-chip" data-story="' + esc(s.id) + '">' + esc(T("rl.st." + s.id + ".title")) + "</button>"; }).join("") + "</p>" : "") +
        actions(o, false) +
      "</div></li>";
  }
  function renderHome(r) {
    var list = relics().filter(function (x) { return st.body === "all" || H.byId(x.id).planet === st.body; });
    r.innerHTML =
      '<header class="rl-hero">' +
        '<p class="eyebrow">' + esc(T("rl.eyebrow")) + "</p>" +
        '<h2 class="page-title rl-title" id="rl-title" tabindex="-1">' + esc(T("rl.title")) + "</h2>" +
        '<p class="rl-motto">' + esc(T("rl.motto")) + "</p>" +
        '<p class="page-lede">' + esc(T("rl.lede")) + "</p>" +
      "</header>" +
      '<h3 class="rl-h">' + esc(T("rl.stories")) + "</h3>" +
      '<ol class="rl-stories">' + stories().map(storyCard).join("") + "</ol>" +
      '<div class="rl-gal-head"><h3 class="rl-h">' + esc(T("rl.gallery")) + "</h3>" +
        '<div class="imp-seg" role="group" aria-label="' + esc(T("rl.k.body")) + '">' +
        ["all", "moon", "mars"].map(function (b) {
          return '<button type="button" data-body="' + b + '" aria-pressed="' + (st.body === b) + '">' + esc(b === "all" ? T("rl.f.all") : T("body." + b)) + "</button>";
        }).join("") + "</div>" +
        '<p class="rl-count" aria-live="polite">' + esc(T("rl.count", { n: list.length })) + "</p></div>" +
      '<ul class="rl-grid">' + list.map(relicCard).join("") + "</ul>" +
      '<p class="imp-banner rl-truth-mini">' + esc(T("rl.truth.recon")) + "</p>";
    observePhotos(r);
  }

  /* ------------------------------------------------------------------ story view */
  function renderStory(r) {
    var s = storyById(st.story); if (!s) { st.view = "home"; return renderHome(r); }
    var all = stories(), idx = all.indexOf(s), prev = all[(idx - 1 + all.length) % all.length], next = all[(idx + 1) % all.length];
    var k = "rl.st." + s.id + ".", title = T(k + "title"), hero = relicById(s.hero) || { q: s.img[0].q, must: s.img[0].must };
    var rel = s.rel.map(function (id) { return H.byId(id); }).filter(Boolean);
    var relPhotos = rel.map(function (o) { return relicById(o.id) || { id: o.id, q: o.imageQuery, must: [] }; });
    var chapters = "", specs = "", i;
    for (i = 1; i <= s.chapters; i++) chapters += '<section class="rl-ch" style="--i:' + i + '"><h4>' + esc(T(k + "c" + i + "h")) + "</h4><p>" + esc(T(k + "c" + i)) + "</p></section>";
    for (i = 1; i <= s.specs; i++) specs += "<div><dt>" + esc(T(k + "k" + i)) + "</dt><dd>" + esc(T(k + "v" + i)) + "</dd></div>";

    r.innerHTML =
      '<nav class="rl-crumbs"><button type="button" class="cta small alt" data-home>← ' + esc(T("rl.back")) + "</button></nav>" +
      '<header class="rl-shero">' + phSlot(hero.q, hero.must, "rl-shero-ph") +
        '<div class="rl-shero-txt"><p class="eyebrow">' + esc(T("rl.title")) + " · " + String(idx + 1).padStart(2, "0") + " · " + esc(bodyLabel(s.body)) + "</p>" +
        '<h2 class="page-title rl-title" id="rl-title" tabindex="-1">' + esc(title) + "</h2>" +
        '<p class="rl-motto">' + esc(T(k + "tag")) + "</p></div></header>" +
      '<p class="rl-lead">' + esc(T(k + "lead")) + "</p>" +

      '<h3 class="rl-h">' + esc(T("rl.s.photos")) + "</h3>" +
      '<ul class="rl-strip">' + relPhotos.map(function (p) {
        var o = H.byId(p.id);
        return '<li><div class="rl-strip-b" data-photo="' + esc(p.id) + '" role="button" tabindex="0" aria-label="' + esc(H.loc(o).name) + '">' + phSlot(p.q, p.must) + '<span class="rl-strip-n">' + esc(H.loc(o).name) + "</span></div></li>";
      }).join("") + "</ul>" +

      '<div class="rl-cols">' +
        '<div class="rl-col"><h3 class="rl-h">' + esc(T("rl.s.history")) + "</h3>" + chapters + "</div>" +
        '<aside class="rl-col rl-side"><h3 class="rl-h">' + esc(T("rl.s.specs")) + '</h3><dl class="rl-specs">' + specs + "</dl>" +
          '<h3 class="rl-h">' + esc(T("rl.s.timeline")) + '</h3><ol class="rl-tl">' + s.tl.map(function (e, j) {
            return '<li style="--i:' + j + '"><time datetime="' + esc(e[0]) + '">' + esc(H.fmtDate(e[0])) + "</time><span>" + esc(T(k + "t" + e[1])) + "</span></li>";
          }).join("") + "</ol></aside>" +
      "</div>" +

      '<h3 class="rl-h">' + esc(T("rl.s.relics")) + "</h3>" +
      '<ul class="rl-objs">' + rel.map(function (o) {
        var l = H.loc(o), y = yearOf(o);
        return '<li class="rl-obj"><div class="rl-obj-h"><b>' + esc(l.name) + '</b><span class="note">' + esc(l.mission) + " · " + esc(T("body." + o.planet)) + (y ? " · " + esc(y) : "") + "</span></div>" +
          (relicById(o.id) ? '<p class="rl-sig">' + esc(T("rl.sig." + o.id)) + "</p>" : "") + actions(o, true) + "</li>";
      }).join("") + "</ul>" +

      '<h3 class="rl-h">' + esc(T("rl.s.images")) + "</h3>" +
      '<div class="rl-imgs" id="rl-imgs" aria-live="polite"><p class="note">' + esc(T("rl.photo.loading")) + "</p></div>" +

      '<div class="rl-truth"><h3 class="rl-h">' + esc(T("rl.s.truth")) + '</h3><p class="rl-ok">' + esc(T("rl.truth.ok")) + '</p><p class="rl-rec">' + esc(T("rl.truth.recon")) + "</p></div>" +
      '<h3 class="rl-h">' + esc(T("rl.s.sources")) + '</h3><ul class="mc-src rl-sources">' + s.src.map(function (x) {
        return '<li><a href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(x.t) + "</a></li>";
      }).join("") + "</ul>" +

      '<nav class="rl-pn"><button type="button" class="cta small alt" data-story="' + esc(prev.id) + '">← ' + esc(T("rl.prev")) + ": " + esc(T("rl.st." + prev.id + ".title")) + "</button>" +
        '<button type="button" class="cta small alt" data-story="' + esc(next.id) + '">' + esc(T("rl.next")) + ": " + esc(T("rl.st." + next.id + ".title")) + " →</button></nav>";

    observePhotos(r);
    loadStoryImages(s);
  }
  var lastImgs = [];
  function loadStoryImages(s) {
    var got = [], n = s.img.length, left = n, failed = 0, sid = s.id;
    s.img.forEach(function (g) {
      photos(g.q, g.must, function (res) {
        if (!res.ok) failed++;
        res.items.slice(0, 4).forEach(function (p) { if (!got.some(function (x) { return x.nasaId === p.nasaId; })) got.push(p); });
        if (--left) return;
        var box = $("#rl-imgs"); if (!box || st.story !== sid || st.view !== "story") return;
        lastImgs = got;
        box.innerHTML = got.length ? '<ul class="rl-thumbs">' + got.map(function (p, i) {
          return '<li><button type="button" data-img="' + i + '"><img loading="lazy" decoding="async" src="' + esc(p.thumb) + '" alt="' + esc(p.title) + '"><span>' + esc(p.title) + (p.date ? " · " + esc(p.date.slice(0, 4)) : "") + "</span></button></li>";
        }).join("") + "</ul>" : '<p class="note">' + esc(T(failed === n ? "rl.photo.fail" : "rl.photo.none")) + ' <a href="' + esc(searchUrl(s.img[0].q)) + '" target="_blank" rel="noopener">' + esc(T("rl.photo.search")) + "</a></p>";
      });
    });
  }

  /* ------------------------------------------------------------------ render / events */
  function render() {
    var r = root(); if (!r || !H) return;
    if (st.view === "story") renderStory(r); else renderHome(r);
  }
  function focusTitle() { var t = $("#rl-title"); if (t) { try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } } }
  function open(id) {
    if (!storyById(id)) return;
    st.view = "story"; st.story = id; render(); window.scrollTo(0, 0); focusTitle();
  }
  function home() { st.view = "home"; st.story = null; render(); window.scrollTo(0, 0); focusTitle(); }

  function onClick(e) {
    var t = e.target;
    if (t.closest("a")) return;                      // plain links (sources, NASA search)
    var b;
    if ((b = t.closest("[data-act]"))) { runAction(b.dataset.act, b.dataset.id); return; }
    if ((b = t.closest("[data-story]"))) { open(b.dataset.story); return; }
    if (t.closest("[data-home]")) { home(); return; }
    if ((b = t.closest("button[data-body]"))) { st.body = b.dataset.body; render(); return; }
    if ((b = t.closest("[data-img]"))) { var s = storyById(st.story); viewer(lastImgs, +b.dataset.img, s ? T("rl.st." + s.id + ".title") : "", s ? s.rel.map(H.byId).filter(Boolean) : []); return; }
    if ((b = t.closest("[data-photo]"))) {
      var id = b.dataset.photo, r = relicById(id) || { q: H.byId(id).imageQuery, must: [] }, ph = b.querySelector("[data-ph]");
      var st2 = st.view === "story" ? storyById(st.story) : null;
      photos(r.q, r.must, function (res) { if (res.items.length) viewer(res.items, 0, st2 ? T("rl.st." + st2.id + ".title") : T("rl.title"), [H.byId(id)]); else if (ph) fillPhoto(ph); });
    }
  }

  function init(host) {
    H = host;
    var r = root(); if (!r) return;
    r.addEventListener("click", onClick);
    r.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-photo]")) { e.preventDefault(); onClick({ target: e.target }); }
    });
  }
  function show() { render(); }

  window.FR = { init: init, show: show, render: render, open: open, home: home,
    state: function () { return { view: st.view, story: st.story, body: st.body, cached: Object.keys(mem).length }; } };
})();
