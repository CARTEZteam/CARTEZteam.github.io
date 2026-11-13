/* Space environment behind the 2D map and the 3D globe (decorative: aria-hidden, pointer-events: none).
 *
 * One layer inside #mapwrap, below the Leaflet maps (z-index 1) and the globe canvases (z-index 2):
 *   - a single <canvas> with deep space, a faint Milky-Way-like band and the star field. It is drawn once per
 *     size / body (no animation loop) and reused for both modes, so switching 2D <-> 3D or Moon <-> Mars never
 *     creates a new canvas, renderer or loop;
 *   - a handful of DOM stars that twinkle slowly (CSS opacity animation, off with prefers-reduced-motion);
 *   - the Sun: a small canvas disc (limb darkening + fine granulation) and a CSS glow that "breathes" slowly.
 *
 * The scene is an artistic illustration, not imagery: star positions are random (seeded), and the Sun is drawn far
 * larger than its real angular size. One real proportion is kept: Mars is ~1.52 AU from the Sun, so the Sun's disc
 * seen from Mars is ~1/1.52 (~0.66) as wide as seen from the Moon (~1 AU).
 *
 * The 3D globe takes its light direction from the Sun's place on screen (Globe.setLight), so the lit side of the
 * Moon or Mars always faces the Sun of this background. */
