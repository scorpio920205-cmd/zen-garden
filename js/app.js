/**
 * ═══════════════════════════════════════════════════════════════
 * 精進花園 - 核心應用程式邏輯 (app.js)
 * 
 * 核心規範：
 * 1. 登入/註冊門檻：未登入時僅顯示登入註冊畫面，登入後才展開花園與每日打卡。
 * 2. 結合每日打卡數量注入蓮池：打卡累積長出【蓮花】＋【太陽花】。
 * 3. 圖片本身無花，花朵完全依修持打卡數量動態生長與盛開。
 * 4. 保留木牌法語（惟覺安公老和尚《中台月刊》開示）。
 * 5. 精簡修持內容：僅【靜坐】與【每日誦經】（金剛經、藥師經、普門品或自填，無卷數、無持咒）。
 * 6. 無右下角工具列、無「我的修持歷程」。
 * 7. 參觀他人花園嚴格隱私保護：僅公開班級與法名，學號與真實姓名嚴格隱藏！
 * ═══════════════════════════════════════════════════════════════
 */

const STORAGE_SESSION_KEY = 'zen_garden_logged_student_v2';
let currentStudent = null;
let isVisitingMode = false;
let visitingStudentData = null;
let audioCtx = null;

document.addEventListener('DOMContentLoaded', () => {
  initFormDateTime();
  checkLoginSession();
  setupQuoteWoodenSign();
  if (window.innerWidth <= 768) {
    const guideDetails = document.getElementById('mainGuideDetails');
    if (guideDetails) guideDetails.open = false;
  }
  // 背景預先抓取 Cloudflare D1 最新全體學員名冊，確保跨裝置即時核驗與即時同步
  ZenAPI.getAllStudents().catch(() => {});
});

// 1. 檢查登入狀態 (未登入顯示登入門檻，已登入展開花園與打卡)
function checkLoginSession() {
  const isLoggedOut = sessionStorage.getItem('zen_logged_out') === '1';
  const loginGate = document.getElementById('loginRegisterGate');
  const mainApp = document.getElementById('mainAppInterface');

  // 若使用者已明確登出，堅決不自動登入，保持在登入門檻畫面
  if (isLoggedOut) {
    if (loginGate) loginGate.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
    return;
  }

  const sessionStr = localStorage.getItem(STORAGE_SESSION_KEY) || localStorage.getItem(API_CONFIG.storageKeys.currentStudent);

  if (sessionStr) {
    try {
      currentStudent = JSON.parse(sessionStr);
      // 雙向持久化以防不同頁面儲存鍵不同步
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(currentStudent));
      localStorage.setItem(API_CONFIG.storageKeys.currentStudent, JSON.stringify(currentStudent));

      if (loginGate) loginGate.style.display = 'none';
      if (mainApp) mainApp.style.display = 'block';

      updateUserHeaderUI(currentStudent);
      renderGardenFlowers(currentStudent.total_checkins || 0);
      setupURLParameters();

      // 背景即時向 D1 雲端校驗同步最新學員狀態（如在其他裝置補填學號或修持次數）
      if (currentStudent && currentStudent.real_name) {
        ZenAPI.getStudentByProfile(currentStudent.class_type, currentStudent.group_name, currentStudent.real_name).then(fresh => {
          if (fresh && (fresh.student_no !== currentStudent.student_no || fresh.total_checkins !== currentStudent.total_checkins || fresh.group_name !== currentStudent.group_name || fresh.class_type !== currentStudent.class_type)) {
            currentStudent = { ...currentStudent, ...fresh };
            localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(currentStudent));
            localStorage.setItem(API_CONFIG.storageKeys.currentStudent, JSON.stringify(currentStudent));
            updateUserHeaderUI(currentStudent);
            renderGardenFlowers(currentStudent.total_checkins || 0);
          }
        }).catch(err => console.warn('背景同步學員狀態失敗', err));
      }

      return;
    } catch (e) {
      console.warn("Session parse failed", e);
    }
  }

  // 尚未登入且無 session，展示登入門檻
  if (loginGate) loginGate.style.display = 'flex';
  if (mainApp) mainApp.style.display = 'none';
}

// 登入角色切換：🌸 學員修持打卡 ｜ 🔒 指導法師登入
function switchGateTab(type) {
  const btnStudent = document.getElementById('tabBtnStudent');
  const btnMaster = document.getElementById('tabBtnMaster');
  const panelStudent = document.getElementById('gateStudentPanel');
  const panelMaster = document.getElementById('gateMasterPanel');
  const errEl = document.getElementById('gateErrorMsg');
  if (errEl) errEl.style.display = 'none';

  if (type === 'master') {
    if (btnStudent) btnStudent.classList.remove('active');
    if (btnMaster) btnMaster.classList.add('active');
    if (panelStudent) panelStudent.style.display = 'none';
    if (panelMaster) panelMaster.style.display = 'block';
    setTimeout(() => document.getElementById('gateMasterPwd')?.focus(), 80);
  } else {
    if (btnMaster) btnMaster.classList.remove('active');
    if (btnStudent) btnStudent.classList.add('active');
    if (panelMaster) panelMaster.style.display = 'none';
    if (panelStudent) panelStudent.style.display = 'block';
  }
}

// 指導法師密碼登入驗證
function handleGateMasterLogin() {
  const pwdInput = document.getElementById('gateMasterPwd');
  const errEl = document.getElementById('gateMasterErr');
  const pwd = (pwdInput?.value || '').trim();

  // 僅支援指導法師專屬管理金鑰
  if (pwd === 'ZhongTai#2026') {
    if (errEl) errEl.style.display = 'none';
    localStorage.setItem('zen_master_authenticated', '1');
    localStorage.setItem('zen_active_role', 'master');
    localStorage.setItem('zen_garden_admin_token_v1', pwd);
    localStorage.removeItem('zen_logged_out');
    sessionStorage.setItem('zen_garden_admin_token_v1', pwd);
    sessionStorage.setItem('zen_garden_admin_session_v1', pwd);
    sessionStorage.removeItem('zen_logged_out');
    window.location.href = 'admin.html';
  } else {
    if (errEl) {
      errEl.textContent = '❌ 指導法師管理密碼不正確，請重新輸入';
      errEl.style.display = 'block';
    }
    if (pwdInput) {
      pwdInput.value = '';
      pwdInput.focus();
    }
  }
}

