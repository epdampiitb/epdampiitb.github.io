/* ==========================================================================
   DAMP — physics.js
   Self-contained simulation layer. No dependencies.

   Usage:
     <canvas data-blackhole></canvas>          full Schwarzschild hero
     <canvas data-sim="lorenz"></canvas>       a named 2D simulation

   Available sims: lorenz, pendulum, bands, slit, chladni, nbody

   Every simulation is viewport-gated (nothing animates off-screen),
   pauses on tab blur, honours prefers-reduced-motion, and slows down
   while the pointer is over its container so text stays readable.
   ========================================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BG = '#070a12';

  function dpr() { return Math.min(window.devicePixelRatio || 1, 2); }

  /* ----------------------------------------------------------------------
     Motion state.

     Simulations are decorative, so they default to OFF whenever the device
     or the user tells us animation is unwelcome — reduced-motion, few CPU
     cores, or little memory. A visible control lets anyone flip it, and the
     choice is remembered. When off, each canvas still paints one developed
     still frame so the page never shows an empty black box.
     ---------------------------------------------------------------------- */

  var Motion = {
    enabled: true,
    _subs: [],

    init: function () {
      var stored = null;
      try { stored = window.localStorage.getItem('damp-motion'); } catch (e) {}

      var cores = navigator.hardwareConcurrency || 0;
      var mem = navigator.deviceMemory || 0;
      var lowPower = (cores > 0 && cores <= 4) || (mem > 0 && mem <= 4);

      this.autoOff = REDUCED || lowPower;
      this.enabled = stored === 'on' ? true
                   : stored === 'off' ? false
                   : !this.autoOff;
    },

    set: function (on) {
      this.enabled = !!on;
      try { window.localStorage.setItem('damp-motion', on ? 'on' : 'off'); } catch (e) {}
      for (var i = 0; i < this._subs.length; i++) this._subs[i]();
    },

    subscribe: function (fn) { this._subs.push(fn); }
  };

  Motion.init();

  function fitCanvas(cv, scale) {
    var r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    var d = dpr() * (scale || 1);
    var w = Math.max(1, Math.floor(r.width * d));
    var h = Math.max(1, Math.floor(r.height * d));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; return true; }
    return false;
  }

  /* ======================================================================
     1. Schwarzschild black hole — WebGL null-geodesic tracer
     ====================================================================== */

  var VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }';

  var FS = [
    'precision highp float;',
    'uniform vec2  uRes;',
    'uniform float uTime;',
    'uniform vec2  uMouse;',
    'uniform float uSteps;',
    'uniform float uDive;',   // 0 = resting distance, 1 = deepest approach
    '',
    '#define DISK_IN  2.3',
    '#define DISK_OUT 9.0',
    '#define ESCAPE   42.0',
    '',
    'float hash13(vec3 p){',
    '  p = fract(p*0.1031);',
    '  p += dot(p, p.yzx + 33.33);',
    '  return fract((p.x + p.y)*p.z);',
    '}',
    'float noise(vec3 x){',
    '  vec3 i = floor(x), f = fract(x);',
    '  f = f*f*(3.0-2.0*f);',
    '  float n000=hash13(i+vec3(0.,0.,0.)), n100=hash13(i+vec3(1.,0.,0.));',
    '  float n010=hash13(i+vec3(0.,1.,0.)), n110=hash13(i+vec3(1.,1.,0.));',
    '  float n001=hash13(i+vec3(0.,0.,1.)), n101=hash13(i+vec3(1.,0.,1.));',
    '  float n011=hash13(i+vec3(0.,1.,1.)), n111=hash13(i+vec3(1.,1.,1.));',
    '  return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),',
    '             mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y), f.z);',
    '}',
    'float fbm(vec3 p){',
    '  float a=0.5, s=0.0;',
    '  for(int i=0;i<4;i++){ s += a*noise(p); p *= 2.07; a *= 0.5; }',
    '  return s;',
    '}',
    '',
    '// blackbody-ish ramp: t=0 cool outer edge, t=1 hot inner edge',
    'vec3 diskColor(float t){',
    '  vec3 c = mix(vec3(1.00,0.26,0.05), vec3(1.00,0.66,0.24), smoothstep(0.0,0.45,t));',
    '  c = mix(c, vec3(1.00,0.92,0.78), smoothstep(0.45,0.78,t));',
    '  c = mix(c, vec3(0.80,0.90,1.00), smoothstep(0.80,1.0,t));',
    '  return c;',
    '}',
    '',
    'vec3 starField(vec3 d){',
    '  vec3 col = vec3(0.0);',
    '  for(int i=0;i<3;i++){',
    '    float sc = 70.0 + float(i)*130.0;',
    '    vec3 p  = d*sc;',
    '    vec3 id = floor(p);',
    '    vec3 f  = fract(p) - 0.5;',
    '    float h = hash13(id + float(i)*13.7);',
    '    if(h > 0.955){',
    '      float b  = (h-0.955)/0.045;',
    '      float dd = length(f);',
    '      float tw = 0.75 + 0.25*sin(uTime*1.6 + h*90.0);',
    '      vec3 tint = mix(vec3(0.75,0.85,1.0), vec3(1.0,0.88,0.72), hash13(id+3.1));',
    '      col += tint * b * tw * (1.0 - smoothstep(0.0, 0.42, dd)) * 1.15;',
    '    }',
    '  }',
    '  float g = fbm(d*2.2 + 11.0);',
    '  col += vec3(0.045,0.062,0.125) * pow(g, 2.0) * 1.6;',
    '  return col;',
    '}',
    '',
    'void main(){',
    '  vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;',
    '',
    '  float t    = uTime * 0.045;',
    '  float az   = t + uMouse.x * 0.32;',
    // Dive stops at 8.5: the disk extends to r=9, so going closer would put
    // the camera inside its outer edge and fill the frame with foreground gas.
    // Stops at 8.5: the disk reaches r=9, so any closer puts the camera
    // inside its outer edge and the frame fills with foreground gas.
    '  float camR = mix(15.0, 8.5, uDive);',
    '  float camY = 1.85 + uMouse.y * 1.5 + sin(uTime*0.13)*0.35;',
    '  vec3 ro = vec3(sin(az)*camR, camY, cos(az)*camR);',
    '  vec3 fw = normalize(-ro);',
    '  vec3 rt = normalize(cross(vec3(0.0,1.0,0.0), fw));',
    '  vec3 up = cross(fw, rt);',
    '  vec3 rd = normalize(fw*1.55 + rt*uv.x + up*uv.y);',
    '',
    '  vec3 pos = ro, vel = rd;',
    '  float h2 = dot(cross(pos, vel), cross(pos, vel));   // conserved L^2',
    '  vec3 col = vec3(0.0);',
    '  float captured = 0.0;',
    '  float ringGlow = 0.0;',
    '',
    '  for(int i=0;i<220;i++){',
    '    if(float(i) >= uSteps) break;',
    '    float r = length(pos);',
    '    if(r < 1.0){ captured = 1.0; break; }',
    '    if(r > ESCAPE) break;',
    '',
    '    ringGlow += 0.012 / (1.0 + 26.0*pow(abs(r-1.5), 2.0));',
    '',
    '    float dt = clamp(0.022*r*r, 0.020, 0.55);',
    '    vec3 acc = -1.5 * h2 * pos / pow(r, 5.0);        // photon geodesic',
    '    vec3 prev = pos;',
    '    pos += vel*dt + 0.5*acc*dt*dt;',
    '    vel += acc*dt;',
    '',
    '    if(prev.y * pos.y < 0.0){                        // disk plane crossing',
    '      float f  = prev.y / (prev.y - pos.y);',
    '      vec3  hp = mix(prev, pos, f);',
    '      float rh = length(hp.xz);',
    '      if(rh > DISK_IN && rh < DISK_OUT){',
    '        float ang   = atan(hp.z, hp.x);',
    '        float omega = pow(rh, -1.5) * 3.2;           // Keplerian shear',
    '        float ph    = ang + uTime*omega;',
    '        vec3  np    = vec3(cos(ph), sin(ph), 0.0) * (rh*0.85) + vec3(0.0,0.0,rh*0.5);',
    '        float dens  = fbm(np*0.62 + vec3(0.0,0.0,uTime*0.05));',
    '        dens = pow(clamp(dens*1.55, 0.0, 1.0), 1.9);',
    '',
    '        float tn   = 1.0 - (rh - DISK_IN)/(DISK_OUT - DISK_IN);',
    '        float temp = pow(clamp(tn, 0.0, 1.0), 0.85);',
    '',
    '        vec3  vdir = normalize(cross(vec3(0.0,1.0,0.0), hp));',
    '        float beta = min(sqrt(0.5/rh), 0.62);',
    '        float dop  = 1.0 / max(1.0 - beta*dot(vdir, -normalize(vel)), 0.30);',
    '        float beam = clamp(pow(dop, 3.0), 0.20, 4.6);',
    '        float grav = sqrt(max(0.0, 1.0 - 1.0/rh));',
    '',
    '        float edge = smoothstep(0.0, 0.9, rh-DISK_IN) * smoothstep(0.0, 3.2, DISK_OUT-rh);',
    '        col += diskColor(temp) * dens * edge * beam * grav * 0.92;',
    '      }',
    '    }',
    '  }',
    '',
    '  if(captured < 0.5) col += starField(normalize(vel));',
    '  col += vec3(0.55,0.78,1.0) * ringGlow * 0.42;      // photon ring',
    '',
    '  col = vec3(1.0) - exp(-col*1.35);',
    '  col = pow(max(col, 0.0), vec3(0.4545));',
    '  col *= 1.0 - 0.28*length(uv)*length(uv);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function blackHoleFallback(cv) {
    var c = cv.getContext('2d');
    if (!c) return;
    var t = 0, vis = true;
    observe(cv, function (v) { vis = v; });
    (function loop() {
      requestAnimationFrame(loop);
      if (!vis || document.hidden) return;
      fitCanvas(cv, 0.75);
      var W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
      t += 0.008;
      c.fillStyle = BG; c.fillRect(0, 0, W, H);
      var R = Math.min(W, H) * 0.16;
      for (var i = 0; i < 240; i++) {
        var a = i * 2.399 + t * (1 + (i % 7) * 0.08);
        var rr = R * (1.9 + (i % 40) * 0.09);
        c.fillStyle = 'hsla(' + (26 + (i % 34)) + ',95%,' + (56 + (i % 22)) + '%,.55)';
        c.beginPath();
        c.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.22, 1.7, 0, 6.2832);
        c.fill();
      }
      c.fillStyle = '#000'; c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.fill();
      c.strokeStyle = 'rgba(140,200,255,.45)'; c.lineWidth = 2;
      c.beginPath(); c.arc(cx, cy, R * 1.5, 0, 6.2832); c.stroke();
    })();
  }

  function initBlackHole(cv) {
    var gl = null;
    try {
      gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' })
        || cv.getContext('experimental-webgl');
    } catch (e) { gl = null; }
    if (!gl) return blackHoleFallback(cv);

    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        if (window.console) console.warn('[physics.js] shader:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return blackHoleFallback(cv);

    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return blackHoleFallback(cv);
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, 'uRes');
    var uTime = gl.getUniformLocation(prog, 'uTime');
    var uMouse = gl.getUniformLocation(prog, 'uMouse');
    var uSteps = gl.getUniformLocation(prog, 'uSteps');
    var uDive = gl.getUniformLocation(prog, 'uDive');


    var small = window.innerWidth < 820;
    var scale = small ? 0.45 : 0.62;
    var steps = small ? 130 : 190;
    var mx = 0, my = 0, tx = 0, ty = 0;

    window.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    function size() {
      var d = dpr() * scale;
      var w = Math.max(1, Math.floor(cv.clientWidth * d));
      var h = Math.max(1, Math.floor(cv.clientHeight * d));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    }
    window.addEventListener('resize', size);
    size();

    var last = performance.now(), acc = 6, frames = 0, t0 = last;
    var vis = true, running = false, raf = 0;

    /* --- Scroll wrap -----------------------------------------------------
       Not pinned: the hero scrolls away normally while the camera falls
       inward and the copy is drawn down into the hole, so scrolling fast
       just skips the effect rather than being trapped by it.

       `dive` and `diveTarget` are declared HERE, with the rest of the
       state, before anything reads or writes them. Under 'use strict' an
       assignment to an undeclared name throws, and a throw in this
       function aborts boot() for every simulation on the page.
       -------------------------------------------------------------------- */

    var dive = 0, diveTarget = 0;
    var heroInner = null;
    if (cv.parentNode && cv.parentNode.querySelector)
      heroInner = cv.parentNode.querySelector('.inner');

    function readScroll() {
      var h = cv.clientHeight || window.innerHeight || 1;
      var y = window.pageYOffset || 0;
      diveTarget = Math.min(1, Math.max(0, y / (h * 0.85)));
    }
    window.addEventListener('scroll', readScroll, { passive: true });
    window.addEventListener('resize', readScroll);
    readScroll();

    function applyWrap() {
      var still = REDUCED || !Motion.enabled;
      var e = still ? 0 : dive;

      if (heroInner) {
        if (still) {
          heroInner.style.transform = '';
          heroInner.style.opacity = '';
        } else {
          // Drawn UP toward the hole, which sits above this copy, while it
          // shrinks and twists. The transform-origin in the stylesheet is
          // set above the block so the scale collapses in that direction
          // rather than into its own middle.
          heroInner.style.transform =
            'translate3d(0,' + (-e * 46).toFixed(1) + 'px,0) ' +
            'scale(' + (1 - e * 0.34).toFixed(3) + ') ' +
            'rotate(' + (e * 9).toFixed(2) + 'deg)';
          heroInner.style.opacity = Math.max(0, 1 - e * 1.7).toFixed(3);
        }
      }

      // Zooming the canvas on top of the camera dive sells the approach.
      // #banner clips overflow, so this cannot spill onto the page.
      cv.style.transform = still ? '' : 'scale(' + (1 + e * 0.16).toFixed(3) + ')';
    }

    function draw() {
      size();
      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uTime, acc);
      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uSteps, steps);
      gl.uniform1f(uDive, (REDUCED || !Motion.enabled) ? 0 : dive);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (!vis || document.hidden) { last = now; return; }
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      acc += dt;

      mx += (tx - mx) * 0.045; my += (ty - my) * 0.045;
      dive += (diveTarget - dive) * 0.12;
      applyWrap();
      draw();

      frames++;
      if (now - t0 > 1800) {
        var fps = frames * 1000 / (now - t0);
        if (fps < 26 && scale > 0.34) { scale *= 0.82; steps = Math.max(105, steps - 22); size(); }
        frames = 0; t0 = now;
      }
    }

    function apply() {
      if (vis && Motion.enabled) {
        if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      } else {
        running = false;
        cancelAnimationFrame(raf);
        // one still frame, with the wrap wound back to its resting state
        if (vis) { mx = tx; my = ty; dive = 0; applyWrap(); draw(); }
      }
    }

    observe(cv, function (v) { vis = v; apply(); });
    Motion.subscribe(apply);
    apply();
  }

  /* ======================================================================
     2. 2D simulations
     ====================================================================== */

  var SIMS = {};

  /* --- Lorenz attractor (Courses) --- */
  SIMS.lorenz = function (cv, ctx) {
    var bodies = [
      { x: 0.1, y: 0, z: 0, c: '#ffb35c' },
      { x: 0.1001, y: 0, z: 0, c: '#ff8a4c' },
      { x: 0.0999, y: 0, z: 0, c: '#ffe08a' }
    ];
    var s = 10, r = 28, b = 8 / 3, h = 0.0045;
    return {
      step: function (dt, W, H, speed) {
        ctx.fillStyle = 'rgba(5,7,14,0.055)'; ctx.fillRect(0, 0, W, H);
        var sc = Math.min(W, H) / 62, cx = W / 2, cy = H * 0.62;
        ctx.lineWidth = Math.max(1, W / 620);
        var n = Math.max(1, Math.round(9 * speed));
        for (var k = 0; k < bodies.length; k++) {
          var p = bodies[k];
          ctx.strokeStyle = p.c; ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.moveTo(cx + p.x * sc, cy - (p.z - 27) * sc);
          for (var i = 0; i < n; i++) {
            var dx = s * (p.y - p.x), dy = p.x * (r - p.z) - p.y, dz = p.x * p.y - b * p.z;
            p.x += dx * h; p.y += dy * h; p.z += dz * h;
            ctx.lineTo(cx + p.x * sc, cy - (p.z - 27) * sc);
          }
          ctx.stroke();
          ctx.globalAlpha = 1; ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(cx + p.x * sc, cy - (p.z - 27) * sc, Math.max(1, W / 340), 0, 6.2832); ctx.fill();
        }
      },
      reset: function (W, H) { ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); }
    };
  };

  /* --- Double pendulum ensemble (Experiences) ---
     Hamiltonian form, m1=m2=l1=l2=1, semi-implicit (symplectic) update
     so the ensemble does not gain energy and fly apart over time.      */
  SIMS.pendulum = function (cv, ctx) {
    var N = 16, P = [], g = 9.81, i;
    for (i = 0; i < N; i++) P.push({ a1: 2.2, a2: 2.2 + i * 1e-4, p1: 0, p2: 0, hue: 330 + i * 4.5 });

    function rates(s) {
      var c = Math.cos(s.a1 - s.a2);
      var den = 16 - 9 * c * c;
      return [6 * (2 * s.p1 - 3 * c * s.p2) / den, 6 * (8 * s.p2 - 3 * c * s.p1) / den];
    }
    function advance(s, h) {
      var d = rates(s);
      var si = Math.sin(s.a1 - s.a2);
      s.p1 += -0.5 * (d[0] * d[1] * si + 3 * g * Math.sin(s.a1)) * h;
      s.p2 += -0.5 * (-d[0] * d[1] * si + g * Math.sin(s.a2)) * h;
      d = rates(s);                       // recompute with updated momenta
      s.a1 += d[0] * h; s.a2 += d[1] * h;
    }

    return {
      step: function (dt, W, H, speed) {
        ctx.fillStyle = 'rgba(5,7,14,0.042)'; ctx.fillRect(0, 0, W, H);
        var cx = W / 2, cy = H * 0.33, sc = Math.min(W, H) * 0.21;
        var h = 0.0016, sub = Math.max(1, Math.round(14 * speed));
        for (var j = 0; j < P.length; j++) {
          var s = P[j];
          for (var k = 0; k < sub; k++) advance(s, h);
          var x1 = cx + Math.sin(s.a1) * sc, y1 = cy + Math.cos(s.a1) * sc;
          var px = x1 + Math.sin(s.a2) * sc, py = y1 + Math.cos(s.a2) * sc;
          if (s.lx !== undefined) {
            ctx.strokeStyle = 'hsla(' + s.hue + ',92%,72%,0.85)';
            ctx.lineWidth = Math.max(1, W / 700);
            ctx.beginPath(); ctx.moveTo(s.lx, s.ly); ctx.lineTo(px, py); ctx.stroke();
          }
          s.lx = px; s.ly = py;
          ctx.strokeStyle = 'hsla(' + s.hue + ',60%,72%,0.10)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x1, y1); ctx.lineTo(px, py); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.5, W / 300), 0, 6.2832); ctx.fill();
      },
      reset: function (W, H) {
        ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
        for (var j = 0; j < P.length; j++) {
          P[j].a1 = 2.2; P[j].a2 = 2.2 + j * 1e-4;
          P[j].p1 = P[j].p2 = 0; P[j].lx = undefined;
        }
      }
    };
  };

  /* --- Semiconductor band gap (Resources) --- */
  SIMS.bands = function (cv, ctx) {
    var carriers = [], holes = [], flashes = [], t = 0;
    return {
      step: function (dt, W, H, speed) {
        t += dt * speed;
        ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
        var pad = W * 0.10, cbY = H * 0.26, vbY = H * 0.72, bandH = H * 0.16;
        var T = 0.5 + 0.5 * Math.sin(t * 0.5);
        var i, gr;

        gr = ctx.createLinearGradient(0, cbY - bandH, 0, cbY);
        gr.addColorStop(0, 'rgba(111,227,176,0.02)'); gr.addColorStop(1, 'rgba(111,227,176,0.16)');
        ctx.fillStyle = gr; ctx.fillRect(pad, cbY - bandH, W - 2 * pad, bandH);
        gr = ctx.createLinearGradient(0, vbY, 0, vbY + bandH);
        gr.addColorStop(0, 'rgba(120,170,255,0.20)'); gr.addColorStop(1, 'rgba(120,170,255,0.02)');
        ctx.fillStyle = gr; ctx.fillRect(pad, vbY, W - 2 * pad, bandH);

        ctx.lineWidth = Math.max(1.2, W / 560);
        ctx.strokeStyle = 'rgba(111,227,176,0.85)';
        ctx.beginPath(); ctx.moveTo(pad, cbY); ctx.lineTo(W - pad, cbY); ctx.stroke();
        ctx.strokeStyle = 'rgba(130,180,255,0.85)';
        ctx.beginPath(); ctx.moveTo(pad, vbY); ctx.lineTo(W - pad, vbY); ctx.stroke();

        var ef = (cbY + vbY) / 2;
        ctx.setLineDash([6, 7]); ctx.strokeStyle = 'rgba(255,179,92,0.75)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad * 0.6, ef); ctx.lineTo(W - pad * 0.6, ef); ctx.stroke();
        ctx.setLineDash([]);

        // Fermi-Dirac occupancy
        ctx.strokeStyle = 'rgba(255,179,92,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (i = 0; i <= 40; i++) {
          var y = cbY - bandH + (vbY + 2 * bandH - cbY) * i / 40;
          var E = (ef - y) / (H * 0.2);
          var f = 1 / (1 + Math.exp(-E / (0.10 + 0.22 * T)));
          var x = W - pad - f * (W * 0.16);
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();

        if (Math.random() < 0.03 + 0.09 * T) {
          var sx = pad + Math.random() * (W - 2 * pad);
          carriers.push({ x: sx, y: vbY, vy: -(H * 0.30 + Math.random() * H * 0.12), vx: (Math.random() - 0.5) * W * 0.05, life: 0 });
          holes.push({ x: sx, y: vbY + 4 + Math.random() * bandH * 0.5, vx: (Math.random() - 0.5) * W * 0.06 });
        }

        for (i = carriers.length - 1; i >= 0; i--) {
          var p = carriers[i]; p.life += dt;
          p.vy += H * 0.19 * dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.y < cbY) { p.y = cbY; p.vy = 0; p.settled = true; }
          if (p.settled) { p.x += p.vx * dt * 2; p.y = cbY - 1.5 - Math.abs(Math.sin(t * 2 + i)) * 3; }
          if (p.x < pad || p.x > W - pad) p.vx *= -1;
          ctx.fillStyle = '#6fe3b0';
          ctx.shadowColor = '#6fe3b0'; ctx.shadowBlur = W / 90;
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.8, W / 210), 0, 6.2832); ctx.fill();
          ctx.shadowBlur = 0;
          if (p.settled && p.life > 3.2 + Math.random() * 2) {
            flashes.push({ x: p.x, y: p.y, r: 0 });
            carriers.splice(i, 1);
            if (holes.length) holes.splice(0, 1);
          }
        }
        for (i = 0; i < holes.length; i++) {
          var hh = holes[i];
          hh.x += hh.vx * dt;
          if (hh.x < pad || hh.x > W - pad) hh.vx *= -1;
          ctx.strokeStyle = 'rgba(130,180,255,.85)'; ctx.lineWidth = Math.max(1, W / 420);
          ctx.beginPath(); ctx.arc(hh.x, hh.y, Math.max(1.8, W / 230), 0, 6.2832); ctx.stroke();
        }
        for (i = flashes.length - 1; i >= 0; i--) {
          var fl = flashes[i]; fl.r += W * 0.5 * dt;
          ctx.strokeStyle = 'rgba(255,255,255,' + Math.max(0, 0.55 - fl.r / (W * 0.16)) + ')';
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(fl.x, fl.y, fl.r, 0, 6.2832); ctx.stroke();
          if (fl.r > W * 0.16) flashes.splice(i, 1);
        }
        if (carriers.length > 26) carriers.splice(0, carriers.length - 26);
        if (holes.length > 26) holes.splice(0, holes.length - 26);
      },
      reset: function () { carriers.length = 0; holes.length = 0; flashes.length = 0; }
    };
  };

  /* --- Double slit, photon by photon (FAQs) ---
     Crests are drawn as rings (no pixel aliasing); detections are
     rejection-sampled from |psi|^2 with the same wavenumber, so the
     picture and the histogram describe the same experiment.          */
  SIMS.slit = function (cv, ctx) {
    var NB = 200, hits = new Float32Array(NB), hitTotal = 0, t = 0;
    return {
      step: function (dt, W, H, speed) {
        t += dt * speed;
        ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);

        var barX = W * 0.30, screenX = W * 0.78;
        var sep = H * 0.28, s1 = H * 0.5 - sep / 2, s2 = H * 0.5 + sep / 2;
        var lam = W / 48, k = 2 * Math.PI / lam, w = 3.4;
        var phase = (t * w / k) % lam;
        var x, r, i;

        ctx.lineWidth = 1;
        for (x = phase - lam; x < barX; x += lam) {
          ctx.strokeStyle = 'rgba(127,231,255,0.16)';
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }

        var rmax = Math.sqrt((W - barX) * (W - barX) + H * H);
        ctx.save();
        ctx.beginPath(); ctx.rect(barX, 0, W - barX, H); ctx.clip();
        var slits = [s1, s2];
        for (i = 0; i < 2; i++) {
          for (r = phase; r < rmax; r += lam) {
            ctx.strokeStyle = 'rgba(127,231,255,' + (0.30 * (1 - r / rmax)) + ')';
            ctx.beginPath(); ctx.arc(barX, slits[i], r, -1.35, 1.35); ctx.stroke();
          }
        }
        ctx.restore();

        var bw = W * 0.012, ap = H * 0.035;
        ctx.fillStyle = '#0b1120';
        ctx.fillRect(barX - bw / 2, 0, bw, s1 - ap);
        ctx.fillRect(barX - bw / 2, s1 + ap, bw, s2 - s1 - 2 * ap);
        ctx.fillRect(barX - bw / 2, s2 + ap, bw, H - s2 - ap);
        ctx.strokeStyle = 'rgba(150,190,255,.30)';
        ctx.strokeRect(barX - bw / 2, 0, bw, H);

        var D = screenX - barX;
        var shots = Math.max(1, Math.round(4 * speed));
        for (var n = 0; n < shots; n++) {
          for (var tries = 0; tries < 16; tries++) {
            var y = Math.random() * H;
            var r1 = Math.sqrt(D * D + (y - s1) * (y - s1));
            var r2 = Math.sqrt(D * D + (y - s2) * (y - s2));
            var A = Math.cos(k * r1) / Math.sqrt(r1) + Math.cos(k * r2) / Math.sqrt(r2);
            var I = A * A * r1 * 0.55;
            if (Math.random() < Math.min(1, I)) {
              hits[Math.min(NB - 1, Math.floor(y / H * NB))] += 1;
              hitTotal++;
              break;
            }
          }
        }
        if (hitTotal > 6000) { for (i = 0; i < NB; i++) hits[i] *= 0.5; hitTotal *= 0.5; }

        ctx.strokeStyle = 'rgba(150,190,255,.30)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(screenX, 0); ctx.lineTo(screenX, H); ctx.stroke();
        var mx = 1;
        for (i = 0; i < NB; i++) if (hits[i] > mx) mx = hits[i];
        var barMax = W - screenX - W * 0.02;
        for (i = 0; i < NB; i++) {
          var v = hits[i] / mx;
          if (v <= 0) continue;
          ctx.fillStyle = 'rgba(127,231,255,' + (0.18 + 0.72 * v) + ')';
          ctx.fillRect(screenX + 2, i / NB * H, Math.max(1.2, v * barMax), H / NB + 0.7);
        }
      },
      reset: function () { hits = new Float32Array(NB); hitTotal = 0; }
    };
  };

  /* --- Chladni nodal figures (Kaleidoscope) --- */
  SIMS.chladni = function (cv, ctx) {
    var N = 1500, P = new Float32Array(N * 2);
    var n = 3, m = 5, hold = 0, i;
    for (i = 0; i < N; i++) { P[i * 2] = Math.random(); P[i * 2 + 1] = Math.random(); }
    function u(x, y) {
      return Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y)
           - Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);
    }
    return {
      step: function (dt, W, H, speed) {
        hold += dt * speed;
        if (hold > 6.5) {
          hold = 0;
          n = 2 + Math.floor(Math.random() * 6);
          m = 2 + Math.floor(Math.random() * 7);
          if (m === n) m += 1;
          for (i = 0; i < N; i++) { P[i * 2] = Math.random(); P[i * 2 + 1] = Math.random(); }
        }
        ctx.fillStyle = 'rgba(5,7,14,0.32)'; ctx.fillRect(0, 0, W, H);
        var S = Math.min(W, H) * 0.86, ox = (W - S) / 2, oy = (H - S) / 2;
        var amp = Math.min(1, hold / 0.8), e = 0.004;
        var dotR = Math.max(1, W / 330);
        for (i = 0; i < N; i++) {
          var x = P[i * 2], y = P[i * 2 + 1];
          var a = u(x, y);
          var gx = (Math.abs(u(x + e, y)) - Math.abs(u(x - e, y))) / (2 * e);
          var gy = (Math.abs(u(x, y + e)) - Math.abs(u(x, y - e))) / (2 * e);
          var gn = Math.sqrt(gx * gx + gy * gy) + 1e-6;
          var rate = 0.0042 * speed * Math.min(1, Math.abs(a) * 3);
          var jit = 0.0022 * Math.abs(a);
          x -= (gx / gn) * rate + (Math.random() - 0.5) * jit;
          y -= (gy / gn) * rate + (Math.random() - 0.5) * jit;
          x = Math.min(0.999, Math.max(0.001, x)); y = Math.min(0.999, Math.max(0.001, y));
          P[i * 2] = x; P[i * 2 + 1] = y;
          var bright = 1 - Math.min(1, Math.abs(a) * 2.2);
          ctx.fillStyle = 'rgba(' + Math.round(164 + 60 * bright) + ',' + Math.round(140 + 80 * bright) + ',240,'
            + (0.30 + 0.65 * bright * amp) + ')';
          ctx.fillRect(ox + x * S, oy + y * S, dotR, dotR);
        }
        ctx.strokeStyle = 'rgba(164,140,240,0.18)'; ctx.lineWidth = 1;
        ctx.strokeRect(ox, oy, S, S);
      },
      reset: function (W, H) { ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); }
    };
  };

  /* --- N-body cluster (Team) ---
     Dominant central mass plus weak mutual gravity, softened. GM is
     derived from canvas size so the orbital period is ~8 s at any
     resolution: GM = v^2 R0 with v = (2*pi/8) R0.                    */
  SIMS.nbody = function (cv, ctx) {
    var N = 48, B = [], init = false, GM = 0, R0 = 0, soft = 0;
    function seed(W, H) {
      B.length = 0;
      R0 = Math.min(W, H) * 0.30;
      GM = Math.pow(2 * Math.PI / 8, 2) * R0 * R0 * R0;
      soft = Math.min(W, H) * 0.06;
      for (var i = 0; i < N; i++) {
        var a = Math.random() * 6.2832;
        var r = R0 * (0.45 + 0.85 * Math.sqrt(Math.random()));
        var v = Math.sqrt(GM / r) * (0.94 + Math.random() * 0.10);
        B.push({
          x: W / 2 + Math.cos(a) * r, y: H / 2 + Math.sin(a) * r * 0.72,
          vx: -Math.sin(a) * v, vy: Math.cos(a) * v * 0.72,
          m: 0.6 + Math.random() * 1.4
        });
      }
      init = true;
    }
    return {
      step: function (dt, W, H, speed) {
        if (!init) seed(W, H);
        var h = Math.min(dt, 0.033) * speed;
        ctx.fillStyle = 'rgba(5,7,14,0.20)'; ctx.fillRect(0, 0, W, H);
        var cx = W / 2, cy = H / 2, link = W * 0.12, i, j;

        for (i = 0; i < N; i++) {
          var p = B[i];
          var dx = cx - p.x, dy = cy - p.y;
          var d2 = dx * dx + dy * dy + soft * soft;
          var inv = GM / (d2 * Math.sqrt(d2));
          var ax = dx * inv, ay = dy * inv;
          for (j = 0; j < N; j++) {
            if (j === i) continue;
            var q = B[j];
            var ex = q.x - p.x, ey = q.y - p.y;
            var e2 = ex * ex + ey * ey + soft * soft;
            var f = (GM * 0.004 * q.m) / (e2 * Math.sqrt(e2));
            ax += ex * f; ay += ey * f;
          }
          p.vx += ax * h; p.vy += ay * h;
        }

        ctx.lineWidth = Math.max(0.6, W / 900);
        for (i = 0; i < N; i++) for (j = i + 1; j < N; j++) {
          var a = B[i], b = B[j];
          var ddx = b.x - a.x, ddy = b.y - a.y;
          var d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < link) {
            ctx.strokeStyle = 'rgba(127,231,255,' + (0.20 * (1 - d / link)) + ')';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        for (i = 0; i < N; i++) {
          var o = B[i];
          o.x += o.vx * h; o.y += o.vy * h;
          if (o.x < -W * 0.3 || o.x > W * 1.3 || o.y < -H * 0.3 || o.y > H * 1.3) {
            var na = Math.random() * 6.2832, nr = R0 * (0.5 + 0.6 * Math.random());
            var nv = Math.sqrt(GM / nr);
            o.x = cx + Math.cos(na) * nr; o.y = cy + Math.sin(na) * nr * 0.72;
            o.vx = -Math.sin(na) * nv; o.vy = Math.cos(na) * nv * 0.72;
          }
          ctx.fillStyle = 'rgba(190,225,255,0.92)';
          ctx.shadowColor = '#7fe7ff'; ctx.shadowBlur = W / 110;
          ctx.beginPath(); ctx.arc(o.x, o.y, Math.max(1.2, o.m * W / 480), 0, 6.2832); ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.shadowColor = '#fff'; ctx.shadowBlur = W / 40;
        ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, W / 200), 0, 6.2832); ctx.fill();
        ctx.shadowBlur = 0;
      },
      reset: function (W, H) { ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); init = false; }
    };
  };

  /* ======================================================================
     3. Driver
     ====================================================================== */

  function observe(el, cb) {
    if (!window.IntersectionObserver) { cb(true); return; }
    new IntersectionObserver(function (entries) {
      cb(entries[0].isIntersecting);
    }, { threshold: 0.01 }).observe(el);
  }

  function initSim(cv) {
    var name = cv.getAttribute('data-sim');
    var make = SIMS[name];
    if (!make) return;
    var ctx = cv.getContext('2d');
    if (!ctx) return;
    var sim = make(cv, ctx);
    var running = false, raf = 0, last = 0, speed = 1, target = 1, vis = false;
    var host = (cv.closest && cv.closest('article')) || cv.parentNode || cv;

    host.addEventListener('pointerenter', function () { target = 0.28; });
    host.addEventListener('pointerleave', function () { target = 1; });

    function loop(now) {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (document.hidden) return;
      speed += (target - speed) * 0.08;
      if (fitCanvas(cv, 0.85) && sim.reset) sim.reset(cv.width, cv.height);
      sim.step(dt, cv.width, cv.height, speed);
    }

    // Several sims (Lorenz, Chladni, the slit histogram) only become
    // recognisable after they have run a while, so a "still" is a burst of
    // fixed-step frames rather than a single one.
    function renderStill() {
      fitCanvas(cv, 0.85);
      if (sim.reset) sim.reset(cv.width, cv.height);
      for (var i = 0; i < 260; i++) sim.step(1 / 60, cv.width, cv.height, 1);
    }

    function apply() {
      if (vis && Motion.enabled) {
        if (!running) {
          running = true;
          fitCanvas(cv, 0.85);
          if (sim.reset) sim.reset(cv.width, cv.height);
          last = performance.now();
          raf = requestAnimationFrame(loop);
        }
      } else {
        if (running) { running = false; cancelAnimationFrame(raf); }
        if (vis) renderStill();
      }
      if (host.classList && vis) host.classList.add('sim-live');
    }

    observe(cv, function (v) { vis = v; apply(); });
    Motion.subscribe(apply);
  }

  /* ----------------------------------------------------------------------
     The on-page control
     ---------------------------------------------------------------------- */

  function initControl(hasCanvas) {
    var wrap = document.getElementById('sim-toggle');
    if (!wrap || !hasCanvas) return;
    var btn = wrap.querySelector('button');
    var state = wrap.querySelector('.sim-toggle-state');
    if (!btn) return;

    wrap.hidden = false;

    function sync() {
      btn.setAttribute('aria-pressed', Motion.enabled ? 'true' : 'false');
      wrap.classList.toggle('is-off', !Motion.enabled);
      if (state) state.textContent = Motion.enabled ? 'on' : 'paused';
      btn.setAttribute('title', Motion.enabled
        ? 'Pause the background simulations'
        : 'Resume the background simulations');
    }

    btn.addEventListener('click', function () { Motion.set(!Motion.enabled); });
    Motion.subscribe(sync);
    sync();
  }

  /* ----------------------------------------------------------------------
     Downstream reveal — the other half of the wrap. As the hero is pulled
     into the hole, the sections below rise into place instead of simply
     being there. Driven by IntersectionObserver rather than scroll maths,
     so it cannot desync or get stuck part-way.
     ---------------------------------------------------------------------- */

  function initReveal() {
    // Only on pages that open with the black hole.
    if (!document.querySelector('canvas[data-blackhole]')) return;
    if (REDUCED || !window.IntersectionObserver) return;

    var main = document.getElementById('main');
    if (!main) return;

    // `:scope` is unsupported on some older engines and throws a SyntaxError
    // rather than returning nothing, so fall back to the children list.
    var targets;
    try { targets = main.querySelectorAll(':scope > section, :scope > div'); }
    catch (e) { targets = null; }
    if (!targets || !targets.length) targets = main.children;

    var obs = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('is-revealed');
          obs.unobserve(entries[i].target);
        }
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.04 });

    for (var i = 0; i < targets.length; i++) {
      targets[i].classList.add('will-reveal');
      obs.observe(targets[i]);
    }
  }

  // Each canvas is initialised independently. Without this, one throw in the
  // hero aborted boot() before any tile simulation had started, taking the
  // whole page's simulations down with it.
  function safely(fn, arg) {
    try { fn(arg); }
    catch (e) { if (window.console) console.error('[physics.js]', e); }
  }

  function boot() {
    var i;
    var holes = document.querySelectorAll('canvas[data-blackhole]');
    var sims = document.querySelectorAll('canvas[data-sim]');
    for (i = 0; i < holes.length; i++) safely(initBlackHole, holes[i]);
    for (i = 0; i < sims.length; i++) safely(initSim, sims[i]);
    safely(initControl, holes.length + sims.length > 0);
    safely(initReveal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.DAMPPhysics = { sims: SIMS };
})();
