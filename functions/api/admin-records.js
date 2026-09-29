/**
 * Cloudflare Pages Function: /api/admin-records
 * 最高權限管理員專屬名錄與修持串流 (包含真實姓名與學號，需核對密碼)
 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const pwd = url.searchParams.get('pwd');
    const correctPassword = env.ADMIN_PASSWORD || 'ZhongTai#ZenGarden2026!';

    if (pwd !== correctPassword) {
      return new Response(JSON.stringify({ success: false, error: '未授權訪問' }), {
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

    const studentsResult = await db.prepare('SELECT * FROM students ORDER BY total_checkins DESC').all();
    const checkinsResult = await db.prepare('SELECT * FROM checkins ORDER BY record_time DESC LIMIT 300').all();

    return new Response(JSON.stringify({
      success: true,
      students: studentsResult.results || [],
      checkins: checkinsResult.results || []
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
