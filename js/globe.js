/* 3D globe engine (raw WebGL 2, no external libraries).
 *
 * One mesh is drawn for both modes: a latitude/longitude grid whose vertices are blended between a flat
 * equirectangular plane (morph = 0, the "2D map") and a sphere (morph = 1, the "3D globe"). Animating `morph`
 * is what turns the flat map into a globe. Markers, labels and the selection pulse are drawn on a 2D overlay
 * canvas with the same projection maths, so picking is exact.
 *
 * Surface texture: the NASA Trek tiles (same layers as the 2D map) are stitched into one texture when the
 * browser is allowed to read them (CORS). Otherwise a stylised procedural texture is used and the host is told
 * through onTexture("fallback"). */
(function () {
  "use strict";

  var PI = Math.PI, TAU = PI * 2;
  var FOV = 40 * PI / 180, TAN = Math.tan(FOV / 2), FOCAL = 1 / TAN;
  var FLAT = 0.5;                       // flat map scale (plane is TAU*FLAT wide)
  var LAT_LIMIT = 1.48;                 // ~85 degrees
  var MIN_DIST = 1.22;

  var cfg = null, gl = null, canvas = null, ov = null, octx = null;
  var prog = null, vao = null, nIdx = 0, U = {};
  var W = 1, H = 1, dpr = 1, asp = 1;
  var active = false, ready = false, raf = 0, lastTs = 0;
  var morph = 0, view = { lon: 0, lat: 0.25, dist: 3.4 }, rot = new Array(9), curDist = 3.4;
  var anim = { morph: null, fly: null };
  var vel = { lon: 0, lat: 0, on: false };
  var pan = { x: 0, y: 0 };             // camera shift in NDC units (0 = globe centred); scaled by morph
  var PAN_MAX = 0.75;
  var grid = true, dirty = true;
  // direction towards the Sun in view space (x right, y up, z towards the viewer); js/space.js sets it from the
  // position of the background Sun so the lit side faces it. Default = the previous fixed light (upper left).
  var light = [-0.55, 0.3, 0.78];
  var body = { key: "", kind: "moon", radiusKm: 1737.4, rim: [0.45, 0.55, 0.8] };
  var tex = {};                         // key -> { glTex, state }
  var markers = [], selectedId = null, hoverId = null, surfacePt = null;
  var ptrs = {}, nPtrs = 0, pinch0 = 0, pinchDist0 = 0, downInfo = null, lastMove = null;
  var support = null, paused = false, wasMoving = false;
  // equipment models (see js/models.js): lazily loaded, drawn after the sphere with the same camera
  var mProg = null, MU = {}, mdl = {}, models = [], modelsOn = true, mpx = {}, mLast = "";

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function wrapPi(a) { while (a > PI) a -= TAU; while (a < -PI) a += TAU; return a; }
  function rad(d) { return d * PI / 180; }
  function deg(r) { return r * 180 / PI; }

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6d2b79f5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ------------------------------------------------------------------ support check
  function isSupported() {
    if (support !== null) return support;
    try {
      var c = document.createElement("canvas");
      support = !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
    } catch (e) { support = false; }
    return support;
  }

  // ------------------------------------------------------------------ shaders & mesh
  var VS = "#version 300 es\nprecision highp float;\n" +
    "in vec2 aLL;\nuniform float uM,uD,uAsp,uFs,uF;\nuniform vec2 uPan;\nuniform mat3 uR;\nout vec2 vLL;\nout vec3 vN;\n" +
    "void main(){\n float cl=cos(aLL.y);\n vec3 S=vec3(cl*sin(aLL.x),sin(aLL.y),cl*cos(aLL.x));\n vec3 Sr=uR*S;\n" +
    " vec3 Fp=vec3(aLL.x*uFs,aLL.y*uFs,0.0);\n vec3 P=mix(Fp,Sr,uM);\n vN=normalize(mix(vec3(0.0,0.0,1.0),Sr,uM));\n vLL=aLL;\n" +
    " float zv=P.z-uD; float n=0.05; float f=60.0;\n" +
    " gl_Position=vec4(P.x*uF/uAsp+uPan.x*(-zv),P.y*uF+uPan.y*(-zv),(-(f+n)*zv-2.0*f*n)/(f-n),-zv);\n}\n";
  var FS = "#version 300 es\nprecision highp float;\n" +
    "in vec2 vLL;\nin vec3 vN;\nuniform sampler2D uTex;\nuniform float uM,uGrid;\nuniform vec3 uRim,uL;\nout vec4 o;\n" +
    "void main(){\n vec2 uv=vec2(vLL.x/6.2831853+0.5,0.5-vLL.y/3.1415927);\n vec3 c=texture(uTex,uv).rgb;\n" +
    " vec3 N=normalize(vN);\n float h=dot(c,vec3(0.3,0.59,0.11));\n vec2 gh=vec2(dFdx(h),dFdy(h));\n N=normalize(N-vec3(gh*5.0*uM,0.0));\n" +
    " vec3 L=normalize(uL);\n float dif=max(dot(N,L),0.0);\n float term=smoothstep(-0.05,0.35,dot(normalize(vN),L));\n" +
    " c*=mix(1.0,0.07+1.05*dif*(0.35+0.65*term),uM);\n" +
    " vec2 g=vLL/0.5235988;\n vec2 fw=max(fwidth(g),vec2(1e-5));\n vec2 a=abs(fract(g+0.5)-0.5)/fw;\n" +
    " float lx=(1.0-min(a.x,1.0))*smoothstep(0.45,0.12,fw.x);\n float ly=1.0-min(a.y,1.0);\n" +
    " c=mix(c,vec3(0.62,0.71,0.9),max(lx,ly)*0.4*uGrid);\n" +
    " float rim=pow(1.0-max(N.z,0.0),3.0)*uM*(0.2+0.8*term);\n c+=uRim*rim*0.55;\n o=vec4(c,1.0);\n}\n";

  var VS_M = "#version 300 es\nprecision highp float;\nin vec3 aP;\nin vec3 aN;\nin vec4 aC;\n" +
    "uniform vec3 uU,uE,uZ;\nuniform float uSc,uYaw,uD,uAsp,uF;\nuniform vec2 uPan;\nuniform mat3 uR;\nout vec3 vN;\nout vec4 vC;\n" +
    "void main(){\n float cy=cos(uYaw),sy=sin(uYaw);\n vec3 m=vec3(aP.x*cy+aP.z*sy,aP.y-0.01,-aP.x*sy+aP.z*cy);\n vec3 nm=vec3(aN.x*cy+aN.z*sy,aN.y,-aN.x*sy+aN.z*cy);\n" +
    " vec3 p=uU+uSc*(uE*m.x+uU*m.y+uZ*m.z);\n vec3 n=uE*nm.x+uU*nm.y+uZ*nm.z;\n vec3 Pr=uR*p;\n vN=normalize(uR*n);\n vC=aC;\n" +
    " float zv=Pr.z-uD; float nn=0.05; float f=60.0;\n" +
    " gl_Position=vec4(Pr.x*uF/uAsp+uPan.x*(-zv),Pr.y*uF+uPan.y*(-zv),(-(f+nn)*zv-2.0*f*nn)/(f-nn),-zv);\n}\n";
  var FS_M = "#version 300 es\nprecision highp float;\nin vec3 vN;\nin vec4 vC;\nuniform vec3 uL;\nout vec4 o;\n" +
    "void main(){\n vec3 N=normalize(vN);\n vec3 L=normalize(uL);\n float d=max(dot(N,L),0.0);\n" +
    " vec3 H=normalize(L+vec3(0.0,0.0,1.0));\n float sp=pow(max(dot(N,H),0.0),28.0)*vC.a;\n" +
    " vec3 c=vC.rgb*(0.24+0.95*d)+vec3(sp*0.55);\n o=vec4(c,1.0);\n}\n";
  function setupModels() {
    try {
      mProg = gl.createProgram();
      gl.attachShader(mProg, compile(gl.VERTEX_SHADER, VS_M)); gl.attachShader(mProg, compile(gl.FRAGMENT_SHADER, FS_M));
      gl.linkProgram(mProg);
      if (!gl.getProgramParameter(mProg, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(mProg));
      ["uU", "uE", "uZ", "uSc", "uYaw", "uD", "uAsp", "uF", "uPan", "uR", "uL"].forEach(function (n) { MU[n] = gl.getUniformLocation(mProg, n); });
    } catch (e) { if (window.console) console.warn("models disabled:", e.message); mProg = null; }
  }
  function loadKind(kind) {
    if (mdl[kind] || !mProg || !window.ModelLib) return;
    var rec = mdl[kind] = { state: "loading", source: null, tris: 0 };
    window.ModelLib.load(kind).then(function (r) {
      if (!ready) return;
      var vao2 = gl.createVertexArray(); gl.bindVertexArray(vao2);
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, r.data, gl.STATIC_DRAW);
      var st = 40, a = gl.getAttribLocation(mProg, "aP"), n = gl.getAttribLocation(mProg, "aN"), c = gl.getAttribLocation(mProg, "aC");
      gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 3, gl.FLOAT, false, st, 0);
      gl.enableVertexAttribArray(n); gl.vertexAttribPointer(n, 3, gl.FLOAT, false, st, 12);
      gl.enableVertexAttribArray(c); gl.vertexAttribPointer(c, 4, gl.FLOAT, false, st, 24);
      gl.bindVertexArray(null);
      rec.vao = vao2; rec.count = r.count; rec.tris = r.tris; rec.source = r.source; rec.state = "ready";
      dirty = true; kick(); notifyModels(true);
    }, function () { rec.state = "error"; notifyModels(true); });
  }
  function surfDepth(la, lo) {   // rotated z of a surface point (1 = facing the camera)
    var cl = Math.cos(la), sx = cl * Math.sin(lo), sy = Math.sin(la), sz = cl * Math.cos(lo);
    return rot[6] * sx + rot[7] * sy + rot[8] * sz;
  }
  function zoomedForModels() { return view.dist <= fitDist() * 0.8; }
  function drawModels() {
    var i, m, shown = 0, zoomed = zoomedForModels();
    mpx = {};
    if (!modelsOn || !mProg || morph < 0.999 || anim.morph) { notifyModels(); return; }
    var base = (W < 600 ? 54 : 72), list = [];
    for (i = 0; i < models.length; i++) {
      m = models[i];
      var sel = m.id === selectedId;
      if (!sel && !zoomed) continue;
      var la = rad(m.lat), lo = rad(m.lon), pz = surfDepth(la, lo);
      if (pz * curDist - 1 <= 0.02) continue;   // far side / limb
      var sp = project(la, lo), mg = base * 1.6;
      if (sp.x < -mg || sp.x > W + mg || sp.y < -mg || sp.y > H + mg) continue;   // off screen: not drawn, not even loaded
      list.push([m, la, lo, pz, sel]);
      loadKind(m.kind);
    }
    gl.useProgram(mProg); gl.disable(gl.CULL_FACE);
    gl.uniform1f(MU.uD, curDist); gl.uniform3fv(MU.uL, light); gl.uniform1f(MU.uAsp, asp); gl.uniform1f(MU.uF, FOCAL); gl.uniform2f(MU.uPan, pan.x * morph, pan.y * morph);
    gl.uniformMatrix3fv(MU.uR, false, [rot[0], rot[3], rot[6], rot[1], rot[4], rot[7], rot[2], rot[5], rot[8]]);
    for (i = 0; i < list.length; i++) {
      var e = list[i], rec = mdl[e[0].kind];
      if (!rec || rec.state !== "ready") continue;
      var la2 = e[1], lo2 = e[2], px = base * (e[4] ? 1.3 : 1), d = curDist - e[3];
      var sc = px / (H / 2) * d * TAN;
      var up = [Math.cos(la2) * Math.sin(lo2), Math.sin(la2), Math.cos(la2) * Math.cos(lo2)];
      var east = [Math.cos(lo2), 0, -Math.sin(lo2)];
      var south = [Math.sin(la2) * Math.sin(lo2), -Math.cos(la2), Math.sin(la2) * Math.cos(lo2)];
      gl.uniform3fv(MU.uU, up); gl.uniform3fv(MU.uE, east); gl.uniform3fv(MU.uZ, south);
      gl.uniform1f(MU.uSc, sc); gl.uniform1f(MU.uYaw, 0);
      gl.bindVertexArray(rec.vao); gl.drawArrays(gl.TRIANGLES, 0, rec.count);
      mpx[e[0].id] = px; shown++;
    }
    gl.bindVertexArray(null); gl.enable(gl.CULL_FACE);
    notifyModels();
  }
  function notifyModels(force) {
    if (!cfg || !cfg.onModels) return;
    var src = {}, k, n = 0;
    for (k in mdl) if (mdl[k].state === "ready") { src[k] = mdl[k].source; n++; }
    var st = { on: modelsOn, supported: !!mProg, zoomed: zoomedForModels(), shown: Object.keys(mpx).length, total: models.length, sources: src };
    var key = JSON.stringify(st);
    if (force || key !== mLast) { mLast = key; cfg.onModels(st); }
  }

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("shader: " + gl.getShaderInfoLog(s));
    return s;
  }
  function buildMesh() {
    var nx = 160, ny = 80, v = new Float32Array((nx + 1) * (ny + 1) * 2), i = 0, x, y;
    for (y = 0; y <= ny; y++) for (x = 0; x <= nx; x++) { v[i++] = -PI + TAU * x / nx; v[i++] = PI / 2 - PI * y / ny; }
    var idx = new Uint16Array(nx * ny * 6), k = 0;
    for (y = 0; y < ny; y++) for (x = 0; x < nx; x++) {
      var a = y * (nx + 1) + x, b = a + 1, c = a + nx + 1, d = c + 1;
      idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
    }
    nIdx = idx.length;
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "aLL"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }
  function setupGL() {
    gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" });
    if (!gl) throw new Error("WebGL 2 unavailable");
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link: " + gl.getProgramInfoLog(prog));
    ["uM", "uD", "uAsp", "uFs", "uF", "uPan", "uR", "uTex", "uGrid", "uRim", "uL"].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    buildMesh(); setupModels();
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.clearColor(0, 0, 0, 0);
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); ready = false; if (cfg.onLost) cfg.onLost(); });
  }

  // ------------------------------------------------------------------ textures
  function upload(canvasEl, glTex, mip) {
    gl.bindTexture(gl.TEXTURE_2D, glTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvasEl);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var ext = gl.getExtension("EXT_texture_filter_anisotropic");
    if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  }

  // Named lunar features at their real selenographic positions (approximate centres and sizes, drawn by hand from
  // standard lunar nomenclature; this is NOT NASA imagery). lat, lon (east +), semi-axes in degrees, darkness.
  var MARIA = [
    ["Imbrium", 33, -16, 10, 8, .62], ["Serenitatis", 28, 18, 5.6, 5.6, .6], ["Tranquillitatis", 8.5, 31, 8, 6, .58],
    ["Crisium", 17, 59, 5.2, 3.8, .66], ["Fecunditatis", -4, 52, 6.5, 4.5, .5], ["Nectaris", -15, 34, 3.4, 3.4, .5],
    ["Nubium", -21, -16, 7, 5, .5], ["Humorum", -24, -39, 3.6, 3.4, .56], ["Procellarum", 18, -57, 14, 18, .5],
    ["Frigoris", 56, 1, 24, 3.4, .4], ["Cognitum", -10, -23, 3, 3, .5], ["Vaporum", 13, 3, 3, 2.8, .5],
    ["Insularum", 7, -31, 5, 5, .45], ["Smythii", 1.3, 87, 3, 2.4, .6], ["Marginis", 13, 86, 3, 2.4, .5],
    ["Orientale", -19, -93, 4.6, 4.6, .55], ["Moscoviense", 27, 148, 3, 2.6, .55], ["Australe", -48, 91, 4.4, 3, .35],
    ["SPA", -53, -169, 20, 14, .2], ["Hertzsprung", 1.4, -129, 6, 6, .12]
  ];
  var CRATERS = [   // name, lat, lon, diameter km, bright rays
    ["Tycho", -43.3, -11.4, 85, 1], ["Copernicus", 9.6, -20.1, 93, 1], ["Kepler", 8.1, -38, 32, 1], ["Aristarchus", 23.7, -47.4, 40, 1],
    ["Plato", 51.6, -9.4, 101, 0], ["Grimaldi", -5.2, -68.3, 172, 0], ["Langrenus", -8.9, 61, 132, 0], ["Tsiolkovskiy", -20.4, 129, 180, 0],
    ["Aristoteles", 50.2, 17.3, 87, 0], ["Clavius", -58.8, -14.4, 225, 0], ["Petavius", -25.3, 60.4, 177, 0], ["Theophilus", -11.4, 26.4, 100, 0],
    ["Archimedes", 29.7, -4, 83, 0], ["Ptolemaeus", -9.2, -1.9, 153, 0], ["Schickard", -44, -55.3, 227, 0], ["Posidonius", 31.8, 29.9, 95, 0],
    ["Eratosthenes", 14.5, -11.3, 58, 0], ["Stevinus", -32.5, 54, 75, 0], ["Aristillus", 33.9, 1.2, 55, 0], ["Hipparchus", -5.5, 5.2, 150, 0]
  ];
  function moonFeatures(bx) {
    var W2 = 2048, H2 = 1024, pxd = W2 / 360, i, j, m, c;
    function X(lon) { return (lon / 360 + 0.5) * W2; }
    function Y(lat) { return (0.5 - lat / 180) * H2; }
    function blob(cx, cy, rx, ry, rot, col, a, soft) {
      for (var w = -1; w <= 1; w++) {
        bx.save(); bx.translate(cx + w * W2, cy); bx.rotate(rot); bx.scale(rx, ry);
        var g = bx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, "rgba(" + col + "," + a + ")"); g.addColorStop(soft, "rgba(" + col + "," + a * 0.9 + ")"); g.addColorStop(1, "rgba(" + col + ",0)");
        bx.fillStyle = g; bx.beginPath(); bx.arc(0, 0, 1, 0, TAU); bx.fill(); bx.restore();
      }
    }
    var r2 = rng(77);
    for (i = 0; i < MARIA.length; i++) {
      m = MARIA[i]; var lat = m[1], lon = m[2], k = pxd / Math.max(0.25, Math.cos(rad(lat)));
      for (j = 0; j < 4; j++) {   // overlapping offset blobs give an irregular coastline
        blob(X(lon) + (r2() - 0.5) * m[3] * k * 0.35, Y(lat) + (r2() - 0.5) * m[4] * pxd * 0.35, m[3] * k * (0.8 + r2() * 0.25), m[4] * pxd * (0.8 + r2() * 0.25), (r2() - 0.5) * 0.6, "26,28,34", m[5] * 0.55, 0.72);
      }
    }
    for (i = 0; i < CRATERS.length; i++) {
      c = CRATERS[i]; var la = c[1], lo = c[2], rr = (c[3] / 30.3) * pxd * 0.5, kk = 1 / Math.max(0.25, Math.cos(rad(la)));
      var cx = X(lo), cy = Y(la);
      if (c[4]) {   // ray system
        for (j = 0; j < 14; j++) {
          var ang = r2() * TAU, len = rr * (5 + r2() * 9);
          for (var w = -1; w <= 1; w++) {
            bx.save(); bx.translate(cx + w * W2, cy); bx.rotate(ang); bx.scale(kk, 1);
            var gg = bx.createLinearGradient(0, 0, len, 0); gg.addColorStop(0, "rgba(255,255,255,0.45)"); gg.addColorStop(1, "rgba(255,255,255,0)");
            bx.fillStyle = gg; bx.beginPath(); bx.moveTo(0, 0); bx.lineTo(len, -rr * 0.18); bx.lineTo(len, rr * 0.18); bx.closePath(); bx.fill(); bx.restore();
          }
        }
      }
      for (var w2 = -1; w2 <= 1; w2++) {
        bx.save(); bx.translate(cx + w2 * W2, cy); bx.scale(kk, 1);
        var g2 = bx.createRadialGradient(0, 0, rr * 0.15, 0, 0, rr);
        g2.addColorStop(0, "rgba(10,10,14,0.30)"); g2.addColorStop(0.78, "rgba(10,10,14,0.18)"); g2.addColorStop(0.9, "rgba(255,255,255," + (c[4] ? 0.7 : 0.4) + ")"); g2.addColorStop(1, "rgba(0,0,0,0)");
        bx.fillStyle = g2; bx.beginPath(); bx.arc(0, 0, rr, 0, TAU); bx.fill(); bx.restore();
      }
    }
  }

  // Stylised surface used until (or instead of) the NASA mosaic. Periodic in longitude so the seam is invisible.
  function proceduralTexture(kind) {
    var Wt = 1024, Ht = 512, c = document.createElement("canvas"); c.width = Wt; c.height = Ht;
    var x = c.getContext("2d"), img = x.createImageData(Wt, Ht), d = img.data, r = rng(kind === "moon" ? 21 : 9);
    var G = 64, lat = new Float32Array((G + 1) * (G / 2 + 1)), i, j;
    for (i = 0; i < lat.length; i++) lat[i] = r();
    function vn(u, v, gx, gy, off) {
      var fx = u * gx, fy = v * gy, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      function at(a, b) { a = ((a % gx) + gx) % gx; b = clamp(b, 0, gy); return lat[(Math.floor(b + off) % (G / 2 + 1)) * (G + 1) + (a + off * 7) % (G + 1)]; }
      return mix(mix(at(ix, iy), at(ix + 1, iy), tx), mix(at(ix, iy + 1), at(ix + 1, iy + 1), tx), ty);
    }
    function fbm(u, v) { return vn(u, v, 4, 2, 0) * 0.5 + vn(u, v, 8, 4, 3) * 0.28 + vn(u, v, 16, 8, 5) * 0.14 + vn(u, v, 32, 16, 9) * 0.08; }
    var px, py;
    for (py = 0; py < Ht; py++) {
      var la = (0.5 - (py + 0.5) / Ht) * PI;
      for (px = 0; px < Wt; px++) {
        var u = px / Wt, v = py / Ht, n = fbm(u, v), k = (py * Wt + px) * 4, R, Gc, B;
        if (kind === "moon") {
          var base = 150 + (n - 0.5) * 84;
          R = base; Gc = base * 0.995; B = base * 1.02;
        } else {
          var dark = clamp((fbm(u + 0.31, v) - 0.48) * 3.2 + 0.4, 0, 1);
          R = mix(188, 104, dark) + (n - 0.5) * 50; Gc = mix(104, 58, dark) + (n - 0.5) * 34; B = mix(66, 40, dark) + (n - 0.5) * 22;
          var cap = clamp((Math.abs(la) - 1.38 - (n - 0.5) * 0.12) * 18, 0, 1);
          R = mix(R, 245, cap); Gc = mix(Gc, 236, cap); B = mix(B, 232, cap);
        }
        d[k] = clamp(R, 0, 255); d[k + 1] = clamp(Gc, 0, 255); d[k + 2] = clamp(B, 0, 255); d[k + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    var big = document.createElement("canvas"); big.width = 2048; big.height = 1024;
    var bx = big.getContext("2d"); bx.imageSmoothingQuality = "high"; bx.drawImage(c, 0, 0, 2048, 1024);
    if (kind === "moon") moonFeatures(bx);
    var count = kind === "moon" ? 320 : 380, q;
    for (q = 0; q < count; q++) {
      var cla = Math.asin(r() * 2 - 1), clo = (r() - 0.5) * TAU, big_ = Math.pow(r(), 3.2);
      var rr = (2 + big_ * (kind === "moon" ? 30 : 22)) * (2048 / 2048);
      var cx = (clo / TAU + 0.5) * 2048, cy = (0.5 - cla / PI) * 1024, sx = 1 / Math.max(0.2, Math.cos(cla));
      bx.save(); bx.translate(cx, cy); bx.scale(sx, 1);
      var g = bx.createRadialGradient(0, 0, rr * 0.2, 0, 0, rr);
      g.addColorStop(0, "rgba(0,0,0,0.20)"); g.addColorStop(0.82, "rgba(0,0,0,0.10)"); g.addColorStop(0.93, "rgba(255,255,255,0.20)"); g.addColorStop(1, "rgba(0,0,0,0)");
      bx.fillStyle = g; bx.beginPath(); bx.arc(0, 0, rr, 0, TAU); bx.fill(); bx.restore();
    }
    return big;
  }

  function loadTiles(urlTpl, z, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var cols = Math.pow(2, z + 1), rows = Math.pow(2, z), total = cols * rows, done = 0, failed = false;
      var out = document.createElement("canvas"); out.width = cols * 256; out.height = rows * 256;
      var cx = out.getContext("2d");
      var timer = setTimeout(function () { failed = true; reject(new Error("tile timeout")); }, timeoutMs);
      var y, x;
      function one(tx, ty) {
        var im = new Image(); im.crossOrigin = "anonymous";
        im.onload = function () {
          if (failed) return;
          cx.drawImage(im, tx * 256, ty * 256, 256, 256);
          if (++done === total) { clearTimeout(timer); resolve(out); }
        };
        im.onerror = function () { if (failed) return; failed = true; clearTimeout(timer); reject(new Error("tile error")); };
        im.src = urlTpl.replace("{z}", z).replace("{x}", tx).replace("{y}", ty);
      }
      for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) one(x, y);
    });
  }

  function ensureTexture(key, spec) {
    if (tex[key]) return tex[key];
    var rec = tex[key] = { glTex: gl.createTexture(), state: "loading" };
    upload(proceduralTexture(spec.kind), rec.glTex);
    var urls = spec.urls.slice(), level = 0;
    function attempt() {
      var url = urls[0];
      if (!url) { rec.state = "fallback"; notify(key); return; }
      loadTiles(url, 2, 14000).then(function (cv) {
        try { upload(cv, rec.glTex); } catch (e) { throw e; }
        rec.state = "nasa"; dirty = true; notify(key); kick();
        // refine with the next zoom level when the GPU and memory allow it
        if (gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 4096 && !(navigator.deviceMemory && navigator.deviceMemory < 4)) {
          loadTiles(url, 3, 30000).then(function (cv3) { try { upload(cv3, rec.glTex); dirty = true; kick(); } catch (e) { /* keep level 2 */ } }, function () { /* keep level 2 */ });
        }
      }).catch(function () { urls.shift(); level++; if (urls.length) attempt(); else { rec.state = "fallback"; notify(key); } });
    }
    if (cfg.onTexture) cfg.onTexture("loading", key);
    attempt();
    return rec;
  }
  function notify(key) { if (key === body.key && cfg.onTexture) cfg.onTexture(tex[key].state, key); }

  // ------------------------------------------------------------------ maths
  function updateRot() {
    var lon = view.lon * morph, la = view.lat * morph;
    var cl = Math.cos(lon), sl = Math.sin(lon), cp = Math.cos(la), sp = Math.sin(la);
    rot[0] = cl; rot[1] = 0; rot[2] = -sl;
    rot[3] = -sp * sl; rot[4] = cp; rot[5] = -sp * cl;
    rot[6] = cp * sl; rot[7] = sp; rot[8] = cp * cl;
  }
  function fitDist() {
    var t = TAN * Math.min(1, asp) * 0.86;
    return 1 / Math.sin(Math.atan(t));
  }
  function flatDist() {
    var halfW = PI * FLAT * 1.04, halfH = PI / 2 * FLAT * 1.08;
    return Math.max(halfW / (TAN * asp), halfH / TAN);
  }
  function maxDist() { return fitDist() * 2.3; }
  function currentDist() { return mix(flatDist(), view.dist, morph); }
  function project(lat, lon) {
    var cl = Math.cos(lat), sx = cl * Math.sin(lon), sy = Math.sin(lat), sz = cl * Math.cos(lon);
    var px = rot[0] * sx + rot[1] * sy + rot[2] * sz, py = rot[3] * sx + rot[4] * sy + rot[5] * sz, pz = rot[6] * sx + rot[7] * sy + rot[8] * sz;
    var D = curDist, den = D - pz;
    return { x: ((px * FOCAL / (asp * den) + pan.x * morph) * 0.5 + 0.5) * W, y: (0.5 - (py * FOCAL / den + pan.y * morph) * 0.5) * H, vis: pz * D - 1 > 0.02 };
  }
  function unproject(cx, cy) {
    var nx = (cx / W) * 2 - 1 - pan.x * morph, ny = 1 - (cy / H) * 2 - pan.y * morph, D = curDist;
    var dx = nx * asp / FOCAL, dy = ny / FOCAL, dz = -1;
    var a = dx * dx + dy * dy + dz * dz, b = -2 * D, c = D * D - 1, disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    var t = (-b - Math.sqrt(disc)) / (2 * a), Px = dx * t, Py = dy * t, Pz = D + dz * t;
    var Sx = rot[0] * Px + rot[3] * Py + rot[6] * Pz, Sy = rot[1] * Px + rot[4] * Py + rot[7] * Pz, Sz = rot[2] * Px + rot[5] * Py + rot[8] * Pz;
    return { lat: Math.asin(clamp(Sy, -1, 1)), lon: Math.atan2(Sx, Sz) };
  }
  function greatCircleKm(la1, lo1, la2, lo2) {
    var s = Math.sin((la2 - la1) / 2), t = Math.sin((lo2 - lo1) / 2);
    var h = s * s + Math.cos(la1) * Math.cos(la2) * t * t;
    return 2 * body.radiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function radPerPx() { return (curDist - 1) * TAN / (H / 2); }

  // ------------------------------------------------------------------ drawing
  function drawGL() {
    if (!ready) return;
    var rec = tex[body.key];
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!rec) return;
    gl.useProgram(prog);
    gl.uniform1f(U.uM, morph); gl.uniform1f(U.uD, curDist); gl.uniform1f(U.uAsp, asp); gl.uniform1f(U.uFs, FLAT); gl.uniform1f(U.uF, FOCAL); gl.uniform2f(U.uPan, pan.x * morph, pan.y * morph);
    gl.uniform1f(U.uGrid, grid ? 1 : 0); gl.uniform3fv(U.uRim, body.rim); gl.uniform3fv(U.uL, light);
    gl.uniformMatrix3fv(U.uR, false, [rot[0], rot[3], rot[6], rot[1], rot[4], rot[7], rot[2], rot[5], rot[8]]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rec.glTex); gl.uniform1i(U.uTex, 0);
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, nIdx, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
    drawModels();
  }
  function labelFont() { return "500 12px " + (cfg.fontFamily || "system-ui, sans-serif"); }
  function drawLabel(text, x, y) {
    octx.font = labelFont();
    var w = octx.measureText(text).width + 14, h = 22, lx = clamp(x - w / 2, 6, W - w - 6), ly = y - 26 - h / 2;
    if (ly < 6) ly = y + 18;
    octx.fillStyle = "rgba(7,11,20,0.9)"; octx.strokeStyle = "rgba(159,180,224,0.5)"; octx.lineWidth = 1;
    octx.beginPath();
    if (octx.roundRect) octx.roundRect(lx, ly, w, h, 3); else octx.rect(lx, ly, w, h);
    octx.fill(); octx.stroke();
    octx.fillStyle = "#e8edf7"; octx.textBaseline = "middle"; octx.textAlign = "left"; octx.fillText(text, lx + 7, ly + h / 2 + 0.5);
  }
  function drawOverlay(ts) {
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.clearRect(0, 0, W, H);
    if (!active || morph < 0.999 || anim.morph) return;
    var i, m, p, sel = null, hov = null;
    for (i = 0; i < markers.length; i++) {
      m = markers[i]; p = project(rad(m.lat), rad(m.lon));
      m._p = p;
      if (!p.vis) continue;
      if (m.id === selectedId) { sel = m; continue; }
      if (m.id === hoverId) hov = m;
      drawMarker(m, p, false);
    }
    if (sel && sel._p.vis) {
      var ph = ((ts || 0) % 1600) / 1600, pp = sel._p;
      octx.strokeStyle = "rgba(185,200,232," + (1 - ph).toFixed(3) + ")"; octx.lineWidth = 2;
      octx.beginPath(); octx.arc(pp.x, pp.y, 10 + 26 * ph, 0, TAU); octx.stroke();
      drawMarker(sel, pp, true);
    }
    if (surfacePt) {
      var sp = project(surfacePt.lat, surfacePt.lon);
      if (sp.vis) {
        octx.strokeStyle = "#e8edf7"; octx.lineWidth = 1.5;
        octx.beginPath(); octx.arc(sp.x, sp.y, 7, 0, TAU); octx.stroke();
        octx.beginPath(); octx.moveTo(sp.x - 12, sp.y); octx.lineTo(sp.x - 4, sp.y); octx.moveTo(sp.x + 4, sp.y); octx.lineTo(sp.x + 12, sp.y);
        octx.moveTo(sp.x, sp.y - 12); octx.lineTo(sp.x, sp.y - 4); octx.moveTo(sp.x, sp.y + 4); octx.lineTo(sp.x, sp.y + 12); octx.stroke();
      }
    }
    var lab = sel || hov;
    if (lab && lab._p && lab._p.vis) drawLabel(lab.name, lab._p.x, lab._p.y);
  }
  function drawMarker(m, p, big) {
    var r = big ? 9 : 7;
    var g = octx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.6);
    g.addColorStop(0, m.color + "aa"); g.addColorStop(1, m.color + "00");
    octx.fillStyle = g; octx.beginPath(); octx.arc(p.x, p.y, r * 2.6, 0, TAU); octx.fill();
    octx.fillStyle = m.color; octx.strokeStyle = "#05080f"; octx.lineWidth = 2;
    octx.beginPath();
    if (m.area) { octx.save(); octx.translate(p.x, p.y); octx.rotate(PI / 4); octx.rect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6); octx.restore(); }
    else octx.arc(p.x, p.y, r, 0, TAU);
    octx.fill(); octx.stroke();
    if (m.id === hoverId && !big) { octx.strokeStyle = "#e8edf7"; octx.lineWidth = 1.5; octx.beginPath(); octx.arc(p.x, p.y, r + 4, 0, TAU); octx.stroke(); }
  }

  // ------------------------------------------------------------------ loop
  function kick() { if (!raf && active && !paused) { lastTs = 0; raf = requestAnimationFrame(frame); } }
  function frame(ts) {
    raf = 0;
    if (!active || !ready || paused) return;
    var dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0.016; lastTs = ts;
    var busy = false;
    if (anim.morph) {
      var a = anim.morph, t = clamp((ts - a.t0) / a.dur, 0, 1);
      morph = mix(a.from, a.to, ease(t)); busy = true; dirty = true;
      if (t >= 1) { morph = a.to; anim.morph = null; if (a.done) a.done(); }
    }
    if (anim.fly) {
      var f = anim.fly, ft = clamp((ts - f.t0) / f.dur, 0, 1), e = ease(ft);
      view.lon = f.lon0 + f.dlon * e; view.lat = f.lat0 + (f.lat1 - f.lat0) * e;
      view.dist = mix(f.d0, f.d1, e) + f.arc * Math.sin(PI * e);
      pan.x = f.px0 * (1 - e); pan.y = f.py0 * (1 - e);
      busy = true; dirty = true;
      if (ft >= 1) { view.lon = wrapPi(f.lon0 + f.dlon); view.lat = f.lat1; view.dist = f.d1; pan.x = pan.y = 0; anim.fly = null; if (f.done) f.done(); }
    }
    if (vel.on && !nPtrs) {
      view.lon = wrapPi(view.lon + vel.lon * dt); view.lat = clamp(view.lat + vel.lat * dt, -LAT_LIMIT, LAT_LIMIT);
      var k = Math.exp(-dt * 3.6); vel.lon *= k; vel.lat *= k;
      if (Math.abs(vel.lon) + Math.abs(vel.lat) < 0.01) vel.on = false;
      busy = true; dirty = true;
    }
    view.dist = clamp(view.dist, MIN_DIST, maxDist());
    curDist = currentDist(); updateRot();
    if (dirty) { drawGL(); dirty = false; }
    drawOverlay(ts);
    // tell the host when the view starts / stops moving (js/space.js pauses its decorative animations meanwhile)
    var moving = busy || nPtrs > 0;
    if (moving !== wasMoving) { wasMoving = moving; if (cfg.onMotion) cfg.onMotion(moving); }
    if (busy || (selectedId && morph >= 0.999) || nPtrs) raf = requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ input
  function pos(e) { var r = ov.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function pick(x, y, touch) {
    var best = null, bestD = 1e9, i, m, p, base = touch ? 24 : 15;
    for (i = 0; i < markers.length; i++) {
      m = markers[i]; p = m._p || project(rad(m.lat), rad(m.lon));
      if (!p.vis) continue;
      var d = Math.hypot(p.x - x, p.y - y), lim = Math.max(base, mpx[m.id] ? mpx[m.id] * 0.55 : 0);   // a drawn model is a bigger target
      if (d < lim && d < bestD) { bestD = d; best = m; }
    }
    return best;
  }
  function onDown(e) {
    if (!active || morph < 0.999 || anim.morph) return;
    var p = pos(e); ov.setPointerCapture(e.pointerId);
    ptrs[e.pointerId] = { x: p.x, y: p.y }; nPtrs = Object.keys(ptrs).length;
    vel.on = false; anim.fly = null; dirty = true;
    if (nPtrs === 1) { downInfo = { x: p.x, y: p.y, t: performance.now(), moved: false, touch: e.pointerType === "touch", pan: e.button > 0 || e.shiftKey }; lastMove = { x: p.x, y: p.y, t: performance.now() }; }
    if (nPtrs === 2) { var ids = Object.keys(ptrs); pinchDist0 = Math.hypot(ptrs[ids[0]].x - ptrs[ids[1]].x, ptrs[ids[0]].y - ptrs[ids[1]].y); pinch0 = view.dist; if (downInfo) downInfo.moved = true; }
    kick();
  }
  function onMove(e) {
    var p = pos(e);
    if (!ptrs[e.pointerId]) {
      if (!active || morph < 0.999 || e.pointerType === "touch") return;
      var h = pick(p.x, p.y, false), id = h ? h.id : null;
      if (id !== hoverId) { hoverId = id; ov.style.cursor = id ? "pointer" : "grab"; dirty = false; kick(); drawOverlay(performance.now()); }
      return;
    }
    var prev = ptrs[e.pointerId]; ptrs[e.pointerId] = { x: p.x, y: p.y };
    if (nPtrs === 2) {
      var ids = Object.keys(ptrs), d = Math.hypot(ptrs[ids[0]].x - ptrs[ids[1]].x, ptrs[ids[0]].y - ptrs[ids[1]].y);
      if (pinchDist0 > 10) view.dist = clamp(pinch0 * pinchDist0 / Math.max(10, d), MIN_DIST, maxDist());
      panBy((p.x - prev.x) / 2, (p.y - prev.y) / 2);
      dirty = true; kick(); return;
    }
    var dx = p.x - prev.x, dy = p.y - prev.y;
    if (downInfo && Math.hypot(p.x - downInfo.x, p.y - downInfo.y) > 5) downInfo.moved = true;
    if (!downInfo || !downInfo.moved) return;
    if (downInfo.pan) { panBy(dx, dy); ov.style.cursor = "move"; dirty = true; kick(); return; }
    var k = radPerPx(), now = performance.now();
    view.lon = wrapPi(view.lon - dx * k); view.lat = clamp(view.lat + dy * k, -LAT_LIMIT, LAT_LIMIT);
    var dtm = Math.max(1, now - lastMove.t) / 1000;
    vel.lon = mix(vel.lon, -dx * k / dtm, 0.5); vel.lat = mix(vel.lat, dy * k / dtm, 0.5); lastMove = { x: p.x, y: p.y, t: now };
    ov.style.cursor = "grabbing"; dirty = true; kick();
  }
  function onUp(e) {
    if (!ptrs[e.pointerId]) return;
    var p = pos(e), wasOne = nPtrs === 1;
    delete ptrs[e.pointerId]; nPtrs = Object.keys(ptrs).length;
    ov.style.cursor = "grab";
    if (wasOne && downInfo) {
      var dtp = performance.now() - downInfo.t;
      if (!downInfo.moved && dtp < 700) { handleTap(p.x, p.y, downInfo.touch); }
      else if (downInfo.moved && performance.now() - lastMove.t < 80 && Math.abs(vel.lon) + Math.abs(vel.lat) > 0.05) { vel.on = true; }
      else { vel.lon = vel.lat = 0; }
    }
    if (nPtrs === 0) downInfo = null;
    kick();
  }
  function panBy(dx, dy) {
    pan.x = clamp(pan.x + dx / W * 2, -PAN_MAX, PAN_MAX); pan.y = clamp(pan.y - dy / H * 2, -PAN_MAX, PAN_MAX); anim.fly = null;
  }
  function handleTap(x, y, touch) {
    var m = pick(x, y, touch);
    if (m) { surfacePt = null; if (cfg.onPick) cfg.onPick(m.id); return; }
    var s = unproject(x, y);
    if (!s) { surfacePt = null; if (cfg.onSurface) cfg.onSurface(null); dirty = false; drawOverlay(performance.now()); return; }
    surfacePt = { lat: s.lat, lon: s.lon };
    var nearest = null, i, km;
    for (i = 0; i < markers.length; i++) {
      km = greatCircleKm(s.lat, s.lon, rad(markers[i].lat), rad(markers[i].lon));
      if (!nearest || km < nearest.km) nearest = { id: markers[i].id, km: km };
    }
    if (cfg.onSurface) cfg.onSurface({ lat: deg(s.lat), lon: deg(s.lon), nearest: nearest });
    kick(); drawOverlay(performance.now());
  }
  function onWheel(e) {
    if (!active || morph < 0.999) return;
    e.preventDefault();
    var f = Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0013) * (e.deltaMode === 1 ? 16 : 1));
    view.dist = clamp(view.dist * f, MIN_DIST, maxDist()); anim.fly = null; dirty = true; kick();
  }
  function onDbl(e) {
    if (!active || morph < 0.999) return;
    var p = pos(e), s = unproject(p.x, p.y);
    if (s) api.flyTo(deg(s.lat), deg(s.lon), Math.max(MIN_DIST + 0.05, view.dist * 0.55), 700);
  }
  function onKey(e) {
    if (!active || morph < 0.999) return;
    var k = radPerPx() * 40, used = true;
    if (e.shiftKey && /^Arrow/.test(e.key)) { var st = 28; panBy(e.key === "ArrowLeft" ? -st : e.key === "ArrowRight" ? st : 0, e.key === "ArrowUp" ? -st : e.key === "ArrowDown" ? st : 0); e.preventDefault(); dirty = true; kick(); return; }
    if (e.key === "ArrowLeft") view.lon = wrapPi(view.lon - k);
    else if (e.key === "ArrowRight") view.lon = wrapPi(view.lon + k);
    else if (e.key === "ArrowUp") view.lat = clamp(view.lat + k, -LAT_LIMIT, LAT_LIMIT);
    else if (e.key === "ArrowDown") view.lat = clamp(view.lat - k, -LAT_LIMIT, LAT_LIMIT);
    else if (e.key === "+" || e.key === "=") view.dist = clamp(view.dist * 0.85, MIN_DIST, maxDist());
    else if (e.key === "-" || e.key === "_") view.dist = clamp(view.dist / 0.85, MIN_DIST, maxDist());
    else if (e.key === "Home") api.reset();
    else used = false;
    if (used) { e.preventDefault(); anim.fly = null; dirty = true; kick(); }
  }

  // ------------------------------------------------------------------ resize
  function resize() {
    if (!canvas) return;
    var r = ov.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    // touch devices: cap the backing store at 1.5x (sharp enough, ~45% fewer pixels to shade than 2x)
    dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia && window.matchMedia("(pointer: coarse)").matches ? 1.5 : 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ov.width = canvas.width; ov.height = canvas.height;
    asp = W / H; dirty = true;
    if (active) { curDist = currentDist(); kick(); }
  }

  // ------------------------------------------------------------------ public API
  var api = {
    supported: isSupported,
    get active() { return active; },
    get ready() { return ready; },
    get morph() { return morph; },
    get busy() { return !!(anim.morph || anim.fly); },
    init: function (c) {
      if (ready) return true;
      cfg = c; canvas = c.canvas; ov = c.overlay; octx = ov.getContext("2d");
      try { setupGL(); } catch (e) { if (window.console) console.error(e); return false; }
      ready = true;
      ov.style.touchAction = "none"; ov.style.cursor = "grab";
      ov.addEventListener("pointerdown", onDown); ov.addEventListener("pointermove", onMove);
      ov.addEventListener("pointerup", onUp); ov.addEventListener("pointercancel", onUp);
      ov.addEventListener("pointerleave", function () { if (hoverId) { hoverId = null; dirty = false; drawOverlay(performance.now()); } });
      ov.addEventListener("wheel", onWheel, { passive: false });
      ov.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      ov.addEventListener("dblclick", onDbl); ov.addEventListener("keydown", onKey);
      if (window.ResizeObserver) new ResizeObserver(resize).observe(ov); else window.addEventListener("resize", resize);
      return true;
    },
    setBody: function (key, spec) {
      body.key = key; body.kind = spec.kind; body.radiusKm = spec.radiusKm; body.rim = spec.rim;
      if (ready) { var rec = ensureTexture(key, spec); notify(key); dirty = true; kick(); return rec.state; }
    },
    setMarkers: function (list, selId) {
      markers = list.map(function (m) { return { id: m.id, lat: m.lat, lon: m.lon, color: m.color, area: m.area, name: m.name }; });
      if (selId !== undefined) selectedId = selId;
      if (hoverId && !markers.some(function (m) { return m.id === hoverId; })) hoverId = null;
      dirty = false; if (active) { kick(); drawOverlay(performance.now()); }
    },
    select: function (id) { selectedId = id; if (active) kick(); },
    setModels: function (list) {
      models = (list || []).map(function (m) { return { id: m.id, kind: m.kind, lat: m.lat, lon: m.lon }; });
      dirty = true; if (active) { kick(); notifyModels(true); }
    },
    setModelsVisible: function (on) { modelsOn = !!on; dirty = true; if (active) { kick(); notifyModels(true); } },
    modelsVisible: function () { return modelsOn; },
    modelInfo: function (kind) { return mdl[kind] ? { state: mdl[kind].state, source: mdl[kind].source, tris: mdl[kind].tris } : null; },
    setLight: function (x, y, z) {
      var k = Math.hypot(x, y, z) || 1, nl = [x / k, y / k, z / k];
      if (Math.abs(nl[0] - light[0]) + Math.abs(nl[1] - light[1]) + Math.abs(nl[2] - light[2]) < 1e-4) return;
      light = nl; dirty = true; if (active) kick();
    },
    light: function () { return light.slice(); },
    setGrid: function (on) { grid = !!on; dirty = true; if (active) kick(); },
    clearSurface: function () { surfacePt = null; if (active) { dirty = false; drawOverlay(performance.now()); } },
    redraw: function () { if (active) { dirty = false; drawOverlay(performance.now()); } },
    enter: function (lat, lon, done) {
      if (!ready) return;
      active = true; resize();
      view.lon = rad(lon || 0); view.lat = clamp(rad(lat || 0), -LAT_LIMIT, LAT_LIMIT); view.dist = fitDist(); pan.x = pan.y = 0;
      morph = 0; curDist = currentDist(); updateRot(); dirty = true;
      var dur = cfg.reduce ? 1 : 1500;
      anim.morph = { from: 0, to: 1, dur: dur, t0: performance.now(), done: function () { dirty = true; if (done) done(); } };
      kick();
    },
    exit: function (done) {
      if (!ready || !active) { if (done) done({ lat: deg(view.lat), lon: deg(view.lon) }); return; }
      anim.fly = null; vel.on = false; surfacePt = null; hoverId = null;
      var center = { lat: deg(view.lat), lon: deg(view.lon) };
      var dur = cfg.reduce ? 1 : 1200;
      anim.morph = { from: morph, to: 0, dur: dur, t0: performance.now(), done: function () { active = false; drawOverlay(0); if (done) done(center); } };
      kick();
    },
    // tilt: 0..0.5, fraction of the half-height by which the target is lifted above the screen centre (gives an oblique view)
    flyTo: function (lat, lon, dist, durMs, done, tilt) {
      var la1 = clamp(rad(lat) - (tilt || 0) * (clamp(dist || view.dist, MIN_DIST, maxDist()) - 1) * TAN, -LAT_LIMIT, LAT_LIMIT), dlon = wrapPi(rad(lon) - view.lon);
      var ang = Math.hypot(dlon * Math.cos((view.lat + la1) / 2), la1 - view.lat);
      var d1 = clamp(dist || view.dist, MIN_DIST, maxDist());
      if (cfg.reduce) { view.lon = rad(lon); view.lat = la1; view.dist = d1; pan.x = pan.y = 0; dirty = true; kick(); if (done) done(); return; }
      anim.fly = { t0: performance.now(), dur: durMs || 2400, lon0: view.lon, dlon: dlon, lat0: view.lat, lat1: la1, d0: view.dist, d1: d1, arc: clamp(ang * 0.9, 0, 1.4), px0: pan.x, py0: pan.y, done: done };
      vel.on = false; kick();
    },
    zoomBy: function (factor) { view.dist = clamp(view.dist * factor, MIN_DIST, maxDist()); anim.fly = null; dirty = true; kick(); },
    reset: function () { api.flyTo(10, 0, fitDist(), 900); },
    resize: resize,
    pause: function (p) { paused = !!p; if (!paused && active) { setTimeout(function () { resize(); dirty = true; kick(); }, 30); } },
    view: function () { return { lat: deg(view.lat), lon: deg(view.lon), dist: view.dist }; },
    // exposed for automated tests
    _project: function (lat, lon) { return project(rad(lat), rad(lon)); },
    _state: function () { return { shown: Object.keys(mpx), pan: { x: pan.x, y: pan.y }, morph: morph, active: active, dist: view.dist, lat: deg(view.lat), lon: deg(view.lon), W: W, H: H, texture: tex[body.key] ? tex[body.key].state : null, markers: markers.length }; }
  };
  // Shared with the AR table (js/ar.js): the same NASA Trek tile stitching and the same labelled stylised fallback.
  api.surfaceTextures = { procedural: proceduralTexture, loadTiles: loadTiles };
  window.Globe = api;
})();
