import axios from "../axios";

/**
 * Loads all existing threads.
 * Server returns: { threads: [{ threadId, threadName, updatedAt }] }
 */
export async function loadChatThreadsAction() {
  try {
    const response = await axios.get("/protected/chat/threads");
    return response.data; 
  } catch (error) {
    console.error("Load Threads Error:", error);
    return handleAxiosError(error, "Failed to load chat threads!");
  }
}

/**
 * Sends a message. 
 * REQUIRED: threadId (Server does not auto-generate thread IDs on POST)
 * Server returns: { threadId, threadName, response }
 */
export async function chatWithModelAction({ threadId, message }) {
  try {
    if (!message || !threadId) {
      return { error: "Message and Thread ID are required." };
    }

    const response = await axios.post("/protected/chat/message", { 
      message, 
      threadId 
    });
    
    return response.data;
  } catch (error) {
    console.error("Chat Action Error:", error);
    return handleAxiosError(error, "Failed to send message!");
  }
}

/**
 * Loads history for a specific thread.
 * Server returns: { messages: [{ role, content }], threadName }
 */
export async function loadChatHistoryAction(threadId) {
  try {
    if (!threadId) return { error: "Thread ID is missing" };

    const response = await axios.get(`/protected/chat/${threadId}`);
    return response.data;
  } catch (error) {
    console.error("Load History Error:", error);
    return handleAxiosError(error, "Failed to load chat history!");
  }
}

// --- Helper for cleaner error handling ---

function handleAxiosError(error, defaultMessage) {
  if (error.response) {
    // Server responded with a status code that falls out of the range of 2xx
    // We prioritize the server's specific error message if it exists
    const serverMessage = error.response.data?.message;
    return { error: serverMessage || defaultMessage };
  } 
  
  if (error.request) {
    // The request was made but no response was received
    return { error: "No response from server. Please check your connection." };
  } 
  
  // Something happened in setting up the request
  return { error: defaultMessage };
}