// 2. 登入 / 註冊提交處理（支援：已有學號者僅需輸入學號一鍵登入；初次未填學號者填寫班級、組別、姓名三個即可登入，法名非必要填寫）
// 2. 登入 / 註冊提交處理
// 嚴格規則：
// 1. 學號只能對應一個姓名、班級組別，不能有相同的姓名加學號。
// 2. 之前沒輸入學號的幫他把之前輸入過的補齊而不是新增。
// 3. 輸入錯誤告知是否要更改，但學號對應姓名是唯一。
async function handleLoginOrRegister(e) {
  if (e) e.preventDefault();

  const studentNoInput = document.getElementById('gateStudentNo');
  const classTypeInput = document.getElementById('gateClassType');
  const groupNameInput = document.getElementById('gateGroupName');
  const realNameInput = document.getElementById('gateRealName');
  const dharmaNameInput = document.getElementById('gateDharmaName');

  const studentNo = (studentNoInput?.value || '').trim();
  const classType = (classTypeInput?.value || '').trim();
  const groupName = (groupNameInput?.value || '').trim();
  const realName = (realNameInput?.value || '').trim();
  const dharmaName = (dharmaNameInput?.value || '').trim();

  const errEl = document.getElementById('gateErrorMsg');
  if (errEl) {
    errEl.style.display = 'none';
    errEl.innerHTML = '';
  }

  // 1. 完全未填學號與姓名
  if (!studentNo && !realName) {
    showGateError('請輸入學號，或填寫「姓名」、「班級」與「組別」。');
    studentNoInput?.focus();
    return;
  }

  // 2. 僅填寫學號（未填姓名）：一鍵快速登入情境
  if (studentNo && !realName) {
    const student = await ZenAPI.getStudentByStudentNo(studentNo);
    if (student) {
      // 成功以學號一鍵登入
      loginSuccess(student);
      return;
    } else {
      showGateError(`系統查無學號【${studentNo}】之建檔紀錄。<br>若您是初次建檔，請填寫下方「班級」、「組別」與「姓名」（法名選填），完成後日後即可僅憑此學號一鍵登入！`);
      if (!classType) classTypeInput?.focus();
      else if (!groupName) groupNameInput?.focus();
      else realNameInput?.focus();
      return;
    }
  }

  // 3. 有輸入姓名（必填班級、組別、姓名）
  if (!classType) {
    showGateError('請選擇您的班級（日高 或 夜高）');
    classTypeInput?.focus();
    return;
  }
  if (!groupName) {
    showGateError('請選擇您的組別');
    groupNameInput?.focus();
    return;
  }
  if (!realName) {
    showGateError('請填寫真實姓名');
    realNameInput?.focus();
    return;
  }

  // 取得全部學員清單進行唯一性核驗
  const students = await ZenAPI.getAllStudents();

  // (A) 是否已有該學號
  const existingByNo = studentNo
    ? students.find(s => s.student_no && s.student_no.trim().toLowerCase() === studentNo.toLowerCase())
    : null;

  // (B) 是否已有該姓名 (學號對應姓名是唯一，不能有相同姓名綁多個學號)
  const existingByName = students.find(s => s.real_name && s.real_name.trim() === realName);

  // ═══════════════════════════════════════════════════════════════
  // 狀況 1：學號已被其他人登記，但姓名不符
  // 規範：學號對應姓名是唯一，輸入錯誤告知是否要更改
  // ═══════════════════════════════════════════════════════════════
  if (existingByNo && existingByNo.real_name !== realName) {
    showGateConflict({
      title: '⚠️ 學號與姓名不符（學號對應姓名為唯一）',
      message: `學號【<strong>${studentNo}</strong>】在系統中已登記對應姓名為【<strong>${existingByNo.real_name}</strong>】（${existingByNo.class_type} ${existingByNo.group_name}）。<br><br>依精舍規定，<strong>學號對應姓名為唯一</strong>，無法將此學號登記為【${realName}】。<br>請問是否為學號輸入錯誤？`,
      options: [
        {
          text: `🌸 更正姓名為【${existingByNo.real_name}】並登入`,
          btnClass: 'gate-btn-conflict-action',
          callback: () => {
            if (realNameInput) realNameInput.value = existingByNo.real_name;
            if (classTypeInput) classTypeInput.value = existingByNo.class_type;
            if (groupNameInput) groupNameInput.value = existingByNo.group_name;
            if (dharmaNameInput && existingByNo.dharma_name) dharmaNameInput.value = existingByNo.dharma_name;
            loginSuccess(existingByNo);
          }
        },
        {
          text: `✏️ 重新輸入學號`,
          btnClass: 'gate-btn-conflict-cancel',
          callback: () => {
            if (studentNoInput) {
              studentNoInput.value = '';
              studentNoInput.focus();
            }
            if (errEl) errEl.style.display = 'none';
          }
        }
      ]
    });
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // 狀況 2：姓名已被登記，但已綁定其他學號
  // 規範：學號對應姓名是唯一，不能有相同的姓名加不同學號
  // ═══════════════════════════════════════════════════════════════
  if (existingByName && existingByName.student_no && studentNo && existingByName.student_no.trim().toLowerCase() !== studentNo.toLowerCase()) {
    showGateConflict({
      title: '⚠️ 姓名已綁定其他學號（學號對應姓名為唯一）',
      message: `學員【<strong>${realName}</strong>】先前已在系統綁定學號【<strong>${existingByName.student_no}</strong>】。<br><br><strong>學號對應姓名為唯一</strong>，不可重複使用新學號【${studentNo}】。<br>請問是否更改為原綁定學號登入？`,
      options: [
        {
          text: `🌸 更正為原學號【${existingByName.student_no}】並登入`,
          btnClass: 'gate-btn-conflict-action',
          callback: () => {
            if (studentNoInput) studentNoInput.value = existingByName.student_no;
            if (classTypeInput) classTypeInput.value = existingByName.class_type;
            if (groupNameInput) groupNameInput.value = existingByName.group_name;
            if (dharmaNameInput && existingByName.dharma_name) dharmaNameInput.value = existingByName.dharma_name;
            loginSuccess(existingByName);
          }
        },
        {
          text: `✏️ 重新檢查輸入`,
          btnClass: 'gate-btn-conflict-cancel',
          callback: () => {
            if (studentNoInput) {
              studentNoInput.focus();
            }
            if (errEl) errEl.style.display = 'none';
          }
        }
      ]
    });
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // 狀況 3：之前沒輸入學號的，幫他把之前輸入過的「補齊」而不是新增！
  // ═══════════════════════════════════════════════════════════════
  if (existingByName && (!existingByName.student_no || existingByName.student_no.trim() === '')) {
    if (studentNo) {
      // 補齊學號到既有紀錄，完全保留歷史修持次數與蓮花等級
      existingByName.student_no = studentNo;
      if (classType) existingByName.class_type = classType;
      if (groupName) existingByName.group_name = groupName;
      if (dharmaName) existingByName.dharma_name = dharmaName;

      const updateRes = await ZenAPI.updateStudent(existingByName);
      if (updateRes && updateRes.error) {
        showGateError(updateRes.error);
        return;
      }
      const finalStudent = (updateRes && updateRes.id) ? updateRes : existingByName;

      alert(`✨ 歡迎！已為您成功補齊綁定學號【${studentNo}】！\n您過往累積的修持打卡（共 ${finalStudent.total_checkins || 0} 次）已完整為您保留。\n日後即可僅憑此學號一鍵快速登入。`);
      loginSuccess(finalStudent);
      return;
    } else {
      // 本次依然未輸入學號，直接以原有帳號登入
      if (classType) existingByName.class_type = classType;
      if (groupName) existingByName.group_name = groupName;
      if (dharmaName) existingByName.dharma_name = dharmaName;
      const updateRes = await ZenAPI.updateStudent(existingByName);
      const finalStudent = (updateRes && updateRes.id) ? updateRes : existingByName;
      loginSuccess(finalStudent);
      return;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 狀況 4：學號與姓名相符，但班級或組別有變更
  // 規範：告知是否要更改
  // ═══════════════════════════════════════════════════════════════
  const matchedStudent = existingByNo || existingByName;
  if (matchedStudent) {
    const isClassChanged = (matchedStudent.class_type !== classType) || (matchedStudent.group_name !== groupName);
    if (isClassChanged) {
      const confirmChange = confirm(`學號【${matchedStudent.student_no || '未填'}】（${matchedStudent.real_name}）原登記為【${matchedStudent.class_type} ${matchedStudent.group_name}】。\n\n您本次所選為【${classType} ${groupName}】。\n\n請問是否要更改班級組別為【${classType} ${groupName}】？`);
      if (confirmChange) {
        matchedStudent.class_type = classType;
        matchedStudent.group_name = groupName;
      }
    }

    if (dharmaName) matchedStudent.dharma_name = dharmaName;
    if (studentNo && !matchedStudent.student_no) matchedStudent.student_no = studentNo;

    const updateRes = await ZenAPI.updateStudent(matchedStudent);
    if (updateRes && updateRes.error) {
      showGateError(updateRes.error);
      return;
    }
    const finalStudent = (updateRes && updateRes.id) ? updateRes : matchedStudent;
    loginSuccess(finalStudent);
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // 狀況 5：全新學員初次建檔
  // ═══════════════════════════════════════════════════════════════
  const newStudent = {
    id: Date.now(),
    student_no: studentNo || '',
    class_type: classType,
    group_name: groupName,
    real_name: realName,
    dharma_name: dharmaName || '',
    total_checkins: 0,
    total_meditation_mins: 0,
    total_sutra_recs: 0,
    lotus_level: 1,
    rejoice_count: 0,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };

  const createRes = await ZenAPI.createStudent(newStudent);
  if (createRes && createRes.error) {
    showGateError(createRes.error);
    return;
  }
  const finalStudent = (createRes && createRes.id) ? createRes : newStudent;
  loginSuccess(finalStudent);
}

// 顯示登入衝突或錯誤提撕彈出提示
function showGateConflict(options) {
  const errEl = document.getElementById('gateErrorMsg');
  if (!errEl) return;

  let btnsHtml = '';
  options.options.forEach((opt, idx) => {
    btnsHtml += `
      <button type="button" id="btnGateConflictOpt_${idx}" style="padding: 6px 14px; border-radius: 8px; border: none; font-weight: 700; font-size: 0.82rem; cursor: pointer; margin-right: 8px; margin-top: 6px; ${opt.btnClass === 'gate-btn-conflict-action' ? 'background: #2e7d32; color: #ffffff;' : 'background: #e0e0e0; color: #333333;'}">
        ${opt.text}
      </button>
    `;
  });

  errEl.innerHTML = `
    <div style="font-size: 0.95rem; font-weight: 800; margin-bottom: 6px; color: #b71c1c;">${options.title}</div>
    <div style="font-size: 0.85rem; line-height: 1.6; margin-bottom: 8px; color: #424242;">${options.message}</div>
    <div style="display: flex; flex-wrap: wrap; align-items: center;">${btnsHtml}</div>
  `;

  errEl.style.display = 'block';

  // 綁定按鈕點擊事件
  options.options.forEach((opt, idx) => {
    const btn = document.getElementById(`btnGateConflictOpt_${idx}`);
    if (btn && opt.callback) {
      btn.onclick = () => {
        opt.callback();
      };
    }
  });
}

// 登入成功通用處理 (學員修持打卡身分)
function loginSuccess(student) {
  currentStudent = student;
  localStorage.setItem('zen_active_role', 'student');
  localStorage.removeItem('zen_master_authenticated');
  sessionStorage.removeItem('zen_garden_admin_token_v1');
  sessionStorage.removeItem('zen_logged_out');
  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(student));
  localStorage.setItem(API_CONFIG.storageKeys.currentStudent, JSON.stringify(student));

  const errEl = document.getElementById('gateErrorMsg');
  if (errEl) errEl.style.display = 'none';

  // 進入花園
  document.getElementById('loginRegisterGate').style.display = 'none';
  document.getElementById('mainAppInterface').style.display = 'block';

  updateUserHeaderUI(student);
  renderGardenFlowers(student.total_checkins || 0);
  playChimeSound(432);
}

// 學號即時動態識別（輸入學號時若匹配舊生，自動帶入並提示可直接登入）
async function handleStudentNoInput(val) {
  const clean = (val || '').trim();
  const badge = document.getElementById('gateStudentFoundBadge');
  const badgeInfo = document.getElementById('gateFoundInfo');
  const statusEl = document.getElementById('gateStudentNoStatus');
  const errEl = document.getElementById('gateErrorMsg');
  const mismatchHint = document.getElementById('gateRealNameMismatchHint');

  if (errEl) errEl.style.display = 'none';
  if (mismatchHint) mismatchHint.style.display = 'none';

  if (!clean) {
    if (badge) badge.style.display = 'none';
    if (statusEl) statusEl.style.display = 'none';
    return;
  }

  // 查詢本地或雲端
  const s = await ZenAPI.getStudentByStudentNo(clean);
  if (s) {
    // 自動預填下方各欄位
    if (document.getElementById('gateClassType')) document.getElementById('gateClassType').value = s.class_type || '';
    if (document.getElementById('gateGroupName')) document.getElementById('gateGroupName').value = s.group_name || '';
    if (document.getElementById('gateRealName')) document.getElementById('gateRealName').value = s.real_name || '';
    if (document.getElementById('gateDharmaName')) document.getElementById('gateDharmaName').value = s.dharma_name || '';

    if (statusEl) statusEl.style.display = 'inline';
    if (badge && badgeInfo) {
      const displayName = s.dharma_name ? `${s.dharma_name}（${s.real_name}）` : s.real_name;
      badgeInfo.textContent = `【${s.class_type}】${s.group_name} · ${displayName}`;
      badge.style.display = 'block';
    }
  } else {
    if (badge) badge.style.display = 'none';
    if (statusEl) statusEl.style.display = 'none';
  }
}

// 姓名即時核驗（若學號已填，檢查輸入的姓名是否與學號唯一對應）
async function handleRealNameInput(val) {
  const cleanName = (val || '').trim();
  const studentNo = (document.getElementById('gateStudentNo')?.value || '').trim();
  const mismatchHint = document.getElementById('gateRealNameMismatchHint');
  if (!mismatchHint) return;

  if (!studentNo || !cleanName) {
    mismatchHint.style.display = 'none';
    return;
  }

  const s = await ZenAPI.getStudentByStudentNo(studentNo);
  if (s && s.real_name && s.real_name !== cleanName) {
    mismatchHint.innerHTML = `⚠️ 學號對應姓名為唯一！學號【${studentNo}】已登記為【${s.real_name}】`;
    mismatchHint.style.display = 'block';
  } else {
    mismatchHint.style.display = 'none';
  }
}

function showGateError(msg) {
  const errEl = document.getElementById('gateErrorMsg');
  if (errEl) {
    errEl.innerHTML = `⚠️ ${msg}`;
    errEl.style.display = 'block';
  }
}

// 登出系統
function handleLogout() {
  if (confirm("確定要登出嗎？\n您的修持打卡與花園資料皆已妥善保存。")) {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    localStorage.removeItem(API_CONFIG.storageKeys.currentStudent);
    localStorage.removeItem('zen_master_authenticated');
    localStorage.removeItem('zen_active_role');
    sessionStorage.removeItem('zen_garden_admin_token_v1');
    sessionStorage.setItem('zen_logged_out', '1');
    currentStudent = null;
    isVisitingMode = false;
    window.location.reload();
  }
}

// 點擊頂部「學號：未填」或「學號」跳出補填/更正學號視窗
function handleBrandStudentNoClick(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  openBindStudentNoModal();
}

function openBindStudentNoModal() {
  if (!currentStudent) return;
  const modal = document.getElementById('bindStudentNoModal');
  const titleEl = document.getElementById('bindModalTitle');
  const descEl = document.getElementById('bindModalDesc');
  const nameEl = document.getElementById('bindStudentProfileName');
  const inputEl = document.getElementById('inputBindStudentNo');
  const errEl = document.getElementById('bindStudentNoErr');

  if (nameEl) {
    nameEl.textContent = `【${currentStudent.class_type}】${currentStudent.group_name} · ${currentStudent.real_name}${currentStudent.dharma_name ? `（${currentStudent.dharma_name}）` : ''}`;
  }

  if (currentStudent.student_no) {
    if (titleEl) titleEl.textContent = '更正綁定學號';
    if (descEl) descEl.innerHTML = `您好，<strong style="color: var(--pine-green);">${currentStudent.real_name}</strong>！<br>您當前綁定的學號為【<strong>${currentStudent.student_no}</strong>】。<br>學號對應姓名為唯一，若需更正請於下方輸入：`;
    if (inputEl) inputEl.value = currentStudent.student_no;
  } else {
    if (titleEl) titleEl.textContent = '補填綁定學號';
    if (descEl) descEl.innerHTML = `您好，<strong style="color: var(--pine-green);">${currentStudent.real_name}</strong>！<br>為您先前輸入的修持紀錄補齊學號，過往打卡總數與蓮花等級將<strong>完整保留</strong>，日後即可僅憑學號一鍵快速登入！`;
    if (inputEl) inputEl.value = '';
  }

  if (errEl) errEl.style.display = 'none';

  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
      inputEl?.focus();
      inputEl?.select();
    }, 100);
  }
}

function closeBindStudentNoModal() {
  const modal = document.getElementById('bindStudentNoModal');
  if (modal) modal.style.display = 'none';
}

async function executeBindStudentNo() {
  if (!currentStudent) return;
  const inputEl = document.getElementById('inputBindStudentNo');
  const errEl = document.getElementById('bindStudentNoErr');
  const cleanNo = (inputEl?.value || '').trim();

  if (!cleanNo) {
    if (errEl) {
      errEl.textContent = '請輸入要綁定的學號';
      errEl.style.display = 'block';
    }
    inputEl?.focus();
    return;
  }

  // 1. 檢核學號唯一性：不可已被其他姓名登記
  const students = await ZenAPI.getAllStudents();
  const existingByNo = students.find(s => 
    s.student_no && 
    s.student_no.trim().toLowerCase() === cleanNo.toLowerCase() &&
    s.real_name !== currentStudent.real_name
  );

  if (existingByNo) {
    if (errEl) {
      errEl.innerHTML = `⚠️ 學號【${cleanNo}】已登記對應姓名【${existingByNo.real_name}】（${existingByNo.class_type} ${existingByNo.group_name}）。<br>學號對應姓名為唯一，請確認是否輸入錯誤！`;
      errEl.style.display = 'block';
    }
    inputEl?.focus();
    return;
  }

  // 2. 補齊/更新當前學員紀錄 (立即同步至 Cloudflare D1 雲端資料庫)
  const targetStudent = { ...currentStudent, student_no: cleanNo };
  const updateRes = await ZenAPI.updateStudent(targetStudent);

  if (updateRes && updateRes.error) {
    if (errEl) {
      errEl.innerHTML = `⚠️ ${updateRes.error}`;
      errEl.style.display = 'block';
    }
    inputEl?.focus();
    return;
  }

  currentStudent = (updateRes && updateRes.id) ? updateRes : targetStudent;
  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(currentStudent));
  localStorage.setItem(API_CONFIG.storageKeys.currentStudent, JSON.stringify(currentStudent));

  updateUserHeaderUI(currentStudent);
  closeBindStudentNoModal();

  alert(`✨ 補齊學號成功！\n\n學號【${cleanNo}】已成功綁定至【${currentStudent.class_type} ${currentStudent.group_name} · ${currentStudent.real_name}】。\n過往 ${currentStudent.total_checkins || 0} 次修持紀錄完整保留，雲端資料庫已即時同步，日後在電腦或手機皆可憑此學號一鍵快速登入！`);
}

