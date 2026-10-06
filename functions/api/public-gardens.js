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
      SELECT id, class_type, group_name, real_name, dharma_name, total_checkins, total_meditation_mins, lotus_level, rejoice_count
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

    // 依道場規範：有法名顯示法名；無法名者不分男女皆以「姓氏 ＋ 師兄」顯示（如：吳師兄）；全名與學號絕不傳送至公眾端！
    const gardens = (result.results || []).map(g => {
      let displayName = '精進同修';
      if (g.dharma_name && g.dharma_name.trim()) {
        displayName = g.dharma_name.trim();
      } else if (g.real_name && g.real_name.trim()) {
        displayName = g.real_name.trim().charAt(0) + '師兄';
      }

      return {
        id: g.id,
        class_type: g.class_type,
        group_name: g.group_name,
        dharma_name: displayName,
        display_name: displayName,
        total_checkins: g.total_checkins,
        total_meditation_mins: g.total_meditation_mins,
        lotus_level: g.lotus_level,
        rejoice_count: g.rejoice_count
      };
    });

    return new Response(JSON.stringify({
      success: true,
      gardens: gardens
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
