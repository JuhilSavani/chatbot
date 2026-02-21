import axios, { BASE_URL } from "../axios";

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
      return handleAxiosError(null, "Your request failed because no user input or thread ID was included.");
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
export async function loadChatHistoryAction(threadId, signal) {
  try {
    if (!threadId) {
      return handleAxiosError(null, "Your request failed because no thread ID was included.");
    }
    const response = await axios.get(`/protected/chat/${threadId}`, { signal });
    return response.data;
  } catch (error) {
    // Check if this was a user cancellation,
    // We must RE-THROW this so the useEffect knows to ignore it.
    if (axios.isCancel(error)) throw error; 

    console.error("Load History Error:", error);
    return handleAxiosError(error, "Failed to load chat history!");
  }
}

/**
 * Syncs the pinned status of a thread with the server.
 * Server returns: { message, threadId, isPinned }
 */
export async function syncPinStatusAction(threadId, isPinned) {
  try {
    if (!threadId) {
      return handleAxiosError(null, "Your request failed because no thread ID was included.");
    }

    const action = isPinned ? "pin" : "unpin";
    const response = await axios.put(`/protected/chat/pin/${threadId}/${action}`);
    return response.data;
  } catch (error) {
    console.error("Sync Pin Status Error:", error);
    return handleAxiosError(error, "Failed to update pin status.");
  }
}

/**
 * Deletes a thread.
 * Server returns: { message, threadId }
 */
export async function deleteThreadAction(threadId) {
  try {
    if (!threadId) {
      return handleAxiosError(null, "Your request failed because no thread ID was included.");
    }

    const response = await axios.delete(`/protected/chat/${threadId}`);
    return response.data;
  } catch (error) {
    console.error("Delete Thread Error:", error);
    return handleAxiosError(error, "Failed to delete thread.");
  }
}

/**
 * Streams a chat response using Server-Sent Events (SSE).
 * Returns an object with stream (async iterable) and abort controller.
 * 
 * Usage:
 *   const { stream, abort } = streamChatAction({ threadId, message });
 *   for await (const event of stream) {
 *     if (event.type === 'token') console.log(event.val);
 *   }
 */
export function streamChatAction({ threadId, message, web_search }) {
  const controller = new AbortController();

  // 1. Define the generator function
  async function* generateStream() {
    try {
      // Axios doesn't support the raw response stream.
      const response = await fetch(`${BASE_URL}/protected/chat/stream`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ message, threadId, web_search }),
        signal: controller.signal,
      });

      
      if (!response.ok) throw new Error(`Request failed! status: ${response.status}`);
      if (!response.body) throw new Error("No response body received");

      // 2. The Transformer (SSE Parser)
      const sseParser = () => new TransformStream({
        transform(chunk, controller) {
          const lines = chunk.split("\n");
          for (const line of lines) {
            // Handle standard SSE "data: " prefix
            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                const json = JSON.parse(line.slice(6)); // Remove "data: "
                controller.enqueue(json);
              } catch (e) {
                // Ignore partial/malformed chunks
              }
            }
          }
        },
      });

      // 3. The Clean Pipeline
      // Raw Bytes -> Text -> JSON Objects
      const stream = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(sseParser());
      
      // 4. Yield parsed JSON objects directly
      // const reader = stream.getReader();
      // while (true) {
      //   const { value, done } = await reader.read();
      //   if (done) break;
      //   yield value;
      // }

      // 4. Yields parsed JSON objects directly
      for await (const chunk of stream) {
        yield chunk;
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        // Yield error so the UI can display it
        yield { type: 'error', val: error.message || "Network error" };
      }
    }
  }

  // 5. Return the simpler interface
  return {
    stream: generateStream(), // The UI can just "for await" this
    abort: () => controller.abort()
  };
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