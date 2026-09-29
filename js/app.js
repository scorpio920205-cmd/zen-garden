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
});

// 1. 檢查登入狀態 (未登入顯示登入門檻，已登入展開花園與打卡)
function checkLoginSession() {
  const sessionStr = localStorage.getItem(STORAGE_SESSION_KEY);
  const loginGate = document.getElementById('loginRegisterGate');
  const mainApp = document.getElementById('mainAppInterface');

  if (sessionStr) {
    try {
      currentStudent = JSON.parse(sessionStr);
      if (loginGate) loginGate.style.display = 'none';
      if (mainApp) mainApp.style.display = 'block';

      updateUserHeaderUI(currentStudent);
      renderGardenFlowers(currentStudent.total_checkins || 0);
      setupURLParameters();
      return;
    } catch (e) {
      console.warn("Session parse failed", e);
    }
  }

  // 尚未登入
  if (loginGate) loginGate.style.display = 'flex';
  if (mainApp) mainApp.style.display = 'none';
}

// 2. 登入 / 註冊提交處理
async function handleLoginOrRegister(e) {
  if (e) e.preventDefault();

  const studentNo = document.getElementById('gateStudentNo')?.value.trim() || '';
  const classType = document.getElementById('gateClassType')?.value || '';
  const groupName = document.getElementById('gateGroupName')?.value || '';
  const realName = document.getElementById('gateRealName')?.value.trim() || '';
  const dharmaName = document.getElementById('gateDharmaName')?.value.trim() || '';
  const errEl = document.getElementById('gateErrorMsg');

  if (!classType) {
    showGateError('請選擇您的班級（日高 或 夜高）');
    document.getElementById('gateClassType')?.focus();
    return;
  }
  if (!groupName) {
    showGateError('請選擇您的組別');
    document.getElementById('gateGroupName')?.focus();
    return;
  }
  if (!realName) {
    showGateError('請填寫真實姓名（他人花園中將被嚴格隱藏）');
    document.getElementById('gateRealName')?.focus();
    return;
  }
  if (!dharmaName) {
    showGateError('請填寫法名（他人花園中將公開此法名）');
    document.getElementById('gateDharmaName')?.focus();
    return;
  }

  // 從資料庫中讀取既有學員資料，若無則建立
  const students = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.students) || '[]');
  let s = students.find(item => item.class_type === classType && item.group_name === groupName && item.real_name === realName);

  if (!s) {
    s = {
      id: Date.now(),
      student_no: studentNo,
      class_type: classType,
      group_name: groupName,
      real_name: realName,
      dharma_name: dharmaName,
      total_checkins: 0,
      total_meditation_mins: 0,
      lotus_level: 1,
      rejoice_count: 0,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    students.push(s);
    localStorage.setItem(API_CONFIG.storageKeys.students, JSON.stringify(students));
  } else {
    // 同步更新法名與學號
    s.dharma_name = dharmaName;
    if (studentNo) s.student_no = studentNo;
    localStorage.setItem(API_CONFIG.storageKeys.students, JSON.stringify(students));
  }

  // 儲存目前登入者
  currentStudent = s;
  localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(s));
  localStorage.setItem(API_CONFIG.storageKeys.currentStudent, JSON.stringify(s));

  if (errEl) errEl.style.display = 'none';

  // 進入花園
  document.getElementById('loginRegisterGate').style.display = 'none';
  document.getElementById('mainAppInterface').style.display = 'block';

  updateUserHeaderUI(s);
  renderGardenFlowers(s.total_checkins || 0);
  playChimeSound(432);
}

function showGateError(msg) {
  const errEl = document.getElementById('gateErrorMsg');
  if (errEl) {
    errEl.textContent = `⚠️ ${msg}`;
    errEl.style.display = 'block';
  }
}

// 換人登入 / 登出
function handleLogout() {
  if (confirm("確定要登出並換下一位同修登入嗎？\n您的修持打卡與花園資料皆已妥善保存。")) {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    currentStudent = null;
    isVisitingMode = false;
    window.location.reload();
  }
}

// 更新頂部登入者狀態
function updateUserHeaderUI(student) {
  const nameEl = document.getElementById('navStudentTitle');
  const countEl = document.getElementById('navCheckinCount');
  if (nameEl) {
    nameEl.textContent = `【${student.class_type}】${student.group_name} · ${student.dharma_name}`;
  }
  if (countEl) {
    countEl.textContent = student.total_checkins || 0;
  }
}

