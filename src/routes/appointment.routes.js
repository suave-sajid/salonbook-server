import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";
import {
  createAppointment,
  getMyAppointments,
  cancelMyAppointment,
  getAllAppointments,
  updateAppointmentStatus,
} from "../controllers/appointment.controller.js";

const router = express.Router();

router.post("/", verifyToken, verifyRole("customer"), createAppointment);
router.get("/my", verifyToken, verifyRole("customer"), getMyAppointments);
router.patch("/:id/cancel", verifyToken, verifyRole("customer"), cancelMyAppointment);
router.get("/", verifyToken, verifyRole("admin"), getAllAppointments);
router.patch("/:id/status", verifyToken, verifyRole("admin"), updateAppointmentStatus);

export default router;
