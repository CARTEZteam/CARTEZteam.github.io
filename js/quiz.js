/* Knowledge Quiz — route #quiz, section #view-quiz.
 * Abandoned but not Forgotten — NASA Space Apps 2026.
 *
 * Depends on: js/quiz.data.js (window.QUIZ_QUESTIONS), js/quiz.i18n.js, js/quiz.questions.i18n.js.
 * Uses window.T(key, vars) and window.I18N if present; works with its own lookup otherwise.
 * Does not read or modify window.OBJECTS. Stores nothing (no accounts on the site):
 * the "previous attempt" line lives in memory only.
 *
 * Public API: window.QUIZ = { render(), show(), reset(), state }
 */
(function () {
  'use strict';

  var VIEW_ID = 'view-quiz';
  var ROUTE = 'quiz';
  var CATS = window.QUIZ_CATEGORIES || ['apollo', 'lunar', 'mars', 'rovers', 'equipment', 'abandoned', 'discoveries', 'archaeology'];

  var state = {
    screen: 'setup',          // setup | question | result
    body: 'all', cat: 'all', diff: 0, count: 10,
    run: [],                  // [{q, order:[k...]}]
    i: 0,
    answers: [],              // [{id, pick, ok}]
    prev: null,               // {s, n} previous attempt (memory only)
    last: null                // last finished run (for "retry mistakes")
  };

  /* ---------------- i18n helpers ---------------- */
  function lang() {
    var I = window.I18N || {};
    var l = I.lang || I.current || I.locale ||
      (typeof I.getLang === 'function' ? I.getLang() : null) ||
      document.documentElement.getAttribute('lang') || 'en';
    l = String(l).toLowerCase().slice(0, 2);
    return (l === 'ru' || l === 'kk') ? l : 'en';
  }
  function fill(s, vars) {
    if (!vars) return s;
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return (k in vars) ? vars[k] : m; });
  }
  function t(key, vars) {
    var I = window.I18N;
    if (I && typeof I.t === 'function') {
      try {
        var x = I.t(key, vars);
        if (x != null && x !== key && x !== '') return fill(x, vars);
      } catch (e) { /* fall through */ }
    }
    if (typeof window.T === 'function') {
      try {
        var r = window.T(key, vars);
        if (r != null && r !== key && r !== '') return fill(r, vars);
      } catch (e) { /* fall through to own lookup */ }
    }
    var d = (window.I18N && window.I18N.dict) || {};
    var v = (d[lang()] && d[lang()][key]);
    if (v == null) v = d.en && d.en[key];
    return v == null ? key : fill(v, vars);
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- data helpers ---------------- */
  function rnd(n) {
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  function all() { return window.QUIZ_QUESTIONS || []; }
  function matchBody(q, body) { return body === 'all' || q.body === body || q.body === 'both'; }
  function pool(body, cat, diff) {
    return all().filter(function (q) {
      return matchBody(q, body) && (cat === 'all' || q.cat === cat) && (!diff || q.diff === diff);
    });
  }
  function optCount(q) {
    if (q.type === 'tf') return 2;
    var n = 0; while (n < 6 && t('quiz.q.' + q.id + '.o' + n) !== 'quiz.q.' + q.id + '.o' + n) n++;
    return n;
  }
  function optText(q, k) {
    if (q.type === 'tf') return t(k === 0 ? 'quiz.tf.true' : 'quiz.tf.false');
    return t('quiz.q.' + q.id + '.o' + k);
  }
  function isRight(q, k) { return q.type === 'tf' ? (k === 0) === q.ans : k === 0; }
  function rightIndex(q) { return q.type === 'tf' ? (q.ans ? 0 : 1) : 0; }
  function makeRun(qs) {
    return shuffle(qs).map(function (q) {
      var ks = []; for (var k = 0; k < optCount(q); k++) ks.push(k);
      return { q: q, order: q.type === 'tf' ? ks : shuffle(ks) };
    });
  }

  /* ---------------- DOM / routing ---------------- */
  function routeIs() { return (location.hash || '').replace(/^#\/?/, '').split(/[?/]/)[0] === ROUTE; }

  function section() {
    var el = document.getElementById(VIEW_ID);
    if (!el) {
      el = document.createElement('section');
      el.id = VIEW_ID;
      el.className = 'view';
      el.setAttribute('aria-labelledby', 'quiz-h');
      var anchor = document.getElementById('view-about') || document.getElementById('view-photos') || document.getElementById('view-home');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor.nextSibling);
      else (document.querySelector('main') || document.body).appendChild(el);
      el.hidden = !routeIs();
    }
    if (!el.querySelector('.quiz-root')) {
      el.innerHTML = '<div class="quiz-root" data-quiz-root></div>';
    }
    return el;
  }
  function root() { return section().querySelector('.quiz-root'); }

  /* Adds a nav link only if the page has none for #quiz (cloned from an existing nav link). */
  function ensureNav() {
    if (document.querySelector('a[href="#quiz"]')) return;
    var ref = document.querySelector('a[href="#photos"]') || document.querySelector('a[href="#about"]');
    if (!ref || !ref.parentNode) return;
    var holder = ref.parentNode.tagName === 'LI' ? ref.parentNode : ref;
    var copy = holder.cloneNode(true);
    var a = copy.tagName === 'A' ? copy : copy.querySelector('a');
    if (!a) return;
    a.setAttribute('href', '#quiz');
    a.setAttribute('data-i18n', 'nav.quiz');
    a.removeAttribute('aria-current');
    a.classList.remove('active', 'is-active', 'current');
    a.textContent = t('nav.quiz');
    a.setAttribute('data-quiz-injected', '');
    holder.parentNode.insertBefore(copy, holder.nextSibling);
  }
  function refreshNavText() {
    var a = document.querySelectorAll('a[data-quiz-injected]');
    for (var i = 0; i < a.length; i++) a[i].textContent = t('nav.quiz');
  }

  /* Fallback: if the app router does not know "#quiz", show the section ourselves. */
  var forced = [];
  function isShown(el) { return !el.hidden && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0; }
  function siblingViews(el) {
    var out = [], views = document.querySelectorAll('[id^="view-"]');
    for (var i = 0; i < views.length; i++) {
      var v = views[i];
      if (v === el || v.contains(el) || el.contains(v) || v.parentNode !== el.parentNode) continue;
      out.push(v);
    }
    return out;
  }
  function fallbackShow() {
    var el = section();
    var others;
    if (!routeIs()) {
      releaseFallback();
      el.classList.remove('quiz-active');
      // Router does not manage our section and left it visible next to another view: hide it.
      others = siblingViews(el).filter(isShown);
      if (isShown(el) && others.length) el.hidden = true;
      return;
    }
    others = siblingViews(el).filter(isShown);
    el.classList.add('quiz-active');
    if (isShown(el) && !others.length) return;   // the app router handles #quiz itself
    others.forEach(function (v) {
      if (forced.some(function (f) { return f.el === v; })) return;
      forced.push({ el: v, display: v.style.display });
      v.style.display = 'none';
    });
    el.hidden = false;
    el.style.display = 'block';
    el.setAttribute('data-quiz-fallback', '');
    render();
  }
  function releaseFallback() {
    forced.forEach(function (f) { f.el.style.display = f.display; });
    forced = [];
    var el = document.getElementById(VIEW_ID);
    if (el && el.hasAttribute('data-quiz-fallback')) {
      el.style.display = ''; el.hidden = true; el.removeAttribute('data-quiz-fallback');
    }
  }

  /* ---------------- rendering ---------------- */
  function seg(name, items, current) {
    return '<div class="quiz-seg" role="radiogroup" aria-label="' + esc(t('quiz.setup.' + name)) + '">' +
      items.map(function (it) {
        var on = String(it.v) === String(current);
        return '<button type="button" class="quiz-chip' + (on ? ' is-on' : '') + '" role="radio" aria-checked="' + on + '"' +
          (it.disabled ? ' disabled' : '') + ' data-set="' + name + '" data-v="' + esc(it.v) + '">' + esc(it.label) +
          (it.n != null ? ' <span class="quiz-chip-n">' + it.n + '</span>' : '') + '</button>';
      }).join('') + '</div>';
  }

  function renderSetup(r) {
    var st = state;
    var bodies = ['all', 'moon', 'mars'].map(function (b) { return { v: b, label: t('quiz.body.' + b), n: pool(b, st.cat, st.diff).length }; });
    var cats = [{ v: 'all', label: t('quiz.cat.all'), n: pool(st.body, 'all', st.diff).length }].concat(CATS.map(function (c) {
      var n = pool(st.body, c, st.diff).length; return { v: c, label: t('quiz.cat.' + c), n: n, disabled: n === 0 };
    }));
    var diffs = [0, 1, 2, 3].map(function (d) { var n = pool(st.body, st.cat, d).length; return { v: d, label: t('quiz.diff.' + d), n: n, disabled: n === 0 && d !== 0 }; });
    var avail = pool(st.body, st.cat, st.diff).length;
    var counts = [5, 10, 15].filter(function (c) { return c < avail; }).map(function (c) { return { v: c, label: String(c) }; });
    counts.push({ v: 0, label: t('quiz.count.all', { n: avail }) });
    if (st.count && st.count >= avail) st.count = 0;

    r.innerHTML =
      '<div class="quiz-head">' +
        '<h2 id="quiz-h" class="page-title quiz-title">' + esc(t('quiz.title')) + '</h2>' +
        '<p class="page-lede quiz-sub">' + esc(t('quiz.subtitle')) + '</p>' +
      '</div>' +
      '<div class="quiz-card quiz-setup quiz-enter">' +
        '<fieldset class="quiz-field"><legend>' + esc(t('quiz.setup.body')) + '</legend>' + seg('body', bodies, st.body) + '</fieldset>' +
        '<fieldset class="quiz-field"><legend>' + esc(t('quiz.setup.cat')) + '</legend>' + seg('cat', cats, st.cat) + '</fieldset>' +
        '<fieldset class="quiz-field"><legend>' + esc(t('quiz.setup.diff')) + '</legend>' + seg('diff', diffs, st.diff) + '</fieldset>' +
        '<fieldset class="quiz-field"><legend>' + esc(t('quiz.setup.count')) + '</legend>' + seg('count', counts, st.count) + '</fieldset>' +
        '<p class="quiz-avail" aria-live="polite">' + esc(avail ? t('quiz.setup.available', { n: avail }) : t('quiz.setup.none')) + '</p>' +
        '<p class="quiz-muted">' + esc(t('quiz.setup.random')) + ' ' + esc(t('quiz.note')) + '</p>' +
        '<div class="quiz-actions"><button type="button" class="cta small quiz-btn quiz-btn-primary" data-act="start"' + (avail ? '' : ' disabled') + '>' + esc(t('quiz.start')) + '</button></div>' +
      '</div>';
  }

  function badges(q) {
    return '<div class="quiz-badges">' +
      '<span class="quiz-badge quiz-badge-cat">' + esc(t('quiz.cat.' + q.cat)) + '</span>' +
      '<span class="quiz-badge quiz-badge-d' + q.diff + '">' + esc(t('quiz.diff.' + q.diff)) + '</span>' +
      '<span class="quiz-badge quiz-badge-' + q.body + '">' + esc(t('quiz.body.' + q.body)) + '</span>' +
    '</div>';
  }
  function sourcesHtml(q) {
    var src = q.src || [];
    if (!src.length) return '';
    return '<div class="quiz-src"><span class="quiz-src-l">' + esc(t(src.length > 1 ? 'quiz.sources' : 'quiz.source')) + ':</span> ' +
      src.map(function (s) {
        return '<a href="' + esc(s.u) + '" target="_blank" rel="noopener noreferrer">' + esc(s.t) + '</a>';
      }).join('<span class="quiz-src-sep"> · </span>') + '</div>';
  }

  function renderQuestion(r, fresh) {
    var st = state, item = st.run[st.i], q = item.q, n = st.run.length;
    var ans = st.answers[st.i];
    var score = st.answers.filter(function (a) { return a && a.ok; }).length;
    var pct = Math.round((st.i + (ans ? 1 : 0)) / n * 100);
    var keys = ['1', '2', '3', '4', '5', '6'];

    var opts = item.order.map(function (k, idx) {
      var cls = 'quiz-opt', extra = '';
      if (ans) {
        if (isRight(q, k)) { cls += ' is-right'; extra = ' <span class="quiz-vh">(' + esc(t('quiz.a11y.correct')) + ')</span>'; }
        else if (ans.pick === k) { cls += ' is-wrong'; extra = ' <span class="quiz-vh">(' + esc(t('quiz.a11y.wrong')) + ')</span>'; }
        else cls += ' is-dim';
      }
      return '<li><button type="button" class="' + cls + '" data-act="pick" data-k="' + k + '"' + (ans ? ' aria-disabled="true"' : '') + '>' +
        '<span class="quiz-opt-key" aria-hidden="true">' + keys[idx] + '</span>' +
        '<span class="quiz-opt-t">' + esc(optText(q, k)) + '</span>' + extra +
        '<span class="quiz-opt-ic" aria-hidden="true"></span></button></li>';
    }).join('');

    var fb = '';
    if (ans) {
      fb = '<div class="quiz-fb ' + (ans.ok ? 'is-ok' : 'is-bad') + '" role="status">' +
        '<p class="quiz-fb-h">' + esc(t(ans.ok ? 'quiz.fb.correct' : 'quiz.fb.wrong')) + '</p>' +
        (ans.ok ? '' : '<p class="quiz-fb-a">' + esc(t('quiz.fb.answer', { a: optText(q, rightIndex(q)) })) + '</p>') +
        '<p class="quiz-fb-ex">' + esc(t('quiz.q.' + q.id + '.ex')) + '</p>' +
        sourcesHtml(q) +
        '<div class="quiz-actions"><button type="button" class="cta small quiz-btn quiz-btn-primary" data-act="next">' +
          esc(t(st.i + 1 < n ? 'quiz.next' : 'quiz.finish')) + '</button></div>' +
      '</div>';
    }

    r.innerHTML =
      '<div class="quiz-top">' +
        '<div class="quiz-prog-row"><span class="quiz-prog-l">' + esc(t('quiz.progress', { i: st.i + 1, n: n })) + '</span>' +
        '<span class="quiz-score">' + esc(t('quiz.score', { s: score })) + '</span>' +
        '<button type="button" class="quiz-link" data-act="quit">' + esc(t('quiz.quit')) + '</button></div>' +
        '<div class="quiz-prog" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + (st.i + (ans ? 1 : 0)) + '" aria-label="' + esc(t('quiz.progress', { i: st.i + 1, n: n })) + '">' +
          '<span style="width:' + pct + '%"></span></div>' +
      '</div>' +
      '<div class="quiz-card quiz-q' + (fresh ? ' quiz-enter' : '') + (ans ? (ans.ok ? ' was-ok' : ' was-bad') : '') + '">' +
        badges(q) +
        '<h3 class="quiz-q-t" tabindex="-1">' + esc(t('quiz.q.' + q.id)) + '</h3>' +
        '<ol class="quiz-opts' + (q.type === 'tf' ? ' quiz-opts-tf' : '') + '">' + opts + '</ol>' +
        fb +
        (ans ? '' : '<p class="quiz-muted quiz-keys">' + esc(t('quiz.keys')) + '</p>') +
      '</div>';
  }

  function ring(p) {
    var R = 52, C = 2 * Math.PI * R, off = C * (1 - p / 100);
    return '<svg class="quiz-ring" viewBox="0 0 120 120" aria-hidden="true">' +
      '<circle cx="60" cy="60" r="' + R + '" class="quiz-ring-bg"/>' +
      '<circle cx="60" cy="60" r="' + R + '" class="quiz-ring-fg" style="--c:' + C.toFixed(2) + ';--o:' + off.toFixed(2) + '" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"/>' +
      '<text x="60" y="66" text-anchor="middle">' + p + '%</text></svg>';
  }

  function renderResult(r) {
    var st = state, n = st.run.length;
    var s = st.answers.filter(function (a) { return a && a.ok; }).length;
    var p = n ? Math.round(s / n * 100) : 0;
    var band = p >= 90 ? 3 : p >= 70 ? 2 : p >= 40 ? 1 : 0;
    var by = {};
    st.run.forEach(function (it, idx) {
      var c = it.q.cat; by[c] = by[c] || { s: 0, n: 0 }; by[c].n++; if (st.answers[idx] && st.answers[idx].ok) by[c].s++;
    });
    var wrong = st.run.filter(function (it, idx) { return !(st.answers[idx] && st.answers[idx].ok); }).length;

    var cats = CATS.filter(function (c) { return by[c]; }).map(function (c) {
      var w = Math.round(by[c].s / by[c].n * 100);
      return '<li><span class="quiz-bc-l">' + esc(t('quiz.cat.' + c)) + '</span><span class="quiz-bc-bar"><span style="width:' + w + '%"></span></span>' +
        '<span class="quiz-bc-n">' + by[c].s + '/' + by[c].n + '</span></li>';
    }).join('');

    var review = st.run.map(function (it, idx) {
      var q = it.q, a = st.answers[idx] || {};
      return '<li class="' + (a.ok ? 'is-ok' : 'is-bad') + '">' +
        '<p class="quiz-rv-q"><span class="quiz-rv-ic" aria-hidden="true"></span>' + esc(t('quiz.q.' + q.id)) + '</p>' +
        (a.ok ? '' : '<p class="quiz-rv-a"><b>' + esc(t('quiz.res.you')) + ':</b> ' + esc(a.pick != null ? optText(q, a.pick) : '—') + '</p>') +
        '<p class="quiz-rv-a"><b>' + esc(t('quiz.res.right')) + ':</b> ' + esc(optText(q, rightIndex(q))) + '</p>' +
        '<p class="quiz-rv-ex">' + esc(t('quiz.q.' + q.id + '.ex')) + '</p>' + sourcesHtml(q) + '</li>';
    }).join('');

    r.innerHTML =
      '<div class="quiz-head"><h2 id="quiz-h" class="page-title quiz-title" tabindex="-1">' + esc(t('quiz.res.title')) + '</h2></div>' +
      '<div class="quiz-card quiz-res quiz-enter">' +
        '<div class="quiz-res-top">' + ring(p) +
          '<div><p class="quiz-res-score">' + esc(t('quiz.res.score', { s: s, n: n })) + '</p>' +
          '<p class="quiz-res-msg">' + esc(t('quiz.res.m' + band)) + '</p>' +
          (st.prev ? '<p class="quiz-muted">' + esc(t('quiz.res.prev', { s: st.prev.s, n: st.prev.n })) + '</p>' : '') +
          '</div></div>' +
        '<div class="quiz-actions">' +
          '<button type="button" class="cta small quiz-btn quiz-btn-primary" data-act="retry">' + esc(t('quiz.retry')) + '</button>' +
          (wrong ? '<button type="button" class="cta small alt quiz-btn" data-act="retryWrong">' + esc(t('quiz.retryWrong', { n: wrong })) + '</button>' : '') +
          '<button type="button" class="cta small alt quiz-btn" data-act="new">' + esc(t('quiz.new')) + '</button>' +
        '</div>' +
        '<h3 class="quiz-h3">' + esc(t('quiz.res.bycat')) + '</h3><ul class="quiz-bycat">' + cats + '</ul>' +
        '<details class="quiz-review"><summary>' + esc(t('quiz.res.review')) + '</summary><ol>' + review + '</ol></details>' +
        '<p class="quiz-muted">' + esc(t('quiz.res.nosave')) + '</p>' +
      '</div>';
  }

  function render(opts) {
    var r = root();
    if (!r) return;
    if (state.screen === 'question' && state.run.length) renderQuestion(r, opts && opts.fresh);
    else if (state.screen === 'result' && state.run.length) renderResult(r);
    else { state.screen = 'setup'; renderSetup(r); }
    if (opts && opts.focus) {
      var f = r.querySelector(opts.focus);
      if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
    }
    refreshNavText();
  }

  /* ---------------- actions ---------------- */
  function start(qs) {
    state.run = makeRun(qs);
    state.i = 0; state.answers = []; state.screen = 'question';
    render({ fresh: true, focus: '.quiz-q-t' });
    scrollTop();
  }
  function startFromSetup() {
    var qs = shuffle(pool(state.body, state.cat, state.diff));
    if (state.count) qs = qs.slice(0, state.count);
    if (qs.length) { state.last = qs; start(qs); }
  }
  function pick(k) {
    if (state.screen !== 'question') return;
    var item = state.run[state.i];
    if (!item || state.answers[state.i]) return;
    state.answers[state.i] = { id: item.q.id, pick: k, ok: isRight(item.q, k) };
    render({ focus: '.quiz-fb [data-act="next"]' });
  }
  function next() {
    if (!state.answers[state.i]) return;
    if (state.i + 1 < state.run.length) { state.i++; render({ fresh: true, focus: '.quiz-q-t' }); }
    else finish();
    scrollTop();
  }
  function finish() {
    state.screen = 'result';
    render({ focus: '#quiz-h' });
    var s = state.answers.filter(function (a) { return a && a.ok; }).length;
    state._done = { s: s, n: state.run.length };
  }
  function rememberPrev() { if (state._done) { state.prev = state._done; state._done = null; } }
  function scrollTop() {
    var el = section();
    // like the app router: back to the top of the page (the fixed top bar would cover scrollIntoView targets)
    if (el && el.getBoundingClientRect().top < 0) { try { window.scrollTo(0, 0); } catch (e) { /* ignore */ } }
  }

  function onClick(e) {
    var b = e.target.closest && e.target.closest('[data-act],[data-set]');
    if (!b || !section().contains(b) || b.disabled) return;
    var set = b.getAttribute('data-set');
    if (set) {
      var v = b.getAttribute('data-v');
      if (set === 'body' || set === 'cat') state[set] = v;
      else state[set] = parseInt(v, 10) || 0;
      render({ focus: '[data-set="' + set + '"][data-v="' + v + '"]' });
      return;
    }
    switch (b.getAttribute('data-act')) {
      case 'start': rememberPrev(); startFromSetup(); break;
      case 'pick': pick(parseInt(b.getAttribute('data-k'), 10)); break;
      case 'next': next(); break;
      case 'quit': state.screen = 'setup'; state.run = []; render({ focus: '[data-act="start"]' }); break;
      case 'retry': rememberPrev(); start((state.run.length ? state.run.map(function (it) { return it.q; }) : state.last) || []); break;
      case 'retryWrong':
        rememberPrev();
        start(state.run.filter(function (it, idx) { return !(state.answers[idx] && state.answers[idx].ok); }).map(function (it) { return it.q; }));
        break;
      case 'new': rememberPrev(); state.screen = 'setup'; state.run = []; render({ focus: '[data-act="start"]' }); break;
    }
  }
  function onKey(e) {
    if (!routeIs() || state.screen !== 'question') return;
    var tag = (e.target && e.target.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.altKey || e.ctrlKey || e.metaKey) return;
    var item = state.run[state.i]; if (!item) return;
    if (!state.answers[state.i] && /^[1-6]$/.test(e.key)) {
      var idx = parseInt(e.key, 10) - 1;
      if (idx < item.order.length) { e.preventDefault(); pick(item.order[idx]); }
    } else if (state.answers[state.i] && (e.key === 'Enter' || e.key === 'ArrowRight')) {
      if (e.target && e.target.closest && e.target.closest('a,summary')) return;
      e.preventDefault(); next();
    }
  }

  /* ---------------- init ---------------- */
  var lastLang = null;
  function onLangMaybeChanged() {
    var l = lang();
    if (l === lastLang) return;
    lastLang = l;
    render();
  }
  function onRoute() {
    section();
    if (routeIs()) render();
    else releaseFallback();
    setTimeout(fallbackShow, 60);
  }
  function init() {
    if (init.done) return; init.done = true;
    section(); ensureNav();
    lastLang = lang();
    render();
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onRoute);
    ['i18n:change', 'langchange', 'languagechange', 'i18nchange'].forEach(function (ev) {
      document.addEventListener(ev, onLangMaybeChanged); window.addEventListener(ev, onLangMaybeChanged);
    });
    if (window.MutationObserver) {
      new MutationObserver(onLangMaybeChanged).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
    // Language switchers usually are buttons/selects with data-lang; re-check shortly after any click/change.
    document.addEventListener('click', function () { setTimeout(onLangMaybeChanged, 0); }, true);
    document.addEventListener('change', function () { setTimeout(onLangMaybeChanged, 0); }, true);
    onRoute();
  }

  window.QUIZ = {
    render: function () { lastLang = lang(); render(); },
    show: onRoute,
    reset: function () { state.screen = 'setup'; state.run = []; state.answers = []; render(); },
    state: state,
    _t: t
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
