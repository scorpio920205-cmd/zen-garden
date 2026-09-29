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

// 當前修行生長階段與季節設定
const STAGE_CONFIGS = {
  1: {
    id: 1,
    name: "第 1 天｜種子",
    subtext: "剛開始，只有一小片土地，善法種子深植心田",
    bg: "assets/images/stage_1_seed.jpg",
    season: "spring",
    hotspots: [
      { id: "seed_plot", x: 50, y: 55, name: "🌱 善法福田", desc: "剛開闢的一小片土地，金色種子深植心田。每日定課即是澆灌甘露。", action: "water" },
      { id: "seed_sign", x: 67, y: 46, name: "📜 初發心木牌", desc: "「初發心即成正覺。」莫忘初發清淨願心。", action: "quote" },
      { id: "seed_steps", x: 50, y: 80, name: "🪜 精進階梯", desc: "千里之行，始於足下。持之以恆，自性花開。", action: "chime" }
    ]
  },
  2: {
    id: 2,
    name: "第 2 天｜發芽",
    subtext: "破土萌生新綠，春風和暢，定課滋養幼芽",
    bg: "assets/images/stage_2_sprout.jpg",
    season: "spring",
    hotspots: [
      { id: "sprout_center", x: 50, y: 48, name: "🌿 菩提新芽", desc: "破土而出的小嫩芽！觀照自心，不隨妄念馳逐。", action: "water" },
      { id: "sprout_sign", x: 50, y: 17, name: "📜 修持指引牌", desc: "老和尚開示：人在哪裡，心就在哪裡。做任何事都能專心。", action: "quote" },
      { id: "sprout_border", x: 25, y: 42, name: "🌼 緣起花籬", desc: "日高、夜高同修互相護念，共發清淨長遠心。", action: "chime" }
    ]
  },
  3: {
    id: 3,
    name: "第 3 天｜花開",
    subtext: "繁花盛綻，清芬怡人，休閒歇心亭，蝴蝶飛舞",
    bg: "assets/images/stage_3_bloom.jpg",
    season: "summer",
    hotspots: [
      { id: "bloom_patio", x: 23, y: 39, name: "⛱️ 歇心小憩亭", desc: "洋傘木桌椅：身心放下，歇即菩提。在動靜之中安住正念。", action: "chime" },
      { id: "bloom_center", x: 52, y: 39, name: "🌸 忍辱紫菊叢", desc: "對人以和，忍辱波羅蜜。繁花盛開，功德芬芳。", action: "water" },
      { id: "bloom_bottom", x: 54, y: 77, name: "🌼 清淨白菊圃", desc: "深入經藏，心如明鏡。誦金剛經、心經圓滿此花圃。", action: "water" },
      { id: "bloom_left", x: 19, y: 68, name: "🪷 智慧蓮花池", desc: "出淤泥而不染，靜坐調心，自性蓮開。", action: "water" }
    ]
  },
  4: {
    id: 4,
    name: "持續用功｜成林",
    subtext: "除了花，出現樹、池塘、石頭、竹林、禪茶亭",
    bg: "assets/images/stage_4_forest.jpg",
    season: "summer",
    hotspots: [
      { id: "forest_bamboo", x: 18, y: 45, name: "🎋 幽篁竹林", desc: "深綠竹林：虛心有節，身心清寂。清風拂過，動靜一如。", action: "wind" },
      { id: "forest_tree", x: 74, y: 28, name: "🌳 參天菩提樹", desc: "古樹如傘，普蔭群生。掛滿自性智慧心燈，功德廣大。", action: "chime" },
      { id: "forest_pond", x: 67, y: 65, name: "💧 澄澈清淨池", desc: "池塘荷花、踏水石階：水面澄澈如明鏡，照見萬相了了分明。", action: "water" },
      { id: "forest_rocks", x: 41, y: 55, name: "🪨 禪風苔石", desc: "如石不動，定力現前。八風吹不動，端坐紫金蓮。", action: "chime" },
      { id: "forest_gazebo", x: 88, y: 55, name: "🏯 禪茶清涼亭", desc: "品一盞清茶，聽十方梵音。無事在心，便是世間清涼客。", action: "quote" }
    ]
  },
  "autumn": {
    id: "autumn",
    name: "四季｜秋收",
    subtext: "金紅楓樹，銀杏飄落，秋菊南瓜，普皆迴向",
    bg: "assets/images/season_autumn.jpg",
    season: "autumn",
    hotspots: [
      { id: "autumn_maple", x: 38, y: 50, name: "🍁 丹楓滿山", desc: "秋收功德：行一切善法，心中無住。願以此功德，普及於一切。", action: "chime" },
      { id: "autumn_pond", x: 50, y: 52, name: "💧 倒影金秋池", desc: "池水如鏡，映照漫天紅葉。生生不息，因果圓滿。", action: "water" },
      { id: "autumn_gazebo", x: 75, y: 38, name: "🏮 晚霞梵宇亭", desc: "老和尚開示：修福修慧，動則萬善圓滿，靜則一念不生。", action: "quote" }
    ]
  },
  "winter": {
    id: "winter",
    name: "四季｜冬藏",
    subtext: "純白靜雪，積雪竹林，池塘成冰，一念清涼",
    bg: "assets/images/season_winter.jpg",
    season: "winter",
    hotspots: [
      { id: "winter_snow", x: 35, y: 60, name: "❄️ 萬里純白雪", desc: "冬藏安住：大雪無痕，心地空寂。一塵不染，本來清淨。", action: "chime" },
      { id: "winter_bamboo", x: 80, y: 40, name: "🎋 霜雪青竹林", desc: "雪落修竹，翠色猶存。正如修行者堅韌不退轉之菩提心。", action: "wind" },
      { id: "winter_lantern", x: 57, y: 38, name: "🏮 暖光雪亭", desc: "點亮自性心燈，驅散三界昏暗。老和尚慈悲法語溫暖十方。", action: "quote" }
    ]
  }
};

