import Stripe from 'stripe'
import { json, body, fail } from '../_utils.js'

export async function onRequestPost({ request, env }) {
  try {
    const authHeader = request.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Privy login required' }, 401)
    const { productId, qty = 1, orderType = 'primary', privyUserId } = await body(request)
    const quantity = Number(qty)
    if (!privyUserId || !productId || quantity < 1) return json({ error: 'Invalid checkout payload' }, 400)
    if (orderType !== 'primary') return json({ error: 'Unsupported checkout order type' }, 400)
    if (!env.STRIPE_SECRET_KEY) return json({ error: 'Stripe is not configured' }, 500)

    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first()
    if (!product) return json({ error: 'Product not found' }, 404)
    if (product.stock < quantity) return json({ error: 'Insufficient stock' }, 400)

    const total = product.price_cents * quantity
    const orderResult = await env.DB.prepare('INSERT INTO orders (user_id,status,total_cents) VALUES (?1,"pending",?2)').bind(privyUserId, total).run()
    const orderId = orderResult.meta.last_row_id
    await env.DB.prepare('INSERT INTO order_items (order_id,product_id,quantity,unit_price_cents) VALUES (?,?,?,?)').bind(orderId, productId, quantity, product.price_cents).run()

    const stripe = new Stripe(env.STRIPE_SECRET_KEY)
    const origin = new URL(request.url).origin
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity,
        price_data: {
          currency: 'usd',
          unit_amount: product.price_cents,
          product_data: { name: product.name, description: product.description }
        }
      }],
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancel`,
      metadata: {
        orderId: String(orderId),
        privyUserId,
        productId: String(productId),
        qty: String(quantity),
        orderType
      }
    })

    return json({ session: { id: session.id, url: session.url }, order: { id: orderId, status: 'pending' } })
  } catch (e) {
    return fail(e)
  }
}
