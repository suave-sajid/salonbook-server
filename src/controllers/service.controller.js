
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

// Get all active services
export const getServices = async (req, res) => {
    try {
        const db = getDB();

        const { category, search, sort } = req.query;

        const filter = {
            status: "active",
        };

        if (category) {
            filter.category = category;
        }

        if (search) {
            filter.serviceName = {
                $regex: search,
                $options: "i",
            };
        }

        let sortOption = { createdAt: -1 };

        if (sort === "price-asc") {
            sortOption = { price: 1 };
        } else if (sort === "price-desc") {
            sortOption = { price: -1 };
        }

        const services = await db
            .collection("services")
            .find(filter)
            .sort(sortOption)
            .toArray();

        res.status(200).json({
            success: true,
            count: services.length,
            data: services,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve services",
        });
    }
};

// Get one active service by ID
export const getServiceById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID",
            });
        }

        const db = getDB();

        const service = await db.collection("services").findOne({
            _id: new ObjectId(id),
            status: "active",
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found",
            });
        }

        res.status(200).json({
            success: true,
            data: service,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve service",
        });
    }
};

export const createService = async (req, res) => {
  try {
    const { serviceName, category, description, price, duration, image, status } = req.body;
    if (!serviceName?.trim() || !category?.trim() || !description?.trim()) {
      return res.status(400).json({ success: false, message: "Service name, category, and description are required" });
    }
    if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ success: false, message: "Price must be a positive number" });
    }
    if (!Number.isFinite(Number(duration)) || Number(duration) <= 0) {
      return res.status(400).json({ success: false, message: "Duration must be a positive number" });
    }
    const document = {
      serviceName: serviceName.trim(),
      category: category.trim(),
      description: description.trim(),
      price: Number(price),
      duration: Number(duration),
      image: typeof image === "string" ? image : "",
      status: status === "inactive" ? "inactive" : "active",
      createdAt: new Date(),
    };
    const result = await getDB().collection("services").insertOne(document);
    res.status(201).json({ success: true, data: { ...document, _id: result.insertedId } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create service" });
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid service ID" });
    const allowed = ["serviceName", "category", "description", "price", "duration", "image", "status"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.price !== undefined && (!Number.isFinite(Number(updates.price)) || Number(updates.price) <= 0)) {
      return res.status(400).json({ success: false, message: "Price must be a positive number" });
    }
    if (updates.duration !== undefined && (!Number.isFinite(Number(updates.duration)) || Number(updates.duration) <= 0)) {
      return res.status(400).json({ success: false, message: "Duration must be a positive number" });
    }
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.duration !== undefined) updates.duration = Number(updates.duration);
    if (updates.status !== undefined) updates.status = updates.status === "inactive" ? "inactive" : "active";
    const result = await getDB().collection("services").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: "after" },
    );
    if (!result) return res.status(404).json({ success: false, message: "Service not found" });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update service" });
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid service ID" });
    const result = await getDB().collection("services").deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) return res.status(404).json({ success: false, message: "Service not found" });
    res.status(200).json({ success: true, message: "Service deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete service" });
  }
};

export const getAllServicesAdmin = async (req, res) => {
  const services = await getDB().collection("services").find({}).sort({ createdAt: -1 }).toArray();
  res.status(200).json({ success: true, data: services });
};
