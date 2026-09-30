/**
 * Cloudflare Pages Function: /api/verify-admin
 * 最高權限密碼驗證
 */
export async function onRequestPost({ request, env }) {
  try {
    const { password } = await request.json();
    const correctPassword = env.ADMIN_PASSWORD || 'ZhongTai#2026';

    if (password === correctPassword) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: '最高權限密碼錯誤' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
