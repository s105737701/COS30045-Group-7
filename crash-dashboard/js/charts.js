// GenAI declaration: written with the assistance of Claude (Anthropic); reviewed and adapted by the team.
// D3 charts. Each one fills its container (width and height), so the dashboard fits on one screen.
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const fmt = d3.format(',');
const tipEl = document.getElementById('tip');
// Qualitative Okabe–Ito road-user palette; neutral remainder comes from --neutral.
const PAL = ['--r1', '--r2', '--r3', '--r4', '--r5'];
const MCOL = { cases: '--m-cases', beds: '--m-beds', avg: '--m-avg' };

function showTip(lines, x, y) {
  tipEl.replaceChildren(...lines.map((t, i) => Object.assign(document.createElement(i ? 'span' : 'strong'), { textContent: t })));
  tipEl.hidden = false;
  tipEl.style.left = Math.max(8, Math.min(x + 14, innerWidth - tipEl.offsetWidth - 8)) + 'px';
  tipEl.style.top = Math.max(8, Math.min(y - 10, innerHeight - tipEl.offsetHeight - 8)) + 'px';
}
const hideTip = () => { tipEl.hidden = true; };
const size = el => [Math.max(120, el.clientWidth), Math.max(100, el.clientHeight)];
const mount = (el, w, h, label) => d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img').attr('aria-label', label);

// ---------- Line chart: one or more series ----------
function drawLine(el, data, series, yLabel, yFmt = fmt) {
  el.replaceChildren();
  const [w, h] = size(el), multi = series.length > 1, m = { t: 22, r: multi ? 88 : 22, b: 24, l: 52 };
  const svg = mount(el, w, h, `Line chart of ${yLabel} per year`);
  const years = data.map(d => d.year);
  const x = d3.scaleLinear().domain(years.length > 1 ? d3.extent(years) : [years[0] - 1, years[0] + 1]).range([m.l, w - m.r]);
  const vals = data.flatMap(d => series.map(s => d[s.key])), lo = d3.min(vals), hi = d3.max(vals), pad = (hi - lo) * 0.15 || hi * 0.05;
  const y = d3.scaleLinear().domain([lo - pad, hi + pad]).nice().range([h - m.b, m.t]);
  svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w - m.l - m.r)).tickFormat(''));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickValues(years.filter((_, i) => (w - m.l - m.r) / Math.max(1, years.length - 1) >= 38 || i % 2 === 0)).tickFormat(d3.format('d')).tickSizeOuter(0));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(yFmt).tickSizeOuter(0));
  svg.append('text').attr('class', 'axis-title').attr('x', 6).attr('y', 10).text(yLabel);
  const defs = svg.append('defs');
  series.forEach(s => {
    const color = css(s.color);
    if (!multi && years.length > 1) {
      const g = defs.append('linearGradient').attr('id', 'ag').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
      g.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', .38); g.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);
      svg.append('path').datum(data).attr('fill', 'url(#ag)').attr('d', d3.area().x(d => x(d.year)).y0(h - m.b).y1(d => y(d[s.key])));
    }
    if (years.length > 1) {
      const p = svg.append('path').datum(data).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2.5).attr('stroke-dasharray', multi && s.key === 'bi' ? '7 4' : null).style('filter', `drop-shadow(0 0 5px ${color})`)
        .attr('d', d3.line().x(d => x(d.year)).y(d => y(d[s.key])));
      if (!calm) { const L = p.node().getTotalLength(); p.attr('stroke-dasharray', L).attr('stroke-dashoffset', L).transition().duration(800).attr('stroke-dashoffset', 0).on('end', () => { if (multi && s.key === 'bi') p.attr('stroke-dasharray', '7 4'); else p.attr('stroke-dasharray', null); }); }
    }
    if (multi) { const e = data[data.length - 1]; svg.append('text').attr('class', 'legend-end').attr('x', x(e.year) + 8).attr('y', y(e[s.key]) + 4).attr('fill', color).text(s.label); }
  });
  const guide = svg.append('line').attr('class', 'guide').attr('y1', m.t).attr('y2', h - m.b).style('opacity', 0);
  const dots = series.map(s => svg.append('g').selectAll('circle').data(data).join('circle').attr('cx', d => x(d.year)).attr('cy', d => y(d[s.key]))
    .attr('r', 3.5).attr('fill', css('--bg')).attr('stroke', css(s.color)).attr('stroke-width', 2));
  const tipFor = (d, px, py) => { guide.attr('x1', x(d.year)).attr('x2', x(d.year)).style('opacity', 1); showTip([String(d.year), ...series.map(s => `${s.label}: ${yFmt(d[s.key])}`)], px, py); };
  dots.forEach(set => set.attr('tabindex', 0).on('focus', (ev, d) => { const r = ev.target.getBoundingClientRect(); tipFor(d, r.left, r.top); }).on('blur', () => { hideTip(); guide.style('opacity', 0); }));
  if (!multi) {
    const k = series[0].key, pk = data.reduce((a, b) => (b[k] > a[k] ? b : a));
    svg.append('text').attr('class', 'peak').attr('x', x(pk.year)).attr('y', y(pk[k]) - 9).attr('text-anchor', x(pk.year) > w - 100 ? 'end' : 'middle').text(`Peak ${pk.year}: ${yFmt(pk[k])}`);
    // annotate the biggest fall (more than 2%) so the reader notices it
    const fall = data.slice(1).map((d, i) => ({ d, p: (d[k] - data[i][k]) / data[i][k] * 100 })).filter(o => o.p < -2).sort((a, b) => a.p - b.p)[0];
    if (fall) svg.append('text').attr('class', 'peak fall').attr('x', x(fall.d.year)).attr('y', y(fall.d[k]) + 22).attr('text-anchor', x(fall.d.year) > w - 70 ? 'end' : 'middle').text(`${fall.d.year}: ${d3.format('+.1f')(fall.p)}%`);
  }
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', w - m.l - m.r).attr('height', h - m.t - m.b).attr('fill', 'transparent')
    .on('mousemove', ev => { const d = data.find(q => q.year === Math.round(x.invert(d3.pointer(ev)[0]))); if (d) tipFor(d, ev.clientX, ev.clientY); })
    .on('mouseleave', () => { hideTip(); guide.style('opacity', 0); });
}

