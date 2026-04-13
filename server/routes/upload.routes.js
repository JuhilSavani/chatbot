import express from "express";
import { generateUploadSignature } from "../controllers/upload.controllers.js";

const router = express.Router();

import { signUploadRateLimiter } from "../middlewares/rateLimiter.middlewares.js";

/**
 * @route   POST /api/upload/sign
 * @desc    Generate a signed upload params for Cloudinary
 */
router.post("/sign", signUploadRateLimiter, generateUploadSignature);

export default router;
