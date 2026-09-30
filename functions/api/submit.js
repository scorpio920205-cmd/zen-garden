/**
 * Cloudflare Pages Function: /api/submit
 * 處理學員修持打卡寫入 Cloudflare D1 資料庫
 */
export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const {
      student_no,
      class_type,
      group_name,
      real_name,
      dharma_name,
      record_time,
      practice_item,
      meditation_minutes = 0,
      sutra_name = '',
      sutra_count = 0,
      mantra_name = '',
      mantra_count = 0,
      reflection_note = ''
    } = data;

    if (!class_type || !group_name || !real_name) {
      return new Response(JSON.stringify({ success: false, error: '缺少必填欄位（班級、組別與姓名）' }), {
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

    // 1. 查詢是否已有該學員
    let student = await db.prepare(
      'SELECT * FROM students WHERE class_type = ? AND group_name = ? AND real_name = ?'
    ).bind(class_type, group_name, real_name).first();

    const addMins = parseInt(meditation_minutes) || 0;
    const addSutra = parseInt(sutra_count) || 0;

    let studentId;
    let totalCheckins = 1;
    let lotusLevel = 1;

    if (!student) {
      // 新建學員紀錄（法名為選填）
      const insertResult = await db.prepare(`
        INSERT INTO students (student_no, class_type, group_name, real_name, dharma_name, total_checkins, total_meditation_mins, total_sutra_recs, lotus_level, rejoice_count)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, 1, 0)
      `).bind(student_no || '', class_type, group_name, real_name, dharma_name || '', addMins, addSutra).run();

      studentId = insertResult.meta.last_row_id;
    } else {
      studentId = student.id;
      totalCheckins = (student.total_checkins || 0) + 1;
      
      // 計算蓮花等級
      if (totalCheckins >= 30) lotusLevel = 5;
      else if (totalCheckins >= 20) lotusLevel = 4;
      else if (totalCheckins >= 10) lotusLevel = 3;
      else if (totalCheckins >= 3) lotusLevel = 2;
      else lotusLevel = 1;

      await db.prepare(`
        UPDATE students 
        SET total_checkins = total_checkins + 1,
            total_meditation_mins = total_meditation_mins + ?,
            total_sutra_recs = total_sutra_recs + ?,
            lotus_level = ?,
            dharma_name = CASE WHEN ? != '' THEN ? ELSE dharma_name END,
            student_no = CASE WHEN ? != '' THEN ? ELSE student_no END,
            updated_at = datetime('now', '+8 hours')
        WHERE id = ?
      `).bind(addMins, addSutra, lotusLevel, dharma_name || '', dharma_name || '', student_no || '', student_no || '', studentId).run();
    }

    // 2. 插入打卡明細 (支援歷史補填時間)
    const formattedRecordTime = record_time || new Date().toISOString().replace('T', ' ').substring(0, 16);
    await db.prepare(`
      INSERT INTO checkins (student_id, record_time, class_type, group_name, dharma_name, practice_item, meditation_minutes, sutra_name, sutra_count, mantra_name, mantra_count, reflection_note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      studentId,
      formattedRecordTime,
      class_type,
      group_name,
      dharma_name,
      practice_item,
      addMins,
      sutra_name,
      addSutra,
      mantra_name,
      parseInt(mantra_count) || 0,
      reflection_note
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: '打卡成功！精進功德已注入蓮花',
      student: {
        id: studentId,
        class_type,
        group_name,
        dharma_name,
        total_checkins: totalCheckins,
        lotus_level: lotusLevel
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
