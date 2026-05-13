let selectedId = null;

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

window.onload = () => {
  const saved = localStorage.getItem('selectedStudent');
  if (saved) {
    const s = DB.getStudents().find(s => s.id === saved);
    if (s) { selectedId = s.id; showSection('overview'); return; }
  }
  showSection('select');
};

// ── Sidebar ──
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function showSection(name) {
  document.getElementById('section-select').style.display   = name === 'select'   ? '' : 'none';
  document.getElementById('section-overview').style.display = name === 'overview' ? '' : 'none';
  document.getElementById('page-title').textContent = name === 'overview' ? 'My Attendance' : 'Student Login';
  document.querySelectorAll('.nav-item').forEach((el, i) => {
    el.classList.toggle('active', (name === 'overview' && i === 0) || (name === 'select' && i === 1));
  });
  if (name === 'select') {
    const inp = document.getElementById('roll-input');
    if (inp) inp.value = '';
    const err = document.getElementById('roll-error');
    if (err) err.style.display = 'none';
  }
  if (name === 'overview') renderOverview();
  document.getElementById('sidebar').classList.remove('open');
}

// ── Roll number login ──
function loginByRoll() {
  const roll = document.getElementById('roll-input').value.trim().toUpperCase();
  const err  = document.getElementById('roll-error');

  if (!roll) { err.style.display = 'block'; err.textContent = '⚠️ Please enter your roll number.'; return; }

  const s = DB.getStudents().find(s => s.roll.toUpperCase() === roll);
  if (!s) { err.style.display = 'block'; err.textContent = '❌ Roll number not found. Please try again.'; return; }

  err.style.display = 'none';
  selectedId = s.id;
  localStorage.setItem('selectedStudent', s.id);
  showSection('overview');
}

// ── Overview ──
function renderOverview() {
  if (!selectedId) { showSection('select'); return; }

  const s = DB.getStudents().find(s => s.id === selectedId);
  if (!s) { showSection('select'); return; }

  // Bigger name in topbar
  document.getElementById('student-label').innerHTML =
    `<span style="font-size:16px;font-weight:700;color:var(--gray-800);">${s.name}</span>
     <span style="font-size:12px;color:var(--gray-400);margin-left:6px;">${s.roll} · ${s.class}</span>`;

  // Use filtered attendance (excludes holidays & weekends)
  const att   = DB.getStudentAttendanceFiltered(selectedId);
  const dates = Object.keys(att).sort((a, b) => b.localeCompare(a));
  const total = dates.length;
  const pres  = dates.filter(d => att[d] === 'PRESENT').length;
  const abs   = total - pres;
  const pct   = total ? Math.round((pres / total) * 100) : 0;
  const color = pct >= 75 ? 'green' : pct >= 50 ? 'blue' : 'red';

  document.getElementById('student-stats').innerHTML = `
    <div class="stat-card slide-in">
      <div class="stat-label">Total Days</div>
      <div class="stat-value blue">${total}</div>
    </div>
    <div class="stat-card slide-in" style="animation-delay:0.05s">
      <div class="stat-label">Present</div>
      <div class="stat-value green">${pres}</div>
    </div>
    <div class="stat-card slide-in" style="animation-delay:0.1s">
      <div class="stat-label">Absent</div>
      <div class="stat-value red">${abs}</div>
    </div>
    <div class="stat-card slide-in" style="animation-delay:0.15s">
      <div class="stat-label">Percentage</div>
      <div class="stat-value ${color}">${pct}%</div>
    </div>
  `;

  document.getElementById('pct-label').textContent = `${pct}%`;
  document.getElementById('pct-label').style.color =
    pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--blue)' : 'var(--red)';
  document.getElementById('progress-bar').className = `progress-bar ${color}`;
  setTimeout(() => { document.getElementById('progress-bar').style.width = `${pct}%`; }, 50);

  // Full log including holidays for reference
  const allAtt  = DB.getStudentAttendance(selectedId);
  const allDates = Object.keys(allAtt).sort((a, b) => b.localeCompare(a));

  const tbody = document.getElementById('att-log-body');
  if (!allDates.length) {
    tbody.innerHTML = `<tr><td colspan="3"><div class="empty"><div class="empty-icon">📅</div><p>No attendance records yet.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = allDates.map((d, i) => {
    const day    = DAYS[new Date(d).getDay()];
    const isHol  = DB.isHoliday(d);
    const status = allAtt[d];
    if (isHol) {
      return `
        <tr style="animation-delay:${i * 0.03}s;background:#fefce8;">
          <td>${d}</td>
          <td style="color:var(--gray-400)">${day}</td>
          <td><span class="badge" style="background:#fef9c3;color:#854d0e;">🏖️ Holiday</span></td>
        </tr>`;
    }
    return `
      <tr style="animation-delay:${i * 0.03}s">
        <td>${d}</td>
        <td style="color:var(--gray-400)">${day}</td>
        <td><span class="badge ${status === 'PRESENT' ? 'badge-present' : 'badge-absent'}">${status}</span></td>
      </tr>`;
  }).join('');
}
