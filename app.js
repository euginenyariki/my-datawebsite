/* DataLens — parse and explore CSV locally. No uploads, no dependencies. */
const KEY = 'datalens:csv:v1';
const sampleCsv = `Date,Region,Product,Units,Unit Price,Revenue
2026-11-01,Westlands,Coffee,42,350,14700
2026-11-01,Kilimani,Tea,31,280,8680
2026-11-02,Westlands,Sandwich,28,480,13440
2026-11-02,Thika,Coffee,19,350,6650
2026-11-03,Kilimani,Cake,14,650,9100
2026-11-03,Ngong,Coffee,37,350,12950
2026-11-04,Westlands,Tea,45,280,12600
2026-11-04,Thika,Sandwich,22,480,10560
2026-11-05,Kilimani,Coffee,51,350,17850
2026-11-05,Ngong,Cake,11,650,7150
2026-11-06,Westlands,Cake,17,650,11050
2026-11-06,Thika,Tea,29,280,8120
2026-11-07,Kilimani,Sandwich,34,480,16320
2026-11-07,Ngong,Coffee,44,350,15400
2026-11-08,Westlands,Coffee,39,350,13650
2026-11-08,Thika,Cake,13,650,8450
2026-11-09,Ngong,Tea,26,280,7280
2026-11-09,Kilimani,Cake,21,650,13650
2026-11-10,Westlands,Sandwich,30,480,14400
2026-11-10,Thika,Coffee,23,350,8050`;

let headers = [], rows = [], fileName = 'Sample: Nairobi cafe sales';
let sortCol = -1, sortDir = 1, limit = 25;

function parseCsv(text) {
  const out = []; let row = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field.trim()); field = ''; }
    else if (c === '\n') { row.push(field.trim()); if (row.some(x => x !== '')) out.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  row.push(field.trim()); if (row.some(x => x !== '')) out.push(row);
  return out;
}
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function isNum(i) { return rows.length > 0 && rows.slice(0, 30).every(r => r[i] !== '' && !Number.isNaN(Number(r[i]))); }
function fmt(n) { return Number(n).toLocaleString('en-KE', { maximumFractionDigits: 2 }); }
function toast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); }
function numericColumns() { return headers.map((h, i) => [h, i]).filter(([, i]) => isNum(i)); }

function setData(csv, name) {
  const parsed = parseCsv(csv);
  if (parsed.length < 2 || parsed[0].length < 2) { toast('That CSV needs a header row and at least one data row'); return; }
  headers = parsed[0]; rows = parsed.slice(1).map(r => { const copy = [...r]; while (copy.length < headers.length) copy.push(''); return copy.slice(0, headers.length); });
  fileName = name; sortCol = -1; sortDir = 1; limit = 25;
  document.getElementById('fileName').textContent = name;
  try { localStorage.setItem(KEY, JSON.stringify({ csv, name })); } catch (_) {}
  const sel = document.getElementById('chartCol');
  sel.innerHTML = numericColumns().map(([h, i]) => `<option value="${i}">${esc(h)}</option>`).join('');
  render(); toast(`Loaded ${rows.length} rows · ${headers.length} columns`);
}

function filtered() {
  const q = (document.getElementById('search').value || '').toLowerCase().trim();
  let list = rows.map((r, idx) => ({ r, idx }));
  if (q) list = list.filter(({ r }) => r.join(' ').toLowerCase().includes(q));
  if (sortCol >= 0) list.sort((a, b) => {
    const x = a.r[sortCol], y = b.r[sortCol];
    const cmp = isNum(sortCol) ? Number(x) - Number(y) : x.localeCompare(y);
    return cmp * sortDir;
  });
  return list;
}

