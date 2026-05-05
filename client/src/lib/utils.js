import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const devLog = (...args) => 
  import.meta.env.VITE_NODE_ENV === "development" && console.log(...args);