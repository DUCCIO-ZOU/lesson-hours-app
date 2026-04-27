const SUPABASE_URL = 'https://dzdaxinyoikwxpwejjzy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5ZSLCZbLXW8zgaFERIvdvQ_xcySS6nJ';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userLabel = document.getElementById('userLabel');
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
const toggleRecordListBtn = document.getElementById('toggleRecordListBtn');
const recordListPanel = document.getElementById('recordListPanel');
const toast = document.getElementById('toast');
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
const exportBtn = document.getElementById('exportBtn');

let currentSession = null;
let showInactiveStudents = false;
let studentManageExpanded = false;
let monthStatsExpanded = false;
let totalStatsExpanded = false;
let recordListExpanded = false;
let classListExpanded = false;
let toastTimer = null;
let studentsState = [];
let recordsState = [];
let classRecordsState = [];
let selectedPerformance = 3; // 默认3个👍

function today() { return new Date().toISOString().split('T')[0]; }
function currentMonth() { return new Date().toISOString().slice(0, 7); }
function toFixedHours(value) { return Number(value || 0).toFixed(2); }
function normalizeStudent(name) { return String(name || '').replace(/\s+/g, '').trim(); }
function escapeHtml(str) {
  return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = 'toast show' + (type === 'error' ? ' toast-error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}
function getSelectedStudentIds() {
  return Array.from(studentSelect.selectedOptions).map(option => option.value).filter(Boolean);
}
function setSelectedStudents(ids) {
  const idSet = new Set(ids);
  Array.from(studentSelect.options).forEach(option => { option.selected = idSet.has(option.value); });
}
function setHoursChoice(value) {
  hoursInput.value = value;
  document.querySelectorAll('.hour-choice').forEach(btn => btn.classList.toggle('active', btn.dataset.hours === String(value)));
}
function sumHours(records) {
  return records.reduce((sum, item) => sum + Number(item.hours), 0).toFixed(2);
}
function setAuthUI(session) {
  currentSession = session;
  const loggedIn = !!session;
  authScreen.classList.toggle('hidden', loggedIn);
  appShell.classList.toggle('hidden', !loggedIn);
  if (loggedIn) {
    const label = session.user?.user_metadata?.user_name || session.user?.email || '已登录';
    userLabel.textContent = label;
  }
}

// 👍 评分
function selectPerf(score) {
  selectedPerformance = score;
  document.querySelectorAll('.thumb-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i < score);
  });
}
window.selectPerf = selectPerf;

function renderThumbButtons() {
  const container = document.getElementById('perf-thumbs');
  if (!container) return;
  container.innerHTML = Array.from({length: 5}, (_, i) => 
    `<button type="button" class="thumb-btn ${i < selectedPerformance ? 'active' : ''}" onclick="selectPerf(${i+1})">👍</button>`
  ).join('');
}

// 主 Tab 切换
function switchMainTab(tab) {
  document.querySelectorAll('.main-tab').forEach((el, i) => {
    el.classList.toggle('active', (i === 0 && tab === 'hours') || (i === 1 && tab === 'class'));
  });
  document.getElementById('tab-hours').classList.toggle('active', tab === 'hours');
  document.getElementById('tab-class').classList.toggle('active', tab === 'class');
  if (tab === 'class') { renderClassStudentFilter(); renderThumbButtons(); }
}
window.switchMainTab = switchMainTab;

// 选学生时显示信息
function showStudentInfo(studentId) {
  const box = document.getElementById('class-student-info');
  if (!studentId) { box.classList.remove('show'); return; }
  const s = studentsState.find(s => s.id === studentId);
  if (!s) { box.classList.remove('show'); return; }
  const parts = [s.gender, s.subject, s.direction, s.campus, s.level].filter(Boolean);
  if (!parts.length) { box.classList.remove('show'); return; }
  box.innerHTML = parts.map(p => `<span class="info-tag">${escapeHtml(p)}</span>`).join('');
  box.classList.add('show');
}
window.showStudentInfo = showStudentInfo;

// 课堂记录列表展开
function toggleClassList() {
  classListExpanded = !classListExpanded;
  const panel = document.getElementById('classListPanel');
  const btn = panel.previousElementSibling;
  panel.classList.toggle('collapsed', !classListExpanded);
  btn.textContent = classListExpanded ? '课堂记录列表（点击收起）' : '课堂记录列表（点击展开）';
  if (classListExpanded) renderClassRecords();
}
window.toggleClassList = toggleClassList;

async function signInWithGitHub() {
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'github', options: { redirectTo } });
  if (error) alert(error.message);
}
async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) return alert(error.message);
  setAuthUI(null);
}

