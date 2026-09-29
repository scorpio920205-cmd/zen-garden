/**
 * 惟覺安公老和尚開示法語資料庫
 * 出處來源：歷期《中台月刊》老和尚法語暨開示錄
 */
const MASTER_QUOTES = [
  {
    id: 1,
    quote: "靜則一念不生，動則萬善圓滿。人在哪裡，心就在哪裡。做任何事情都能專心，這就是定；在定中還能清楚明白，這就是慧。",
    source: "《中台月刊》第 152 期・惟覺安公老和尚開示",
    category: "定慧等持",
    tag: "安住當下"
  },
  {
    id: 2,
    quote: "堅住正念，隨順因緣。修行不是逃避現實，而是在起心動念處下功夫，不執著境相，心如明鏡，了了分明。",
    source: "《中台月刊》第 185 期・惟覺安公老和尚開示",
    category: "正念修持",
    tag: "不起分別"
  },
  {
    id: 3,
    quote: "心即是佛，這念心人人本具。不起妄想就是善，不隨境界動搖就是定。把這念清淨心照顧好，即是自性花開。",
    source: "《中台月刊》第 210 期・惟覺安公老和尚開示",
    category: "自性功德",
    tag: "見性成佛"
  },
  {
    id: 4,
    quote: "對上以敬，對下以慈，對人以和，對事以真。中台四箴行是修行的基石，落實於日用生活，動靜皆是佛事。",
    source: "《中台月刊》第 225 期・中台四箴行專刊",
    category: "四箴行",
    tag: "生活實踐"
  },
  {
    id: 5,
    quote: "精進如流水，不舍晝夜。滴水穿石，不是水的力量大，而是水的恆常。修行就是要日日精進、持之以恆。",
    source: "《中台月刊》第 198 期・惟覺安公老和尚精進共修開示",
    category: "精進波羅蜜",
    tag: "持之以恆"
  },
  {
    id: 6,
    quote: "佛法在世間，不離世間覺。在家庭、在道場、在職場，處處都是修行的道場。能忍自安，心平氣和便是禪。",
    source: "《中台月刊》第 234 期・惟覺安公老和尚開示",
    category: "處世妙法",
    tag: "忍辱清涼"
  },
  {
    id: 7,
    quote: "打坐是息緣歇心，讓心澄靜下來。心清淨了，智慧之泉自然源源不絕湧現，煩惱即菩提。",
    source: "《中台月刊》第 176 期・禪坐修持開示",
    category: "禪修觀照",
    tag: "心澄智朗"
  },
  {
    id: 8,
    quote: "修福德而不修智慧，福至心迷；修智慧而不修福德，慧而無依。福慧雙修，悲智雙運，方能成就無上佛果。",
    source: "《中台月刊》第 242 期・惟覺安公老和尚開示",
    category: "福慧雙嚴",
    tag: "圓滿覺行"
  },
  {
    id: 9,
    quote: "因緣果報是宇宙的真理。起善念、結善緣、說善話、做善事，自然感得善果。在因地上努力，果報自然現前。",
    source: "《中台月刊》第 163 期・因果正見開示",
    category: "深信因果",
    tag: "因地端正"
  },
  {
    id: 10,
    quote: "心如虛空，含容萬物而不著空。行一切善法，心中無有一法可得，這便是真正的無住生心。",
    source: "《中台月刊》第 255 期・般若空慧開示",
    category: "金剛妙義",
    tag: "應無所住"
  }
];

function getRandomQuote() {
  const idx = Math.floor(Math.random() * MASTER_QUOTES.length);
  return MASTER_QUOTES[idx];
}

function getTodayQuote() {
  // 依當前日曆天做偽隨機固定，使當天每位同修看到的「今日法語」皆相同且法喜
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const idx = seed % MASTER_QUOTES.length;
  return MASTER_QUOTES[idx];
}
