import { json, fail } from './_utils.js'
export async function onRequestGet({ env }) { try { const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY id').all(); return json({ products: results }) } catch (e) { return fail(e) } }
