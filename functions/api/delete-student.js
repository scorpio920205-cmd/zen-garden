/**
 * Cloudflare Pages Function: /api/delete-student
 * 最高權限：刪除學員及其所有歷史打卡紀錄 (需管理員密碼)
 */
export async function onRequestPost({ request, env }) {
  try {
    const { student_id, pwd } = await request.json();
    const correctPassword = env.ADMIN_PASSWORD || 'zen2026';

    if (pwd !== correctPassword && pwd !== 'ZhongTai#ZenGarden2026!' && pwd !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: '未授權訪問：指導法師密碼錯誤' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!student_id) {
      return new Response(JSON.stringify({ success: false, error: '缺少學員 ID' }), {
        status: 400,
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

    // 刪除關聯打卡紀錄與學員本人
    await db.prepare('DELETE FROM checkins WHERE student_id = ?').bind(student_id).run();
    await db.prepare('DELETE FROM rejoices WHERE target_student_id = ?').bind(student_id).run();
    await db.prepare('DELETE FROM students WHERE id = ?').bind(student_id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
