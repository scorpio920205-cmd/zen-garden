/**
 * 精進花園 - 最高權限後台管理邏輯 (admin.js)
 * 專供精舍法師與執事幹部查閱全班名錄（含真實姓名與學號）、批註開示、資料管理
 */

const ADMIN_STORAGE_KEY = 'zen_garden_admin_token_v1';

document.addEventListener('DOMContentLoaded', () => {
  checkAdminSession();
});

// 檢查目前是否已登入
function checkAdminSession() {
  const token = sessionStorage.getItem(ADMIN_STORAGE_KEY);
  const lockScreen = document.getElementById('adminLockScreen');
  const mainDashboard = document.getElementById('adminDashboard');

  if (token) {
    if (lockScreen) lockScreen.style.display = 'none';
    if (mainDashboard) mainDashboard.style.display = 'block';
    loadAdminDashboardData();
  } else {
    if (lockScreen) lockScreen.style.display = 'block';
    if (mainDashboard) mainDashboard.style.display = 'none';
  }
}

// 登入最高權限
async function handleAdminLogin(e) {
  if (e) e.preventDefault();
  const pwdInput = document.getElementById('adminPassword');
  const errEl = document.getElementById('adminAuthError');
  const pwd = pwdInput ? pwdInput.value.trim() : '';

  if (!pwd) {
    showAuthError("請輸入最高權限密碼");
    return;
  }

  errEl.textContent = "驗證中……";
  errEl.style.display = "block";
  errEl.style.color = "var(--gold-bronze)";

  const res = await ZenAPI.verifyAdminPassword(pwd);
  if (res.success) {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, pwd);
    errEl.style.display = "none";
    pwdInput.value = "";
    checkAdminSession();
  } else {
    showAuthError(res.error || "密碼不正確，請確認後重試！");
  }
}

function showAuthError(msg) {
  const errEl = document.getElementById('adminAuthError');
  if (errEl) {
    errEl.textContent = `⚠️ ${msg}`;
    errEl.style.display = "block";
    errEl.style.color = "var(--vermilion)";
  }
}

// 登出
function handleAdminLogout() {
  sessionStorage.removeItem(ADMIN_STORAGE_KEY);
  checkAdminSession();
}

// 載入完整名錄與打卡紀錄
let allStudentsCache = [];
let allCheckinsCache = [];
let currentAdminClassFilter = '';

async function loadAdminDashboardData() {
  const pwd = sessionStorage.getItem(ADMIN_STORAGE_KEY);
  if (!pwd) return;

  const res = await ZenAPI.getAdminFullRecords(pwd);
  if (!res.success) {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    checkAdminSession();
    return;
  }

  allStudentsCache = res.students || [];
  allCheckinsCache = res.checkins || [];

  updateDashboardStats();
  renderStudentTable();
  renderCheckinsStream();
}

function updateDashboardStats() {
  const dayCount = allStudentsCache.filter(s => s.class_type === '日高').length;
  const nightCount = allStudentsCache.filter(s => s.class_type === '夜高').length;
  const totalMins = allStudentsCache.reduce((sum, s) => sum + (s.total_meditation_mins || 0), 0);

  document.getElementById('statTotalStudents').textContent = allStudentsCache.length;
  document.getElementById('statDayStudents').textContent = dayCount;
  document.getElementById('statNightStudents').textContent = nightCount;
  document.getElementById('statTotalCheckins').textContent = allCheckinsCache.length;
  document.getElementById('statTotalMeditation').textContent = totalMins;
}