// ---------- Year-on-year change ----------
function drawYoY(el, rows, color, label) {
  el.replaceChildren();
  const [w, h] = size(el), m = { t: 14, r: 6, b: 22, l: 40 }, f = d3.format('+.1f');
  const svg = mount(el, w, h, `Bar chart of year-on-year change in ${label}`);
  const x = d3.scaleBand().domain(rows.map(d => d.year)).range([m.l, w - m.r]).padding(0.25);
  const mx = d3.max(rows, d => Math.abs(d.pct)) * 1.35, y = d3.scaleLinear().domain([-mx, mx]).range([h - m.b, m.t]);
  svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w - m.l - m.r)).tickFormat(''));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(v => v + '%').tickSizeOuter(0));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickSize(0).tickFormat(d => '’' + String(d).slice(2))).select('.domain').remove();
  svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', css('--muted'));
  const bars = svg.selectAll('rect').data(rows).join('rect').attr('x', d => x(d.year)).attr('width', x.bandwidth()).attr('rx', 2)
    .attr('fill', d => (d.pct >= 0 ? css(color) : css('--fall'))).attr('tabindex', 0).attr('aria-label', d => `${d.year}: ${f(d.pct)}%`)
    .on('mousemove', (ev, d) => showTip([String(d.year), `${f(d.pct)}% vs ${d.year - 1}`, `${fmt(d.value)} ${label}`], ev.clientX, ev.clientY)).on('mouseleave', hideTip);
  const set = s => s.attr('y', d => Math.min(y(0), y(d.pct))).attr('height', d => Math.abs(y(d.pct) - y(0)));
  bars.attr('y', y(0)).attr('height', 0); calm ? set(bars) : set(bars.transition().duration(600).delay((d, i) => i * 40));
  svg.selectAll('text.val').data(rows).join('text').attr('class', 'val sm').attr('text-anchor', 'middle').attr('x', d => x(d.year) + x.bandwidth() / 2)
    .attr('y', d => (d.pct >= 0 ? y(d.pct) - 4 : y(d.pct) + 11)).text(d => f(d.pct));
}

// ---------- Horizontal bars (selectable) ----------
const SHORT = { 'Heavy transport driver': 'Heavy transp. driver', 'Heavy transport passenger': 'Heavy transp. passenger', 'Heavy transport unknown position': 'Heavy transp. unknown',
  'Pick-up truck or van occupant': 'Pick-up/van occupant', 'Car unknown position': 'Car unknown pos.' };
