import axios from "axios";

let BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:4000";
BASE_URL = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

export default axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});