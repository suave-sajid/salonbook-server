import Stripe from "stripe";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

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
    if (appointment.paymentStatus === "paid") return res.status(400).json({ success: false, message: "Appointment is already paid" });

    const service = await db.collection("services").findOne({ _id: appointment.serviceId });
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "bdt",
          unit_amount: Math.round(Number(appointment.servicePrice) * 100),
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
  if (event.type !== "checkout.session.completed") return res.status(200).json({ received: true });

  const session = event.data.object;
  const appointmentId = session.metadata?.appointmentId;
  const customerId = session.metadata?.customerId;
  if (
    session.mode !== "payment"
    || session.payment_status !== "paid"
    || !appointmentId
    || !ObjectId.isValid(appointmentId)
    || !customerId
  ) {
    return res.status(400).json({ success: false, message: "Invalid or unpaid checkout session" });
  }

  const db = getDB();
  const appointment = await db.collection("appointments").findOne({ _id: new ObjectId(appointmentId) });
  if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
  if (String(appointment.customerId) !== String(customerId)) {
    return res.status(400).json({ success: false, message: "Checkout customer does not match appointment" });
  }

  await db.collection("appointments").updateOne(
    { _id: appointment._id },
    { $set: { paymentStatus: "paid" } },
  );
  await db.collection("transactions").updateOne(
    { stripeSessionId: session.id },
    {
      $setOnInsert: {
        appointmentId: appointment._id,
        customerId,
        amount: session.amount_total ? session.amount_total / 100 : Number(appointment.servicePrice),
        currency: (session.currency || "usd").toLower(),
        stripeSessionId: session.id,
        status: "paid",
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  res.status(200).json({ received: true });
};
