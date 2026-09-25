/* Keos Technology · Hero "Cabinet of Curiosities"
   Scattered data curiosities (log lines, JSON fragments, event glyphs) drift in a
   cabinet, then snap into an ordered, glowing dashboard as the visitor scrolls. */
(function () {
  'use strict';

  var canvas = document.getElementById('hero-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var hero = document.getElementById('top');
  var copyEl = document.getElementById('hero-copy');
  var meterFill = document.getElementById('hero-meter-fill');
  var hint = document.getElementById('scroll-hint');

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reduceMQ.matches;

  var C = {
    amber: [255, 181, 71],
    coral: [255, 93, 115],
    teal: [45, 226, 192],
    lime: [200, 242, 90],
    paper: [243, 237, 226]
  };
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  var SNIPPETS = [
    '{"status":503}', 'src_ip=10.0.4.12', 'sourcetype=access_combined', 'ERROR timeout',
    'user=svc_batch', 'bytes=48213', 'WARN disk 91%', 'GET /api/v2/orders', 'sshd: Accepted',
    'eventtype=auth', 'latency_ms=842', '{"temp":71.4}', 'host=web-04', 'action=blocked',
    'dest_port=443', 'cpu=87', 'txn_id=9f2c', 'level=INFO', 'fw=3.2.1', 'status=200',
    'retries=3', 'region=us-west', '<Event/>', 'pod=cart-7d9', 'login failed', 'sensor=A17',
    'total=129.00', 'dns query', 'session_start', '{"iot":true}', 'EventCode=4625', 'queue=12',
    'POST /checkout', 'mem=72%', 'uid=1042', 'vpn_up', '{ }', '</>', '[ ]', '0x1F', '#', '::', '{"k":"v"}'
  ];

  var W = 0, H = 0, DPR = 1, isMobile = false;
  var particles = [];
  var panels = [];
  var drawers = [];
  var cab = { x: 0, y: 0, w: 1, h: 1 };
  var pTarget = 0, p = 0, time = 0, lastT = 0;
  var running = false, visible = true, raf = 0;
  var sprites = {};

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeSprite(c) {
    var s = document.createElement('canvas');
    var r = 32; s.width = s.height = r * 2;
    var g = s.getContext('2d');
    var grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, rgba(c, .9));
    grd.addColorStop(.18, rgba(c, .45));
    grd.addColorStop(1, rgba(c, 0));
    g.fillStyle = grd; g.fillRect(0, 0, r * 2, r * 2);
    return s;
  }

  /* ---------- Layout ---------- */
  function region() {
    if (!isMobile) {
      var right = W - Math.max(40, (W - 1240) / 2 + 40);
      var w = Math.min(W * 0.44, 640, right - W * 0.5);
      var x = right - w;
      var h = Math.min(H * 0.6, 470);
      return { x: x, y: (H - h) / 2 + 20, w: w, h: h };
    }
    var top = H * 0.56;
    if (copyEl) {
      var r = copyEl.getBoundingClientRect();
      var sr = canvas.getBoundingClientRect();
      top = r.bottom - sr.top + 24;
    }
    var bottom = H - 58;
    var avail = bottom - top;
    var hh = Math.max(130, Math.min(avail, W > 600 ? 460 : 340));
    if (avail > hh) top += (avail - hh) * 0.45;
    if (top + hh > H - 40) top = H - 40 - hh;
    var gx = Math.max(16, (W - 640) / 2);
    return { x: gx, y: top, w: W - gx * 2, h: hh };
  }

  function build() {
    var rg = region();
    var gap = isMobile ? 8 : 14;
    var topH = (rg.h - gap) * 0.58;
    var botH = rg.h - gap - topH;
    var halfW = (rg.w - gap) / 2;
    panels = [
      { x: rg.x, y: rg.y, w: rg.w, h: topH, label: 'events over time' },
      { x: rg.x, y: rg.y + topH + gap, w: halfW, h: botH, label: 'by source' },
      { x: rg.x + halfW + gap, y: rg.y + topH + gap, w: halfW, h: botH, label: 'normalized' }
    ];

    // Cabinet drawers (the chaotic "before" state)
    drawers = [];
    var cols = isMobile ? 3 : 4, rows = isMobile ? 2 : 4;
    var cx, cy, cw, ch;
    if (isMobile) { cx = rg.x; cy = rg.y - 6; cw = rg.w; ch = Math.min(H - 44, rg.y + rg.h + 6) - cy; }
    else { cx = rg.x - 30; cy = Math.max(84, rg.y - 70); cw = Math.min(W - cx - 24, rg.w + 60); ch = Math.min(H - 70, rg.y + rg.h + 60) - cy; }
    cab = { x: cx, y: cy, w: cw, h: ch };
    var dg = isMobile ? 8 : 10;
    var dw = (cw - dg * (cols - 1)) / cols, dh = (ch - dg * (rows - 1)) / rows;
    for (var i = 0; i < rows; i++) for (var j = 0; j < cols; j++) {
      drawers.push({ x: cx + j * (dw + dg), y: cy + i * (dh + dg), w: dw, h: dh });
    }

    var nLine = isMobile ? 15 : 34;
    var nBars = isMobile ? 9 : 14;
    var nRing = isMobile ? 10 : 16;
    var total = nLine * 2 + nBars + nRing;

    // Reuse chaos positions if particles exist (on resize)
    var old = particles;
    particles = [];
    for (var k = 0; k < total; k++) {
      var o = old[k];
      var kind, idx, col;
      if (k < nLine) { kind = 'lineA'; idx = k; col = C.teal; }
      else if (k < nLine * 2) { kind = 'lineB'; idx = k - nLine; col = C.amber; }
      else if (k < nLine * 2 + nBars) { kind = 'bar'; idx = k - nLine * 2; col = C.coral; }
      else { kind = 'ring'; idx = k - nLine * 2 - nBars; col = idx % 4 === 0 ? C.lime : C.teal; }
      var textColor = [C.paper, C.amber, C.coral, C.teal, C.paper][k % 5];
      particles.push({
        kind: kind, idx: idx, col: col, tcol: textColor,
        n: kind === 'lineA' || kind === 'lineB' ? nLine : kind === 'bar' ? nBars : nRing,
        x: rand(cab.x + 40, cab.x + cab.w - 40), y: rand(cab.y + 12, cab.y + cab.h - 12),
        vx: o ? o.vx : rand(-.35, .35), vy: o ? o.vy : rand(-.3, .3),
        rot: o ? o.rot : rand(-.5, .5), vr: o ? o.vr : rand(-.004, .004),
        text: o ? o.text : SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)],
        size: o ? o.size : (Math.random() < .25 ? rand(13, 16) : rand(10, 12.5)),
        alpha: o ? o.alpha : rand(.3, .72),
        glyph: k % 5 === 1 || k % 5 === 3 ? ['ring', 'diamond', 'square', 'dot'][k % 4] : null,
        gs: rand(3, 6),
        delay: o ? o.delay : rand(0, .28),
        cx: 0, cy: 0
      });
    }
  }

  function seriesA(i, n, t) { var u = i / (n - 1); return .52 + .17 * Math.sin(u * 7.2 + t * .7) + .09 * Math.sin(u * 17 + 1.3 + t * .35) + .1 * u; }
  function seriesB(i, n, t) { var u = i / (n - 1); return .28 + .1 * Math.sin(u * 5 + 2 + t * .5) + .06 * Math.cos(u * 13 + t * .4); }
  function barVal(i, n, t) { return .35 + .5 * Math.abs(Math.sin(i * 1.7 + 0.6 + t * .25)) * (0.6 + 0.4 * Math.sin(i * .5)); }

  function target(pt, t) {
    var P, pad = isMobile ? 12 : 18, labelH = isMobile ? 18 : 24;
    if (pt.kind === 'lineA' || pt.kind === 'lineB') {
      P = panels[0];
      var ix = P.x + pad + (pt.idx / (pt.n - 1)) * (P.w - pad * 2);
      var v = pt.kind === 'lineA' ? seriesA(pt.idx, pt.n, t) : seriesB(pt.idx, pt.n, t);
      var top = P.y + labelH + pad * .5, bot = P.y + P.h - pad;
      return { x: ix, y: bot - v * (bot - top), base: bot };
    }
    if (pt.kind === 'bar') {
      P = panels[1];
      var bw = (P.w - pad * 2) / pt.n;
      var bx = P.x + pad + bw * (pt.idx + .5);
      var btop = P.y + labelH + pad * .4, bbot = P.y + P.h - pad * .8;
      return { x: bx, y: bbot - barVal(pt.idx, pt.n, t) * (bbot - btop), base: bbot, bw: bw };
    }
    P = panels[2];
    var ccx = P.x + P.w / 2, ccy = P.y + labelH / 2 + P.h / 2;
    var rr = Math.max(14, Math.min(P.w, P.h - labelH) * 0.36);
    var a = -Math.PI / 2 + (pt.idx / pt.n) * Math.PI * 2 + t * 0.12;
    return { x: ccx + Math.cos(a) * rr, y: ccy + Math.sin(a) * rr, ccx: ccx, ccy: ccy, r: rr, a: a };
  }

  /* ---------- Draw ---------- */
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function draw(dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var chaosA = 1 - smooth(0, .45, p);
    var orderA = smooth(.35, .85, p);

    // Cabinet drawers
    if (chaosA > 0.01) {
      ctx.lineWidth = 1;
      for (var d = 0; d < drawers.length; d++) {
        var dr = drawers[d];
        ctx.strokeStyle = rgba(C.paper, .07 * chaosA);
        roundRect(dr.x, dr.y, dr.w, dr.h, 10); ctx.stroke();
        ctx.fillStyle = rgba(C.amber, .22 * chaosA);
        ctx.beginPath(); ctx.arc(dr.x + dr.w / 2, dr.y + 16, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = rgba(C.paper, .06 * chaosA);
        ctx.strokeRect(dr.x + dr.w / 2 - 22, dr.y + 26, 44, 12);
      }
    }

    // Panels
    if (orderA > 0.01) {
      for (var q = 0; q < panels.length; q++) {
        var P = panels[q];
        ctx.fillStyle = 'rgba(16,19,26,' + (.72 * orderA) + ')';
        roundRect(P.x, P.y, P.w, P.h, 14); ctx.fill();
        ctx.strokeStyle = rgba(C.paper, .12 * orderA); ctx.lineWidth = 1; ctx.stroke();
        ctx.font = '500 ' + (isMobile ? 9.5 : 11) + 'px "JetBrains Mono", monospace';
        ctx.fillStyle = rgba(C.paper, .5 * orderA);
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(P.label.toUpperCase(), P.x + (isMobile ? 12 : 18), P.y + (isMobile ? 9 : 13));
        // live dot
        ctx.fillStyle = rgba(C.teal, (0.5 + 0.5 * Math.sin(time * 3)) * orderA);
        ctx.beginPath(); ctx.arc(P.x + P.w - (isMobile ? 14 : 20), P.y + (isMobile ? 14 : 19), 3, 0, Math.PI * 2); ctx.fill();
        // grid lines
        if (q === 0) {
          ctx.strokeStyle = rgba(C.paper, .05 * orderA);
          for (var g = 1; g < 4; g++) {
            var gy = P.y + 24 + (P.h - 30) * g / 4;
            ctx.beginPath(); ctx.moveTo(P.x + 14, gy); ctx.lineTo(P.x + P.w - 14, gy); ctx.stroke();
          }
        }
      }
    }

    // Update particle positions
    var liveT = time;
    for (var i = 0; i < particles.length; i++) {
      var pt = particles[i];
      if (!reduced) {
        pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.rot += pt.vr * dt;
        var mxw = Math.min(pt.glyph ? 8 : (pt.hw || 40), cab.w / 2 - 4);
        if (pt.x < cab.x + mxw) { pt.x = cab.x + mxw; pt.vx = Math.abs(pt.vx); }
        else if (pt.x > cab.x + cab.w - mxw) { pt.x = cab.x + cab.w - mxw; pt.vx = -Math.abs(pt.vx); }
        if (pt.y < cab.y + 10) { pt.y = cab.y + 10; pt.vy = Math.abs(pt.vy); }
        else if (pt.y > cab.y + cab.h - 10) { pt.y = cab.y + cab.h - 10; pt.vy = -Math.abs(pt.vy); }
      }
      var tg = target(pt, liveT);
      pt.tg = tg;
      var e = ease(clamp((p - pt.delay) / .6, 0, 1));
      pt.e = e;
      pt.cx = lerp(pt.x, tg.x, e);
      pt.cy = lerp(pt.y, tg.y, e);
    }

    ctx.globalCompositeOperation = 'lighter';

    // Area + lines for series
    drawSeries('lineA', C.teal, true);
    drawSeries('lineB', C.amber, false);

    // Bars
    for (i = 0; i < particles.length; i++) {
      pt = particles[i];
      if (pt.kind !== 'bar') continue;
      var ba = smooth(.75, 1, pt.e);
      if (ba <= 0) continue;
      var bw = pt.tg.bw * .56;
      var grd = ctx.createLinearGradient(0, pt.cy, 0, pt.tg.base);
      grd.addColorStop(0, rgba(C.coral, .85 * ba));
      grd.addColorStop(1, rgba(C.coral, .08 * ba));
      ctx.fillStyle = grd;
      ctx.fillRect(pt.cx - bw / 2, pt.cy, bw, Math.max(0, pt.tg.base - pt.cy));
    }

    // Ring segments
    var ring = particles.filter(function (x) { return x.kind === 'ring'; });
    if (ring.length) {
      var ra = smooth(.8, 1, Math.min.apply(null, ring.map(function (x) { return x.e; })));
      if (ra > 0) {
        var r0 = ring[0].tg;
        ctx.lineWidth = isMobile ? 5 : 7; ctx.lineCap = 'butt';
        for (var s = 0; s < ring.length; s++) {
          var a0 = ring[s].tg.a + 0.06, a1 = a0 + (Math.PI * 2 / ring.length) - 0.12;
          ctx.strokeStyle = rgba(s < ring.length * 0.7 ? C.teal : (s < ring.length * 0.9 ? C.amber : C.coral), .55 * ra);
          ctx.beginPath(); ctx.arc(r0.ccx, r0.ccy, r0.r, a0, a1); ctx.stroke();
        }
        ctx.lineWidth = 1;
      }
    }

    // Particles: text (chaos) and glowing dots (order)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (i = 0; i < particles.length; i++) {
      pt = particles[i];
      var ta = (1 - smooth(0, .55, pt.e)) * pt.alpha;
      if (ta > 0.01 && pt.glyph) {
        ctx.save();
        ctx.translate(pt.cx, pt.cy);
        ctx.rotate(pt.rot * (1 - pt.e) * 2);
        ctx.strokeStyle = ctx.fillStyle = rgba(pt.tcol, ta);
        ctx.lineWidth = 1.3;
        var gsz = pt.gs;
        if (pt.glyph === 'ring') { ctx.beginPath(); ctx.arc(0, 0, gsz, 0, Math.PI * 2); ctx.stroke(); }
        else if (pt.glyph === 'diamond') { ctx.beginPath(); ctx.moveTo(0, -gsz); ctx.lineTo(gsz, 0); ctx.lineTo(0, gsz); ctx.lineTo(-gsz, 0); ctx.closePath(); ctx.stroke(); }
        else if (pt.glyph === 'square') { ctx.strokeRect(-gsz * .8, -gsz * .8, gsz * 1.6, gsz * 1.6); }
        else { ctx.beginPath(); ctx.arc(0, 0, gsz * .5, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      } else if (ta > 0.01) {
        ctx.save();
        ctx.translate(pt.cx, pt.cy);
        ctx.rotate(pt.rot * (1 - pt.e));
        ctx.font = '500 ' + (isMobile ? pt.size * .82 : pt.size) + 'px "JetBrains Mono", monospace';
        ctx.fillStyle = rgba(pt.tcol, ta);
        if (!pt.hw) pt.hw = ctx.measureText(pt.text).width / 2 * Math.abs(Math.cos(pt.rot)) + 6;
        ctx.fillText(pt.text, 0, 0);
        ctx.restore();
      }
      var da = smooth(.25, .85, pt.e);
      if (da > 0.01) {
        var spr = sprites[pt.kind === 'lineB' ? 'amber' : pt.kind === 'bar' ? 'coral' : 'teal'];
        var sz = (pt.kind === 'bar' ? 16 : 20) * (isMobile ? .8 : 1);
        ctx.globalAlpha = da;
        ctx.drawImage(spr, pt.cx - sz / 2, pt.cy - sz / 2, sz, sz);
        ctx.globalAlpha = 1;
        ctx.fillStyle = rgba(C.paper, .9 * da);
        ctx.beginPath(); ctx.arc(pt.cx, pt.cy, isMobile ? 1.4 : 1.8, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Sweep cursor across top panel
    if (p > .92 && panels[0]) {
      var sa = smooth(.92, 1, p);
      var P0 = panels[0];
      var sx = P0.x + 18 + ((time * 0.12) % 1) * (P0.w - 36);
      var sg = ctx.createLinearGradient(sx - 60, 0, sx, 0);
      sg.addColorStop(0, rgba(C.teal, 0)); sg.addColorStop(1, rgba(C.teal, .14 * sa));
      ctx.fillStyle = sg;
      ctx.fillRect(sx - 60, P0.y + 28, 60, P0.h - 40);
      ctx.strokeStyle = rgba(C.teal, .5 * sa);
      ctx.beginPath(); ctx.moveTo(sx, P0.y + 28); ctx.lineTo(sx, P0.y + P0.h - 12); ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  function drawSeries(kind, col, fill) {
    var pts = particles.filter(function (x) { return x.kind === kind; });
    if (pts.length < 2) return;
    var minE = 1; for (var i = 0; i < pts.length; i++) minE = Math.min(minE, pts[i].e);
    var threadA = 0.05 + 0.1 * smooth(0, .5, p);
    var lineA = smooth(.6, 1, minE);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // Tangled threads while chaotic, clean line once ordered
    ctx.beginPath();
    ctx.moveTo(pts[0].cx, pts[0].cy);
    for (i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i];
      var mx = (a.cx + b.cx) / 2, my = (a.cy + b.cy) / 2;
      ctx.quadraticCurveTo(a.cx, a.cy, mx, my);
    }
    ctx.lineTo(pts[pts.length - 1].cx, pts[pts.length - 1].cy);
    ctx.strokeStyle = rgba(col, threadA + .75 * lineA);
    ctx.lineWidth = 1 + 1.4 * lineA;
    ctx.stroke();

    if (fill && lineA > 0.01) {
      var base = pts[0].tg.base;
      ctx.lineTo(pts[pts.length - 1].cx, base);
      ctx.lineTo(pts[0].cx, base);
      ctx.closePath();
      var top = Math.min.apply(null, pts.map(function (x) { return x.cy; }));
      var grd = ctx.createLinearGradient(0, top, 0, base);
      grd.addColorStop(0, rgba(col, .28 * lineA));
      grd.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = grd;
      ctx.fill();
    }
    ctx.lineWidth = 1;
  }

  /* ---------- Scroll / loop ---------- */
  function readScroll() {
    if (!hero.classList.contains('is-scrolly')) { pTarget = reduced ? 1 : 0; return; }
    var r = hero.getBoundingClientRect();
    var travel = r.height - window.innerHeight;
    pTarget = travel > 0 ? clamp((-r.top) / (travel * 0.8), 0, 1) : 1;
  }

  function updateUI() {
    if (meterFill) meterFill.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    hero.classList.toggle('is-ordered', p > .7);
    if (hint) hint.classList.toggle('is-hidden', p > .04);
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    var dtMs = lastT ? Math.min(50, now - lastT) : 16;
    lastT = now;
    var dt = dtMs / 16.67;
    time += dtMs / 1000;
    readScroll();
    p += (pTarget - p) * Math.min(1, 0.12 * dt);
    if (Math.abs(pTarget - p) < 0.0005) p = pTarget;
    draw(dt);
    updateUI();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduced) return;
    running = true; lastT = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  function renderStatic() {
    p = 1; pTarget = 1; time = 2.2;
    draw(0);
    updateUI();
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    isMobile = W < 900;
    build();
    if (reduced) renderStatic(); else draw(0);
  }

  function setMode() {
    reduced = reduceMQ.matches;
    if (reduced) { hero.classList.remove('is-scrolly'); stop(); resize(); renderStatic(); }
    else { hero.classList.add('is-scrolly'); resize(); if (visible) start(); }
  }

  function init() {
    sprites.teal = makeSprite(C.teal);
    sprites.amber = makeSprite(C.amber);
    sprites.coral = makeSprite(C.coral);
    setMode();

    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 120); });
    if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', setMode);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !reduced) start(); else stop();
      }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (visible && !reduced) start();
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (reduced) renderStatic(); });
  }

  init();
})();
