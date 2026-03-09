const STORAGE_KEY = 'lesson-hours-records-v5';

const form = document.getElementById('recordForm');
const dateInput = document.getElementById('date');
const startTimeInput = document.getElementById('startTime');
const courseInput = document.getElementById('course');
const lessonTypeInput = document.getElementById('lessonType');
const hoursInput = document.getElementById('hours');
const noteInput = document.getElementById('note');
const monthFilter = document.getElementById('monthFilter');
const keywordFilter = document.getElementById('keywordFilter');
const typeFilter = document.getElementById('typeFilter');
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

function today() {
  return new Date().toISOString().split('T')[0];
}

function nowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function toFixedHours(value) {
  return Number(value || 0).toFixed(2);
}

function migrateRecords(records) {
  return records.map(item => ({
    id: item.id || crypto.randomUUID(),
    date: item.date || today(),
    startTime: item.startTime || '',
    course: item.course || '',
    lessonType: item.lessonType || '阶梯课时',
    hours: toFixedHours(item.hours ?? ((Number(item.minutes || 0) && Number(item.unitMinutes || 0)) ? Number(item.minutes) / Number(item.unitMinutes) : 0)),
    note: item.note || '',
  }));
}

function loadRecords() {
  try {
    const v5 = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (v5) return migrateRecords(v5);

    const v4 = JSON.parse(localStorage.getItem('lesson-hours-records-v4'));
    if (v4) {
      const migrated = migrateRecords(v4);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    const v3 = JSON.parse(localStorage.getItem('lesson-hours-records-v3'));
    if (v3) {
      const migrated = migrateRecords(v3);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    const v2 = JSON.parse(localStorage.getItem('lesson-hours-records-v2'));
    if (v2) {
      const migrated = migrateRecords(v2);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    const v1 = JSON.parse(localStorage.getItem('lesson-hours-records-v1'));
    if (v1) {
      const migrated = migrateRecords(v1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function sumHours(records) {
  return records.reduce((sum, item) => sum + Number(item.hours), 0).toFixed(2);
}

function getFilteredRecords(records) {
  const month = monthFilter.value;
  const keyword = keywordFilter.value.trim().toLowerCase();
  const type = typeFilter.value;

  return records.filter((item) => {
    const matchMonth = !month || item.date.startsWith(month);
    const text = `${item.course} ${item.note} ${item.lessonType} ${item.startTime}`.toLowerCase();
    const matchKeyword = !keyword || text.includes(keyword);
    const matchType = !type || item.lessonType === type;
    return matchMonth && matchKeyword && matchType;
  });
}

function render() {
  const records = loadRecords().sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`));
  const filtered = getFilteredRecords(records);
  const currentMonthRecords = records.filter((item) => item.date.startsWith(currentMonth()));
  const tierRecords = records.filter((item) => item.lessonType === '阶梯课时');
  const shareRecords = records.filter((item) => item.lessonType === '分成课时');
  const currentMonthTierRecords = currentMonthRecords.filter((item) => item.lessonType === '阶梯课时');
  const currentMonthShareRecords = currentMonthRecords.filter((item) => item.lessonType === '分成课时');

  totalCount.textContent = String(records.length);
  totalHours.textContent = sumHours(records);
  monthHours.textContent = sumHours(currentMonthRecords);
  tierHours.textContent = sumHours(tierRecords);
  shareHours.textContent = sumHours(shareRecords);
  monthTierHours.textContent = sumHours(currentMonthTierRecords);
  monthShareHours.textContent = sumHours(currentMonthShareRecords);

  if (!filtered.length) {
    tableBody.innerHTML = '<tr><td colspan="7" class="empty">还没有记录</td></tr>';
    return;
  }

  tableBody.innerHTML = filtered.map((item) => `
    <tr>
      <td>${item.date}</td>
      <td>${item.startTime || '-'}</td>
      <td>${escapeHtml(item.course)}</td>
      <td>${escapeHtml(item.lessonType)}</td>
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
    startTime: startTimeInput.value,
    course: courseInput.value.trim(),
    lessonType: lessonTypeInput.value,
    hours: toFixedHours(hoursInput.value),
    note: noteInput.value.trim(),
  };

  const records = loadRecords();
  records.push(record);
  saveRecords(records);

  form.reset();
  dateInput.value = today();
  startTimeInput.value = nowTime();
  lessonTypeInput.value = record.lessonType;
  render();
});

monthFilter.addEventListener('input', render);
keywordFilter.addEventListener('input', render);
typeFilter.addEventListener('input', render);

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

  const header = ['日期', '上课时间', '课程名称', '课时类型', '课时', '备注'];
  const rows = records.map(item => [item.date, item.startTime || '', item.course, item.lessonType, item.hours, item.note || '']);
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
startTimeInput.value = nowTime();
monthFilter.value = currentMonth();
render();