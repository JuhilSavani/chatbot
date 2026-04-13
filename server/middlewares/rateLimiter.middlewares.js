import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import "dotenv/config";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 5 requests per 30 days
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.fixedWindow(5, "30 d"),
});

export const chatQueryRateLimiter = async (req, res, next) => {
  try {
    // Identifier is user ID since routes are authenticated
    const identifier = req.user?.id || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    
    // limit 5 agent queries
    const { success, limit, remaining, reset } = await ratelimit.limit(`sidekick:query_${identifier}`);

    res.set("X-RateLimit-Limit", limit);
    res.set("X-RateLimit-Remaining", remaining);
    res.set("X-RateLimit-Reset", reset);

    req.ratelimit = { success, limit, remaining, reset };

    if (!success) {
      return res.status(429).json({ error: "Monthly free limit reached. 0 uses remaining." });
    }
    
    next();
  } catch (error) {
    console.error("Rate Limiter Error:", error);
    next();
  }
};

export const signUploadRateLimiter = async (req, res, next) => {
  try {
    const identifier = req.user?.id || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const { success, limit, remaining, reset } = await ratelimit.limit(`sidekick:upload_${identifier}`);

    res.set("X-RateLimit-Limit", limit);
    res.set("X-RateLimit-Remaining", remaining);
    res.set("X-RateLimit-Reset", reset);

    if (!success) {
      return res.status(429).json({ message: "Monthly free limit reached." }); // Matches how frontend intercepts it
    }
    next();
  } catch (error) {
    console.error("Rate Limiter Error:", error);
    next();
  }
};
