// GenAI declaration: written with the assistance of Claude (Anthropic); reviewed and adapted by the team.
// Compare page: share of cases (donut) and a head to head of any two road users.
loadData().then(D => {
  if (!D) return;
  const { roads, totalCases } = D;
  const ha = $('h-a'), hb = $('h-b'), by = n => roads.find(r => r.name === n);
  [ha, hb].forEach(s => s.append(...roads.map(r => new Option(r.name, r.name))));
  const wanted = new URLSearchParams(location.search).get('a');   // the overview page links here with ?a=Road user
  ha.value = by(wanted) ? wanted : (by('Pedestrian') ? 'Pedestrian' : roads[0].name);
  const other = n => (by('Car driver') && n !== 'Car driver' ? 'Car driver' : roads.find(r => r.name !== n).name);
  hb.value = other(ha.value);

  const H = [['cases', 'Cases', fmt], ['beds', 'Bed days', fmt], ['avg', 'Bed days per case', d3.format('.1f')]];
  const drawH2H = () => {
    const A = by(ha.value), B = by(hb.value), box = $('h2h-rows'); box.replaceChildren();
    const head = el('div', 'h2h-names'); head.append(el('strong', '', A.name), el('strong', '', B.name)); box.append(head);
    H.forEach(([k, label, f]) => {
      const mx = Math.max(A[k], B[k]), row = el('div', 'h2h-row m-' + k), bars = el('div', 'bars'), l = el('div', 'l'), r = el('div', 'r'), li = el('i'), ri = el('i');
      li.style.width = ri.style.width = '0%'; l.append(li); r.append(ri); bars.append(l, r);
      if (A[k] >= B[k]) l.classList.add('win'); if (B[k] >= A[k]) r.classList.add('win');
      row.append(el('span', 'name', label), el('span', 'v', f(A[k])), bars, el('span', 'v', f(B[k]))); box.append(row);
      requestAnimationFrame(() => requestAnimationFrame(() => { li.style.width = (A[k] / mx * 100) + '%'; ri.style.width = (B[k] / mx * 100) + '%'; }));
    });
    if (A.name === B.name) { $('h2h-note').textContent = 'Pick two different road users to compare.'; return; }
    const [hi, lo] = A.cases >= B.cases ? [A, B] : [B, A], [lg, sh] = A.avg >= B.avg ? [A, B] : [B, A];
    $('h2h-note').textContent = `${hi.name} has ${(hi.cases / lo.cases).toFixed(1)}× the cases of ${lo.name}, but ${lg.name} stays ${(lg.avg - sh.avg).toFixed(1)} bed days longer per case.`;
  };
  const drawDonutPanel = () => {
    const A = by(ha.value);
    drawDonut($('donut-chart'), roads, A.name, n => { if (!n) return; ha.value = n; if (hb.value === n) hb.value = other(n); refresh(); });
    $('donut-take').textContent = `${A.name} makes up ${(A.cases / totalCases * 100).toFixed(1)}% of all hospitalised cases.`;
  };
  const refresh = () => { drawDonutPanel(); drawH2H(); };
  ha.onchange = hb.onchange = refresh;
  onResize(refresh);
});
