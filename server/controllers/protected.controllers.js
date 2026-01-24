import { workflow, chatModel } from "../config/workflow.config.js";
import { HumanMessage } from "@langchain/core/messages";

export const loadChatThreads = async (req, res) => {
  try {
    const checkpointer = workflow.checkpointer;

    if (!checkpointer) 
      return res.status(500).json({ message: "No checkpointer configured on workflow" });

    const threads = [];
    const seenThreadIds = new Set();

    // List all threads. NOTE: list() returns an async generator in most checkpointers.
    for await (const checkpoint of checkpointer.list({})) {
      const threadId = checkpoint.config.configurable.thread_id;
      
      // Skip if we've already seen this thread
      if (seenThreadIds.has(threadId)) continue;
      
      seenThreadIds.add(threadId);
      threads.push({
        threadId: threadId,
        threadName: checkpoint.checkpoint?.channel_values?.threadName || "Untitled Chat",
        updatedAt: checkpoint.checkpoint?.ts || checkpoint.metadata?.ts || null,
      });
    }
    res.json({ threads });
  } catch (error) {
    console.error("Error loading threads:", error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const chatWithModel = async (req, res) => {
  try {
    const { message, threadId } = req.body;

    if (!message || !threadId) 
      return res.status(400).json({ message: "message and threadId are required" });

    // 1. Define configuration for persistence
    const config = { configurable: { thread_id: threadId } };

    // 2. Check if this is the first message in the thread
    let isFirstMessage = false;
    try {
      const state = await workflow.getState(config);
      isFirstMessage = !state.values || !state.values.messages || state.values.messages.length === 0;
    } catch (error) {
      // If state doesn't exist, it's the first message
      isFirstMessage = true;
    }

    // 3. Run the graph
    const inputs = { messages: [new HumanMessage(message)] };
    const result = await workflow.invoke(inputs, config);

    // 4. Extract the last AI response
    const lastMessage = result.messages[result.messages.length - 1];
    
    // 5. Generate thread name if this is the first message
    let threadName = result.threadName || null;
    if (isFirstMessage) {
      threadName = await generateThreadName(message, lastMessage.content);
      await workflow.updateState(config, { threadName: threadName });
    }

    res.json({ 
      threadId: threadId,
      threadName: threadName,
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

    const config = { configurable: { thread_id: threadId } };

    // Get the current state of the thread
    const state = await workflow.getState(config);

    if (!state.values || !state.values.messages) {
      return res.json({ messages: [], threadName: "Untitled Chat" });
    }

    // Format messages for the client
    const history = state.values.messages.map((msg) => {
      const type = msg._getType();
      return {
        role: type === 'human' ? 'user' : 'assistant',
        content: msg.content,
      };
    });

    res.json({ 
      messages: history,
      threadName: state.values.threadName || "Untitled Chat"
    });

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

// Fallback: Generate a simple name from the first message
function generateFallbackName(message) {
  // Take first 50 characters and add ellipsis if needed
  const cleanMessage = message.trim().substring(0, 50);
  return cleanMessage.length < message.trim().length 
    ? `${cleanMessage}...` 
    : cleanMessage;
}