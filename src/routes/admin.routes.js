import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";
import {
  getDashboard,
  getUsers,
  setUserBlocked,
  getTransactions,
} from "../controllers/admin.controller.js";
import {
  getAllServicesAdmin,
  createService,
  updateService,
  deleteService,
} from "../controllers/service.controller.js";

const router = express.Router();
router.use(verifyToken, verifyRole("admin"));

router.get("/dashboard", getDashboard);
router.get("/users", getUsers);
router.patch("/users/:id/block", setUserBlocked);
router.get("/transactions", getTransactions);
router.get("/services", getAllServicesAdmin);
router.post("/services", createService);
router.patch("/services/:id", updateService);
router.delete("/services/:id", deleteService);

export default router;