// 3. 根據打卡數量「動態生長與盛開蓮花＋太陽花」
function renderGardenFlowers(checkinCount) {
  const pondWater = document.getElementById('pondFlowersLayer');
  const sunflowerSoil = document.getElementById('sunflowerSoilLayer');
  const countBadge = document.getElementById('gardenCheckinCounter');

  if (countBadge) {
    countBadge.textContent = `累積修持：${checkinCount} 次打卡注入`;
  }

  // ════════════════════════════════
  // A. 蓮池中的蓮花 (依打卡數動態生成)
  // ════════════════════════════════
  if (pondWater) {
    let lotusHTML = '';
    // 荷葉基底 (始終有清淨綠荷)
    lotusHTML += `
      <ellipse cx="65" cy="115" rx="36" ry="18" fill="#2d6e35" stroke="#1d4d23" stroke-width="1.5" opacity="0.9"/>
      <ellipse cx="150" cy="120" rx="40" ry="20" fill="#2d6e35" stroke="#1d4d23" stroke-width="1.5" opacity="0.9"/>
      <ellipse cx="110" cy="140" rx="34" ry="16" fill="#388e3c" stroke="#1d4d23" stroke-width="1.5" opacity="0.95"/>
    `;

    if (checkinCount >= 1) {
      // 1 次打卡：冒出第一朵含苞初露的蓮花
      lotusHTML += createLotusSVG(105, 95, 0.9, 'bud');
    }
    if (checkinCount >= 2) {
      // 2 次打卡：左側綻放一朵粉紅蓮花
      lotusHTML += createLotusSVG(65, 80, 1.0, 'bloom');
    }
    if (checkinCount >= 4) {
      // 4 次打卡：右側綻放盛開芙蕖
      lotusHTML += createLotusSVG(150, 75, 1.1, 'bloom');
    }
    if (checkinCount >= 7) {
      // 7 次打卡：後方增添一朵微放清芬的白粉蓮花
      lotusHTML += createLotusSVG(110, 55, 0.85, 'bloom');
    }
    if (checkinCount >= 10) {
      // 10 次以上：中央盛開【七寶金光大祥蓮】，自帶金芒光暈
      lotusHTML += `
        <!-- 金光祥雲光暈 -->
        <circle cx="108" cy="85" r="48" fill="url(#goldenLotusGlow)" opacity="0.6"/>
        ${createLotusSVG(108, 85, 1.35, 'golden')}
      `;
    }

    pondWater.innerHTML = lotusHTML;
  }

  // ════════════════════════════════
  // B. 土地上的太陽花 (依打卡數動態生長)
  // ════════════════════════════════
  if (sunflowerSoil) {
    let sunflowerHTML = '';

    if (checkinCount === 0) {
      // 尚未打卡：肥沃深褐土地，金色菩提種子破土前
      sunflowerHTML = `
        <div style="text-align: center; color: #ffd54f; font-weight: 600; font-size: 0.82rem; padding-top: 55px; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">
          🌱 每日修持打卡，善法甘露注入此地<br>將孕育出盛開的向陽太陽花！
        </div>
      `;
    } else {
      // 打卡 1 次以上：向日葵生長
      const flowerCount = Math.min(5, Math.max(1, Math.floor((checkinCount + 1) / 2)));
      
      const positions = [
        { left: '48%', bottom: '25px', scale: 1.0, stage: checkinCount >= 3 ? 'bloom' : 'sprout' },
        { left: '26%', bottom: '15px', scale: 0.85, stage: checkinCount >= 4 ? 'bloom' : 'bud' },
        { left: '70%', bottom: '20px', scale: 0.9, stage: checkinCount >= 6 ? 'bloom' : 'bud' },
        { left: '38%', bottom: '45px', scale: 0.8, stage: checkinCount >= 8 ? 'bloom' : 'sprout' },
        { left: '60%', bottom: '48px', scale: 0.85, stage: checkinCount >= 10 ? 'bloom' : 'bud' }
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

// 產生蓮花向量圖形
function createLotusSVG(cx, cy, scale, type) {
  const isGolden = type === 'golden';
  const petalFill = isGolden ? '#ffd54f' : '#f48fb1';
  const petalStroke = isGolden ? '#ffb300' : '#e91e63';
  const centerFill = isGolden ? '#ffea00' : '#fdd835';

  if (type === 'bud') {
    return `
      <g transform="translate(${cx}, ${cy}) scale(${scale})">
        <path d="M0 20 L0 0" stroke="#2e7d32" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M0 0 C-10 -10 -6 -24 0 -28 C6 -24 10 -10 0 0" fill="${petalFill}" stroke="${petalStroke}" stroke-width="1"/>
      </g>
    `;
  }

  return `
    <g transform="translate(${cx}, ${cy}) scale(${scale})" class="lotus-flower-bloom">
      <path d="M0 25 L0 0" stroke="#2e7d32" stroke-width="4" stroke-linecap="round"/>
      <!-- 外層花瓣 -->
      <path d="M0 0 C-24 2 -30 -14 -18 -22 C-5 -28 0 0 0 0" fill="${petalFill}" stroke="${petalStroke}" stroke-width="0.8"/>
      <path d="M0 0 C24 2 30 -14 18 -22 C5 -28 0 0 0 0" fill="${petalFill}" stroke="${petalStroke}" stroke-width="0.8"/>
      <!-- 中層花瓣 -->
      <path d="M0 0 C-14 -2 -18 -22 0 -28 C18 -22 14 -2 0 0" fill="${isGolden ? '#ffe082' : '#f8bbd0'}" stroke="${petalStroke}" stroke-width="0.8"/>
      <!-- 內層蓮蓬與花蕊 -->
      <ellipse cx="0" cy="-12" rx="6" ry="4" fill="${centerFill}"/>
    </g>
  `;
}

// 產生向陽太陽花向量圖形
function createSunflowerSVG(stage) {
  if (stage === 'sprout') {
    return `
      <svg viewBox="0 0 80 90" width="60" height="70">
        <path d="M40 85 Q38 60 40 45" stroke="#43a047" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="30" cy="55" rx="12" ry="6" fill="#66bb6a" transform="rotate(-25 30 55)"/>
        <ellipse cx="50" cy="50" rx="12" ry="6" fill="#66bb6a" transform="rotate(25 50 50)"/>
        <circle cx="40" cy="40" r="5" fill="#81c784"/>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 100 120" width="75" height="95" class="sunflower-bloom-anim">
      <!-- 挺拔綠莖與大葉片 -->
      <path d="M50 115 Q48 70 50 48" stroke="#388e3c" stroke-width="5" stroke-linecap="round"/>
      <path d="M49 90 Q22 80 20 95 Q38 100 49 90" fill="#4caf50"/>
      <path d="M51 75 Q78 65 80 80 Q62 85 51 75" fill="#4caf50"/>
      
      <!-- 太陽花金黃花瓣盤 -->
      <g transform="translate(50, 42)">
        ${[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map(deg => `
          <ellipse cx="0" cy="-22" rx="4.5" ry="14" fill="#fbc02d" stroke="#f57f17" stroke-width="0.8" transform="rotate(${deg})"/>
        `).join('')}
        <!-- 深褐色葵花花盤與金黃花粉圈 -->
        <circle cx="0" cy="0" r="14" fill="#5d4037" stroke="#3e2723" stroke-width="1.5"/>
        <circle cx="0" cy="0" r="11" fill="#4e342e"/>
        <circle cx="0" cy="0" r="7" fill="#3e2723"/>
        <circle cx="0" cy="0" r="4" fill="#ffb300" opacity="0.7"/>
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

  if (quote && signTextEl) {
    signTextEl.textContent = quote.quote;
  }
  if (quote && quoteModalBody) {
    quoteModalBody.textContent = quote.quote;
    if (quoteSourceEl) quoteSourceEl.textContent = quote.source;
  }
}

// 點擊木牌彈窗檢視法語
function handleWoodenSignClick() {
  playChimeSound(432);
  const q = getRandomQuote();
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

  const meditationMins = parseInt(document.getElementById('formMeditationMins')?.value) || 0;
  
  // 經典選擇
  const sutraSelect = document.getElementById('formSutraSelect')?.value || '';
  const customSutra = document.getElementById('formCustomSutra')?.value.trim() || '';
  let finalSutra = sutraSelect;
  if (sutraSelect === '自訂經典') {
    finalSutra = customSutra || '大乘經典';
  }

  const note = document.getElementById('formPracticeNote')?.value.trim() || '';

  const payload = {
    student_no: currentStudent.student_no || '',
    class_type: currentStudent.class_type,
    group_name: currentStudent.group_name,
    real_name: currentStudent.real_name,
    dharma_name: currentStudent.dharma_name,
    record_time: recordTime,
    practice_item: meditationMins > 0 ? (finalSutra ? '靜坐與誦經' : '禪坐靜坐') : '每日誦經',
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
            <div style="font-weight:700; color:#212121; font-size:1.05rem;">${g.dharma_name} 的花園</div>
            <div style="font-size:0.78rem; color:#666;">
              <span class="badge-class">${g.class_type}</span>
              <span style="margin-left:4px;">打卡 ${g.total_checkins} 次</span>
            </div>
          </div>
        </div>
        <button class="btn-primary" style="padding:0.35rem 0.9rem; font-size:0.84rem;" onclick="visitFriendGarden(${g.id})">
          🌸 進入逛逛
        </button>
      </div>
    `).join('');
  } else {
    listEl.innerHTML = '<div style="text-align:center; padding:2rem; color:#888;">尚無同修資料</div>';
  }
}

// 進入特定同修花園
async function visitFriendGarden(studentId) {
  toggleFriendsDrawer(false);
  const res = await ZenAPI.getVisitedGardenDetail(studentId);
  if (res.success && res.garden) {
    isVisitingMode = true;
    visitingStudentData = res.garden;

    const banner = document.getElementById('visitorNoticeBanner');
    if (banner) {
      banner.style.display = 'flex';
      document.getElementById('visitorGardenTitle').textContent = `正在參觀：【${visitingStudentData.class_type}】${visitingStudentData.dharma_name} 的花園`;
      document.getElementById('visitorRejoiceCount').textContent = visitingStudentData.rejoice_count || 0;
    }

    // 依該同修打卡數展示其花園中的蓮花與太陽花
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
