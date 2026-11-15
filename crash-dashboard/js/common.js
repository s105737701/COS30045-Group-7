// GenAI declaration: written with the assistance of Claude (Anthropic); reviewed and adapted by the team.
// Shared by the pages that use data: loads and checks the two CSV files, and small helpers.
const FALLBACK = { // used if the CSV files can't be fetched (e.g. a page opened by double-clicking)
  years: [[2011,34294,155959],[2012,34270,152781],[2013,35217,146795],[2014,35729,144160],[2015,37325,183089],[2016,39231,219157],[2017,39541,212620],[2018,39787,208714],[2019,40060,208889],[2020,38054,187793],[2021,39505,198934]],
  roads: [['Bus occupant',2602,13061],['Car driver',135733,615717],['Car passenger',53577,255987],['Car unknown position',8880,57072],['Heavy transport driver',4630,27056],['Heavy transport passenger',554,3154],['Heavy transport unknown position',447,2996],['Motorcyclist',92642,504102],['Other or unknown',6367,37610],['Pedal cyclist',75486,222501],['Pedestrian',29093,262180],['Pick-up truck or van occupant',3002,17455]]
};
const pct = (a, b) => ((b - a) / a * 100);
const sign = n => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(1) + '%';
const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls || '', textContent: text || '' });
const $ = id => document.getElementById(id);

async function loadData() {
  let raw;
  try {
    const [r, y] = await Promise.all([d3.csv('data/Road_User_Statistics.csv', d3.autoType), d3.csv('data/Yearly_Statistics.csv', d3.autoType)]);
    raw = { roads: r.map(d => ({ name: d.Road_User, cases: d.Total_Hospitalisation_Cases, beds: d.Total_Bed_Days })),
            years: y.map(d => ({ year: d.Year, cases: d.Total_Cases, beds: d.Total_Bed_Days })) };
  } catch (e) {
    raw = { roads: FALLBACK.roads.map(([name, cases, beds]) => ({ name, cases, beds })), years: FALLBACK.years.map(([year, cases, beds]) => ({ year, cases, beds })) };
  }
  // edge cases: drop rows with missing or non-numeric values instead of letting them break the charts
  const ok = v => Number.isFinite(v) && v >= 0;
  const roads = raw.roads.filter(d => d.name && ok(d.cases) && ok(d.beds) && d.cases > 0);
  const years = raw.years.filter(d => ok(d.year) && ok(d.cases) && ok(d.beds) && d.cases > 0).sort((a, b) => a.year - b.year);
  if (roads.length < 2 || years.length < 2) {
    document.querySelectorAll('.chart, .tbl').forEach(c => { c.textContent = 'We could not load the data. Check that the data folder sits next to this page.'; });
    return null;
  }
  roads.forEach(d => (d.avg = d.beds / d.cases)); years.forEach(d => (d.avg = d.beds / d.cases));
  const totalCases = d3.sum(roads, d => d.cases), totalBeds = d3.sum(roads, d => d.beds);
  return { roads, years, totalCases, totalBeds, overallAvg: totalBeds / totalCases, first: years[0], last: years[years.length - 1],
    skipped: raw.roads.length - roads.length + raw.years.length - years.length,
    match: d3.sum(years, d => d.cases) === totalCases && d3.sum(years, d => d.beds) === totalBeds };
}

// redraw when the window size changes
function onResize(fn) {
  let t, last = '';
  new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { const s = `${innerWidth}x${innerHeight}`; if (s !== last) { last = s; fn(); } }, 150); }).observe(document.body);
  fn();
}
// segmented buttons: mark the chosen one (visually and for screen readers)
function segPick(group, btn) { group.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b === btn); b.setAttribute('aria-pressed', b === btn); }); }
