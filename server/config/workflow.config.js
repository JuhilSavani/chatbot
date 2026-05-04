import { checkpointer, memoryStore } from "./sequelize.config.js";
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, MessagesAnnotation, Annotation } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { searchTool } from "../tools/search.tools.js";
import { scrapeTool } from "../tools/scrape.tools.js";
import { selectRelevantDocuments } from "../utils/selectRelevantDocuments.js";
import { filterRelevantMemories, extractNewMemories } from "../utils/memoryUtils.js";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { devLog } from "../utils/devLogger.js";

export const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  selectedDocumentIds: Annotation({
    reducer: (state, update) => update !== undefined ? update : state,
    default: () => [],
  }),
  contextFromMemories: Annotation({
    reducer: (state, update) => update !== undefined ? update : state,
    default: () => "",
  }),
});

// 1. Define your tools
const tools = [searchTool, scrapeTool];

// 2. Create the ToolNode
const toolNode = new ToolNode(tools);

// 3. Model factory/cache
const modelCache = new Map();

export function getChatModel(modelName, streaming = true) {
  const cacheKey = `${modelName}-${streaming}`;
  if (!modelCache.has(cacheKey)) {
    const model = new ChatOpenAI({
      configuration: { baseURL: "https://openrouter.ai/api/v1" },
      apiKey: process.env.OPENROUTER_API_KEY,
      model: modelName,
      streaming: streaming,
    });
    modelCache.set(cacheKey, model);
  }
  return modelCache.get(cacheKey);
}

function customToolsCondition(state) {
  const result = toolsCondition(state);
  if (result === "__end__") {
    return "updateMemory";
  }
  return result;
}

async function selectDocumentsNode(state, config) {
  const attachments = config.configurable?.attachments || [];
  if (attachments.length === 0) return { selectedDocumentIds: [] };
  
  // Filter to only human and AI text messages (skip tool calls and tool results)
  const messages = state.messages.filter(m => {
    const type = m._getType();
    if (type === 'human') return true;
    if (type === 'ai' && !m.tool_calls?.length) return true;
    return false;
  });
  
  // Get last 6 conversational turns (12 messages) from LangGraph state for context
  const recentHistory = messages.slice(-13, -1).map(m => ({ 
    role: m._getType(), 
    content: m.content 
  }));

  const query = messages[messages.length - 1]?.content || "";
  
  const selectedDocumentIds = await selectRelevantDocuments(query, recentHistory, attachments);

  return { selectedDocumentIds };
}

async function injectMemoryNode(state, config) {
  if (config.configurable?.personalizationEnabled === false) 
    return { contextFromMemories: "" };

  const userId = config.configurable?.userId;

  await dispatchCustomEvent("recalling_memory", { message: "Recalling memory..." }, config);

  // Get recent history
  const messages = state.messages.filter(m => m._getType() === 'human' || (m._getType() === 'ai' && !m.tool_calls?.length));
  const recentHistory = messages.slice(-13, -1).map(m => ({ role: m._getType(), content: m.content }));
  const query = messages[messages.length - 1]?.content || "";

  // Fetch all user memories
  const profileItem = await memoryStore.get([userId], "profile");
  const prefsItem = await memoryStore.get([userId], "preferences");
  const activitiesItem = await memoryStore.get([userId], "recent_activities");

  const profileFacts = profileItem?.value?.content || [];
  const prefs = prefsItem?.value?.content || [];
  const activities = activitiesItem?.value?.content || [];

  // Filter relevant memories
  const { relevantPrefs, relevantActivities } = await filterRelevantMemories(prefs, activities, recentHistory, query);

  const userProfileContext = profileFacts.length ? profileFacts.map(f => `- ${f}`).join("\n") : "No profile information about user yet.";

  const contextFromMemories = `
## User Context & Memory from past conversations
This is background context from the user's past conversations. Use it to personalize responses.

### User Profile
${userProfileContext}

### User Preferences
${relevantPrefs.join("\n")}

### Recent past activities
${relevantActivities.join("\n")}
`;

  return { contextFromMemories };
}

