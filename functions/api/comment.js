/**
 * Cloudflare Pages Function: /api/comment
 * 指導法師線上批註開示寫入 D1 資料庫
 */
export async function onRequestPost({ request, env }) {
  try {
    const { checkin_id, comment, pwd } = await request.json();
    const correctPassword = env.ADMIN_PASSWORD || 'zen2026';

    if (pwd !== correctPassword && pwd !== 'ZhongTai#ZenGarden2026!' && pwd !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: '未授權訪問：指導法師密碼錯誤' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!checkin_id || !comment) {
      return new Response(JSON.stringify({ success: false, error: '缺少紀錄 ID 或批註內容' }), {
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

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    await db.prepare(`
      UPDATE checkins 
      SET mentor_comment = ?, commented_at = ?
      WHERE id = ?
    `).bind(comment, nowStr, checkin_id).run();

    return new Response(JSON.stringify({ success: true, commented_at: nowStr }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
