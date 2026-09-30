const fs = require('fs');
const path = require('path');

const mdPath = path.resolve(__dirname, '..', 'docs', '般若智慧卡_70張法語總表.md');
const text = fs.readFileSync(mdPath, 'utf8');

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

console.log('Original cards parsed:', cards.length);

const listR = cards.filter(c => c.rarity === 'R');
const listSR = cards.filter(c => c.rarity === 'SR');
const listSSR = cards.filter(c => c.rarity === 'SSR');
const listUR = cards.filter(c => c.rarity === 'UR');
const listUSR = cards.filter(c => c.rarity === 'USR');

console.log(`Counts: R=${listR.length}, SR=${listSR.length}, SSR=${listSSR.length}, UR=${listUR.length}, USR=${listUSR.length}`);

// 最簡單的在最前面，USR在最後面
const reordered = [...listR, ...listSR, ...listSSR, ...listUR, ...listUSR];

let mdOutput = `# 🎴 精進花園【般若智慧卡 · 第一彈：靈泉月現】70張全法語總表

> **版本**：v1.1.0 (Pack 1 全 70 張 · 最易至最尊排列)  
> **對應規格**：完全依照 \`抽卡樣本圖/01.png\` 機率與卡數規範  
> **卡片排序**：最基礎的 R 卡在前，依序進階至終極 USR 卡在最後面  
> - 🔵 **R（日用清涼卡）**：45 張 (No.001 ~ No.045，機率 62%)  
> - 🟢 **SR（定慧明心卡）**：15 張 (No.046 ~ No.060，機率 27%)  
> - 🟣 **SSR（菩提圓滿卡）**：5 張 (No.061 ~ No.065，機率 7%)  
> - 🔴 **UR（圓頓實相卡）**：3 張 (No.066 ~ No.068，機率 3%)  
> - 🌈 **USR（萬德莊嚴卡）**：2 張 (No.069 ~ No.070，機率 1%)  
> **合計**：**70 張**  
> **抽卡機制**：  
> 1. 花園每開「1 朵花」獲得 1 次抽卡機會。  
> 2. 新學員初次登入免費贈送 **5 張** 開冊抽卡禮！  
> 3. 介面純淨專注：無複製分享與迴向按鈕。

---
`;

let currentSection = '';

reordered.forEach((c, idx) => {
  const newNum = idx + 1;
  const newId = String(newNum).padStart(3, '0');
  c.id = newId;
  c.num = newNum;

  if (c.rarity === 'R' && currentSection !== 'R') {
    currentSection = 'R';
    mdOutput += `\n## 🔵 第一篇：R【日用清涼 · 隨順因緣卡】（共 45 張，No.001 ~ No.045，機率 62%）\n\n`;
  } else if (c.rarity === 'SR' && currentSection !== 'SR') {
    currentSection = 'SR';
    mdOutput += `\n---\n\n## 🟢 第二篇：SR【定慧明心 · 深入經藏卡】（共 15 張，No.046 ~ No.060，機率 27%）\n\n`;
  } else if (c.rarity === 'SSR' && currentSection !== 'SSR') {
    currentSection = 'SSR';
    mdOutput += `\n---\n\n## 🟣 第三篇：SSR【菩提圓滿 · 大悲本願卡】（共 5 張，No.061 ~ No.065，機率 7%）\n\n`;
  } else if (c.rarity === 'UR' && currentSection !== 'UR') {
    currentSection = 'UR';
    mdOutput += `\n---\n\n## 🔴 第四篇：UR【圓頓實相 · 直指人心卡】（共 3 張，No.066 ~ No.068，機率 3%）\n\n`;
  } else if (c.rarity === 'USR' && currentSection !== 'USR') {
    currentSection = 'USR';
    mdOutput += `\n---\n\n## 🌈 第五篇：USR【無上菩提 · 萬德莊嚴卡】（共 2 張，No.069 ~ No.070，機率 1%）\n\n`;
  }

  mdOutput += `### No.${newId}【${c.title}】
* **卡別**：\`${c.rarity}\`
* **出處**：${c.source}
* **法語經句**：  
  > 「${c.quote}」
* **白話提撕**：${c.insight}

`;
});

const mdDest = path.resolve(__dirname, '..', 'docs', '般若智慧卡_70張法語總表.md');
fs.writeFileSync(mdDest, mdOutput, 'utf8');
console.log('Successfully reordered and written to docs/般若智慧卡_70張法語總表.md!');
