-- ═══════════════════════════════════════════════════════════════
-- 精進花園 (Zen Practice Garden) - Cloudflare D1 資料庫結構
-- 版本：v1.0 (2026-09-28)
-- ═══════════════════════════════════════════════════════════════

-- 1. 學員基本資料與花園狀態表
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_no TEXT,                         -- 學號（非必填，僅管理員可見）
  class_type TEXT NOT NULL,                 -- 班級：'日高' 或 '夜高'
  group_name TEXT NOT NULL,                 -- 組別：例如 '第 1 組'
  real_name TEXT NOT NULL,                  -- 真實姓名（他人花園嚴格隱藏）
  dharma_name TEXT NOT NULL,                -- 法名（他人花園公開顯示）
  total_checkins INTEGER DEFAULT 0,         -- 累積打卡總次數
  total_meditation_mins INTEGER DEFAULT 0,  -- 累積禪坐分鐘數
  total_sutra_recs INTEGER DEFAULT 0,       -- 累積誦經部數/遍數
  lotus_level INTEGER DEFAULT 1,            -- 花園蓮花階段 (1:初芽, 2:含苞, 3:初綻, 4:盛開, 5:七寶光華)
  rejoice_count INTEGER DEFAULT 0,          -- 獲得同修隨喜讚嘆次數
  created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
  updated_at DATETIME DEFAULT (datetime('now', '+8 hours'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_profile ON students(class_type, group_name, real_name);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_type);
CREATE INDEX IF NOT EXISTS idx_students_dharma ON students(dharma_name);

-- 2. 每日打卡精進紀錄表（支援歷史補填時間）
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,              -- 關聯學員 ID
  record_time DATETIME NOT NULL,            -- 打卡修持時間（學員可自選當前或過去歷史時間補填）
  class_type TEXT NOT NULL,                 -- 班級快照
  group_name TEXT NOT NULL,                 -- 組別快照
  dharma_name TEXT NOT NULL,                -- 法名快照
  practice_item TEXT NOT NULL,              -- 精進主項目 (禪坐、誦經、持咒、念佛、出坡、聞法省思、善行利他)
  meditation_minutes INTEGER DEFAULT 0,     -- 靜坐時間 (分)
  sutra_name TEXT,                          -- 誦經品名 / 經典
  sutra_count INTEGER DEFAULT 0,            -- 誦經卷數或遍數
  mantra_name TEXT,                         -- 持咒名稱 (如大悲咒、準提神咒)
  mantra_count INTEGER DEFAULT 0,           -- 持咒遍數
  reflection_note TEXT,                     -- 每日反思與修行心得
  mentor_comment TEXT,                      -- 指導法師慈悲批註開示
  commented_at DATETIME,                    -- 法師批註時間
  created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checkins_student_id ON checkins(student_id);
CREATE INDEX IF NOT EXISTS idx_checkins_record_time ON checkins(record_time);

-- 3. 他人花園隨喜讚嘆紀錄表 (合掌祝福)
CREATE TABLE IF NOT EXISTS rejoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_student_id INTEGER NOT NULL,       -- 被讚嘆花園的主人
  from_dharma_name TEXT,                    -- 參觀者法名（匿名或具名祝福）
  blessing_message TEXT,                    -- 隨喜法語祝福
  created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (target_student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rejoices_target ON rejoices(target_student_id);

-- 4. 系統管理與安全金鑰設定表
CREATE TABLE IF NOT EXISTS admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT (datetime('now', '+8 hours'))
);

-- 預設插入最高權限管理員密碼雜湊或標識（預設密碼：ZhongTai#ZenGarden2026!）
INSERT OR IGNORE INTO admin_config (key, value) VALUES ('admin_password', 'ZhongTai#ZenGarden2026!');
