/**
 * ═══════════════════════════════════════════════════════════════
 * 般若智慧卡 · 菩提收集冊前端控制器 (Collection & Gacha Controller)
 * ═══════════════════════════════════════════════════════════════
 */

let activeCollectionFilter = 'ALL';
let currentGachaDrawnCard = null;

// 取得當前學員收集進度存檔 Key
function getCollectionStorageKey() {
  const sNo = (window.currentStudent && window.currentStudent.student_no) 
    ? window.currentStudent.student_no 
    : 'guest';
  return `zen_cards_col_${sNo}`;
}

// 讀取當前學員收集狀態
function loadStudentCollectionData() {
  const key = getCollectionStorageKey();
  let data = null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) data = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse collection data", e);
  }

  if (!data) {
    data = {
      collectedIds: [],
      cardCounts: {},
      drawsUsed: 0,
      initialBonus: 5, // 一開始登入免費贈送 5 張
      initialClaimed: true,
      pityCounter: 0
    };
    saveStudentCollectionData(data);
  } else if (!data.initialClaimed) {
    data.initialBonus = 5;
    data.initialClaimed = true;
    saveStudentCollectionData(data);
  }

  return data;
}

// 儲存收集狀態
function saveStudentCollectionData(data) {
  const key = getCollectionStorageKey();
  localStorage.setItem(key, JSON.stringify(data));
}

// 計算剩餘抽卡次數 (迎新禮 5 張 + 花園每開 1 朵花得 1 張 - 已使用抽卡次數)
function getAvailableDrawCount() {
  const colData = loadStudentCollectionData();
  const flowerCount = (window.currentStudent && window.currentStudent.total_checkins) 
    ? window.currentStudent.total_checkins 
    : 0;
  
  const totalEarned = (colData.initialBonus || 5) + flowerCount;
  const remaining = Math.max(0, totalEarned - (colData.drawsUsed || 0));
  return {
    remaining: remaining,
    totalEarned: totalEarned,
    drawsUsed: colData.drawsUsed || 0,
    flowers: flowerCount,
    initialBonus: colData.initialBonus || 5
  };
}

// 切換主頁籤：精進花園打卡 VS 般若收集冊
function switchMainTab(tab) {
  const gardenTabBtn = document.getElementById('tabBtnGarden');
  const collectionTabBtn = document.getElementById('tabBtnCollection');
  const gardenContent = document.getElementById('tabContentGarden');
  const collectionContent = document.getElementById('tabContentCollection');

  if (tab === 'collection') {
    if (gardenTabBtn) gardenTabBtn.classList.remove('active');
    if (collectionTabBtn) collectionTabBtn.classList.add('active');
    if (gardenContent) gardenContent.style.display = 'none';
    if (collectionContent) collectionContent.style.display = 'block';

    renderCollectionUI();
  } else {
    if (gardenTabBtn) gardenTabBtn.classList.add('active');
    if (collectionTabBtn) collectionTabBtn.classList.remove('active');
    if (gardenContent) gardenContent.style.display = 'block';
    if (collectionContent) collectionContent.style.display = 'none';
  }
}

// 渲染收集冊頂部看板、進度條與統計
function renderCollectionUI() {
  const colData = loadStudentCollectionData();
  const drawInfo = getAvailableDrawCount();
  const totalCards = DHARMA_CARDS_CONFIG.totalCards;
  const collectedCount = colData.collectedIds.length;
  const percent = Math.round((collectedCount / totalCards) * 100);

  // 頂部進度條
  const fillEl = document.getElementById('colProgressFill');
  const statsEl = document.getElementById('colProgressStats');
  const badgeEl = document.getElementById('navCardBadge');
  const navBtnCount = document.getElementById('navCollectionBtnCount');
  const ticketBadge = document.getElementById('colTicketBadge');
  const btnGacha = document.getElementById('btnStartGacha');

  if (fillEl) fillEl.style.width = `${percent}%`;
  if (statsEl) {
    statsEl.innerHTML = `已收集 <strong>${collectedCount}</strong> / ${totalCards} <span style="opacity:0.85">(${percent}%)</span>`;
  }
  if (badgeEl) badgeEl.textContent = `${collectedCount}/${totalCards}`;
  if (navBtnCount) navBtnCount.textContent = `${collectedCount}/${totalCards}`;

  if (ticketBadge) {
    ticketBadge.innerHTML = `🎴 剩餘抽卡機會：<strong style="color: #b45309; font-size: 1.05rem;">${drawInfo.remaining}</strong> 次 <small style="color: #64748b;">(花園花朵: ${drawInfo.flowers} + 迎新禮: ${drawInfo.initialBonus})</small>`;
  }

  if (btnGacha) {
    if (drawInfo.remaining > 0) {
      btnGacha.disabled = false;
      btnGacha.innerHTML = `<span>✨</span> 恭請今日法語（剩餘 ${drawInfo.remaining} 次）`;
    } else {
      btnGacha.disabled = false; // 允許點擊看說明
      btnGacha.innerHTML = `<span>🪷</span> 今日次數已用畢 · 修持開花得次數`;
    }
  }

  // 渲染稀有度頁籤數量
  renderRarityTabs(colData);

  // 渲染卡牌宮格
  renderCardsGrid(colData);
}

