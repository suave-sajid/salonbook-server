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
- `PORT`

## Local Stripe Webhook Testing

Use Stripe test mode and install the [Stripe CLI](https://docs.stripe.com/stripe-cli) before testing local webhooks. Keep the CLI running while your API is running:

```bash
stripe login
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to http://localhost:5000/api/payments/webhook
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

## Live and Repository Links

- Live API: Add the deployed URL here
- Server repository: Add the server GitHub repository URL here
- Client repository: Add the client GitHub repository URL here