function render() {
  const list = filtered();
  const nums = numericColumns();
  const chartIdx = Number(document.getElementById('chartCol').value);
  const total = nums.length ? rows.reduce((s, r) => s + (Number(r[nums[nums.length - 1][1]]) || 0), 0) : 0;
  document.getElementById('stats').innerHTML = [
    ['Rows', fmt(rows.length), `showing ${Math.min(limit, list.length)}`],
    ['Columns', headers.length, headers.slice(0, 3).join(' · ')],
    ['Numeric fields', nums.length, nums.map(([h]) => h).join(' · ') || 'none detected'],
    ['Total of last numeric column', fmt(total), nums.length ? nums[nums.length - 1][0] : '—'],
  ].map(([label, value, hint]) => `<div class="stat"><div class="label">${label}</div><div class="value">${esc(value)}</div><div class="hint">${esc(hint)}</div></div>`).join('');
  document.getElementById('rowInfo').textContent = `${list.length} matching row${list.length === 1 ? '' : 's'} of ${rows.length} · click a header to sort`;
  const shown = list.slice(0, limit);
  document.getElementById('table').innerHTML = shown.length ? `<table><thead><tr><th>#</th>${headers.map((h, i) => `<th data-col="${i}">${esc(h)}${sortCol === i ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead><tbody>${shown.map(({ r, idx }) => `<tr><td class="muted">${idx + 1}</td>${r.slice(1).map((v, j) => `<td class="${isNum(j + 1) ? 'num' : ''}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p class="muted" style="padding:20px">No rows match your search.</p>';
  document.getElementById('moreBtn').style.display = list.length > limit ? '' : 'none';
  document.getElementById('moreBtn').textContent = `Show more rows (${Math.max(0, list.length - limit)} remaining)`;
  renderChart(chartIdx);
}

function renderChart(idx) {
  if (!Number.isFinite(idx) || !headers[idx]) { document.getElementById('chart').innerHTML = '<p class="muted">No numeric column to chart.</p>'; return; }
  const labelCol = headers.findIndex((_, i) => i !== idx && !isNum(i));
  const groups = new Map();
  rows.forEach(r => {
    const key = labelCol >= 0 ? r[labelCol] : 'All rows';
    groups.set(key, (groups.get(key) || 0) + (Number(r[idx]) || 0));
  });
  const top = [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(1, ...top.map(x => x[1]));
  document.getElementById('chartCaption').textContent = `Sum of ${headers[idx]} by ${labelCol >= 0 ? headers[labelCol] : 'row'}`;
  document.getElementById('chart').innerHTML = top.map(([label, value]) => `<div class="bar-row"><span class="bar-label" title="${esc(label)}">${esc(label)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, value / max * 100)}%"></div></div><span class="bar-value">${fmt(value)}</span></div>`).join('');
}

function readFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => setData(String(reader.result), file.name);
  reader.onerror = () => toast('Could not read that file');
  reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('datalens:dark') === 'true') document.body.classList.add('dark');
  document.getElementById('pickBtn').addEventListener('click', () => document.getElementById('fileInput').click());
  document.getElementById('inlinePick').addEventListener('click', () => document.getElementById('fileInput').click());
  document.getElementById('fileInput').addEventListener('change', e => { readFile(e.target.files[0]); e.target.value = ''; });
  const drop = document.getElementById('drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => readFile(e.dataTransfer.files[0]));
  document.getElementById('sampleBtn').addEventListener('click', () => setData(sampleCsv, 'Sample: Nairobi cafe sales'));
  document.getElementById('search').addEventListener('input', () => { limit = 25; render(); });
  document.getElementById('clearBtn').addEventListener('click', () => { document.getElementById('search').value = ''; limit = 25; render(); });
  document.getElementById('table').addEventListener('click', e => {
    const th = e.target.closest('[data-col]'); if (!th) return;
    const col = Number(th.dataset.col);
    sortDir = sortCol === col ? -sortDir : 1; sortCol = col; render();
  });
  document.getElementById('chartCol').addEventListener('change', e => renderChart(Number(e.target.value)));
  document.getElementById('moreBtn').addEventListener('click', () => { limit += 25; render(); });
  document.getElementById('themeBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('datalens:dark', document.body.classList.contains('dark'));
  });

  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.csv) setData(saved.csv, saved.name || 'Saved CSV');
    else setData(sampleCsv, 'Sample: Nairobi cafe sales');
  } catch (_) { setData(sampleCsv, 'Sample: Nairobi cafe sales'); }
});
