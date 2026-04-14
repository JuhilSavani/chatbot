import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function resetUpstashRateLimits() {
  console.log("⏳ Resetting upstash rate limits...");

  try {
    // 1. Get all keys starting with "sidekick:"
    // Note: Upstash Redis SCAN or KEYS can be used.
    // FLUSHDB is faster but will clear everything in the database.
    // If you only want to clear the app's keys, we scan for them.
    
    const keys = await redis.keys("@upstash/ratelimit:sidekick:*");
    
    if (keys.length === 0) {
      console.log("📍 No keys matching '@upstash/ratelimit:sidekick:*' found. Redis is already clean.");
      return;
    }

    console.log(`📍 Found ${keys.length} keys to delete.`);
    
    // Upstash handles batching internally if we pass an array to del
    await redis.del(...keys);
    
    console.log("✅ Successfully deleted all keys matching '@upstash/ratelimit:sidekick:*'.");

  } catch (error) {
    console.error("❌ Error resetting upstash rate limits:", error.message);
    process.exit(1);
  }
}

resetUpstashRateLimits();
