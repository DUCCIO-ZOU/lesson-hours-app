const RECORDS_KEY = 'lesson-hours-records-v8';
const STUDENTS_KEY = 'lesson-hours-students-v1';

const form = document.getElementById('recordForm');
const dateInput = document.getElementById('date');
const studentSelect = document.getElementById('studentSelect');
const newStudentNameInput = document.getElementById('newStudentName');
const addStudentQuickBtn = document.getElementById('addStudentQuickBtn');
const manageStudentNameInput = document.getElementById('manageStudentName');
const addStudentBtn = document.getElementById('addStudentBtn');
const batchStudentNamesInput = document.getElementById('batchStudentNames');
const batchImportBtn = document.getElementById('batchImportBtn');
const showInactiveBtn = document.getElementById('showInactiveBtn');
const toggleStudentManageBtn = document.getElementById('toggleStudentManageBtn');
const studentManagePanel = document.getElementById('studentManagePanel');
const toggleMonthStatsBtn = document.getElementById('toggleMonthStatsBtn');
const monthStatsPanel = document.getElementById('monthStatsPanel');
const toggleTotalStatsBtn = document.getElementById('toggleTotalStatsBtn');
const totalStatsPanel = document.getElementById('totalStatsPanel');
const studentList = document.getElementById('studentList');
const lessonTypeInput = document.getElementById('lessonType');
const hoursInput = document.getElementById('hours');
const hoursChoiceGroup = document.getElementById('hoursChoiceGroup');
const noteInput = document.getElementById('note');
const monthFilter = document.getElementById('monthFilter');
const keywordFilter = document.getElementById('keywordFilter');
const typeFilter = document.getElementById('typeFilter');
const studentFilter = document.getElementById('studentFilter');
const tableBody = document.getElementById('recordTable');
const totalCount = document.getElementById('totalCount');
const totalHours = document.getElementById('totalHours');
const monthHours = document.getElementById('monthHours');
const tierHours = document.getElementById('tierHours');
const shareHours = document.getElementById('shareHours');
const monthTierHours = document.getElementById('monthTierHours');
const monthShareHours = document.getElementById('monthShareHours');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');

let showInactiveStudents = false;
let studentManageExpanded = false;
let monthStatsExpanded = false;
let totalStatsExpanded = false;

