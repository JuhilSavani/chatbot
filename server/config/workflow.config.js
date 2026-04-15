import { checkpointer } from "./sequelize.config.js";
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { searchTool } from "../tools/search.tools.js";
import { scrapeTool } from "../tools/scrape.tools.js";

// 1. Define your tools
const tools = [searchTool, scrapeTool];

// 2. Create the ToolNode
const toolNode = new ToolNode(tools);

// 3. Model factory/cache
const modelCache = new Map();

export function getChatModel(modelName) {
  if (!modelCache.has(modelName)) {
    const model = new ChatOpenAI({
      configuration: { baseURL: "https://models.github.ai/inference" },
      apiKey: process.env.GITHUB_TOKEN,
      model: modelName,
      streaming: true,
    });
    modelCache.set(modelName, model);
  }
  return modelCache.get(modelName);
}

async function callAgent(state, config) {
  const signal = config.configurable.signal || config.signal;

  // Resolve the model using factory
  const modelName = config.configurable?.selectedModel || "openai/gpt-4o-mini";
  const chatModel = getChatModel(modelName).bindTools(tools);

  console.log(`[Agent] Using model: ${modelName}`);
  
  let systemInstructions;

  // Get Relavant Documents
  const hasDocuments = config.configurable?.hasDocuments === true;
  const relevantDocs = config.configurable?.relevantDocuments || [];

  // Extract Profile for Personalization
  const profile = config.configurable?.profile;
  const userProfileContext = profile?.static?.length 
    ? profile.static.map((f) => `- ${f}`).join("\n") 
    : "No long-term profile yet.";
  const crossSessionContext = profile?.dynamic?.length 
    ? profile.dynamic.map((c) => `- ${c}`).join("\n") 
    : "No recent context.";

  // Documents section — placed FIRST for highest priority
  const documentContext = relevantDocs.length > 0 ? `
## Referenced Documents (THIS conversation — HIGHEST PRIORITY)
The user has uploaded the following documents in THIS conversation. When the user refers to "the document", "the pdf", "the file", "this paper", or "attached", they ALWAYS mean the documents listed here.
Use the content below to answer their questions accurately. NEVER confuse these with documents mentioned in User Context & Memory.

${relevantDocs.map(doc => `### Document: ${doc.name}\n${doc.content}`).join("\n\n")}
` : (hasDocuments ? `

## Note on Uploaded Documents
The user has uploaded documents in this conversation, but none were selected as relevant to this specific query. If the user asks about "the document" or "the pdf", let them know you can help — just ask them to clarify what they'd like to know.
` : "");

  // Memory section — placed AFTER documents, with explicit scoping
  const personalizedContext = `
## User Context & Memory (from past conversations — LOWER PRIORITY than Referenced Documents)
This is background context from the user's past conversations. Use it to personalize responses.
IMPORTANT: Do NOT treat any document or file references in this section as documents uploaded in the current conversation. Only the "Referenced Documents" section above contains documents from this chat.
 
### User Profile (Long-term facts)
${userProfileContext}

### Recent Context (Dynamic history)
${crossSessionContext}
`;
  
  systemInstructions = {
    role: "system",
    content: `
You are a helpful AI assistant with access to a real-time web search tool. 
Today's date is ${new Date().toDateString()}.
If a user asks about current events, specific data you don't know, or 
information from 2025-2026, use the search tool to provide accurate info.
Always cite your sources if the search tool provides links.
${documentContext}
${personalizedContext}
`,
  };

  const messagesWithSystem = [systemInstructions, ...state.messages];

  let fullMessage = null;
  try {
    const stream = await chatModel.stream(messagesWithSystem, { signal });
    for await (const chunk of stream) {
      fullMessage = !fullMessage ? chunk : fullMessage.concat(chunk);
    }
  } catch (e) {
    // If we have generated ANY content, return it as a valid state update.
    if (fullMessage) {
      console.log(
        "Stream aborted, saving partial message:",
        fullMessage.content,
      );
      return { messages: [fullMessage] };
    }

    // If we haven't generated anything yet, re-throw the error
    throw e;
  }
  return { messages: [fullMessage] };
}

// 4. Build the Graph
const graph = new StateGraph(MessagesAnnotation);

graph.addNode("chatAgent", callAgent);
graph.addNode("tools", toolNode);

graph.addEdge("__start__", "chatAgent");
graph.addConditionalEdges("chatAgent", toolsCondition);
graph.addEdge("tools", "chatAgent");

export const workflow = graph.compile({ checkpointer });