(function () {
  "use strict";

  var LOOK = {
    moon: { seed: 1969, base: ["#04070f", "#03050b", "#020309"], band: "160,176,215", halo: "232,238,255", sun: 1 },
    mars: { seed: 1976, base: ["#07060d", "#04040a", "#030308"], band: "200,182,170", halo: "255,228,196", sun: 1 / 1.524 }
  };
  // star colours from hot (blue-white) to cool (orange) stars; the weights are an artistic choice, not a star count
  var STAR_COL = ["155,176,255", "170,191,255", "202,215,255", "248,247,255", "255,244,234", "255,210,161", "255,204,111"];
  var STAR_W = [0.03, 0.07, 0.17, 0.36, 0.23, 0.10, 0.04];

  var wrap = null, root = null, sky = null, sctx = null, tw = null, sun = null, disk = null, dctx = null;
  var st = { body: "moon", mode: "2d", W: 0, H: 0, skyKey: "", diskKey: "", twKey: "" };
  var coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  var timer = 0;

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6d2b79f5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function pickCol(r) {
    var x = r(), i = 0, acc = STAR_W[0];
    while (x > acc && i < STAR_W.length - 1) { i++; acc += STAR_W[i]; }
    return STAR_COL[i];
  }
  function gauss(r) { return (r() + r() + r() - 1.5) / 1.5; }
  function el(tag, cls) { var e = document.createElement(tag); e.className = cls; return e; }
  function dprCap() { return Math.min(window.devicePixelRatio || 1, 1.5); }

  // Sun radius and centre (CSS px, relative to #mapwrap) for a mode. The Sun sits on the right, away from the legend,
  // notes and cards on the left and from the zoom buttons at the top right.
  function sunGeom(mode) {
    var W = st.W, H = st.H, m = Math.min(W, H), lk = LOOK[st.body];
    var r = Math.max(24, Math.min(84, m * 0.085)) * lk.sun;
    if (mode === "2d") {
      // flat map: the map covers the middle, so the Sun peeks in from the top-right corner, partly off-screen
      r *= 0.85;
      return { r: r, x: W - r * 0.55, y: r * 0.35 };
    }
    var portrait = H > W && W < 600;   // phones: the zoom buttons move to the bottom, the Sun can go higher
    return { r: r, x: W - Math.max(W * 0.09, r * 0.9), y: H * (portrait ? 0.31 : 0.42) };
  }

  // ------------------------------------------------------------------ static sky
  function drawSky() {
    var W = st.W, H = st.H, d = dprCap(), lk = LOOK[st.body];
    var key = W + "x" + H + "@" + d + ":" + st.body;
    if (key === st.skyKey) return;
    st.skyKey = key;
    sky.width = Math.round(W * d); sky.height = Math.round(H * d);
    var c = sctx, r = rng(lk.seed), i;
    c.setTransform(d, 0, 0, d, 0, 0);

    var g = c.createLinearGradient(0, 0, W * 0.3, H);
    g.addColorStop(0, lk.base[0]); g.addColorStop(0.55, lk.base[1]); g.addColorStop(1, lk.base[2]);
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    // faint band of unresolved stars and dust, crossing the frame diagonally
    var ang = -0.42 + (r() - 0.5) * 0.2, cx = W * (0.45 + (r() - 0.5) * 0.2), cy = H * 0.5, L = Math.hypot(W, H), bw = L * 0.16;
    c.save(); c.translate(cx, cy); c.rotate(ang);
    var bg = c.createLinearGradient(0, -bw, 0, bw);
    bg.addColorStop(0, "rgba(" + lk.band + ",0)"); bg.addColorStop(0.5, "rgba(" + lk.band + ",0.045)"); bg.addColorStop(1, "rgba(" + lk.band + ",0)");
    c.fillStyle = bg; c.fillRect(-L, -bw, L * 2, bw * 2);
    for (i = 0; i < 46; i++) {   // irregular haze along the band
      var bx = (r() - 0.5) * L * 1.2, by = gauss(r) * bw * 0.5, br = bw * (0.25 + r() * 0.6);
      var hg = c.createRadialGradient(bx, by, 0, bx, by, br);
      hg.addColorStop(0, "rgba(" + lk.band + "," + (0.012 + r() * 0.03).toFixed(3) + ")"); hg.addColorStop(1, "rgba(" + lk.band + ",0)");
      c.fillStyle = hg; c.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    for (i = 0; i < 10; i++) {   // darker dust lanes inside the band
      var dx = (r() - 0.5) * L, dy = gauss(r) * bw * 0.25, dr = bw * (0.15 + r() * 0.25);
      var dg = c.createRadialGradient(dx, dy, 0, dx, dy, dr);
      dg.addColorStop(0, "rgba(2,3,7,0.18)"); dg.addColorStop(1, "rgba(2,3,7,0)");
      c.fillStyle = dg; c.fillRect(dx - dr, dy - dr, dr * 2, dr * 2);
    }
    c.restore();

    // stars: count scales with area, fewer on touch devices; ~30 % concentrated in the band
    var n = Math.round(Math.min(coarse ? 600 : 1800, Math.max(260, W * H * 0.0015)));
    var ca = Math.cos(ang), sa = Math.sin(ang);
    for (i = 0; i < n; i++) {
      var x, y;
      if (r() < 0.3) { var u = (r() - 0.5) * L, v = gauss(r) * bw * 0.45; x = cx + u * ca - v * sa; y = cy + u * sa + v * ca; }
      else { x = r() * W; y = r() * H; }
      if (x < 0 || y < 0 || x > W || y > H) continue;
      var b = Math.pow(r(), 3.4), col = pickCol(r), size = 0.35 + b * 1.25, a = 0.22 + b * 0.78;
      if (b > 0.7) {   // the few bright stars get a soft halo
        var sg = c.createRadialGradient(x, y, 0, x, y, size * 3.2);
        sg.addColorStop(0, "rgba(" + col + "," + (a * 0.32).toFixed(3) + ")"); sg.addColorStop(1, "rgba(" + col + ",0)");
        c.fillStyle = sg; c.fillRect(x - size * 3.2, y - size * 3.2, size * 6.4, size * 6.4);
      }
      c.fillStyle = "rgba(" + col + "," + a.toFixed(3) + ")";
      c.beginPath(); c.arc(x, y, size * 0.5 + 0.2, 0, 6.2832); c.fill();
    }
    // gentle vignette: depth at the edges
    var vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, L * 0.62);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.35)");
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
  }

  // a few stars that twinkle (CSS), positioned in % so a resize does not need new elements
  function buildTwinkles() {
    var key = st.body + (coarse ? "c" : "f");
    if (key === st.twKey) return;
    st.twKey = key;
    tw.textContent = "";
    var r = rng(LOOK[st.body].seed + 7), n = coarse ? 9 : 18, i;
    for (i = 0; i < n; i++) {
      var s = el("i", "tw"), sz = 1.4 + r() * 1.3;
      s.style.left = (2 + r() * 96).toFixed(2) + "%"; s.style.top = (2 + r() * 96).toFixed(2) + "%";
      s.style.width = s.style.height = sz.toFixed(2) + "px";
      s.style.setProperty("--c", "rgb(" + pickCol(r) + ")");
      s.style.setProperty("--d", (5 + r() * 6).toFixed(2) + "s");
      s.style.setProperty("--dl", (-r() * 10).toFixed(2) + "s");
      s.style.setProperty("--lo", (0.25 + r() * 0.25).toFixed(2));
      tw.appendChild(s);
    }
  }

  // ------------------------------------------------------------------ Sun
  function drawDisk(rad) {
    var d = dprCap(), px = Math.max(8, Math.round(rad * 2 * d)), key = px + ":" + d;
    if (key === st.diskKey) return;
    st.diskKey = key;
    disk.width = disk.height = px;
    var c = dctx, R = px / 2, r = rng(4242), i;
    c.clearRect(0, 0, px, px);
    // limb darkening: bright, slightly yellow-white centre, deeper and warmer towards the edge
    var g = c.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, "rgb(255,254,248)"); g.addColorStop(0.55, "rgb(255,246,222)"); g.addColorStop(0.82, "rgb(255,226,172)");
    g.addColorStop(0.95, "rgb(250,196,128)"); g.addColorStop(1, "rgb(236,170,104)");
    c.fillStyle = g; c.beginPath(); c.arc(R, R, R, 0, 6.2832); c.fill();
    // fine granulation (generic texture, not a map of real solar features)
    c.save(); c.beginPath(); c.arc(R, R, R * 0.995, 0, 6.2832); c.clip();
    var n = Math.min(900, Math.round(px * px * 0.05));
    for (i = 0; i < n; i++) {
      var a = r() * 6.2832, q = Math.sqrt(r()) * R, x = R + Math.cos(a) * q, y = R + Math.sin(a) * q, s = (0.6 + r() * 1.4) * d;
      c.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.10)" : "rgba(196,120,40,0.07)";
      c.beginPath(); c.arc(x, y, s, 0, 6.2832); c.fill();
    }
    c.restore();
  }
  function placeSun() {
    var g = sunGeom(st.mode);
    sun.style.setProperty("--r", g.r.toFixed(1) + "px");
    sun.style.transform = "translate(" + g.x.toFixed(1) + "px," + g.y.toFixed(1) + "px)";
    drawDisk(g.r);
    // light for the 3D globe: from the globe centre (middle of the frame) towards the 3D Sun position
    if (window.Globe && window.Globe.setLight) {
      var g3 = sunGeom("3d"), dx = g3.x - st.W / 2, dy = st.H / 2 - g3.y, k = Math.hypot(dx, dy) || 1;
      window.Globe.setLight(dx / k * 0.72, dy / k * 0.72, 0.69);
    }
  }

  // ------------------------------------------------------------------ layout
  function layout() {
    timer = 0;
    if (!root) return;
    var W = wrap.clientWidth, H = wrap.clientHeight;
    if (!W || !H) return;   // hidden view: nothing to draw
    st.W = W; st.H = H;
    root.dataset.body = st.body; root.dataset.mode = st.mode;
    drawSky(); buildTwinkles(); placeSun();
  }
  function schedule() { if (!timer) timer = setTimeout(layout, 120); }

  var api = {
    init: function () {
      if (root) return true;
      wrap = document.getElementById("mapwrap");
      if (!wrap) return false;
      root = el("div", "space-bg"); root.setAttribute("aria-hidden", "true"); root.id = "space-bg";
      sky = el("canvas", "space-sky"); sctx = sky.getContext("2d");
      tw = el("div", "space-tw");
      sun = el("div", "space-sun");
      var halo = el("div", "space-halo"), corona = el("div", "space-corona");
      disk = el("canvas", "space-disk"); dctx = disk.getContext("2d");
      sun.appendChild(halo); sun.appendChild(corona); sun.appendChild(disk);
      root.appendChild(sky); root.appendChild(tw); root.appendChild(sun);
      wrap.insertBefore(root, wrap.firstChild);
      if (window.ResizeObserver) new ResizeObserver(schedule).observe(wrap); else window.addEventListener("resize", schedule);
      return true;
    },
    // body: "moon" | "mars"; mode: "2d" | "3d"
    set: function (body, mode) {
      if (!root && !api.init()) return;
      if (LOOK[body]) st.body = body;
      if (mode === "2d" || mode === "3d") st.mode = mode;
      layout();
    },
    // true while the globe / map is moving: decorative animations pause (fewer composited frames during interaction)
    motion: function (on) { if (root) root.classList.toggle("still", !!on); },
    // exposed for automated tests
    _state: function () { return { body: st.body, mode: st.mode, W: st.W, H: st.H, sun: st.W ? sunGeom(st.mode) : null, sky: st.skyKey, canvases: root ? root.querySelectorAll("canvas").length : 0, twinkles: tw ? tw.children.length : 0, still: root ? root.classList.contains("still") : false }; }
  };
  window.SpaceBG = api;
})();