// 渲染稀有度過濾標籤列
function renderRarityTabs(colData) {
  const tabsWrap = document.getElementById('rarityTabsRow');
  if (!tabsWrap) return;

  const rarities = ['ALL', 'R', 'SR', 'SSR', 'UR', 'USR'];
  const labels = {
    ALL: '全部',
    R: 'R (普通)',
    SR: 'SR (稀有)',
    SSR: 'SSR (超稀有)',
    UR: 'UR (極稀有)',
    USR: 'USR (萬德)'
  };

  let html = '';
  rarities.forEach(r => {
    let count = 0;
    let total = 0;
    if (r === 'ALL') {
      count = colData.collectedIds.length;
      total = DHARMA_CARDS_CONFIG.totalCards;
    } else {
      const list = DHARMA_CARDS_BY_RARITY[r] || [];
      total = list.length;
      count = list.filter(c => colData.collectedIds.includes(c.id)).length;
    }

    const isActive = activeCollectionFilter === r ? 'active' : '';
    html += `
      <button type="button" class="rarity-pill-btn ${isActive}" data-rarity="${r}" onclick="setCollectionFilter('${r}')">
        <span>${labels[r]}</span>
        <span class="rarity-pill-count">${count}/${total}</span>
      </button>
    `;
  });

  tabsWrap.innerHTML = html;
}

// 設定當前過濾稀有度
function setCollectionFilter(r) {
  activeCollectionFilter = r;
  const colData = loadStudentCollectionData();
  renderRarityTabs(colData);
  renderCardsGrid(colData);
}

// 渲染卡牌宮格
function renderCardsGrid(colData) {
  const grid = document.getElementById('dharmaCardsGrid');
  if (!grid) return;

  let cardsToShow = DHARMA_CARDS_LIST;
  if (activeCollectionFilter !== 'ALL') {
    cardsToShow = DHARMA_CARDS_BY_RARITY[activeCollectionFilter] || [];
  }

  let html = '';
  cardsToShow.forEach(card => {
    const isCollected = colData.collectedIds.includes(card.id);
    const copies = colData.cardCounts[card.id] || 0;
    const meta = DHARMA_CARDS_CONFIG.rarityMeta[card.rarity] || {};

    if (isCollected) {
      // 已解鎖明卡
      html += `
        <div class="dharma-card-item" onclick="openCardDetailModal('${card.id}')" title="點擊查看法語詳情">
          <div class="dharma-card-unlocked tier-${card.rarity}">
            <div class="unlocked-header">
              <span class="unlocked-no">No.${card.id}</span>
              <span class="rarity-badge-pill ${meta.badgeClass}">${card.rarity}</span>
            </div>
            <div class="unlocked-body">
              <div class="unlocked-title">${card.title}</div>
              <div class="unlocked-quote-snippet">「${card.quote}」</div>
            </div>
            <div class="unlocked-footer">${card.source}</div>
            ${copies > 1 ? `<div class="card-copies-badge">×${copies}</div>` : ''}
          </div>
        </div>
      `;
    } else {
      // 未解鎖暗卡 (卡背圖檔 assets/cards/card_back_xxx.png)
      const backImg = meta.cardBack || 'assets/cards/card_back_r.png';
      html += `
        <div class="dharma-card-item" onclick="handleLockedCardClick('${card.id}', '${card.rarity}')" title="未解鎖法語卡">
          <div class="dharma-card-locked" style="background-image: url('${backImg}');">
            <div class="locked-card-overlay">
              <div class="locked-header-row">
                <span class="locked-card-no">No.${card.id}</span>
                <span class="rarity-badge-pill ${meta.badgeClass}" style="opacity: 0.85;">${card.rarity}</span>
              </div>
              <div class="locked-center-badge">🔒</div>
              <div class="locked-card-footer">修持解鎖</div>
            </div>
          </div>
        </div>
      `;
    }
  });

  grid.innerHTML = html;
}

