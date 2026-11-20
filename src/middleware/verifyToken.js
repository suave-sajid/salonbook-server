import { createRemoteJWKSet, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

const authURL = process.env.BETTER_AUTH_URL;

const JWKS = createRemoteJWKSet(
  new URL(`${authURL}/api/auth/jwks`)
);


export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: authURL,
      audience: authURL,
    });

    const db = getDB();
    const candidates = [{ _id: payload.sub }];
    if (/^[a-f\d]{24}$/i.test(payload.sub)) {
      candidates.push({ _id: new ObjectId(payload.sub) });
    }
    const user = await db.collection("user").findOne({
      $or: candidates,
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "Forbidden: Your account is blocked" });
    }

    req.user = {
      id: String(user._id),
      email: user.email,
      role: user.role || "customer",
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token",
    });
  }
};