function drawBars(el, rows, key, label, selected, onPick) {
  el.replaceChildren();
  const [w, h] = size(el), small = w < 520, m = { t: 4, r: 58, b: 22, l: small ? 140 : 200 };
  const svg = mount(el, w, h, label), nm = s => (small ? SHORT[s] || s : s);
  const y = d3.scaleBand().domain(rows.map(d => d.name)).range([m.t, h - m.b]).padding(0.25);
  const x = d3.scaleLinear().domain([0, d3.max(rows, d => d[key])]).nice().range([m.l, w - m.r]);
  svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${m.t})`).call(d3.axisBottom(x).ticks(4).tickSize(h - m.t - m.b).tickFormat('')).select('.domain').remove();
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(4).tickFormat(key === 'avg' ? d3.format('.0f') : d3.format('~s')).tickSizeOuter(0));
  svg.append('g').attr('class', 'axis lab').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).tickFormat(nm).tickSize(0)).select('.domain').remove();
  const vf = key === 'avg' ? d3.format('.1f') : fmt, toggle = d => onPick(d.name === selected ? null : d.name);
  const bars = svg.selectAll('rect.bar').data(rows).join('rect').attr('class', 'bar').attr('x', m.l).attr('y', d => y(d.name)).attr('height', y.bandwidth()).attr('rx', 3)
    .attr('width', calm ? d => x(d[key]) - m.l : 0).attr('fill', css(MCOL[key])).attr('stroke', d => (d.name === selected ? css('--text') : 'none')).attr('stroke-width', 2).attr('opacity', d => (selected && d.name !== selected ? 0.4 : 1))
    .attr('tabindex', 0).attr('role', 'button').attr('aria-label', d => `${d.name}: ${vf(d[key])}`).style('cursor', 'pointer')
    .on('mousemove', (ev, d) => showTip([d.name, `${label}: ${vf(d[key])}`], ev.clientX, ev.clientY)).on('mouseleave', hideTip)
    .on('click', (ev, d) => toggle(d)).on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(d); } });
  if (!calm) bars.transition().duration(500).attr('width', d => x(d[key]) - m.l);
  svg.selectAll('text.val').data(rows).join('text').attr('class', 'val sm').attr('x', d => x(d[key]) + 5).attr('y', d => y(d.name) + y.bandwidth() / 2 + 3.5).text(d => vf(d[key]));
}

// ---------- Bubble chart ----------
function drawBubble(el, rows, selected, onPick) {
  el.replaceChildren();
  const [w, h] = size(el), m = { t: 12, r: 14, b: 34, l: 34 };
  const svg = mount(el, w, h, 'Bubble chart of cases against bed days per case');
  const x = d3.scaleLog().domain([300, 200000]).range([m.l, w - m.r]), y = d3.scaleLinear().domain([0, d3.max(rows, d => d.avg) * 1.2]).range([h - m.b, m.t]);
  const r = d3.scaleSqrt().domain([0, d3.max(rows, d => d.beds)]).range([4, Math.max(14, Math.min(28, h / 8))]);
  svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w - m.l - m.r)).tickFormat('')).select('.domain').remove();
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickValues([1000, 10000, 100000]).tickFormat(d3.format(',')).tickSizeOuter(0));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSizeOuter(0));
  svg.append('text').attr('class', 'axis-title').attr('x', (m.l + w - m.r) / 2).attr('y', h - 4).attr('text-anchor', 'middle').text('Cases (log scale)');
  svg.append('text').attr('class', 'axis-title').attr('transform', `translate(9,${(m.t + h - m.b) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('Bed days per case');
  const sorted = [...rows].sort((a, b) => b.beds - a.beds), pick = d => onPick(d.name === selected ? null : d.name);
  svg.selectAll('circle').data(sorted).join('circle').attr('cx', d => x(d.cases)).attr('cy', d => y(d.avg)).attr('r', calm ? d => r(d.beds) : 0)
    .attr('fill', css('--m-cases')).attr('fill-opacity', d => (selected && d.name !== selected ? .20 : .70))
    .attr('stroke', d => (d.name === selected ? css('--text') : css('--m-cases'))).attr('stroke-width', d => (d.name === selected ? 2.5 : 1.3))
    .attr('tabindex', 0).attr('role', 'button').attr('aria-label', d => `${d.name}: ${fmt(d.cases)} cases, ${d.avg.toFixed(1)} bed days per case`).style('cursor', 'pointer')
    .on('mousemove', (ev, d) => showTip([d.name, `${fmt(d.cases)} cases`, `${d.avg.toFixed(1)} bed days per case`, `${fmt(d.beds)} bed days`], ev.clientX, ev.clientY)).on('mouseleave', hideTip)
    .on('click', (ev, d) => pick(d)).on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(d); } })
    .call(s => { if (!calm) s.transition().duration(600).delay((d, i) => i * 30).attr('r', d => r(d.beds)); });
  svg.selectAll('text.blab').data(sorted.slice(0, 3).concat(sorted.filter(d => d.name === selected && !sorted.slice(0, 3).includes(d)))).join('text').attr('class', 'blab')
    .attr('x', d => x(d.cases)).attr('y', d => y(d.avg) - r(d.beds) - 4).attr('text-anchor', d => (x(d.cases) > w - 70 ? 'end' : 'middle')).text(d => d.name);
}

