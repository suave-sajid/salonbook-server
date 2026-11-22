import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { getAllowedPreviousStatuses } from "../utils/appointment-status.js";

const asObjectId = (value) => ObjectId.isValid(value) ? new ObjectId(value) : null;

export const createAppointment = async (req, res) => {
  try {
    const { serviceId, appointmentDate, timeSlot, message = "" } = req.body;
    if (!ObjectId.isValid(serviceId) || !appointmentDate || !timeSlot) {
      return res.status(400).json({ success: false, message: "Service, date, and time slot are required" });
    }
    const db = getDB();
    const service = await db.collection("services").findOne({ _id: new ObjectId(serviceId), status: "active" });
    if (!service) return res.status(404).json({ success: false, message: "Active service not found" });

    const date = new Date(`${appointmentDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: "Invalid appointment date" });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return res.status(400).json({ success: false, message: "Appointment date cannot be in the past" });

    const duplicate = await db.collection("appointments").findOne({
      appointmentDate,
      timeSlot,
      status: { $in: ["pending", "confirmed"] },
    });
    if (duplicate) return res.status(409).json({ success: false, message: "You already have an active appointment in this time slot" });

    const appointment = {
      serviceId: new ObjectId(serviceId),
      customerId: req.user.id,
      appointmentDate,
      timeSlot,
      message: String(message).trim(),
      servicePrice: Number(service.price),
      paymentStatus: "unpaid",
      status: "pending",
      createdAt: new Date(),
    };
    const result = await db.collection("appointments").insertOne(appointment);
    res.status(201).json({ success: true, data: { ...appointment, _id: result.insertedId } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create appointment" });
  }
};

export const getMyAppointments = async (req, res) => {
  const db = getDB();
  const appointments = await db.collection("appointments").find({ customerId: req.user.id }).sort({ createdAt: -1 }).toArray();
  const serviceIds = [...new Set(appointments.map((item) => String(item.serviceId)))].map((id) => asObjectId(id)).filter(Boolean);
  const services = await db.collection("services").find({ _id: { $in: serviceIds } }).toArray();
  const serviceMap = new Map(services.map((item) => [String(item._id), item]));
  res.status(200).json({
    success: true,
    data: appointments.map((item) => ({ ...item, service: serviceMap.get(String(item.serviceId)) || null })),
  });
};

export const cancelMyAppointment = async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid appointment ID" });
  const db = getDB();
  const appointment = await db.collection("appointments").findOne({ _id: new ObjectId(id), customerId: req.user.id });
  if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
  if (appointment.status !== "pending") return res.status(400).json({ success: false, message: "Only pending appointments can be cancelled" });
  await db.collection("appointments").updateOne({ _id: appointment._id }, { $set: { status: "cancelled" } });
  res.status(200).json({ success: true, message: "Appointment cancelled" });
};

export const getAllAppointments = async (req, res) => {
  const db = getDB();
  const appointments = await db.collection("appointments").find({}).sort({ createdAt: -1 }).toArray();
  const serviceIds = [...new Set(appointments.map((item) => String(item.serviceId)))].map(asObjectId).filter(Boolean);
  const customerIds = [...new Set(appointments.map((item) => item.customerId))];
  const customerObjectIds = customerIds.map(asObjectId).filter(Boolean);
  const [services, stringCustomers, objectCustomers] = await Promise.all([
    db.collection("services").find({ _id: { $in: serviceIds } }).toArray(),
    db.collection("user").find({ _id: { $in: customerIds } }).toArray(),
    db.collection("user").find({ _id: { $in: customerObjectIds } }).toArray(),
  ]);
  const userMap = new Map([...stringCustomers, ...objectCustomers].map((item) => [String(item._id), item]));
  const serviceMap = new Map(services.map((item) => [String(item._id), item]));
  res.status(200).json({
    success: true,
    data: appointments.map((item) => ({
      ...item,
      service: serviceMap.get(String(item.serviceId)) || null,
      customer: userMap.get(String(item.customerId)) || null,
    })),
  });
};

export const updateAppointmentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid appointment ID" });
  const allowedPreviousStatuses = getAllowedPreviousStatuses(status);
  if (!allowedPreviousStatuses.length) return res.status(400).json({ success: false, message: "Invalid appointment status" });
  const db = getDB();
  const appointmentId = new ObjectId(id);
  const result = await db.collection("appointments").updateOne(
    { _id: appointmentId, status: { $in: allowedPreviousStatuses } },
    { $set: { status } },
  );
  if (result.matchedCount) {
    return res.status(200).json({ success: true, message: `Appointment ${status}` });
  }

  const appointment = await db.collection("appointments").findOne({ _id: appointmentId });
  if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
  return res.status(400).json({
    success: false,
    message: status === "confirmed"
      ? "Only pending appointments can be confirmed"
      : "Only pending or confirmed appointments can be cancelled",
  });
};
