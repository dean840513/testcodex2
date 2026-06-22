import { json, body, fail } from '../_utils.js'

export async function onRequestPost({ request, env }) {
  try {
    const payload = await body(request)
    const privyUserId = payload.privy_user_id || payload.privyUserId || payload.userId
    const email = payload.email || `${privyUserId}@privy.local`
    const walletAddress = payload.wallet_address || payload.walletAddress || null
    const authHeader = request.headers.get('Authorization') || ''
    if (!privyUserId) return json({ error: 'Missing Privy user id' }, 400)
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Missing Privy access token' }, 401)

    await env.DB.prepare(`
      INSERT INTO users (id, privy_user_id, email, wallet_address)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        privy_user_id = excluded.privy_user_id,
        email = excluded.email,
        wallet_address = excluded.wallet_address
    `).bind(privyUserId, privyUserId, email, walletAddress).run()

    const user = await env.DB.prepare('SELECT id, privy_user_id, email, wallet_address, created_at FROM users WHERE id = ?').bind(privyUserId).first()
    return json({ user })
  } catch (e) {
    return fail(e)
  }
}
