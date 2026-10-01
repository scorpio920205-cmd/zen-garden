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

    const cleanNo = (student_no || '').trim();
    const cleanRealName = (real_name || '').trim();

    // 檢查打卡時間不得早於正式啟動日 2026-09-29
    const formattedRecordTime = record_time ? record_time.replace('T', ' ').substring(0, 16) : new Date().toISOString().replace('T', ' ').substring(0, 16);
    if (formattedRecordTime < '2026-09-29') {
      return new Response(JSON.stringify({
        success: false,
        error: '打卡活動自 2026/09/29 (二) 正式啟動，不接受 2026-09-29 以前之補填打卡紀錄！'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. 查詢是否已有該學員（優先依學號，次依姓名/班級組別）
    let student = null;

    if (cleanNo) {
      // (A) 先以學號查詢
      student = await db.prepare(
        'SELECT * FROM students WHERE LOWER(student_no) = LOWER(?)'
      ).bind(cleanNo).first();

      if (student && student.real_name !== cleanRealName) {
        return new Response(JSON.stringify({
          success: false,
          error: `學號【${cleanNo}】已登記對應姓名【${student.real_name}】，與您輸入的姓名【${cleanRealName}】不符。學號對應姓名為唯一！`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (!student) {
      // (B) 再以姓名查詢
      student = await db.prepare(
        'SELECT * FROM students WHERE real_name = ?'
      ).bind(cleanRealName).first();

      if (student) {
        // 如果此學員已綁定其他學號
        if (student.student_no && cleanNo && student.student_no.toLowerCase() !== cleanNo.toLowerCase()) {
          return new Response(JSON.stringify({
            success: false,
            error: `學員【${cleanRealName}】先前已綁定學號【${student.student_no}】。學號對應姓名為唯一，不可改用新學號【${cleanNo}】！`
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // 之前沒輸入學號的幫他把之前輸入過的補齊而不是新增！
        if ((!student.student_no || student.student_no.trim() === '') && cleanNo) {
          await db.prepare('UPDATE students SET student_no = ?, updated_at = datetime(\'now\', \'+8 hours\') WHERE id = ?').bind(cleanNo, student.id).run();
          student.student_no = cleanNo;
        }
      }
    }

    const addMins = parseInt(meditation_minutes) || 0;
    const addSutra = parseInt(sutra_count) || 0;

    let studentId;
    let totalCheckins = 1;
    let lotusLevel = 1;

    if (!student) {
      // 全新學員建檔
      const insertResult = await db.prepare(`
        INSERT INTO students (student_no, class_type, group_name, real_name, dharma_name, total_checkins, total_meditation_mins, total_sutra_recs, lotus_level, rejoice_count)
        VALUES (?, ?, ?, ?, ?, 0, 0, 0, 1, 0)
      `).bind(cleanNo, class_type, group_name, cleanRealName, dharma_name || '').run();

      studentId = insertResult.meta.last_row_id;
    } else {
      studentId = student.id;
    }

    // 2. 插入打卡明細 (支援歷史補填時間)
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

    // 重新結算學員真實修持天數 (不重複打卡天數，確保每位同修自 2026/09/29 起公平踏實晉階) 與累積時數
    const daysRow = await db.prepare(`
      SELECT 
        COUNT(DISTINCT substr(record_time, 1, 10)) as distinct_days,
        COALESCE(SUM(meditation_minutes), 0) as sum_mins,
        COALESCE(SUM(sutra_count), 0) as sum_sutras
      FROM checkins WHERE student_id = ?
    `).bind(studentId).first();

    const distinctDays = daysRow ? (daysRow.distinct_days || 1) : 1;
    const totalMins = daysRow ? daysRow.sum_mins : addMins;
    const totalSutras = daysRow ? daysRow.sum_sutras : addSutra;

    if (distinctDays >= 30) lotusLevel = 5;
    else if (distinctDays >= 20) lotusLevel = 4;
    else if (distinctDays >= 10) lotusLevel = 3;
    else if (distinctDays >= 3) lotusLevel = 2;
    else lotusLevel = 1;

    await db.prepare(`
      UPDATE students 
      SET total_checkins = ?,
          total_meditation_mins = ?,
          total_sutra_recs = ?,
          lotus_level = ?,
          dharma_name = CASE WHEN ? != '' THEN ? ELSE dharma_name END,
          student_no = CASE WHEN ? != '' THEN ? ELSE student_no END,
          updated_at = datetime('now', '+8 hours')
      WHERE id = ?
    `).bind(distinctDays, totalMins, totalSutras, lotusLevel, dharma_name || '', dharma_name || '', cleanNo, cleanNo, studentId).run();

    const updatedStudent = await db.prepare('SELECT * FROM students WHERE id = ?').bind(studentId).first();

    return new Response(JSON.stringify({
      success: true,
      message: '打卡成功！精進功德已注入蓮花',
      student: updatedStudent || {
        id: studentId,
        student_no: cleanNo,
        class_type,
        group_name,
        real_name: cleanRealName,
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
