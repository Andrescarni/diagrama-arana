/* ─── Constants ─────────────────────────────────── */
const MIN_ROWS = 5;
const MAX_ROWS = 15;

const DEFAULT_DATA = [
  { label: 'Ojo del coach',      auto: '', cole: '', atle: '' },
  { label: 'Comunicación',       auto: '', cole: '', atle: '' },
  { label: 'Escucha',            auto: '', cole: '', atle: '' },
  { label: 'Motivación',         auto: '', cole: '', atle: '' },
  { label: 'Vigilante',          auto: '', cole: '', atle: '' },
  { label: 'Empatía',            auto: '', cole: '', atle: '' },
  { label: 'Presente',           auto: '', cole: '', atle: '' },
  { label: 'Directo',            auto: '', cole: '', atle: '' },
  { label: 'Respetuoso',         auto: '', cole: '', atle: '' },
  { label: 'Respetuoso',         auto: '', cole: '', atle: '' },
  { label: 'Buena demostración', auto: '', cole: '', atle: '' },
  { label: 'Disponible',         auto: '', cole: '', atle: '' },
  { label: 'Entendido/experto',  auto: '', cole: '', atle: '' },
  { label: 'Organización',       auto: '', cole: '', atle: '' },
  { label: 'Inspirador',         auto: '', cole: '', atle: '' },
];

/* ─── State ─────────────────────────────────────── */
let radarChart    = null;
let debounceTimer = null;

/* ─── Helpers ───────────────────────────────────── */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function numVal(input) {
  const v = parseFloat(input.value);
  return isNaN(v) ? 0 : Math.min(10, Math.max(0, v));
}

function clampScore(inp) {
  if (inp.type !== 'number') return;
  const v = parseFloat(inp.value);
  if (!isNaN(v)) {
    if (v > 10) inp.value = 10;
    if (v <  0) inp.value = 0;
  }
}

/* ─── Row factory ───────────────────────────────── */
function makeRow(d, idx, animate) {
  const tr = document.createElement('tr');
  if (animate) tr.classList.add('row-enter');

  const av = d.auto !== '' && d.auto !== undefined ? d.auto : '';
  const cv = d.cole !== '' && d.cole !== undefined ? d.cole : '';
  const lv = d.atle !== '' && d.atle !== undefined ? d.atle : '';

  tr.innerHTML = `
    <td class="td-num">${idx + 1})</td>
    <td class="td-crit">
      <input type="text" class="label-input" value="${esc(d.label || '')}" placeholder="Escribe un criterio…">
    </td>
    <td class="td-auto">
      <input type="number" class="score-input score-auto" min="0" max="10" step="1" value="${av}" placeholder="–">
    </td>
    <td class="td-cole">
      <input type="number" class="score-input score-cole" min="0" max="10" step="1" value="${cv}" placeholder="–">
    </td>
    <td class="td-atle">
      <input type="number" class="score-input score-atle" min="0" max="10" step="1" value="${lv}" placeholder="–">
    </td>
    <td class="td-del">
      <button class="btn-del" onclick="deleteRow(this)" title="Eliminar fila">×</button>
    </td>
  `;

  tr.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      clampScore(inp);
      scheduleUpdate();
    });
  });

  return tr;
}

/* ─── Table rendering ───────────────────────────── */
function renderTable(data) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  data.forEach((row, i) => tbody.appendChild(makeRow(row, i, false)));
  syncControls();
}

function refreshNums() {
  document.querySelectorAll('#tableBody tr').forEach((tr, i) => {
    const c = tr.querySelector('.td-num');
    if (c) c.textContent = `${i + 1})`;
  });
}

function syncControls() {
  const n = document.querySelectorAll('#tableBody tr').length;
  document.querySelectorAll('.btn-del').forEach(b => { b.disabled = n <= MIN_ROWS; });
  const addBtn = document.getElementById('addBtn');
  if (addBtn) addBtn.disabled = n >= MAX_ROWS;
}

/* ─── Row add / delete / clear ──────────────────── */
function addRow() {
  const tbody = document.getElementById('tableBody');
  if (tbody.querySelectorAll('tr').length >= MAX_ROWS) return;

  const idx = tbody.querySelectorAll('tr').length;
  const row = makeRow({ label: '', auto: '', cole: '', atle: '' }, idx, true);
  tbody.appendChild(row);
  refreshNums();
  syncControls();
  scheduleUpdate();
  setTimeout(() => row.querySelector('.label-input').focus(), 50);
}