// 渲染學員總覽名錄 (含真實姓名與學號)
function renderStudentTable() {
  const tbody = document.getElementById('studentsTableBody');
  if (!tbody) return;

  const filtered = allStudentsCache.filter(s => !currentAdminClassFilter || s.class_type === currentAdminClassFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--ink-muted);">查無學員資料</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td><span class="badge-class">${s.class_type}</span></td>
      <td>${s.group_name}</td>
      <td style="font-family:monospace; color:var(--ink-muted);">${s.student_no || '—'}</td>
      <td style="font-weight:600; color:var(--ink-deep);">${s.real_name}</td>
      <td style="color:var(--gold-bronze); font-weight:600;">${s.dharma_name}</td>
      <td><strong>${s.total_checkins}</strong> 次</td>
      <td>${s.total_meditation_mins} 分</td>
      <td>
        <a href="garden2d.html?visitor=1&id=${s.id}" target="_blank" class="btn-secondary" style="padding:0.25rem 0.75rem; font-size:0.8rem;">
          🌸 巡視花園
        </a>
      </td>
    </tr>
  `).join('');
}

// 渲染打卡紀錄與法師線上批註
function renderCheckinsStream() {
  const container = document.getElementById('adminCheckinStream');
  if (!container) return;

  const filtered = allCheckinsCache.filter(c => !currentAdminClassFilter || c.class_type === currentAdminClassFilter);

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:2.5rem; color:var(--ink-muted);">尚無修持紀錄</div>`;
    return;
  }

  container.innerHTML = filtered.map(c => `
    <div class="zen-card" style="margin-bottom:1.2rem; padding:1.4rem; border-left:4px solid var(--pine-green);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.8rem;">
        <div>
          <span class="badge-class">${c.class_type}</span>
          <span style="font-weight:600; margin-left:0.4rem; font-size:1.05rem;">${c.group_name} · ${c.dharma_name}</span>
          <span style="font-size:0.85rem; color:var(--ink-muted); margin-left:0.5rem;">（修持項目：${c.practice_item}）</span>
        </div>
        <div style="font-size:0.82rem; color:var(--gold-bronze); font-weight:500;">
          📅 修持時間：${c.record_time}
        </div>
      </div>

      <div style="font-size:0.92rem; color:var(--ink-base); margin-bottom:0.6rem;">
        ${c.meditation_minutes ? `⏱️ 靜坐：${c.meditation_minutes} 分鐘 ｜ ` : ''}
        ${c.sutra_name ? `📖 經典：${c.sutra_name}（${c.sutra_count} 部） ｜ ` : ''}
        ${c.mantra_name ? `📿 持咒：${c.mantra_name}（${c.mantra_count} 遍）` : ''}
      </div>

      ${c.reflection_note ? `
        <div style="background:var(--bg-card-sub); padding:0.9rem 1.2rem; border-radius:var(--radius-sm); font-size:0.92rem; line-height:1.8; margin-bottom:0.8rem;">
          <strong>學員修持反思：</strong>${c.reflection_note}
        </div>
      ` : ''}

      <!-- 指導法師批註開示區 -->
      <div id="commentBoxWrap-${c.id}" style="background:#f4f9f7; border:1px solid rgba(45,76,66,0.2); border-radius:var(--radius-md); padding:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <strong style="color:var(--pine-green); font-size:0.92rem;">📜 指導法師慈悲開示：</strong>
          <span style="font-size:0.78rem; color:var(--ink-muted);">${c.commented_at ? `已批註：${c.commented_at}` : '尚未批註'}</span>
        </div>
        <textarea id="commentInput-${c.id}" class="form-control" style="background:#ffffff; font-size:0.9rem;" placeholder="輸入法師對該同修的修持指導或關懷開示……">${c.mentor_comment || ''}</textarea>
        <div style="margin-top:0.6rem; display:flex; justify-content:flex-end;">
          <button type="button" class="btn-primary" style="padding:0.35rem 1.2rem; font-size:0.85rem;" onclick="saveMentorComment(${c.id})">
            💾 儲存法師開示
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// 儲存法師批註
async function saveMentorComment(checkinId) {
  const pwd = sessionStorage.getItem(ADMIN_STORAGE_KEY);
  const input = document.getElementById(`commentInput-${checkinId}`);
  if (!input) return;

  const comment = input.value.trim();
  const res = await ZenAPI.addMentorComment(checkinId, comment, pwd);
  if (res.success) {
    alert("法師開示已成功存檔，學員於「我的修持歷程」中可同步看見！");
    loadAdminDashboardData();
  } else {
    alert(`儲存失敗：${res.error || '請稍後重試'}`);
  }
}

// 篩選班別
function filterAdminClass(classType, btnEl) {
  currentAdminClassFilter = classType;
  document.querySelectorAll('.admin-filter-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderStudentTable();
  renderCheckinsStream();
}

// 匯出 JSON 備份檔
function exportAllDataJSON() {
  const data = {
    exported_at: new Date().toISOString(),
    students: allStudentsCache,
    checkins: allCheckinsCache
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `精進花園名錄備份_${new Date().toISOString().substring(0, 10)}.json`;
  a.click();
}
