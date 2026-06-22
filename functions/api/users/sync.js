import { json, body, fail } from '../_utils.js'

export async function onRequestPost({ request, env }) {
  try {
    const { userId, email } = await body(request)
    const authHeader = request.headers.get('Authorization') || ''
    if (!userId) return json({ error: 'Missing Privy user id' }, 400)
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Missing Privy access token' }, 401)
    const normalizedEmail = email || `${userId}@privy.local`
    await env.DB.prepare('INSERT INTO users (id, email) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET email = excluded.email').bind(userId, normalizedEmail).run()
    return json({ user: { id: userId, email: normalizedEmail } })
  } catch (e) {
    return fail(e)
  }
}
