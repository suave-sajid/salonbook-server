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

## Live and Repository Links

- Live API: Add the deployed URL here
- Server repository: Add the server GitHub repository URL here
- Client repository: Add the client GitHub repository URL here
