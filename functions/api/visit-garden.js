/**
 * Cloudflare Pages Function: /api/visit-garden
 * 參觀特定同修的 3D 花園資訊 (嚴格安全隱私保護)
 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: '缺少花園 ID' }), {
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

    // 嚴格脫敏：真實全名與學號絕不對公眾端開放；若無填寫法名則顯示「姓氏 ＋ 師兄」
    const garden = await db.prepare(`
      SELECT id, class_type, group_name, real_name, dharma_name, total_checkins, total_meditation_mins, lotus_level, rejoice_count
      FROM students
      WHERE id = ?
    `).bind(id).first();

    if (!garden) {
      return new Response(JSON.stringify({ success: false, error: '查無此花園' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let displayName = '精進同修';
    if (garden.dharma_name && garden.dharma_name.trim()) {
      displayName = garden.dharma_name.trim();
    } else if (garden.real_name && garden.real_name.trim()) {
      displayName = garden.real_name.trim().charAt(0) + '師兄';
    }

    return new Response(JSON.stringify({
      success: true,
      garden: {
        id: garden.id,
        class_type: garden.class_type,
        group_name: garden.group_name,
        dharma_name: displayName,
        display_name: displayName,
        total_checkins: garden.total_checkins,
        total_meditation_mins: garden.total_meditation_mins,
        lotus_level: garden.lotus_level,
        rejoice_count: garden.rejoice_count
      }
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