// 更新頂部登入者狀態與統計數據看板
function updateUserHeaderUI(student) {
  const nameEl = document.getElementById('navStudentTitle');
  const countEl = document.getElementById('navCheckinCount');
  const brandStudentNoEl = document.getElementById('brandStudentNo');
  if (brandStudentNoEl) {
    if (student.student_no) {
      brandStudentNoEl.innerHTML = `學號：${student.student_no}`;
      brandStudentNoEl.style.cursor = 'pointer';
      brandStudentNoEl.title = `學號：${student.student_no}（點擊可查看或更正）`;
    } else {
      brandStudentNoEl.innerHTML = `學號：未填 <span style="font-size: 0.68rem; background: #fee2e2; color: #b91c1c; padding: 1px 6px; border-radius: 4px; font-weight: 700; margin-left: 2px;">✏️ 點此補填</span>`;
      brandStudentNoEl.style.cursor = 'pointer';
      brandStudentNoEl.title = '尚未綁定學號，點擊此處立即補填學號！';
    }
  }
  if (nameEl) {
    const displayName = student.dharma_name || student.real_name || '精進學員';
    nameEl.textContent = `【${student.class_type}】${student.group_name} · ${displayName}`;
  }
  if (countEl) {
    countEl.textContent = student.total_checkins || 0;
  }

  // ════ 更新精進打卡數量統計看板 ════
  const checkinsEl = document.getElementById('statCardCheckins');
  const meditationEl = document.getElementById('statCardMeditation');
  const sutrasEl = document.getElementById('statCardSutras');
  const rejoicesEl = document.getElementById('statCardRejoices');
  const stageEl = document.getElementById('statCardStage');
  const studentLabelEl = document.getElementById('statStudentLabel');

  const checkins = student.total_checkins || 0;
  const meditation = student.total_meditation_mins || 0;
  const rejoices = student.rejoice_count || 0;

  if (checkinsEl) checkinsEl.textContent = checkins;
  if (meditationEl) meditationEl.textContent = meditation;
  if (rejoicesEl) rejoicesEl.textContent = rejoices;

  // 計算持誦經典部數 (統計該學員在打卡紀錄中有填寫經典的次數)
  try {
    const allRecords = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.checkins) || '[]');
    const studentRecords = allRecords.filter(r => 
      (r.student_id && r.student_id === student.id) ||
      (r.real_name === student.real_name && r.class_type === student.class_type)
    );
    const sutraCount = studentRecords.filter(r => r.sutra_name && r.sutra_name !== '').length;
    if (sutrasEl) sutrasEl.textContent = sutraCount || checkins;
  } catch (e) {
    if (sutrasEl) sutrasEl.textContent = checkins;
  }

  // 計算自性花園生長境界階段
  if (stageEl) {
    if (checkins >= 10) {
      stageEl.textContent = '成林 · 七寶祥蓮 (第4階)';
    } else if (checkins >= 4) {
      stageEl.textContent = '花開 · 繁花盛開 (第3階)';
    } else if (checkins >= 2) {
      stageEl.textContent = '發芽 · 菩提萌發 (第2階)';
    } else {
      stageEl.textContent = '種子 · 初發心田 (第1階)';
    }
  }

  if (studentLabelEl) {
    const displayName = student.dharma_name || student.real_name || '精進學員';
    studentLabelEl.textContent = `· 【${student.class_type}】${student.group_name} ${displayName}`;
  }

  // 同步更新般若收集冊進度與抽卡次數
  if (typeof renderCollectionUI === 'function') {
    renderCollectionUI();
  }
}

