import { checkpointer } from "./sequelize.config.js";
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, MessagesAnnotation, Annotation } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { searchTool } from "../tools/search.tools.js";
import { scrapeTool } from "../tools/scrape.tools.js";
import { selectRelevantDocuments } from "../utils/selectRelevantDocuments.js";

export const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  relevantDocuments: Annotation({
    reducer: (state, update) => update !== undefined ? update : state,
    default: () => [],
  }),
});

// 1. Define your tools
const tools = [searchTool, scrapeTool];

// 2. Create the ToolNode
const toolNode = new ToolNode(tools);

// 3. Model factory/cache
const modelCache = new Map();

export function getChatModel(modelName) {
  if (!modelCache.has(modelName)) {
    const model = new ChatOpenAI({
      configuration: { baseURL: "https://openrouter.ai/api/v1" },
      apiKey: process.env.OPENROUTER_API_KEY,
      model: modelName,
      streaming: true,
    });
    modelCache.set(modelName, model);
  }
  return modelCache.get(modelName);
}

function routeAttachments(state, config) {
  const attachments = config.configurable?.attachments || [];
  return attachments.length > 0 ? "selectDocuments" : "chatAgent";
}

async function selectDocumentsNode(state, config) {
  const attachments = config.configurable?.attachments || [];
  if (attachments.length === 0) return { relevantDocuments: [] };
  
  // Filter to only human and AI text messages (skip tool calls and tool results)
  const messages = state.messages.filter(m => {
    const type = m._getType();
    if (type === 'human') return true;
    if (type === 'ai' && m.content && !m.tool_calls?.length) return true;
    return false;
  });
  
  // Get last 6 conversational turns (12 messages) from LangGraph state for context
  const recentHistory = messages.slice(-13, -1).map(m => ({ 
    role: m._getType(), 
    content: m.content 
  }));

  const query = messages[messages.length - 1]?.content || "";
  
  const selectedIds = await selectRelevantDocuments(query, recentHistory, attachments);
  const relevantDocuments = attachments.filter(a => selectedIds.includes(a.publicId));
  
  return { relevantDocuments };
}

async function callAgent(state, config) {
  const signal = config.configurable.signal || config.signal; // Abort signal

  // Resolve the model using factory
  const modelName = config.configurable?.selectedModel || "openai/gpt-oss-20b";
  const chatModel = getChatModel(modelName).bindTools(tools);

  console.log(`[Agent] Using model: ${modelName}`);
  
  let systemInstructions;

  // Get Relavant Documents
  const attachments = config.configurable?.attachments || [];
  const hasDocuments = attachments.length > 0;
  const relevantDocs = state.relevantDocuments || [];

  // Extract Profile for Personalization
  const isPersonalizationEnabled = config.configurable?.personalizationEnabled !== false;
  let personalizedContext = "";
  
  if (isPersonalizationEnabled) {
    const profile = config.configurable?.profile;
    const userProfileContext = profile?.static?.length 
      ? profile.static.map((f) => `- ${f}`).join("\n") 
      : "No long-term profile yet.";
    const crossSessionContext = profile?.dynamic?.length 
      ? profile.dynamic.map((c) => `- ${c}`).join("\n") 
      : "No recent context.";

    personalizedContext = `
## User Context & Memory (from past conversations — LOWER PRIORITY than Referenced Documents)
This is background context from the user's past conversations. Use it to personalize responses.
IMPORTANT: Do NOT treat any document or file references in this section as documents uploaded in the current conversation. Only the "Referenced Documents" section above contains documents from this chat.
 
### User Profile (Long-term facts)
${userProfileContext}

### Recent Context (Dynamic history)
${crossSessionContext}
`;
  }

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
const graph = new StateGraph(AgentState);

graph.addNode("selectDocuments", selectDocumentsNode);
graph.addNode("chatAgent", callAgent);
graph.addNode("tools", toolNode);

graph.addConditionalEdges("__start__", routeAttachments);
graph.addEdge("selectDocuments", "chatAgent");
graph.addConditionalEdges("chatAgent", toolsCondition);
graph.addEdge("tools", "chatAgent");

export const workflow = graph.compile({ checkpointer });
