import { json, fail } from '../_utils.js'

export async function onRequestPost() {
  try {
    return json({ error: 'Stripe Checkout Sessions are disabled. Use /api/stripe/create-payment-intent with the Payment Element.' }, 410)
  } catch (e) {
    return fail(e)
  }
}
