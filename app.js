const STORAGE_KEY = 'lesson-hours-records-v1';

const form = document.getElementById('recordForm');
const dateInput = document.getElementById('date');
const teacherInput = document.getElementById('teacher');
const courseInput = document.getElementById('course');
const minutesInput = document.getElementById('minutes');
const unitMinutesInput = document.getElementById('unitMinutes');
const noteInput = document.getElementById('note');
const monthFilter = document.getElementById('monthFilter');
const keywordFilter = document.getElementById('keywordFilter');
const tableBody = document.getElementById('recordTable');
const totalCount = document.getElementById('totalCount');
const totalHours = document.getElementById('totalHours');
const monthHours = document.getElementById('monthHours');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');

function today() {
  return new Date().toISOString().split('T')[0];
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function calcHours(minutes, unitMinutes) {
  return (Number(minutes) / Number(unitMinutes)).toFixed(2);
}

function getFilteredRecords(records) {
  const month = monthFilter.value;
  const keyword = keywordFilter.value.trim().toLowerCase();

  return records.filter((item) => {
    const matchMonth = !month || item.date.startsWith(month);
    const text = `${item.teacher} ${item.course} ${item.note}`.toLowerCase();
    const matchKeyword = !keyword || text.includes(keyword);
    return matchMonth && matchKeyword;
  });
}

function render() {
  const records = loadRecords().sort((a, b) => b.date.localeCompare(a.date));
  const filtered = getFilteredRecords(records);

  totalCount.textContent = String(records.length);
  totalHours.textContent = records.reduce((sum, item) => sum + Number(item.hours), 0).toFixed(2);
  monthHours.textContent = records
    .filter((item) => item.date.startsWith(currentMonth()))
    .reduce((sum, item) => sum + Number(item.hours), 0)
    .toFixed(2);

  if (!filtered.length) {
    tableBody.innerHTML = '<tr><td colspan="7" class="empty">还没有记录</td></tr>';
    return;
  }

  tableBody.innerHTML = filtered.map((item) => `
    <tr>
      <td>${item.date}</td>
      <td>${escapeHtml(item.teacher)}</td>
      <td>${escapeHtml(item.course)}</td>
      <td>${item.minutes} 分钟</td>
      <td>${item.hours}</td>
      <td>${escapeHtml(item.note || '-')}</td>
      <td><button class="small-btn" onclick="removeRecord('${item.id}')">删除</button></td>
    </tr>
  `).join('');
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
  render();
}

window.removeRecord = removeRecord;

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const record = {
    id: crypto.randomUUID(),
    date: dateInput.value,
    teacher: teacherInput.value.trim(),
    course: courseInput.value.trim(),
    minutes: Number(minutesInput.value),
    unitMinutes: Number(unitMinutesInput.value),
    hours: calcHours(minutesInput.value, unitMinutesInput.value),
    note: noteInput.value.trim(),
  };

  const records = loadRecords();
  records.push(record);
  saveRecords(records);

  form.reset();
  dateInput.value = today();
  unitMinutesInput.value = record.unitMinutes;
  render();
});

monthFilter.addEventListener('input', render);
keywordFilter.addEventListener('input', render);

clearBtn.addEventListener('click', () => {
  if (!confirm('确定要清空全部记录吗？此操作无法撤销。')) return;
  localStorage.removeItem(STORAGE_KEY);
  render();
});

exportBtn.addEventListener('click', () => {
  const records = loadRecords();
  if (!records.length) {
    alert('暂无可导出的记录');
    return;
  }

  const header = ['日期', '老师姓名', '课程名称', '上课时长(分钟)', '1课时分钟数', '课时', '备注'];
  const rows = records.map(item => [item.date, item.teacher, item.course, item.minutes, item.unitMinutes, item.hours, item.note || '']);
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
render();