/* 3D equipment models for the globe.
 *
 * No third-party models are bundled. Every model below is a SCHEMATIC RECONSTRUCTION built from primitives
 * (boxes, cylinders, spheres) with approximate proportions of the real hardware. They are not scans, not CAD
 * data from the missions and not photographs; the UI labels them as reconstructions.
 *
 * Real GLB / glTF files can replace a reconstruction without touching the code: add the file under models/
 * and register it in window.MODEL_SOURCES, e.g.  window.MODEL_SOURCES = { lm: "models/lm.glb" }  (before this
 * script runs or later). The file is fetched lazily the first time the model is needed; on any error the
 * reconstruction is used. Supported: GLB 2.0 and .gltf with embedded base64 buffers, triangle meshes, node
 * transforms, POSITION / NORMAL / COLOR_0, material baseColorFactor. Textures are intentionally ignored (memory).
 *
 * Mesh format handed to the renderer: interleaved Float32 [x y z  nx ny nz  r g b  specular], stride 10,
 * triangle list, normalised so the largest dimension is 1 and the base sits at y = 0 (centred on x / z).
 * Local axes: +y up (surface normal), -z forward (north at yaw 0). */
(function () {
  "use strict";
  var STRIDE = 10;

  // ------------------------------------------------------------------ geometry helpers
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function mid(a, b) { return mul(add(a, b), 0.5); }

  function MB() { this.v = []; }
  MB.prototype.vert = function (p, n, c, s) { this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], s || 0); };
  // flat triangle; normal flipped to point away from `ctr`
  MB.prototype.tri = function (a, b, c, col, spec, ctr) {
    var n = norm(cross(sub(b, a), sub(c, a)));
    if (ctr && dot(n, sub(mul(add(add(a, b), c), 1 / 3), ctr)) < 0) n = mul(n, -1);
    this.vert(a, n, col, spec); this.vert(b, n, col, spec); this.vert(c, n, col, spec);
  };
  MB.prototype.quad = function (a, b, c, d, col, spec, ctr) { this.tri(a, b, c, col, spec, ctr); this.tri(a, c, d, col, spec, ctr); };
  MB.prototype.box = function (cx, cy, cz, sx, sy, sz, col, spec) {
    var x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2, c = [cx, cy, cz];
    var P = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    var F = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]], i;
    for (i = 0; i < 6; i++) this.quad(P[F[i][0]], P[F[i][1]], P[F[i][2]], P[F[i][3]], col, spec, c);
  };
  // (truncated) cylinder / cone from point a to point b; `phase` rotates the ring (radians)
  MB.prototype.cyl = function (a, b, r1, r2, seg, col, spec, phase, caps) {
    var ax = sub(b, a), len = Math.hypot(ax[0], ax[1], ax[2]) || 1e-6, d = mul(ax, 1 / len);
    var h = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = norm(cross(d, h)), w = cross(d, u), i, ph = phase || 0;
    function ring(c, r, t) { return add(c, add(mul(u, Math.cos(t) * r), mul(w, Math.sin(t) * r))); }
    for (i = 0; i < seg; i++) {
      var t0 = ph + i / seg * Math.PI * 2, t1 = ph + (i + 1) / seg * Math.PI * 2, tm = (t0 + t1) / 2;
      var p0 = ring(a, r1, t0), p1 = ring(a, r1, t1), q0 = ring(b, r2, t0), q1 = ring(b, r2, t1);
      var nm = add(mul(u, Math.cos(tm)), mul(w, Math.sin(tm)));
      var slope = (r1 - r2) / len; nm = norm(add(nm, mul(d, slope)));
      this.vert(p0, nm, col, spec); this.vert(p1, nm, col, spec); this.vert(q1, nm, col, spec);
      this.vert(p0, nm, col, spec); this.vert(q1, nm, col, spec); this.vert(q0, nm, col, spec);
      if (caps !== false) {
        if (r1 > 0) { this.vert(a, mul(d, -1), col, spec); this.vert(p1, mul(d, -1), col, spec); this.vert(p0, mul(d, -1), col, spec); }
        if (r2 > 0) { this.vert(b, d, col, spec); this.vert(q0, d, col, spec); this.vert(q1, d, col, spec); }
      }
    }
  };
  MB.prototype.ellipsoid = function (c, rx, ry, rz, seg, col, spec) {
    var rings = Math.max(3, seg >> 1), i, j;
    function pt(i, j) { var th = i / rings * Math.PI, ph = j / seg * Math.PI * 2; return [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; }
    for (i = 0; i < rings; i++) for (j = 0; j < seg; j++) {
      var a = pt(i, j), b = pt(i + 1, j), cc = pt(i + 1, j + 1), d = pt(i, j + 1);
      function P(n) { return [c[0] + n[0] * rx, c[1] + n[1] * ry, c[2] + n[2] * rz]; }
      if (i > 0) { this.vert(P(a), a, col, spec); this.vert(P(b), b, col, spec); this.vert(P(d), d, col, spec); }
      if (i < rings - 1) { this.vert(P(b), b, col, spec); this.vert(P(cc), cc, col, spec); this.vert(P(d), d, col, spec); }
    }
  };
  // wheel with axis along x
  MB.prototype.wheel = function (x, y, z, r, wd, col) { this.cyl([x - wd / 2, y, z], [x + wd / 2, y, z], r, r, 12, col, 0.1, 0); };
  MB.prototype.strut = function (a, b, r, col, spec) { this.cyl(a, b, r, r, 5, col, spec || 0.3, 0, true); };
  MB.prototype.finish = function () {
    var v = this.v, n = v.length / STRIDE, i, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (i = 0; i < n; i++) for (var k = 0; k < 3; k++) { var q = v[i * STRIDE + k]; if (q < mn[k]) mn[k] = q; if (q > mx[k]) mx[k] = q; }
    var ext = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) || 1, cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2;
    for (i = 0; i < n; i++) { v[i * STRIDE] = (v[i * STRIDE] - cx) / ext; v[i * STRIDE + 1] = (v[i * STRIDE + 1] - mn[1]) / ext; v[i * STRIDE + 2] = (v[i * STRIDE + 2] - cz) / ext; }
    return { data: new Float32Array(v), count: n, tris: n / 3, height: (mx[1] - mn[1]) / ext };
  };

  // ------------------------------------------------------------------ palette
  var GOLD = [0.86, 0.66, 0.24], SILVER = [0.74, 0.75, 0.78], DARK = [0.22, 0.23, 0.26], STEEL = [0.5, 0.52, 0.56],
    SOLAR = [0.09, 0.13, 0.3], WHITE = [0.88, 0.88, 0.9], BEIGE = [0.78, 0.74, 0.64], BLACK = [0.08, 0.08, 0.09];

  function legs(m, n, ay, ar, fy, fr, off, col, padR) {   // n legs from body (radius ar, height ay) to foot pads (radius fr)
    for (var i = 0; i < n; i++) {
      var t = off + i / n * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      var top = [ar * c, ay, ar * s], foot = [fr * c, fy, fr * s];
      m.strut(top, foot, 0.07, col, 0.5);
      m.cyl([foot[0], fy, foot[2]], [foot[0], fy + 0.08, foot[2]], padR, padR, 10, col, 0.4, 0, true);
      var k = 0.55, brace = [top[0] + (foot[0] - top[0]) * k, top[1] + (foot[1] - top[1]) * k, top[2] + (foot[2] - top[2]) * k];
      m.strut([ar * 0.55 * c, ay + 0.55, ar * 0.55 * s], brace, 0.04, col, 0.4);
    }
  }

  // ------------------------------------------------------------------ reconstructions
  var BUILD = {
    // Apollo Lunar Module, descent stage only (ascent stage left the surface)
    lm: function () {
      var m = new MB();
      m.cyl([0, 1.0, 0], [0, 2.3, 0], 2.0, 2.0, 8, GOLD, 0.85, Math.PI / 8, true);
      m.cyl([0, 2.3, 0], [0, 2.42, 0], 1.7, 1.7, 8, SILVER, 0.5, Math.PI / 8, true);
      m.cyl([0, 1.0, 0], [0, 0.35, 0], 0.4, 0.85, 12, DARK, 0.2, 0, false);
      legs(m, 4, 1.7, 1.75, 0.0, 4.55, Math.PI / 4, SILVER, 0.5);
      m.box(1.2, 1.5, 2.0, 0.5, 1.0, 0.1, STEEL, 0.2);   // ladder side
      return m.finish();
    },
    // Lunar Roving Vehicle (parked)
    lrv: function () {
      var m = new MB(), x, z;
      m.box(0, 0.62, 0, 1.5, 0.12, 2.8, SILVER, 0.4);
      for (x = -1; x <= 1; x += 2) for (z = -1; z <= 1; z += 2) {
        m.wheel(x * 1.0, 0.41, z * 1.15, 0.41, 0.23, STEEL);
        m.strut([x * 0.7, 0.62, z * 1.0], [x * 0.98, 0.41, z * 1.15], 0.04, DARK, 0.3);
      }
      m.box(-0.34, 0.95, 0.15, 0.45, 0.5, 0.5, [0.34, 0.37, 0.46], 0.1);
      m.box(0.34, 0.95, 0.15, 0.45, 0.5, 0.5, [0.34, 0.37, 0.46], 0.1);
      m.box(0, 0.95, -0.7, 0.8, 0.35, 0.4, GOLD, 0.7);
      m.strut([0, 0.7, -1.2], [0, 1.9, -1.2], 0.04, SILVER, 0.5);
      m.cyl([0, 1.9, -1.2], [0, 1.96, -1.2], 0.55, 0.55, 14, WHITE, 0.6, 0, true);
      m.box(0, 0.95, 1.1, 0.9, 0.5, 0.5, SILVER, 0.5);
      return m.finish();
    },
    // Surveyor lander
    surveyor: function () {
      var m = new MB();
      m.cyl([0, 0.95, 0], [0, 1.8, 0], 0.6, 0.55, 6, SILVER, 0.5, 0, true);
      legs(m, 3, 1.3, 0.55, 0.0, 2.2, Math.PI / 2, SILVER, 0.38);
      m.strut([0, 1.8, 0], [0, 3.35, 0], 0.07, SILVER, 0.5);
      m.box(0, 3.5, 0, 1.15, 0.05, 0.9, SOLAR, 0.8);
      m.box(0.45, 1.5, 0.3, 0.3, 0.4, 0.3, GOLD, 0.7);
      m.strut([-0.3, 1.8, 0.2], [-0.3, 2.35, 0.2], 0.05, STEEL, 0.4);
      m.box(-0.3, 2.45, 0.2, 0.22, 0.2, 0.2, DARK, 0.2);
      return m.finish();
    },
    // Lunokhod 1 (8 wheels, tub body)
    lunokhod: function () {
      var m = new MB(), i, x;
      m.cyl([0, 0.55, 0], [0, 0.95, 0], 0.95, 0.75, 14, SILVER, 0.45, 0, true);
      m.ellipsoid([0, 0.95, 0], 0.75, 0.25, 0.75, 12, WHITE, 0.4);
      for (i = 0; i < 4; i++) for (x = -1; x <= 1; x += 2) m.wheel(x * 1.0, 0.255, -1.05 + i * 0.7, 0.255, 0.2, STEEL);
      m.box(0, 0.6, 0, 1.9, 0.08, 2.6, DARK, 0.2);
      m.strut([0.4, 1.1, 0.4], [0.4, 1.9, 0.4], 0.03, STEEL, 0.4);
      return m.finish();
    },
    // Viking lander
    viking: function () {
      var m = new MB();
      m.cyl([0, 0.95, 0], [0, 1.55, 0], 1.15, 1.15, 6, BEIGE, 0.3, 0, true);
      legs(m, 3, 1.1, 1.0, 0.0, 2.1, Math.PI / 6, SILVER, 0.36);
      m.strut([0.6, 1.55, 0.2], [0.6, 2.35, 0.2], 0.05, STEEL, 0.4);
      m.cyl([0.6, 2.35, 0.2], [0.6, 2.42, 0.2], 0.5, 0.5, 14, WHITE, 0.6, 0, true);
      m.cyl([-0.7, 1.55, -0.4], [-0.7, 1.95, -0.4], 0.22, 0.22, 10, DARK, 0.2, 0, true);
      m.cyl([-0.1, 1.55, -0.8], [-0.1, 1.95, -0.8], 0.22, 0.22, 10, DARK, 0.2, 0, true);
      m.strut([-0.9, 1.4, 0.4], [-1.7, 1.2, 0.9], 0.04, STEEL, 0.4);
      return m.finish();
    },
    // Mars Pathfinder lander (opened petals)
    pathfinder: function () {
      var m = new MB(), i, r = 0.75, y = 0.3;
      for (i = 0; i < 3; i++) {
        var t0 = i / 3 * Math.PI * 2 + Math.PI / 2, t1 = (i + 1) / 3 * Math.PI * 2 + Math.PI / 2, tm = (t0 + t1) / 2;
        var a = [r * Math.cos(t0), y, r * Math.sin(t0)], b = [r * Math.cos(t1), y, r * Math.sin(t1)];
        var ga = [1.75 * Math.cos(t0 + 0.12), 0.05, 1.75 * Math.sin(t0 + 0.12)], gb = [1.75 * Math.cos(t1 - 0.12), 0.05, 1.75 * Math.sin(t1 - 0.12)];
        m.quad(a, b, gb, ga, SILVER, 0.5, [0, -1, 0]);
        var up = [0, 0.012, 0];
        m.quad(add(mul(a, 1.1), up), add(mul(b, 1.1), up), add(gb, up), add(ga, up), SOLAR, 0.8, [0, -1, 0]);
      }
      m.tri([r * Math.cos(Math.PI / 2), y, r * Math.sin(Math.PI / 2)], [r * Math.cos(Math.PI / 2 + 2.094), y, r * Math.sin(Math.PI / 2 + 2.094)], [r * Math.cos(Math.PI / 2 + 4.188), y, r * Math.sin(Math.PI / 2 + 4.188)], BEIGE, 0.2, [0, -1, 0]);
      m.strut([0, y, 0], [0, 1.3, 0], 0.05, SILVER, 0.5);
      m.box(0, 1.38, 0, 0.35, 0.18, 0.18, DARK, 0.3);
      return m.finish();
    },
    // Mars Exploration Rover (Spirit, Opportunity)
    mer: function () {
      var m = new MB(), x, z;
      m.box(0, 0.62, 0, 1.2, 0.45, 1.0, GOLD, 0.6);
      m.box(0, 0.9, 0, 1.65, 0.04, 1.5, SOLAR, 0.8);
      for (x = -1; x <= 1; x += 2) for (z = -1; z <= 1; z++) {
        m.wheel(x * 0.7, 0.13, z * 0.6, 0.13, 0.16, STEEL);
        m.strut([x * 0.55, 0.55, z * 0.35], [x * 0.7, 0.13, z * 0.6], 0.025, SILVER, 0.4);
      }
      m.strut([0.4, 0.92, -0.45], [0.4, 1.5, -0.45], 0.03, SILVER, 0.5);
      m.box(0.4, 1.56, -0.45, 0.3, 0.12, 0.1, DARK, 0.3);
      m.strut([-0.5, 0.92, 0.5], [-0.5, 1.15, 0.5], 0.02, STEEL, 0.4);
      m.cyl([-0.5, 1.15, 0.5], [-0.5, 1.18, 0.5], 0.17, 0.17, 12, WHITE, 0.6, 0, true);
      return m.finish();
    },
    // Mars Science Laboratory class rover (Curiosity, Perseverance)
    msl: function () {
      var m = new MB(), x, z;
      m.box(0, 1.1, 0, 2.0, 0.8, 2.6, SILVER, 0.45);
      m.box(0, 1.6, 0.4, 1.7, 0.18, 1.8, STEEL, 0.3);
      for (x = -1; x <= 1; x += 2) for (z = -1; z <= 1; z++) {
        m.wheel(x * 1.4, 0.26, z * 1.15, 0.26, 0.4, STEEL);
        m.strut([x * 1.0, 0.95, z * 0.5], [x * 1.38, 0.26, z * 1.15], 0.05, SILVER, 0.4);
      }
      m.cyl([0.55, 1.7, -0.8], [0.55, 2.7, -0.8], 0.055, 0.055, 6, SILVER, 0.5, 0, true);
      m.box(0.55, 2.78, -0.8, 0.5, 0.2, 0.2, DARK, 0.3);
      m.cyl([0, 1.1, 1.3], [0, 1.1, 2.0], 0.3, 0.3, 10, DARK, 0.3, 0, true);   // RTG
      m.strut([-0.5, 0.9, -1.3], [-0.9, 0.7, -2.1], 0.07, STEEL, 0.4);           // arm
      return m.finish();
    },
    // Phoenix lander
    phoenix: function () {
      var m = new MB();
      m.cyl([0, 0.8, 0], [0, 1.0, 0], 0.95, 0.95, 6, SILVER, 0.45, 0, true);
      legs(m, 3, 0.8, 0.8, 0.0, 1.5, Math.PI / 6, SILVER, 0.3);
      m.cyl([-1.8, 1.05, 0], [-1.8, 1.09, 0], 1.0, 1.0, 20, SOLAR, 0.8, 0, true);
      m.cyl([1.8, 1.05, 0], [1.8, 1.09, 0], 1.0, 1.0, 20, SOLAR, 0.8, 0, true);
      m.strut([0.2, 1.0, -0.2], [0.2, 1.9, -0.2], 0.04, SILVER, 0.5);
      m.box(0.2, 1.95, -0.2, 0.35, 0.15, 0.15, DARK, 0.3);
      m.strut([-0.4, 1.0, 0.5], [-0.9, 0.8, 1.4], 0.06, STEEL, 0.4);
      return m.finish();
    },
    // InSight stationary lander
    insight: function () {
      var m = new MB();
      m.cyl([0, 0.4, 0], [0, 0.65, 0], 0.9, 0.9, 6, SILVER, 0.45, 0, true);
      legs(m, 3, 0.45, 0.7, 0.0, 1.2, Math.PI / 6, SILVER, 0.25);
      m.cyl([-1.9, 0.78, 0], [-1.9, 0.82, 0], 1.15, 1.15, 22, SOLAR, 0.8, 0, true);
      m.cyl([1.9, 0.78, 0], [1.9, 0.82, 0], 1.15, 1.15, 22, SOLAR, 0.8, 0, true);
      m.strut([0, 0.65, 0], [0, 1.1, 0], 0.04, STEEL, 0.4);
      m.ellipsoid([0.2, 0.3, 1.5], 0.45, 0.3, 0.45, 10, STEEL, 0.4);
      return m.finish();
    }
  };

  // which project object gets which reconstruction (ids come from js/data.js; nothing is placed without a data record)
  var FOR = {
    "apollo-11-lm": "lm", "apollo-12-lm": "lm", "apollo-14-lm": "lm", "apollo-15-lm": "lm", "apollo-16-lm": "lm", "apollo-17-lm": "lm",
    "apollo-15-lrv": "lrv", "apollo-16-lrv": "lrv", "apollo-17-lrv": "lrv",
    "surveyor-3": "surveyor", "lunokhod-1": "lunokhod",
    "viking-1": "viking", "viking-2": "viking", "pathfinder": "pathfinder",
    "spirit": "mer", "opportunity": "mer", "curiosity": "msl", "perseverance": "msl", "phoenix": "phoenix", "insight": "insight"
  };

  // ------------------------------------------------------------------ GLB / glTF loader
  function mat4Mul(a, b) { var o = new Array(16), i, j, k; for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) { var s = 0; for (k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function nodeMatrix(n) {
    if (n.matrix) return n.matrix.slice();
    var t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
    var x = q[0], y = q[1], z = q[2], w = q[3];
    return [(1 - 2 * (y * y + z * z)) * s[0], (2 * (x * y + z * w)) * s[0], (2 * (x * z - y * w)) * s[0], 0,
      (2 * (x * y - z * w)) * s[1], (1 - 2 * (x * x + z * z)) * s[1], (2 * (y * z + x * w)) * s[1], 0,
      (2 * (x * z + y * w)) * s[2], (2 * (y * z - x * w)) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1];
  }
  function readAccessor(g, bufs, idx) {
    var a = g.accessors[idx], bv = g.bufferViews[a.bufferView], buf = bufs[bv.buffer];
    var comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type], CT = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array }[a.componentType];
    if (!CT) throw new Error("accessor type " + a.componentType);
    var bytes = CT.BYTES_PER_ELEMENT, stride = bv.byteStride || comps * bytes, off = (bv.byteOffset || 0) + (a.byteOffset || 0);
    var out = new Float32Array(a.count * comps), dv = new DataView(buf.buffer || buf, buf.byteOffset || 0), i, c;
    for (i = 0; i < a.count; i++) for (c = 0; c < comps; c++) {
      var p = off + i * stride + c * bytes, v;
      v = a.componentType === 5126 ? dv.getFloat32(p, true) : a.componentType === 5123 ? dv.getUint16(p, true) : a.componentType === 5125 ? dv.getUint32(p, true) : dv.getUint8(p);
      if (a.normalized) v = a.componentType === 5121 ? v / 255 : v / 65535;
      out[i * comps + c] = v;
    }
    return { data: out, comps: comps, count: a.count };
  }
  function parseGLTF(g, bufs) {
    var m = new MB(), scene = (g.scenes || [])[g.scene || 0], roots = scene ? scene.nodes : (g.nodes || []).map(function (_, i) { return i; });
    function visit(ni, parent) {
      var n = g.nodes[ni], M = mat4Mul(parent, nodeMatrix(n));
      if (n.mesh !== undefined) g.meshes[n.mesh].primitives.forEach(function (pr) {
        if (pr.mode !== undefined && pr.mode !== 4) return;
        var P = readAccessor(g, bufs, pr.attributes.POSITION), N = pr.attributes.NORMAL !== undefined ? readAccessor(g, bufs, pr.attributes.NORMAL) : null;
        var C = pr.attributes.COLOR_0 !== undefined ? readAccessor(g, bufs, pr.attributes.COLOR_0) : null;
        var I = pr.indices !== undefined ? readAccessor(g, bufs, pr.indices).data : null, cnt = I ? I.length : P.count, i, k;
        var mt = pr.material !== undefined ? g.materials[pr.material] : null, bc = (mt && mt.pbrMetallicRoughness && mt.pbrMetallicRoughness.baseColorFactor) || [0.8, 0.8, 0.8, 1];
        var spec = mt && mt.pbrMetallicRoughness && mt.pbrMetallicRoughness.metallicFactor !== undefined ? mt.pbrMetallicRoughness.metallicFactor * 0.6 : 0.2;
        function pos(vi) { var x = P.data[vi * 3], y = P.data[vi * 3 + 1], z = P.data[vi * 3 + 2]; return [M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]]; }
        function nor(vi) { var x = N.data[vi * 3], y = N.data[vi * 3 + 1], z = N.data[vi * 3 + 2]; return norm([M[0] * x + M[4] * y + M[8] * z, M[1] * x + M[5] * y + M[9] * z, M[2] * x + M[6] * y + M[10] * z]); }
        for (i = 0; i + 2 < cnt; i += 3) {
          var vi = [I ? I[i] : i, I ? I[i + 1] : i + 1, I ? I[i + 2] : i + 2], pp = vi.map(pos), fn = norm(cross(sub(pp[1], pp[0]), sub(pp[2], pp[0])));
          for (k = 0; k < 3; k++) {
            var col = C ? [C.data[vi[k] * C.comps] * bc[0], C.data[vi[k] * C.comps + 1] * bc[1], C.data[vi[k] * C.comps + 2] * bc[2]] : [bc[0], bc[1], bc[2]];
            m.vert(pp[k], N ? nor(vi[k]) : fn, col, spec);
          }
        }
      });
      (n.children || []).forEach(function (c) { visit(c, M); });
    }
    roots.forEach(function (r) { visit(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); });
    if (!m.v.length) throw new Error("no triangles");
    return m.finish();
  }
  function b64(uri) { var s = atob(uri.split(",")[1]), a = new Uint8Array(s.length), i; for (i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function loadFile(url) {
    var isGlb = /\.glb(\?|$)/i.test(url);
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return isGlb ? r.arrayBuffer() : r.json(); }).then(function (res) {
      if (!isGlb) {
        var g = res, bufs = (g.buffers || []).map(function (b) { if (!/^data:/.test(b.uri || "")) throw new Error("external buffers are not supported"); return b64(b.uri); });
        return parseGLTF(g, bufs);
      }
      var dv = new DataView(res);
      if (dv.getUint32(0, true) !== 0x46546C67 || dv.getUint32(4, true) !== 2) throw new Error("not a GLB 2.0 file");
      var off = 12, json = null, bin = null;
      while (off < dv.byteLength) {
        var len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true);
        if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(res, off + 8, len)));
        else if (type === 0x004E4942 && !bin) bin = new Uint8Array(res, off + 8, len);
        off += 8 + len;
      }
      if (!json) throw new Error("no JSON chunk");
      var bufs = (json.buffers || []).map(function (b, i) { return i === 0 && bin ? bin : (/^data:/.test(b.uri || "") ? b64(b.uri) : (function () { throw new Error("external buffers are not supported"); })()); });
      return parseGLTF(json, bufs);
    });
  }

  // ------------------------------------------------------------------ public API (lazy, cached)
  var cache = {};
  window.MODEL_SOURCES = window.MODEL_SOURCES || {};
  window.ModelLib = {
    kindFor: function (id) { return FOR[id] || null; },
    kinds: function () { return Object.keys(BUILD); },
    // resolves { data, count, tris, height, source: "glb" | "reconstruction" }; never rejects for known kinds
    load: function (kind) {
      if (!BUILD[kind]) return Promise.reject(new Error("unknown model kind " + kind));
      if (cache[kind]) return cache[kind];
      var url = window.MODEL_SOURCES[kind];
      var p = url ? loadFile(url).then(function (r) { r.source = "glb"; return r; }).catch(function (e) { if (window.console) console.warn("model " + kind + ": " + e.message + "; using reconstruction"); return null; }) : Promise.resolve(null);
      cache[kind] = p.then(function (r) { if (r) return r; var b = BUILD[kind](); b.source = "reconstruction"; return b; });
      return cache[kind];
    },
    _parse: parseGLTF
  };
})();
