const fs = require('fs');
const path = require('path');

const mdPath = path.resolve(__dirname, '..', 'docs', '般若智慧卡_70張法語總表.md');
const text = fs.readFileSync(mdPath, 'utf8');

// Match sections like:
// ### No.001【見自本心 · 即心是佛】
// * **卡別**：`USR`
// * **出處**：《中台月刊》...
// * **法語經句**： ...
// * **白話提撕**： ...
const cardBlocks = text.split(/(?=### No\.\d+)/g).filter(b => b.startsWith('### No.'));

const cards = [];

cardBlocks.forEach(block => {
  const titleMatch = block.match(/### No\.(\d+)【(.*?)】/);
  const rarityMatch = block.match(/\*\*卡別\*\*[：:]\s*`?([A-Za-z]+)`?/);
  const sourceMatch = block.match(/\*\*出處\*\*[：:]\s*(.*?)(?=\r?\n)/);
  const quoteMatch = block.match(/\*\*法語經句\*\*[：:]\s*(?:>)?\s*[\r\n\s]*([「"『]?[\s\S]*?[」"』]?)(?=\r?\n\*\s*\*\*白話提撕\*\*)/);
  const insightMatch = block.match(/\*\*白話提撕\*\*[：:]\s*([\s\S]*?)(?=\r?\n\r?\n|$)/);

  if (titleMatch && rarityMatch && sourceMatch) {
    const id = titleMatch[1];
    const title = titleMatch[2].trim();
    const rarity = rarityMatch[1].trim().toUpperCase();
    const source = sourceMatch[1].trim();

    let rawQuote = quoteMatch ? quoteMatch[1].trim() : '';
    rawQuote = rawQuote.replace(/^>\s*/gm, '').replace(/[「」"『』]/g, '').trim();

    let rawInsight = insightMatch ? insightMatch[1].trim() : '';
    rawInsight = rawInsight.replace(/^>\s*/gm, '').trim();

    cards.push({
      id: id,
      num: parseInt(id, 10),
      title: title,
      rarity: rarity,
      source: source,
      quote: rawQuote,
      insight: rawInsight
    });
  }
});

console.log('Parsed cards count:', cards.length);

const outContent = `/**
 * ═══════════════════════════════════════════════════════════════
 * 般若智慧卡 · 第一彈【靈泉月現】70 張全法語資料庫
 * 規範對照：01.png (USR: 2, UR: 3, SSR: 5, SR: 15, R: 45 = 70張)
 * 來源：惟覺安公老和尚《中台月刊》開示、《金剛經》、《藥師經》、《普門品》
 * ═══════════════════════════════════════════════════════════════
 */

const DHARMA_CARDS_CONFIG = {
  packName: "第一彈 · 靈泉月現",
  totalCards: 70,
  initialFreeDraws: 5,
  pityLimit: 15, // 連續 15 抽無 SSR+，第 16 抽必中 SSR+
  rates: {
    R: 0.62,
    SR: 0.27,
    SSR: 0.07,
    UR: 0.03,
    USR: 0.01
  },
  rarityMeta: {
    USR: {
      name: "萬德莊嚴卡",
      badgeClass: "badge-usr",
      cardBack: "assets/cards/card_back_usr.png",
      color: "#f59e0b",
      glowColor: "rgba(245, 158, 11, 0.75)"
    },
    UR: {
      name: "圓頓實相卡",
      badgeClass: "badge-ur",
      cardBack: "assets/cards/card_back_ur.png",
      color: "#ef4444",
      glowColor: "rgba(239, 68, 68, 0.65)"
    },
    SSR: {
      name: "菩提圓滿卡",
      badgeClass: "badge-ssr",
      cardBack: "assets/cards/card_back_ssr.png",
      color: "#a855f7",
      glowColor: "rgba(168, 85, 247, 0.65)"
    },
    SR: {
      name: "定慧明心卡",
      badgeClass: "badge-sr",
      cardBack: "assets/cards/card_back_sr.png",
      color: "#10b981",
      glowColor: "rgba(16, 185, 129, 0.55)"
    },
    R: {
      name: "日用清涼卡",
      badgeClass: "badge-r",
      cardBack: "assets/cards/card_back_r.png",
      color: "#3b82f6",
      glowColor: "rgba(59, 130, 246, 0.45)"
    }
  }
};

const DHARMA_CARDS_LIST = ${JSON.stringify(cards, null, 2)};

// 依卡別分類字典
const DHARMA_CARDS_BY_RARITY = {
  USR: DHARMA_CARDS_LIST.filter(c => c.rarity === 'USR'),
  UR: DHARMA_CARDS_LIST.filter(c => c.rarity === 'UR'),
  SSR: DHARMA_CARDS_LIST.filter(c => c.rarity === 'SSR'),
  SR: DHARMA_CARDS_LIST.filter(c => c.rarity === 'SR'),
  R: DHARMA_CARDS_LIST.filter(c => c.rarity === 'R')
};

// 依 ID 快取查找
const DHARMA_CARDS_MAP = {};
DHARMA_CARDS_LIST.forEach(card => {
  DHARMA_CARDS_MAP[card.id] = card;
});
`;

fs.writeFileSync(path.resolve(__dirname, '..', 'js', 'cards-data.js'), outContent, 'utf8');
console.log('Successfully generated js/cards-data.js!');
