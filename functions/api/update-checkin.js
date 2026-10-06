/**
 * Cloudflare Pages Function: /api/update-checkin
 * 最高權限：修改打卡紀錄之靜坐分鐘數並重新校正學員總分鐘數 (需管理員密碼)
 */
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { action, checkin_id, meditation_minutes, pwd } = body;
    const correctPassword = env.ADMIN_PASSWORD || 'ZhongTai#2026';

    if (pwd !== correctPassword) {
      return new Response(JSON.stringify({ success: false, error: '未授權訪問：指導法師密碼錯誤' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = env.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'D1 資料庫未綁定' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 專用動作：修復吳美紅誤值的 2030 分為 15 分並重新校正總時數
    if (action === 'fix_wu_mei_hong') {
      const student = await db.prepare("SELECT * FROM students WHERE real_name = '吳美紅' OR student_no = '114023672'").first();
      if (!student) {
        return new Response(JSON.stringify({ success: false, error: '找不到吳美紅學員資料' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 將所有 2030 分改為 15 分
      const updateCheckinRes = await db.prepare("UPDATE checkins SET meditation_minutes = 15 WHERE student_id = ? AND meditation_minutes = 2030")
        .bind(student.id).run();

      // 重新計算累積靜坐分鐘數
      const stats = await db.prepare("SELECT COALESCE(SUM(meditation_minutes), 0) as sum_mins FROM checkins WHERE student_id = ?")
        .bind(student.id).first();
      const newMins = stats?.sum_mins || 0;

      await db.prepare("UPDATE students SET total_meditation_mins = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?")
        .bind(newMins, student.id).run();

      const updatedStudent = await db.prepare("SELECT * FROM students WHERE id = ?").bind(student.id).first();
      const checkins = await db.prepare("SELECT id, student_id, record_time, practice_item, meditation_minutes, sutra_name FROM checkins WHERE student_id = ?")
        .bind(student.id).all();

      return new Response(JSON.stringify({
        success: true,
        message: `吳美紅打卡誤值已成功更正為 15 分，總靜坐分鐘數校正為 ${newMins} 分！`,
        student: updatedStudent,
        checkins: checkins.results || []
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 一般修改單筆紀錄分鐘數
    if (!checkin_id || meditation_minutes === undefined) {
      return new Response(JSON.stringify({ success: false, error: '缺少參數' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const checkin = await db.prepare('SELECT student_id FROM checkins WHERE id = ?').bind(checkin_id).first();
    if (!checkin) {
      return new Response(JSON.stringify({ success: false, error: '查無此筆打卡紀錄' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newMinVal = Math.max(0, parseInt(meditation_minutes) || 0);
    await db.prepare('UPDATE checkins SET meditation_minutes = ? WHERE id = ?').bind(newMinVal, checkin_id).run();

    // 重新計算學員累積總時數
    const stats = await db.prepare('SELECT COALESCE(SUM(meditation_minutes), 0) as mins FROM checkins WHERE student_id = ?')
      .bind(checkin.student_id).first();
    const newTotalMins = stats?.mins || 0;

    await db.prepare("UPDATE students SET total_meditation_mins = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?")
      .bind(newTotalMins, checkin.student_id).run();

    return new Response(JSON.stringify({
      success: true,
      checkin_id,
      meditation_minutes: newMinVal,
      new_total_mins: newTotalMins
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
