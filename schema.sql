-- ═══════════════════════════════════════════════════════════════
-- 精進花園 (Zen Practice Garden) - Cloudflare D1 資料庫結構
-- 版本：v1.2 (2026-09-30)
-- 規範：
-- 1. 初次無學號者：填寫班級、組別、姓名三個即可登入；法名為選填（非必要）。
-- 2. 初次有填學號者：日後僅需輸入學號即可一鍵快速登入。
-- ═══════════════════════════════════════════════════════════════

-- 1. 學員基本資料與花園狀態表
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_no TEXT,                         -- 學號（初次選填；日後可憑學號一鍵登入）
  class_type TEXT NOT NULL,                 -- 班級：'日高' 或 '夜高'
  group_name TEXT NOT NULL,                 -- 組別：例如 'A1', 'B1'
  real_name TEXT NOT NULL,                  -- 真實姓名（他人花園嚴格隱藏）
  dharma_name TEXT,                         -- 法名（選填；他人花園公開顯示）
  total_checkins INTEGER DEFAULT 0,         -- 累積打卡總次數
  total_meditation_mins INTEGER DEFAULT 0,  -- 累積禪坐分鐘數
  total_sutra_recs INTEGER DEFAULT 0,       -- 累積誦經部數
  lotus_level INTEGER DEFAULT 1,            -- 花園蓮花階段 (1:初芽, 2:含苞, 3:初綻, 4:盛開, 5:七寶光華)
  rejoice_count INTEGER DEFAULT 0,          -- 獲得同修隨喜讚嘆次數
  created_at DATETIME DEFAULT (datetime('now', '+8 hours')),
  updated_at DATETIME DEFAULT (datetime('now', '+8 hours'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_unique_profile ON students(class_type, group_name, real_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_no_unique ON students(student_no) WHERE student_no IS NOT NULL AND student_no != '';
CREATE INDEX IF NOT EXISTS idx_students_no ON students(student_no);
CREATE INDEX IF NOT EXISTS idx_students_real_name ON students(real_name);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_type);
CREATE INDEX IF NOT EXISTS idx_students_dharma ON students(dharma_name);

-- 2. 每日打卡精進紀錄表（支援歷史補填時間）
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,              -- 關聯學員 ID
  record_time DATETIME NOT NULL,            -- 打卡修持時間（支援歷史自選補填）
  class_type TEXT NOT NULL,                 -- 班級快照
  group_name TEXT NOT NULL,                 -- 組別快照
  dharma_name TEXT,                         -- 法名快照（選填）
  practice_item TEXT NOT NULL,              -- 精進主項目 (靜坐調心、每日誦經、靜坐＋誦經)
  meditation_minutes INTEGER DEFAULT 0,     -- 靜坐時間 (分)
  sutra_name TEXT,                          -- 誦經品名 / 經典 (金剛經、藥師經、普門品或自填)
  sutra_count INTEGER DEFAULT 0,            -- 誦經卷數
  mantra_name TEXT,                         -- 持咒名稱
  mantra_count INTEGER DEFAULT 0,           -- 持咒遍數
  reflection_note TEXT,                     -- 每日修持省思
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

-- 預設插入最高權限管理員密碼（預設密碼：ZhongTai#2026）
INSERT OR REPLACE INTO admin_config (key, value) VALUES ('admin_password', 'ZhongTai#2026');

-- 5. 初始化示範學員資料 (供上線初次巡視與公開參觀展現)
INSERT OR IGNORE INTO students (id, student_no, class_type, group_name, real_name, dharma_name, total_checkins, total_meditation_mins, total_sutra_recs, lotus_level, rejoice_count)
VALUES 
  (101, 'NT2026-008', '日高', 'A1', '陳靜芬', '傳覺', 42, 1260, 45, 5, 28),
  (102, 'NT2026-015', '夜高', 'B1', '林崇禮', '傳心', 28, 840, 30, 4, 19),
  (103, 'NT2026-033', '日高', 'A2', '張雅惠', '傳道', 16, 480, 18, 3, 12),
  (104, 'NT2026-052', '夜高', 'B2', '王建弘', '傳智', 9, 270, 10, 2, 7);

INSERT OR IGNORE INTO checkins (id, student_id, record_time, class_type, group_name, dharma_name, practice_item, meditation_minutes, sutra_name, reflection_note, mentor_comment, commented_at)
VALUES
  (1, 101, '2026-09-28 06:30', '日高', 'A1', '傳覺', '靜坐調心', 45, '金剛般若波羅蜜經', '今晨靜坐前先思惟老和尚『人在哪裡，心就在哪裡』之開示，雜念漸息，安住呼吸，體會一念不生之清涼。', '善哉傳覺居士！正念現前，行住坐臥皆是道場。持之以恆，必有深契。', '2026-09-28 14:10'),
  (2, 102, '2026-09-27 21:00', '夜高', 'B1', '傳心', '每日誦經', 30, '妙法蓮華經觀世音菩薩普門品', '下班後虔誦普門品洗滌一日塵勞，迴向法界眾生離苦得樂。', '悲心懇切，功不唐捐！將此菩提心落實於職場與家庭。', '2026-09-28 09:30');