// ---------- Donut with legend on the right ----------
function drawDonut(el, rows, selected, onPick) {
  el.replaceChildren();
  const [w, h] = size(el), total = d3.sum(rows, d => d.cases), top = [...rows].sort((a, b) => b.cases - a.cases);
  const slices = top.slice(0, 5).map((d, i) => ({ name: d.name, cases: d.cases, color: css(PAL[i]) }));
  const rest = top.slice(5), restSel = rest.some(d => d.name === selected);
  slices.push({ name: 'All others', cases: d3.sum(rest, d => d.cases), color: css('--neutral'), other: true });
  const R = Math.max(40, Math.min(h / 2 - 8, w * 0.21)), cx = R + 8, cy = h / 2;
  const svg = mount(el, w, h, 'Donut chart of share of cases by road user'), g = svg.append('g').attr('transform', `translate(${cx},${cy})`);
  const arc = d3.arc().innerRadius(R * 0.62).outerRadius(R), pie = d3.pie().sort(null).value(d => d.cases).padAngle(0.02);
  const on = d => d.name === selected || (d.other && restSel), pick = d => { if (!d.other) onPick(d.name === selected ? null : d.name); };
  const tipTxt = d => [d.name, `${fmt(d.cases)} cases`, `${(d.cases / total * 100).toFixed(1)}% of all cases`];
  const paths = g.selectAll('path').data(pie(slices)).join('path').attr('fill', d => d.data.color).attr('stroke', css('--bg')).attr('stroke-width', 2)
    .attr('opacity', d => (selected && !on(d.data) ? .35 : 1)).attr('tabindex', d => (d.data.other ? null : 0)).attr('role', 'button').attr('aria-label', d => tipTxt(d.data).join(', '))
    .style('cursor', d => (d.data.other ? 'default' : 'pointer'))
    .attr('transform', d => { if (!on(d.data)) return null; const [a, b] = arc.centroid(d), k = 6 / Math.hypot(a, b); return `translate(${a * k},${b * k})`; })
    .on('mousemove', (ev, d) => showTip(tipTxt(d.data), ev.clientX, ev.clientY)).on('mouseleave', hideTip)
    .on('click', (ev, d) => pick(d.data)).on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(d.data); } });
  paths.attr('d', calm ? arc : null);
  if (!calm) paths.transition().duration(700).attrTween('d', d => { const i = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d); return t => arc(i(t)); });
  const sel = rows.find(d => d.name === selected);
  g.append('text').attr('class', 'donut-big').attr('text-anchor', 'middle').attr('y', 4).text(sel ? (sel.cases / total * 100).toFixed(1) + '%' : fmt(total));
  g.append('text').attr('class', 'axis-title').attr('text-anchor', 'middle').attr('y', 18).text(sel ? (sel.name.length > 14 ? 'selected' : sel.name) : 'cases');
  const lx = cx + R + 16, gap = Math.min(24, (h - 12) / slices.length), ly = cy - (gap * slices.length) / 2 + 2;
  slices.forEach((s, i) => {
    const row = svg.append('g').attr('transform', `translate(${lx},${ly + i * gap})`);
    row.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', s.color);
    row.append('text').attr('class', 'lg').attr('x', 16).attr('y', 9).text(s.name);
    row.append('text').attr('class', 'lg').attr('x', w - lx - 4).attr('y', 9).attr('text-anchor', 'end').text((s.cases / total * 100).toFixed(1) + '%');
  });
}
