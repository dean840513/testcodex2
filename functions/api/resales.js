import { json, fail } from './_utils.js'
export async function onRequestGet({ env }) { try { const { results } = await env.DB.prepare('SELECT r.*, p.name AS product_name, p.image_url FROM resale_listings r JOIN products p ON p.id=r.product_id WHERE r.status="active" AND r.quantity>0 ORDER BY r.created_at DESC').all(); return json({ listings: results }) } catch (e) { return fail(e) } }
