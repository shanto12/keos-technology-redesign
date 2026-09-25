/* Keos Technology · site interactions */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ---------- Header state + mobile menu ---------- */
  var header = $('#site-header');
  var toggle = $('.nav-toggle');
  var menu = $('#nav-menu');

  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
  }
  toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 860) setMenu(false); });

  /* ---------- Active nav link ---------- */
  var navLinks = $$('[data-nav]');
  var sections = navLinks.map(function (a) { return document.getElementById(a.getAttribute('data-nav')); }).filter(Boolean);
  function updateActive() {
    var y = window.scrollY + window.innerHeight * 0.35;
    var current = 'top';
    sections.forEach(function (s) { if (s.offsetTop <= y) current = s.id; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = 'contact';
    navLinks.forEach(function (a) {
      var on = a.getAttribute('data-nav') === current;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { updateActive(); ticking = false; }); }
  }, { passive: true });
  updateActive();

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$('.reveal');
  // stagger siblings
  reveals.forEach(function (el) {
    var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains('reveal'); });
    var i = sibs.indexOf(el);
    if (i > 0) el.style.setProperty('--d', Math.min(i * 0.08, 0.4) + 's');
  });
  if (hasIO && !reduced) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); rio.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { rio.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Informs vs Actionable explainer ---------- */
  var explainer = $('.explainer');
  var tabs = $$('.explainer-tab');
  var groups = { informs: $('#copy-informs'), actionable: $('#copy-actionable') };
  var userPicked = false;

  function setMode(mode, focus) {
    explainer.setAttribute('data-mode', mode);
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-mode') === mode;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
      if (on && focus) t.focus();
    });
    Object.keys(groups).forEach(function (k) {
      groups[k].classList.toggle('is-active', k === mode);
      groups[k].classList.toggle('is-dim', k !== mode);
    });
  }
  if (explainer) {
    setMode('informs');
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { userPicked = true; setMode(t.getAttribute('data-mode')); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault(); userPicked = true;
          var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
          setMode(next.getAttribute('data-mode'), true);
        }
      });
    });
    // Follow the reader through the copy until they pick a view themselves
    if (hasIO && window.innerWidth > 900) {
      var gio = new IntersectionObserver(function (entries) {
        if (userPicked) return;
        entries.forEach(function (en) {
          if (en.isIntersecting) setMode(en.target.getAttribute('data-group'));
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      gio.observe(groups.informs); gio.observe(groups.actionable);
    }
  }

  /* Live event feed (illustrative) */
  var feed = $('#viz-feed');
  var FEED = [
    'sourcetype=access_combined status=200 GET /cart',
    'host=db-02 WARN slow query duration_ms=1840',
    'EventCode=4625 An account failed to log on',
    '{"device":"sensor-17","temp":71.4,"unit":"F"}',
    'action=blocked src_ip=10.0.4.12 dest_port=445',
    'k8s pod=checkout-7d9 restarts=3 reason=OOMKilled',
    'app=billing txn_id=9f2c latency_ms=842',
    'vpn user=svc_batch session_start region=us-west',
    'fw action=allowed bytes=48213 proto=tcp',
    'status=503 upstream timeout /api/v2/orders'
  ];
  var fi = 0;
  function stamp(offset) {
    var d = new Date(Date.now() - offset * 1000);
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return z(d.getHours()) + ':' + z(d.getMinutes()) + ':' + z(d.getSeconds());
  }
  function pushFeed(offset) {
    if (!feed) return;
    var li = document.createElement('li');
    var t = document.createElement('time'); t.textContent = stamp(offset || 0);
    var s = document.createElement('span'); s.textContent = FEED[fi++ % FEED.length];
    li.appendChild(t); li.appendChild(s);
    feed.insertBefore(li, feed.firstChild);
    while (feed.children.length > 6) feed.removeChild(feed.lastChild);
  }
  if (feed) {
    for (var k = 5; k >= 0; k--) pushFeed(k * 3);
    if (!reduced) setInterval(function () {
      if (!document.hidden && explainer.getAttribute('data-mode') === 'informs') pushFeed(0);
    }, 1900);
  }
  // randomize bar heights for the mini histogram
  $$('.viz-bars span').forEach(function (b, i) {
    var h = 25 + Math.round(60 * Math.abs(Math.sin(i * 1.3 + .4)) * (0.55 + 0.45 * Math.cos(i * .37)));
    b.style.height = h + '%';
    b.style.animationDelay = (-i * 0.17) + 's';
  });

  /* ---------- Raw-data marquee ---------- */
  var mq = $('#marquee-raw');
  if (mq) {
    var RAW = ['index=main', 'sourcetype=syslog', 'src_ip=10.0.4.12', '{"status":503}', 'EventCode=4625', 'latency_ms=842',
      'host=web-04', 'action=blocked', 'GET /api/v2/orders', 'user=svc_batch', 'bytes=48213', '{"temp":71.4}',
      'pod=cart-7d9', 'region=us-west', 'dest_port=443', 'level=WARN'];
    var frag = document.createDocumentFragment();
    [0, 1].forEach(function (copy) {
      RAW.forEach(function (r) {
        var s = document.createElement('span'); s.textContent = r;
        if (copy) s.setAttribute('aria-hidden', 'true');
        frag.appendChild(s);
      });
    });
    mq.appendChild(frag);
  }

  /* ---------- Stats: counters + scramble ---------- */
  function countUp(el) {
    var to = +el.getAttribute('data-count');
    var from = +(el.getAttribute('data-from') || 0);
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1600, t0 = null;
    function step(ts) {
      if (!t0) t0 = ts;
      var u = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - u, 4);
      el.textContent = Math.round(from + (to - from) * e) + suffix;
      if (u < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}[]#<>/';
  function scramble(el) {
    var final = el.textContent, frame = 0, total = 26;
    function step() {
      var out = '';
      for (var i = 0; i < final.length; i++) {
        var reveal = (frame / total) * final.length;
        out += i < reveal ? final[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if (frame++ < total) setTimeout(function () { requestAnimationFrame(step); }, 34);
      else el.textContent = final;
    }
    step();
  }
  var statEls = $$('.stat-value');
  statEls.forEach(function (el) {
    var sr = document.createElement('span');
    sr.className = 'visually-hidden';
    sr.textContent = el.textContent;
    el.setAttribute('aria-hidden', 'true');
    el.parentNode.insertBefore(sr, el);
  });
  if (hasIO && !reduced) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.hasAttribute('data-count')) countUp(el); else if (el.hasAttribute('data-scramble')) scramble(el);
        sio.unobserve(el);
      });
    }, { threshold: 0.6 });
    statEls.forEach(function (el) { sio.observe(el); });
  }

  /* ---------- Service cards: spotlight + tilt ---------- */
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) {
    $$('.service-card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--mx', x + 'px');
        card.style.setProperty('--my', y + 'px');
        if (!reduced) {
          var rx = ((y / r.height) - .5) * -5, ry = ((x / r.width) - .5) * 6;
          card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
        }
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  /* ---------- Contact form (Netlify Forms, AJAX with graceful fallback) ---------- */
  var form = $('#contact-form');
  if (form) {
    var status = $('#form-status');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector('.btn-label');
    var fields = {
      name: { el: $('#f-name'), msg: 'Please enter your name.' },
      email: { el: $('#f-email'), msg: 'Please enter a valid email address.' },
      message: { el: $('#f-message'), msg: 'Please enter a message.' }
    };
    function validate() {
      var firstBad = null;
      Object.keys(fields).forEach(function (k) {
        var f = fields[k], el = f.el, err = document.getElementById(el.id + '-error');
        var ok = el.value.trim() !== '' && el.checkValidity();
        el.closest('.field').classList.toggle('has-error', !ok);
        el.setAttribute('aria-invalid', String(!ok));
        if (!ok) { err.textContent = f.msg; el.setAttribute('aria-describedby', err.id); if (!firstBad) firstBad = el; }
        else { err.textContent = ''; el.removeAttribute('aria-describedby'); }
      });
      if (firstBad) firstBad.focus();
      return !firstBad;
    }
    Object.keys(fields).forEach(function (k) {
      fields[k].el.addEventListener('input', function () {
        var el = fields[k].el;
        if (el.closest('.field').classList.contains('has-error') && el.value.trim() !== '' && el.checkValidity()) {
          el.closest('.field').classList.remove('has-error');
          el.setAttribute('aria-invalid', 'false');
          document.getElementById(el.id + '-error').textContent = '';
        }
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.className = 'form-status'; status.textContent = '';
      if (!validate()) return;
      btn.disabled = true; label.textContent = 'Sending…';
      var body = new URLSearchParams(new FormData(form)).toString();
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          form.reset();
          status.className = 'form-status is-success';
          status.textContent = 'Thanks for sending the message! We’ll be in touch with you soon.';
        })
        .catch(function () {
          status.className = 'form-status is-error';
          status.textContent = 'Unable to send message. Please try again later, or email info@keostech.com.';
        })
        .then(function () { btn.disabled = false; label.textContent = 'Send message'; });
    });
  }
})();