async function fetchStudents() {
  const { data, error } = await supabaseClient.from('students').select('*').order('name', { ascending: true });
  if (error) throw error;
  studentsState = data || [];
}
async function fetchRecords() {
  const { data, error } = await supabaseClient
    .from('lesson_records')
    .select('id, date, lesson_type, hours, note, student_id, students(name, is_private)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  recordsState = (data || []).map(item => ({
    id: item.id,
    date: item.date,
    studentId: item.student_id,
    studentName: item.students?.name || '',
    isPrivate: item.students?.is_private || false,
    lessonType: item.lesson_type,
    hours: toFixedHours(item.hours),
    note: item.note || '',
  }));
}
async function fetchClassRecords() {
  const { data, error } = await supabaseClient
    .from('class_records')
    .select('id, date, student_id, content, homework, performance, note, students(name, gender, subject, direction, campus, level)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  classRecordsState = (data || []).map(item => ({
    id: item.id,
    date: item.date,
    studentId: item.student_id,
    studentName: item.students?.name || '',
    gender: item.students?.gender || '',
    subject: item.students?.subject || '',
    direction: item.students?.direction || '',
    campus: item.students?.campus || '',
    level: item.students?.level || '',
    content: item.content || '',
    homework: item.homework || '',
    performance: item.performance || 3,
    note: item.note || '',
  }));
}
async function refreshData() {
  await Promise.all([fetchStudents(), fetchRecords(), fetchClassRecords()]);
  renderAll();
}

async function ensureStudent(name, active = true) {
  const cleanName = normalizeStudent(name);
  if (!cleanName) return null;
  const existing = studentsState.find(item => item.name === cleanName);
  if (existing) {
    if (active && !existing.active) {
      const { data, error } = await supabaseClient.from('students').update({ active: true }).eq('id', existing.id).select().single();
      if (error) throw error;
      await fetchStudents();
      return data;
    }
    return existing;
  }
  const { data, error } = await supabaseClient.from('students').insert({ name: cleanName, active }).select().single();
  if (error) throw error;
  await fetchStudents();
  return data;
}
async function batchImportStudents(rawText) {
  const names = [...new Set(String(rawText || '').split(/\r?\n|,|，|、|;|；/).map(normalizeStudent).filter(Boolean))];
  let added = 0, reactivated = 0;
  for (const name of names) {
    const existing = studentsState.find(item => item.name === name);
    if (existing) {
      if (!existing.active) {
        const { error } = await supabaseClient.from('students').update({ active: true }).eq('id', existing.id);
        if (error) throw error;
        reactivated += 1;
      }
      continue;
    }
    const { error } = await supabaseClient.from('students').insert({ name, active: true });
    if (error) throw error;
    added += 1;
  }
  await fetchStudents();
  renderAll();
  return { added, reactivated };
}
async function toggleStudentStatus(id) {
  const target = studentsState.find(item => item.id === id);
  if (!target) return;
  const { error } = await supabaseClient.from('students').update({ active: !target.active }).eq('id', id);
  if (error) return alert(error.message);
  await fetchStudents();
  renderAll();
}
async function togglePrivateStudent(id) {
  const target = studentsState.find(item => item.id === id);
  if (!target) return;
  const { error } = await supabaseClient.from('students').update({ is_private: !target.is_private }).eq('id', id);
  if (error) return alert(error.message);
  await fetchStudents();
  renderAll();
}
async function deleteStudent(id) {
  const target = studentsState.find(s => s.id === id);
  const used = recordsState.some(item => item.studentId === id || item.studentName === target?.name);
  if (used) return alert('这个学生已经有上课记录了，建议改成"已停课"，不要直接删除。');
  const { error } = await supabaseClient.from('students').delete().eq('id', id);
  if (error) return alert(error.message);
  await fetchStudents();
  renderAll();
}
window.toggleStudentStatus = toggleStudentStatus;
window.togglePrivateStudent = togglePrivateStudent;
window.deleteStudent = deleteStudent;

