// GenAI declaration: written with the assistance of Claude (Anthropic); reviewed and adapted by the team.
// Overview page: key numbers, the three story charts, and the selected road user bar.
loadData().then(D => {
  if (!D) return;
  const { roads, years, totalCases, totalBeds, overallAvg, first, last } = D;
  const change = pct(first.cases, last.cases);
  const topBy = k => [...roads].sort((a, b) => b[k] - a[k])[0];

  // ----- Key numbers in the header (colour = measure) -----
  [[t => fmt(Math.round(totalCases * t)), 'Hospitalised cases', 'cases'], [t => fmt(Math.round(totalBeds * t)), 'Hospital bed days', 'beds'],
   [t => sign(change * t), 'Change in yearly cases', 'cases'], [t => (overallAvg * t).toFixed(1), 'Bed days per case', 'avg']].forEach(([fn, label, mk]) => {
    const a = el('div', 'kpi m-' + mk), n = el('strong'); a.append(n, el('span', '', label)); $('kpis').append(a); countUp(n, fn);
  });

  // ----- Step 1: line chart (Cases, Bed days, Compare), year range, Play -----
  const MODES = {
    cases: { y: 'Hospitalisation cases', label: 'Cases', f: fmt, s: [{ key: 'cases', label: 'Cases', color: '--m-cases' }] },
    beds: { y: 'Hospital bed days', label: 'Bed days', f: fmt, s: [{ key: 'beds', label: 'Bed days', color: '--m-beds' }] },
    cmp: { y: 'Index (first year = 100)', f: d3.format('.0f'), s: [{ key: 'ci', label: 'Cases', color: '--m-cases' }, { key: 'bi', label: 'Bed days', color: '--m-beds' }] }
  };
  let mode = 'cases', from = first.year, to = last.year, timer = null;
  const sel = [$('yr-from'), $('yr-to')], playBtn = $('yr-play');
  sel.forEach(s => s.append(...years.map(d => new Option(d.year, d.year))));
  const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = 'Play'; };
  const trendTake = (sub, M) => {
    const a = sub[0], b = sub[sub.length - 1];
    if (sub.length < 2) return `In ${a.year}: ${fmt(a.cases)} cases and ${fmt(a.beds)} bed days.`;
    const cc = pct(a.cases, b.cases), bc = pct(a.beds, b.beds);
    if (mode === 'cmp') return `From ${a.year} to ${b.year}, cases ${sign(cc)} and bed days ${sign(bc)}. ${bc > cc ? 'Bed days grew faster, so the average stay per case rose.' : 'Bed days grew more slowly, so the average stay per case fell.'}`;
    const k = M.s[0].key, pk = sub.reduce((p, q) => (q[k] > p[k] ? q : p));
    const fall = sub.slice(1).map((d, i) => ({ y: d.year, p: pct(sub[i][k], d[k]) })).filter(o => o.p < -2).sort((p, q) => p.p - q.p)[0];
    return `${M.label} ${sign(pct(a[k], b[k]))} from ${a.year} to ${b.year} (${M.f(a[k])} to ${M.f(b[k])}), peaking in ${pk.year}.${fall ? ` Biggest fall: ${fall.y} (${sign(fall.p)}).` : ''}`;
  };
  const drawTrend = () => {
    const M = MODES[mode], sub = years.filter(d => d.year >= from && d.year <= to), b0 = sub[0];
    const data = sub.map(d => ({ ...d, ci: d.cases / b0.cases * 100, bi: d.beds / b0.beds * 100 }));
    sel[0].value = from; sel[1].value = to;
    $('line-sub').textContent = mode === 'cmp' ? `Both start at 100 in ${from}, so you can see which grew faster.` : `${M.y} per year, ${from}–${to}. The axis does not start at zero.`;
    drawLine($('line-chart'), data, M.s, M.y, M.f);
    $('line-take').textContent = trendTake(sub, M);
  };
  sel[0].onchange = () => { stop(); from = +sel[0].value; if (from > to) to = from; drawTrend(); };
  sel[1].onchange = () => { stop(); to = +sel[1].value; if (to < from) from = to; drawTrend(); };
  playBtn.onclick = () => {
    if (timer) { stop(); return; }
    from = first.year; to = first.year + 1; playBtn.textContent = 'Pause'; drawTrend();
    timer = setInterval(() => { if (to >= last.year) { stop(); return; } to++; drawTrend(); }, 900);
  };
  $('line-metric').querySelectorAll('button').forEach(b => b.onclick = () => { mode = b.dataset.m; segPick($('line-metric'), b); drawTrend(); });

  // ----- Steps 2 and 3: bars and bubbles share one selection -----
  let bm = 'cases', picked = null;
  const bnames = { cases: 'Hospitalisation cases', beds: 'Hospital bed days', avg: 'Average bed days per case' };
  const barTake = {
    cases: () => { const t = topBy('cases'); return `${t.name} has the most cases: ${fmt(t.cases)}, or ${(t.cases / totalCases * 100).toFixed(0)}% of all cases.`; },
    beds: () => { const t = topBy('beds'); return `${t.name} uses the most bed days: ${fmt(t.beds)}, or ${(t.beds / totalBeds * 100).toFixed(0)}% of all bed days.`; },
    avg: () => { const t = topBy('avg'); return `${t.name} has the longest stays: ${t.avg.toFixed(1)} bed days per case, against ${overallAvg.toFixed(1)} for everyone.`; }
  };
  const lg = topBy('avg'), tc = topBy('cases');
  $('bubble-take').textContent = lg.name === tc.name ? `${lg.name} has both the most cases and the longest stays.`
    : `${lg.name}: longest stays (${lg.avg.toFixed(1)} bed days per case) but only ${fmt(lg.cases)} cases. ${tc.name}: most cases (${fmt(tc.cases)}), average stay ${tc.avg.toFixed(1)}.`;

  const drawDetail = () => {
    const box = $('dbar'), d = roads.find(r => r.name === picked); box.replaceChildren();
    if (!d) { box.append(el('span', '', 'Click a bar or a bubble to highlight a road user in both charts. They are linked.')); return; }
    box.append(el('strong', '', d.name));
    [['Cases', fmt(d.cases)], ['Share of cases', (d.cases / totalCases * 100).toFixed(1) + '%'], ['Bed days', fmt(d.beds)], ['Bed days per case', d.avg.toFixed(1)]]
      .forEach(([k, v]) => { const s = el('span', 'st', k); s.append(el('b', '', v)); box.append(s); });
    const a = el('a', 'dl', 'Compare in detail'); a.href = 'compare.html?a=' + encodeURIComponent(d.name); box.append(a);
  };
  const pick = n => { picked = n; drawRoads(); };
  const drawRoads = () => {
    const sorted = [...roads].sort((a, b) => b[bm] - a[bm]);
    $('bar-sub').textContent = `${bnames[bm]} by road user, ${first.year}–${last.year}.`;
    $('bar-take').textContent = barTake[bm]();
    drawBars($('bar-chart'), sorted, bm, bnames[bm], picked, pick);
    drawBubble($('bubble-chart'), roads, picked, pick);
    drawDetail();
  };
  $('bar-metric').querySelectorAll('button').forEach(b => b.onclick = () => { bm = b.dataset.m; segPick($('bar-metric'), b); drawRoads(); });
  $('clear-pick').onclick = () => pick(null);

  onResize(() => { drawTrend(); drawRoads(); });
});
