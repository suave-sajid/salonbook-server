
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
