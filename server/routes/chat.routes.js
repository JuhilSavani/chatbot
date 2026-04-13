import express from "express";
import { 
  loadChatThreads, 
  chatWithModel, 
  chatWithModelStream,
  ingestDocuments,
  loadChatHistory,

  setPinStatus,
  deleteThread
} from "../controllers/chat.controllers.js";

const router = express.Router();

/**
 * @route   GET /api/chat/threads
 * @desc    Get all existing chat thread IDs and metadata
 */
router.get("/threads", loadChatThreads);

/**
 * @route   GET /api/chat/:threadId
 * @desc    Retrieve full message history for a specific thread
 */
router.get("/:threadId", loadChatHistory);

import { chatQueryRateLimiter } from "../middlewares/rateLimiter.middlewares.js";

/**
 * @route   POST /api/chat/message
 * @desc    Send a message to the AI model within a specific thread
 */
router.post("/message", chatQueryRateLimiter, chatWithModel);

/**
 * @route   POST /api/chat/stream
 * @desc    Stream a response from the AI model token-by-token via SSE
 */
router.post("/stream", chatQueryRateLimiter, chatWithModelStream);

/**
 * @route   POST /api/chat/ingest
 * @desc    Ingest PDF documents and extract text before chatting
 */
router.post("/ingest", ingestDocuments);

/**
 * @route   PUT /api/chat/pin/:threadId/:action
 * @desc    Pin or unpin a thread
 */
router.put("/pin/:threadId/:action", setPinStatus);

/**
 * @route   DELETE /api/chat/:threadId
 * @desc    Delete a specific chat thread
 */
router.delete("/:threadId", deleteThread);

export default router;