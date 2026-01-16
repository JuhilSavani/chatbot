import { workflow } from "../config/workflow.config.js";

export const loadChatThreads = async (req, res) => {
  try {
    // Access the checkpointer attached to the compiled graph
    const checkpointer = workflow.checkpointer;

    if (!checkpointer) {
      return res.status(500).json({ error: "No checkpointer configured on workflow" });
    }

    // List all threads. Note: list() returns an async generator in most checkpointers.
    const threads = [];
    for await (const state of checkpointer.list({})) {
      threads.push({
        thread_id: state.config.configurable.thread_id,
        updated_at: state.metadata?.updated_at || null,
        // You can add more metadata here if your checkpointer supports it
      });
    }

    res.json({ threads });
  } catch (error) {
    console.error("Error loading threads:", error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const chatWithModel = async (req, res) => {
  try {
    const { message, thread_id } = req.body;

    if (!message || !thread_id) {
      return res.status(400).json({ error: "message and thread_id are required" });
    }

    // 1. Define configuration for persistence
    const config = { configurable: { thread_id: thread_id } };

    // 2. Run the graph
    const inputs = { messages: [new HumanMessage(message)] };
    const result = await workflow.invoke(inputs, config);

    // 3. Extract the last AI response
    const lastMessage = result.messages[result.messages.length - 1];
    
    res.json({ response: lastMessage.content });

  } catch (error) {
    console.error("Error in chat endpoint:", error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const loadChatHistory = async (req, res) => {
  try {
    const { threadId } = req.params;

    const config = { configurable: { thread_id: threadId } };

    // Get the current state of the thread
    const state = await workflow.getState(config);

    if (!state.values || !state.values.messages) {
      return res.json({ messages: [] });
    }

    // Format messages for the client
    const history = state.values.messages.map((msg) => ({
      role: msg._getType(), // 'human' or 'ai'
      content: msg.content,
    }));

    res.json({ messages: history });

  } catch (error) {
    console.error("Error fetching history:", error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
}