async function removeRecord(id) {
  const { error } = await supabaseClient.from('lesson_records').delete().eq('id', id);
  if (error) return alert(error.message);
  await fetchRecords();
  renderRecords();
}
window.removeRecord = removeRecord;

async function removeClassRecord(id) {
  const { error } = await supabaseClient.from('class_records').delete().eq('id', id);
  if (error) return alert(error.message);
  await fetchClassRecords();
  renderClassRecords();
}
window.removeClassRecord = removeClassRecord;

// 导出课堂记录
function exportClassRecord() {
  const date = document.getElementById('class-date').value;
  const studentId = document.getElementById('class-student').value;
  const content = document.getElementById('class-content').value.trim();
  const homework = document.getElementById('class-homework').value.trim();
  const note = document.getElementById('class-note').value.trim();

  if (!studentId) { showToast('请先选择学生', 'error'); return; }

  const s = studentsState.find(s => s.id === studentId);
  if (!s) return;

  const thumbs = '👍'.repeat(selectedPerformance);
  const text = [
    `姓名：${s.name}`,
    s.subject ? `专业：${s.subject}` : '',
    s.direction ? `教学方向：${s.direction}` : '',
    s.campus ? `校区：${s.campus}` : '',
    `上课日期：${date}`,
    content ? `课堂内容：${content}` : '',
    homework ? `课后作业：${homework}` : '',
    `课堂表现：${thumbs}`,
    note ? `备注：${note}` : '',
  ].filter(Boolean).join('\n');

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `课堂记录-${s.name}-${date}.txt`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('导出成功 ✓');
}
window.exportClassRecord = exportClassRecord;

