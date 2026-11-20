import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

export const getProfile = async (req, res) => {
  const db = getDB();
  const query = ObjectId.isValid(req.user.id)
    ? { $or: [{ _id: req.user.id }, { _id: new ObjectId(req.user.id) }] }
    : { _id: req.user.id };
  const user = await db.collection("user").findOne(query);
  if (!user) return res.status(404).json({ success: false, message: "Profile not found" });
  const { _id, name, email, image, role, isBlocked, phoneNumber } = user;
  res.status(200).json({ success: true, data: { _id, name, email, image, role, isBlocked: Boolean(isBlocked), phoneNumber: phoneNumber || "" } });
};

export const updateProfile = async (req, res) => {
  const { name, image, phoneNumber } = req.body;
  const updates = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof image === "string") updates.image = image;
  if (typeof phoneNumber === "string") updates.phoneNumber = phoneNumber.trim();
  if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: "No permitted profile fields provided" });
  const db = getDB();
  const query = ObjectId.isValid(req.user.id)
    ? { $or: [{ _id: req.user.id }, { _id: new ObjectId(req.user.id) }] }
    : { _id: req.user.id };
  const user = await db.collection("user").findOneAndUpdate(query, { $set: updates }, { returnDocument: "after" });
  if (!user) return res.status(404).json({ success: false, message: "Profile not found" });
  res.status(200).json({ success: true, data: updates });
};
