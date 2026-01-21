import express from "express";
import { 
  loadChatThreads, 
  chatWithModel, 
  loadChatHistory 
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

export default router;