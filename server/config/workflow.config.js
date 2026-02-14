import { checkpointer } from './sequelize.config.js';
import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { searchTool } from '../tools/search.tools.js';

// 1. Define your tools
const tools = [searchTool];

// 2. Create the ToolNode
const toolNode = new ToolNode(tools);

// 3. Bind tools to the model
export const chatModel = new ChatOpenAI({
  configuration: {
    baseURL: "https://models.github.ai/inference",
  },
  apiKey: process.env.GITHUB_TOKEN,
  model: "openai/gpt-4o-mini",
  streaming: true
});

async function callAgent(state, config){
  const signal = config.configurable.signal || config.signal;

  let modelToUse;
  let systemInstructions;
  
  // Check the button state from the frontend
  const isForcedSearch = config.configurable?.web_search === true;

  // FUTURE TODO : Decouple this, and allow multiple tools to be forced
  
  // Solution to The "Infinite Search" Trap
  // 1. Find the last Human Message (The start of the current turn)
  const messages = state.messages;
  let lastHumanIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i] instanceof HumanMessage) {
      lastHumanIndex = i;
      break;
    }
  }

  // 2. Scan all messages AFTER the user spoke
  let hasSearchedInCurrentTurn = false;
  if (lastHumanIndex !== -1) {
    const subsequentMessages = messages.slice(lastHumanIndex + 1);

    // Check if the Tool *already called*
    hasSearchedInCurrentTurn = subsequentMessages.some(
      msg => msg instanceof ToolMessage && msg.name === searchTool.name
    );
  }

  const shouldForceSearch = isForcedSearch && !hasSearchedInCurrentTurn;

  if (shouldForceSearch) { 
    // 🔴 FORCE MODE
    // We strictly tell the LLM: "You MUST call the tool named 'search'"
    // It skips "thinking" and immediately generates the tool call parameters.
    console.log("Forcing Web Search...");
    // modelToUse = chatModel.bindTools(tools, { 
    //   tool_choice: searchTool.name // This forces the specific tool
    // });
    modelToUse = chatModel.bindTools(tools, { 
      tool_choice: { // This forces the specific tool
        type: "function", 
        function: { name: searchTool.name } 
      } 
    });
    systemInstructions = {
      role: "system",
      content: `You are a helpful AI assistant with access to a real-time web search tool. 
        Today's date is ${new Date().toDateString()}.
        You must use the search tool to answer the user's request. 
        Generate the best search query for it.
        Always cite your sources if the search tool provides links.`
    };
    ""
  } else {
    // 🟢 AUTONOMY MODE
    // The button is off, but the agent still has the tool.
    // It can decide "auto"matically whether to use it or just chat.
    modelToUse = chatModel.bindTools(tools, { 
      tool_choice: "auto" 
    });
    systemInstructions = {
      role: "system",
      content: `You are a helpful AI assistant with access to a real-time web search tool. 
        Today's date is ${new Date().toDateString()}.
        If a user asks about current events, specific data you don't know, or 
        information from 2025-2026, use the search tool to provide accurate info.
        Always cite your sources if the search tool provides links.`
    };
  }

  
  const messagesWithSystem = [systemInstructions, ...state.messages];

  let fullMessage = null; 
  try {
    const stream = await modelToUse.stream(messagesWithSystem, { signal });
    for await (const chunk of stream) {
      fullMessage = !fullMessage ? chunk : fullMessage.concat(chunk);
    }
  } catch (e) {
    // If we have generated ANY content, return it as a valid state update.
    if (fullMessage) {
      console.log("Stream aborted, saving partial message:", fullMessage.content);
      return { messages: [fullMessage] }; 
    }
    
    // If we haven't generated anything yet, re-throw the error
    throw e;
  }
  return { messages: [fullMessage] }; 
};

// 4. Build the Graph
const graph = new StateGraph(MessagesAnnotation);

graph.addNode("chatAgent", callAgent);
graph.addNode("tools", toolNode)

graph.addEdge("__start__", "chatAgent");
graph.addConditionalEdges("chatAgent", toolsCondition)
graph.addEdge("tools", "chatAgent");

export const workflow = graph.compile({ checkpointer });