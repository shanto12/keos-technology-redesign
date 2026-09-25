/* Keos Technology — Design B interactions. No dependencies. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------- Nav ---------------- */
  var nav = $('#nav');
  var toggle = $('#navtoggle');
  var links = $('#navlinks');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
    toggle.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Open menu';
  }
  toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
  $$('a', links).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });

  function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Scrollspy */
  var spyLinks = $$('[data-spy]');
  var sections = spyLinks.map(function (a) { return document.getElementById(a.getAttribute('data-spy')); });
  function spy() {
    var y = window.scrollY + window.innerHeight * 0.35;
    var current = 'top';
    sections.forEach(function (s) { if (s && s.offsetTop <= y) current = s.id; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = 'contact';
    spyLinks.forEach(function (a) {
      var on = a.getAttribute('data-spy') === current;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }
  spy();
  window.addEventListener('scroll', spy, { passive: true });
  window.addEventListener('resize', spy);

  /* ---------------- Reveal ---------------- */
  var reveals = $$('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Ticker (duplicate for seamless loop) ---------------- */
  var ticker = $('.ticker');
  if (ticker && !reduce) ticker.innerHTML += ticker.innerHTML;

  /* ---------------- Hero event stream (illustrative sample data) ---------------- */
  // All values are generic samples: RFC 5737 documentation IPs, private ranges, example.* domains.
  var TEMPLATES = [
    { raw: 'sshd[2211]: Failed password for invalid user admin from 203.0.113.24 port 52144 ssh2',
      st: 'linux_secure', f: [['action', 'failure'], ['user', 'admin'], ['src', '203.0.113.24']], tag: 'authentication', sev: 'med', auth: true },
    { raw: 'EventCode=4625 LogonType=3 Account=svc_backup SourceAddress=203.0.113.24 Status=0xC000006D',
      st: 'wineventlog', f: [['action', 'failure'], ['user', 'svc_backup'], ['src', '203.0.113.24']], tag: 'authentication', sev: 'med', auth: true },
    { raw: 'CEF:0|Vendor|Firewall|1.0|100|deny|5|src=198.51.100.7 dst=10.0.2.15 dpt=445 proto=TCP',
      st: 'firewall', f: [['action', 'blocked'], ['src', '198.51.100.7'], ['dest_port', '445']], tag: 'network', sev: 'low' },
    { raw: '10.0.4.12 - - "GET /api/v1/orders?page=2 HTTP/1.1" 200 1843 182ms',
      st: 'access_combined', f: [['status', '200'], ['uri', '/api/v1/orders'], ['duration', '182ms']], tag: 'web', sev: 'info' },
    { raw: 'host=wks-114 proc=powershell.exe parent=winword.exe cmdline="-nop -w hidden -enc JAB..."',
      st: 'endpoint', f: [['process', 'powershell.exe'], ['parent', 'winword.exe'], ['dest', 'wks-114']], tag: 'process', sev: 'high' },
    { raw: 'query=update-check.example.net type=A rcode=NOERROR src=10.0.3.41 ttl=300',
      st: 'dns', f: [['query', 'update-check.example.net'], ['src', '10.0.3.41']], tag: 'network_resolution', sev: 'info' },
    { raw: 'eventName=GetObject bucket=sample-archive user=etl-role bytes=4294967 region=us-east-1',
      st: 'cloud_audit', f: [['action', 'read'], ['user', 'etl-role'], ['object', 'sample-archive']], tag: 'change', sev: 'low' },
    { raw: 'vpn: user=j.doe@example.com auth=success geo=unfamiliar src=192.0.2.88 mfa=push',
      st: 'vpn', f: [['action', 'success'], ['user', 'j.doe'], ['src', '192.0.2.88']], tag: 'authentication', sev: 'low' },
    { raw: 'app=billing-svc level=ERROR msg="upstream timeout" latency_ms=5021 node=app-03',
      st: 'app_json', f: [['severity', 'error'], ['app', 'billing-svc'], ['dest', 'app-03']], tag: 'performance', sev: 'med' }
  ];
  var SEV_LABEL = { info: 'info', low: 'low', med: 'med', high: 'high', crit: 'crit' };

  var stream = $('#stream');
  if (reduce) { var lv = $('.console__live'); if (lv) lv.lastChild.textContent = 'SAMPLE'; }
  var counters = { ingest: $('#c-ingest'), parse: $('#c-parse'), norm: $('#c-norm'), corr: $('#c-corr'), act: $('#c-act') };
  var counts = { ingest: 18240, parse: 18236, norm: 18231, corr: 412, act: 7 };
  var stages = {}; $$('.stage').forEach(function (s) { stages[s.getAttribute('data-stage')] = s; });
  var fmt = function (n) { return n.toLocaleString('en-US'); };
  var clock = new Date(Date.UTC(2026, 0, 1, 9, 41, 7));

  function renderCounts() {
    counters.ingest.textContent = fmt(counts.ingest);
    counters.parse.textContent = fmt(counts.parse);
    counters.norm.textContent = fmt(counts.norm);
    counters.corr.textContent = fmt(counts.corr);
    counters.act.textContent = fmt(counts.act);
  }
  function flash(name) {
    var s = stages[name]; if (!s || reduce) return;
    s.classList.add('is-hot');
    setTimeout(function () { s.classList.remove('is-hot'); }, 520);
  }
  function tstamp() {
    clock = new Date(clock.getTime() + 400 + Math.floor(Math.random() * 1400));
    return clock.toISOString().substr(11, 8);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function buildRow(t, parsedNow) {
    var row = el('div', 'ev');
    row.appendChild(el('span', 'ev__t', tstamp()));
    var sev = el('span', 'ev__sev', '···');
    row.appendChild(sev);
    var body = el('div', 'ev__body');
    body.appendChild(el('span', 'ev__raw', t.raw));
    var f = el('div', 'ev__f');
    f.appendChild(el('span', 'chip chip--st', t.st));
    t.f.forEach(function (kv) {
      var c = el('span', 'chip'); var b = el('b', null, kv[0] + '=');
      c.appendChild(b); c.appendChild(document.createTextNode(kv[1])); f.appendChild(c);
    });
    f.appendChild(el('span', 'chip chip--tag', 'tag::' + t.tag));
    body.appendChild(f);
    row.appendChild(body);
    row._t = t; row._sev = sev;
    if (parsedNow) parse(row);
    return row;
  }
  function parse(row) {
    row.classList.add('is-parsed');
    row._sev.textContent = SEV_LABEL[row._t.sev];
    row._sev.className = 'ev__sev sev-' + row._t.sev;
  }
  function buildNotable() {
    var row = el('div', 'ev ev--notable');
    row.appendChild(el('span', 'ev__t', tstamp()));
    row.appendChild(el('span', 'ev__sev sev-crit', 'crit'));
    var body = el('div', 'ev__body');
    body.appendChild(el('span', 'ev__raw', 'NOTABLE ▸ Excessive failed logins from one source'));
    var f = el('div', 'ev__f');
    [['src', '203.0.113.24'], ['sources', '2'], ['span', '60s']].forEach(function (kv) {
      var c = el('span', 'chip'); c.appendChild(el('b', null, kv[0] + '=')); c.appendChild(document.createTextNode(kv[1])); f.appendChild(c);
    });
    f.appendChild(el('span', 'chip chip--st', 'urgency=high'));
    body.appendChild(f);
    row.appendChild(body);
    row.classList.add('is-parsed');
    return row;
  }

  var MAX_ROWS = 7;
  function push(row) {
    stream.insertBefore(row, stream.firstChild);
    while (stream.children.length > MAX_ROWS) stream.removeChild(stream.lastChild);
  }

  // Sequence: cycles through templates, auth events accumulate toward a correlation.
  var order = [0, 3, 2, 5, 1, 6, 0, 8, 4, 3, 1, 7, 5, 2, 0, 6, 1, 3, 8, 4];
  var idx = 0, authHits = 0;

  function step() {
    var t = TEMPLATES[order[idx % order.length]]; idx++;
    var row = buildRow(t, false);
    push(row);
    counts.ingest += 3 + Math.floor(Math.random() * 9); flash('ingest');
    setTimeout(function () {
      row.classList.add('is-scan');
    }, 180);
    setTimeout(function () {
      parse(row);
      counts.parse = counts.ingest - 2; counts.norm = counts.ingest - 5;
      flash('parse'); setTimeout(function () { flash('normalize'); }, 160);
      renderCounts();
      if (t.auth) {
        authHits++;
        row.classList.add('is-linked');
        counts.corr++; flash('correlate');
        if (authHits >= 3) {
          authHits = 0;
          setTimeout(function () {
            push(buildNotable());
            counts.act++; flash('act'); renderCounts();
            bumpTimeline(true);
          }, 700);
        }
      }
    }, 720);
    renderCounts();
  }

  // Seed with parsed rows so the panel is never empty.
  function seed() {
    var seedOrder = [6, 2, 3, 5, 1, 0].reverse();
    // Put a notable in the seeded view for the static state.
    seedOrder.forEach(function (i, k) {
      var r = buildRow(TEMPLATES[i], true);
      if (TEMPLATES[i].auth) r.classList.add('is-linked');
      push(r);
      if (k === 1) push(buildNotable());
    });
    renderCounts();
  }

  /* ---------------- Mini dashboard ---------------- */
  var sparkN = 40, spark = [];
  for (var i = 0; i < sparkN; i++) spark.push(55 + Math.sin(i / 3) * 12 + Math.random() * 14);
  var sparkLine = $('#sparkLine'), sparkArea = $('#sparkArea'), epsEl = $('#eps');
  function drawSpark() {
    var max = 100, w = 200, h = 48, d = '';
    spark.forEach(function (v, k) {
      var x = (k / (sparkN - 1)) * w, y = h - (v / max) * h;
      d += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    });
    sparkLine.setAttribute('d', d);
    sparkArea.setAttribute('d', d + 'L' + w + ' ' + h + 'L0 ' + h + 'Z');
    epsEl.textContent = fmt(Math.round(spark[sparkN - 1] * 142));
  }
  function tickSpark() {
    var last = spark[sparkN - 1];
    var next = Math.max(22, Math.min(92, last + (Math.random() - 0.48) * 16));
    spark.shift(); spark.push(next); drawSpark();
  }

  var tl = $('#timeline'), detEl = $('#det'), TL_N = 28, tlData = [];
  for (var j = 0; j < TL_N; j++) tlData.push(Math.random());
  var detCount = 38;
  function drawTimeline() {
    tl.innerHTML = '';
    tlData.forEach(function (v) {
      var s = document.createElement('span');
      s.style.setProperty('--h', Math.round(12 + v * 88) + '%');
      if (v > 0.86) s.className = 'hi'; else if (v > 0.66) s.className = 'md'; else if (v > 0.4) s.className = 'lo';
      tl.appendChild(s);
    });
    detEl.textContent = detCount;
  }
  function bumpTimeline(big) {
    tlData.shift(); tlData.push(big ? 0.9 + Math.random() * 0.1 : Math.random() * 0.8);
    if (big) detCount++;
    drawTimeline();
  }

  var sevFills = $$('#sevbars .fill');
  function jiggleSev() {
    sevFills.forEach(function (f, k) {
      var base = [18, 42, 66, 84][k];
      f.style.setProperty('--w', Math.max(6, Math.min(96, base + (Math.random() - 0.5) * 14)) + '%');
    });
  }

  if (stream) {
    seed(); drawSpark(); drawTimeline();
    if (!reduce) {
      var timers = [];
      var running = false;
      var start = function () {
        if (running) return; running = true;
        timers.push(setInterval(step, 1500));
        timers.push(setInterval(tickSpark, 700));
        timers.push(setInterval(function () { bumpTimeline(false); }, 2200));
        timers.push(setInterval(jiggleSev, 2600));
      };
      var stop = function () { running = false; timers.forEach(clearInterval); timers = []; };
      var heroVisible = true;
      var sync = function () { (heroVisible && !document.hidden) ? start() : stop(); };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; sync(); }).observe($('.console'));
      }
      document.addEventListener('visibilitychange', sync);
      setTimeout(sync, 600);
    }
  }

  /* ---------------- Background network canvas ---------------- */
  var cv = $('#net');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d'), nodes = [], W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), raf = null, netVisible = true;
    var resize = function () {
      var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(70, Math.max(24, (W * H) / 26000)));
      nodes = [];
      for (var k = 0; k < n; k++) nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18, a: Math.random() < 0.08 });
      draw();
    };
    var draw = function () {
      ctx.clearRect(0, 0, W, H);
      var LINK = 140;
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.strokeStyle = 'rgba(120,150,200,' + (0.16 * (1 - d / LINK)).toFixed(3) + ')';
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke();
          }
        }
      }
      nodes.forEach(function (p) {
        ctx.fillStyle = p.a ? 'rgba(245,165,36,.75)' : 'rgba(139,230,244,.45)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.a ? 2.2 : 1.4, 0, Math.PI * 2); ctx.fill();
      });
    };
    var loop = function () {
      nodes.forEach(function (p) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
      });
      draw(); raf = requestAnimationFrame(loop);
    };
    resize();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
    if (!reduce) {
      var netSync = function () {
        if (netVisible && !document.hidden) { if (!raf) raf = requestAnimationFrame(loop); }
        else if (raf) { cancelAnimationFrame(raf); raf = null; }
      };
      if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { netVisible = e[0].isIntersecting; netSync(); }).observe(cv);
      document.addEventListener('visibilitychange', netSync);
      netSync();
    }
  }

  /* ---------------- Contact form (Netlify Forms via fetch, mailto fallback) ---------------- */
  var form = $('#contact-form');
  if (form) {
    var status = $('#f-status'), btn = $('#f-submit');
    var MAILTO = 'mailto:info@keostech.com?subject=' + encodeURIComponent('Keos Technology - Splunk consulting services');

    var clearErr = function (field) {
      field.classList.remove('is-invalid');
      var e = field.querySelector('.field__err'); if (e) e.remove();
      var input = field.querySelector('input, textarea'); input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby');
    };
    var setErr = function (field, msg) {
      clearErr(field);
      var input = field.querySelector('input, textarea');
      var id = input.id + '-err';
      var e = el('span', 'field__err', msg); e.id = id;
      field.appendChild(e); field.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', id);
    };
    $$('.field', form).forEach(function (f) {
      f.querySelector('input, textarea').addEventListener('input', function () { clearErr(f); });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      status.className = 'form__status'; status.textContent = '';
      var name = $('#f-name'), email = $('#f-email'), msg = $('#f-msg'), bad = null;
      if (!name.value.trim()) { setErr(name.parentNode, 'Please enter your name.'); bad = bad || name; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { setErr(email.parentNode, 'Please enter a valid email address.'); bad = bad || email; }
      if (!msg.value.trim()) { setErr(msg.parentNode, 'Please enter a message.'); bad = bad || msg; }
      if (bad) { bad.focus(); return; }

      var body = new URLSearchParams(new FormData(form)).toString();
      btn.disabled = true; btn.firstChild.textContent = 'Sending… ';
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r; })
        .then(function () {
          form.reset();
          status.className = 'form__status is-ok';
          status.textContent = "Thanks for sending the message! We'll be in touch with you soon.";
        })
        .catch(function () {
          var m = MAILTO + '&body=' + encodeURIComponent('Name: ' + name.value + '\nEmail: ' + email.value + '\n\n' + msg.value);
          status.className = 'form__status is-err';
          status.innerHTML = '';
          status.appendChild(document.createTextNode('Unable to send message. An error occurred, please try again later, or '));
          var a = el('a', null, 'email us directly'); a.href = m;
          status.appendChild(a); status.appendChild(document.createTextNode('.'));
        })
        .then(function () { btn.disabled = false; btn.firstChild.textContent = 'Send message '; });
    });
  }
})();