// ═══════════════════════════════════════════════════════════════
// 修持打卡生長演化階段設定 (第 1 天｜種子、第 2 天｜發芽、第 3 天｜花開、第 4 天以上｜成林)
// ═══════════════════════════════════════════════════════════════
// 2. 花園修行線性等差生長體系 (每張圖比前一張多固定 12 天)
// 第 1 張圖：維持 49 天 (累積 1 ~ 49 天)
// 第 2 張圖：維持 61 天 (累積 50 ~ 110 天)
// 第 3 張圖：維持 73 天 (累積 111 ~ 183 天)
// 第 4 張圖：維持 85 天 (累積 184 ~ 268 天)
// 第 5 張圖：維持 97 天 (累積 269 ~ 365+ 天)
// ═══════════════════════════════════════════════════════════════
const PROGRESSION_STAGES = [
  { stage: 1, duration: 49, cumulative: 49, name: "第一階段 (維持 49 天 · 綠茵草皮與清淨蓮池)", bg: "assets/images/stage_1_seed.jpg" },
  { stage: 2, duration: 61, cumulative: 110, name: "第二階段 (維持 61 天 · 庭園初展 · 石徑生機)", bg: "assets/images/stage_2_sprout.jpg" },
  { stage: 3, duration: 73, cumulative: 183, name: "第三階段 (維持 73 天 · 菩提成林 · 草房漸大)", bg: "assets/images/stage_3_forest_v2.jpg" },
  { stage: 4, duration: 85, cumulative: 268, name: "第四階段 (維持 85 天 · 丹楓金杏 · 秋收大草舍)", bg: "assets/images/stage_4_autumn_v2.jpg" },
  { stage: 5, duration: 97, cumulative: 365, name: "第五階段 (維持 97 天 · 萬里雪境 · 禪房圓滿)", bg: "assets/images/stage_5_winter_v2.jpg" }
];

let manualPreviewStage = null;

function isCurrentUserAdmin() {
  return localStorage.getItem('zen_master_authenticated') === '1' && localStorage.getItem('zen_active_role') === 'master';
}

function getActualStageNum(checkins) {
  const d = Math.max(1, checkins || 1);
  if (d <= 49) return 1;
  if (d <= 110) return 2;
  if (d <= 183) return 3;
  if (d <= 268) return 4;
  return 5;
}

