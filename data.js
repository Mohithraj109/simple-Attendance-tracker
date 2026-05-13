const DB = {
  // ── Students ──
  getStudents() {
    return JSON.parse(localStorage.getItem('students') || '[]');
  },
  saveStudents(list) {
    localStorage.setItem('students', JSON.stringify(list));
  },
  addStudent(student) {
    const list = this.getStudents();
    student.id = Date.now().toString();
    list.push(student);
    this.saveStudents(list);
    return student;
  },
  updateStudent(id, data) {
    const list = this.getStudents().map(s => s.id === id ? { ...s, ...data } : s);
    this.saveStudents(list);
  },
  deleteStudent(id) {
    this.saveStudents(this.getStudents().filter(s => s.id !== id));
    // also remove their attendance
    const att = this.getAllAttendance();
    delete att[id];
    localStorage.setItem('attendance', JSON.stringify(att));
  },

  // ── Holidays ──
  // Structure: Set of "YYYY-MM-DD" strings
  getHolidays() {
    return JSON.parse(localStorage.getItem('holidays') || '[]');
  },
  isHoliday(dateStr) {
    const day = new Date(dateStr).getDay();
    if (day === 0 || day === 6) return true; // Sun/Sat always holiday
    return this.getHolidays().includes(dateStr);
  },
  toggleHoliday(dateStr) {
    // Cannot toggle weekends
    const day = new Date(dateStr).getDay();
    if (day === 0 || day === 6) return false;
    const list = this.getHolidays();
    const idx  = list.indexOf(dateStr);
    if (idx === -1) list.push(dateStr); else list.splice(idx, 1);
    localStorage.setItem('holidays', JSON.stringify(list));
    return true;
  },

  // ── Attendance ──
  // Structure: { studentId: { "YYYY-MM-DD": "PRESENT"|"ABSENT" } }
  getAllAttendance() {
    return JSON.parse(localStorage.getItem('attendance') || '{}');
  },
  setAttendance(studentId, date, status) {
    const att = this.getAllAttendance();
    if (!att[studentId]) att[studentId] = {};
    att[studentId][date] = status;
    localStorage.setItem('attendance', JSON.stringify(att));
  },
  getAttendanceForDate(date) {
    const att = this.getAllAttendance();
    const result = {};
    for (const id in att) {
      if (att[id][date]) result[id] = att[id][date];
    }
    return result;
  },
  getStudentAttendance(studentId) {
    const att = this.getAllAttendance();
    return att[studentId] || {};
  },
  // Returns only non-holiday attendance records for a student
  getStudentAttendanceFiltered(studentId) {
    const att = this.getStudentAttendance(studentId);
    const result = {};
    for (const date in att) {
      if (!this.isHoliday(date)) result[date] = att[date];
    }
    return result;
  },

  // ── Seed demo data ──
  seed() {
    if (localStorage.getItem('seeded')) return;

    const students = [
      { id: '1', name: 'Alice Johnson',  roll: 'CS001', class: '10-A' },
      { id: '2', name: 'Bob Martinez',   roll: 'CS002', class: '10-A' },
      { id: '3', name: 'Carol Williams', roll: 'CS003', class: '10-B' },
    ];
    this.saveStudents(students);

    // Generate 14 days of attendance
    const matrix = {
      '1': ['P','P','P','P','P','P','P','P','P','P','P','P','P','P'],
      '2': ['P','A','P','P','A','P','P','A','P','P','P','A','P','P'],
      '3': ['P','P','A','P','P','P','A','P','P','A','P','P','P','A'],
    };

    const att = {};
    students.forEach(s => { att[s.id] = {}; });

    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const day = d.getDay();
      if (day === 0 || day === 6) continue; // skip weekends in seed
      students.forEach(s => {
        const status = matrix[s.id][13 - i] === 'P' ? 'PRESENT' : 'ABSENT';
        att[s.id][dateStr] = status;
      });
    }

    localStorage.setItem('attendance', JSON.stringify(att));
    localStorage.setItem('seeded', '1');
  }
};

// Run seed on load
DB.seed();
