/**
 * Cloudflare Pages Function: /api/my-garden
 * 查詢本人的花園資料與歷史修持打卡清單 (需三欄核對：班級、組別、姓名)
 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const studentNo = url.searchParams.get('student_no');
    const classType = url.searchParams.get('class');
    const groupName = url.searchParams.get('group');
    const realName = url.searchParams.get('name');

    if (!studentNo && (!classType || !groupName || !realName)) {
      return new Response(JSON.stringify({ success: false, error: '缺少核驗參數（學號，或班級、組別與姓名）' }), {
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

    let student = null;
    if (studentNo) {
      student = await db.prepare(
        'SELECT * FROM students WHERE LOWER(student_no) = LOWER(?)'
      ).bind(studentNo.trim()).first();
    } else {
      student = await db.prepare(
        'SELECT * FROM students WHERE class_type = ? AND group_name = ? AND real_name = ?'
      ).bind(classType, groupName, realName).first();
    }

    if (!student) {
      return new Response(JSON.stringify({ success: false, error: '查無此學員花園紀錄' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const checkinsResult = await db.prepare(
      'SELECT * FROM checkins WHERE student_id = ? ORDER BY record_time DESC'
    ).bind(student.id).all();

    return new Response(JSON.stringify({
      success: true,
      student,
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
