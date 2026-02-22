import { Supermemory } from "supermemory";
import dotenv from "dotenv";

dotenv.config();

const SUPERMEMORY_API_KEY = process.env.SUPERMEMORY_API_KEY;

if (!SUPERMEMORY_API_KEY) {
  console.warn("⚠️ SUPERMEMORY_API_KEY is not set in environment variables. Supermemory features will be disabled.");
}

// Export a real client if key exists, otherwise a mock client to prevent crashes
export const supermemory = SUPERMEMORY_API_KEY 
  ? new Supermemory({ apiKey: SUPERMEMORY_API_KEY })
  : {
      profile: async () => ({ profile: { static: [], dynamic: [] } }),
      add: async () => console.warn("Supermemory: 'add' called but no API key is set."),
      search: {
        memories: async () => ({ results: [] })
      }
    };

// ---------------------------------------------------------------------------
// Pending Memory Buffer
// Bridges the gap between supermemory.add() returning and the content actually
// being indexed & retrievable via supermemory.profile(). Without this, a new
// chat started within seconds of saving a memory will miss it.
// ---------------------------------------------------------------------------
const pendingMemories = new Map(); // userId -> [{ content, addedAt }]
const BUFFER_TTL_MS = 90_000;     // 90 seconds — generous window for indexing

/**
 * Cache a raw interaction locally so it's available before Supermemory indexes it.
 */
export function bufferMemory(userId, content) {
  if (!pendingMemories.has(userId)) {
    pendingMemories.set(userId, []);
  }
  pendingMemories.get(userId).push({ content, addedAt: Date.now() });
}

/**
 * Return any buffered interactions that haven't expired yet.
 * Expired entries are cleaned up on every read.
 */
export function getPendingMemories(userId) {
  if (!pendingMemories.has(userId)) return [];

  const now = Date.now();
  const entries = pendingMemories.get(userId).filter(
    entry => now - entry.addedAt < BUFFER_TTL_MS
  );

  if (entries.length === 0) {
    pendingMemories.delete(userId);
  } else {
    pendingMemories.set(userId, entries);
  }

  return entries.map(e => e.content);
}
