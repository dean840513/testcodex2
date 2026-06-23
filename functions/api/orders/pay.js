import { json, fail } from '../_utils.js'

export async function onRequestPost() {
  try {
    return json({ error: 'Direct payment simulation is disabled. Use Stripe Checkout and /api/stripe/confirm-session.' }, 410)
  } catch (e) {
    return fail(e)
  }
}