let currentStageKey = 1;
let currentTool = "select";
let isVisitor = false;
let visitorStudentData = null;
let audioCtx = null;

document.addEventListener('DOMContentLoaded', () => {
  determineInitialStage();
  setupURLQuery();
  renderCurrentStage(currentStageKey);
  setupStageDockListeners();
  setupToolsDockListeners();
  setupFriendsDrawerListeners();
  setupDailyBroadcast();
});

// 1. 依據學員歷史打卡天數自動判定生長階段
function determineInitialStage() {
  const currentStudentStr = localStorage.getItem(API_CONFIG.storageKeys.currentStudent);
  if (currentStudentStr) {
    try {
      const s = JSON.parse(currentStudentStr);
      const days = s.total_checkins || 1;
      if (days >= 4) currentStageKey = 4; // 持續用功｜成林
      else if (days === 3) currentStageKey = 3; // 第 3 天｜花開
      else if (days === 2) currentStageKey = 2; // 第 2 天｜發芽
      else currentStageKey = 1; // 第 1 天｜種子
    } catch (e) {
      currentStageKey = 1;
    }
  } else {
    // 預設示範：第 1 天｜種子
    currentStageKey = 1;
  }
}

// 2. 讀取 URL 參數 (判定是否為「參觀他人花園」模式)
async function setupURLQuery() {
  const params = new URLSearchParams(window.location.search);
  const isVisitorParam = params.get('visitor') === '1';
  const studentId = params.get('id');

  const nameEl = document.getElementById('hudUserDharma');
  const classEl = document.getElementById('hudUserClass');
  const daysEl = document.getElementById('hudDaysNum');
  const visitIndicator = document.getElementById('visitingFriendIndicator');

  if (isVisitorParam && studentId) {
    // 參觀他人花園模式 (嚴格隱私保護：僅公開班級與法名)
    isVisitor = true;
    const res = await ZenAPI.getVisitedGardenDetail(studentId);
    if (res.success && res.garden) {
      visitorStudentData = res.garden;
      nameEl.textContent = `${visitorStudentData.dharma_name} 的花園`;
      classEl.textContent = visitorStudentData.class_type;

      const days = visitorStudentData.total_checkins || 1;
      daysEl.textContent = days;

      // 依該同修精進天數切換其花園面貌
      if (days >= 4) currentStageKey = 4;
      else if (days === 3) currentStageKey = 3;
      else if (days === 2) currentStageKey = 2;
      else currentStageKey = 1;

      if (visitIndicator) {
        visitIndicator.style.display = 'flex';
        document.getElementById('visitingFriendTitle').textContent = `正在參觀：【${visitorStudentData.class_type}】${visitorStudentData.dharma_name} 的精進花園`;
      }

      renderCurrentStage(currentStageKey);
      return;
    }
  }

  // 預設本人花園模式
  isVisitor = false;
  if (visitIndicator) visitIndicator.style.display = 'none';

  const currentStudentStr = localStorage.getItem('zen_garden_logged_student_v2') || localStorage.getItem(API_CONFIG.storageKeys.currentStudent);
  if (currentStudentStr) {
    try {
      const s = JSON.parse(currentStudentStr);
      nameEl.textContent = s.dharma_name ? `${s.dharma_name} 的花園` : (s.real_name ? `${s.real_name} 的花園` : '我的花園');
      classEl.textContent = s.class_type ? `${s.class_type} ${s.group_name || ''}` : '日高';
      const checkinCount = s.total_checkins || 0;
      daysEl.textContent = Math.max(1, checkinCount);

      // 動態更新累積菩提功德金與可用甘露法水
      const meritEl = document.getElementById('hudMeritPoints');
      if (meritEl) meritEl.textContent = checkinCount * 100 + (s.total_meditation_mins || 0);
      const dewEl = document.getElementById('hudDewDrops');
      if (dewEl) dewEl.textContent = Math.max(3, checkinCount * 2);

      // 依學員實際修持天數自動切換花園生長境界
      if (checkinCount >= 10) currentStageKey = 4;
      else if (checkinCount >= 4) currentStageKey = 3;
      else if (checkinCount >= 2) currentStageKey = 2;
      else currentStageKey = 1;

    } catch (e) {}
  } else {
    nameEl.textContent = '傳心 的花園';
    classEl.textContent = '日高';
    daysEl.textContent = '1';
  }
}

