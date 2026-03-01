import { chatModel } from "../config/workflow.config.js";
import { HumanMessage } from "@langchain/core/messages";

// Helper function to generate a thread name based on the first message
export async function generateThreadName(userMessage, aiResponse) {
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
export function generateFallbackName(message) {
  // Take first 50 characters and add ellipsis if needed
  const cleanMessage = message.trim().substring(0, 50);
  return cleanMessage.length < message.trim().length 
    ? `${cleanMessage}...` 
    : cleanMessage;
}

