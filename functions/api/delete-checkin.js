/**
 * Cloudflare Pages Function: /api/delete-checkin
 * 最高權限：刪除單筆打卡紀錄並自動重新校正學員統計數據 (需管理員密碼)
 */
export async function onRequestPost({ request, env }) {
  try {
    const { checkin_id, pwd } = await request.json();
    const correctPassword = env.ADMIN_PASSWORD || 'ZhongTai#2026';

    if (pwd !== correctPassword) {
      return new Response(JSON.stringify({ success: false, error: '未授權訪問：指導法師密碼錯誤' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!checkin_id) {
      return new Response(JSON.stringify({ success: false, error: '缺少紀錄 ID' }), {
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

    // 查得該筆打卡關聯之學員 ID
    const checkin = await db.prepare('SELECT student_id, meditation_minutes, sutra_count FROM checkins WHERE id = ?').bind(checkin_id).first();
    if (!checkin) {
      return new Response(JSON.stringify({ success: false, error: '查無此筆打卡紀錄' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 刪除此筆紀錄
    await db.prepare('DELETE FROM checkins WHERE id = ?').bind(checkin_id).run();

    // 重新校正該學員之各項指標
    const stats = await db.prepare(`
      SELECT COUNT(*) as cnt, SUM(meditation_minutes) as mins, SUM(sutra_count) as sutras
      FROM checkins WHERE student_id = ?
    `).bind(checkin.student_id).first();

    const newCnt = stats?.cnt || 0;
    const newMins = stats?.mins || 0;
    const newSutras = stats?.sutras || 0;

    let lotusLevel = 1;
    if (newCnt >= 30) lotusLevel = 5;
    else if (newCnt >= 20) lotusLevel = 4;
    else if (newCnt >= 10) lotusLevel = 3;
    else if (newCnt >= 3) lotusLevel = 2;

    await db.prepare(`
      UPDATE students 
      SET total_checkins = ?, total_meditation_mins = ?, total_sutra_recs = ?, lotus_level = ?, updated_at = datetime('now', '+8 hours')
      WHERE id = ?
    `).bind(newCnt, newMins, newSutras, lotusLevel, checkin.student_id).run();

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
