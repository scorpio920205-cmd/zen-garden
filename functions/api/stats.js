/**
 * Cloudflare Pages Function: /api/stats
 * 全站精進修持統計概況
 */
export async function onRequestGet({ env }) {
  try {
    const db = env.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'D1 未綁定' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const totalStudents = await db.prepare('SELECT COUNT(*) as count FROM students').first();
    const totalCheckins = await db.prepare('SELECT COUNT(*) as count FROM checkins').first();
    const classBreakdown = await db.prepare('SELECT class_type, COUNT(*) as count FROM students GROUP BY class_type').all();

    return new Response(JSON.stringify({
      success: true,
      total_students: totalStudents ? totalStudents.count : 0,
      total_checkins: totalCheckins ? totalCheckins.count : 0,
      classes: classBreakdown.results || []
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
