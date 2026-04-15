import { workflow } from "../config/workflow.config.js";
import { HumanMessage } from "@langchain/core/messages";
import { Thread } from "../models/thread.models.js";
import { sequelize } from "../config/sequelize.config.js";
import { QueryTypes } from 'sequelize';
import { supermemory } from "../config/supermemory.config.js";
import { extractText, getDocumentProxy } from "unpdf";
import cloudinary from "../config/cloudinary.config.js";
import { Attachment } from "../models/attachment.models.js";
import { generateThreadName } from "../utils/generateThreadName.js";
import { selectRelevantDocuments } from "../utils/selectRelevantDocuments.js";

const ALLOWED_MODELS = ["openai/gpt-4o-mini", "openai/gpt-4o"];
const DEFAULT_MODEL = "openai/gpt-4o-mini";

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
    let thread = await Thread.findOne({ where: { threadId } });
    
    const isNewThread = !thread;
    if (isNewThread) {
      thread = await Thread.create({ threadId, userId });
    }

    if (thread.userId !== userId) {
      return res.status(403).json({ message: "You don't have access to this conversation" });
    }

    // 2. Compute message index for these attachments
    const state = await workflow.getState({ configurable: { thread_id: threadId } });
    const chatMessages = state.values?.messages || [];
    let messageIndex = chatMessages.filter(m => m._getType() === 'human').length;

    // 3. Process each PDF
    const ingestedDocs = [];
    for (const att of attachments) {
      try {
        const signedUrl = cloudinary.utils.private_download_url(
          att.public_id, 
          "",
          {
            resource_type: "raw",
            type: "authenticated",
            expires_at: Math.floor(Date.now() / 1000) + 300,
            attachment: false
          }
        );

        console.log(`[PDF Ingest] Fetching "${att.name}"`);
        const pdfResponse = await fetch(signedUrl);

        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
        }

        const buffer = await pdfResponse.arrayBuffer();
        console.log(`[PDF Ingest] Buffer size: ${buffer.byteLength} bytes`);
        
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const { text } = await extractText(pdf, { mergePages: true });

        // Save to DB
        const attachmentRecord = await Attachment.create({
          threadId,
          publicId: att.public_id,
          name: att.name,
          content: text,
          tokenCount: att.tokenCount || 0,
          messageIndex,
        });

        console.log(`[PDF Ingest] Stored attachment "${att.name}" for thread ${threadId}`);
        ingestedDocs.push(attachmentRecord);
      } catch (err) {
        console.error(`Failed to ingest PDF "${att.name}":`, err.message);
        // We could fail the whole request or just this file. Let's return a partial error if needed, 
        // but for now, we'll continue and let the client know what succeeded.
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
  const { message, threadId, webSearch, model: requestedModel } = req.body;
  const userId = req.user.id;

  // Resolve the model (validate against allowlist)
  const selectedModel = validateModel(requestedModel);
  if (!selectedModel) {
    // Invalid model provided - stop early
    return res.status(400).json({ message: "Invalid model. Allowed models: " + ALLOWED_MODELS.join(", ") });
  }
  console.log(`[ModelSwitch] Using model: ${selectedModel} (requested: ${requestedModel})`);

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

  try {
    // 2. Thread setup (same as non-streaming)
    let thread = await Thread.findOne({ where: { threadId } });
    
    const isNewThreadRecord = !thread;
    if (isNewThreadRecord) {
      thread = await Thread.create({ threadId, userId });
    }

    if (!isNewThreadRecord && thread.userId !== userId) {
      res.write(`data: ${JSON.stringify({ type: "error", val: "You don't have access to this conversation" })}\n\n`);
      return; // Stop here! The 'finally' block below will take care of [DONE] and res.end()
    }

    const state = await workflow.getState({ configurable: { thread_id: threadId } });
    const chatMessages = state.values?.messages || [];

    // Understand if it's the very first message
    const isFirstMessage = chatMessages.length === 0;

    // 4. Load all attachments for this thread & select relevant ones
    const attachmentRecord = await Attachment.findAll({
      where: { threadId },
      attributes: ["publicId", "name", "content"],
    });

    let relevantDocuments = [];
    if (attachmentRecord.length > 0) {
      // Get last 6 turns (12 messages) from LangGraph state for context
      let recentHistory = [];
      try {
        // Filter to only human and AI text messages (skip tool calls and tool results)
        const conversationalMsgs = chatMessages.filter(m => {
          const type = m._getType();
          if (type === 'human') return true;
          if (type === 'ai' && m.content && !m.tool_calls?.length) return true;
          return false;
        });
        recentHistory = conversationalMsgs.slice(-12).map(m => ({
          role: m._getType(),
          content: m.content,
        }));
      } catch (err) {
        console.error("Failed to load history for doc selection:", err.message);
      }

      const selectedIds = await selectRelevantDocuments(message, recentHistory, attachmentRecord);

      // Filter to selected docs and build context string
      relevantDocuments = attachmentRecord.filter(a => selectedIds.includes(a.publicId));
      console.log(`[DocContext] Injecting ${relevantDocuments.length} doc(s) into context`);
    }

    // 5. Fetch User Profile
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

    // 6. Start the stream with streamEvents v2
    const inputs = { messages: [new HumanMessage(message)] };
    const stream = await workflow.streamEvents(inputs, { 
      configurable: { 
        thread_id: threadId, 
        signal: controller.signal,
        webSearch,          // Pass tools forcing here (boolean)
        model: selectedModel,  // Selected model from client (validated)
        userProfile,        // Pass profile here
        relevantDocuments,  // Pass relevant documents here
        hasDocuments: attachmentRecord.length > 0, // Flag: does this thread have any uploads?
      },
      version: "v2",
    });

    // 7. Iterate and filter events
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

    // 8. Update thread name for new threads
    try {
      if (isFirstMessage && fullResponse) {
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
    
    let userFriendlyError = "An internal server error occurred during generation.";
    if (error.status === 401 || (error.message && error.message.includes('401'))) {
      userFriendlyError = "Our AI systems are currently under high load. Please try again in a few moments.";
    }

    res.write(`data: ${JSON.stringify({ 
      type: "error", 
      val: userFriendlyError 
    })}\n\n`);
  } finally {
    // 9. Signal end of stream
    res.write("data: [DONE]\n\n");
    res.end();

    // 10. Store interaction in Supermemory (after stream ends)
    if (fullResponse) {
      const memoryContent = `User: ${message}\nAssistant: ${fullResponse}`;
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
        
        // Attach PDF names if this message had any (O(1) lookup)
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