function deleteRow(btn) {
  const rows = document.querySelectorAll('#tableBody tr');
  if (rows.length <= MIN_ROWS) return;

  const tr = btn.closest('tr');
  tr.style.transition = 'opacity .18s, transform .18s';
  tr.style.opacity    = '0';
  tr.style.transform  = 'translateX(-8px)';

  setTimeout(() => {
    tr.remove();
    refreshNums();
    syncControls();
    updateChart();
  }, 200);
}

function clearAll() {
  if (!confirm('¿Limpiar todos los criterios y calificaciones?')) return;
  renderTable(Array.from({ length: 5 }, () => ({ label: '', auto: '', cole: '', atle: '' })));
  updateChart();
}

/* ─── Read table data ────────────────────────────── */
function getData() {
  return Array.from(document.querySelectorAll('#tableBody tr')).map(tr => ({
    label: tr.querySelector('.label-input')?.value.trim() || '',
    auto:  numVal(tr.querySelector('.score-auto')),
    cole:  numVal(tr.querySelector('.score-cole')),
    atle:  numVal(tr.querySelector('.score-atle')),
  }));
}

/* ─── Chart ──────────────────────────────────────── */
function buildDatasets(data) {
  return [
    {
      label: 'Autopercepción',
      data: data.map(d => d.auto),
      backgroundColor: 'rgba(79,142,247,.22)',
      borderColor: '#4f8ef7',
      borderWidth: 2,
      pointBackgroundColor: '#4f8ef7',
      pointBorderColor: 'transparent',
      pointRadius: 4,
      pointHoverRadius: 6,
    },
    {
      label: 'Percepción del colega',
      data: data.map(d => d.cole),
      backgroundColor: 'rgba(247,79,109,.18)',
      borderColor: '#f74f6d',
      borderWidth: 2,
      pointBackgroundColor: '#f74f6d',
      pointBorderColor: 'transparent',
      pointRadius: 4,
      pointHoverRadius: 6,
    },
    {
      label: 'Percepción del atleta',
      data: data.map(d => d.atle),
      backgroundColor: 'rgba(143,163,200,.14)',
      borderColor: '#8fa3c8',
      borderWidth: 1.5,
      borderDash: [5, 3],
      pointBackgroundColor: '#8fa3c8',
      pointBorderColor: 'transparent',
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ];
}

function initChart() {
  const data = getData();
  const ctx  = document.getElementById('radarChart').getContext('2d');

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: data.map(d => d.label || '—'),
      datasets: buildDatasets(data),
    },
    options: {
      responsive: true,
      animation: { duration: 280, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `  ${ctx.dataset.label}: ${ctx.raw}`,
          },
        },
      },
      scales: {
        r: {
          min: 0,
          max: 10,
          ticks: {
            stepSize: 2,
            color: 'rgba(122,151,192,.55)',
            backdropColor: 'transparent',
            font: { size: 10, family: 'JetBrains Mono' },
          },
          grid:       { color: 'rgba(30,45,69,.85)', lineWidth: 1 },
          angleLines: { color: 'rgba(30,45,69,.85)', lineWidth: 1 },
          pointLabels: {
            color: '#c8d8f0',
            font:  { size: 11, family: 'Outfit', weight: '400' },
            padding: 8,
          },
        },
      },
    },
  });
}

function updateChart() {
  if (!radarChart) return;
  const data = getData();
  radarChart.data.labels = data.map(d => d.label || '—');
  radarChart.data.datasets.forEach((ds, i) => {
    ds.data = buildDatasets(data)[i].data;
  });
  radarChart.update('active');
}

function scheduleUpdate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(updateChart, 300);
}

/* ─── Export PNG ─────────────────────────────────── */
function exportPNG() {
  const src   = document.getElementById('radarChart');
  const scale = 2;
  const out   = document.createElement('canvas');
  out.width   = src.width  * scale;
  out.height  = src.height * scale;

  const ctx = out.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#080d1c';
  ctx.fillRect(0, 0, src.width, src.height);
  ctx.drawImage(src, 0, 0);

  out.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'diagrama-arana-autopercepcion.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/* ─── Init ───────────────────────────────────────── */
renderTable(DEFAULT_DATA);
initChart();
