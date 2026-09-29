/**
 * 精進花園 - API 通訊與離線/雲端雙模引擎
 * 支援：
 * 1. 雲端模式：Cloudflare Pages Functions + Cloudflare D1 資料庫
 * 2. 本地測試模式：自動偵測若無雲端後端，則採用 LocalStorage 完整模擬 D1 資料庫，
 *    包含學員建檔、補打卡、他人花園隱私清單、3D 蓮花成長等級、隨喜讚嘆等，無需後端即可 100% 離線測試驗證！
 */

const API_CONFIG = {
  adminPasswordDefault: "ZhongTai#ZenGarden2026!",
  storageKeys: {
    students: "zen_garden_students_v1",
    checkins: "zen_garden_checkins_v1",
    rejoices: "zen_garden_rejoices_v1",
    currentStudent: "zen_garden_current_student_v1",
    adminSession: "zen_garden_admin_token_v1"
  }
};

// 預設示範同修資料（供參觀他人花園時預先展現）
const INITIAL_DEMO_STUDENTS = [
  {
    id: 101,
    student_no: "NT2026-008",
    class_type: "日高",
    group_name: "A1",
    real_name: "陳靜芬", // 隱私遮蔽：公開參觀時絕對隱藏
    dharma_name: "傳覺",
    total_checkins: 42,
    total_meditation_mins: 1260,
    total_sutra_recs: 45,
    lotus_level: 5, // 七寶光華盛開
    rejoice_count: 28,
    last_practice: "靜坐 45 分鐘、金剛經一卷",
    created_at: "2026-09-01 08:30"
  },
  {
    id: 102,
    student_no: "NT2026-015",
    class_type: "夜高",
    group_name: "B1",
    real_name: "林崇禮", // 隱私遮蔽：公開參觀時絕對隱藏
    dharma_name: "傳心",
    total_checkins: 28,
    total_meditation_mins: 840,
    total_sutra_recs: 30,
    lotus_level: 4, // 盛開蓮花
    rejoice_count: 19,
    last_practice: "普門品二卷、大悲咒 21 遍",
    created_at: "2026-09-05 21:10"
  },
  {
    id: 103,
    student_no: "NT2026-033",
    class_type: "日高",
    group_name: "A2",
    real_name: "張雅惠", // 隱私遮蔽：公開參觀時絕對隱藏
    dharma_name: "傳道",
    total_checkins: 16,
    total_meditation_mins: 480,
    total_sutra_recs: 18,
    lotus_level: 3, // 初綻花苞
    rejoice_count: 12,
    last_practice: "靜坐 30 分鐘、中台四箴行省思",
    created_at: "2026-09-12 09:00"
  },
  {
    id: 104,
    student_no: "NT2026-052",
    class_type: "夜高",
    group_name: "B2",
    real_name: "王建弘", // 隱私遮蔽：公開參觀時絕對隱藏
    dharma_name: "傳智",
    total_checkins: 9,
    total_meditation_mins: 270,
    total_sutra_recs: 10,
    lotus_level: 2, // 欣喜初萌
    rejoice_count: 7,
    last_practice: "靜坐 20 分鐘、心經七遍",
    created_at: "2026-09-20 20:45"
  }
];

const INITIAL_DEMO_CHECKINS = [
  {
    id: 1,
    student_id: 101,
    record_time: "2026-09-28 06:30",
    class_type: "日高",
    group_name: "第 3 組",
    dharma_name: "傳覺",
    practice_item: "禪坐",
    meditation_minutes: 45,
    sutra_name: "金剛般若波羅蜜經",
    sutra_count: 1,
    mantra_name: "準提神咒",
    mantra_count: 49,
    reflection_note: "今晨靜坐前先思惟老和尚『人在哪裡，心就在哪裡』之開示，雜念漸息，安住呼吸，體會一念不生之清涼。",
    mentor_comment: "善哉傳覺居士！正念現前，行住坐臥皆是道場。持之以恆，必有深契。",
    commented_at: "2026-09-28 14:10"
  },
  {
    id: 2,
    student_id: 102,
    record_time: "2026-09-27 21:00",
    class_type: "夜高",
    group_name: "第 1 組",
    dharma_name: "傳心",
    practice_item: "誦經",
    meditation_minutes: 30,
    sutra_name: "妙法蓮華經觀世音菩薩普門品",
    sutra_count: 2,
    mantra_name: "千手千眼大悲心陀羅尼",
    mantra_count: 21,
    reflection_note: "下班後虔誦普門品與大悲咒，迴向法界眾生離苦得樂，洗滌一日塵勞。",
    mentor_comment: "悲心懇切，功不唐捐！將此菩提心落實於職場與家庭。",
    commented_at: "2026-09-28 09:30"
  }
];

