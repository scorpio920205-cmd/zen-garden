/**
 * Cloudflare Pages Function: /api/rejoice
 * 參觀他人花園點擊「隨喜讚嘆/合掌祝福」
 */
export async function onRequestPost({ request, env }) {
  try {
    const { target_id, from_dharma_name = '' } = await request.json();

    if (!target_id) {
      return new Response(JSON.stringify({ success: false, error: '缺少目標花園 ID' }), {
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

    await db.prepare(`
      UPDATE students
      SET rejoice_count = rejoice_count + 1
      WHERE id = ?
    `).bind(target_id).run();

    await db.prepare(`
      INSERT INTO rejoices (target_student_id, from_dharma_name)
      VALUES (?, ?)
    `).bind(target_id, from_dharma_name).run();

    const student = await db.prepare('SELECT rejoice_count FROM students WHERE id = ?').bind(target_id).first();

    return new Response(JSON.stringify({
      success: true,
      new_rejoice_count: student ? student.rejoice_count : 0
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
