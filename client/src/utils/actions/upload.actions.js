import axios from "../axios";

/**
 * Uploads a file to Cloudinary using a signed public upload.
 *
 * Flow:
 * 1. Request a signature from our backend
 * 2. Upload directly to Cloudinary using that signature
 *
 * @param {File} file - The file to upload
 * @returns {Promise<{public_id, secure_url, resource_type, original_filename, ...}>} Full Cloudinary response
 */
export async function uploadFileToCloudinary(file) {
  let signData;
  try {
    const response = await axios.post("/upload/sign");
    signData = response.data;
  } catch (e) {
    if (e.response && e.response.status === 429) {
      throw new Error(e.response.data?.message || "Monthly free limit reached.");
    }
    throw e;
  }
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

  // 3. Upload directly to Cloudinary (auto = handles all file types)
  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

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
