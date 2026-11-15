// Loads the data, fills the page, and wires up the controls.
const FALLBACK = { // used if the CSV files can't be fetched (e.g. page opened by double-clicking)
  years: [[2011,34294,155959],[2012,34270,152781],[2013,35217,146795],[2014,35729,144160],[2015,37325,183089],[2016,39231,219157],[2017,39541,212620],[2018,39787,208714],[2019,40060,208889],[2020,38054,187793],[2021,39505,198934]],
  roads: [['Bus occupant',2602,13061],['Car driver',135733,615717],['Car passenger',53577,255987],['Car unknown position',8880,57072],['Heavy transport driver',4630,27056],['Heavy transport passenger',554,3154],['Heavy transport unknown position',447,2996],['Motorcyclist',92642,504102],['Other or unknown',6367,37610],['Pedal cyclist',75486,222501],['Pedestrian',29093,262180],['Pick-up truck or van occupant',3002,17455]]
};

async function loadData() {
  try {
    const [r, y] = await Promise.all([d3.csv('data/Road_User_Statistics.csv', d3.autoType), d3.csv('data/Yearly_Statistics.csv', d3.autoType)]);
    return { roads: r.map(d => ({ name: d.Road_User, cases: d.Total_Hospitalisation_Cases, beds: d.Total_Bed_Days })),
             years: y.map(d => ({ year: d.Year, cases: d.Total_Cases, beds: d.Total_Bed_Days })) };
  } catch (e) {
    return { roads: FALLBACK.roads.map(([name, cases, beds]) => ({ name, cases, beds })),
             years: FALLBACK.years.map(([year, cases, beds]) => ({ year, cases, beds })) };
  }
}


const pct = (a, b) => ((b - a) / a * 100);
const sign = n => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(1) + '%';
const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls || '', textContent: text || '' });
const $ = id => document.getElementById(id);