async function updateMemoryNode(state, config) {
  const userId = config.configurable?.userId;

  // Fetch current memories
  const profileItem = await memoryStore.get([userId], "profile");
  const prefsItem = await memoryStore.get([userId], "preferences");
  const activitiesItem = await memoryStore.get([userId], "recent_activities");

  const profileFacts = profileItem?.value?.content || [];
  const prefs = prefsItem?.value?.content || [];
  const activities = activitiesItem?.value?.content || [];

  // Take the last two messages (User query + AI response)
  const messages = state.messages.filter(m => m._getType() === 'human' || (m._getType() === 'ai' && !m.tool_calls?.length));
  const lastTurn = messages.slice(-2).map(m => ({ role: m._getType(), content: m.content }));

  // Extract and deduplicate
  const extraction = await extractNewMemories(profileFacts, prefs, activities, lastTurn);

  let updated = false;

  if (extraction.profileFacts?.some(f => f.is_new)) {
    const newFacts = extraction.profileFacts.filter(f => f.is_new).map(f => f.fact);
    await memoryStore.put([userId], "profile", { content: [...profileFacts, ...newFacts] });
    updated = true;
  }
  if (extraction.preferences?.some(p => p.is_new)) {
    const newPrefs = extraction.preferences.filter(p => p.is_new).map(p => p.pref);
    await memoryStore.put([userId], "preferences", { content: [...prefs, ...newPrefs] });
    updated = true;
  }
  if (extraction.recentActivities?.some(a => a.is_new)) {
    const newActivities = extraction.recentActivities.filter(a => a.is_new).map(a => a.activity);
    await memoryStore.put([userId], "recent_activities", { content: [...activities, ...newActivities] });
    updated = true;
  }

  return {};
}

async function callAgent(state, config) {
  const signal = config.configurable.signal || config.signal; // Abort signal

  // Resolve the model using factory
  const modelName = config.configurable?.selectedModel || "openai/gpt-oss-20b";
  const chatModel = getChatModel(modelName).bindTools(tools);

  devLog(`[Agent] Using model: ${modelName}`);
  
  let systemInstructions;

  // Get document context
  const attachments = config.configurable?.attachments || [];
  const selectedDocumentIds = state.selectedDocumentIds || [];
  const relevantDocs = attachments.filter(a => selectedDocumentIds.includes(a.publicId));
  const contextFromDocuments = relevantDocs.length > 0 ? `
## Referenced documents in THIS conversation
The user has uploaded the following documents in THIS conversation. When the user refers to "the document", "the file", "the attachment", or "attached", they ALWAYS mean the documents listed here.
Use the content below to answer their questions accurately. NEVER confuse these with documents mentioned in User Context & Memory.

${relevantDocs.map(doc => `### Document: ${doc.name}\n${doc.content}`).join("\n\n")}` 
: 'User uploaded some documents in this session. But user did not reference any of the uploaded documents in this current user query.';

  systemInstructions = {
    role: "system",
    content: `
You are a helpful AI assistant with access to a real-time web search tool. 
Today's date is ${new Date().toDateString()}.
If a user asks about current events, specific data you don't know, or 
information from 2025-2026, use the search tool to provide accurate info.
Always cite your sources if the search tool provides links.
${contextFromDocuments}
${state.contextFromMemories}
`,
  };

  const messagesWithSystem = [systemInstructions, ...state.messages];

  let fullMessage = null;
  try {
    const stream = await chatModel.stream(messagesWithSystem, { signal });
    for await (const chunk of stream) {
      fullMessage = !fullMessage ? chunk : fullMessage.concat(chunk);
    }
    
    // Dispatch llm_done to signal the frontend to unlock immediately
    await dispatchCustomEvent("llm_done", null, config);
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
graph.addNode("injectMemory", injectMemoryNode);
graph.addNode("chatAgent", callAgent);
graph.addNode("tools", toolNode);
graph.addNode("updateMemory", updateMemoryNode);

graph.addEdge("__start__", "selectDocuments")
graph.addEdge("selectDocuments", "injectMemory");
graph.addEdge("injectMemory", "chatAgent");
graph.addConditionalEdges("chatAgent", customToolsCondition);
graph.addEdge("tools", "chatAgent");
graph.addEdge("updateMemory", "__end__");

export const workflow = graph.compile({ checkpointer, store: memoryStore });
