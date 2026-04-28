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
let selectedPerformance = '良';

function today() { return new Date().toISOString().split('T')[0]; }
function currentMonth() { return new Date().toISOString().slice(0, 7); }
function toFixedHours(value) { return Number(value || 0).toFixed(2); }
function normalizeStudent(name) { return String(name || '').replace(/\s+/g, '').trim(); }
function escapeHtml(str) {
  return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
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

// 学生标签渲染
function renderStudentTags(student) {
  const tags = [];
  if (student.gender) tags.push(`<span class="student-tag tag-gender-${student.gender}">${escapeHtml(student.gender)}</span>`);
  if (student.subject) tags.push(`<span class="student-tag tag-subject">${escapeHtml(student.subject)}</span>`);
  if (student.direction) tags.push(`<span class="student-tag tag-direction">${escapeHtml(student.direction)}</span>`);
  if (student.level) tags.push(`<span class="student-tag tag-level">${escapeHtml(student.level)}</span>`);
  return tags.length ? `<div class="student-tags">${tags.join('')}</div>` : '';
}

// 选学生后显示信息
function showStudentInfo(studentId) {
  const box = document.getElementById('class-student-info');
  if (!studentId) { box.classList.remove('show'); return; }
  const s = studentsState.find(s => s.id === studentId);
  if (!s) { box.classList.remove('show'); return; }
  const parts = [];
  if (s.gender) parts.push(`性别：${s.gender}`);
  if (s.subject) parts.push(`专业：${s.subject}`);
  if (s.direction) parts.push(`方向：${s.direction}`);
  if (s.level) parts.push(`级别：${s.level}`);
  if (parts.length) {
    box.innerHTML = parts.join('　｜　');
    box.classList.add('show');
  } else {
    box.classList.remove('show');
  }
}
window.showStudentInfo = showStudentInfo;

// 主 Tab 切换
function switchMainTab(tab) {
  document.querySelectorAll('.main-tab').forEach((el, i) => {
    el.classList.toggle('active', (i === 0 && tab === 'hours') || (i === 1 && tab === 'class'));
  });
  document.getElementById('tab-hours').classList.toggle('active', tab === 'hours');
  document.getElementById('tab-class').classList.toggle('active', tab === 'class');
  if (tab === 'class') renderClassStudentFilter();
}
window.switchMainTab = switchMainTab;

// 学生表现选择
function selectPerf(perf, el) {
  selectedPerformance = perf;
  document.querySelectorAll('.perf-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}
window.selectPerf = selectPerf;

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

// 编辑学生信息弹窗
function editStudentInfo(id) {
  const s = studentsState.find(s => s.id === id);
  if (!s) return;
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:20px;width:100%;max-width:400px;display:flex;flex-direction:column;gap:12px;">
      <strong style="font-size:16px">编辑：${escapeHtml(s.name)}</strong>
      <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;">性别
        <select id="edit-gender" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
          <option value="">不填</option>
          <option value="男" ${s.gender==='男'?'selected':''}>男</option>
          <option value="女" ${s.gender==='女'?'selected':''}>女</option>
        </select>
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;">专业
        <select id="edit-subject" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
          <option value="">不填</option>
          <option value="钢琴" ${s.subject==='钢琴'?'selected':''}>钢琴</option>
          <option value="美声" ${s.subject==='美声'?'selected':''}>美声</option>
          <option value="童声" ${s.subject==='童声'?'selected':''}>童声</option>
        </select>
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;">教学方向
        <select id="edit-direction" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
          <option value="">不填</option>
          <option value="兴趣" ${s.direction==='兴趣'?'selected':''}>兴趣</option>
          <option value="考级" ${s.direction==='考级'?'selected':''}>考级</option>
          <option value="兴趣+考级" ${s.direction==='兴趣+考级'?'selected':''}>兴趣+考级</option>
        </select>
      </label>
      <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;">目前级别
        <input id="edit-level" type="text" value="${escapeHtml(s.level||'')}" placeholder="例如：中国院九级、英皇五级" style="padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
      </label>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <button onclick="this.closest('div[style]').remove()" style="flex:1;padding:10px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-size:14px;">取消</button>
        <button id="edit-save-btn" style="flex:1;padding:10px;border:none;border-radius:8px;background:#1a1a1a;color:#fff;cursor:pointer;font-size:14px;font-weight:500;">保存</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#edit-save-btn').addEventListener('click', async () => {
    const gender = modal.querySelector('#edit-gender').value;
    const subject = modal.querySelector('#edit-subject').value;
    const direction = modal.querySelector('#edit-direction').value;
    const level = modal.querySelector('#edit-level').value.trim();
    const { error } = await supabaseClient.from('students').update({ gender, subject, direction, level }).eq('id', id);
    if (error) { alert(error.message); return; }
    modal.remove();
    await fetchStudents();
    renderAll();
    showToast('学生信息已更新');
  });
}
window.editStudentInfo = editStudentInfo;

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
    .select('id, date, lesson_type, hours, note, student_id, students(name)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  recordsState = (data || []).map(item => ({
    id: item.id,
    date: item.date,
    studentId: item.student_id,
    studentName: item.students?.name || '',
    lessonType: item.lesson_type,
    hours: toFixedHours(item.hours),
    note: item.note || '',
  }));
}
async function fetchClassRecords() {
  const { data, error } = await supabaseClient
    .from('class_records')
    .select('id, date, student_id, content, homework, performance, note, students(name, gender, subject, direction, level)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  classRecordsState = (data || []).map(item => ({
    id: item.id,
    date: item.date,
    studentId: item.student_id,
    studentName: item.students?.name || '',
    studentGender: item.students?.gender || '',
    studentSubject: item.students?.subject || '',
    studentDirection: item.students?.direction || '',
    studentLevel: item.students?.level || '',
    content: item.content || '',
    homework: item.homework || '',
    performance: item.performance || '',
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

async function saveClassRecord() {
  const date = document.getElementById('class-date').value;
  const studentId = document.getElementById('class-student').value;
  const content = document.getElementById('class-content').value.trim();
  const homework = document.getElementById('class-homework').value.trim();
  const note = document.getElementById('class-note').value.trim();
  if (!date || !studentId) { showToast('请填写日期和学生姓名'); return; }
  const { error } = await supabaseClient.from('class_records').insert({
    date, student_id: studentId, content, homework, performance: selectedPerformance, note,
  });
  if (error) { alert(error.message); return; }
  document.getElementById('class-content').value = '';
  document.getElementById('class-homework').value = '';
  document.getElementById('class-note').value = '';
  document.getElementById('class-student').value = '';
  document.getElementById('class-student-info').classList.remove('show');
  await fetchClassRecords();
  if (classListExpanded) renderClassRecords();
  showToast('课堂记录已保存 ✓');
}
window.saveClassRecord = saveClassRecord;

function renderClassStudentFilter() {
  const sel = document.getElementById('class-student');
  const filterSel = document.getElementById('class-student-filter');
  const active = studentsState.filter(s => s.active);
  sel.innerHTML = '<option value="">选择学生</option>' + active.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
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
  const perfClass = p => p === '优' ? 'perf-good' : p === '一般' ? 'perf-bad' : 'perf-ok';
  list.innerHTML = filtered.map(r => {
    const tags = [];
    if (r.studentGender) tags.push(`<span class="student-tag tag-gender-${r.studentGender}">${escapeHtml(r.studentGender)}</span>`);
    if (r.studentSubject) tags.push(`<span class="student-tag tag-subject">${escapeHtml(r.studentSubject)}</span>`);
    if (r.studentDirection) tags.push(`<span class="student-tag tag-direction">${escapeHtml(r.studentDirection)}</span>`);
    if (r.studentLevel) tags.push(`<span class="student-tag tag-level">${escapeHtml(r.studentLevel)}</span>`);
    return `
    <div class="class-record-item">
      <div class="class-record-header">
        <div>
          <span class="class-record-name">${escapeHtml(r.studentName)}</span>
          <span class="class-record-date" style="margin-left:8px">${r.date}</span>
          ${tags.length ? `<div class="student-tags" style="margin-top:4px">${tags.join('')}</div>` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span class="class-record-perf ${perfClass(r.performance)}">${escapeHtml(r.performance)}</span>
          <button class="delete-btn" onclick="removeClassRecord('${r.id}')">删除</button>
        </div>
      </div>
      <div class="class-record-body">
        ${r.content ? `<div><strong>本节课：</strong>${escapeHtml(r.content).replace(/\n/g, '<br>')}</div>` : ''}
        ${r.homework ? `<div><strong>作业：</strong>${escapeHtml(r.homework).replace(/\n/g, '<br>')}</div>` : ''}
        ${r.note ? `<div><strong>备注：</strong>${escapeHtml(r.note)}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderStudentOptions() {
  const activeStudents = studentsState.filter(item => item.active);
  const currentValues = getSelectedStudentIds();
  const currentFilter = studentFilter.value;
  studentSelect.innerHTML = activeStudents.map(item => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('');
  setSelectedStudents(currentValues.filter(id => activeStudents.some(item => item.id === id)));
  studentFilter.innerHTML = ['<option value="">全部学生</option>', ...studentsState.map(item => `<option value="${item.id}">${escapeHtml(item.name)}${item.active ? '' : '（已停课）'}</option>`)].join('');
  if (currentFilter && studentsState.some(item => item.id === currentFilter)) studentFilter.value = currentFilter;
}

function renderStudentList() {
  const visible = studentsState.filter(item => showInactiveStudents || item.active);
  if (!visible.length) {
    studentList.innerHTML = '<div class="empty-students">还没有学生，先新增一个吧。</div>';
    return;
  }
  studentList.innerHTML = visible.map(item => `
    <div class="student-chip ${item.active ? '' : 'inactive'}">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${item.active ? '在读' : '已停课'}</span>
        ${renderStudentTags(item)}
      </div>
      <div class="chip-actions">
        <button type="button" class="small-btn" onclick="editStudentInfo('${item.id}')">编辑</button>
        <button type="button" class="small-btn" onclick="toggleStudentStatus('${item.id}')">${item.active ? '停课' : '恢复'}</button>
        <button type="button" class="small-btn danger-lite" onclick="deleteStudent('${item.id}')">删除</button>
      </div>
    </div>`).join('');
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
  const currentMonthRecords = recordsState.filter(item => item.date.startsWith(currentMonth()));
  const tierRecords = recordsState.filter(item => item.lessonType === '阶梯课时');
  const shareRecords = recordsState.filter(item => item.lessonType === '陪练课时');
  const currentMonthTierRecords = currentMonthRecords.filter(item => item.lessonType === '阶梯课时');
  const currentMonthShareRecords = currentMonthRecords.filter(item => item.lessonType === '陪练课时');
  totalCount.textContent = String(recordsState.length);
  totalHours.textContent = sumHours(recordsState);
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
    <tr>
      <td>${item.date}</td>
      <td>${escapeHtml(item.studentName || '-')}</td>
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
  const { error } = await supabaseClient.from('lesson_records').insert(rows);
  if (error) return alert(error.message);
  const selectedIdsToKeep = selectedStudents.map(student => student.id);
  form.reset();
  dateInput.value = today();
  lessonTypeInput.value = '阶梯课时';
  setHoursChoice('1');
  await fetchRecords();
  renderRecords();
  renderStudentOptions();
  setSelectedStudents(selectedIdsToKeep);
  showToast(`已保存 ${selectedStudents.length} 条记录`);
});

hoursChoiceGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.hour-choice');
  if (btn) setHoursChoice(btn.dataset.hours);
});

addStudentQuickBtn.addEventListener('click', async () => { await addStudentFromInput(newStudentNameInput); });

addStudentBtn.addEventListener('click', async () => {
  const name = normalizeStudent(manageStudentNameInput.value);
  if (!name) return alert('请填写学生姓名');
  const gender = document.getElementById('manageGender').value;
  const subject = document.getElementById('manageSubject').value;
  const direction = document.getElementById('manageDirection').value;
  const level = document.getElementById('manageLevel').value.trim();
  const existing = studentsState.find(item => item.name === name);
  if (existing) {
    const { error } = await supabaseClient.from('students').update({ active: true, gender, subject, direction, level }).eq('id', existing.id);
    if (error) return alert(error.message);
  } else {
    const { error } = await supabaseClient.from('students').insert({ name, active: true, gender, subject, direction, level });
    if (error) return alert(error.message);
  }
  manageStudentNameInput.value = '';
  document.getElementById('manageGender').value = '';
  document.getElementById('manageSubject').value = '';
  document.getElementById('manageDirection').value = '';
  document.getElementById('manageLevel').value = '';
  await fetchStudents();
  renderAll();
  showToast(`${name} 已新增`);
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
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) { console.error(error); return alert(`登录状态读取失败：${error.message}`); }
  setAuthUI(data.session);
  if (data.session) {
    try { await refreshData(); showToast('登录成功，云端同步已连接'); }
    catch (err) { console.error(err); alert(`云端连接失败：${err.message}`); }
  }
  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    setAuthUI(session);
    if (session) {
      try { await refreshData(); showToast('已登录'); }
      catch (err) { console.error(err); alert(`云端连接失败：${err.message}`); }
    }
  });
}

init();
