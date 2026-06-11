// ===== STATE =====
const state = {
  personen: JSON.parse(localStorage.getItem('dp_personen') || '[]'),
  schichten: JSON.parse(localStorage.getItem('dp_schichten') || '[]'),
  currentWeekStart: getMonday(new Date()),
};

let nextPersonId = state.personen.reduce((m, p) => Math.max(m, p.id), 0) + 1;
let nextShiftId  = state.schichten.reduce((m, s) => Math.max(m, s.id), 0) + 1;

function save() {
  localStorage.setItem('dp_personen', JSON.stringify(state.personen));
  localStorage.setItem('dp_schichten', JSON.stringify(state.schichten));
}

// ===== NAVIGATION =====
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const page = link.dataset.page;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    link.classList.add('active');
    document.getElementById('page-' + page).classList.add('active');
    if (page === 'dienstplan') renderCalendar();
    if (page === 'statistik') renderStatistik();
  });
});

// ===== HELPERS =====
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function minutesBetween(von, bis) {
  const [vh, vm] = von.split(':').map(Number);
  const [bh, bm] = bis.split(':').map(Number);
  return (bh * 60 + bm) - (vh * 60 + vm);
}

function getRolleBadge(rolle) {
  const map = { Teamleiter: 'badge-blue', Mitarbeiter: 'badge-green', Azubi: 'badge-orange' };
  return `<span class="badge ${map[rolle] || 'badge-green'}">${rolle}</span>`;
}

// ===== PERSONEN =====
function renderPersonenTable() {
  const tbody = document.getElementById('personen-tbody');
  if (state.personen.length === 0) {
    tbody.innerHTML = '<tr id="personen-empty-row"><td colspan="4" class="empty-state">Noch keine Personen angelegt.</td></tr>';
    return;
  }
  tbody.innerHTML = state.personen.map(p => `
    <tr data-id="${p.id}">
      <td>${p.vorname} ${p.nachname}</td>
      <td>${getRolleBadge(p.rolle)}</td>
      <td>${p.stunden ? p.stunden + ' h/Woche' : '–'}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-secondary btn-sm" onclick="editPerson(${p.id})">Bearbeiten</button>
          <button class="btn btn-danger btn-sm" onclick="deletePerson(${p.id})">Löschen</button>
        </div>
      </td>
    </tr>
  `).join('');
}

document.getElementById('btn-add-person').addEventListener('click', () => {
  document.getElementById('person-form-title').textContent = 'Neue Person';
  document.getElementById('person-id').value = '';
  document.getElementById('person-form').reset();
  document.getElementById('person-form-wrapper').classList.remove('hidden');
});

document.getElementById('btn-cancel-person').addEventListener('click', () => {
  document.getElementById('person-form-wrapper').classList.add('hidden');
});

document.getElementById('person-form').addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('person-id').value;
  const data = {
    vorname:  document.getElementById('person-vorname').value.trim(),
    nachname: document.getElementById('person-nachname').value.trim(),
    rolle:    document.getElementById('person-rolle').value,
    stunden:  Number(document.getElementById('person-stunden').value) || null,
  };
  if (id) {
    const idx = state.personen.findIndex(p => p.id === Number(id));
    state.personen[idx] = { id: Number(id), ...data };
  } else {
    state.personen.push({ id: nextPersonId++, ...data });
  }
  save();
  renderPersonenTable();
  document.getElementById('person-form-wrapper').classList.add('hidden');
});

window.editPerson = function(id) {
  const p = state.personen.find(p => p.id === id);
  document.getElementById('person-form-title').textContent = 'Person bearbeiten';
  document.getElementById('person-id').value = p.id;
  document.getElementById('person-vorname').value = p.vorname;
  document.getElementById('person-nachname').value = p.nachname;
  document.getElementById('person-rolle').value = p.rolle;
  document.getElementById('person-stunden').value = p.stunden || '';
  document.getElementById('person-form-wrapper').classList.remove('hidden');
  document.getElementById('person-form-wrapper').scrollIntoView({ behavior: 'smooth' });
};

window.deletePerson = function(id) {
  if (!confirm('Person wirklich löschen?')) return;
  state.personen = state.personen.filter(p => p.id !== id);
  state.schichten = state.schichten.filter(s => s.personId !== id);
  save();
  renderPersonenTable();
};

// ===== DIENSTPLAN =====
function renderCalendar() {
  const week = state.currentWeekStart;
  const kw = getWeekNumber(week);
  document.getElementById('week-label').textContent = `KW ${kw} / ${week.getFullYear()}`;

  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  // Header
  const thead = document.getElementById('calendar-head');
  thead.innerHTML = `<tr>
    <th>Person</th>
    ${days.map((d, i) => `<th>${dayNames[i]}<br><span style="font-weight:400;font-size:.75rem">${formatDate(toDateStr(d))}</span></th>`).join('')}
  </tr>`;

  // Body
  const tbody = document.getElementById('calendar-body');
  if (state.personen.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">Keine Personen angelegt. Bitte zuerst Personen hinzufügen.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.personen.map(p => {
    const cells = days.map(d => {
      const dateStr = toDateStr(d);
      const shifts = state.schichten.filter(s => s.personId === p.id && s.datum === dateStr);
      const chips = shifts.map(s => `
        <div class="shift-chip">
          <span class="chip-time">${s.von}–${s.bis}</span>
          ${s.notiz ? `<span class="chip-note" title="${s.notiz}">📝</span>` : ''}
          <span class="chip-actions">
            <button class="chip-btn" title="Bearbeiten" onclick="editShift(${s.id})">✏️</button>
            <button class="chip-btn" title="Löschen" onclick="deleteShift(${s.id})">🗑️</button>
          </span>
        </div>
      `).join('');
      return `<td>${chips}</td>`;
    }).join('');
    return `<tr><td class="person-col">${p.vorname} ${p.nachname}</td>${cells}</tr>`;
  }).join('');
}