function getNextStageInfo(days) {
  const d = Math.max(1, days || 1);
  if (d <= 49) {
    return { currentStage: 1, duration: 49, target: 50, diff: 50 - d, text: `累積打卡 ${d} 天 ｜ 距下一階段（110天）還差 ${50 - d} 天` };
  }
  if (d <= 110) {
    return { currentStage: 2, duration: 61, target: 111, diff: 111 - d, text: `累積打卡 ${d} 天 ｜ 距下一階段（183天）還差 ${111 - d} 天` };
  }
  if (d <= 183) {
    return { currentStage: 3, duration: 73, target: 184, diff: 184 - d, text: `累積打卡 ${d} 天 ｜ 距下一階段（268天）還差 ${184 - d} 天` };
  }
  if (d <= 268) {
    return { currentStage: 4, duration: 85, target: 269, diff: 269 - d, text: `累積打卡 ${d} 天 ｜ 距下一階段（365天）還差 ${269 - d} 天` };
  }
  return { currentStage: 5, duration: 97, target: 365, diff: 0, text: `累積打卡 ${d} 天 · 一整年修持圓滿大成！` };
}

function getBackgroundStage(days) {
  // 只有指導法師可以手動預覽全部圖；同學未到天數只能看到對應天數的一張圖
  if (manualPreviewStage && isCurrentUserAdmin()) {
    const found = PROGRESSION_STAGES.find(s => s.stage === manualPreviewStage);
    if (found) return found;
  }
  const stageNum = getActualStageNum(days);
  return PROGRESSION_STAGES.find(s => s.stage === stageNum) || PROGRESSION_STAGES[0];
}

// 預覽指定階段花園 (僅指導法師可用)
function previewGardenStage(stageNum) {
  if (!isCurrentUserAdmin()) {
    alert("🔒 未到天數只能看到對應天數的圖。同學端依累積修持天數顯現對應境界，只有指導法師具備全圖巡檢權限！");
    return;
  }
  manualPreviewStage = stageNum;
  const count = currentStudent?.total_checkins || 0;
  renderGardenFlowers(count);
  updateStagePillsUI(stageNum);
  playChimeSound(528);
}

// 切換回自身實際打卡天數之生長階段
function resetToActualStage() {
  manualPreviewStage = null;
  const count = currentStudent?.total_checkins || 0;
  renderGardenFlowers(count);
  const actualStage = getActualStageNum(count);
  updateStagePillsUI(actualStage);
  playChimeSound(432);
}

function updateStagePillsUI(activeStage) {
  const isAdmin = isCurrentUserAdmin();
  const pillsBar = document.getElementById('indexStagePillsBar');
  const progressNotice = document.getElementById('indexStudentProgressNotice');

  if (pillsBar && !isAdmin) {
    // 同學端不顯示切換藥丸，只顯示等差進度提示
    pillsBar.querySelectorAll('.garden-stage-pill').forEach(p => p.style.display = 'none');
  }

  document.querySelectorAll('.garden-stage-pill').forEach(pill => {
    pill.classList.remove('active');
    if (pill.dataset.stage == activeStage) {
      pill.classList.add('active');
    }
  });
}

// 切換靜坐與誦經勾選
function toggleMeditationOption(checked) {
  const wrap = document.getElementById('wrapMeditationMins');
  if (wrap) wrap.style.display = checked ? 'block' : 'none';
}

function toggleSutraOption(checked) {
  const wrap = document.getElementById('wrapSutraSelect');
  if (wrap) wrap.style.display = checked ? 'block' : 'none';
}

// 3. 根據打卡天數「換背景 (3階段：種子、發芽、花開 ＋ 成林)」與「動態長出池中蓮花＋草皮太陽花」
function renderGardenFlowers(checkinCount) {
  const pondWater = document.getElementById('pondFlowersLayer');
  const sunflowerSoil = document.getElementById('sunflowerSoilLayer');
  const countBadge = document.getElementById('gardenCheckinCounter');
  const gardenCanvas = document.getElementById('gardenCanvasWrap');
  const stageEl = document.getElementById('statCardStage');

  // A. 階段背景切換
  const currentStage = getBackgroundStage(checkinCount);
  if (gardenCanvas) {
    gardenCanvas.style.backgroundImage = `url('${currentStage.bg}')`;
  }

  const effectiveStageNum = manualPreviewStage || getActualStageNum(checkinCount);
  updateStagePillsUI(effectiveStageNum);

  if (countBadge) {
    countBadge.textContent = `累積修持：${checkinCount} 天 ｜ ${currentStage.name}`;
  }

  if (stageEl) {
    stageEl.textContent = currentStage.name;
  }

  // 同步更新修持指南卡中的當前進度與境界
  const nextInfo = getNextStageInfo(checkinCount);
  const progressText = document.getElementById('indexStageProgressText');
  if (progressText) {
    progressText.textContent = nextInfo.text;
  }
  const guideStage = document.getElementById('guideCurrentStage');
  if (guideStage) {
    guideStage.textContent = currentStage.name;
  }
  const guideCheckins = document.getElementById('guideCurrentCheckins');
  if (guideCheckins) {
    guideCheckins.textContent = checkinCount;
  }

  // B. 蓮池中的蓮花 (精巧微型化，蓮花生在池塘裡，每 3 天 1 朵盛開花，餘數 1 初萌種子，餘數 2 含苞待放)
  if (pondWater) {
    let lotusHTML = '';
    // 池中浮萍與清淨綠荷基底 (精緻縮放，不搶主花視覺)
    lotusHTML += `
      <ellipse cx="65" cy="118" rx="28" ry="13" fill="#2d6e35" stroke="#1d4d23" stroke-width="1.2" opacity="0.9"/>
      <ellipse cx="145" cy="122" rx="30" ry="14" fill="#2d6e35" stroke="#1d4d23" stroke-width="1.2" opacity="0.9"/>
      <ellipse cx="105" cy="142" rx="26" ry="12" fill="#388e3c" stroke="#1d4d23" stroke-width="1.2" opacity="0.95"/>
    `;

    const blooms = Math.floor(checkinCount / 3);
    const remainder = checkinCount % 3;

    // 縮小蓮花比例（scale 0.35 ~ 0.52），錯落排布於水面
    const APP_LOTUS_COORDS = [
      { cx: 105, cy: 92, scale: 0.48 },
      { cx: 62, cy: 84, scale: 0.44 },
      { cx: 152, cy: 86, scale: 0.46 },
      { cx: 118, cy: 118, scale: 0.52 },
      { cx: 72, cy: 124, scale: 0.50 },
      { cx: 165, cy: 116, scale: 0.51 },
      { cx: 92, cy: 62, scale: 0.38 },
      { cx: 140, cy: 64, scale: 0.39 },
      { cx: 38, cy: 78, scale: 0.42 },
      { cx: 192, cy: 80, scale: 0.43 },
      { cx: 125, cy: 48, scale: 0.35 },
      { cx: 75, cy: 52, scale: 0.36 },
      { cx: 168, cy: 54, scale: 0.36 },
      { cx: 106, cy: 140, scale: 0.54 }
    ];

    const lotuses = [];
    for (let i = 0; i < blooms; i++) {
      lotuses.push({ stage: (i === 0 && blooms >= 3) ? 'golden' : 'bloom' });
    }
    if (remainder === 1) lotuses.push({ stage: 'sprout' });
    else if (remainder === 2) lotuses.push({ stage: 'bud' });

    if (lotuses.length === 0) {
      lotuses.push({ stage: 'sprout' });
    }

    const totalToRender = Math.min(lotuses.length, APP_LOTUS_COORDS.length);
    for (let i = 0; i < totalToRender; i++) {
      const c = APP_LOTUS_COORDS[i];
      const item = lotuses[i];
      if (item.stage === 'golden') {
        lotusHTML += `<circle cx="${c.cx}" cy="${c.cy}" r="28" fill="url(#goldenLotusGlow)" opacity="0.6"/>`;
      }
      lotusHTML += createLotusSVG(c.cx, c.cy, c.scale, item.stage);
    }

    pondWater.innerHTML = lotusHTML;
  }

  // C. 草皮上的太陽花 (太陽花生在草皮裡，無泥土，依 3 階段演化：第 1 天種子、第 2 天發芽、第 3 天花開)
  if (sunflowerSoil) {
    let sunflowerHTML = '';

    if (checkinCount === 0) {
      sunflowerHTML = `
        <div style="text-align: center; color: #2e7d32; font-weight: 700; font-size: 0.82rem; padding-top: 50px; text-shadow: 0 1px 3px rgba(255,255,255,0.9);">
          🌱 每日修持打卡，善法甘露注入<br>綠茵草皮將向陽盛開燦爛太陽花！
        </div>
      `;
    } else if (checkinCount === 1) {
      // 第 1 天｜種子：綠葉嫩芽破土萌發
      sunflowerHTML = `
        <div class="sunflower-item" style="left:50%; bottom:20px; transform:translateX(-50%) scale(0.9);">
          ${createSunflowerSVG('sprout')}
        </div>
      `;
    } else if (checkinCount === 2) {
      // 第 2 天｜發芽：翠綠挺立花苞
      sunflowerHTML = `
        <div class="sunflower-item" style="left:38%; bottom:20px; transform:translateX(-50%) scale(0.9);">
          ${createSunflowerSVG('sprout')}
        </div>
        <div class="sunflower-item" style="left:62%; bottom:22px; transform:translateX(-50%) scale(0.95);">
          ${createSunflowerSVG('bud')}
        </div>
      `;
    } else {
      // 第 3 天以上｜花開：燦爛向陽花金黃朵朵盛開
      const flowerCount = Math.min(5, Math.max(1, Math.floor((checkinCount + 1) / 2)));
      const positions = [
        { left: '50%', bottom: '22px', scale: 1.0, stage: 'bloom' },
        { left: '26%', bottom: '15px', scale: 0.88, stage: checkinCount >= 4 ? 'bloom' : 'bud' },
        { left: '72%', bottom: '18px', scale: 0.92, stage: checkinCount >= 6 ? 'bloom' : 'bud' },
        { left: '38%', bottom: '42px', scale: 0.82, stage: checkinCount >= 8 ? 'bloom' : 'sprout' },
        { left: '60%', bottom: '45px', scale: 0.85, stage: checkinCount >= 10 ? 'bloom' : 'bud' }
      ];

      for (let i = 0; i < flowerCount; i++) {
        const p = positions[i];
        sunflowerHTML += `
          <div class="sunflower-item" style="left:${p.left}; bottom:${p.bottom}; transform:translateX(-50%) scale(${p.scale});">
            ${createSunflowerSVG(p.stage)}
          </div>
        `;
      }
    }

    sunflowerSoil.innerHTML = sunflowerHTML;
  }
}

