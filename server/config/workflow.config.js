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

async function callAgent(state, config){
  let fullMessage = null; 
  
  const signal = config.configurable.signal || config.signal;
  
  try {
    const stream = await chatModel.stream(state.messages, { signal });
    
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

const graph = new StateGraph(MessagesAnnotation);

graph.addNode("chatAgent", callAgent);

graph.addEdge("__start__", "chatAgent");
graph.addEdge("chatAgent", "__end__");

export const workflow = graph.compile({ checkpointer });