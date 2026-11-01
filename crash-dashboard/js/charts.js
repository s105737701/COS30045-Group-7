// D3 charts. main.js calls these and passes in the data. (effects.js defines `calm`.)
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const fmt = d3.format(',');
const tipEl = document.getElementById('tip');
const PAL = ['--c1', '--c2', '--c3', '--c4', '--c5'];

function showTip(lines, x, y) {
  tipEl.replaceChildren(...lines.map((t, i) => Object.assign(document.createElement(i ? 'span' : 'strong'), { textContent: t })));
  tipEl.hidden = false;
  tipEl.style.left = Math.min(x + 14, innerWidth - tipEl.offsetWidth - 8) + 'px';
  tipEl.style.top = Math.max(8, y - 10) + 'px';
}
const hideTip = () => { tipEl.hidden = true; };
const mount = (el, h, label) => d3.select(el).append('svg').attr('viewBox', `0 0 ${el.clientWidth} ${h}`).attr('role', 'img').attr('aria-label', label);

// ---------- Line chart: one or more series, hover guide, peak label ----------
function drawLine(el, data, series, yLabel, yFmt = fmt) {
  el.replaceChildren();
  const w = el.clientWidth, h = Math.max(300, Math.min(430, w * 0.45)), multi = series.length > 1;
  const m = { t: 28, r: multi ? 120 : 28, b: 38, l: 66 };
  const svg = mount(el, h, `Line chart of ${yLabel} per year`);
  const years = data.map(d => d.year);
  const x = d3.scaleLinear().domain(years.length > 1 ? d3.extent(years) : [years[0] - 1, years[0] + 1]).range([m.l, w - m.r]);
  const vals = data.flatMap(d => series.map(s => d[s.key]));
  const lo = d3.min(vals), hi = d3.max(vals), pad = (hi - lo) * 0.15 || hi * 0.05;
  const y = d3.scaleLinear().domain([lo - pad, hi + pad]).nice().range([h - m.b, m.t]);

  svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickSize(-(w - m.l - m.r)).tickFormat(''));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickValues(years).tickFormat(d3.format('d')).tickSizeOuter(0));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickFormat(yFmt).tickSizeOuter(0));
  svg.append('text').attr('class', 'axis-title').attr('x', 14).attr('y', m.t - 12).text(yLabel);

  const defs = svg.append('defs');
  series.forEach((s, i) => {
    const color = css(s.color);
    if (!multi && years.length > 1) {
      const g = defs.append('linearGradient').attr('id', 'ag').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
      g.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', .38);
      g.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0);
      svg.append('path').datum(data).attr('fill', 'url(#ag)').attr('d', d3.area().x(d => x(d.year)).y0(h - m.b).y1(d => y(d[s.key])));
    }
    if (years.length > 1) {
      const p = svg.append('path').datum(data).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 3)
        .style('filter', `drop-shadow(0 0 6px ${color})`).attr('d', d3.line().x(d => x(d.year)).y(d => y(d[s.key])));
      if (!calm) { const L = p.node().getTotalLength(); p.attr('stroke-dasharray', L).attr('stroke-dashoffset', L).transition().duration(900).attr('stroke-dashoffset', 0); }
    }
    if (multi) { const e = data[data.length - 1]; svg.append('text').attr('class', 'legend-end').attr('x', x(e.year) + 10).attr('y', y(e[s.key]) + 4).attr('fill', color).text(s.label); }
  });

  const guide = svg.append('line').attr('class', 'guide').attr('y1', m.t).attr('y2', h - m.b).style('opacity', 0);
  const dots = series.map(s => svg.append('g').selectAll('circle').data(data).join('circle')
    .attr('cx', d => x(d.year)).attr('cy', d => y(d[s.key])).attr('r', 4.5).attr('fill', css('--bg'))
    .attr('stroke', css(s.color)).attr('stroke-width', 2.5));
  const tipFor = (d, px, py) => { guide.attr('x1', x(d.year)).attr('x2', x(d.year)).style('opacity', 1); showTip([String(d.year), ...series.map(s => `${s.label}: ${yFmt(d[s.key])}`)], px, py); };
  dots.forEach(set => set.attr('tabindex', 0).on('focus', (ev, d) => { const r = ev.target.getBoundingClientRect(); tipFor(d, r.left, r.top); }).on('blur', () => { hideTip(); guide.style('opacity', 0); }));

  if (!multi) {
    const k = series[0].key, pk = data.reduce((a, b) => (b[k] > a[k] ? b : a));
    svg.append('text').attr('class', 'peak').attr('x', x(pk.year)).attr('y', y(pk[k]) - 14)
      .attr('text-anchor', x(pk.year) > w - 120 ? 'end' : 'middle').text(`Peak ${pk.year}: ${yFmt(pk[k])}`);
  }
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', w - m.l - m.r).attr('height', h - m.t - m.b).attr('fill', 'transparent')
    .on('mousemove', ev => { const yr = Math.round(x.invert(d3.pointer(ev)[0])); const d = data.find(q => q.year === yr); if (d) tipFor(d, ev.clientX, ev.clientY); })
    .on('mouseleave', () => { hideTip(); guide.style('opacity', 0); });
}

