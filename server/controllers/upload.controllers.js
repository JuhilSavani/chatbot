import { v2 as cloudinary } from "cloudinary";

const APP_NAME = "chatwithsidekick";

/**
 * @route   POST /api/upload/sign
 * @desc    Generate a Cloudinary upload signature for authenticated client-side uploads
 */
export const generateUploadSignature = (req, res) => {
  try {
    const userId = req.user.id;
    const folder = `${APP_NAME}/${userId}/docs`;
    const timestamp = Math.round(Date.now() / 1000);

    // Sign only the params that Cloudinary requires for validation
    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp, use_filename: true, unique_filename: true },
      process.env.CLOUDINARY_API_SECRET
    );

    res.status(200).json({
      signature,
      timestamp,
      folder,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (error) {
    console.error("Upload Signature Error:", error);
    res.status(500).json({ message: "Failed to generate upload signature." });
  }
};
