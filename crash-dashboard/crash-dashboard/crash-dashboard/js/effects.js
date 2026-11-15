// GenAI declaration: written with the assistance of Claude (Anthropic); reviewed and adapted by the team.
// Small helpers used by every page: reduced-motion flag, count-up numbers, header photo slideshow.
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// fn(t) returns the text to show for t between 0 and 1
function countUp(el, fn) {
  if (calm) { el.textContent = fn(1); return; }
  const t0 = performance.now();
  const step = now => { const t = Math.min(1, (now - t0) / 1200); el.textContent = fn(1 - Math.pow(1 - t, 3)); if (t < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

// slow cross-fade of the header photos (skipped when the viewer prefers reduced motion)
(() => {
  const imgs = [...document.querySelectorAll('.dh-bg img')]; let cur = 0;
  if (calm || imgs.length < 2) return;
  setInterval(() => { cur = (cur + 1) % imgs.length; imgs.forEach((im, k) => im.classList.toggle('on', k === cur)); }, 6000);
})();