// ---------- Year-on-year change: bars up or down from zero ----------
function drawYoY(el, rows) {
  el.replaceChildren();
  const w = el.clientWidth, h = Math.max(260, Math.min(340, w * .34)), m = { t: 26, r: 20, b: 36, l: 62 };
  const svg = mount(el, h, 'Bar chart of year-on-year change in cases');
  const x = d3.scaleBand().domain(rows.map(d => d.year)).range([m.l, w - m.r]).padding(0.3);
  const mx = d3.max(rows, d => Math.abs(d.pct)) * 1.3;
  const y = d3.scaleLinear().domain([-mx, mx]).range([h - m.b, m.t]);
  const f = d3.format('+.1f');
  svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat(''));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(v => f(v) + '%').tickSizeOuter(0));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickSize(0)).select('.domain').remove();
  svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', css('--muted')).attr('stroke-width', 1.2);
  const bars = svg.selectAll('rect').data(rows).join('rect').attr('x', d => x(d.year)).attr('width', x.bandwidth()).attr('rx', 3)
    .attr('fill', d => (d.pct >= 0 ? css('--positive') : css('--negative'))).attr('tabindex', 0).attr('aria-label', d => `${d.year}: ${f(d.pct)}%`)
    .on('mousemove', (ev, d) => showTip([String(d.year), `${f(d.pct)}% vs ${d.year - 1}`, `${fmt(d.cases)} cases`], ev.clientX, ev.clientY)).on('mouseleave', hideTip);
  bars.attr('y', y(0)).attr('height', 0);
  const set = s => s.attr('y', d => Math.min(y(0), y(d.pct))).attr('height', d => Math.abs(y(d.pct) - y(0)));
  calm ? set(bars) : set(bars.transition().duration(700).delay((d, i) => i * 50));
  svg.selectAll('text.val').data(rows).join('text').attr('class', 'val').attr('text-anchor', 'middle')
    .attr('x', d => x(d.year) + x.bandwidth() / 2).attr('y', d => (d.pct >= 0 ? y(d.pct) - 6 : y(d.pct) + 15)).text(d => f(d.pct));
}