// 產生蓮花向量圖形 (精確參照蓮花-01與02真實佛座聖蓮：白底粉尖、鮮綠蓮蓬、金黃花蕊)
function createLotusSVG(cx, cy, scale, stage) {
  if (stage === 'sprout' || stage === 1) {
    // 階段一：第 1 天｜種子
    return `
      <g transform="translate(${cx}, ${cy}) scale(${scale})">
        <ellipse cx="0" cy="2" rx="11" ry="5.5" fill="#2e7d32" opacity="0.9"/>
        <circle cx="0" cy="-1" r="7" fill="#ffd54f" opacity="0.3"/>
        <ellipse cx="0" cy="-1" rx="2.5" ry="3" fill="#ffd54f" stroke="#ffb300" stroke-width="0.7"/>
        <circle cx="-0.5" cy="-1.8" r="0.8" fill="#ffffff"/>
        <path d="M0 -3 Q2 -8 4 -10 Q3 -7 1 -3" fill="#81c784" stroke="#2e7d32" stroke-width="0.5"/>
      </g>
    `;
  }

  if (stage === 'bud' || stage === 2) {
    // 階段二：第 2 天｜發芽（立苞）
    return `
      <g transform="translate(${cx}, ${cy}) scale(${scale})">
        <g class="lotus-flower-bloom">
          <ellipse cx="4" cy="4" rx="10" ry="5" fill="#2e7d32" opacity="0.8"/>
          <path d="M-2 4 Q-1 -2 -2 -8" stroke="#2e7d32" stroke-width="1.8" stroke-linecap="round" fill="none"/>
          <path d="M-2 -8 C-8 -15 -6 -23 -2 -27 C2 -23 4 -15 -2 -8 Z" fill="#f8bbd0" stroke="#c2185b" stroke-width="0.5"/>
          <path d="M-2 -8 C-6 -15 -4 -22 -2 -27" stroke="#f06292" stroke-width="0.4" fill="none"/>
          <path d="M-2 -8 C2 -15 0 -22 -2 -27" stroke="#f06292" stroke-width="0.4" fill="none"/>
          <circle cx="-2" cy="-26.5" r="0.8" fill="#ad1457"/>
        </g>
      </g>
    `;
  }

  // 階段三：第 3 天｜花開（聖潔盛開）
  const isGolden = stage === 'golden';
  const petalStroke = isGolden ? '#ffb300' : '#c2185b';
  const petalFill = isGolden ? '#fff9c4' : '#ffffff';
  const petalTip = isGolden ? '#ffd54f' : '#ec407a';

  return `
    <g transform="translate(${cx}, ${cy}) scale(${scale})">
      <g class="lotus-flower-bloom">
        <ellipse cx="0" cy="4" rx="18" ry="9" fill="#2e7d32" opacity="0.9"/>
        <path d="M0 0 C-6 -6 -7 -18 0 -22 C7 -18 6 -6 0 0 Z" fill="${petalFill}" stroke="${petalStroke}" stroke-width="0.4"/>
        <path d="M-2 1 C-12 -3 -16 -12 -12 -18 C-7 -15 -3 -7 -2 1 Z" fill="${petalFill}" stroke="${petalStroke}" stroke-width="0.4"/>
        <path d="M2 1 C12 -3 16 -12 12 -18 C7 -15 3 -7 2 1 Z" fill="${petalFill}" stroke="${petalStroke}" stroke-width="0.4"/>
        <path d="M-3 2 C-16 1 -20 -5 -19 -10 C-13 -9 -6 -3 -3 2 Z" fill="${petalFill}" stroke="${petalTip}" stroke-width="0.4"/>
        <path d="M3 2 C16 1 20 -5 19 -10 C13 -9 6 -3 3 2 Z" fill="${petalFill}" stroke="${petalTip}" stroke-width="0.4"/>
        <ellipse cx="0" cy="0" rx="8" ry="4" fill="#ffd54f" opacity="0.7"/>
        <ellipse cx="0" cy="0" rx="4.5" ry="2.8" fill="#afb42b" stroke="#558b2f" stroke-width="0.5"/>
        <path d="M-2 2 C-10 4 -12 8 -8 11 C-5 9 -2 5 -2 2 Z" fill="${petalFill}" stroke="${petalStroke}" stroke-width="0.4"/>
        <path d="M2 2 C10 4 12 8 8 11 C5 9 2 5 2 2 Z" fill="${petalFill}" stroke="${petalStroke}" stroke-width="0.4"/>
        <path d="M0 3 C-6 5 -6 10 0 13 C6 10 6 5 0 3 Z" fill="${petalFill}" stroke="${petalStroke}" stroke-width="0.4"/>
      </g>
    </g>
  `;
}

