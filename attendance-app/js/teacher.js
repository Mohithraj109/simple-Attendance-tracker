let editingId = null;
let deletingId = null;
let attendanceState = {};
let currentDate = '';

// ── Init ──
window.onload = () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('att-date').value = today;
  currentDate = today;
  loadAttendance();
  renderStats();
};

// ── Sidebar ──
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function showSection(name) {
  document.getElementById('section-attendance').style.display = name === 'attendance' ? '' : 'none';
  document.getElementById('section-students').style.display   = name === 'students'   ? '' : 'none';
  document.getElementById('page-title').textContent = name === 'attendance' ? 'Mark Attendance' : 'Students';
  document.querySelectorAll('.nav-item').forEach((el, i) => {
    el.classList.toggle('active', (name === 'attendance' && i === 0) || (name === 'students' && i === 1));
  });
  if (name === 'students') renderStudents();
  if (name === 'attendance') loadAttendance();
  document.getElementById('sidebar').classList.remove('open');
}

// ── Stats ──
function renderStats() {
  const students = DB.getStudents();
  const today = new Date().toISOString().split('T')[0];
  const todayAtt = DB.getAttendanceForDate(today);
  const present = Object.values(todayAtt).filter(v => v === 'PRESENT').length;
  const absent  = Object.values(todayAtt).filter(v => v === 'ABSENT').length;

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card slide-in">
      <div class="stat-label">Total Students</div>
      <div class="stat-value blue">${students.length}</div>
    </div>
    <div class="stat-card slide-in">
      <div class="stat-label">Present Today</div>
      <div class="stat-value green">${present}</div>
    </div>
    <div class="stat-card slide-in">
      <div class="stat-label">Absent Today</div>
      <div class="stat-value red">${absent}</div>
    </div>
  `;
}

// ── Attendance ──
function loadAttendance() {
  currentDate = document.getElementById('att-date').value;
  const students = DB.getStudents();
  const saved    = DB.getAttendanceForDate(currentDate);
  const isHol    = DB.isHoliday(currentDate);
  const day      = new Date(currentDate).getDay();
  const isWeekend = day === 0 || day === 6;

  attendanceState = {};
  students.forEach(s => { attendanceState[s.id] = saved[s.id] || 'PRESENT'; });

  // Update holiday button
  const btn = document.getElementById('holiday-btn');
  if (isWeekend) {
    btn.textContent = '🏖️ Weekend (Holiday)';
    btn.style.cssText = 'background:#f3f4f6;color:#9ca3af;cursor:not-allowed;border-radius:6px;padding:7px 14px;font-size:13px;font-weight:600;border:none;';
    btn.disabled = true;
  } else if (isHol) {
    btn.textContent = '✅ Holiday — Click to Undo';
    btn.style.cssText = 'background:#fef9c3;color:#854d0e;border:1.5px solid #fde047;cursor:pointer;border-radius:6px;padding:7px 14px;font-size:13px;font-weight:600;';
    btn.disabled = false;
  } else {
    btn.textContent = '🏖️ Mark as Holiday';
    btn.style.cssText = 'background:#f3f4f6;color:#4b5563;cursor:pointer;border-radius:6px;padding:7px 14px;font-size:13px;font-weight:600;border:none;';
    btn.disabled = false;
  }

  renderAttTable(students, isHol || isWeekend);
}

function toggleHoliday() {
  const success = DB.toggleHoliday(currentDate);
  if (!success) return;
  const isNowHol = DB.isHoliday(currentDate);
  loadAttendance();
  renderStats();
  showToast(isNowHol ? '🏖️ Day marked as holiday' : '📅 Holiday removed', isNowHol ? '' : 'success');
}

function renderAttTable(students, isHoliday) {
  const tbody = document.getElementById('att-table-body');

  if (isHoliday) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty"><div class="empty-icon">🏖️</div><p style="font-size:15px;font-weight:600;color:#854d0e;">This day is a Holiday</p><p style="margin-top:4px;">No attendance is taken on holidays.</p></div></td></tr>`;
    return;
  }
  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty"><div class="empty-icon">👥</div><p>No students yet. Add students first.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = students.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td><span class="badge badge-blue">${s.roll}</span></td>
      <td>${s.class}</td>
      <td>
        <div class="att-toggle">
          <button class="att-btn ${attendanceState[s.id] === 'PRESENT' ? 'present' : 'inactive'}"
            onclick="setAtt('${s.id}', 'PRESENT')">✓ Present</button>
          <button class="att-btn ${attendanceState[s.id] === 'ABSENT' ? 'absent' : 'inactive'}"
            onclick="setAtt('${s.id}', 'ABSENT')">✗ Absent</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function setAtt(studentId, status) {
  attendanceState[studentId] = status;
  renderAttTable(DB.getStudents(), false);
}

