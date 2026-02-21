import axios from "axios";

export const BASE_URL = (import.meta.env.VITE_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

export default axios.create({
  baseURL: BASE_URL + '/api',
  withCredentials: true,
});