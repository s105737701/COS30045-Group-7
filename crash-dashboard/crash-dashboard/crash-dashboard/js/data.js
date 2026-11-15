// GenAI declaration: written with the assistance of Claude (Anthropic); reviewed and adapted by the team.
// Data page: sortable table and a check that the two data files agree.
loadData().then(D => {
  if (!D) return;
  const { roads, totalCases, totalBeds } = D;
  let sortKey = 'cases', sortDir = -1, picked = null;
  $('data-check').textContent = (D.match
    ? `Check passed: the road user file and the yearly file both total ${fmt(totalCases)} cases and ${fmt(totalBeds)} bed days.`
    : 'Warning: the road user file and the yearly file do not add up to the same totals.')
    + (D.skipped ? ` ${D.skipped} row(s) with missing or invalid values were skipped.` : '');

  const COLS = [['name', 'Road user'], ['cases', 'Cases'], ['share', 'Share of cases'], ['beds', 'Bed days'], ['avg', 'Bed days per case']];
  const draw = () => {
    const val = (d, k) => (k === 'share' ? d.cases : d[k]);
    const rows = [...roads].sort((a, b) => (sortKey === 'name' ? a.name.localeCompare(b.name) : val(a, sortKey) - val(b, sortKey)) * sortDir);
    const head = $('tbl').tHead; head.replaceChildren(); const tr = head.insertRow();
    COLS.forEach(([k, label]) => {
      const th = document.createElement('th'), b = el('button', '', label + (k === sortKey ? (sortDir < 0 ? ' ▼' : ' ▲') : ''));
      th.setAttribute('aria-sort', k === sortKey ? (sortDir < 0 ? 'descending' : 'ascending') : 'none');
      b.type = 'button'; b.onclick = () => { sortDir = k === sortKey ? -sortDir : (k === 'name' ? 1 : -1); sortKey = k; draw(); }; th.append(b); tr.append(th);
    });
    const body = $('tbl').tBodies[0]; body.replaceChildren();
    const mx = { cases: d3.max(roads, d => d.cases), beds: d3.max(roads, d => d.beds), avg: d3.max(roads, d => d.avg) };
    rows.forEach(d => {
      const r = body.insertRow(); r.tabIndex = 0; r.className = d.name === picked ? 'sel' : '';
      r.onclick = () => { picked = d.name === picked ? null : d.name; draw(); }; r.onkeydown = e => { if (e.key === 'Enter') r.onclick(); };
      r.insertCell().textContent = d.name;
      [['cases', fmt(d.cases)], ['share', (d.cases / totalCases * 100).toFixed(1) + '%'], ['beds', fmt(d.beds)], ['avg', d.avg.toFixed(1)]].forEach(([k, txt]) => {
        const c = r.insertCell(); c.textContent = txt; if (mx[k]) { c.className = 'db'; c.style.setProperty('--w', (d[k] / mx[k] * 100) + '%'); }
      });
    });
  };
  draw();
});
