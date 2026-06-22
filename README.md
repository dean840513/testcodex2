# TATTOO Lifestyle / Wine Marketplace Test

A React + Vite luxury wine and Web3 lifestyle marketplace prototype for Cloudflare Pages. The app uses Privy Email OTP login, mock Stripe-style payment, Cloudflare Pages Functions APIs, and Cloudflare D1.

## Cloudflare Pages build settings

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Framework preset:** Vite / React
- **Functions directory:** `functions`

Do not run `wrangler deploy`; connect the repository to Cloudflare Pages or upload/deploy through the Pages workflow.

## D1 binding setting

Create a Cloudflare D1 database and add a Pages Functions binding:

- **Variable name / binding name:** `DB`
- **Resource:** your D1 database

The Pages Functions in `functions/api` expect `env.DB` to be available.

## Privy environment variables

Set these variables in Cloudflare Pages settings. Do not commit secrets or create a `.env` file.

- `VITE_PRIVY_APP_ID`: public Privy App ID exposed to the browser by Vite.
- `PRIVY_APP_SECRET`: server-side Privy App Secret for Pages Functions / future token verification. Never expose this value to the frontend.

Privy is configured for Email OTP login only. After login, the frontend calls `POST /api/users/sync` so first-time users are inserted into the `users` table with their Privy `user.id`.

## Run the D1 migration in Cloudflare D1 Console

1. Open Cloudflare Dashboard.
2. Go to **Workers & Pages** → **D1 SQL Database**.
3. Select your database.
4. Open **Console**.
5. Copy the full contents of `migrations/0001_initial.sql`.
6. Paste it into the console and run it.

The migration creates `users`, `products`, `orders`, `order_items`, `cellar_items`, and `resale_listings`, then seeds the demo user and sample wine products.

## Local development

```bash
npm install
npm run dev
```

For local Pages Functions + D1 testing, use Cloudflare Pages local tooling with a D1 binding named `DB`. The front-end alone can be run with Vite, but API calls require the Pages Functions runtime.

## Build locally

```bash
npm run build
```

The static production bundle is emitted to `dist`.

## Deploy

1. Push this repository to your Git provider.
2. In Cloudflare Pages, create a project from the repository.
3. Set build command to `npm run build`.
4. Set output directory to `dist`.
5. Add the D1 binding named `DB`.
6. Run `migrations/0001_initial.sql` in the D1 Console.
7. Deploy via Cloudflare Pages.

## Authentication

Users sign in with Privy Email OTP. Orders, cellar entries, and resale activity use the authenticated Privy `user.id`.

## Implemented flows

- Product listing and product details
- Checkout and pending order creation
- Mock Stripe-style payment
- Paid order status update, inventory deduction, and cellar write
- My Orders with pending/paid states
- My Cellar with resale entry points
- Active resale marketplace
- Resale listing creation with front-end and back-end quantity validation
- Resale purchase with cellar write and listing quantity reduction