// 產生向陽太陽花向量圖形 (松葉牡丹 · 參照太陽花-01與02)
function createSunflowerSVG(stage) {
  if (stage === 'sprout' || stage === 1) {
    // 階段一：肉質松針幼芽
    return `
      <svg viewBox="0 0 50 50" width="45" height="45">
        <path d="M25 46 Q24 32 25 22" stroke="#388e3c" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M25 26 C16 24 10 16 8 10 C14 12 20 20 25 26 Z" fill="#66bb6a" stroke="#1b5e20" stroke-width="0.7"/>
        <path d="M25 26 C34 24 40 16 42 10 C36 12 30 20 25 26 Z" fill="#66bb6a" stroke="#1b5e20" stroke-width="0.7"/>
        <circle cx="25" cy="6" r="2.5" fill="#ffd54f"/>
      </svg>
    `;
  }

  if (stage === 'bud' || stage === 2) {
    // 階段二：含苞圓蕾
    return `
      <svg viewBox="0 0 56 62" width="50" height="56">
        <path d="M28 58 Q27 42 28 30" stroke="#2e7d32" stroke-width="4" stroke-linecap="round"/>
        <path d="M28 30 C15 32 6 22 4 14 C12 18 22 24 28 30 Z" fill="#4caf50" stroke="#1b5e20" stroke-width="0.8"/>
        <path d="M28 30 C41 32 50 22 52 14 C44 18 34 24 28 30 Z" fill="#4caf50" stroke="#1b5e20" stroke-width="0.8"/>
        <ellipse cx="28" cy="20" rx="14" ry="15" fill="#388e3c" stroke="#1b5e20" stroke-width="0.8"/>
        <path d="M28 6 C20 12 21 24 28 29 C35 24 36 12 28 6 Z" fill="#ffb300" stroke="#e65100" stroke-width="0.7"/>
        <circle cx="28" cy="7" r="2" fill="#fff9c4"/>
      </svg>
    `;
  }

  // 階段三：重瓣波浪嬌豔盛開 (參照太陽花-02.jpg立體重瓣波浪)
  return `
    <svg viewBox="0 0 80 90" width="70" height="80" class="sunflower-bloom-anim">
      <!-- 肉質花莖 -->
      <path d="M40 86 Q39 64 40 45" stroke="#2e7d32" stroke-width="4.5" stroke-linecap="round"/>
      
      <!-- 花背簇生肉質松針葉 (太陽花特徵) -->
      <path d="M40 45 C20 49 6 41 4 31 C14 35 28 41 40 45 Z" fill="#4caf50" stroke="#1b5e20" stroke-width="0.8"/>
      <path d="M40 45 C60 49 74 41 76 31 C66 35 52 41 40 45 Z" fill="#4caf50" stroke="#1b5e20" stroke-width="0.8"/>

      <!-- 重瓣盛開花頭 (波浪層疊花瓣 · 牡丹般錦簇) -->
      <g transform="translate(40, 36)">
        ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => `
          <path d="M0 0 C-11 -11 -13 -26 0 -30 C13 -26 11 -11 0 0 Z" fill="#ffb300" stroke="#e65100" stroke-width="0.6" transform="rotate(${deg})"/>
        `).join('')}

        <g transform="rotate(22.5)">
          ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => `
            <path d="M0 0 C-9 -9 -10 -20 0 -24 C10 -20 9 -9 0 0 Z" fill="#ffd54f" stroke="#e65100" stroke-width="0.6" transform="rotate(${deg})"/>
          `).join('')}
        </g>

        <!-- 花心金黃密蕊叢 -->
        <circle cx="0" cy="0" r="7.5" fill="#ff6f00"/>
        <circle cx="0" cy="0" r="4.5" fill="#ffa000"/>
        <circle cx="0" cy="-4" r="1.1" fill="#ffffff"/>
        <circle cx="3" cy="-2" r="1.1" fill="#ffffff"/>
        <circle cx="3" cy="2" r="1.1" fill="#ffffff"/>
        <circle cx="-3" cy="2" r="1.1" fill="#ffffff"/>
      </g>
    </svg>
  `;
}

// 4. 木牌法語設定（惟覺老和尚每日開示）
function setupQuoteWoodenSign() {
  const quote = getTodayQuote();
  const signTextEl = document.getElementById('woodenSignQuoteText');
  const quoteModalBody = document.getElementById('woodenQuoteModalText');
  const quoteSourceEl = document.getElementById('woodenQuoteSource');
  const guideQuoteSnippet = document.getElementById('guideDailyQuoteSnippet');
  const guideQuoteSource = document.getElementById('guideDailyQuoteSource');

  if (quote && signTextEl) {
    signTextEl.textContent = quote.quote;
  }
  if (quote && quoteModalBody) {
    quoteModalBody.textContent = quote.quote;
    if (quoteSourceEl) quoteSourceEl.textContent = quote.source;
  }
  if (quote && guideQuoteSnippet) {
    guideQuoteSnippet.textContent = `「${quote.quote}」`;
    if (guideQuoteSource) guideQuoteSource.textContent = `—— ${quote.source}`;
  }
}

// 點擊木牌彈窗檢視法語（每日固定一則，澄心觀照）
function handleWoodenSignClick() {
  playChimeSound(432);
  const q = (typeof getTodayQuote === 'function') ? getTodayQuote() : getRandomQuote();
  document.getElementById('woodenQuoteModalText').textContent = q.quote;
  document.getElementById('woodenQuoteSource').textContent = q.source;
  document.getElementById('woodenSignQuoteText').textContent = q.quote;
  document.getElementById('woodenQuoteModal').style.display = 'flex';
}

function closeWoodenQuoteModal() {
  document.getElementById('woodenQuoteModal').style.display = 'none';
}

// 5. 每日修持打卡表單（精簡為：靜坐 ＋ 每日誦經，可自填，無卷數、無持咒）
function initFormDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const val = `${year}-${month}-${day}T${hours}:${minutes}`;

  const el = document.getElementById('formCheckinTime');
  if (el) {
    el.value = val;
    el.max = val; // 最多選到現在，可向前選歷史時間
  }
}

// 切換補填歷史時間
function toggleBackdateCheckin(checked) {
  const wrap = document.getElementById('backdatePickerWrap');
  if (wrap) {
    wrap.style.display = checked ? 'flex' : 'none';
  }
  if (!checked) {
    initFormDateTime();
  }
}

// 切換經典選項（金剛經、藥師經、普門品、自填）
function handleSutraSelectChange(val) {
  const customInput = document.getElementById('formCustomSutra');
  if (customInput) {
    if (val === '自訂經典') {
      customInput.style.display = 'block';
      customInput.focus();
    } else {
      customInput.style.display = 'none';
      customInput.value = '';
    }
  }
}

// 提交每日打卡（甘露注入蓮池，蓮花太陽花綻放）
async function handleCheckinSubmit(e) {
  if (e) e.preventDefault();

  if (!currentStudent) {
    alert("請先登入後再進行打卡！");
    return;
  }

  const isBackdate = document.getElementById('checkBackdate')?.checked;
  let recordTime = document.getElementById('formCheckinTime')?.value;
  if (!recordTime) {
    recordTime = new Date().toISOString().replace('T', ' ').substring(0, 16);
  } else {
    recordTime = recordTime.replace('T', ' ');
  }

  const isMeditationChecked = document.getElementById('checkMeditation')?.checked;
  const isSutraChecked = document.getElementById('checkSutra')?.checked;

  if (!isMeditationChecked && !isSutraChecked) {
    alert("請至少勾選一項修持定課（靜坐調心 或 每日誦經）！");
    return;
  }

  let meditationMins = 0;
  if (isMeditationChecked) {
    meditationMins = parseInt(document.getElementById('formMeditationMins')?.value) || 0;
    if (meditationMins <= 0) meditationMins = 30;
  }

  // 經典選擇
  let finalSutra = '';
  if (isSutraChecked) {
    const sutraSelect = document.getElementById('formSutraSelect')?.value || '';
    const customSutra = document.getElementById('formCustomSutra')?.value.trim() || '';
    if (sutraSelect === '自訂經典') {
      finalSutra = customSutra || '大乘經典';
    } else {
      finalSutra = sutraSelect || '金剛經';
    }
  }

  let practiceItemName = '';
  if (isMeditationChecked && isSutraChecked) {
    practiceItemName = '靜坐與誦經';
  } else if (isMeditationChecked) {
    practiceItemName = '靜坐調心';
  } else {
    practiceItemName = '每日誦經';
  }

  const note = document.getElementById('formPracticeNote')?.value.trim() || '';

  const payload = {
    student_no: currentStudent.student_no || '',
    class_type: currentStudent.class_type,
    group_name: currentStudent.group_name,
    real_name: currentStudent.real_name,
    dharma_name: currentStudent.dharma_name,
    record_time: recordTime,
    practice_item: practiceItemName,
    meditation_minutes: meditationMins,
    sutra_name: finalSutra,
    sutra_count: 0, // 無卷數
    mantra_name: '', // 無持咒
    mantra_count: 0, // 無遍數
    reflection_note: note
  };

  const btn = document.getElementById('btnSubmitCheckin');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>🌊</span> 善法甘露注入蓮池中……';
  }

  // 播放甘露水特效與音效
  triggerNectarAnimation();
  playWaterSplashSound();

  try {
    const res = await ZenAPI.submitCheckin(payload);
    if (res.success) {
      currentStudent = res.student;
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(res.student));
      localStorage.setItem(API_CONFIG.storageKeys.currentStudent, JSON.stringify(res.student));

      // 重新渲染花園中的花朵
      renderGardenFlowers(res.student.total_checkins || 0);
      updateUserHeaderUI(res.student);

      const notice = document.getElementById('checkinSuccessNotice');
      if (notice) {
        notice.style.display = 'block';
        notice.innerHTML = `
          🪷 <strong>隨喜讚嘆！打卡功德已圓滿注入蓮池！</strong><br>
          已累積修持 <strong>${res.student.total_checkins}</strong> 次，池中蓮花與太陽花向陽繁茂生長！
        `;
        setTimeout(() => { notice.style.display = 'none'; }, 8000);
      }

      // 清空心得輸入
      if (document.getElementById('formPracticeNote')) {
        document.getElementById('formPracticeNote').value = '';
      }
    }
  } catch (err) {
    alert("連線儲存失敗，請檢查網路連線");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>🪷</span> 功德注入蓮池 · 完成今日修持';
    }
  }
}

