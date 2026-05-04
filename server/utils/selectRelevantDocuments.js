import { z } from "zod";
import { getChatModel } from "../config/workflow.config.js";
import { devLog } from "./devLogger.js";

// Schema for structured output
const DocumentSelectionSchema = z.object({
  selectedIds: z.array(z.string()).describe("public_ids of documents relevant to the query"),
});

/**
 * Uses a structured LLM call to determine which uploaded documents
 * are relevant to the user's current query.
 *
 * @param {string} query - The user's current message
 * @param {Array} recentHistory - Last 6 messages from the conversation
 * @param {Array<{publicId: string, name: string, content: string}>} attachments - Available documents
 * @returns {Promise<string[]>} Array of publicIds for relevant documents
 */
export async function selectRelevantDocuments(query, recentHistory, attachments) {
  // If only one document, skip the LLM call entirely
  if (attachments.length === 1) {
    return [attachments[0].publicId];
  }

  // Use default mini model for document selection
  const chatModel = getChatModel("openai/gpt-oss-20b");
  const structuredModel = chatModel.withStructuredOutput(DocumentSelectionSchema);

  const historyText = recentHistory
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");

  const docList = attachments
    .map((att) => `- ID: "${att.publicId}" | Name: "${att.name}" \n ${att.content}`)
    .join("\n====\n");

  const prompt = `
You are a document relevance classifier. Given the user's query and recent conversation history, determine which of the available documents are likely relevant to answering the query.

## Recent Conversation History
${historyText || "No prior messages."}

## Available Documents
${docList}

## Current Query
${query}

## Rules
- You MUST select at least one document. Only omit a document if you are absolutely certain it is completely unrelated to the query.
- If the user refers to "the document", "the file", "the attachment", "attached", or any similar phrasing, select ALL documents.
- Never return an empty array. The user uploaded these documents for a reason — when in doubt, include everything.

Return the public_ids of the selected documents.`;

  try {
    const result = await structuredModel.invoke(prompt);
    devLog(`[DocSelector] Query: "${query}" → Selected: ${result.selectedIds.length}/${attachments.length} docs`);
    return result.selectedIds;
  } catch (err) {
    console.error("[DocSelector] Structured call failed, falling back to all docs:", err.message);
    // Fallback: return all document IDs
    return attachments.map((att) => att.publicId);
  }
}
