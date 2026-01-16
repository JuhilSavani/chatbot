import express from "express";
import { 
  loadChatThreads, 
  chatWithModel, 
  loadChatHistory 
} from "../controllers/protected.controllers.js";

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

/**
 * @route   POST /api/chat/message
 * @desc    Send a message to the AI model within a specific thread
 */
router.post("/message", chatWithModel);

export default router;