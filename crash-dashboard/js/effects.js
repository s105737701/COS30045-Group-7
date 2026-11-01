// Visual effects only (no data in here): particles, cursor glow, scroll progress, reveal, count-up.
document.documentElement.classList.add('js');
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// scroll progress bar + back-to-top
const bar = document.getElementById('progress'), toTop = document.querySelector('.totop');
addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  toTop.classList.toggle('show', scrollY > 700);
}, { passive: true });

// glow that follows the mouse
if (matchMedia('(pointer: fine)').matches && !calm) {
  const g = document.createElement('div'); g.className = 'cursor-glow'; document.body.append(g);
  addEventListener('mousemove', e => { g.style.transform = `translate(${e.clientX - 200}px, ${e.clientY - 200}px)`; g.style.opacity = 1; }, { passive: true });
}

// fade elements in as they scroll into view
const revealIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } }), { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

// count a number up when it appears: fn(t) returns the text for t between 0 and 1
function countUp(el, fn) {
  el.textContent = fn(calm ? 1 : 0);
  if (calm) return;
  const io = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return; io.disconnect();
    const t0 = performance.now();
    const step = now => { const t = Math.min(1, (now - t0) / 1300); el.textContent = fn(1 - Math.pow(1 - t, 3)); if (t < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }); io.observe(el);
}

// particle network behind the hero title
(() => {
  const c = document.getElementById('net'), hero = c.parentElement, x = c.getContext('2d');
  let w, h, pts = [], mx = -999, my = -999, running = false;
  const size = () => {
    const r = c.getBoundingClientRect(), d = devicePixelRatio || 1;
    w = r.width; h = r.height; c.width = w * d; c.height = h * d; x.setTransform(d, 0, 0, d, 0, 0);
    pts = Array.from({ length: Math.round(w * h / 13000) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: Math.random() * 1.6 + .8 }));
    draw();
  };
  const draw = () => {
    x.clearRect(0, 0, w, h);
    for (const p of pts) { if (!calm) { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; } }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) { x.strokeStyle = `rgba(0,114,178,${(1 - d / 120) * .2})`; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); }
      }
      const dm = Math.hypot(a.x - mx, a.y - my);
      if (dm < 170) { x.strokeStyle = `rgba(255,255,255,${(1 - dm / 170) * .6})`; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(mx, my); x.stroke(); }
      x.fillStyle = '#0072b2'; x.shadowColor = '#0072b2'; x.shadowBlur = 5; x.beginPath(); x.arc(a.x, a.y, a.r, 0, 6.3); x.fill(); x.shadowBlur = 0;
    }
    if (running) requestAnimationFrame(draw);
  };
  hero.addEventListener('mousemove', e => { const r = c.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
  hero.addEventListener('mouseleave', () => { mx = my = -999; });
  new ResizeObserver(size).observe(hero);
  new IntersectionObserver(es => { const on = es[0].isIntersecting; if (on && !running && !calm) { running = true; draw(); } else if (!on) running = false; }).observe(hero);
})();
