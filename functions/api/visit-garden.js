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

    // 嚴格脫敏：不查詢 real_name 與 student_no
    const garden = await db.prepare(`
      SELECT id, class_type, group_name, dharma_name, total_checkins, total_meditation_mins, lotus_level, rejoice_count
      FROM students
      WHERE id = ?
    `).bind(id).first();

    if (!garden) {
      return new Response(JSON.stringify({ success: false, error: '查無此花園' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      garden
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
