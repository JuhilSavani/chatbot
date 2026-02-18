import { Supermemory } from "supermemory";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.SUPERMEMORY_API_KEY;

if (!apiKey) {
  console.warn("⚠️ SUPERMEMORY_API_KEY is not set in environment variables. Supermemory features will be disabled.");
}

// Export a real client if key exists, otherwise a mock client to prevent crashes
export const supermemory = apiKey 
  ? new Supermemory({ apiKey: apiKey })
  : {
      profile: async () => ({ profile: { static: [], dynamic: [] } }),
      add: async () => console.warn("Supermemory: 'add' called but no API key is set."),
      search: {
        memories: async () => ({ results: [] })
      }
    };
