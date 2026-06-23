import Stripe from 'stripe'
import { json, body, fail } from '../_utils.js'

export async function onRequestPost({ request, env }) {
  try {
    const { paymentIntentId } = await body(request)
    if (!paymentIntentId) return json({ error: 'Missing Stripe PaymentIntent id' }, 400)
    if (!env.STRIPE_SECRET_KEY) return json({ error: 'Stripe is not configured' }, 500)

    const stripe = new Stripe(env.STRIPE_SECRET_KEY)
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    const metadata = paymentIntent.metadata || {}
    if (paymentIntent.status !== 'succeeded') return json({ paid: false, status: paymentIntent.status })

    const orderId = metadata.orderId
    const privyUserId = metadata.privyUserId
    const productId = metadata.productId
    const qty = Number(metadata.qty || 0)
    if (!orderId || !privyUserId || !productId || qty < 1) return json({ error: 'Missing PaymentIntent metadata' }, 400)

    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').bind(orderId, privyUserId).first()
    if (!order) return json({ error: 'Order not found' }, 404)
    if (order.status === 'paid') return json({ paid: true, order })

    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first()
    if (!product) return json({ error: 'Product not found' }, 404)
    if (product.stock < qty) return json({ error: 'Insufficient stock' }, 400)

    await env.DB.batch([
      env.DB.prepare('UPDATE products SET stock=stock-? WHERE id=?').bind(qty, productId),
      env.DB.prepare('UPDATE orders SET status="paid", paid_at=CURRENT_TIMESTAMP WHERE id=?').bind(orderId),
      env.DB.prepare('INSERT INTO cellar_items (user_id,product_id,quantity,purchased_at,source) VALUES (?,?,?,?,?)').bind(privyUserId, productId, qty, new Date().toISOString(), 'primary')
    ])
    const paidOrder = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first()
    return json({ paid: true, order: paidOrder })
  } catch (e) {
    return fail(e)
  }
}