// ---------- Horizontal bars (selectable) ----------
function drawBars(el, rows, key, label, selected, onPick) {
  el.replaceChildren();
  const w = el.clientWidth, small = w < 560, rowH = 34, m = { t: 8, r: 70, b: 34, l: small ? 150 : 205 };
  const h = m.t + m.b + rowH * rows.length;
  const short = s => (small ? s.replace('Heavy transport', 'Heavy transp.').replace('Pick-up truck or van', 'Pick-up/van').replace('unknown position', 'unknown pos.') : s);
  const svg = mount(el, h, label);
  const y = d3.scaleBand().domain(rows.map(d => d.name)).range([m.t, h - m.b]).padding(0.28);
  const x = d3.scaleLinear().domain([0, d3.max(rows, d => d[key])]).nice().range([m.l, w - m.r]);
  svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${m.t})`).call(d3.axisBottom(x).ticks(5).tickSize(h - m.t - m.b).tickFormat('')).select('.domain').remove();
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(5).tickFormat(key === 'avg' ? d3.format('.0f') : d3.format('~s')).tickSizeOuter(0));
  svg.append('g').attr('class', 'axis lab').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).tickFormat(short).tickSize(0)).select('.domain').remove();
  const vf = key === 'avg' ? d3.format('.1f') : fmt, toggle = d => onPick(d.name === selected ? null : d.name);
  const bars = svg.selectAll('rect.bar').data(rows).join('rect').attr('class', 'bar')
    .attr('x', m.l).attr('y', d => y(d.name)).attr('height', y.bandwidth()).attr('rx', 3).attr('width', calm ? d => x(d[key]) - m.l : 0)
    .attr('fill', d => (d.name === selected ? css('--glow') : css('--crimson'))).attr('opacity', d => (selected && d.name !== selected ? 0.4 : 1))
    .attr('tabindex', 0).attr('role', 'button').attr('aria-label', d => `${d.name}: ${vf(d[key])}`).style('cursor', 'pointer')
    .on('mousemove', (ev, d) => showTip([d.name, `${label}: ${vf(d[key])}`], ev.clientX, ev.clientY)).on('mouseleave', hideTip)
    .on('click', (ev, d) => toggle(d)).on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(d); } });
  if (!calm) bars.transition().duration(600).attr('width', d => x(d[key]) - m.l);
  svg.selectAll('text.val').data(rows).join('text').attr('class', 'val').attr('x', d => x(d[key]) + 8).attr('y', d => y(d.name) + y.bandwidth() / 2 + 4).text(d => vf(d[key]));
}

// ---------- Bubble chart: cases (log) vs bed days per case, size = bed days ----------
function drawBubble(el, rows, selected, onPick) {
  el.replaceChildren();
  const w = el.clientWidth, h = Math.max(340, Math.min(460, w * 0.7)), m = { t: 20, r: 26, b: 50, l: 56 };
  const svg = mount(el, h, 'Bubble chart of cases against bed days per case');
  const x = d3.scaleLog().domain([300, 200000]).range([m.l, w - m.r]);
  const y = d3.scaleLinear().domain([0, d3.max(rows, d => d.avg) * 1.15]).range([h - m.b, m.t]);
  const r = d3.scaleSqrt().domain([0, d3.max(rows, d => d.beds)]).range([4, w < 480 ? 20 : 30]);
  const xt = [1000, 10000, 100000];
  svg.append('g').attr('class', 'grid').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat('')).select('.domain').remove();
  svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickValues(xt).tickFormat(d3.format(',')).tickSizeOuter(0));
  svg.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));
  svg.append('text').attr('class', 'axis-title').attr('x', (m.l + w - m.r) / 2).attr('y', h - 8).attr('text-anchor', 'middle').text('Cases (log scale)');
  svg.append('text').attr('class', 'axis-title').attr('transform', `translate(14,${(m.t + h - m.b) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('Bed days per case');
  const sorted = [...rows].sort((a, b) => b.beds - a.beds), pick = d => onPick(d.name === selected ? null : d.name);
  svg.selectAll('circle').data(sorted).join('circle').attr('cx', d => x(d.cases)).attr('cy', d => y(d.avg)).attr('r', calm ? d => r(d.beds) : 0)
    .attr('fill', d => (d.name === selected ? css('--glow') : css('--crimson'))).attr('fill-opacity', d => (selected && d.name !== selected ? .2 : .55))
    .attr('stroke', d => (d.name === selected ? '#fff' : css('--glow'))).attr('stroke-width', d => (d.name === selected ? 3 : 1.5))
    .attr('tabindex', 0).attr('role', 'button').attr('aria-label', d => `${d.name}: ${fmt(d.cases)} cases, ${d.avg.toFixed(1)} bed days per case`).style('cursor', 'pointer')
    .on('mousemove', (ev, d) => showTip([d.name, `${fmt(d.cases)} cases`, `${d.avg.toFixed(1)} bed days per case`, `${fmt(d.beds)} bed days`], ev.clientX, ev.clientY)).on('mouseleave', hideTip)
    .on('click', (ev, d) => pick(d)).on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(d); } })
    .call(s => { if (!calm) s.transition().duration(700).delay((d, i) => i * 40).attr('r', d => r(d.beds)); });
  svg.selectAll('text.blab').data(sorted.filter(d => r(d.beds) > 16 || d.name === selected)).join('text').attr('class', 'blab')
    .attr('x', d => x(d.cases)).attr('y', d => y(d.avg) - r(d.beds) - 6).attr('text-anchor', d => (x(d.cases) > w - 90 ? 'end' : 'middle')).text(d => d.name);
}