document.getElementById('btn-prev-week').addEventListener('click', () => {
  state.currentWeekStart = addDays(state.currentWeekStart, -7);
  renderCalendar();
});

document.getElementById('btn-next-week').addEventListener('click', () => {
  state.currentWeekStart = addDays(state.currentWeekStart, 7);
  renderCalendar();
});

document.getElementById('btn-add-shift').addEventListener('click', () => {
  if (state.personen.length === 0) {
    alert('Bitte zuerst mindestens eine Person anlegen.');
    return;
  }
  document.getElementById('shift-form-title').textContent = 'Neue Schicht';
  document.getElementById('shift-id').value = '';
  document.getElementById('shift-form').reset();
  populateShiftPersonSelect();
  document.getElementById('shift-datum').value = toDateStr(state.currentWeekStart);
  document.getElementById('shift-form-wrapper').classList.remove('hidden');
});

document.getElementById('btn-cancel-shift').addEventListener('click', () => {
  document.getElementById('shift-form-wrapper').classList.add('hidden');
});

function populateShiftPersonSelect(selectedId) {
  const sel = document.getElementById('shift-person');
  sel.innerHTML = state.personen.map(p =>
    `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${p.vorname} ${p.nachname}</option>`
  ).join('');
}

document.getElementById('shift-form').addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('shift-id').value;
  const von = document.getElementById('shift-von').value;
  const bis = document.getElementById('shift-bis').value;
  if (von >= bis) { alert('„Von" muss vor „Bis" liegen.'); return; }
  const data = {
    personId: Number(document.getElementById('shift-person').value),
    datum:    document.getElementById('shift-datum').value,
    von, bis,
    notiz:    document.getElementById('shift-notiz').value.trim(),
  };
  if (id) {
    const idx = state.schichten.findIndex(s => s.id === Number(id));
    state.schichten[idx] = { id: Number(id), ...data };
  } else {
    state.schichten.push({ id: nextShiftId++, ...data });
  }
  save();
  renderCalendar();
  document.getElementById('shift-form-wrapper').classList.add('hidden');
});

window.editShift = function(id) {
  const s = state.schichten.find(s => s.id === id);
  document.getElementById('shift-form-title').textContent = 'Schicht bearbeiten';
  document.getElementById('shift-id').value = s.id;
  populateShiftPersonSelect(s.personId);
  document.getElementById('shift-datum').value = s.datum;
  document.getElementById('shift-von').value = s.von;
  document.getElementById('shift-bis').value = s.bis;
  document.getElementById('shift-notiz').value = s.notiz || '';
  document.getElementById('shift-form-wrapper').classList.remove('hidden');
};

window.deleteShift = function(id) {
  if (!confirm('Schicht wirklich löschen?')) return;
  state.schichten = state.schichten.filter(s => s.id !== id);
  save();
  renderCalendar();
};

// ===== STATISTIK =====
function renderStatistik() {
  const monatInput = document.getElementById('stat-monat').value;
  const [year, month] = monatInput ? monatInput.split('-').map(Number) : [null, null];

  const filtered = (year && month)
    ? state.schichten.filter(s => {
        const [y, m] = s.datum.split('-').map(Number);
        return y === year && m === month;
      })
    : state.schichten;

  const totalShifts = filtered.length;
  const totalMinutes = filtered.reduce((sum, s) => sum + minutesBetween(s.von, s.bis), 0);
  const activePersonIds = new Set(filtered.map(s => s.personId));

  document.getElementById('stat-total-shifts').textContent = totalShifts;
  document.getElementById('stat-total-hours').textContent = (totalMinutes / 60).toFixed(1) + 'h';
  document.getElementById('stat-total-persons').textContent = activePersonIds.size;

  const tbody = document.getElementById('stat-tbody');
  if (state.personen.length === 0 || totalShifts === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Keine Daten für diesen Zeitraum.</td></tr>';
    return;
  }

  const weeksInMonth = (year && month) ? weeksInGivenMonth(year, month) : null;

  tbody.innerHTML = state.personen.map(p => {
    const pShifts = filtered.filter(s => s.personId === p.id);
    if (pShifts.length === 0) return '';
    const minutes = pShifts.reduce((sum, s) => sum + minutesBetween(s.von, s.bis), 0);
    const hours = minutes / 60;
    const sollStunden = (p.stunden && weeksInMonth) ? p.stunden * weeksInMonth : null;
    const diff = sollStunden !== null ? hours - sollStunden : null;
    const diffStr = diff === null
      ? '–'
      : diff > 0
        ? `<span class="diff-positive">+${diff.toFixed(1)}h</span>`
        : diff < 0
          ? `<span class="diff-negative">${diff.toFixed(1)}h</span>`
          : `<span class="diff-zero">±0h</span>`;
    return `<tr>
      <td>${p.vorname} ${p.nachname}</td>
      <td>${pShifts.length}</td>
      <td>${hours.toFixed(1)} h</td>
      <td>${sollStunden !== null ? sollStunden.toFixed(1) + ' h' : '–'}</td>
      <td>${diffStr}</td>
    </tr>`;
  }).join('');
}

function weeksInGivenMonth(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay  = new Date(year, month, 0);
  const w1 = getWeekNumber(firstDay);
  const w2 = getWeekNumber(lastDay);
  if (w2 >= w1) return w2 - w1 + 1;
  return 5; // Jahreswechsel-Fallback
}

document.getElementById('stat-monat').addEventListener('change', renderStatistik);

// ===== INIT =====
const now = new Date();
document.getElementById('stat-monat').value =
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

renderPersonenTable();
renderCalendar();
