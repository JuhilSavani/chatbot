import express from "express";
import { 
  loadChatThreads, 
  chatWithModel, 
  chatWithModelStream,
  loadChatHistory,

  setPinStatus,
  deleteThread
} from "../controllers/protected.controllers.js";

const router = express.Router();

/**
 * @route   GET /api/protected/chat/threads
 * @desc    Get all existing chat thread IDs and metadata
 */
router.get("/chat/threads", loadChatThreads);

/**
 * @route   GET /api/protected/chat/:threadId
 * @desc    Retrieve full message history for a specific thread
 */
router.get("/chat/:threadId", loadChatHistory);

/**
 * @route   POST /api/protected/chat/message
 * @desc    Send a message to the AI model within a specific thread
 */
router.post("/chat/message", chatWithModel);

/**
 * @route   POST /api/protected/chat/stream
 * @desc    Stream a response from the AI model token-by-token via SSE
 */
router.post("/chat/stream", chatWithModelStream);

/**
 * @route   PUT /api/protected/chat/pin/:threadId/:action
 * @desc    Pin or unpin a thread
 */
router.put("/chat/pin/:threadId/:action", setPinStatus);

/**
 * @route   DELETE /api/protected/chat/:threadId
 * @desc    Delete a specific chat thread
 */
router.delete("/chat/:threadId", deleteThread);

export default router;