// 保存课堂记录
async function saveClassRecord() {
  const date = document.getElementById('class-date').value;
  const studentId = document.getElementById('class-student').value;
  const content = document.getElementById('class-content').value.trim();
  const homework = document.getElementById('class-homework').value.trim();
  const note = document.getElementById('class-note').value.trim();

  if (!date || !studentId) { showToast('请填写日期和学生姓名', 'error'); return; }

  const saveBtn = document.getElementById('save-class-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中...';

  const { error } = await supabaseClient.from('class_records').insert({
    date,
    student_id: studentId,
    content,
    homework,
    performance: selectedPerformance,
    note,
  });

  if (error) {
    saveBtn.disabled = false;
    saveBtn.textContent = '保存课堂记录';
    showToast('保存失败：' + error.message, 'error');
    return;
  }

  // 重置表单
  document.getElementById('class-content').value = '';
  document.getElementById('class-homework').value = '';
  document.getElementById('class-note').value = '';
  document.getElementById('class-student').value = '';
  document.getElementById('class-student-info').classList.remove('show');
  selectedPerformance = 3;
  renderThumbButtons();

  saveBtn.disabled = false;
  saveBtn.textContent = '保存课堂记录';

  await fetchClassRecords();
  if (classListExpanded) renderClassRecords();
  showToast('✓ 课堂记录已保存！');
}
window.saveClassRecord = saveClassRecord;

function renderClassStudentFilter() {
  const sel = document.getElementById('class-student');
  const filterSel = document.getElementById('class-student-filter');
  const active = studentsState.filter(s => s.active);
  sel.innerHTML = '<option value="">选择学生</option>' + active.map(s => `<option value="${s.id}">${escapeHtml(s.name)}${s.is_private ? ' 🔒' : ''}</option>`).join('');
  filterSel.innerHTML = '<option value="">全部学生</option>' + studentsState.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
}

function renderClassRecords() {
  const month = document.getElementById('class-month-filter').value;
  const studentId = document.getElementById('class-student-filter').value;
  const list = document.getElementById('class-record-list');

  let filtered = classRecordsState.filter(r => {
    const matchMonth = !month || r.date.startsWith(month);
    const matchStudent = !studentId || r.studentId === studentId;
    return matchMonth && matchStudent;
  });

  if (!filtered.length) {
    list.innerHTML = '<div style="text-align:center;color:#999;padding:20px;font-size:13px;">暂无课堂记录</div>';
    return;
  }

  list.innerHTML = filtered.map(r => {
    const thumbs = '👍'.repeat(Number(r.performance) || 0);
    const grays = '👍'.repeat(5 - (Number(r.performance) || 0));
    return `
    <div class="class-record-item">
      <div class="class-record-header">
        <div>
          <span class="class-record-name">${escapeHtml(r.studentName)}</span>
          <span class="class-record-date" style="margin-left:8px">${r.date}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:13px">${thumbs}<span style="opacity:0.25">${grays}</span></span>
          <button class="delete-btn" onclick="removeClassRecord('${r.id}')">删除</button>
        </div>
      </div>
      <div class="class-record-body">
        ${r.content ? `<div><strong>本节课：</strong>${escapeHtml(r.content)}</div>` : ''}
        ${r.homework ? `<div><strong>作业：</strong>${escapeHtml(r.homework)}</div>` : ''}
        ${r.note ? `<div><strong>备注：</strong>${escapeHtml(r.note)}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderStudentOptions() {
  const activeStudents = studentsState.filter(item => item.active);
  const currentValues = getSelectedStudentIds();
  const currentFilter = studentFilter.value;
  studentSelect.innerHTML = activeStudents.map(item =>
    `<option value="${item.id}">${escapeHtml(item.name)}${item.is_private ? ' 🔒' : ''}</option>`
  ).join('');
  setSelectedStudents(currentValues.filter(id => activeStudents.some(item => item.id === id)));
  studentFilter.innerHTML = ['<option value="">全部学生</option>', ...studentsState.map(item =>
    `<option value="${item.id}">${escapeHtml(item.name)}${item.active ? '' : '（已停课）'}${item.is_private ? ' 🔒' : ''}</option>`
  )].join('');
  if (currentFilter && studentsState.some(item => item.id === currentFilter)) studentFilter.value = currentFilter;
}

function renderStudentList() {
  const visible = studentsState.filter(item => showInactiveStudents || item.active);
  if (!visible.length) {
    studentList.innerHTML = '<div class="empty-students">还没有学生，先新增一个吧。</div>';
    return;
  }
  studentList.innerHTML = visible.map(item => {
    const tags = [item.gender, item.subject, item.direction, item.campus, item.level].filter(Boolean);
    return `
    <div class="student-chip ${item.active ? '' : 'inactive'}">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        ${item.is_private ? '<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:10px;margin-left:4px">私教</span>' : ''}
        <span>${item.active ? '在读' : '已停课'}</span>
        ${tags.length ? `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px">${tags.map(t => `<span style="font-size:11px;background:#f0f0f0;color:#555;padding:1px 6px;border-radius:10px">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="chip-actions">
        <button type="button" class="small-btn" onclick="togglePrivateStudent('${item.id}')" title="${item.is_private ? '取消私教' : '标记私教'}">${item.is_private ? '取消私教' : '私教'}</button>
        <button type="button" class="small-btn" onclick="toggleStudentStatus('${item.id}')">${item.active ? '停课' : '恢复'}</button>
        <button type="button" class="small-btn danger-lite" onclick="deleteStudent('${item.id}')">删除</button>
      </div>
    </div>`;
  }).join('');
}

function getFilteredRecords(records) {
  const month = monthFilter.value;
  const keyword = keywordFilter.value.trim().toLowerCase();
  const type = typeFilter.value;
  const studentId = studentFilter.value;
  return records.filter((item) => {
    const matchMonth = !month || item.date.startsWith(month);
    const text = `${item.studentName} ${item.note} ${item.lessonType}`.toLowerCase();
    return matchMonth && (!keyword || text.includes(keyword)) && (!type || item.lessonType === type) && (!studentId || item.studentId === studentId);
  });
}

function renderRecords() {
  const filtered = getFilteredRecords(recordsState);
  // 私教学生不计入统计
  const nonPrivateRecords = recordsState.filter(item => !item.isPrivate);
  const currentMonthRecords = nonPrivateRecords.filter(item => item.date.startsWith(currentMonth()));
  const tierRecords = nonPrivateRecords.filter(item => item.lessonType === '阶梯课时');
  const shareRecords = nonPrivateRecords.filter(item => item.lessonType === '陪练课时');
  const currentMonthTierRecords = currentMonthRecords.filter(item => item.lessonType === '阶梯课时');
  const currentMonthShareRecords = currentMonthRecords.filter(item => item.lessonType === '陪练课时');
  totalCount.textContent = String(nonPrivateRecords.length);
  totalHours.textContent = sumHours(nonPrivateRecords);
  monthHours.textContent = sumHours(currentMonthRecords);
  tierHours.textContent = sumHours(tierRecords);
  shareHours.textContent = sumHours(shareRecords);
  monthTierHours.textContent = sumHours(currentMonthTierRecords);
  monthShareHours.textContent = sumHours(currentMonthShareRecords);
  if (!filtered.length) {
    tableBody.innerHTML = '<tr><td colspan="6" class="empty">还没有记录</td></tr>';
    return;
  }
  tableBody.innerHTML = filtered.map(item => `
    <tr${item.isPrivate ? ' style="opacity:0.6"' : ''}>
      <td>${item.date}</td>
      <td>${escapeHtml(item.studentName || '-')}${item.isPrivate ? ' 🔒' : ''}</td>
      <td>${escapeHtml(item.lessonType)}</td>
      <td>${item.hours}</td>
      <td>${escapeHtml(item.note || '-')}</td>
      <td><button class="small-btn" onclick="removeRecord('${item.id}')">删除</button></td>
    </tr>`).join('');
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
function renderRecordListPanel() {
  recordListPanel.classList.toggle('collapsed', !recordListExpanded);
  toggleRecordListBtn.textContent = recordListExpanded ? '记录列表（点击收起）' : '记录列表（点击展开）';
}
function renderAll() {
  renderStudentOptions();
  renderStudentList();
  renderStudentManagePanel();
  renderMonthStatsPanel();
  renderTotalStatsPanel();
  renderRecordListPanel();
  renderRecords();
  renderClassStudentFilter();
  if (classListExpanded) renderClassRecords();
}

async function addStudentFromInput(inputEl) {
  const name = normalizeStudent(inputEl.value);
  if (!name) return null;
  try {
    const student = await ensureStudent(name, true);
    inputEl.value = '';
    renderAll();
    setSelectedStudents([student.id]);
    return student;
  } catch (error) {
    alert(error.message);
    return null;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  let selectedStudentIds = getSelectedStudentIds();
  if (!selectedStudentIds.length && newStudentNameInput.value.trim()) {
    const student = await addStudentFromInput(newStudentNameInput);
    selectedStudentIds = student ? [student.id] : [];
  }
  if (!selectedStudentIds.length) return alert('请先选择至少一个学生，或者先新增一个学生。');
  const selectedStudents = selectedStudentIds.map(id => studentsState.find(item => item.id === id)).filter(Boolean);
  if (!selectedStudents.length) return alert('未找到所选学生，请重新选择。');
  const rows = selectedStudents.map(student => ({
    date: dateInput.value,
    student_id: student.id,
    lesson_type: lessonTypeInput.value,
    hours: Number(hoursInput.value),
    note: noteInput.value.trim(),
  }));

  const submitBtn = form.querySelector('button[type=submit]');
  submitBtn.disabled = true;
  submitBtn.textContent = '保存中...';

  const { error } = await supabaseClient.from('lesson_records').insert(rows);

  submitBtn.disabled = false;
  submitBtn.textContent = '保存记录';

  if (error) { showToast('保存失败：' + error.message, 'error'); return; }

  form.reset();
  dateInput.value = today();
  lessonTypeInput.value = '阶梯课时';
  setHoursChoice('1');
  // 重置学生选择为0项
  Array.from(studentSelect.options).forEach(opt => opt.selected = false);

  await fetchRecords();
  renderRecords();
  renderStudentOptions();
  showToast(`✓ 已保存 ${selectedStudents.length} 条记录！`);
});

hoursChoiceGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.hour-choice');
  if (btn) setHoursChoice(btn.dataset.hours);
});

addStudentQuickBtn.addEventListener('click', async () => { await addStudentFromInput(newStudentNameInput); });

addStudentBtn.addEventListener('click', async () => {
  const name = normalizeStudent(manageStudentNameInput.value);
  if (!name) return alert('请输入学生姓名');
  const gender = document.getElementById('manageGender').value;
  const subject = document.getElementById('manageSubject').value;
  const direction = document.getElementById('manageDirection').value;
  const campus = document.getElementById('manageCampus').value;
  const level = document.getElementById('manageLevel').value.trim();

  const existing = studentsState.find(item => item.name === name);
  if (existing) {
    const { error } = await supabaseClient.from('students').update({ active: true, gender, subject, direction, campus, level }).eq('id', existing.id);
    if (error) return alert(error.message);
  } else {
    const { error } = await supabaseClient.from('students').insert({ name, active: true, gender, subject, direction, campus, level });
    if (error) return alert(error.message);
  }

  manageStudentNameInput.value = '';
  document.getElementById('manageGender').value = '';
  document.getElementById('manageSubject').value = '';
  document.getElementById('manageDirection').value = '';
  document.getElementById('manageCampus').value = '';
  document.getElementById('manageLevel').value = '';

  await fetchStudents();
  renderAll();
  showToast('✓ 学生已添加！');
});

batchImportBtn.addEventListener('click', async () => {
  if (!batchStudentNamesInput.value.trim()) return alert('请先粘贴学生名单。');
  try {
    const result = await batchImportStudents(batchStudentNamesInput.value);
    batchStudentNamesInput.value = '';
    showToast(`导入完成：新增 ${result.added} 人，恢复 ${result.reactivated} 人`);
  } catch (error) { alert(error.message); }
});

showInactiveBtn.addEventListener('click', () => { showInactiveStudents = !showInactiveStudents; renderStudentList(); });
toggleStudentManageBtn.addEventListener('click', () => { studentManageExpanded = !studentManageExpanded; renderStudentManagePanel(); });
toggleMonthStatsBtn.addEventListener('click', () => { monthStatsExpanded = !monthStatsExpanded; renderMonthStatsPanel(); });
toggleTotalStatsBtn.addEventListener('click', () => { totalStatsExpanded = !totalStatsExpanded; renderTotalStatsPanel(); });
toggleRecordListBtn.addEventListener('click', () => { recordListExpanded = !recordListExpanded; renderRecordListPanel(); });
monthFilter.addEventListener('input', renderRecords);
keywordFilter.addEventListener('input', renderRecords);
typeFilter.addEventListener('input', renderRecords);
studentFilter.addEventListener('input', renderRecords);
loginBtn.addEventListener('click', signInWithGitHub);
logoutBtn.addEventListener('click', signOut);

document.getElementById('class-month-filter').addEventListener('input', () => { if (classListExpanded) renderClassRecords(); });
document.getElementById('class-student-filter').addEventListener('input', () => { if (classListExpanded) renderClassRecords(); });

exportBtn.addEventListener('click', () => {
  if (!recordsState.length) return alert('暂无可导出的记录');
  const rows = getFilteredRecords(recordsState);
  const header = ['日期', '学生姓名', '课时类型', '课时', '备注'];
  const csv = [header, ...rows.map(item => [item.date, item.studentName || '', item.lessonType, item.hours, item.note || ''])]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `课时记录-${currentMonth()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('导出成功');
});

async function init() {
  dateInput.value = today();
  document.getElementById('class-date').value = today();
  document.getElementById('class-month-filter').value = currentMonth();
  monthFilter.value = currentMonth();
  setHoursChoice('1');
  renderThumbButtons();

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) { console.error(error); return alert(`登录状态读取失败：${error.message}`); }
  setAuthUI(data.session);
  if (data.session) {
    try {
      await refreshData();
      showToast('登录成功，云端同步已连接');
    } catch (err) {
      console.error(err);
      alert(`云端连接失败：${err.message}`);
    }
  }

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    setAuthUI(session);
    if (session) {
      try {
        await refreshData();
        showToast('已登录');
      } catch (err) {
        console.error(err);
        alert(`云端连接失败：${err.message}`);
      }
    }
  });
}

init();
