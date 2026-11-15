// GenAI declaration: written with the assistance of Claude (Anthropic); reviewed and adapted by the team.
// Year by year page: change from the previous year, and average stay per case.
loadData().then(D => {
  if (!D) return;
  const { years, first, last } = D;
  let key = 'cases';
  const META = { cases: { label: 'cases', color: '--m-cases' }, beds: { label: 'bed days', color: '--m-beds' } };
  const rows = k => years.slice(1).map((d, i) => ({ year: d.year, value: d[k], pct: pct(years[i][k], d[k]) }));

  const drawYoYPanel = () => {
    const m = META[key], r = rows(key), up = r.reduce((a, b) => (b.pct > a.pct ? b : a)), down = r.reduce((a, b) => (b.pct < a.pct ? b : a));
    $('yoy-sub').textContent = `Change in ${m.label} compared with the year before. Measure-coloured bars above zero are rises; neutral bars below zero are falls. Signed percentage labels also show direction.`;
    drawYoY($('yoy-chart'), r, m.color, m.label);
    $('yoy-take').textContent = `Biggest rise: ${up.year} (${sign(up.pct)}).` + (down.pct < 0 ? ` Biggest fall: ${down.year} (${sign(down.pct)}). The data alone does not tell us why.` : ' There were no falls.');
  };
  $('yoy-metric').querySelectorAll('button').forEach(b => b.onclick = () => { key = b.dataset.m; segPick($('yoy-metric'), b); drawYoYPanel(); });

  const drawStay = () => {
    const pk = years.reduce((a, b) => (b.avg > a.avg ? b : a));
    drawLine($('stay-chart'), years, [{ key: 'avg', label: 'Bed days per case', color: '--m-avg' }], 'Bed days per case', d3.format('.1f'));
    $('stay-take').textContent = `The average stay went from ${first.avg.toFixed(1)} to ${last.avg.toFixed(1)} bed days per case (${sign(pct(first.avg, last.avg))}), peaking in ${pk.year} at ${pk.avg.toFixed(1)}.`;
  };
  onResize(() => { drawYoYPanel(); drawStay(); });
});