// 點擊未解鎖卡片提示
function handleLockedCardClick(id, rarity) {
  alert(`【No.${id} · ${rarity} 法語卡】\n\n此卡尚未解鎖。花園每開出一朵花（每日修持打卡），即可獲得 1 次抽卡機會！`);
}

// 開啟卡牌詳情 Modal (純粹觀照：無分享與迴向按鈕)
function openCardDetailModal(cardId) {
  const card = DHARMA_CARDS_MAP[cardId];
  if (!card) return;

  const modal = document.getElementById('cardDetailModal');
  const titleEl = document.getElementById('detailCardTitle');
  const noEl = document.getElementById('detailCardNo');
  const badgeEl = document.getElementById('detailCardBadge');
  const quoteEl = document.getElementById('detailCardQuote');
  const sourceEl = document.getElementById('detailCardSource');
  const insightEl = document.getElementById('detailCardInsight');

  const meta = DHARMA_CARDS_CONFIG.rarityMeta[card.rarity] || {};

  if (titleEl) titleEl.textContent = card.title;
  if (noEl) noEl.textContent = `No.${card.id}`;
  if (badgeEl) {
    badgeEl.textContent = `${card.rarity} · ${meta.name || ''}`;
    badgeEl.className = `rarity-badge-pill ${meta.badgeClass}`;
  }
  if (quoteEl) quoteEl.textContent = `「${card.quote}」`;
  if (sourceEl) sourceEl.textContent = `—— ${card.source}`;
  if (insightEl) insightEl.textContent = card.insight;

  if (modal) modal.style.display = 'flex';
}

function closeCardDetailModal() {
  const modal = document.getElementById('cardDetailModal');
  if (modal) modal.style.display = 'none';
}

// ════ 抽卡核心互動 (Gacha Experience) ════
function openGachaDrawModal() {
  const drawInfo = getAvailableDrawCount();
  if (drawInfo.remaining <= 0) {
    alert("【抽卡次數已用畢】\n\n花園每開出一朵花即可獲得 1 次法語抽卡機會！\n請先完成每日修持打卡，長出蓮花與太陽花後即可繼續抽卡。");
    return;
  }

  const modal = document.getElementById('gachaModal');
  const initStage = document.getElementById('gachaInitialStage');
  const revealStage = document.getElementById('gachaRevealStage');
  const btnDoDraw = document.getElementById('btnDoGachaDraw');
  const btnCollectDone = document.getElementById('btnGachaCollectDone');

  if (initStage) initStage.style.display = 'block';
  if (revealStage) revealStage.style.display = 'none';
  if (btnDoDraw) {
    btnDoDraw.style.display = 'inline-flex';
    btnDoDraw.innerHTML = `<span>✨</span> 以心印心 · 開啟法語寶匣（剩餘 ${drawInfo.remaining} 次）`;
  }
  if (btnCollectDone) btnCollectDone.style.display = 'none';

  if (modal) modal.style.display = 'flex';
}

function closeGachaModal() {
  const modal = document.getElementById('gachaModal');
  if (modal) modal.style.display = 'none';
  renderCollectionUI();
}

// 執行單次抽取
function executeGachaDraw() {
  const drawInfo = getAvailableDrawCount();
  if (drawInfo.remaining <= 0) {
    alert("剩餘抽卡次數不足！請先進行每日修持打卡。");
    return;
  }

  const colData = loadStudentCollectionData();

  // 1. 保底判定 (連續 15 抽未獲得 SSR+，第 16 抽必出 SSR 以上)
  let targetRarity = 'R';
  if ((colData.pityCounter || 0) >= DHARMA_CARDS_CONFIG.pityLimit) {
    // 強制從 SSR (70%), UR (25%), USR (5%) 掉落
    const pityRoll = Math.random();
    if (pityRoll < 0.05) targetRarity = 'USR';
    else if (pityRoll < 0.30) targetRarity = 'UR';
    else targetRarity = 'SSR';
  } else {
    // 依設定機率 roll
    const roll = Math.random();
    if (roll < DHARMA_CARDS_CONFIG.rates.USR) {
      targetRarity = 'USR';
    } else if (roll < DHARMA_CARDS_CONFIG.rates.USR + DHARMA_CARDS_CONFIG.rates.UR) {
      targetRarity = 'UR';
    } else if (roll < DHARMA_CARDS_CONFIG.rates.USR + DHARMA_CARDS_CONFIG.rates.UR + DHARMA_CARDS_CONFIG.rates.SSR) {
      targetRarity = 'SSR';
    } else if (roll < DHARMA_CARDS_CONFIG.rates.USR + DHARMA_CARDS_CONFIG.rates.UR + DHARMA_CARDS_CONFIG.rates.SSR + DHARMA_CARDS_CONFIG.rates.SR) {
      targetRarity = 'SR';
    } else {
      targetRarity = 'R';
    }
  }

  // 2. 從該稀有度中隨機選出 1 張
  const pool = DHARMA_CARDS_BY_RARITY[targetRarity] || DHARMA_CARDS_BY_RARITY.R;
  const pickedCard = pool[Math.floor(Math.random() * pool.length)];

  // 3. 更新存檔狀態
  colData.drawsUsed = (colData.drawsUsed || 0) + 1;
  const isNewCard = !colData.collectedIds.includes(pickedCard.id);
  if (isNewCard) {
    colData.collectedIds.push(pickedCard.id);
  }
  colData.cardCounts[pickedCard.id] = (colData.cardCounts[pickedCard.id] || 0) + 1;

  // 更新保底計數
  if (['SSR', 'UR', 'USR'].includes(targetRarity)) {
    colData.pityCounter = 0;
  } else {
    colData.pityCounter = (colData.pityCounter || 0) + 1;
  }

  saveStudentCollectionData(colData);
  currentGachaDrawnCard = pickedCard;

  // 4. 動態展示翻牌
  displayGachaCardReveal(pickedCard, isNewCard);
}

