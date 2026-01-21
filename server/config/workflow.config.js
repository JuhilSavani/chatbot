import { checkpointer } from './sequelize.config.js';
import { ChatOpenAI } from "@langchain/openai"
import { StateGraph } from "@langchain/langgraph"
import { HumanMessage } from "@langchain/core/messages";
import { MessagesAnnotation } from "@langchain/langgraph";

export const chatModel = new ChatOpenAI({
  configuration: {
    baseURL: "https://models.github.ai/inference",
  },
  apiKey: process.env.GITHUB_TOKEN,
  model: "openai/gpt-4o-mini",
});

const GraphState = Annotation.Root({
  ...MessagesAnnotation.spec, // This spreads the built-in reducer logic
  threadName: Annotation(),
});

async function callAgent(state){
  const response = await chatModel.invoke(state.messages);
  return { messages: [response] }; 
};

const graph = new StateGraph(GraphState );

graph.addNode("chatAgent", callAgent);

graph.addEdge("__start__", "chatAgent");
graph.addEdge("chatAgent", "__end__");

export const workflow = graph.compile({ checkpointer });