// 甘露注入蓮池特效動畫
function triggerNectarAnimation() {
  const container = document.getElementById('gardenViewArea');
  if (!container) return;

  for (let i = 0; i < 15; i++) {
    const drop = document.createElement('div');
    drop.className = 'nectar-stream-drop';
    drop.textContent = ['💧', '✨', '🪷', '🌟'][Math.floor(Math.random() * 4)];
    drop.style.left = `${30 + Math.random() * 45}%`;
    drop.style.top = `${-10 + Math.random() * 20}px`;
    drop.style.animationDelay = `${Math.random() * 0.4}s`;
    container.appendChild(drop);

    setTimeout(() => drop.remove(), 1200);
  }
}

// 6. 參觀他人花園 (蓮池海會)
// 嚴格安全隱私保護：僅公開顯示【班級】與【法名】，學號與真實姓名絕對過濾！
function toggleFriendsDrawer(open) {
  const drawer = document.getElementById('friendsDrawerModal');
  if (drawer) {
    drawer.style.display = open ? 'flex' : 'none';
    if (open) loadFriendsList();
  }
}

async function loadFriendsList(classFilter = '') {
  const listEl = document.getElementById('friendsDrawerList');
  if (!listEl) return;
  listEl.innerHTML = '<div style="text-align:center; padding:2rem; color:#888;">連線蓮池海會名錄……</div>';

  const res = await ZenAPI.getPublicGardens(classFilter);
  if (res.success && res.gardens && res.gardens.length > 0) {
    listEl.innerHTML = res.gardens.map(g => `
      <div class="friend-card-row">
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <div class="friend-gem">🪷</div>
          <div>
            <div style="font-weight:700; color:#212121; font-size:1.05rem;">${g.dharma_name || '精進同修'} 的花園</div>
            <div style="font-size:0.78rem; color:#666;">
              <span class="badge-class">${g.class_type}</span>
              <span style="margin-left:4px;">修持打卡 ${g.total_checkins} 次</span>
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <a href="garden2d.html?visitor=1&id=${g.id}" class="btn-primary" style="padding:0.4rem 0.95rem; font-size:0.84rem; text-decoration:none;">
            🌸 進入 2D 花園
          </a>
        </div>
      </div>
    `).join('');
  } else {
    listEl.innerHTML = '<div style="text-align:center; padding:2rem; color:#888;">尚無學員資料</div>';
  }
}

function goToVisited2DGarden() {
  if (visitingStudentData && visitingStudentData.id) {
    window.location.href = `garden2d.html?visitor=1&id=${visitingStudentData.id}`;
  }
}

// 進入特定學員花園
async function visitFriendGarden(studentId) {
  toggleFriendsDrawer(false);
  const res = await ZenAPI.getVisitedGardenDetail(studentId);
  if (res.success && res.garden) {
    isVisitingMode = true;
    visitingStudentData = res.garden;

    const banner = document.getElementById('visitorNoticeBanner');
    if (banner) {
      banner.style.display = 'flex';
      const displayName = visitingStudentData.dharma_name || (visitingStudentData.real_name ? visitingStudentData.real_name[0] + '居士' : '精進學員');
      document.getElementById('visitorGardenTitle').textContent = `正在參觀：【${visitingStudentData.class_type}】${displayName} 的學員花園`;
      document.getElementById('visitorRejoiceCount').textContent = visitingStudentData.rejoice_count || 0;
    }

    // 依該學員打卡數展示其花園中的蓮花與太陽花
    renderGardenFlowers(visitingStudentData.total_checkins || 0);

    // 隱藏打卡面板（參觀時不能代替他人打卡）
    document.getElementById('dailyCheckinCard').style.opacity = '0.4';
    document.getElementById('dailyCheckinCard').style.pointerEvents = 'none';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// 退出參觀，返回我的花園
function exitVisitingMode() {
  isVisitingMode = false;
  visitingStudentData = null;
  const banner = document.getElementById('visitorNoticeBanner');
  if (banner) banner.style.display = 'none';

  if (currentStudent) {
    updateUserHeaderUI(currentStudent);
    renderGardenFlowers(currentStudent.total_checkins || 0);
  }

  // 恢復打卡面板
  document.getElementById('dailyCheckinCard').style.opacity = '1';
  document.getElementById('dailyCheckinCard').style.pointerEvents = 'auto';
}

// 參觀他人花園點擊「隨喜讚嘆合掌」
async function handleRejoiceFriend() {
  if (!visitingStudentData) return;
  const res = await ZenAPI.rejoiceGarden(visitingStudentData.id);
  if (res.success) {
    document.getElementById('visitorRejoiceCount').textContent = res.new_rejoice_count;
    playChimeSound(528);

    // 飄花動畫
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div');
      p.className = 'nectar-stream-drop';
      p.textContent = ['🙏', '🌸', '✨'][Math.floor(Math.random() * 3)];
      p.style.left = `${40 + Math.random() * 20}%`;
      p.style.top = '120px';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }
}

// 7. 音效合成 (Web Audio API)
function playWaterSplashSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    for (let i = 0; i < 5; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(550 + Math.random() * 450, now + i * 0.07);
      gain.gain.setValueAtTime(0.09, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.13);
    }
  } catch (e) {}
}

function playChimeSound(freq = 432) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 2.6);
  } catch (e) {}
}

// 支援直接從 URL 參觀
function setupURLParameters() {
  const params = new URLSearchParams(window.location.search);
  const isVisitorParam = params.get('visitor') === '1';
  const id = params.get('id');
  if (isVisitorParam && id) {
    visitFriendGarden(id);
  }
}

// ════ 指南摺疊手風琴控制邏輯 ════
function handleMainGuideToggle(detailsEl) {
  if (!detailsEl) return;
  const toggleText = detailsEl.querySelector('.toggle-text');
  const toggleArrow = detailsEl.querySelector('.toggle-arrow');
  if (detailsEl.open) {
    if (toggleText) toggleText.textContent = '點擊收合說明';
    if (toggleArrow) toggleArrow.textContent = '▲';
  } else {
    if (toggleText) toggleText.textContent = '點擊展開說明';
    if (toggleArrow) toggleArrow.textContent = '▼';
  }
}

function toggleAllGuideAccordions() {
  const items = document.querySelectorAll('.guide-accordion-item');
  if (!items.length) return;
  const anyOpen = Array.from(items).some(item => item.hasAttribute('open'));
  items.forEach(item => {
    if (anyOpen) {
      item.removeAttribute('open');
    } else {
      item.setAttribute('open', '');
    }
  });
  const btn = document.getElementById('btnToggleAllGuide');
  if (btn) {
    btn.innerHTML = anyOpen ? '<span>➕</span> 全部展開' : '<span>➖</span> 全部收合';
  }
}
