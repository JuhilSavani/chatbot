import { checkpointer } from './sequelize.config.js';
import { ChatOpenAI } from "@langchain/openai"
import { HumanMessage } from "@langchain/core/messages";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";

export const chatModel = new ChatOpenAI({
  configuration: {
    baseURL: "https://models.github.ai/inference",
  },
  apiKey: process.env.GITHUB_TOKEN,
  model: "openai/gpt-4o-mini",
  streaming: true
});

async function callAgent(state){
  const response = await chatModel.invoke(state.messages);
  return { messages: [response] }; 
};

const graph = new StateGraph(MessagesAnnotation);

graph.addNode("chatAgent", callAgent);

graph.addEdge("__start__", "chatAgent");
graph.addEdge("chatAgent", "__end__");

export const workflow = graph.compile({ checkpointer });