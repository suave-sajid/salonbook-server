# SalonBook Server

The SalonBook Express API manages services, appointments, customers, payments, and role-based administration.

## Important Features

- MongoDB-backed service, appointment, transaction, and user data
- Better Auth JWT verification and blocked-user checks
- Customer and administrator role authorization
- Appointment conflict and state validation
- Stripe Checkout sessions and verified Stripe webhook processing
- ImgBB image uploads

## Technology Stack

Node.js, Express.js, MongoDB, Better Auth JWT, Stripe, Multer, and ImgBB.

## Installation

```bash
npm install
```

## Local Development

```bash
npm run dev
```

The API runs on `http://localhost:5000` by default.

## Required Environment Variables

- `MONGODB_URI`
- `DB_NAME`
- `BETTER_AUTH_URL`
- `CLIENT_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `IMGBB_API_KEY`
- `PORT` (optional; local development only)

## Local Stripe Webhook Testing

Use Stripe test mode and install the [Stripe CLI](https://docs.stripe.com/stripe-cli) before testing local webhooks. Keep the CLI running while your API is running:

```bash
stripe login
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed --forward-to http://localhost:5000/api/payments/webhook
```

The CLI prints a webhook signing secret beginning with `whsec_`. Put that value in the server's local `.env` as `STRIPE_WEBHOOK_SECRET`, then restart the API. This is different from `STRIPE_SECRET_KEY`; never commit either secret or paste it into chat.

To confirm the endpoint rejects unsigned requests, run this in another PowerShell terminal:

```powershell
curl.exe -i -X POST http://localhost:5000/api/payments/webhook `
  -H "Content-Type: application/json" `
  -H "Stripe-Signature: invalid" `
  --data "{}"
```

The expected response is `400 Invalid Stripe webhook signature`. For a successful end-to-end test, create and confirm an appointment in SalonBook, use Pay Now, and complete Checkout with Stripe test payment details. The API updates payment state only after receiving the signed webhook; the success redirect is not proof of payment.

## Deploy to Vercel

The Express app is exported from `src/app.js`, which connects to MongoDB before handling requests. From this directory, link and deploy it with the Vercel CLI:

```powershell
npx vercel@latest login
npx vercel@latest link
```

Add the required environment variables to the Vercel project's Production environment. Use the CLI to add them one at a time; it prompts for each value:

```powershell
npx vercel@latest env add MONGODB_URI --environment production
npx vercel@latest env add DB_NAME --environment production
npx vercel@latest env add BETTER_AUTH_URL --environment production
npx vercel@latest env add CLIENT_URL --environment production
npx vercel@latest env add STRIPE_SECRET_KEY --environment production
npx vercel@latest env add STRIPE_WEBHOOK_SECRET --environment production
npx vercel@latest env add IMGBB_API_KEY --environment production
```

Keep credentials secret and out of source control. Then deploy and check `https://<deployment-url>/api/health`:

```powershell
npx vercel@latest --prod
```

Configure the Stripe production webhook at `https://<deployment-url>/api/payments/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.async_payment_failed`. Store its signing secret as `STRIPE_WEBHOOK_SECRET` in Vercel and redeploy if it was added after the initial deployment.

## Live and Repository Links

- Live API: https://saloonbook-server.vercel.app/
- Server repository: https://github.com/suave-sajid/salonbook-server
- Client repository: https://github.com/suave-sajid/saloonbook-client