// ---------- Donut: top five road users plus "all others" ----------
function drawDonut(el, rows, selected, onPick) {
  el.replaceChildren();
  const total = d3.sum(rows, d => d.cases), top = [...rows].sort((a, b) => b.cases - a.cases);
  const slices = top.slice(0, 5).map((d, i) => ({ name: d.name, cases: d.cases, color: css(PAL[i]) }));
  const rest = top.slice(5), restSel = rest.some(d => d.name === selected);
  slices.push({ name: 'All others', cases: d3.sum(rest, d => d.cases), color: css('--c6'), other: true });
  const w = el.clientWidth, R = Math.min(w / 2 - 12, 130), cy = R + 14, h = cy + R + 18 + slices.length * 24;
  const svg = mount(el, h, 'Donut chart of share of cases by road user'), g = svg.append('g').attr('transform', `translate(${w / 2},${cy})`);
  const arc = d3.arc().innerRadius(R * 0.62).outerRadius(R), pie = d3.pie().sort(null).value(d => d.cases).padAngle(0.02);
  const on = d => d.name === selected || (d.other && restSel), pick = d => { if (!d.other) onPick(d.name === selected ? null : d.name); };
  const tipTxt = d => [d.name, `${fmt(d.cases)} cases`, `${(d.cases / total * 100).toFixed(1)}% of all cases`];
  const paths = g.selectAll('path').data(pie(slices)).join('path').attr('fill', d => d.data.color).attr('stroke', css('--bg')).attr('stroke-width', 2)
    .attr('opacity', d => (selected && !on(d.data) ? .35 : 1)).attr('tabindex', d => (d.data.other ? null : 0)).attr('role', 'button').attr('aria-label', d => tipTxt(d.data).join(', '))
    .style('cursor', d => (d.data.other ? 'default' : 'pointer'))
    .attr('transform', d => { if (!on(d.data)) return null; const [cx, cyy] = arc.centroid(d); const k = 8 / Math.hypot(cx, cyy); return `translate(${cx * k},${cyy * k})`; })
    .on('mousemove', (ev, d) => showTip(tipTxt(d.data), ev.clientX, ev.clientY)).on('mouseleave', hideTip)
    .on('click', (ev, d) => pick(d.data)).on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(d.data); } });
  paths.attr('d', calm ? arc : null);
  if (!calm) paths.transition().duration(800).attrTween('d', d => { const i = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d); return t => arc(i(t)); });
  const sel = rows.find(d => d.name === selected);
  g.append('text').attr('class', 'donut-big').attr('text-anchor', 'middle').attr('y', 2).text(sel ? (sel.cases / total * 100).toFixed(1) + '%' : fmt(total));
  g.append('text').attr('class', 'axis-title').attr('text-anchor', 'middle').attr('y', 22).text(sel ? sel.name : 'cases in total');
  const lg = svg.append('g').attr('transform', `translate(${Math.max(8, w / 2 - 150)},${cy + R + 22})`);
  slices.forEach((s, i) => {
    const row = lg.append('g').attr('transform', `translate(0,${i * 24})`);
    row.append('rect').attr('width', 12).attr('height', 12).attr('rx', 3).attr('fill', s.color);
    row.append('text').attr('class', 'lg').attr('x', 20).attr('y', 11).text(s.name);
    row.append('text').attr('class', 'lg').attr('x', 300).attr('y', 11).attr('text-anchor', 'end').text((s.cases / total * 100).toFixed(1) + '%');
  });
}
