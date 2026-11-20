import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";
import { createCheckoutSession } from "../controllers/payment.controller.js";

const router = express.Router();
router.post("/checkout", verifyToken, verifyRole("customer"), createCheckoutSession);

export default router;
