/**
 * Cloudflare Pages Function: /api/student
 * 學員即時同步、查詢與跨裝置登入/綁定學號引擎
 * 支援：
 * 1. GET ?all=1 或 ?action=all：取得全體學員名單供前端跨裝置動態校驗與即時同步
 * 2. GET ?student_no=xxx：依學號即時查詢學員建檔紀錄
 * 3. GET ?name=xxx：依真實姓名 (與班級組別) 查詢學員紀錄
 * 4. POST：即時建立新學員或更新/補齊既有學員資料（如補填學號、變更組別等），維護 1:1 學號與姓名唯一對應
 */

export async function onRequestGet({ request, env }) {
  try {
    const db = env.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'D1 資料庫未綁定' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const studentNo = url.searchParams.get('student_no');
    const classType = url.searchParams.get('class');
    const groupName = url.searchParams.get('group');
    const realName = url.searchParams.get('name') || url.searchParams.get('real_name');

    // 1. 取得全體學員清單 (供跨裝置即時核驗與離線快取同步)
    if (action === 'all' || url.searchParams.get('all') === '1') {
      const results = await db.prepare(
        'SELECT id, student_no, class_type, group_name, real_name, dharma_name, total_checkins, total_meditation_mins, total_sutra_recs, lotus_level, rejoice_count, created_at, updated_at FROM students ORDER BY id ASC'
      ).all();
      return new Response(JSON.stringify({
        success: true,
        students: results.results || []
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    // 2. 依學號查詢學員
    if (studentNo) {
      const cleanNo = studentNo.trim();
      const student = await db.prepare(
        'SELECT * FROM students WHERE LOWER(TRIM(student_no)) = LOWER(?)'
      ).bind(cleanNo).first();

      if (student) {
        return new Response(JSON.stringify({ success: true, student }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      } else {
        return new Response(JSON.stringify({ success: false, error: '查無此學號建檔紀錄', not_found: true }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }
    }

    // 3. 依姓名（及班級/組別）查詢
    if (realName) {
      const cleanReal = realName.trim();
      let query = 'SELECT * FROM students WHERE real_name = ?';
      const params = [cleanReal];

      if (classType && groupName) {
        query += ' AND class_type = ? AND group_name = ?';
        params.push(classType.trim(), groupName.trim());
      }

      const student = await db.prepare(query).bind(...params).first();
      if (student) {
        return new Response(JSON.stringify({ success: true, student }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      } else {
        return new Response(JSON.stringify({ success: false, error: '查無此學員紀錄', not_found: true }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
      }
    }

    return new Response(JSON.stringify({ success: false, error: '缺少查詢參數' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const db = env.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'D1 資料庫未綁定' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    const {
      student_no,
      class_type,
      group_name,
      real_name,
      dharma_name
    } = data;

    const cleanNo = (student_no || '').trim();
    const cleanRealName = (real_name || '').trim();
    const cleanClass = (class_type || '').trim();
    const cleanGroup = (group_name || '').trim();
    const cleanDharma = (dharma_name || '').trim();

    if (!cleanRealName) {
      return new Response(JSON.stringify({ success: false, error: '真實姓名為必填欄位' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. 唯一性校驗：學號是否已被其他姓名登記？
    if (cleanNo) {
      const studentByNo = await db.prepare(
        'SELECT * FROM students WHERE LOWER(TRIM(student_no)) = LOWER(?)'
      ).bind(cleanNo).first();

      if (studentByNo && studentByNo.real_name !== cleanRealName) {
        return new Response(JSON.stringify({
          success: false,
          code: 'STUDENT_NO_NAME_MISMATCH',
          error: `學號【${cleanNo}】已在系統中登記對應姓名為【${studentByNo.real_name}】（${studentByNo.class_type} ${studentByNo.group_name}）。依精舍規定，學號對應姓名為唯一！`,
          existingStudent: studentByNo
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 2. 查詢該姓名是否已在系統建檔
    const studentByName = await db.prepare(
      'SELECT * FROM students WHERE real_name = ?'
    ).bind(cleanRealName).first();

    if (studentByName) {
      // 狀況 2A: 該姓名先前已綁定其他學號，不可改用新學號
      if (
        studentByName.student_no && 
        studentByName.student_no.trim() !== '' && 
        cleanNo && 
        studentByName.student_no.trim().toLowerCase() !== cleanNo.toLowerCase()
      ) {
        return new Response(JSON.stringify({
          success: false,
          code: 'NAME_ALREADY_BOUND_OTHER_NO',
          error: `學員【${cleanRealName}】先前已綁定學號【${studentByName.student_no}】。學號對應姓名為唯一，不可重複登記為新學號【${cleanNo}】！`,
          existingStudent: studentByName
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 狀況 2B: 之前沒輸入學號的幫他把之前輸入過的補齊，或是更新班級組別法名（保留原修持次數與蓮花等級）
      const targetNo = cleanNo || studentByName.student_no || '';
      const targetClass = cleanClass || studentByName.class_type;
      const targetGroup = cleanGroup || studentByName.group_name;
      const targetDharma = cleanDharma !== '' ? cleanDharma : (studentByName.dharma_name || '');

      await db.prepare(`
        UPDATE students
        SET student_no = ?, class_type = ?, group_name = ?, dharma_name = ?, updated_at = datetime('now', '+8 hours')
        WHERE id = ?
      `).bind(targetNo, targetClass, targetGroup, targetDharma, studentByName.id).run();

      const updated = await db.prepare('SELECT * FROM students WHERE id = ?').bind(studentByName.id).first();

      return new Response(JSON.stringify({
        success: true,
        message: '學員資料已成功同步更新！',
        student: updated,
        isUpdated: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. 全新學員初次建檔寫入 D1
    if (!cleanClass || !cleanGroup) {
      return new Response(JSON.stringify({ success: false, error: '全新學員建檔需填寫班級與組別' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const insertResult = await db.prepare(`
      INSERT INTO students (student_no, class_type, group_name, real_name, dharma_name, total_checkins, total_meditation_mins, total_sutra_recs, lotus_level, rejoice_count)
      VALUES (?, ?, ?, ?, ?, 0, 0, 0, 1, 0)
    `).bind(cleanNo, cleanClass, cleanGroup, cleanRealName, cleanDharma).run();

    const newStudentId = insertResult.meta?.last_row_id;
    let newStudent = null;
    if (newStudentId) {
      newStudent = await db.prepare('SELECT * FROM students WHERE id = ?').bind(newStudentId).first();
    } else {
      newStudent = await db.prepare('SELECT * FROM students WHERE real_name = ?').bind(cleanRealName).first();
    }

    return new Response(JSON.stringify({
      success: true,
      message: '全新學員建檔成功！',
      student: newStudent,
      isCreated: true
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
