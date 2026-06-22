import { json, fail } from './_utils.js'
export async function onRequestGet({ request, env }) { try { const id = new URL(request.url).searchParams.get('id'); const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first(); if (!product) return json({ error: 'Product not found' }, 404); return json({ product }) } catch (e) { return fail(e) } }