// 3. 渲染背景、特效粒子與互動熱點
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
  document.getElementById('dialogHeadTitle').innerHTML = `🪷 ${title}`;
  document.getElementById('dialogContentBody').innerHTML = `
    <div style="font-size: 1rem; line-height: 2; color: #2e3b35;">
      <p style="margin-bottom: 0.8rem;">${content}</p>
      <div style="background: #f1f8e9; border-left: 4px solid var(--pine-green); padding: 0.8rem 1rem; border-radius: 6px; font-size: 0.92rem; color: #33691e;">
        <strong>惟覺安公老和尚開示：</strong><br>
        「精進如流水，不舍晝夜。滴水穿石，不是水的力量大，而是水的恆常。修行就是要日日精進、持之以恆。」
      </div>
    </div>
  `;
  modal.style.display = 'flex';
}

function closeZenDialog() {
  const modal = document.getElementById('zenDialogBackdrop');
  if (modal) modal.style.display = 'none';
}

// 5. 階段切換按鈕事件
function setupStageDockListeners() {
  document.querySelectorAll('.stage-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
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
            <span class="friend-dharma-lbl">${g.dharma_name}</span>
            <span class="friend-sub-lbl">${g.class_type} ｜ 修持 ${g.total_checkins} 天</span>
          </div>
        </div>
        <button class="btn-go-visit" onclick="visitFriendGarden(${g.id})">
          進入花園
        </button>
      </div>
    `).join('');
  } else {
    scrollList.innerHTML = '<div style="text-align:center; padding:1.5rem; color:#888;">尚無同修資料</div>';
  }
}

function visitFriendGarden(studentId) {
  window.location.href = `garden2d.html?visitor=1&id=${studentId}`;
}

function returnToMyGarden() {
  window.location.href = 'garden2d.html';
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

// 登出系統 (返回登入畫面)
function handle2DLogout() {
  if (confirm("確定要登出嗎？\n您的修持打卡與花園資料皆已妥善保存。")) {
    localStorage.removeItem('zen_garden_logged_student_v2');
    localStorage.removeItem(API_CONFIG.storageKeys.currentStudent);
    window.location.href = 'index.html';
  }
}