function today() {
  return new Date().toISOString().split('T')[0];
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function toFixedHours(value) {
  return Number(value || 0).toFixed(2);
}

function normalizeStudent(name) {
  return String(name || '').replace(/\s+/g, '').trim();
}

function loadStudents() {
  try {
    return JSON.parse(localStorage.getItem(STUDENTS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveStudents(students) {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

function ensureStudent(name, active = true) {
  const cleanName = normalizeStudent(name);
  if (!cleanName) return null;

  const students = loadStudents();
  const existing = students.find(item => item.name === cleanName);
  if (existing) {
    if (active && !existing.active) existing.active = true;
    saveStudents(students);
    return existing;
  }

  const student = {
    id: crypto.randomUUID(),
    name: cleanName,
    active,
    createdAt: new Date().toISOString(),
  };
  students.push(student);
  students.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  saveStudents(students);
  return student;
}

function batchImportStudents(rawText) {
  const names = String(rawText || '')
    .split(/\r?\n|,|，|、|;|；/)
    .map(normalizeStudent)
    .filter(Boolean);

  const uniqueNames = [...new Set(names)];
  let added = 0;
  let reactivated = 0;

  const students = loadStudents();
  uniqueNames.forEach((name) => {
    const existing = students.find(item => item.name === name);
    if (existing) {
      if (!existing.active) {
        existing.active = true;
        reactivated += 1;
      }
      return;
    }
    students.push({
      id: crypto.randomUUID(),
      name,
      active: true,
      createdAt: new Date().toISOString(),
    });
    added += 1;
  });

  students.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  saveStudents(students);
  renderAll();
  return { added, reactivated, total: uniqueNames.length };
}

function toggleStudentStatus(id) {
  const students = loadStudents();
  const target = students.find(item => item.id === id);
  if (!target) return;
  target.active = !target.active;
  saveStudents(students);
  renderAll();
}

function deleteStudent(id) {
  const students = loadStudents();
  const target = students.find(s => s.id === id);
  const records = loadRecords();
  const used = records.some(item => item.studentId === id || item.studentName === target?.name);
  if (used) {
    alert('这个学生已经有上课记录了，建议改成“已停课”，不要直接删除。');
    return;
  }
  saveStudents(students.filter(item => item.id !== id));
  renderAll();
}

function migrateRecords(records) {
  return records.map(item => {
    const studentName = normalizeStudent(item.studentName || item.student || '');
    const student = studentName ? ensureStudent(studentName, true) : null;
    return {
      id: item.id || crypto.randomUUID(),
      date: item.date || today(),
      studentId: item.studentId || student?.id || '',
      studentName: studentName || student?.name || '',
      lessonType: item.lessonType === '分成课时' ? '陪练课时' : (item.lessonType || '阶梯课时'),
      hours: toFixedHours(item.hours ?? 1),
      note: item.note || '',
    };
  });
}

function loadRecords() {
  try {
    const v8 = JSON.parse(localStorage.getItem(RECORDS_KEY));
    if (v8) return migrateRecords(v8);

    const legacyKeys = [
      'lesson-hours-records-v7',
      'lesson-hours-records-v6',
      'lesson-hours-records-v5',
      'lesson-hours-records-v4',
      'lesson-hours-records-v3',
      'lesson-hours-records-v2',
      'lesson-hours-records-v1',
    ];

    for (const key of legacyKeys) {
      const data = JSON.parse(localStorage.getItem(key));
      if (data) {
        const migrated = migrateRecords(data);
        localStorage.setItem(RECORDS_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }

    return [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function sumHours(records) {
  return records.reduce((sum, item) => sum + Number(item.hours), 0).toFixed(2);
}

function setHoursChoice(value) {
  hoursInput.value = value;
  document.querySelectorAll('.hour-choice').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.hours === String(value));
  });
}

function renderStudentOptions() {
  const students = loadStudents();
  const activeStudents = students.filter(item => item.active);
  const currentValue = studentSelect.value;
  const currentFilter = studentFilter.value;

  studentSelect.innerHTML = [
    '<option value="">请选择学生</option>',
    ...activeStudents.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`),
  ].join('');

  if (currentValue && activeStudents.some(item => item.id === currentValue)) {
    studentSelect.value = currentValue;
  }

  studentFilter.innerHTML = [
    '<option value="">全部学生</option>',
    ...students.map(item => `<option value="${item.id}">${escapeHtml(item.name)}${item.active ? '' : '（已停课）'}</option>`),
  ].join('');

  if (currentFilter && students.some(item => item.id === currentFilter)) {
    studentFilter.value = currentFilter;
  }
}

function renderStudentList() {
  const students = loadStudents();
  const visible = students.filter(item => showInactiveStudents || item.active);

  if (!visible.length) {
    studentList.innerHTML = '<div class="empty-students">还没有学生，先新增一个吧。</div>';
    return;
  }

  studentList.innerHTML = visible.map(item => `
    <div class="student-chip ${item.active ? '' : 'inactive'}">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${item.active ? '在读' : '已停课'}</span>
      </div>
      <div class="chip-actions">
        <button type="button" class="small-btn" onclick="toggleStudentStatus('${item.id}')">${item.active ? '停课' : '恢复'}</button>
        <button type="button" class="small-btn danger-lite" onclick="deleteStudent('${item.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

function getFilteredRecords(records) {
  const month = monthFilter.value;
  const keyword = keywordFilter.value.trim().toLowerCase();
  const type = typeFilter.value;
  const studentId = studentFilter.value;

  return records.filter((item) => {
    const matchMonth = !month || item.date.startsWith(month);
    const text = `${item.studentName} ${item.note} ${item.lessonType}`.toLowerCase();
    const matchKeyword = !keyword || text.includes(keyword);
    const matchType = !type || item.lessonType === type;
    const matchStudent = !studentId || item.studentId === studentId;
    return matchMonth && matchKeyword && matchType && matchStudent;
  });
}

function renderRecords() {
  const records = loadRecords().sort((a, b) => b.date.localeCompare(a.date));
  const filtered = getFilteredRecords(records);
  const currentMonthRecords = records.filter((item) => item.date.startsWith(currentMonth()));
  const tierRecords = records.filter((item) => item.lessonType === '阶梯课时');
  const shareRecords = records.filter((item) => item.lessonType === '陪练课时');
  const currentMonthTierRecords = currentMonthRecords.filter((item) => item.lessonType === '阶梯课时');
  const currentMonthShareRecords = currentMonthRecords.filter((item) => item.lessonType === '陪练课时');

  totalCount.textContent = String(records.length);
  totalHours.textContent = sumHours(records);
  monthHours.textContent = sumHours(currentMonthRecords);
  tierHours.textContent = sumHours(tierRecords);
  shareHours.textContent = sumHours(shareRecords);
  monthTierHours.textContent = sumHours(currentMonthTierRecords);
  monthShareHours.textContent = sumHours(currentMonthShareRecords);

  if (!filtered.length) {
    tableBody.innerHTML = '<tr><td colspan="6" class="empty">还没有记录</td></tr>';
    return;
  }

  tableBody.innerHTML = filtered.map((item) => `
    <tr>
      <td>${item.date}</td>
      <td>${escapeHtml(item.studentName || '-')}</td>
      <td>${escapeHtml(item.lessonType)}</td>
      <td>${item.hours}</td>
      <td>${escapeHtml(item.note || '-')}</td>
      <td><button class="small-btn" onclick="removeRecord('${item.id}')">删除</button></td>
    </tr>
  `).join('');
}

function renderStudentManagePanel() {
  studentManagePanel.classList.toggle('collapsed', !studentManageExpanded);
  toggleStudentManageBtn.textContent = studentManageExpanded ? '学生管理（点击收起）' : '学生管理（点击展开）';
}

function renderMonthStatsPanel() {
  monthStatsPanel.classList.toggle('collapsed', !monthStatsExpanded);
  toggleMonthStatsBtn.textContent = monthStatsExpanded ? '本月统计（点击收起）' : '本月统计（点击展开）';
}

function renderTotalStatsPanel() {
  totalStatsPanel.classList.toggle('collapsed', !totalStatsExpanded);
  toggleTotalStatsBtn.textContent = totalStatsExpanded ? '总统计（点击收起）' : '总统计（点击展开）';
}

function renderAll() {
  renderStudentOptions();
  renderStudentList();
  renderStudentManagePanel();
  renderMonthStatsPanel();
  renderTotalStatsPanel();
  renderRecords();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function removeRecord(id) {
  const records = loadRecords().filter((item) => item.id !== id);
  saveRecords(records);
  renderRecords();
}

window.removeRecord = removeRecord;
window.toggleStudentStatus = toggleStudentStatus;
window.deleteStudent = deleteStudent;

function addStudentFromInput(inputEl) {
  const name = normalizeStudent(inputEl.value);
  if (!name) return null;
  const student = ensureStudent(name, true);
  inputEl.value = '';
  renderAll();
  studentSelect.value = student.id;
  return student;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  let selectedStudentId = studentSelect.value;
  if (!selectedStudentId && newStudentNameInput.value.trim()) {
    const student = addStudentFromInput(newStudentNameInput);
    selectedStudentId = student?.id || '';
  }

  if (!selectedStudentId) {
    alert('请先选择学生，或者先新增一个学生。');
    return;
  }

  const students = loadStudents();
  const selectedStudent = students.find(item => item.id === selectedStudentId);
  if (!selectedStudent) {
    alert('未找到这个学生，请重新选择。');
    return;
  }

  const record = {
    id: crypto.randomUUID(),
    date: dateInput.value,
    studentId: selectedStudent.id,
    studentName: selectedStudent.name,
    lessonType: lessonTypeInput.value,
    hours: toFixedHours(hoursInput.value),
    note: noteInput.value.trim(),
  };

  const records = loadRecords();
  records.push(record);
  saveRecords(records);

  form.reset();
  dateInput.value = today();
  lessonTypeInput.value = record.lessonType;
  studentSelect.value = selectedStudent.id;
  setHoursChoice('1');
  renderRecords();
});

hoursChoiceGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.hour-choice');
  if (!btn) return;
  setHoursChoice(btn.dataset.hours);
});

addStudentQuickBtn.addEventListener('click', () => addStudentFromInput(newStudentNameInput));
addStudentBtn.addEventListener('click', () => addStudentFromInput(manageStudentNameInput));
batchImportBtn.addEventListener('click', () => {
  const text = batchStudentNamesInput.value;
  if (!text.trim()) {
    alert('请先粘贴学生名单。');
    return;
  }
  const result = batchImportStudents(text);
  batchStudentNamesInput.value = '';
  alert(`导入完成：新增 ${result.added} 人，恢复 ${result.reactivated} 人。`);
});
showInactiveBtn.addEventListener('click', () => {
  showInactiveStudents = !showInactiveStudents;
  renderStudentList();
});
toggleStudentManageBtn.addEventListener('click', () => {
  studentManageExpanded = !studentManageExpanded;
  renderStudentManagePanel();
});
toggleMonthStatsBtn.addEventListener('click', () => {
  monthStatsExpanded = !monthStatsExpanded;
  renderMonthStatsPanel();
});
toggleTotalStatsBtn.addEventListener('click', () => {
  totalStatsExpanded = !totalStatsExpanded;
  renderTotalStatsPanel();
});

monthFilter.addEventListener('input', renderRecords);
keywordFilter.addEventListener('input', renderRecords);
typeFilter.addEventListener('input', renderRecords);
studentFilter.addEventListener('input', renderRecords);

clearBtn.addEventListener('click', () => {
  if (!confirm('确定要清空全部记录吗？此操作无法撤销。')) return;
  localStorage.removeItem(RECORDS_KEY);
  renderRecords();
});

exportBtn.addEventListener('click', () => {
  const records = loadRecords();
  if (!records.length) {
    alert('暂无可导出的记录');
    return;
  }

  const header = ['日期', '学生姓名', '课时类型', '课时', '备注'];
  const rows = records.map(item => [item.date, item.studentName || '', item.lessonType, item.hours, item.note || '']);
  const csv = [header, ...rows]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `课时记录-${currentMonth()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

dateInput.value = today();
monthFilter.value = currentMonth();
setHoursChoice('1');
renderAll();