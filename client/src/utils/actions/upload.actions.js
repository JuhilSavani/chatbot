import axios from "../axios";

/**
 * Uploads a PDF file to Cloudinary using signed upload.
 * 
 * Flow:
 * 1. Request a signature from our backend
 * 2. Upload directly to Cloudinary using that signature
 * 
 * @param {File} file - The PDF file to upload
 * @returns {Promise<{secure_url, public_id, ...}>} Cloudinary response
 */
export async function uploadPdfToCloudinary(file) {
  // 1. Get signature from our backend
  const { data: signData } = await axios.post("/upload/sign");
  const { signature, timestamp, folder, apiKey, cloudName } = signData;

  // 2. Build FormData for Cloudinary's upload API
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", folder);
  formData.append("use_filename", "true");
  formData.append("unique_filename", "true");

  // 3. Upload directly to Cloudinary (raw = non-image/video files like PDFs)
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;

  const response = await fetch(cloudinaryUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Cloudinary upload failed (${response.status})`);
  }

  return response.json();
}
