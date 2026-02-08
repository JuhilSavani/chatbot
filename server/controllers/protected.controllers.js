import { workflow, chatModel } from "../config/workflow.config.js";
import { HumanMessage } from "@langchain/core/messages";
import { Thread } from "../models/thread.models.js";

export const loadChatThreads = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) 
      return res.status(401).json({ message: "Unauthorized: User not authenticated" });

    const threads = await Thread.findAll({
      where: { userId },
      order: [
        ['isPinned', 'DESC'], // Pinned threads first
        ['updatedAt', 'DESC']
      ],
      attributes: ['threadId', 'title', 'updatedAt', 'isPinned'] // Map title to threadName in frontend if needed, or stick to threadName
    });

    // Map to match expected frontend format
    const formattedThreads = threads.map(t => ({
      threadId: t.threadId,
      threadName: t.title,
      updatedAt: t.updatedAt,
      isPinned: t.isPinned
    }));

    res.json({ threads: formattedThreads });
  } catch (error) {
    console.error("Error loading threads:", error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const chatWithModel = async (req, res) => {
  try {
    const { message, threadId } = req.body;
    
    // We are sure that user is authenticated because of the auth middleware
    const userId = req.user.id;

    if (!message || !threadId) 
      return res.status(400).json({ message: "message and threadId are required" });

    // 1. Define configuration for persistence
    const config = { configurable: { thread_id: threadId } };

    // 2. Check if this is the first message (or if thread exists in DB)
    // We'll trust our DB. If it's not in DB, it's effectively new for us.
    let thread = await Thread.findOne({ where: { threadId } });
    
    // Create if not exists (handling the case where user starts a fresh chat)
    const isNewThread = !thread;
    if (isNewThread) {
      thread = await Thread.create({
        threadId,
        userId
      });
    }

    // 3. Check whether the thread belongs to the user
    if(!isNewThread && thread.userId !== userId) 
      return res.status(403).json({ message: "Forbidden: You don't have access to this thread." });

    // 4. Run the graph
    const inputs = { messages: [new HumanMessage(message)] };
    const result = await workflow.invoke(inputs, config);

    // 5. Extract the last AI response
    const lastMessage = result.messages[result.messages.length - 1];

    // 6. Update thread name if it's a new thread
    if (isNewThread) {
      thread.title = await generateThreadName(message, lastMessage.content);
      await thread.save();
    } else {
      thread.changed('updatedAt', true); // Force update timestamp
      await thread.save();
    }

    res.json({ 
      threadName: thread.title,
      response: lastMessage.content,
    });

  } catch (error) {
    console.error("Error in chat endpoint:", error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const loadChatHistory = async (req, res) => {
  try {
    const { threadId } = req.params;

    // Check whether the thread belongs to the user
    const thread = await Thread.findOne({ where: { threadId } });
    if (!thread || thread.userId !== req.user.id) 
      return res.status(403).json({ message: "Forbidden: You don't have access to this thread." });

    const config = { configurable: { thread_id: threadId } };

    // Get the current state of the thread
    const state = await workflow.getState(config);

    if (!state.values || !state.values.messages) 
      return res.json({ messages: [], threadName: thread.title });

    // Format messages for the client
    const history = state.values.messages.map((msg) => {
      const type = msg._getType();
      return {
        role: type === 'human' ? 'user' : 'assistant',
        content: msg.content,
      };
    });

    res.json({ messages: history, threadName: thread.title });

  } catch (error) {
    console.error("Error fetching history:", error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// Helper function to generate a thread name based on the first message
async function generateThreadName(userMessage, aiResponse) {
  try {
    // Option 1: Use a simple LLM call to generate a concise title
    const titlePrompt = `
      Based on this conversation, generate a short, descriptive title (max 6 words):

      User: ${userMessage}
      Assistant: ${aiResponse}

      Generate only the title, nothing else.
    `;

    const titleResult = await chatModel.invoke([ new HumanMessage(titlePrompt) ]);

    const title = titleResult.content
      .trim()
      .replace(/^["']|["']$/g, '') // Remove quotes if present
      .substring(0, 60); // Max 60 characters
    
    return title || generateFallbackName(userMessage);
    
  } catch (error) {
    console.error("Error generating thread name:", error);
    return generateFallbackName(userMessage);
  }
}

export const setPinStatus = async (req, res) => {
  try {
    const { threadId, action } = req.params;
    const userId = req.user.id;

    if (!['pin', 'unpin'].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use 'pin' or 'unpin'." });
    }

    const thread = await Thread.findOne({ where: { threadId, userId } });

    if (!thread) {
      return res.status(404).json({ message: "Thread not found or unauthorized." });
    }

    thread.isPinned = (action === 'pin');
    await thread.save();

    res.json({ 
      message: `Thread ${action}ned successfully`, 
      threadId, 
      isPinned: thread.isPinned 
    });

  } catch (error) {
    console.error("Error updating pin status:", error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Fallback: Generate a simple name from the first message
function generateFallbackName(message) {
  // Take first 50 characters and add ellipsis if needed
  const cleanMessage = message.trim().substring(0, 50);
  return cleanMessage.length < message.trim().length 
    ? `${cleanMessage}...` 
    : cleanMessage;
}