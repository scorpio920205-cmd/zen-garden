/**
 * Cloudflare Pages Function: /api/public-gardens
 * 參觀他人花園清單 (蓮池海會)
 * 嚴格隱私保護：SQL 查詢只提取 id, class_type, dharma_name, total_checkins, lotus_level, rejoice_count 等
 * 學號 (student_no) 與 真實姓名 (real_name) 絕不傳送至公眾端！
 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const classFilter = url.searchParams.get('class');

    const db = env.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'D1 資料庫未綁定' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let query = `
      SELECT id, class_type, group_name, dharma_name, total_checkins, total_meditation_mins, lotus_level, rejoice_count
      FROM students
    `;
    const params = [];

    if (classFilter) {
      query += ' WHERE class_type = ? ';
      params.push(classFilter);
    }

    query += ' ORDER BY total_checkins DESC LIMIT 100';

    const stmt = db.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

    return new Response(JSON.stringify({
      success: true,
      gardens: result.results || []
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=15'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
