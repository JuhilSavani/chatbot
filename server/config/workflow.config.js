import { checkpointer } from './sequelize.config.js';
import { ChatOpenAI } from "@langchain/openai"
import { StateGraph } from "@langchain/langgraph"
import { HumanMessage } from "@langchain/core/messages";
import { MessagesAnnotation } from "@langchain/langgraph";

const llm = new ChatOpenAI({
  configuration: {
    baseURL: "https://models.github.ai/inference",
  },
  apiKey: process.env.GITHUB_TOKEN,
  model: "openai/gpt-4o-mini",
  streaming: true
});

async function callModel(state){
  const response = await llm.invoke(state.messages);
  return { messages: [response] }; 
};

// LangGraph.js provides a pre-built graph for chat-based bots
const graph = new StateGraph(MessagesAnnotation);

graph.addNode("chatAgent", callModel);

graph.addEdge("__start__", "chatAgent");
graph.addEdge("chatAgent", "__end__");

export const workflow = graph.compile({ checkpointer });