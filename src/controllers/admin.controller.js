import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

export const getDashboard = async (req, res) => {
  const db = getDB();
  const [
    totalCustomers,
    activeServices,
    totalAppointments,
    pendingAppointments,
    confirmedAppointments,
    successfulPayments,
  ] = await Promise.all([
    db.collection("user").countDocuments({ role: { $ne: "admin" } }),
    db.collection("services").countDocuments({ status: "active" }),
    db.collection("appointments").countDocuments({}),
    db.collection("appointments").countDocuments({ status: "pending" }),
    db.collection("appointments").countDocuments({ status: "confirmed" }),
    db.collection("transactions").countDocuments({ status: "paid" }),
  ]);
  res.status(200).json({
    success: true,
    data: { totalCustomers, activeServices, totalAppointments, pendingAppointments, confirmedAppointments, successfulPayments },
  });
};

export const getUsers = async (req, res) => {
  const users = await getDB().collection("user").find({ role: { $ne: "admin" } }).toArray();
  res.status(200).json({
    success: true,
    data: users.map(({ _id, name, email, image, role, isBlocked, phoneNumber, gender, dateOfBirth, city, country, createdAt }) => ({
      _id, name, email, image, role, isBlocked: Boolean(isBlocked), phoneNumber, gender, dateOfBirth, city, country, createdAt,
    })),
  });
};

export const setUserBlocked = async (req, res) => {
  const { id } = req.params;
  const { isBlocked } = req.body;
  if (typeof isBlocked !== "boolean") return res.status(400).json({ success: false, message: "isBlocked must be a boolean" });
  const db = getDB();
  const query = ObjectId.isValid(id) ? { $or: [{ _id: id }, { _id: new ObjectId(id) }] } : { _id: id };
  const result = await db.collection("user").findOneAndUpdate(query, { $set: { isBlocked } }, { returnDocument: "after" });
  if (!result) return res.status(404).json({ success: false, message: "User not found" });
  res.status(200).json({ success: true, message: isBlocked ? "User blocked" : "User unblocked" });
};

export const getTransactions = async (req, res) => {
  const db = getDB();
  const transactions = await db.collection("transactions").find({}).sort({ createdAt: -1 }).toArray();
  const appointmentIds = [...new Set(transactions.map((item) => String(item.appointmentId)))].map((id) => ObjectId.isValid(id) ? new ObjectId(id) : null).filter(Boolean);
  const customerIds = [...new Set(transactions.map((item) => item.customerId))];
  const [appointments, stringUsers, objectUsers] = await Promise.all([
    db.collection("appointments").find({ _id: { $in: appointmentIds } }).toArray(),
    db.collection("user").find({ _id: { $in: customerIds } }).toArray(),
    db.collection("user").find({ _id: { $in: customerIds.map((id) => ObjectId.isValid(id) ? new ObjectId(id) : null).filter(Boolean) } }).toArray(),
  ]);
  const serviceIds = [...new Set(
    appointments
      .map((item) => String(item.serviceId))
      .filter((id) => ObjectId.isValid(id)),
  )].map((id) => new ObjectId(id));
  const services = await db.collection("services").find({ _id: { $in: serviceIds } }).toArray();
  const appointmentMap = new Map(appointments.map((item) => [String(item._id), item]));
  const userMap = new Map([...stringUsers, ...objectUsers].map((item) => [String(item._id), item]));
  const serviceMap = new Map(services.map((item) => [String(item._id), item]));
  res.status(200).json({
    success: true,
    data: transactions.map((item) => {
      const appointment = appointmentMap.get(String(item.appointmentId));
      return {
        ...item,
        appointment: appointment
          ? {
            ...appointment,
            service: serviceMap.get(String(appointment.serviceId)) || null,
          }
          : null,
        customer: userMap.get(String(item.customerId)) || null,
      };
    }),
  });
};
