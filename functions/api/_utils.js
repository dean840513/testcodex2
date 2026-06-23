export const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })
export async function body(request) { try { return await request.json() } catch { return {} } }
export function fail(error, status = 500) { return json({ error: error?.message || String(error) }, status) }
