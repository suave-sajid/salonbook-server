import Stripe from "stripe";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import {
  isFailedCheckoutSession,
  isPaidCheckoutSession,
  shouldProcessCheckoutEvent,
  STRIPE_CURRENCY,
  toMinorUnits,
} from "../utils/payment.js";

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

export const createCheckoutSession = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    if (!ObjectId.isValid(appointmentId)) return res.status(400).json({ success: false, message: "Invalid appointment ID" });
    const db = getDB();
    const appointment = await db.collection("appointments").findOne({
      _id: new ObjectId(appointmentId),
      customerId: req.user.id,
    });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
    if (appointment.status !== "confirmed") return res.status(400).json({ success: false, message: "Only confirmed appointments can be paid" });
    if (appointment.paymentStatus !== "unpaid") {
      return res.status(400).json({
        success: false,
        message: "Only unpaid appointments can be paid",
      });
    }
    const amount = toMinorUnits(appointment.servicePrice);
    if (amount === null) {
      return res.status(400).json({ success: false, message: "Appointment price is invalid" });
    }
    const service = await db.collection("services").findOne({ _id: appointment.serviceId });
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: STRIPE_CURRENCY,
          unit_amount: amount,
          product_data: { name: service?.serviceName || "SalonBook Appointment" },
        },
      }],
      metadata: { appointmentId: String(appointment._id), customerId: req.user.id },
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });
    res.status(200).json({ success: true, url: session.url, sessionId: session.id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to create checkout session" });
  }
};

export const stripeWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).json({ success: false, message: "Webhook is not configured" });
  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).json({ success: false, message: "Invalid Stripe webhook signature" });
  }
  if (!shouldProcessCheckoutEvent(event.type)) {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object;
  if (
    event.type === "checkout.session.completed"
    && session.payment_status !== "paid"
  ) {
    return res.status(200).json({ received: true, paymentPending: true });
  }
  const appointmentId = session.metadata?.appointmentId;
  const customerId = session.metadata?.customerId;
  if (
    session.mode !== "payment"
    || !appointmentId
    || !ObjectId.isValid(appointmentId)
    || !customerId
    || !session.id
  ) {
    return res.status(400).json({ success: false, message: "Invalid checkout session" });
  }

  const db = getDB();
  const appointment = await db.collection("appointments").findOne({ _id: new ObjectId(appointmentId) });
  if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
  if (String(appointment.customerId) !== String(customerId)) {
    return res.status(400).json({ success: false, message: "Checkout customer does not match appointment" });
  }
  const expectedAmount = toMinorUnits(appointment.servicePrice);
  if (event.type === "checkout.session.async_payment_failed") {
    if (!isFailedCheckoutSession(session, expectedAmount)) {
      return res.status(400).json({ success: false, message: "Failed checkout does not match the appointment" });
    }
    await db.collection("transactions").updateOne(
      { stripeSessionId: session.id },
      {
        $setOnInsert: {
          appointmentId: appointment._id,
          customerId,
          amount: session.amount_total / 100,
          currency: session.currency,
          stripeSessionId: session.id,
          status: "failed",
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
    return res.status(200).json({ received: true });
  }
  if (!isPaidCheckoutSession(session, expectedAmount)) {
    return res.status(400).json({ success: false, message: "Checkout payment does not match the appointment" });
  }

  await db.collection("appointments").updateOne(
    { _id: appointment._id },
    { $set: { paymentStatus: "paid" } },
  );
  await db.collection("transactions").updateOne(
    { stripeSessionId: session.id },
    {
      $set: {
        appointmentId: appointment._id,
        customerId,
        amount: session.amount_total / 100,
        currency: session.currency,
        stripeSessionId: session.id,
        status: "paid",
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );
  res.status(200).json({ received: true });
};
