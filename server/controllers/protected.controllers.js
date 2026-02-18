import { workflow, chatModel } from "../config/workflow.config.js";
import { HumanMessage } from "@langchain/core/messages";
import { Thread } from "../models/thread.models.js";
import { sequelize } from "../config/sequelize.config.js";
import { QueryTypes } from 'sequelize';
import { supermemory, bufferMemory, getPendingMemories } from "../config/supermemory.config.js";

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
    // Fetch User Profile from Supermemory
    let userProfile = { static: [], dynamic: [] };
    try {
      const profileData = await supermemory.profile({ containerTag: userId });
      if (profileData && profileData.profile) {
        userProfile = {
          static: profileData.profile.static || [],
          dynamic: profileData.profile.dynamic || []
        };
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err.message);
    }

    const pendingContext = getPendingMemories(userId);
    
    const config = { 
      configurable: { 
        thread_id: threadId,
        userProfile: userProfile,
        pendingMemories: pendingContext
      } 
    };

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

    // 7. Store interaction in Supermemory (Fire & Forget) + buffer locally
    const memoryContent = `User: ${message}\nAssistant: ${lastMessage.content}`;
    bufferMemory(userId, memoryContent);
    await supermemory.add({
      content: memoryContent,
      containerTag: userId
    }).catch(err => console.error("Failed to save memory:", err.message));

  } catch (error) {
    console.error("Error in chat endpoint:", error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

/**
 * SSE Streaming endpoint using LangGraph's streamEvents
 * Sends token-by-token updates to the client in real-time
 */
export const chatWithModelStream = async (req, res) => {
  const { message, threadId, web_search } = req.body;
  const userId = req.user.id;

  // Validation
  if (!message || !threadId) {
    return res.status(400).json({ message: "message and threadId are required" });
  }

  // 1. Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  
  // Create controller and listen for client disconnect
  const controller = new AbortController();
  
  // If the user closes the tab or cancels the request, abort the graph
  res.on('close', () => {
    controller.abort();
  });

  let fullResponse = "";

  try {
    // 2. Thread setup (same as non-streaming)
    let thread = await Thread.findOne({ where: { threadId } });
    
    const isNewThread = !thread;
    if (isNewThread) {
      thread = await Thread.create({ threadId, userId });
    }

    if (!isNewThread && thread.userId !== userId) {
      res.write(`data: ${JSON.stringify({ type: "error", val: "Forbidden: You don't have access to this thread." })}\n\n`);
      return; // Stop here! The 'finally' block below will take care of [DONE] and res.end()
    }

    // 2.5 Fetch User Profile
    let userProfile = { static: [], dynamic: [] };
    try {
      const profileData = await supermemory.profile({ containerTag: userId });
      if (profileData && profileData.profile) {
        userProfile = {
          static: profileData.profile.static || [],
          dynamic: profileData.profile.dynamic || []
        };
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err.message);
    }

    const pendingContext = getPendingMemories(userId);

    // 3. Start the stream with streamEvents v2
    const inputs = { messages: [new HumanMessage(message)] };
    const stream = await workflow.streamEvents(inputs, { 
      configurable: { 
        thread_id: threadId, 
        signal: controller.signal,
        web_search, // Pass tools forcing here (boolean)
        userProfile, // Pass profile here
        pendingMemories: pendingContext
      },
      version: "v2",
    });

    // 4. Iterate and filter events
    for await (const event of stream) {
      // Token from the LLM
      if (event.event === "on_chat_model_stream") {
        const content = event.data.chunk?.content;
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ 
            type: "token", 
            val: content 
          })}\n\n`);
        }
      }
      // Tool start
      else if (event.event === "on_tool_start") {
        // event.data.input is the raw input object
        res.write(`data: ${JSON.stringify({ 
          type: "tool_start", 
          runId: event.run_id,
          tool: event.name,
          input: event.data.input 
        })}\n\n`);
      }
      // Tool end
      else if (event.event === "on_tool_end") {
        // event.data.output is the raw tool message
        // Take a look at "LANGCHAIN TOOL MESSAGE OUTPUT SCHEMA" at the end of this file
        res.write(`data: ${JSON.stringify({ 
          type: "tool_end", 
          runId: event.run_id,
          tool: event.name,
          output: event.data.output,
          status: event.data.output.status || 'success'
        })}\n\n`);
      }
    }

    // 5. Update thread name for new threads
    try {
      if (isNewThread && fullResponse) {
        thread.title = await generateThreadName(message, fullResponse);
        await thread.save();
        // Send thread name to client
        res.write(`data: ${JSON.stringify({ 
          type: "threadName", 
          val: thread.title 
        })}\n\n`);
      } else {
        thread.changed('updatedAt', true);
        await thread.save();
      }
    } catch (error) {
      console.error("Failed to update thread title: ", error.stack);
      // Optional: send error event to client
    }

  } catch (error) {
    if (error.message === 'Abort') {
      console.log('🚫 Stream aborted by client');
      return; // Exit cleanly
    }
    console.error("Stream Error:", error.stack);
    res.write(`data: ${JSON.stringify({ 
      type: "error", 
      val: "An internal server error occurred during generation." 
    })}\n\n`);
  } finally {
    // 6. Signal end of stream
    res.write("data: [DONE]\n\n");
    res.end();

    // 7. Store interaction in Supermemory (after stream ends) + buffer locally
    if (fullResponse) {
      const memoryContent = `User: ${message}\nAssistant: ${fullResponse}`;
      bufferMemory(userId, memoryContent);
      await supermemory.add({
        content: memoryContent,
        containerTag: userId
      }).catch(err => console.error("Failed to save memory:", err.message));
    }
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
    const history = [];
    const messages = state.values.messages || [];

    // Pre-map tool messages by their ID for O(1) lookup
    const toolOutputs = new Map(
      messages
        .filter(m => m._getType() === 'tool')
        .map(m => {
          const { tool_call_id, status, name, content } = m;
          return [tool_call_id, { tool_call_id, status, name, content }];
        })
    );

    for (const msg of messages) {
      const type = msg._getType();

      // 1. Handle Regular User Messages
      if (type === 'human') {
        history.push({ role: 'user', content: msg.content });
      } 
      
      // 2. Handle AI Messages (could be text OR tool calls)
      else if (type === 'ai') {
        // A. Handle Tool Calls
        if (msg.tool_calls?.length > 0) {
          for (const toolCall of msg.tool_calls) {
            // Find the corresponding ToolMessage for this call
            const rawOutput = toolOutputs.get(toolCall.id);
            history.push({
              role: 'tool_call',
              content: {
                id: rawOutput.tool_call_id,
                tool: rawOutput.name,
                input: toolCall.args,
                output: rawOutput.content,
                status: rawOutput.status,
              }
            });
          }
        }

        // B. Handle Text Content (if any)
        if (msg.content) {
          history.push({ role: 'assistant', content: msg.content });
        }
      }
    }

    res.json({ messages: history, threadName: thread.title });

  } catch (error) {
    console.error("Error fetching history:", error.stack);
    res.status(500).json({ message: "Internal Server Error" });
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


/**
 * Deletes a chat thread and all associated LangGraph checkpoints.
 * Tables: checkpoints, checkpoint_writes, checkpoint_blobs.
 */
export const deleteThread = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { threadId } = req.params;
    const userId = req.user.id;

    // 1. Verify ownership before any destructive action
    const thread = await Thread.findOne({ 
      where: { threadId, userId }, 
      transaction: t 
    });

    if (!thread) {
      await t.rollback();
      return res.status(404).json({ message: "Thread not found or unauthorized." });
    }

    // 2. Clear LangGraph history tables
    const langGraphTables = ['checkpoints', 'checkpoint_writes', 'checkpoint_blobs'];
    
    for (const table of langGraphTables) {
      await sequelize.query(
        `DELETE FROM "public"."${table}" WHERE thread_id = :threadId`,
        { 
          replacements: { threadId }, 
          transaction: t, 
          type: QueryTypes.DELETE 
        }
      );
    }

    // 3. Delete the thread entry itself
    await thread.destroy({ transaction: t });

    await t.commit();
    
    res.json({ 
      message: "Thread and associated data deleted successfully", 
      threadId 
    });

  } catch (error) {
    if (t) await t.rollback();
    console.error("Error deleting thread:", error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


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



/* LANGCHAIN TOOL MESSAGE OUTPUT SCHEMA (SERIALIZED TOOLMESSAGE)
  {
    // 1. METADATA: Internal LangChain serialization markers.
    "lc": 1, 
    "type": "constructor",
    "id": ["langchain_core", "messages", "ToolMessage"],

    // 2. KWARGS: This is the payload you actually care about.
    "kwargs": {
      "status": "success", // Can also be "error"

      "content": "<json_string>", 

      "tool_call_id": "call_eKJq...", // Links this output to a specific tool request
      "name": "<name_of_the_tool",
      
      "metadata": {},
      "additional_kwargs": {},
      "response_metadata": {}
  } 
*/

// While JSON strings are the most common (because they are easy for models to "read" back), 
// the content field in a ToolMessage can absolutely hold other formats.
// In LangChain, the content of a message is technically defined as string | list[string | dict]. 
