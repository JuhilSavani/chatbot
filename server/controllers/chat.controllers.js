import { workflow } from "../config/workflow.config.js";
import { HumanMessage } from "@langchain/core/messages";
import { Thread } from "../models/thread.models.js";
import { sequelize } from "../config/sequelize.config.js";
import { QueryTypes } from 'sequelize';
import { Attachment } from "../models/attachment.models.js";
import { generateThreadName } from "../utils/generateThreadName.js";
import { devLog } from "../utils/devLogger.js";

const ALLOWED_MODELS = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"];
const DEFAULT_MODEL = "openai/gpt-oss-20b";

function validateModel(model) {
  if (!model) return DEFAULT_MODEL;
  return ALLOWED_MODELS.includes(model) ? model : null;
}

export const loadChatThreads = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) 
      return res.status(401).json({ message: "User not authenticated" });

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

export const ingestDocuments = async (req, res) => {
  const { threadId, attachments } = req.body;
  const userId = req.user.id;

  if (!threadId || !attachments || !Array.isArray(attachments)) {
    return res.status(400).json({ message: "Provide threadId and an array of attachments to ingest" });
  }

  try {
    // 1. Thread setup/verification
    const [thread, _] = await Thread.findOrCreate({
      where: { threadId },
      defaults: { userId }, // This gets set only on creation
    });

    if (thread.userId !== userId) {
      return res.status(403).json({ message: "You don't have access to this conversation" });
    }

    // 2. Compute message index for these attachments
    const state = await workflow.getState({ configurable: { thread_id: threadId } });
    const chatMessages = state.values?.messages || [];
    let messageIndex = chatMessages.filter(m => m._getType() === 'human').length;

    // 3. Process each file
    const ingestedDocs = [];
    for (const att of attachments) {
      try {
        const text = att.text;
        if (!text) throw new Error('No extracted text provided by client');

        devLog(`[File Ingest] Storing "${att.name}" (${text.length} chars)`);

        // Save to DB
        const attachmentRecord = await Attachment.create({
          threadId,
          publicId: att.public_id,
          secureUrl: att.secure_url,
          resourceType: att.resource_type,
          name: att.name,
          content: text,
          messageIndex,
        });

        devLog(`[File Ingest] Stored attachment "${att.name}" for thread ${threadId}`);
        ingestedDocs.push(attachmentRecord);
      } catch (err) {
        console.error(`Failed to ingest "${att.name}":`, err.message);
      }
    }

    res.status(200).json({ 
      message: "Documents ingested successfully",
      count: ingestedDocs.length 
    });

  } catch (error) {
    console.error("Ingest Documents Error:", error.stack);
    res.status(500).json({ message: "Internal Server Error during ingestion." });
  }
};

/**
 * SSE Streaming endpoint using LangGraph's streamEvents
 * Sends token-by-token updates to the client in real-time
 */
