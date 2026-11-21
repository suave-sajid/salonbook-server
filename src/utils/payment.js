export const STRIPE_CURRENCY = "bdt";

const successfulCheckoutEvents = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
]);

export function toMinorUnits(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null;

  const minorUnits = Math.round(numericAmount * 100);
  return Number.isSafeInteger(minorUnits) && minorUnits > 0
    ? minorUnits
    : null;
}

export function shouldProcessCheckoutEvent(eventType) {
  return successfulCheckoutEvents.has(eventType);
}

export function isPaidCheckoutSession(session, expectedAmount) {
  return (
    session?.mode === "payment"
    && session.payment_status === "paid"
    && typeof session.id === "string"
    && session.id.length > 0
    && Number.isSafeInteger(session.amount_total)
    && session.amount_total === expectedAmount
    && session.currency === STRIPE_CURRENCY
  );
}

export function isFailedCheckoutSession(session, expectedAmount) {
  return (
    session?.mode === "payment"
    && session.payment_status === "unpaid"
    && typeof session.id === "string"
    && session.id.length > 0
    && Number.isSafeInteger(session.amount_total)
    && session.amount_total === expectedAmount
    && session.currency === STRIPE_CURRENCY
  );
}
