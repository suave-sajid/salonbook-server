import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { getProfile, updateProfile } from "../controllers/profile.controller.js";

const router = express.Router();
router.get("/", verifyToken, getProfile);
router.patch("/", verifyToken, updateProfile);

export default router;