loadData().then(({ roads, years }) => {
  roads.forEach(d => (d.avg = d.beds / d.cases));
  years.forEach(d => (d.avg = d.beds / d.cases));
  const totalCases = d3.sum(roads, d => d.cases), totalBeds = d3.sum(roads, d => d.beds), overallAvg = totalBeds / totalCases;
  const first = years[0], last = years[years.length - 1];
  const peakYear = years.reduce((a, b) => (b.cases > a.cases ? b : a));
  const longest = [...roads].sort((a, b) => b.avg - a.avg)[0];
  const topCases = [...roads].sort((a, b) => b.cases - a.cases)[0];
  const change = pct(first.cases, last.cases);

  // ----- Key numbers (count up when they scroll into view) -----
  const kpis = [
    [t => fmt(Math.round(totalCases * t)), 'Hospitalised cases', `${first.year}–${last.year}, all road users`],
    [t => fmt(Math.round(totalBeds * t)), 'Hospital bed days', 'Total days spent in hospital'],
    [t => sign(change * t), 'Change in yearly cases', `${fmt(first.cases)} in ${first.year} to ${fmt(last.cases)} in ${last.year}`],
    [t => (overallAvg * t).toFixed(1), 'Bed days per case', 'Average hospital stay']
  ];
  $('kpis').append(...kpis.map(([fn, t, s]) => {
    const a = el('article', 'kpi reveal'), n = el('strong'); a.append(n, el('h3', '', t), el('p', '', s)); countUp(n, fn); return a;
  }));
  const perDay = totalCases / (years.length * 365.25);
  countUp($('band1'), t => Math.round(perDay * t));
  $('band1t').textContent = `hospitalisations from road crashes every day, on average, across ${first.year}–${last.year}.`;
  countUp($('band2'), t => (longest.avg * t).toFixed(1));
  $('band2t').textContent = `bed days per case: ${longest.name} has the longest average stay of any road user group.`;

  // ----- Trends line chart -----
  const MODES = {
    cases: { title: 'Hospitalisation cases per year', y: 'Hospitalisation cases', f: fmt, s: [{ key: 'cases', label: 'Cases', color: '--c1' }] },
    beds: { title: 'Hospital bed days per year', y: 'Hospital bed days', f: fmt, s: [{ key: 'beds', label: 'Bed days', color: '--c2' }] },
    avg: { title: 'Average bed days per case, by year', y: 'Bed days per case', f: d3.format('.1f'), s: [{ key: 'avg', label: 'Bed days per case', color: '--c3' }] },
    cmp: { title: 'Cases and bed days compared', y: 'Index (first year = 100)', f: d3.format('.0f'), s: [{ key: 'ci', label: 'Cases', color: '--c1' }, { key: 'bi', label: 'Bed days', color: '--c2' }] }
  };
  let mode = 'cases', from = first.year, to = last.year, timer = null;
  const sel = [$('yr-from'), $('yr-to')], playBtn = $('yr-play');
  sel.forEach(s => s.append(...years.map(d => new Option(d.year, d.year))));
  const stop = () => { clearInterval(timer); timer = null; playBtn.textContent = 'Play'; };
  const drawTrend = () => {
    const M = MODES[mode], sub = years.filter(d => d.year >= from && d.year <= to), b0 = sub[0];
    const data = sub.map(d => ({ ...d, ci: d.cases / b0.cases * 100, bi: d.beds / b0.beds * 100 }));
    sel[0].value = from; sel[1].value = to;
    $('line-title').textContent = `${M.title}, ${from}–${to}`;
    $('line-sub').textContent = mode === 'cmp' ? 'Both measures start at 100 in the first year, so you can see which one changed faster.' : 'Hover the chart to read each year. The vertical axis does not start at zero, so small changes look bigger.';
    drawLine($('line-chart'), data, M.s, M.y, M.f);
    const a = sub[0], b = sub[sub.length - 1];
    $('line-note').textContent = sub.length < 2 ? `In ${a.year}: ${fmt(a.cases)} cases and ${fmt(a.beds)} bed days.`
      : mode === 'cmp' ? `From ${a.year} to ${b.year}, cases changed ${sign(pct(a.cases, b.cases))} and bed days changed ${sign(pct(a.beds, b.beds))}.`
      : (() => { const k = M.s[0].key, pk = sub.reduce((p, q) => (q[k] > p[k] ? q : p)); return `From ${a.year} to ${b.year} this went from ${M.f(a[k])} to ${M.f(b[k])} (${sign(pct(a[k], b[k]))}). The highest year was ${pk.year} with ${M.f(pk[k])}.`; })();
  };
  sel[0].onchange = () => { stop(); from = +sel[0].value; if (from > to) to = from; drawTrend(); };
  sel[1].onchange = () => { stop(); to = +sel[1].value; if (to < from) from = to; drawTrend(); };
  $('yr-reset').onclick = () => { stop(); from = first.year; to = last.year; drawTrend(); };
  playBtn.onclick = () => {
    if (timer) { stop(); return; }
    from = first.year; to = first.year + 1; playBtn.textContent = 'Pause'; drawTrend();
    timer = setInterval(() => { if (to >= last.year) { stop(); return; } to++; drawTrend(); }, 1000);
  };
  document.querySelectorAll('#line-metric button').forEach(b => b.onclick = () => {
    mode = b.dataset.m; document.querySelectorAll('#line-metric button').forEach(x => x.classList.toggle('on', x === b)); drawTrend();
  });
  const yoy = years.slice(1).map((d, i) => ({ year: d.year, cases: d.cases, pct: pct(years[i].cases, d.cases) }));

  // ----- Road users: bar, bubble, donut, detail, table (all linked through `picked`) -----
  let bm = 'cases', picked = null, sortKey = 'cases', sortDir = -1;
  const bnames = { cases: 'Hospitalisation cases', beds: 'Hospital bed days', avg: 'Average bed days per case' };
  const pick = n => { picked = n; drawRoads(); };
  const drawDetail = sorted => {
    const d = roads.find(r => r.name === picked), box = $('bar-detail'); box.replaceChildren();
    if (!d) { box.append(el('h3', '', 'Pick a road user'), el('p', 'sub', 'Click a bar, bubble, slice or table row, or tab to one and press Enter, to see the numbers here.')); return; }
    const rows = [['Cases', fmt(d.cases)], ['Share of all cases', (d.cases / totalCases * 100).toFixed(1) + '%'], ['Bed days', fmt(d.beds)],
      ['Bed days per case', d.avg.toFixed(1)], ['Rank in bar chart', `${sorted.findIndex(r => r.name === picked) + 1} of ${sorted.length}`]];
    const dl = el('dl'); rows.forEach(([k, v]) => dl.append(el('dt', '', k), el('dd', '', v))); box.append(el('h3', '', d.name), dl);
  };
  const COLS = [['name', 'Road user'], ['cases', 'Cases'], ['share', 'Share of cases'], ['beds', 'Bed days'], ['avg', 'Bed days per case']];
  const drawTable = () => {
    const val = (d, k) => (k === 'share' ? d.cases : d[k]);
    const rows = [...roads].sort((a, b) => (sortKey === 'name' ? a.name.localeCompare(b.name) : val(a, sortKey) - val(b, sortKey)) * sortDir);
    const head = $('tbl').tHead; head.replaceChildren();
    const tr = head.insertRow();
    COLS.forEach(([k, label]) => {
      const th = document.createElement('th'), b = el('button', '', label + (k === sortKey ? (sortDir < 0 ? ' ▼' : ' ▲') : ''));
      th.setAttribute('aria-sort', k === sortKey ? (sortDir < 0 ? 'descending' : 'ascending') : 'none');
      b.type = 'button'; b.onclick = () => { sortDir = k === sortKey ? -sortDir : (k === 'name' ? 1 : -1); sortKey = k; drawTable(); };
      th.append(b); tr.append(th);
    });
    const body = $('tbl').tBodies[0]; body.replaceChildren();
    const mx = { cases: d3.max(roads, d => d.cases), beds: d3.max(roads, d => d.beds), avg: d3.max(roads, d => d.avg) };
    rows.forEach(d => {
      const r = body.insertRow(); r.tabIndex = 0; r.className = d.name === picked ? 'sel' : '';
      r.onclick = () => pick(d.name === picked ? null : d.name);
      r.onkeydown = e => { if (e.key === 'Enter') r.onclick(); };
      r.insertCell().textContent = d.name;
      [['cases', fmt(d.cases)], ['share', (d.cases / totalCases * 100).toFixed(1) + '%'], ['beds', fmt(d.beds)], ['avg', d.avg.toFixed(1)]].forEach(([k, txt]) => {
        const c = r.insertCell(); c.textContent = txt; if (mx[k]) { c.className = 'db'; c.style.setProperty('--w', (d[k] / mx[k] * 100) + '%'); }
      });
    });
  };
  const drawRoads = () => {
    const sorted = [...roads].sort((a, b) => b[bm] - a[bm]);
    $('bar-title').textContent = `${bnames[bm]} by road user, ${first.year}–${last.year}`;
    drawBars($('bar-chart'), sorted, bm, bnames[bm], picked, pick);
    drawBubble($('bubble-chart'), roads, picked, pick);
    drawDonut($('donut-chart'), roads, picked, pick);
    drawDetail(sorted); drawTable();
  };
  document.querySelectorAll('#bar-metric button').forEach(b => b.onclick = () => {
    bm = b.dataset.m; document.querySelectorAll('#bar-metric button').forEach(x => x.classList.toggle('on', x === b)); drawRoads();
  });
  $('clear-pick').onclick = () => pick(null);

  // ----- Head to head -----
  const ha = $('h-a'), hb = $('h-b'), byName = n => roads.find(r => r.name === n);
  [ha, hb].forEach(s => s.append(...roads.map(r => new Option(r.name, r.name))));
  ha.value = byName('Pedestrian') ? 'Pedestrian' : roads[0].name; hb.value = byName('Car driver') ? 'Car driver' : roads[1].name;
  const H = [['cases', 'Cases', fmt], ['beds', 'Bed days', fmt], ['avg', 'Bed days per case', d3.format('.1f')]];
  const drawH2H = () => {
    const A = byName(ha.value), B = byName(hb.value), box = $('h2h-rows'); box.replaceChildren();
    H.forEach(([k, label, f]) => {
      const mx = Math.max(A[k], B[k]), row = el('div', 'h2h-row'), bars = el('div', 'bars'), l = el('div', 'l'), r = el('div', 'r'), li = el('i'), ri = el('i');
      li.style.width = ri.style.width = '0%'; l.append(li); r.append(ri); bars.append(l, r);
      if (A[k] >= B[k]) l.classList.add('win'); if (B[k] >= A[k]) r.classList.add('win');
      row.append(el('span', 'name', label), el('span', 'v', f(A[k])), bars, el('span', 'v', f(B[k]))); box.append(row);
      requestAnimationFrame(() => requestAnimationFrame(() => { li.style.width = (A[k] / mx * 100) + '%'; ri.style.width = (B[k] / mx * 100) + '%'; }));
    });
    const head = el('div', 'h2h-names'); head.append(el('strong', '', A.name), el('strong', '', B.name)); box.prepend(head);
    if (A.name === B.name) { $('h2h-note').textContent = 'Pick two different road users to compare.'; return; }
    const [hi, lo] = A.cases >= B.cases ? [A, B] : [B, A], [lg, sh] = A.avg >= B.avg ? [A, B] : [B, A];
    $('h2h-note').textContent = `${hi.name} has ${(hi.cases / lo.cases).toFixed(1)}× as many cases as ${lo.name}. ${lg.name} stays ${(lg.avg - sh.avg).toFixed(1)} bed days longer per case than ${sh.name}.`;
  };
  ha.onchange = hb.onchange = drawH2H;

  // ----- Insight cards (all numbers come from the data) -----
  const drop = yoy.map(d => ({ ...d, prev: years.find(y => y.year === d.year - 1) })).sort((a, b) => a.pct - b.pct)[0];
  const after = years.find(d => d.year === drop.year + 1);
  const insights = [
    ['Overall trend', `Yearly cases are ${sign(change)} since ${first.year}`, `Cases went from ${fmt(first.cases)} to ${fmt(last.cases)}, with a peak of ${fmt(peakYear.cases)} in ${peakYear.year}.`, '#trends'],
    ['Biggest group', `${topCases.name}: ${(topCases.cases / totalCases * 100).toFixed(0)}% of all cases`, `${fmt(topCases.cases)} of ${fmt(totalCases)} hospitalised cases, more than any other road user.`, '#road-users'],
    ['Severity', `${longest.name}: longest stays`, `${longest.avg.toFixed(1)} bed days per case, against ${overallAvg.toFixed(1)} for all road users together.`, '#road-users'],
    ['Biggest drop', `Cases fell ${Math.abs(drop.pct).toFixed(1)}% in ${drop.year}`, `From ${fmt(drop.prev.cases)} to ${fmt(drop.cases)}${after ? `, then back up to ${fmt(after.cases)} in ${after.year}` : ''}. The data alone does not tell us why.`, '#trends']
  ];
  $('insight-cards').append(...insights.map(([tag, h, p, href]) => {
    const a = el('a', 'card reveal'); a.href = href; a.append(el('span', 'tag', tag), el('h3', '', h), el('p', '', p), el('span', 'go', 'See the chart')); return a;
  }));

  // ----- Photo slideshow -----
  const imgs = [...document.querySelectorAll('.slides img')], dots = document.querySelector('.dots');
  let cur = 0, st;
  const go = i => { cur = (i + imgs.length) % imgs.length; imgs.forEach((im, k) => im.classList.toggle('on', k === cur)); [...dots.children].forEach((d, k) => d.classList.toggle('on', k === cur)); };
  imgs.forEach((_, k) => { const b = el('button'); b.type = 'button'; b.setAttribute('aria-label', `Photo ${k + 1}`); b.onclick = () => { go(k); restart(); }; dots.append(b); });
  const restart = () => { clearInterval(st); if (!calm) st = setInterval(() => go(cur + 1), 5000); };
  go(0); restart();

  // ----- Nav highlight, redraw on resize -----
  const links = [...document.querySelectorAll('.topbar nav a')];
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const id = '#' + (e.target.id || 'top'); links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id)); } }), { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('[data-section]').forEach(s => io.observe(s));
  const all = () => { drawTrend(); drawYoY($('yoy-chart'), yoy); drawRoads(); };
  let rt, lastW = innerWidth; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (innerWidth !== lastW) { lastW = innerWidth; all(); } }, 200); });
  all(); drawH2H();
});
