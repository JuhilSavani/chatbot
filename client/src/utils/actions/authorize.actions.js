import axios from "../axios"
import { handleAxiosError } from "../handleAxiosError"

export async function registerAction(data){
  try {
    const response = await axios.post("/authorize/register", data);
    return response.data;
  } catch (e) {
    console.error("Register Error:", e);
    return handleAxiosError(e, "Registration failed!");
  }
}

export async function loginAction(data){
  try {
    const response = await axios.post("/authorize/login", data);
    return response.data;
  } catch (e) {
    console.error("Login Error:", e);
    return handleAxiosError(e, "Login failed!");
  }
}

export async function forgotPasswordAction({ identifier }) {
  try {
    const response = await axios.post("/authorize/forgot-password", { identifier });
    return response.data;
  } catch (e) {
    console.error("Forgot Password Error:", e);
    return handleAxiosError(e, "Failed to send reset link!");
  }
}

export async function resetPasswordAction(data) {
  try {
    const response = await axios.post("/authorize/reset-password", data);
    return response.data;
  } catch (e) {
    console.error("Reset Password Error:", e);
    return handleAxiosError(e, "Failed to reset password!");
  }
}

export async function resendVerificationAction({ identifier }) {
  try {
    const response = await axios.post("/authorize/resend-verification", { identifier });
    return response.data;
  } catch (e) {
    console.error("Resend Verification Error:", e);
    return handleAxiosError(e, "Failed to resend verification email!");
  }
}