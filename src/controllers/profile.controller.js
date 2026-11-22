import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

const editableFields = new Set([
  "name",
  "image",
  "phoneNumber",
  "gender",
  "dateOfBirth",
  "city",
  "country",
]);
const genders = new Set(["female", "male", "non-binary", "prefer-not-to-say"]);

const getUserQuery = (id) => ObjectId.isValid(id)
  ? { $or: [{ _id: id }, { _id: new ObjectId(id) }] }
  : { _id: id };

const isValidDateOfBirth = (value) => {
  if (value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value
    && date <= new Date();
};

const invalid = (res, message) => res.status(400).json({ success: false, message });

export const getProfile = async (req, res) => {
  const db = getDB();
  const user = await db.collection("user").findOne(getUserQuery(req.user.id));
  if (!user) return res.status(404).json({ success: false, message: "Profile not found" });
  const {
    _id,
    name,
    email,
    image,
    role,
    isBlocked,
    phoneNumber,
    gender,
    dateOfBirth,
    city,
    country,
    createdAt,
  } = user;
  res.status(200).json({
    success: true,
    data: {
      _id,
      name: name || "",
      email: email || "",
      image: image || "",
      role: role || "customer",
      isBlocked: Boolean(isBlocked),
      phoneNumber: phoneNumber || "",
      gender: gender || "",
      dateOfBirth: dateOfBirth || "",
      city: city || "",
      country: country || "",
      createdAt: createdAt || null,
    },
  });
};

export const updateProfile = async (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return invalid(res, "A profile object is required.");
  }
  const fields = Object.keys(req.body);
  if (fields.some((field) => !editableFields.has(field))) {
    return invalid(res, "One or more profile fields cannot be changed.");
  }
  if (!fields.length) return invalid(res, "At least one profile field is required.");

  const updates = {};
  const { name, image, phoneNumber, gender, dateOfBirth, city, country } = req.body;

  if (Object.hasOwn(req.body, "name")) {
    if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
      return invalid(res, "Name must be between 1 and 100 characters.");
    }
    updates.name = name.trim();
  }
  if (Object.hasOwn(req.body, "image")) {
    if (image !== "" && image !== null) {
      if (typeof image !== "string" || image.length > 2048) {
        return invalid(res, "Profile image URL is invalid.");
      }
      try {
        if (!["http:", "https:"].includes(new URL(image).protocol)) {
          return invalid(res, "Profile image URL must use HTTP or HTTPS.");
        }
      } catch {
        return invalid(res, "Profile image URL is invalid.");
      }
    }
    updates.image = image || "";
  }
  if (Object.hasOwn(req.body, "phoneNumber")) {
    if (
      typeof phoneNumber !== "string"
      || phoneNumber.length > 30
      || !/^[+0-9().\-\s]*$/.test(phoneNumber)
      || (phoneNumber && phoneNumber.replace(/\D/g, "").length < 7)
      || phoneNumber.replace(/\D/g, "").length > 20
    ) {
      return invalid(res, "Enter a valid phone number.");
    }
    updates.phoneNumber = phoneNumber.trim();
  }
  if (Object.hasOwn(req.body, "gender")) {
    if (gender !== "" && !genders.has(gender)) return invalid(res, "Choose a valid gender option.");
    updates.gender = gender;
  }
  if (Object.hasOwn(req.body, "dateOfBirth")) {
    if (!isValidDateOfBirth(dateOfBirth)) return invalid(res, "Enter a valid date of birth.");
    updates.dateOfBirth = dateOfBirth;
  }
  for (const [field, value] of [["city", city], ["country", country]]) {
    if (Object.hasOwn(req.body, field)) {
      if (typeof value !== "string" || value.trim().length > 80) {
        return invalid(res, `${field === "city" ? "City" : "Country"} must be 80 characters or fewer.`);
      }
      updates[field] = value.trim();
    }
  }

  const db = getDB();
  const user = await db.collection("user").findOneAndUpdate(
    getUserQuery(req.user.id),
    { $set: updates },
    { returnDocument: "after" },
  );
  if (!user) return res.status(404).json({ success: false, message: "Profile not found" });
  res.status(200).json({ success: true, data: updates, message: "Profile updated successfully." });
};
