import axios from "axios";

export const BASE_URL = (import.meta.env.VITE_BASE_URL || "http://localhost:4000").replace(/\/$/, "") + "/api";

export default axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});