// 展現翻牌動畫
function displayGachaCardReveal(card, isNew) {
  const initStage = document.getElementById('gachaInitialStage');
  const revealStage = document.getElementById('gachaRevealStage');
  const revealCard = document.getElementById('gachaRevealCard');
  const frontEl = document.getElementById('gachaCardFront');
  const backEl = document.getElementById('gachaCardBack');
  const btnDoDraw = document.getElementById('btnDoGachaDraw');
  const btnCollectDone = document.getElementById('btnGachaCollectDone');

  const meta = DHARMA_CARDS_CONFIG.rarityMeta[card.rarity] || {};

  if (initStage) initStage.style.display = 'none';
  if (revealStage) revealStage.style.display = 'block';

  // 設定卡背
  if (backEl) {
    backEl.style.backgroundImage = `url('${meta.cardBack || 'assets/cards/card_back_r.png'}')`;
  }

  // 設定卡面
  if (frontEl) {
    frontEl.className = `gacha-card-side gacha-card-front dharma-card-unlocked tier-${card.rarity}`;
    frontEl.innerHTML = `
      <div style="text-align: center;">
        ${isNew ? '<span class="gacha-new-tag">✨ 首次解鎖新法語</span>' : '<span style="font-size:0.75rem; color:#64748b; font-weight:700;">🪷 再次相應</span>'}
      </div>
      <div class="unlocked-header" style="margin-top: 4px;">
        <span class="unlocked-no">No.${card.id}</span>
        <span class="rarity-badge-pill ${meta.badgeClass}">${card.rarity}</span>
      </div>
      <div class="unlocked-body" style="padding: 10px 4px;">
        <div class="unlocked-title" style="font-size: 1.05rem;">${card.title}</div>
        <div class="unlocked-quote-snippet" style="font-size: 0.88rem; line-height: 1.55; margin-top: 8px;">「${card.quote}」</div>
      </div>
      <div class="unlocked-footer" style="font-size: 0.76rem; color: #b45309; font-weight: 600;">${card.source}</div>
    `;
  }

  if (revealCard) {
    revealCard.classList.remove('flipped');
    setTimeout(() => {
      revealCard.classList.add('flipped');
    }, 150);
  }

  const remaining = getAvailableDrawCount().remaining;
  if (btnDoDraw) {
    if (remaining > 0) {
      btnDoDraw.style.display = 'inline-flex';
      btnDoDraw.innerHTML = `<span>✨</span> 繼續抽卡（剩餘 ${remaining} 次）`;
    } else {
      btnDoDraw.style.display = 'none';
    }
  }
  if (btnCollectDone) {
    btnCollectDone.style.display = 'inline-flex';
  }
}

// 開啟機率公告 Modal
function openRatesModal() {
  const modal = document.getElementById('ratesModal');
  if (modal) modal.style.display = 'flex';
}

function closeRatesModal() {
  const modal = document.getElementById('ratesModal');
  if (modal) modal.style.display = 'none';
}

// 頁面載入或切換身分時初始化
window.addEventListener('DOMContentLoaded', () => {
  // 初次登入贈送 5 抽檢查
  loadStudentCollectionData();
});
