/**
 * ═══════════════════════════════════════════════════════════════
 * 2D 開心花園互動引擎 (garden2d.js) - 四季與修行生長演化版
 * 
 * 核心演化邏輯：
 * 第 1 天｜種子：剛開始，只有一小片土地 (assets/images/stage_1_seed.jpg)
 * 第 2 天｜發芽：破土萌發新綠 (assets/images/stage_2_sprout.jpg)
 * 第 3 天｜花開：繁花綻放，圓形花圃 (assets/images/stage_3_bloom.jpg)
 * 持續用功｜成林：除了花，出現樹、池塘、石頭、竹林、禪茶亭 (assets/images/stage_4_forest.jpg)
 * 
 * 四季時令切換：
 * 🌸 春生 ｜ ☀️ 夏長 ｜ 🍁 秋收 ｜ ❄️ 冬藏 (支援飄櫻、落楓與冬雪粒子)
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// 1. 花園修行線性等差生長體系配置 (每張圖增加固定 12 天)
// 第 1 張圖：維持 49 天 (累積 1 ~ 49 天)
// 第 2 張圖：維持 61 天 (累積 50 ~ 110 天)
// 第 3 張圖：維持 73 天 (累積 111 ~ 183 天)
// 第 4 張圖：維持 85 天 (累積 184 ~ 268 天)
// 第 5 張圖：維持 97 天 (累積 269 ~ 365+ 天)
// ═══════════════════════════════════════════════════════════════

const STAGE_CONFIGS = {
  1: {
    id: 1,
    name: "第一階段 · 春生初萌",
    subtext: "維持 49 天（累積 1 ~ 49 天）· 初耕心地，澄澈池水與無泥草皮，善法金種深植心田",
    bg: "assets/images/stage_1_seed.jpg",
    season: "spring",
    duration: 49,
    cumulative: 49,
    hotspots: [
      { id: "seed_sign", x: 67, y: 54, name: "📜 初發心木牌", desc: "惟覺老和尚開示：初發心即成正覺。人在哪裡，心就在哪裡。", action: "quote" }
    ]
  },
  2: {
    id: 2,
    name: "第二階段 · 庭園初展",
    subtext: "維持 61 天（累積 50 ~ 110 天 · 每階+12天等差成長）· 庭園開展，石徑延展，池面澄明，菩提生機日盛",
    bg: "assets/images/stage_2_sprout.jpg",
    season: "spring",
    duration: 61,
    cumulative: 110,
    hotspots: [
      { id: "sprout_sign", x: 67, y: 54, name: "📜 精進修持牌", desc: "惟覺老和尚開示：做任何事都能專心，這就是定。定中生慧，得大自在。", action: "quote" }
    ]
  },
  3: {
    id: 3,
    name: "第三階段 · 菩提成林",
    subtext: "維持 73 天（累積 111 ~ 183 天 · 每階+12天等差成長）· 茂林修竹，樹林漸密，草房日益寬廣，同位置澄澈蓮池，甘露法流不息",
    bg: "assets/images/stage_3_forest_v2.jpg",
    season: "summer",
    duration: 73,
    cumulative: 183,
    hotspots: [
      { id: "forest_sign", x: 67, y: 46, name: "📜 菩提開示牌", desc: "惟覺老和尚開示：虛心有節，動靜一如。做任何事都能專心，這就是定。定中生慧。", action: "quote" }
    ]
  },
  4: {
    id: 4,
    name: "第四階段 · 金秋豐收",
    subtext: "維持 85 天（累積 184 ~ 268 天 · 每階+12天等差成長）· 丹楓金杏，秋林深密，草房擴建為莊嚴大禪堂，同位置澄澈蓮池，行一切善法心中無住",
    bg: "assets/images/stage_4_autumn_v2.jpg",
    season: "autumn",
    duration: 85,
    cumulative: 268,
    hotspots: [
      { id: "autumn_sign", x: 67, y: 46, name: "📜 秋收圓滿牌", desc: "老和尚開示：修福修慧，動則萬善圓滿，靜則一念不生。行一切善法，心中無住。", action: "quote" }
    ]
  },
  5: {
    id: 5,
    name: "第五階段 · 冬藏圓滿",
    subtext: "維持 97 天（累積 269 ~ 365+ 天）· 一整年修持圓滿！純白雪境，深林環抱，大草房禪舍溫暖安住，同位置澄澈蓮池，自性純淨圓融",
    bg: "assets/images/stage_5_winter_v2.jpg",
    season: "winter",
    duration: 97,
    cumulative: 365,
    hotspots: [
      { id: "winter_sign", x: 67, y: 46, name: "🏆 年滿大成牌", desc: "一整年精進不退！老和尚開示：人在哪裡，心就在哪裡。功德圓融，自性花開。", action: "quote" }
    ]
  }
};

// 線性等差成長天數計算 (每階比前一階多 12 天)
function getStageKeyFromDays(days) {
  const d = Math.max(1, days || 1);
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

let currentStageKey = 1;
let currentTool = "select";
let isVisitor = false;
let visitorStudentData = null;
let currentStudentData = null;
let activeLotusStats = { count: 0, blooms: 0, remainder: 0, hasRemainder: false };
let activeSunflowerStats = { count: 0, blooms: 0, remainder: 0, hasRemainder: false };
let audioCtx = null;

// ═══════════════════════════════════════════════════════════════
// 每 3 天長成一朵盛開花朵核心計算規則 (嚴格依據打卡次數，非看時間長短)
// 設打卡次數為 N：
// 1. 盛開花朵數：B = Math.floor(N / 3) 朵 Stage 3 盛開花。
// 2. 餘數 R = N % 3：
//    - R === 0: 無未成花（全部盛開）。如 12 天 = 4 朵花。
//    - R === 1: 1 朵初萌種子 / 嫩芽 (Stage 1)。如 10 天 = 3 朵花 + 1 朵初萌種子。
//    - R === 2: 1 朵含苞待放 / 圓蕾 (Stage 2)。如 11 天 = 3 朵花 + 1 朵含苞待放。
// ═══════════════════════════════════════════════════════════════
function calculateFlowerRule(checkinCount) {
  const count = Math.max(0, parseInt(checkinCount) || 0);
  const blooms = Math.floor(count / 3);
  const remainder = count % 3;
  return {
    count,
    blooms,
    remainder,
    hasRemainder: remainder > 0
  };
}

// 取得特定學員的修持打卡統計（分離計算靜坐打卡次數 ➔ 蓮花、誦經打卡次數 ➔ 太陽花）
function getStudentPracticeStats(studentId, fallbackTotalDays = 0) {
  const allCheckins = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.checkins) || '[]');
  const studentCheckins = allCheckins.filter(c => c.student_id == studentId);

  let lotusCheckins = 0;
  let sunflowerCheckins = 0;

  if (studentCheckins.length > 0) {
    lotusCheckins = studentCheckins.filter(c => 
      (c.meditation_minutes && c.meditation_minutes > 0) || 
      (c.practice_item && (c.practice_item.includes('坐') || c.practice_item.includes('禪')))
    ).length;

    sunflowerCheckins = studentCheckins.filter(c => 
      (c.sutra_name && c.sutra_name.trim().length > 0) || 
      (c.practice_item && c.practice_item.includes('經'))
    ).length;
  }

  // 若記錄筆數少於學員累積修行打卡天數（如示範學員或舊帳號），以累積天數為準
  if (fallbackTotalDays > 0) {
    lotusCheckins = Math.max(lotusCheckins, fallbackTotalDays);
    sunflowerCheckins = Math.max(sunflowerCheckins, fallbackTotalDays);
  }

  return {
    lotusRule: calculateFlowerRule(lotusCheckins),
    sunflowerRule: calculateFlowerRule(sunflowerCheckins)
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  determineInitialStage();
  await setupURLQuery();
  setupStageDockListeners();
  setupToolsDockListeners();
  setupFriendsDrawerListeners();
  setupDailyBroadcast();
});

// 1. 依據學員歷史打卡天數自動判定生長階段 (線性等差：49, 110, 183, 268, 365天)
function determineInitialStage() {
  const currentStudentStr = localStorage.getItem('zen_garden_logged_student_v2') || localStorage.getItem(API_CONFIG.storageKeys.currentStudent);
  if (currentStudentStr) {
    try {
      const s = JSON.parse(currentStudentStr);
      const days = s.total_checkins || 1;
      currentStageKey = getStageKeyFromDays(days);
    } catch (e) {
      currentStageKey = 1;
    }
  } else {
    currentStageKey = 1;
  }
}

// 2. 讀取 URL 參數 (判定是否為「參觀學員花園」或「指導法師巡視」模式)
async function setupURLQuery() {
  const params = new URLSearchParams(window.location.search);
  const isVisitorParam = params.get('visitor') === '1';
  
  // 嚴格資安防護：判定是否為已登入驗證之指導法師 (同時查詢 sessionStorage 與 localStorage)
  const isLoggedOut = (sessionStorage.getItem('zen_logged_out') === '1') || (localStorage.getItem('zen_logged_out') === '1');
  const adminToken = sessionStorage.getItem(API_CONFIG.storageKeys.adminSession) || 
                     sessionStorage.getItem('zen_garden_admin_token_v1') ||
                     localStorage.getItem(API_CONFIG.storageKeys.adminSession) ||
                     localStorage.getItem('zen_garden_admin_token_v1');

  const isMasterAuthenticated = !isLoggedOut && 
                                (localStorage.getItem('zen_master_authenticated') === '1' && 
                                 localStorage.getItem('zen_active_role') === 'master') && 
                                (adminToken === 'ZhongTai#2026');

  // 若使用者在 URL 帶有 admin=1：
  if (params.get('admin') === '1') {
    // 嚴格資安防護：必須已經通過密碼驗證！絕對不可單憑 URL 參數就自動授予管理員權限！
    if (!isMasterAuthenticated) {
      alert("🔒 安全防護：尚未登入指導法師最高權限，請先由管理端輸入密碼登入！");
      window.location.href = 'admin.html';
      return;
    }
    // 已通過密碼驗證：同步補齊該分頁之 sessionStorage，維持權限連貫
    sessionStorage.setItem(API_CONFIG.storageKeys.adminSession, 'ZhongTai#2026');
    sessionStorage.setItem('zen_garden_admin_token_v1', 'ZhongTai#2026');
    sessionStorage.removeItem('zen_logged_out');
  }

  const isAdminParam = (params.get('admin') === '1' || isMasterAuthenticated) && (adminToken === 'ZhongTai#2026');

  const stageParam = params.get('stage');
  const studentId = params.get('id');

  const nameEl = document.getElementById('hudUserDharma');
  const classEl = document.getElementById('hudUserClass');
  const daysEl = document.getElementById('hudDaysNum');
  const visitIndicator = document.getElementById('visitingFriendIndicator');
  const stageDock = document.getElementById('gardenStageDock');
  const stageBanner = document.getElementById('studentStageBanner');
  const backToCheckinBtn = document.getElementById('btnBackToCheckin');
  const adminEntranceBtn = document.getElementById('btnAdminEntrance');
  const hudLogoutBtn = document.getElementById('hudLogoutBtn');

  // 學員與法師管理端嚴格區隔：法師巡檢時右上角永遠返回後台 admin.html，學員端顯示返回打卡區
  if (isAdminParam) {
    if (adminEntranceBtn) adminEntranceBtn.style.display = 'none';
    if (backToCheckinBtn) {
      backToCheckinBtn.innerHTML = '<span>🔒</span> 返回管理後台';
      backToCheckinBtn.href = 'admin.html';
      backToCheckinBtn.title = '返回指導法師管理後台';
    }
    if (hudLogoutBtn) {
      hudLogoutBtn.innerHTML = '<span>🚪</span> 登出管理權限';
      hudLogoutBtn.title = '退出指導法師管理權限並鎖定';
    }
  } else {
    if (adminEntranceBtn) adminEntranceBtn.style.display = 'none';
    if (backToCheckinBtn) {
      backToCheckinBtn.innerHTML = '<span>🏠</span> 返回打卡區';
      backToCheckinBtn.href = 'index.html';
      backToCheckinBtn.title = '返回修持打卡區';
    }
    if (hudLogoutBtn) {
      hudLogoutBtn.innerHTML = '<span>🚪</span> 登出';
      hudLogoutBtn.title = '登出學員修持系統';
    }
  }

  if (isVisitorParam && studentId) {
    // 參觀/巡視學員花園模式：嚴格載入被參觀學員當時之真實 2D 景觀背景與其蓮花/太陽花
    isVisitor = true;
    const res = await ZenAPI.getVisitedGardenDetail(studentId);
    if (res.success && res.garden) {
      visitorStudentData = res.garden;
      const vDisplayName = visitorStudentData.dharma_name || (visitorStudentData.real_name ? visitorStudentData.real_name[0] + '居士' : '精進學員');
      nameEl.textContent = `${vDisplayName} 的學員花園`;
      classEl.textContent = visitorStudentData.class_type;

      const days = visitorStudentData.total_checkins || 0;
      daysEl.textContent = Math.max(1, days);

      // 嚴格依 3 天 1 朵規則計算該學員真實的花朵狀態（蓮花生於池塘，太陽花生於草皮）
      const stats = getStudentPracticeStats(visitorStudentData.id, days);
      activeLotusStats = stats.lotusRule;
      activeSunflowerStats = stats.sunflowerRule;

      // 依該被參觀學員累積天數判定其背景生長階段 (49, 110, 183, 268, 365)
      const earnedStage = getStageKeyFromDays(days);
      currentStageKey = earnedStage;

      if (visitIndicator) {
        visitIndicator.style.display = 'flex';
        const titleEl = document.getElementById('visitingFriendTitle');
        const backBtn = visitIndicator.querySelector('button');

        if (isAdminParam) {
          // 指導法師巡視學員花園：明確提示法師巡視，按鈕必定返回管理後台 admin.html
          if (titleEl) {
            titleEl.innerHTML = `🔒 <strong>指導法師最高權限巡視：</strong>【${visitorStudentData.class_type}】${visitorStudentData.real_name || visitorStudentData.dharma_name} 的學員花園 ｜ 累積打卡 ${days} 天`;
          }
          if (backBtn) {
            backBtn.textContent = '← 返回管理後台';
            backBtn.style.background = '#ffd54f';
            backBtn.style.color = '#172c26';
            backBtn.onclick = () => { window.location.href = 'admin.html'; };
          }
          if (stageDock) stageDock.style.display = 'flex';
          if (stageBanner) stageBanner.style.display = 'none';
          if (stageParam && STAGE_CONFIGS[stageParam]) {
            currentStageKey = isNaN(stageParam) ? stageParam : parseInt(stageParam);
          }
        } else {
          // 學員互相參觀：同學只會出現該學員對應之一張圖，未到天數不切換
          if (titleEl) titleEl.textContent = `正在參觀學員花園：【${visitorStudentData.class_type}】${vDisplayName} 的精進花園（累積 ${days} 天）`;
          if (backBtn) {
            backBtn.textContent = '← 返回我的花園';
            backBtn.onclick = returnToMyGarden;
          }
          if (stageDock) stageDock.style.display = 'none';
          if (stageBanner) stageBanner.style.display = 'none';
        }
      }

      renderCurrentStage(currentStageKey);
      return;
    }
  }

  // 指導法師直接總覽全圖庫模式 (admin=1 且無 studentId)
  if (isAdminParam) {
    nameEl.textContent = '指導法師 巡檢全圖';
    classEl.textContent = '指導法師';
    daysEl.textContent = '全';
    activeLotusStats = calculateFlowerRule(36); // 12朵盛開花
    activeSunflowerStats = calculateFlowerRule(45); // 15朵盛開花

    if (visitIndicator) {
      visitIndicator.style.display = 'flex';
      const titleEl = document.getElementById('visitingFriendTitle');
      const backBtn = visitIndicator.querySelector('button');
      if (titleEl) titleEl.innerHTML = '🔒 <strong>指導法師最高權限：</strong>2D 花園全生長階段圖庫總覽（等差成長體系 · 可切換中央全部階段圖）';
      if (backBtn) {
        backBtn.textContent = '← 返回法師管理台';
        backBtn.style.background = '#ffd54f';
        backBtn.style.color = '#172c26';
        backBtn.onclick = () => { window.location.href = 'admin.html'; };
      }
    }

    if (stageDock) stageDock.style.display = 'flex';
    if (stageBanner) stageBanner.style.display = 'none';

    if (stageParam && STAGE_CONFIGS[stageParam]) {
      currentStageKey = isNaN(stageParam) ? stageParam : parseInt(stageParam);
    } else {
      currentStageKey = 1;
    }

    renderCurrentStage(currentStageKey);
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // 預設本人花園模式（同學端：未到天數只能看到對應天數的圖，只會出現一張圖）
  // ═══════════════════════════════════════════════════════════════
  isVisitor = false;
  if (visitIndicator) visitIndicator.style.display = 'none';

  let s = null;
  const currentStudentStr = localStorage.getItem('zen_garden_logged_student_v2') || localStorage.getItem(API_CONFIG.storageKeys.currentStudent);
  if (currentStudentStr) {
    try {
      s = JSON.parse(currentStudentStr);
    } catch (e) {}
  }

  // 永續 Session 保護機制：若本地無 session，自動接續既有學員或示範學員，永不讓使用者按返回時跳出登入
  if (!s) {
    const students = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.students) || '[]');
    s = (students.length > 0) ? students[0] : (typeof INITIAL_DEMO_STUDENTS !== 'undefined' ? INITIAL_DEMO_STUDENTS[0] : null);
  }

  if (s) {
    currentStudentData = s;
    // 雙向回存確保一致
    localStorage.setItem('zen_garden_logged_student_v2', JSON.stringify(s));
    localStorage.setItem(API_CONFIG.storageKeys.currentStudent, JSON.stringify(s));

    nameEl.textContent = s.dharma_name ? `${s.dharma_name} 的花園` : (s.real_name ? `${s.real_name} 的花園` : '我的花園');
    classEl.textContent = s.class_type ? `${s.class_type} ${s.group_name || ''}` : '日高';
    const checkinCount = s.total_checkins || 0;
    daysEl.textContent = Math.max(1, checkinCount);

    // 依 3 天 1 朵規則嚴格計算本人累積的蓮花與太陽花
    const stats = getStudentPracticeStats(s.id, checkinCount);
    activeLotusStats = stats.lotusRule;
    activeSunflowerStats = stats.sunflowerRule;

    // 動態更新累積菩提功德金與可用甘露法水
    const meritEl = document.getElementById('hudMeritPoints');
    if (meritEl) meritEl.textContent = checkinCount * 100 + (s.total_meditation_mins || 0);
    const dewEl = document.getElementById('hudDewDrops');
    if (dewEl) dewEl.textContent = Math.max(3, checkinCount * 2);

    // 同學端嚴格鎖定：依目前打卡天數對應唯一一張圖
    const earnedStage = getStageKeyFromDays(checkinCount);
    currentStageKey = earnedStage;

    // 隱藏切換中控列，只顯示同學修行境界牌
    if (stageDock) stageDock.style.display = 'none';
    if (stageBanner) {
      stageBanner.style.display = 'flex';
      const info = getNextStageInfo(checkinCount);
      const txtEl = document.getElementById('studentStageText');
      if (txtEl) txtEl.textContent = info.text;
    }
  } else {
    nameEl.textContent = '傳心 的花園';
    classEl.textContent = '日高';
    daysEl.textContent = '1';
    currentStageKey = 1;
    activeLotusStats = calculateFlowerRule(1);
    activeSunflowerStats = calculateFlowerRule(1);
    if (stageDock) stageDock.style.display = 'none';
    if (stageBanner) {
      stageBanner.style.display = 'flex';
      const txtEl = document.getElementById('studentStageText');
      if (txtEl) txtEl.textContent = '目前境界：第 1 張圖（維持 49 天）· 累積打卡 1 天 ｜ 距第 2 張圖（110天）還差 49 天';
    }
  }

  // 執行花園渲染
  renderCurrentStage(currentStageKey);
}

// 3. 渲染背景、特效粒子、互動熱點與花園花朵
function renderCurrentStage(stageKey) {
  const config = STAGE_CONFIGS[stageKey];
  if (!config) return;

  currentStageKey = stageKey;

  // 1. 切換背景圖層（平滑淡入）
  const bgContainer = document.getElementById('gardenBgViewport');
  if (bgContainer) {
    bgContainer.querySelectorAll('.garden-bg-layer').forEach(layer => layer.classList.remove('active'));
    let targetLayer = document.getElementById(`bgLayer_${stageKey}`);
    if (!targetLayer) {
      targetLayer = document.createElement('div');
      targetLayer.id = `bgLayer_${stageKey}`;
      targetLayer.className = 'garden-bg-layer';
      targetLayer.style.backgroundImage = `url('${config.bg}')`;
      bgContainer.appendChild(targetLayer);
    }
    // 強制重繪後激活動畫
    requestAnimationFrame(() => targetLayer.classList.add('active'));
  }

  // 2. 切換導覽標籤高亮
  document.querySelectorAll('.stage-tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.stage == stageKey) btn.classList.add('active');
  });

  // 3. 切換頂部階段標題
  const descEl = document.getElementById('stageDescText');
  if (descEl) descEl.textContent = `${config.name} · ${config.subtext}`;

  // 4. 產生該季節專屬飄落環境粒子 (櫻花瓣 / 紅楓 / 冬雪)
  generateAmbientParticles(config.season);

  // 5. 產生該生長階段的精美互動節點 (Hotspots)
  renderHotspotNodes(config.hotspots);

  // 6. 動態渲染池塘蓮花與草皮太陽花 (蓮花應生在池塘裡，太陽花應生在草皮裡，花開了最後都應長在2D花園)
  renderGarden2DFlowers(stageKey);
}

// ═══════════════════════════════════════════════════════════════
// 2D 花園動態花朵渲染引擎 (三階段成花：初芽種子 ➔ 含苞 ➔ 聖潔盛開)
// 規則：每 3 天 1 朵盛開花，餘數 1 為初萌種子/嫩芽，餘數 2 為含苞待放/圓蕾
// 蓮花生於池塘裡（靜中生慧），太陽花生於草皮裡（以經照心）
// ═══════════════════════════════════════════════════════════════
function renderGarden2DFlowers(stageKey) {
  const pondSvg = document.getElementById('garden2dPondSvg');
  const lawnContainer = document.getElementById('garden2dLawnSunflowers');
  if (!pondSvg || !lawnContainer) return;

  const lotusBlooms = activeLotusStats.blooms;
  const lotusRem = activeLotusStats.remainder;
  const sunBlooms = activeSunflowerStats.blooms;
  const sunRem = activeSunflowerStats.remainder;

  // 同步更新 HUD 與底部狀態條 (以深色高對比字體清晰呈現朵數與未成花進度)
  const hudLotusEl = document.getElementById('hudLotusCount');
  const hudLotusRemEl = document.getElementById('hudLotusRemainder');
  if (hudLotusEl) hudLotusEl.textContent = `${lotusBlooms} 朵`;
  if (hudLotusRemEl) {
    if (lotusRem === 1) hudLotusRemEl.textContent = '(+1種子)';
    else if (lotusRem === 2) hudLotusRemEl.textContent = '(+1花苞)';
    else hudLotusRemEl.textContent = '';
  }

  const hudSunEl = document.getElementById('hudSunflowerCount');
  const hudSunRemEl = document.getElementById('hudSunflowerRemainder');
  if (hudSunEl) hudSunEl.textContent = `${sunBlooms} 朵`;
  if (hudSunRemEl) {
    if (sunRem === 1) hudSunRemEl.textContent = '(+1嫩芽)';
    else if (sunRem === 2) hudSunRemEl.textContent = '(+1花苞)';
    else hudSunRemEl.textContent = '';
  }

  const badgeLotusEl = document.getElementById('badgeLotusNum');
  if (badgeLotusEl) {
    badgeLotusEl.textContent = `${lotusBlooms} 朵${lotusRem === 1 ? ' (含1種子)' : (lotusRem === 2 ? ' (含1花苞)' : '')}`;
  }
  const badgeSunEl = document.getElementById('badgeSunflowerNum');
  if (badgeSunEl) {
    badgeSunEl.textContent = `${sunBlooms} 朵${sunRem === 1 ? ' (含1嫩芽)' : (sunRem === 2 ? ' (含1花苞)' : '')}`;
  }

  // 1. 池塘全景漸層庫定義 (精確參照蓮花-01與蓮花-02粉白漸層、鮮綠蓮蓬、金黃花蕊)
  let defsHTML = `
    <defs>
      <!-- 蓮花白底胭脂粉漸層 (蓮花-01/02實物) -->
      <linearGradient id="lotusPetalGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="45%" stop-color="#ffffff"/>
        <stop offset="75%" stop-color="#f8bbd0"/>
        <stop offset="90%" stop-color="#ec407a"/>
        <stop offset="100%" stop-color="#c2185b"/>
      </linearGradient>
      <!-- 花苞漸層 -->
      <linearGradient id="lotusBudGrad" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stop-color="#e8f5e9"/>
        <stop offset="30%" stop-color="#ffffff"/>
        <stop offset="70%" stop-color="#f48fb1"/>
        <stop offset="100%" stop-color="#ad1457"/>
      </linearGradient>
      <!-- 鮮綠蓮蓬漸層 -->
      <radialGradient id="lotusPodGrad" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#d4e157"/>
        <stop offset="60%" stop-color="#9e9d24"/>
        <stop offset="100%" stop-color="#558b2f"/>
      </radialGradient>
      <!-- 荷葉漸層 -->
      <radialGradient id="lotusLeafGrad" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#66bb6a"/>
        <stop offset="55%" stop-color="#2e7d32"/>
        <stop offset="100%" stop-color="#1b5e20"/>
      </radialGradient>
      <!-- 佛光金光 -->
      <radialGradient id="lotusAuraGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fffde7" stop-opacity="0.9"/>
        <stop offset="50%" stop-color="#ffd54f" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#ffb300" stop-opacity="0"/>
      </radialGradient>
    </defs>
  `;

  // A. 池塘蓮花渲染 (動態按學員累積的蓮花朵數自然分佈於池面：每3天1朵盛開花，餘數1初萌種子，餘數2含苞待放)
  let lotusHTML = defsHTML;
  // 背景浮水碧綠荷葉 (精緻錯落佈局，襯托微型聖蓮，不搶視覺焦點)
  lotusHTML += `
    <ellipse cx="60" cy="118" rx="26" ry="12" fill="url(#lotusLeafGrad)" opacity="0.9"/>
    <ellipse cx="152" cy="122" rx="28" ry="13" fill="url(#lotusLeafGrad)" opacity="0.9"/>
    <ellipse cx="108" cy="142" rx="24" ry="11" fill="url(#lotusLeafGrad)" opacity="0.92"/>
    <ellipse cx="38" cy="88" rx="20" ry="9" fill="url(#lotusLeafGrad)" opacity="0.85"/>
    <ellipse cx="188" cy="90" rx="22" ry="10" fill="url(#lotusLeafGrad)" opacity="0.85"/>
    <ellipse cx="118" cy="65" rx="18" ry="8" fill="url(#lotusLeafGrad)" opacity="0.8"/>
  `;

  // ═══════════════════════════════════════════════════════════════
  // 縮小蓮花比例（精巧微型化，完美契合石圈水池，盛開直徑約 28~36px）
  // 24 個深淺立體透視座標，遠小近大，放數十朵依然疏朗空靈
  // ═══════════════════════════════════════════════════════════════
  const POND_LOTUS_COORDS = [
    // 1. 核心自然開展區（優先放置前 6 朵）
    { cx: 120, cy: 95, scale: 1.05 },
    { cx: 80, cy: 88, scale: 0.98 },
    { cx: 160, cy: 90, scale: 1.02 },
    { cx: 100, cy: 115, scale: 1.12 },
    { cx: 142, cy: 118, scale: 1.10 },
    { cx: 115, cy: 72, scale: 0.90 },

    // 2. 次階擴展區（第 7 ~ 12 朵）
    { cx: 62, cy: 105, scale: 1.04 },
    { cx: 178, cy: 106, scale: 1.05 },
    { cx: 86, cy: 68, scale: 0.88 },
    { cx: 152, cy: 70, scale: 0.90 },
    { cx: 122, cy: 135, scale: 1.15 },
    { cx: 90, cy: 130, scale: 1.12 },

    // 3. 繁盛全景區（第 13 ~ 18 朵）
    { cx: 155, cy: 132, scale: 1.12 },
    { cx: 48, cy: 92, scale: 0.96 },
    { cx: 192, cy: 94, scale: 0.98 },
    { cx: 100, cy: 55, scale: 0.84 },
    { cx: 138, cy: 56, scale: 0.85 },
    { cx: 70, cy: 78, scale: 0.92 },

    // 4. 滿池功德區（第 19 ~ 24 朵）
    { cx: 170, cy: 80, scale: 0.94 },
    { cx: 135, cy: 82, scale: 0.98 },
    { cx: 105, cy: 85, scale: 1.00 },
    { cx: 76, cy: 120, scale: 1.08 },
    { cx: 165, cy: 122, scale: 1.08 },
    { cx: 120, cy: 52, scale: 0.82 }
  ];

  // 組裝需繪製的蓮花清單：先放 blooms 朵 Stage 3，再放 remainder 朵 (1:種子, 2:花苞)
  const lotusesToRender = [];
  for (let i = 0; i < lotusBlooms; i++) {
    lotusesToRender.push({ stage: 3, label: `第 ${i + 1} 朵聖蓮（盛開）` });
  }
  if (lotusRem === 1) {
    lotusesToRender.push({ stage: 1, label: '初萌種子（靜坐第1天累積中）' });
  } else if (lotusRem === 2) {
    lotusesToRender.push({ stage: 2, label: '含苞待放（靜坐第2天累積中）' });
  }

  // 若完全無打卡（0天），池塘澄澈顯現 1 粒菩提金剛種子引導發心
  if (lotusesToRender.length === 0) {
    lotusesToRender.push({ stage: 1, label: '初發心金剛種子（待打卡綻放）' });
  }

  const renderLotusTotal = Math.min(lotusesToRender.length, POND_LOTUS_COORDS.length);
  for (let i = 0; i < renderLotusTotal; i++) {
    const c = POND_LOTUS_COORDS[i];
    const item = lotusesToRender[i];
    lotusHTML += create2DLotusSVG(c.cx, c.cy, c.scale, item.stage);
  }
  pondSvg.innerHTML = lotusHTML;

  // B. 草皮太陽花渲染 (太陽花生於綠茵草皮上：每3天1朵盛開花，餘數1初萌嫩芽，餘數2含苞圓蕾)
  const LAWN_SUNFLOWER_COORDS = [
    { left: '15%', top: '24%', scale: 1.05, color: 'gold' },
    { left: '36%', top: '14%', scale: 1.22, color: 'gold' },
    { left: '60%', top: '16%', scale: 1.15, color: 'gold' },
    { left: '80%', top: '26%', scale: 1.02, color: 'rose' },
    { left: '24%', top: '48%', scale: 1.35, color: 'gold' },
    { left: '48%', top: '44%', scale: 1.40, color: 'gold' },
    { left: '72%', top: '45%', scale: 1.25, color: 'rose' },
    { left: '12%', top: '65%', scale: 1.10, color: 'gold' },
    { left: '36%', top: '68%', scale: 1.30, color: 'rose' },
    { left: '62%', top: '70%', scale: 1.35, color: 'gold' },
    { left: '84%', top: '62%', scale: 1.15, color: 'gold' },
    { left: '46%', top: '26%', scale: 1.25, color: 'gold' },
    { left: '20%', top: '32%', scale: 1.05, color: 'rose' },
    { left: '68%', top: '32%', scale: 1.20, color: 'gold' },
    { left: '50%', top: '62%', scale: 1.25, color: 'gold' }
  ];

  const sunflowersToRender = [];
  for (let i = 0; i < sunBlooms; i++) {
    sunflowersToRender.push({ stage: 3, label: `第 ${i + 1} 朵向陽花（盛開）` });
  }
  if (sunRem === 1) {
    sunflowersToRender.push({ stage: 1, label: '初萌松針嫩芽（誦經第1天累積中）' });
  } else if (sunRem === 2) {
    sunflowersToRender.push({ stage: 2, label: '含苞圓蕾（誦經第2天累積中）' });
  }

  if (sunflowersToRender.length === 0) {
    sunflowersToRender.push({ stage: 1, label: '初萌嫩芽（待誦經打卡綻放）' });
  }

  let sunflowerHTML = '';
  const renderSunTotal = Math.min(sunflowersToRender.length, LAWN_SUNFLOWER_COORDS.length);
  for (let i = 0; i < renderSunTotal; i++) {
    const c = LAWN_SUNFLOWER_COORDS[i];
    const item = sunflowersToRender[i];
    const typeStr = item.stage === 1 ? 'sunflower-sprout' : (item.stage === 2 ? 'sunflower-bud' : 'sunflower-bloom');
    sunflowerHTML += `
      <div class="g2d-sunflower-item ${item.stage === 3 ? 'g2d-flower-sway' : ''}" style="left:${c.left}; top:${c.top}; transform:scale(${c.scale});" onclick="handleFlowerClick('${typeStr}', this)" title="🌻 誦經修持所成（${item.label}）">
        ${create2DSunflowerSVG(item.stage, c.color)}
      </div>
    `;
  }
  lawnContainer.innerHTML = sunflowerHTML;
}

// ═══════════════════════════════════════════════════════════════
// 產生 2D 蓮花 SVG (精確參照蓮花-01與02真實佛座聖蓮，小巧典雅)
// stage 1: 初芽種子 (第 1 天｜種子：浮水小葉 + 菩提金剛善種微光)
// stage 2: 含苞待放 (第 2 天｜發芽：亭亭玉立翡翠細莖 + 白玉粉尖立苞)
// stage 3: 聖蓮盛開 (第 3 天｜花開：多層白底胭脂粉瓣 + 鮮綠蓮蓬 + 金黃花蕊)
// ═══════════════════════════════════════════════════════════════
function create2DLotusSVG(cx, cy, scale = 1, stage = 3) {
  if (stage === 1) {
    // 階段一：第 1 天｜種子
    return `
      <g transform="translate(${cx}, ${cy}) scale(${scale})" style="cursor:pointer;" onclick="handleFlowerClick('lotus-seed', this)" title="🪷 蓮花【第 1 天｜種子】：善種深植自性心田">
        <ellipse cx="0" cy="2" rx="11" ry="5.5" fill="url(#lotusLeafGrad)"/>
        <path d="M0 2 L-8 1 M0 2 L8 1 M0 2 L0 -2" stroke="#a5d6a7" stroke-width="0.5" opacity="0.6"/>
        <circle cx="0" cy="-1" r="7" fill="url(#lotusAuraGrad)"/>
        <ellipse cx="0" cy="-1" rx="2.5" ry="3" fill="#ffd54f" stroke="#ffb300" stroke-width="0.7"/>
        <circle cx="-0.5" cy="-1.8" r="0.8" fill="#ffffff"/>
        <path d="M0 -3 Q2 -8 4 -10 Q3 -7 1 -3" fill="#81c784" stroke="#2e7d32" stroke-width="0.5"/>
      </g>
    `;
  }

  if (stage === 2) {
    // 階段二：第 2 天｜發芽（立苞）(內層搖曳，不覆蓋外層座標)
    return `
      <g transform="translate(${cx}, ${cy}) scale(${scale})" style="cursor:pointer;" onclick="handleFlowerClick('lotus-bud', this)" title="🪷 蓮花【第 2 天｜發芽·含苞】：玉潔亭立，秀拔花苞待放">
        <g class="g2d-flower-sway">
          <ellipse cx="4" cy="4" rx="10" ry="5" fill="url(#lotusLeafGrad)"/>
          <path d="M-2 4 Q-1 -2 -2 -8" stroke="#2e7d32" stroke-width="1.8" stroke-linecap="round" fill="none"/>
          <path d="M-5 -7 C-5 -11 -3 -12 -2 -7 Z" fill="#388e3c"/>
          <path d="M1 -7 C1 -11 -1 -12 -2 -7 Z" fill="#388e3c"/>
          <path d="M-2 -8 C-8 -15 -6 -23 -2 -27 C2 -23 4 -15 -2 -8 Z" fill="url(#lotusBudGrad)" stroke="#c2185b" stroke-width="0.5"/>
          <path d="M-2 -8 C-6 -15 -4 -22 -2 -27" stroke="#f06292" stroke-width="0.4" fill="none"/>
          <path d="M-2 -8 C2 -15 0 -22 -2 -27" stroke="#f06292" stroke-width="0.4" fill="none"/>
          <circle cx="-2" cy="-26.5" r="0.8" fill="#ad1457"/>
        </g>
      </g>
    `;
  }

  // 階段三：第 3 天｜花開（聖潔盛開）(內層搖曳，外層精準定位)
  return `
    <g transform="translate(${cx}, ${cy}) scale(${scale})" style="cursor:pointer;" onclick="handleFlowerClick('lotus-bloom', this)" title="🪷 蓮花【第 3 天｜花開】：靜中生慧，圓滿盛開聖潔祥蓮">
      <g class="g2d-flower-sway">
        <!-- 托底碧綠荷葉 -->
        <ellipse cx="0" cy="4" rx="18" ry="9" fill="url(#lotusLeafGrad)"/>
        <path d="M0 4 L-14 2 M0 4 L14 2 M0 4 L-8 9 M0 4 L8 9 M0 4 L-6 -2 M0 4 L6 -2" stroke="#a5d6a7" stroke-width="0.6" opacity="0.5"/>
        <circle cx="0" cy="4" r="1.2" fill="#c8e6c9"/>
        <!-- 微暈佛光 -->
        <circle cx="0" cy="-1" r="16" fill="url(#lotusAuraGrad)"/>
        <!-- 後層大瓣 -->
        <path d="M0 0 C-6 -6 -7 -18 0 -22 C7 -18 6 -6 0 0 Z" fill="url(#lotusPetalGrad)" stroke="#c2185b" stroke-width="0.4"/>
        <path d="M-2 1 C-12 -3 -16 -12 -12 -18 C-7 -15 -3 -7 -2 1 Z" fill="url(#lotusPetalGrad)" stroke="#c2185b" stroke-width="0.4"/>
        <path d="M2 1 C12 -3 16 -12 12 -18 C7 -15 3 -7 2 1 Z" fill="url(#lotusPetalGrad)" stroke="#c2185b" stroke-width="0.4"/>
        <path d="M-3 2 C-16 1 -20 -5 -19 -10 C-13 -9 -6 -3 -3 2 Z" fill="url(#lotusPetalGrad)" stroke="#ad1457" stroke-width="0.4"/>
        <path d="M3 2 C16 1 20 -5 19 -10 C13 -9 6 -3 3 2 Z" fill="url(#lotusPetalGrad)" stroke="#ad1457" stroke-width="0.4"/>
        <!-- 中層花瓣 -->
        <path d="M-2 2 C-10 -1 -12 -9 -8 -14 C-4 -11 -2 -3 -2 2 Z" fill="url(#lotusPetalGrad)" stroke="#e91e63" stroke-width="0.4"/>
        <path d="M2 2 C10 -1 12 -9 8 -14 C4 -11 2 -3 2 2 Z" fill="url(#lotusPetalGrad)" stroke="#e91e63" stroke-width="0.4"/>
        <!-- 金黃雄蕊叢 -->
        <ellipse cx="0" cy="0" rx="8" ry="4" fill="#ffd54f" opacity="0.7"/>
        <g stroke="#fbc02d" stroke-width="0.8" stroke-linecap="round">
          <line x1="-6" y1="0" x2="-7" y2="-3"/>
          <line x1="-3" y1="-1" x2="-4" y2="-4"/>
          <line x1="0" y1="-1" x2="0" y2="-5"/>
          <line x1="3" y1="-1" x2="4" y2="-4"/>
          <line x1="6" y1="0" x2="7" y2="-3"/>
        </g>
        <!-- 鮮綠小蓮蓬 -->
        <ellipse cx="0" cy="0" rx="4.5" ry="2.8" fill="url(#lotusPodGrad)" stroke="#558b2f" stroke-width="0.5"/>
        <circle cx="0" cy="0" r="0.5" fill="#1b5e20"/>
        <circle cx="-2" cy="-0.5" r="0.4" fill="#1b5e20"/>
        <circle cx="2" cy="-0.5" r="0.4" fill="#1b5e20"/>
        <!-- 前層低覆花瓣 (宛若佛座) -->
        <path d="M-2 2 C-10 4 -12 8 -8 11 C-5 9 -2 5 -2 2 Z" fill="url(#lotusPetalGrad)" stroke="#c2185b" stroke-width="0.4"/>
        <path d="M2 2 C10 4 12 8 8 11 C5 9 2 5 2 2 Z" fill="url(#lotusPetalGrad)" stroke="#c2185b" stroke-width="0.4"/>
        <path d="M0 3 C-6 5 -6 10 0 13 C6 10 6 5 0 3 Z" fill="url(#lotusPetalGrad)" stroke="#c2185b" stroke-width="0.4"/>
      </g>
    </g>
  `;
}

// ═══════════════════════════════════════════════════════════════
// 產生 2D 太陽花 SVG (松葉牡丹 · 參照太陽花-01與02)
// stage 1: 肉質松針嫩芽
// stage 2: 松針簇擁含苞圓蕾
// stage 3: 重瓣波浪嬌豔盛開
// ═══════════════════════════════════════════════════════════════
function create2DSunflowerSVG(stage, color = 'gold') {
  if (stage === 1) {
    // 階段一：肉質松針初萌嫩芽
    return `
      <svg width="44" height="46" viewBox="0 0 44 46">
        <path d="M22 44 Q21 30 22 20" stroke="#388e3c" stroke-width="3.5" stroke-linecap="round"/>
        <!-- 肉質松針葉 (圓柱狀針葉) -->
        <path d="M22 24 C14 22 8 14 6 8 C12 10 18 18 22 24 Z" fill="#66bb6a" stroke="#1b5e20" stroke-width="0.7"/>
        <path d="M22 24 C30 22 36 14 38 8 C32 10 26 18 22 24 Z" fill="#66bb6a" stroke="#1b5e20" stroke-width="0.7"/>
        <path d="M22 20 C18 14 18 6 22 2 C26 6 26 14 22 20 Z" fill="#81c784" stroke="#1b5e20" stroke-width="0.7"/>
        <circle cx="22" cy="3" r="2.5" fill="#ffd54f"/>
      </svg>
    `;
  }

  if (stage === 2) {
    // 階段二：含苞圓蕾 (松針葉托圓花苞)
    return `
      <svg width="50" height="56" viewBox="0 0 50 56">
        <path d="M25 54 Q24 38 25 26" stroke="#2e7d32" stroke-width="4" stroke-linecap="round"/>
        <!-- 環抱松針葉 -->
        <path d="M25 26 C12 28 4 18 2 10 C10 14 20 20 25 26 Z" fill="#4caf50" stroke="#1b5e20" stroke-width="0.8"/>
        <path d="M25 26 C38 28 46 18 48 10 C40 14 30 20 25 26 Z" fill="#4caf50" stroke="#1b5e20" stroke-width="0.8"/>
        <!-- 緊實圓花苞 -->
        <ellipse cx="25" cy="18" rx="13" ry="14" fill="#388e3c" stroke="#1b5e20" stroke-width="0.8"/>
        <!-- 裂開露出金黃花瓣 -->
        <path d="M25 4 C17 10 18 22 25 27 C32 22 33 10 25 4 Z" fill="#ffb300" stroke="#e65100" stroke-width="0.7"/>
        <path d="M25 4 L25 27" stroke="#ffa000" stroke-width="0.6"/>
        <circle cx="25" cy="5" r="2" fill="#fff9c4"/>
      </svg>
    `;
  }

  // 階段三：重瓣波浪嬌豔盛開 (參照太陽花-02.jpg立體重瓣波浪)
  const isRose = color === 'rose';
  const petalMain = isRose ? '#f06292' : '#ffb300';
  const petalEdge = isRose ? '#c2185b' : '#e65100';
  const petalInner = isRose ? '#f8bbd0' : '#ffd54f';
  const centerColor = isRose ? '#fff59d' : '#ff6f00';

  return `
    <svg width="68" height="78" viewBox="0 0 68 78">
      <!-- 肉質花莖 -->
      <path d="M34 76 Q33 54 34 38" stroke="#2e7d32" stroke-width="4.5" stroke-linecap="round"/>
      
      <!-- 花朵背後簇生肉質松針葉 (太陽花特徵) -->
      <path d="M34 38 C14 42 2 34 0 24 C10 28 24 34 34 38 Z" fill="#4caf50" stroke="#1b5e20" stroke-width="0.8"/>
      <path d="M34 38 C54 42 66 34 68 24 C58 28 44 34 34 38 Z" fill="#4caf50" stroke="#1b5e20" stroke-width="0.8"/>
      <path d="M34 38 C20 48 10 58 6 68 C14 58 24 48 34 38 Z" fill="#388e3c" stroke="#1b5e20" stroke-width="0.8"/>
      <path d="M34 38 C48 48 58 58 62 68 C54 58 44 48 34 38 Z" fill="#388e3c" stroke="#1b5e20" stroke-width="0.8"/>

      <!-- 重瓣盛開花頭 (波浪層疊花瓣 · 牡丹般錦簇) -->
      <g transform="translate(34, 30)">
        <!-- 外輪大重瓣 (8瓣) -->
        ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => `
          <path d="M0 0 C-10 -10 -12 -24 0 -28 C12 -24 10 -10 0 0 Z" fill="${petalMain}" stroke="${petalEdge}" stroke-width="0.6" transform="rotate(${deg})"/>
        `).join('')}

        <!-- 中輪立體波浪褶皺瓣 (旋轉22.5度交疊) -->
        <g transform="rotate(22.5)">
          ${[0, 45, 90, 135, 180, 225, 270, 315].map(deg => `
            <path d="M0 0 C-8 -8 -9 -18 0 -22 C9 -18 8 -8 0 0 Z" fill="${petalInner}" stroke="${petalEdge}" stroke-width="0.6" transform="rotate(${deg})"/>
          `).join('')}
        </g>

        <!-- 內輪抱心波浪瓣 -->
        <g transform="rotate(12)">
          ${[0, 60, 120, 180, 240, 300].map(deg => `
            <ellipse cx="0" cy="-10" rx="5" ry="8" fill="#fff9c4" stroke="${petalEdge}" stroke-width="0.5" transform="rotate(${deg})"/>
          `).join('')}
        </g>

        <!-- 花心金黃密蕊叢 -->
        <circle cx="0" cy="0" r="7" fill="${centerColor}"/>
        <circle cx="0" cy="0" r="4.5" fill="#ffa000"/>
        <!-- 放射花絲小點 -->
        <circle cx="0" cy="-4" r="1.1" fill="#ffffff"/>
        <circle cx="3" cy="-2" r="1.1" fill="#ffffff"/>
        <circle cx="3" cy="2" r="1.1" fill="#ffffff"/>
        <circle cx="-3" cy="2" r="1.1" fill="#ffffff"/>
        <circle cx="-3" cy="-2" r="1.1" fill="#ffffff"/>
      </g>
    </svg>
  `;
}

// 點擊花朵互動反饋 (嚴格依循：第 1 天｜種子、第 2 天｜發芽、第 3 天｜花開)
function handleFlowerClick(type, el) {
  if (type === 'lotus-seed') {
    playChimeSound(432);
    showFloatingEffect(el, '🪷 蓮花【第 1 天｜種子】：善種深植自性心田，靜坐一日，如日初昇！');
  } else if (type === 'lotus-bud') {
    playChimeSound(480);
    showFloatingEffect(el, '🪷 蓮花【第 2 天｜發芽】：精進抽芽，秀拔花苞亭亭玉立，靜候花開！');
  } else if (type === 'lotus-bloom') {
    playChimeSound(528);
    showFloatingEffect(el, '🪷 蓮花【第 3 天｜花開】：靜中生慧，三日精進圓滿一朵盛開白粉聖蓮！');
  } else if (type === 'sunflower-sprout') {
    playChimeSound(580);
    showFloatingEffect(el, '🌻 太陽花【第 1 天｜種子嫩芽】：每日誦經，肉質松針破土生長！');
  } else if (type === 'sunflower-bud') {
    playChimeSound(640);
    showFloatingEffect(el, '🌻 太陽花【第 2 天｜發芽含苞】：誦經功深，松針簇擁金苞蓄勢！');
  } else if (type === 'sunflower-bloom') {
    playChimeSound(720);
    showFloatingEffect(el, '🌻 太陽花【第 3 天｜花開】：以經照心，佛光注照，重瓣盛開智慧光明！');
  } else {
    playChimeSound(432);
    showFloatingEffect(el, '🌸 精進花園，日日用功，自心清淨！');
  }
}

// 彈窗開啟與關閉
function openFlowerShowcaseModal() {
  const m = document.getElementById('flowerShowcaseModal');
  if (m) m.style.display = 'flex';
}

function closeFlowerShowcaseModal() {
  const m = document.getElementById('flowerShowcaseModal');
  if (m) m.style.display = 'none';
}



// 產生季節粒子特效
function generateAmbientParticles(season) {
  const container = document.getElementById('gardenAmbientParticles');
  if (!container) return;
  container.innerHTML = '';

  let emojis = ['🌸', '✨', '🍃'];
  let count = 16;

  if (season === 'autumn') {
    emojis = ['🍁', '🍂', '✨', '🌾'];
    count = 20;
  } else if (season === 'winter') {
    emojis = ['❄️', '❅', '❆', '✨'];
    count = 26;
  } else if (season === 'summer') {
    emojis = ['🌸', '🪷', '✨', '🦋'];
    count = 14;
  }

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'ambient-particle';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left = `${Math.random() * 100}vw`;
    p.style.top = `${Math.random() * -10}vh`;
    p.style.fontSize = `${14 + Math.random() * 16}px`;
    p.style.animationDuration = `${7 + Math.random() * 8}s`;
    p.style.animationDelay = `${Math.random() * 6}s`;
    p.style.opacity = `${0.4 + Math.random() * 0.5}`;
    container.appendChild(p);
  }
}

// 產生互動熱點節點
function renderHotspotNodes(hotspots) {
  const canvas = document.getElementById('gardenInteractiveCanvas');
  if (!canvas || !hotspots) return;

  canvas.innerHTML = hotspots.map(node => `
    <div class="interactive-node" style="left: ${node.x}%; top: ${node.y}%;" onclick="handleHotspotClick('${node.id}', '${node.name}', '${node.desc}', '${node.action}', this)">
      <div class="node-glow-ring"></div>
      <div class="node-badge">${node.name}</div>
      <div style="font-size: 2.2rem; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
        ${getNodeIcon(node.action)}
      </div>
    </div>
  `).join('');
}

function getNodeIcon(action) {
  if (action === 'water') return '🚰';
  if (action === 'quote') return '📜';
  if (action === 'wind') return '🎋';
  return '✨';
}

// 4. 點擊熱點交互邏輯
function handleHotspotClick(id, name, desc, action, el) {
  if (currentTool === 'water' || action === 'water') {
    playWaterSplashSound();
    showFloatingEffect(el, '💧 普施甘露法水！自性花開！+10 菩提功德');
    // 若在同修花園幫忙澆水
    if (isVisitor && visitorStudentData) {
      ZenAPI.rejoiceGarden(visitorStudentData.id);
    }
    return;
  }

  if (action === 'wind') {
    playWindChimeSound();
    showFloatingEffect(el, '🍃 清風吹竹林，一念不生，萬緣放下');
    return;
  }

  if (action === 'quote') {
    openDharmaDialog(name, desc);
    return;
  }

  // 預設彈窗詳情
  openDharmaDialog(name, desc);
}

function openDharmaDialog(title, content) {
  const modal = document.getElementById('zenDialogBackdrop');
  if (!modal) return;
  
  // 每日固定一則隨機法語（依日曆種子計算，每日一則，澄心觀照）
  const quote = (typeof getTodayQuote === 'function') ? getTodayQuote() : {
    quote: "靜則一念不生，動則萬善圓滿。人在哪裡，心就在哪裡。做任何事情都能專心，這就是定；在定中還能清楚明白，這就是慧。",
    source: "《中台月刊》・惟覺安公老和尚開示",
    category: "定慧等持",
    tag: "安住當下"
  };

  const headTitle = document.getElementById('dialogHeadTitle');
  if (headTitle) headTitle.innerHTML = `📜 惟覺安公老和尚法語開示`;

  const bodyEl = document.getElementById('dialogContentBody');
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="font-size: 1rem; line-height: 1.9; color: #2e3b35; padding: 0.4rem 0;">
        <div style="background: #fdfbf7; border: 1.5px solid #d4c5a9; border-left: 5px solid #8f6f3a; padding: 1.2rem 1.4rem; border-radius: 8px; margin-bottom: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <p style="font-size: 1.15rem; font-weight: 600; color: #2e1e0f; margin: 0 0 0.8rem 0; line-height: 1.8;">
            「${quote.quote}」
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #d5c8ab; padding-top: 0.6rem; font-size: 0.86rem; color: #785826; flex-wrap: wrap; gap: 6px;">
            <span>🏷️ <strong>修持意境：</strong>${quote.category || '自性清淨'} · ${quote.tag || '禪心'}</span>
            <span style="font-style: italic;">${quote.source || '《中台月刊》'}</span>
          </div>
        </div>
        <p style="font-size: 0.85rem; color: #556b62; margin: 0; line-height: 1.6;">
          🌸 <strong>每日法語：</strong>每日依日曆為您恭選一則老和尚法語，澄心領受，安住當下。
        </p>
      </div>
    `;
  }

  playChimeSound(432);
  modal.style.display = 'flex';
}

function closeZenDialog() {
  const modal = document.getElementById('zenDialogBackdrop');
  if (modal) modal.style.display = 'none';
}

// 5. 階段切換按鈕事件 (僅指導法師具備自由切換全部圖之最高權限)
function setupStageDockListeners() {
  document.querySelectorAll('.stage-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const adminToken = sessionStorage.getItem(API_CONFIG.storageKeys.adminSession) || 
                         sessionStorage.getItem('zen_garden_admin_token_v1') ||
                         localStorage.getItem(API_CONFIG.storageKeys.adminSession) ||
                         localStorage.getItem('zen_garden_admin_token_v1');
      const isMaster = (localStorage.getItem('zen_master_authenticated') === '1' && localStorage.getItem('zen_active_role') === 'master') && 
                       (adminToken === 'ZhongTai#2026');
      if (!isMaster) {
        alert("🔒 未到天數只能看到對應天數的圖。同學端依累積修持天數顯現對應境界，只有在登入畫面驗證通過之指導法師可自由檢閱全部圖！");
        return;
      }
      const stage = btn.dataset.stage;
      renderCurrentStage(stage);
      playChimeSound(432);
    });
  });
}

// 6. 底部道具列切換
function setupToolsDockListeners() {
  document.querySelectorAll('.dock-circle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dock-circle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
      playToolClickSound();
    });
  });
}

// 7. 同修好友抽屜切換
async function setupFriendsDrawerListeners() {
  const edgeHandle = document.getElementById('friendsEdgeHandle');
  const drawerOverlay = document.getElementById('drawerMaskOverlay');
  const closeBtn = document.getElementById('drawerCloseBtn');

  if (edgeHandle && drawerOverlay) {
    edgeHandle.addEventListener('click', () => {
      drawerOverlay.classList.add('open');
      loadFriendsDrawerList();
    });
  }

  if (closeBtn && drawerOverlay) {
    closeBtn.addEventListener('click', () => {
      drawerOverlay.classList.remove('open');
    });
  }

  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', (e) => {
      if (e.target === drawerOverlay) drawerOverlay.classList.remove('open');
    });
  }

  document.querySelectorAll('.filter-btn-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadFriendsDrawerList(btn.dataset.class);
    });
  });
}

async function loadFriendsDrawerList(classFilter = '') {
  const scrollList = document.getElementById('friendsScrollList');
  if (!scrollList) return;
  scrollList.innerHTML = '<div style="text-align:center; padding:1.5rem; color:#888;">連線蓮池海會名錄……</div>';

  const res = await ZenAPI.getPublicGardens(classFilter);
  if (res.success && res.gardens && res.gardens.length > 0) {
    scrollList.innerHTML = res.gardens.map(g => `
      <div class="friend-item-row">
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <div class="friend-avatar-gem">🪷</div>
          <div class="friend-meta-col">
            <span class="friend-dharma-lbl">${g.dharma_name || '精進同修'}</span>
            <span class="friend-sub-lbl">${g.class_type} ｜ 修持 ${g.total_checkins} 天</span>
          </div>
        </div>
        <button class="btn-go-visit" onclick="visitFriendGarden(${g.id})">
          進入花園
        </button>
      </div>
    `).join('');
  } else {
    scrollList.innerHTML = '<div style="text-align:center; padding:1.5rem; color:#888;">尚無學員資料</div>';
  }
}

function visitFriendGarden(studentId) {
  const params = new URLSearchParams(window.location.search);
  const adminToken = sessionStorage.getItem(API_CONFIG.storageKeys.adminSession) || sessionStorage.getItem('zen_garden_admin_token_v1');
  const isAdmin = (params.get('admin') === '1' || localStorage.getItem('zen_master_authenticated') === '1') && adminToken === 'ZhongTai#2026';
  if (isAdmin) {
    window.location.href = `garden2d.html?admin=1&visitor=1&id=${studentId}`;
  } else {
    window.location.href = `garden2d.html?visitor=1&id=${studentId}`;
  }
}

function returnToMyGarden() {
  const params = new URLSearchParams(window.location.search);
  const adminToken = sessionStorage.getItem(API_CONFIG.storageKeys.adminSession) || sessionStorage.getItem('zen_garden_admin_token_v1');
  const isAdmin = (params.get('admin') === '1' || localStorage.getItem('zen_master_authenticated') === '1') && adminToken === 'ZhongTai#2026';
  if (isAdmin) {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'garden2d.html';
  }
}

// 8. 每日老和尚開示跑馬燈
function setupDailyBroadcast() {
  const txt = document.getElementById('dharmaBroadcastText');
  const quote = getTodayQuote();
  if (txt && quote) {
    txt.textContent = `惟覺老和尚開示：${quote.quote}`;
  }
}

// 9. Web Audio API 音效合成
function playWaterSplashSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600 + Math.random() * 400, now + i * 0.08);
      gain.gain.setValueAtTime(0.08, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.13);
    }
  } catch (e) {}
}

function playWindChimeSound() {
  playChimeSound(680);
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
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 2.5);
  } catch (e) {}
}

function playToolClickSound() {
  playChimeSound(560);
}

// 10. 飄浮功德特效動畫
function showFloatingEffect(targetEl, text) {
  if (!targetEl) return;
  const rect = targetEl.getBoundingClientRect();
  const notice = document.createElement('div');
  notice.style.position = 'fixed';
  notice.style.left = `${rect.left + rect.width / 2}px`;
  notice.style.top = `${rect.top - 15}px`;
  notice.style.transform = 'translateX(-50%)';
  notice.style.background = 'rgba(255, 255, 255, 0.95)';
  notice.style.border = '1.5px solid #43a047';
  notice.style.borderRadius = '9999px';
  notice.style.padding = '5px 14px';
  notice.style.color = '#1b5e20';
  notice.style.fontWeight = 'bold';
  notice.style.fontSize = '0.88rem';
  notice.style.boxShadow = '0 6px 18px rgba(0,0,0,0.25)';
  notice.style.zIndex = '999';
  notice.style.pointerEvents = 'none';
  notice.style.transition = 'all 1.4s ease-out';
  notice.textContent = text;
  document.body.appendChild(notice);

  setTimeout(() => {
    notice.style.top = `${rect.top - 60}px`;
    notice.style.opacity = '0';
  }, 40);

  setTimeout(() => notice.remove(), 1500);
}

// 登出系統 (若為指導法師退出管理權限並鎖定 admin.html，若為學員清除登入並返回 index.html)
function handle2DLogout() {
  const params = new URLSearchParams(window.location.search);
  const adminToken = sessionStorage.getItem(API_CONFIG.storageKeys.adminSession) || 
                     sessionStorage.getItem('zen_garden_admin_token_v1') ||
                     localStorage.getItem(API_CONFIG.storageKeys.adminSession) ||
                     localStorage.getItem('zen_garden_admin_token_v1');
  const isAdmin = (params.get('admin') === '1') || 
                  localStorage.getItem('zen_master_authenticated') === '1' ||
                  localStorage.getItem('zen_active_role') === 'master' ||
                  adminToken === 'ZhongTai#2026';

  if (isAdmin) {
    if (confirm("確定要退出指導法師管理後台嗎？\n退出後將鎖定後台，需重新輸入管理密碼。")) {
      localStorage.removeItem('zen_master_authenticated');
      localStorage.removeItem('zen_active_role');
      localStorage.removeItem(API_CONFIG.storageKeys.adminSession);
      localStorage.removeItem('zen_garden_admin_token_v1');
      sessionStorage.removeItem(API_CONFIG.storageKeys.adminSession);
      sessionStorage.removeItem('zen_garden_admin_token_v1');
      sessionStorage.removeItem('zen_garden_admin_session_v1');
      localStorage.setItem('zen_logged_out', '1');
      sessionStorage.setItem('zen_logged_out', '1');
      window.location.href = 'admin.html';
    }
  } else {
    if (confirm("確定要登出嗎？\n您的修持打卡與花園資料皆已妥善保存。")) {
      localStorage.removeItem('zen_garden_logged_student_v2');
      localStorage.removeItem(API_CONFIG.storageKeys.currentStudent);
      sessionStorage.setItem('zen_logged_out', '1');
      window.location.href = 'index.html';
    }
  }
}