// 本地存儲初始化
function initLocalMockDatabase() {
  if (!localStorage.getItem(API_CONFIG.storageKeys.students)) {
    localStorage.setItem(API_CONFIG.storageKeys.students, JSON.stringify(INITIAL_DEMO_STUDENTS));
  }
  if (!localStorage.getItem(API_CONFIG.storageKeys.checkins)) {
    localStorage.setItem(API_CONFIG.storageKeys.checkins, JSON.stringify(INITIAL_DEMO_CHECKINS));
  }
  if (!localStorage.getItem(API_CONFIG.storageKeys.rejoices)) {
    localStorage.setItem(API_CONFIG.storageKeys.rejoices, JSON.stringify([]));
  }
}

initLocalMockDatabase();

// 計算花園蓮花等級 (1:幼苗種子, 2:含苞待放, 3:微放清芬, 4:盛開蓮花, 5:七寶光華金蓮)
function calculateLotusLevel(totalCheckins) {
  if (totalCheckins >= 30) return 5;
  if (totalCheckins >= 20) return 4;
  if (totalCheckins >= 10) return 3;
  if (totalCheckins >= 3) return 2;
  return 1;
}

const ZenAPI = {
  // 檢測是否在 Cloudflare 伺服端環境
  async isCloudflareBackendAvailable() {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('/api/stats', { signal: controller.signal });
      clearTimeout(id);
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  // 1. 提交打卡（支援「補填歷史日期與時間」）
  async submitCheckin(data) {
    // 檢查是否有後端 API
    const isCloud = await this.isCloudflareBackendAvailable();
    if (isCloud) {
      try {
        const resp = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        return await resp.json();
      } catch (err) {
        console.warn('雲端提交失敗，自動降級本機儲存', err);
      }
    }

    // 本機 Mock 儲存流程
    const students = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.students) || '[]');
    const checkins = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.checkins) || '[]');

    // 尋找或建立學員
    let student = students.find(s => s.class_type === data.class_type && s.group_name === data.group_name && s.real_name === data.real_name);
    
    if (!student) {
      student = {
        id: Date.now(),
        student_no: data.student_no || '',
        class_type: data.class_type,
        group_name: data.group_name,
        real_name: data.real_name,
        dharma_name: data.dharma_name,
        total_checkins: 0,
        total_meditation_mins: 0,
        total_sutra_recs: 0,
        lotus_level: 1,
        rejoice_count: 0,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      students.push(student);
    } else {
      // 更新法名或學號（如有補填）
      if (data.dharma_name) student.dharma_name = data.dharma_name;
      if (data.student_no) student.student_no = data.student_no;
    }

    // 累積統計
    student.total_checkins += 1;
    student.total_meditation_mins += (parseInt(data.meditation_minutes) || 0);
    student.total_sutra_recs += (parseInt(data.sutra_count) || 0);
    student.lotus_level = calculateLotusLevel(student.total_checkins);
    student.last_practice = `${data.practice_item}${data.meditation_minutes ? ` ${data.meditation_minutes}分` : ''}${data.sutra_name ? ` · ${data.sutra_name}` : ''}`;

    // 新增打卡明細
    const newCheckin = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      student_id: student.id,
      record_time: data.record_time || new Date().toISOString().replace('T', ' ').substring(0, 16),
      class_type: student.class_type,
      group_name: student.group_name,
      dharma_name: student.dharma_name,
      practice_item: data.practice_item,
      meditation_minutes: parseInt(data.meditation_minutes) || 0,
      sutra_name: data.sutra_name || '',
      sutra_count: parseInt(data.sutra_count) || 0,
      mantra_name: data.mantra_name || '',
      mantra_count: parseInt(data.mantra_count) || 0,
      reflection_note: data.reflection_note || '',
      mentor_comment: '',
      commented_at: null,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    checkins.unshift(newCheckin);

    // 回存
    localStorage.setItem(API_CONFIG.storageKeys.students, JSON.stringify(students));
    localStorage.setItem(API_CONFIG.storageKeys.checkins, JSON.stringify(checkins));
    localStorage.setItem(API_CONFIG.storageKeys.currentStudent, JSON.stringify(student));

    return {
      success: true,
      message: "打卡成功！精進功德已注入您的智慧蓮花！",
      student: student,
      checkin: newCheckin
    };
  },

  // 2. 取得我的花園資料 (含本人打卡歷程)
  async getMyGarden(classType, groupName, realName) {
    const isCloud = await this.isCloudflareBackendAvailable();
    if (isCloud) {
      try {
        const resp = await fetch(`/api/my-garden?class=${encodeURIComponent(classType)}&group=${encodeURIComponent(groupName)}&name=${encodeURIComponent(realName)}`);
        return await resp.json();
      } catch (e) {
        console.warn('雲端查詢失敗，降級本地', e);
      }
    }

    const students = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.students) || '[]');
    const checkins = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.checkins) || '[]');

    const student = students.find(s => s.class_type === classType && s.group_name === groupName && s.real_name === realName);
    if (!student) {
      return { success: false, error: "查無此學員花園紀錄，請先填寫基本資料打卡建立花園。" };
    }

    const myCheckins = checkins
      .filter(c => c.student_id === student.id)
      .sort((a, b) => new Date(b.record_time) - new Date(a.record_time));

    return {
      success: true,
      student: student,
      checkins: myCheckins
    };
  },

  // 2.1 依學號查詢學員資料（支援學號一鍵登入）
  async getStudentByStudentNo(studentNo) {
    if (!studentNo) return null;
    const cleanNo = studentNo.trim();
    const isCloud = await this.isCloudflareBackendAvailable();
    if (isCloud) {
      try {
        const resp = await fetch(`/api/my-garden?student_no=${encodeURIComponent(cleanNo)}`);
        const res = await resp.json();
        if (res.success && res.student) return res.student;
      } catch (e) {
        console.warn('雲端學號查詢失敗，嘗試本地', e);
      }
    }

    const students = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.students) || '[]');
    return students.find(s => s.student_no && s.student_no.trim().toLowerCase() === cleanNo.toLowerCase()) || null;
  },

  // 3. 取得「參觀他人花園」清單（安全隱私模式：真實姓名與學號完全脫敏/過濾）
  async getPublicGardens(classFilter = '') {
    const isCloud = await this.isCloudflareBackendAvailable();
    if (isCloud) {
      try {
        const url = `/api/public-gardens${classFilter ? `?class=${encodeURIComponent(classFilter)}` : ''}`;
        const resp = await fetch(url);
        return await resp.json();
      } catch (e) {
        console.warn('雲端獲取公開花園失敗，降級本地', e);
      }
    }

    const students = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.students) || '[]');

    // 嚴格脫敏安全機制：只保留班級、法名、蓮花等級、打卡次數、隨喜次數
    const sanitizedGardens = students
      .filter(s => !classFilter || s.class_type === classFilter)
      .map(s => ({
        id: s.id,
        class_type: s.class_type,
        // group_name 可選顯示或保留組別代號
        group_name: s.group_name,
        dharma_name: s.dharma_name || "無相行者",
        // 絕對隱藏學號與真實姓名：
        // real_name: undefined,
        // student_no: undefined,
        total_checkins: s.total_checkins || 0,
        lotus_level: s.lotus_level || calculateLotusLevel(s.total_checkins || 0),
        rejoice_count: s.rejoice_count || 0,
        last_practice: s.last_practice || "勤修清淨波羅蜜",
        total_meditation_mins: s.total_meditation_mins || 0
      }))
      .sort((a, b) => b.total_checkins - a.total_checkins);

    return {
      success: true,
      gardens: sanitizedGardens
    };
  },

  // 4. 參觀特定同修的 3D 花園資訊 (隱私模式)
  async getVisitedGardenDetail(studentId) {
    const isCloud = await this.isCloudflareBackendAvailable();
    if (isCloud) {
      try {
        const resp = await fetch(`/api/visit-garden?id=${encodeURIComponent(studentId)}`);
        return await resp.json();
      } catch (e) {
        console.warn('雲端查詢特定花園失敗，降級本地', e);
      }
    }

    const students = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.students) || '[]');
    const s = students.find(item => item.id == studentId);

    if (!s) {
      return { success: false, error: "查無此同修的花園" };
    }

    // 隱私嚴格過濾：僅公開班級與法名
    return {
      success: true,
      garden: {
        id: s.id,
        class_type: s.class_type,
        group_name: s.group_name,
        dharma_name: s.dharma_name,
        total_checkins: s.total_checkins,
        total_meditation_mins: s.total_meditation_mins,
        lotus_level: s.lotus_level,
        rejoice_count: s.rejoice_count,
        last_practice: s.last_practice
      }
    };
  },

  // 5. 參觀時點擊「隨喜讚嘆/合掌祝福」
  async rejoiceGarden(studentId, fromDharmaName = '') {
    const isCloud = await this.isCloudflareBackendAvailable();
    if (isCloud) {
      try {
        const resp = await fetch('/api/rejoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_id: studentId, from_dharma_name: fromDharmaName })
        });
        return await resp.json();
      } catch (e) {
        console.warn('雲端隨喜失敗，降級本地', e);
      }
    }

    const students = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.students) || '[]');
    const target = students.find(s => s.id == studentId);
    if (target) {
      target.rejoice_count = (target.rejoice_count || 0) + 1;
      localStorage.setItem(API_CONFIG.storageKeys.students, JSON.stringify(students));
      return { success: true, new_rejoice_count: target.rejoice_count };
    }
    return { success: false, error: "花園不存在" };
  },

  // 6. 最高權限管理員登入驗證
  async verifyAdminPassword(password) {
    const isCloud = await this.isCloudflareBackendAvailable();
    if (isCloud) {
      try {
        const resp = await fetch('/api/verify-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: password })
        });
        const res = await resp.json();
        if (res.success) {
          sessionStorage.setItem(API_CONFIG.storageKeys.adminSession, password);
        }
        return res;
      } catch (e) {
        console.warn('雲端驗證失敗，降級本地核對', e);
      }
    }

    // 本機高強度密碼檢驗
    const isValid = (password === API_CONFIG.adminPasswordDefault);
    if (isValid) {
      sessionStorage.setItem(API_CONFIG.storageKeys.adminSession, password);
      return { success: true };
    }
    return { success: false, error: "最高管理員密碼錯誤，請重新確認！" };
  },

  // 7. 管理員專屬：查詢完整未脫敏名錄與打卡清單 (需要管理員密碼)
  async getAdminFullRecords(pwd) {
    const isCloud = await this.isCloudflareBackendAvailable();
    if (isCloud) {
      try {
        const resp = await fetch(`/api/admin-records?pwd=${encodeURIComponent(pwd)}`);
        return await resp.json();
      } catch (e) {
        console.warn('雲端獲取失敗，降級本地', e);
      }
    }

    if (pwd !== API_CONFIG.adminPasswordDefault) {
      return { success: false, error: "無管理權限" };
    }

    const students = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.students) || '[]');
    const checkins = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.checkins) || '[]');

    return {
      success: true,
      students: students,
      checkins: checkins
    };
  },

  // 8. 管理員批註法語開示
  async addMentorComment(checkinId, comment, pwd) {
    const checkins = JSON.parse(localStorage.getItem(API_CONFIG.storageKeys.checkins) || '[]');
    const c = checkins.find(item => item.id == checkinId);
    if (c) {
      c.mentor_comment = comment;
      c.commented_at = new Date().toISOString().replace('T', ' ').substring(0, 16);
      localStorage.setItem(API_CONFIG.storageKeys.checkins, JSON.stringify(checkins));
      return { success: true, checkin: c };
    }
    return { success: false, error: "查無此筆修持紀錄" };
  }
};