export const chatWithModelStream = async (req, res) => {
  const { message, threadId, selectedModel: requestedModel, personalizationEnabled } = req.body;
  const userId = req.user.id;

  // Resolve the model (validate against allowlist)
  const selectedModel = validateModel(requestedModel);
  if (!selectedModel) {
    // Invalid model provided - stop early
    return res.status(400).json({ message: "Invalid model. Allowed models: " + ALLOWED_MODELS.join(", ") });
  }
  console.log(`Using model: ${selectedModel} (requested: ${requestedModel})`);

  // Validation
  if (!message || !threadId) {
    return res.status(400).json({ message: "Provide threadId and message to conversation" });
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

  // Immediately stream an event payload with initialized status and usage remaining
  const initResponse = {
    type: 'run_init',
    payload: { 
      usage: req.ratelimit || null,
      selectedModel: selectedModel,
    }
  };
  res.write(`data: ${JSON.stringify(initResponse)}\n\n`);

  let fullResponse = "";
  let streamEndedNormally = false;

  try {
    // 2. Thread setup (same as non-streaming)
    const [thread, isNewThreadRecord] = await Thread.findOrCreate({
      where: { threadId },
      defaults: { userId }, // This gets set only on creation
    });

    if (!isNewThreadRecord && thread.userId !== userId) {
      res.write(`data: ${JSON.stringify({ type: "error", val: "You don't have access to this conversation" })}\n\n`);
      return; // Stop here! The 'finally' block below will take care of [DONE] and res.end()
    }

    // 3. Mark title as pending to avoid race conditions with rapid follow-up messages
    let shouldGenerateTitle = false;
    if (thread.title === "Untitled Chat") {
      shouldGenerateTitle = true;
      thread.title = "Generating...";
      await thread.save();
    }

    // 4. Load all attachments for this thread
    const attachmentRecord = await Attachment.findAll({
      where: { threadId },
      attributes: ["publicId", "name", "content"],
    });

    // 5. Removed Supermemory fetching, workflow now handles it via PostgresStore

    // 6. Start the stream with streamEvents v2
    const inputs = { messages: [new HumanMessage(message)] };
    const stream = await workflow.streamEvents(inputs, { 
      configurable: { 
        thread_id: threadId, 
        signal: controller.signal,
        selectedModel,                      // Selected model from client (validated)
        personalizationEnabled,             // Flag to toggle personalization
        userId,                             // Pass userId so graph nodes can access PostgresStore
        attachments: attachmentRecord,      // Pass all attachments here for the router node
      },
      version: "v2",
    });

    // 7. Iterate and filter events
    for await (const event of stream) {
      // Ignore background LLM/tool events (like from updateMemoryNode) after the main chat is done
      // if (streamEndedNormally) continue; 
      
      // Listen for custom events dispatched from nodes
      if (event.event === "on_custom_event") {
        if (event.name === "recalling_memory") {
          res.write(`data: ${JSON.stringify({ 
            type: "recalling_memory", 
            val: event.data.message 
          })}\n\n`);
        } else if (event.name === "llm_done") {
          res.write("data: [DONE]\n\n");
          streamEndedNormally = true; 
        }
      }
      // Token from the LLM
      else if (event.event === "on_chat_model_stream") {
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

    // 8. Wait for the loop to naturally end (after background tasks complete)
    // The [DONE] signal was sent by the llm_done custom event to unlock UI earlier

    // 9. Extra Background Work (Before res.end())
    try {
      if (shouldGenerateTitle && fullResponse) {
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
      // Reset title if generation failed so a future message can retry it
      if (shouldGenerateTitle) {
        thread.title = "Untitled Chat";
        await thread.save();
      }
    }

  } catch (error) {
    if (error.message === 'Abort') {
      console.log('🚫 Stream aborted by client');
      return; // Exit cleanly
    }
    console.error("Stream Error:", error.stack);
    
    let userFriendlyError = "An internal server error occurred during generation.";
    if (error.status === 401 || (error.message && error.message.includes('401'))) {
      userFriendlyError = "Our AI systems are currently under high load. Please try again in a few moments.";
    }

    res.write(`data: ${JSON.stringify({ 
      type: "error", 
      val: userFriendlyError 
    })}\n\n`);
  } finally {
    if (!streamEndedNormally) {
      // 10. Signal end of stream in case of error
      res.write("data: [DONE]\n\n");
    }
    res.end();
  }
}

export const loadChatHistory = async (req, res) => {
  try {
    const { threadId } = req.params;

    // Check whether the thread belongs to the user
    const thread = await Thread.findOne({ where: { threadId } });
    if (!thread) 
      return res.status(404).json({ message: "This conversation not exist or may have been deleted" });

    if (thread.userId !== req.user.id) 
      return res.status(403).json({ message: "You don't have access to this conversation" });

    // Get the current state of the thread
    const state = await workflow.getState({ configurable: { thread_id: threadId } });

    if (!state.values || !state.values.messages) 
      return res.json({ messages: [], threadName: thread.title });

    const chatMessages = state.values.messages || [];
    const history = [];

    // Fetch thread attachments and group by messageIndex for O(1) lookups
    const attachmentRecord = await Attachment.findAll({
      where: { threadId },
      attributes: ["publicId", "name", "messageIndex"],
      order: [["createdAt", "ASC"]],
    });

    const attachmentsByIndex = new Map();
    for (const att of attachmentRecord) {
      if (!attachmentsByIndex.has(att.messageIndex)) {
        attachmentsByIndex.set(att.messageIndex, []);
      }
      attachmentsByIndex.get(att.messageIndex).push(att.name);
    }

    // Pre-map tool messages by their ID for O(1) lookup
    const toolOutputs = new Map(
      chatMessages
        .filter(m => m._getType() === 'tool')
        .map(m => {
          const { tool_call_id, status, name, content } = m;
          return [tool_call_id, { tool_call_id, status, name, content }];
        })
    );

    let userMsgIndex = 0;

    for (const msg of chatMessages) {
      const type = msg._getType();

      // 1. Handle Regular User Messages
      if (type === 'human') {
        const historyItem = { role: 'user', content: msg.content };
        
        // Attach file names if this message had any (O(1) lookup)
        const matchingAtts = attachmentsByIndex.get(userMsgIndex);
        if (matchingAtts?.length > 0) {
          historyItem.attachments = matchingAtts;
        }
        
        history.push(historyItem);
        userMsgIndex++;
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
      return res.status(400).json({ message: "Invalid action. Use 'pin' or 'unpin'" });
    }

    const thread = await Thread.findOne({ where: { threadId, userId } });

    if (!thread) {
      return res.status(404).json({ message: "This conversation not exist or may have been deleted" });
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
      return res.status(404).json({ message: "This conversation not exist or may have been deleted" });
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
