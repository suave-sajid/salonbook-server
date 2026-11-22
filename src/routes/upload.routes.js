import express from "express";
import multer from "multer";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyRole } from "../middleware/verifyRole.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return callback(new Error("Unsupported image type"));
    }
    callback(null, true);
  },
});

router.post("/image", verifyToken, verifyRole("admin"), upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Image file is required" });
    if (!process.env.IMGBB_API_KEY) return res.status(503).json({ success: false, message: "Image hosting is not configured" });
    const body = new URLSearchParams();
    body.set("key", process.env.IMGBB_API_KEY);
    body.set("image", req.file.buffer.toString("base64"));
    const response = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body });
    const result = await response.json();
    if (!response.ok || !result.success) return res.status(502).json({ success: false, message: "Image upload failed" });
    res.status(200).json({ success: true, url: result.data.url });
  } catch (error) {
    res.status(500).json({ success: false, message: "Image upload failed" });
  }
});

export default router;
