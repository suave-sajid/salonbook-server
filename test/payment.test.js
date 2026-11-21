import assert from "node:assert/strict";
import test from "node:test";
import {
  isFailedCheckoutSession,
  isPaidCheckoutSession,
  shouldProcessCheckoutEvent,
  toMinorUnits,
} from "../src/utils/payment.js";

test("converts positive appointment prices to Stripe minor units", () => {
  assert.equal(toMinorUnits(125), 12500);
  assert.equal(toMinorUnits("12.35"), 1235);
});

test("rejects invalid appointment prices", () => {
  for (const value of [0, -1, "invalid", Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER]) {
    assert.equal(toMinorUnits(value), null);
  }
});

test("processes completed and delayed successful checkout events", () => {
  assert.equal(shouldProcessCheckoutEvent("checkout.session.completed"), true);
  assert.equal(shouldProcessCheckoutEvent("checkout.session.async_payment_succeeded"), true);
  assert.equal(shouldProcessCheckoutEvent("checkout.session.async_payment_failed"), true);
  assert.equal(shouldProcessCheckoutEvent("checkout.session.expired"), false);
});

test("accepts only a paid session whose amount and currency match", () => {
  const session = {
    id: "cs_test_123",
    mode: "payment",
    payment_status: "paid",
    amount_total: 1235,
    currency: "bdt",
  };

  assert.equal(isPaidCheckoutSession(session, 1235), true);
  assert.equal(isPaidCheckoutSession({ ...session, payment_status: "unpaid" }, 1235), false);
  assert.equal(isPaidCheckoutSession({ ...session, amount_total: 1000 }, 1235), false);
  assert.equal(isPaidCheckoutSession({ ...session, currency: "usd" }, 1235), false);
  assert.equal(isPaidCheckoutSession({ ...session, id: "" }, 1235), false);
});

test("accepts only a failed session whose amount and currency match", () => {
  const session = {
    id: "cs_test_failed",
    mode: "payment",
    payment_status: "unpaid",
    amount_total: 1235,
    currency: "bdt",
  };

  assert.equal(isFailedCheckoutSession(session, 1235), true);
  assert.equal(isFailedCheckoutSession({ ...session, payment_status: "paid" }, 1235), false);
  assert.equal(isFailedCheckoutSession({ ...session, amount_total: 1000 }, 1235), false);
  assert.equal(isFailedCheckoutSession({ ...session, currency: "usd" }, 1235), false);
});
