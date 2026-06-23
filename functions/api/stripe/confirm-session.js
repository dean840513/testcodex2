import { json, fail } from '../_utils.js'

export async function onRequestPost() {
  try {
    return json({ error: 'Stripe Checkout Session confirmation is disabled. Use /api/stripe/confirm-payment.' }, 410)
  } catch (e) {
    return fail(e)
  }
}
