/* Q21 KI_HUB — Aurora shared effects:
   neural constellation canvas, cursor glow, 3D tilt cards, scroll reveal */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Neural constellation canvas ---------- */
  var cv = document.getElementById('q21-net');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d');
    var W, H, pts = [], mouse = { x: -9e9, y: -9e9 };
    var COLORS = ['169,155,240', '240,179,92', '245,237,220'];

    function resize() {
      var dpr = window.devicePixelRatio || 1;
      W = cv.width = window.innerWidth * dpr;
      H = cv.height = window.innerHeight * dpr;
      cv.style.width = window.innerWidth + 'px';
      cv.style.height = window.innerHeight + 'px';
      var n = Math.min(110, Math.floor(window.innerWidth / 14));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - .5) * .35 * dpr, vy: (Math.random() - .5) * .35 * dpr,
          r: (Math.random() * 1.6 + .8) * dpr,
          c: COLORS[i % 3]
        });
      }
    }

    function drawStatic() {
      pts.forEach(function (p) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
        ctx.fillStyle = 'rgba(' + p.c + ',.6)'; ctx.fill();
      });
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);
      var dpr = window.devicePixelRatio || 1;
      var LINK = 130 * dpr;
      var i, j, a, b, d;
      for (i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        var dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (dm < 170 * dpr) { p.x += (mouse.x - p.x) * .0022; p.y += (mouse.y - p.y) * .0022; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
        ctx.fillStyle = 'rgba(' + p.c + ',.75)'; ctx.fill();
      }
      for (i = 0; i < pts.length; i++) {
        for (j = i + 1; j < pts.length; j++) {
          a = pts[i]; b = pts[j];
          d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = 'rgba(169,155,240,' + ((1 - d / LINK) * .16) + ')';
            ctx.lineWidth = dpr * .7; ctx.stroke();
          }
        }
      }
      window.requestAnimationFrame(tick);
    }

    window.addEventListener('resize', resize);
    resize();
    if (reduced) { drawStatic(); } else {
      window.addEventListener('pointermove', function (e) {
        var dpr = window.devicePixelRatio || 1;
        mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr;
      });
      tick();
    }
  }

  /* ---------- Cursor glow ---------- */
  var glow = document.getElementById('q21-glow');
  if (glow && !reduced && window.matchMedia('(pointer:fine)').matches) {
    var tx = window.innerWidth / 2, ty = window.innerHeight / 2, gx = tx, gy = ty;
    window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      gx += (tx - gx) * .08; gy += (ty - gy) * .08;
      glow.style.left = gx + 'px'; glow.style.top = gy + 'px';
      window.requestAnimationFrame(loop);
    })();
  } else if (glow) { glow.style.display = 'none'; }

  /* ---------- Tilt + spotlight cards ---------- */
  if (!reduced && window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', px * 100 + '%');
        card.style.setProperty('--my', py * 100 + '%');
        card.style.transform = 'perspective(900px) rotateX(' + ((py - .5) * -5) + 'deg) rotateY(' + ((px - .5) * 5) + 'deg) translateY(-3px)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }
})();