function saveAttendance() {
  if (!currentDate) return showToast('Please select a date', 'error');
  if (DB.isHoliday(currentDate)) return showToast('Cannot save attendance on a holiday', 'error');
  const students = DB.getStudents();
  if (!students.length) return showToast('No students to save', 'error');

  students.forEach(s => {
    DB.setAttendance(s.id, currentDate, attendanceState[s.id] || 'PRESENT');
  });
  renderStats();
  showToast('✓ Attendance saved!', 'success');
}

// ── Students CRUD ──
function renderStudents() {
  const query = (document.getElementById('search-input')?.value || '').toLowerCase();
  const students = DB.getStudents().filter(s =>
    s.name.toLowerCase().includes(query) ||
    s.roll.toLowerCase().includes(query) ||
    s.class.toLowerCase().includes(query)
  );

  const tbody = document.getElementById('students-table-body');
  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty"><div class="empty-icon">👥</div><p>No students found.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = students.map(s => {
    const att   = DB.getStudentAttendanceFiltered(s.id);
    const total = Object.keys(att).length;
    const pres  = Object.values(att).filter(v => v === 'PRESENT').length;
    const pct   = total ? Math.round((pres / total) * 100) : 0;
    const color = pct >= 75 ? '#16a34a' : pct >= 50 ? 'var(--blue)' : '#dc2626';
    return `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td><span class="badge badge-blue">${s.roll}</span></td>
      <td>${s.class}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;min-width:120px;">
          <div class="progress-wrap" style="flex:1;margin:0;">
            <div class="progress-bar" style="width:${pct}%;background:${color};"></div>
          </div>
          <span style="font-size:12px;font-weight:700;color:${color};width:36px;">${pct}%</span>
        </div>
      </td>
      <td>
        <div class="td-actions">
          <button class="btn btn-primary btn-sm" onclick="openEditModal('${s.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm"  onclick="openDelModal('${s.id}')">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

function openAddModal() {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Add Student';
  document.getElementById('f-name').value  = '';
  document.getElementById('f-roll').value  = '';
  document.getElementById('f-class').value = '';
  document.getElementById('modal').style.display = 'flex';
}

function openEditModal(id) {
  const s = DB.getStudents().find(s => s.id === id);
  if (!s) return;
  editingId = id;
  document.getElementById('modal-title').textContent = 'Edit Student';
  document.getElementById('f-name').value  = s.name;
  document.getElementById('f-roll').value  = s.roll;
  document.getElementById('f-class').value = s.class;
  document.getElementById('modal').style.display = 'flex';
}

function saveStudent() {
  const name = document.getElementById('f-name').value.trim();
  const roll = document.getElementById('f-roll').value.trim();
  const cls  = document.getElementById('f-class').value.trim();
  if (!name || !roll || !cls) return showToast('Please fill all fields', 'error');

  if (editingId) {
    DB.updateStudent(editingId, { name, roll, class: cls });
    showToast('✓ Student updated!', 'success');
  } else {
    DB.addStudent({ name, roll, class: cls });
    showToast('✓ Student added!', 'success');
  }
  closeModal();
  renderStudents();
  renderStats();
}

function openDelModal(id) {
  deletingId = id;
  document.getElementById('del-modal').style.display = 'flex';
}

function confirmDelete() {
  DB.deleteStudent(deletingId);
  closeDelModal();
  renderStudents();
  renderStats();
  showToast('Student deleted', 'error');
}

function closeModal()    { document.getElementById('modal').style.display = 'none'; }
function closeDelModal() { document.getElementById('del-modal').style.display = 'none'; }
function closeModalOutside(e) { if (e.target.id === 'modal') closeModal(); }
function closeDelOutside(e)   { if (e.target.id === 'del-modal') closeDelModal(); }

// ── Toast ──
function showToast(msg, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}
