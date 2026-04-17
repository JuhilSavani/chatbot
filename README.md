# Chatbot

A project built to explore advanced agentic patterns, featuring **database persistence**, **conversational memory**, **autonomous tool calling**, and **real-time token streaming**.

---

<img width="1574" height="969" alt="Project Demo" src="https://github.com/user-attachments/assets/4806c3c8-0431-458e-a1d7-5fae37bbc24a" />

---

## 📦 How to setup locally

### Prerequisites
To get this running locally, you'll need a few standard tools:
- **Node.js**: Required to run the  frontend and backend applications.
- **npm**: Package managers to install dependencies.
- **Supabase Account**: Used for the PostgreSQL database (to store chat history and vectors).
- **Google Cloud Project**: To enable "Sign in with Google".

### Installation

Setting up Sidekick takes just a few minutes:

1. **Clone the repo:**
    ```bash
    git clone https://github.com/JuhilSavani/chatbot.git
    cd chatbot
    ```

2. **Set up the server application:**
    ```bash
    cd server
    npm install
    ```

3. **Configure your server environment:** <br/>
    Create a `.env` file in the `server` folder. You can copy the structure from `.env.example`.

4. **Set up the persistence tables (one-time only):** <br/>
    Before starting the server for the first time, run this script to create the LangGraph persistence tables (`checkpoints` and `writes`) in your Supabase database:
    ```bash
    npm run checkpoints:init
    ```
    > You only need to do this once. It's safe to re-run — it uses `CREATE TABLE IF NOT EXISTS`.

5. **Start the server application:**
    ```bash
    npm run dev
    ```

6. **Set up the client application:** <br/>
    Open a new terminal window:
    ```bash
    cd client
    npm install
    ```
    
7. **Configure your client environment:** <br/>
    Create a `.env` file in the `client` folder. You can copy the structure from `.env.example`.
    
8. **Start the client application:**
    ```bash
    npm run dev
    ```
    **You're live!** Open [http://localhost:3000](http://localhost:3000) to see it in action.
    
---

## 🛠️ Dev Tools

### 1. Resetting Rate Limits
Testing rate limits can be a pain without a way to reset them, so I've included a couple of utilities to make "fresh starts" easier:

**Reset Server Limits:** Run `npm run rateLimits:reset` in the `server` folder to wipe the Upstash Redis cache and reset all user quotas.

**Purge Local Data:** Navigate to `http://localhost:3000/reset-rate-limit-storage.html` in your browser. I built a dedicated "System Purge" page that wipes your local IndexedDB, cookies, and session storage in one click.

---

## 🍪 What went into cooking

**Frontend:** React + Vite (Fast, simple, and honestly just the go-to for getting things moving).

**Styling:** Tailwind CSS + shadcn/ui (Since I'm not a designer—these make things look polished without much effort).

**Backend:** Node.js & Express (The standard go-to for building backends in JavaScript).

**Agentic Orchestration:** LangGraph (This is what handles the "agent" logic and state).

**Memory:** Supermemory (To store and retrieve user profiles and conversation history).

**File Storage:** Cloudinary (To store and retrieve files).

**Database:** Supabase / PostgreSQL (To keep track of all those chat sessions).

**Auth:** Supabase Auth (Because life is too short to keep rebuilding sign-in and sign-up flows from scratch).

**Rate Limiting:** Upstash Redis (Because the app is using free-teir GitHub API for LLM calls).


---

## 🙇🏻‍♂️ Things I learned (the hard way)

### 1. The Persistence Puzzle
With LangGraph's state-based approach, continuing a conversation was actually the simple part. The part that really slowed me down was just getting a clean list of chats from the persistence table.

Since LangGraph saves a snapshot at every single superstep, the database ends up with dozens of rows for a single conversation. Further there isn’t really a built-in "`get_all_threads`" method that just returns a list of unique sessions with their latest state.

I had to figure out a way to query the checkpoints table to find only the **latest** `checkpoint_id` **for each unique** `thread_id`, without getting lost in a sea of snapshots. 

I also messed around with the best way to attach and pull the metadata I needed—like chat titles and timestamps—just so the UI had something readable to show.

### 2. The "New Chat" Flow
I have made few chat-based AI applications in the past, but none of them had the requirement of handling past conversations.

I spent a lot of time getting the "New Chat" flow right—generating a session ID on that first message and swapping the URL **without** having to immediately query the database to "re-load" the history I literally just created.

### 3. The Reality of Streaming
I had to **really get into the weeds** of how token streaming works on both ends. 

On the **backend**, it wasn't just about sending text; I had to wrap my head around **Server-Sent Events (SSE)** and figure out how to loop through LangGraph’s event stream to send back tokens and tool status updates in real-time. 

On the **frontend**, the challenge was catching that stream and rendering it without the UI flickering or falling out of sync.

### 4. The "Stop" Button Logic
Streaming tokens looks cool, but making a "Stop" button that actually works was a whole different challenge. It’s not just about cutting the connection on the screen; I had to make sure the agent actually stopped generating on the backend so I wasn't wasting tokens for no reason.

The trickiest part was the **persistence** logic. I had to ensure that when a user hits "stop," the database doesn't just discard everything or get messy. It needs to save that partial response exactly where it left off, so the conversation history stays accurate even if the message was cut short.

### 5. Streaming Tool-Calling
Live-streaming tool execution was definitely the biggest pain. Parsing the input and output in real-time while also maintaining a decoupled design to add more tools later took a lot of trial and error.

The real struggle was the **disconnect** between the live stream and the saved history. While developing the parser, I found that the shape of a "live" tool call (serialized, event-based) is totally different from a "saved" tool call (static, persisted). I was getting raw, serialized events buried deep in `kwargs` during the stream, but a completely different, finalized structure from the database. I had to write a custom **normalization layer** on the frontend to ensure that the UI wouldn't break when transitioning from a live stream to a reloaded page.

### 6. Frontend Tool Control
I learned a way to trigger tools directly from the UI, **bypassing the LLM's standard reasoning loop** to give the user "override" power when they know the exact operation they need. Instead of relying on the LLM to infer intent, the frontend sends a pre-formatted tool request, **forcing the agent to act deterministically** and reducing unnecessary latency.

### 7. The "Memory" Architecture
I wanted the agent to actually **know the user**, making it remember user details across sessions by integrating a **long-term memory layer**. However I didn't want to just plug in a library without understanding the "magic" behind it, so I went down a rabbit hole learning **how agentic memory actually works:**

I learned that building a memory layer isn't just about saving memories upfront. In reality, a memory layer requires to instruct the LLM to inspect the user's message, compare it against existing context, and extract only new facts.
  
For this, I found a **boolean deduplication method** that uses structured outputs (Zod models) to force the LLM to return an `isNew` boolean flag alongside the memory text. This ensures we only trigger a write only if the information is actually novel, preventing duplicate entries.

However, after learning these internals, I decided to simply use a **third-party memory layer solution named Supermemory** instead of reinventing the wheel.

While using it, I discovered that Supermemory has an **indexing delay of about 30 seconds**. Due this, if a user mentioned their name and immediately started a new session, the agent would have **temporary amnesia** as Supermemory hadn't finished indexing the new memories yet.

To solve this, I experimented with a **local Write-Through Buffer** with a custom **90-second TTL (Time-To-Live)** for caching recent interactions in memory. However, I eventually decided to rely solely on Supermemory, avoiding any memory overhead at scale.

### 8. The Document Pipeline (Why I skipped standard RAG)
When adding PDF uploads, the immediate instinct anyone could get is to build a standard RAG (Retrieval-Augmented Generation) pipeline: parse the text, chunk it up, embed it, and shove it into a vector database like Pinecone.

But standard RAG has a fatal flaw: it is fundamentally a **retrieval** system, not a **reading** system. It is great for "needle-in-a-haystack" queries (e.g., *"What is the termination clause?"*), but the moment a user asks *"Summarize this document"* or *"What's the overall tone?"*, **RAG falls apart.** It just retrieves 5 somewhat-random chunks of text and hallucinates a summary from fragments. 

To fix this, the "industry standard" path is **Map-Reduce Summarization**—retrieving every chunk, summarizing them individually, and then synthesizing a final summary. But doing that on-demand is a nightmare. A 50-page PDF could spawn over 100 LLM calls, costing thousands of tokens and taking 30+ seconds just to start streaming. It tanks the UX.

I decided to move away from the Map-Reduce entirely and rethink the pipeline around a simple reality–**modern LLMs have massive 1M+ token context windows.** Why chunk the text at all when the model can just read the whole thing? 

Instead of a complex backend RAG architecture, I built a **Token-Gated Full-Context Pipeline**:
- **The Frontend Gate:** Before a file even touches Cloudinary, a Web Worker parses the PDF on the client side and checks its token count. I enforce a strict limit (e.g., 32k tokens per doc, max 5 docs per chat). By gating at the frontend, the backend is shielded from massive files that could break the context window. 
- **Raw Text Ingestion:** Once verified, the frontend uploads documents directly to Cloudinary using a signed URL. It then triggers the chat stream with the returned `public_id`s. 
The backend takes over from there: it fetches the files using recieved `public_id`s, extracts the text using `unpdf`, and dumps the raw content straight into a PostgreSQL column—bypassing embeddings entirely.
- **Intelligent Selection:** Before generating a response, the backend retrieves the text of all chat-related attachments and fires off a cheap, lightweight structured LLM call (via Zod). It looks at the context of the last 6 conversations and the *content* of the uploaded PDFs, and dynamically decides which documents are actually relevant to the current question. 
- **The Context Dump:** Once identified, the backend fetches the full raw text of only those selected documents from the database and inject them directly into the LangGraph prompt array. 

By providing the "full story" rather than disconnected fragments, the model can deliver coherent, whole-document answers in a single streaming response.

### 9. Client-Side Token Gating
To avoid hitting context limits and **prevent oversized PDFs from piling up in Cloudinary,** I needed to verify token counts of PDFs *before* they ever touched the server. It sounded simple on paper, but doing it entirely in the browser without getting frontend freezed turned into a real headache.

- **The PDF Parsing Problem:** 
  I initially tried `react-pdftotext`, but parsing large files on the main thread would freeze the entire UI. To fix this, I moved the parsing logic into a background Web Worker. But when I moved the logic to a **Web Worker,** it crashed immediately. Because workers don’t have access to DOM primitives and `react-pdftotext` relies heavily on DOM primitives—the library failed silently with a "Setting up fake worker" error, halting execution completely.

  Now to solve this, I ripped out the React wrapper and rewrote the worker using the core pure-JS based library `pdfjs-dist` instead. This allowed the worker to process the `ArrayBuffer` in the background without needing a DOM, keeping the interface perfectly fluid while the "heavy lifting" happened behind the scenes.

- **The Token Counting Problem:** 
  Once I had the raw text, I had to count the tokens. The standard `tiktoken` WASM version had constant compatibility issues inside the worker environment. To fix this, I switched to `js-tiktoken` (a pure JS implementation) and set it up to **lazy-load** inside the worker.

  This kept the main bundle light and the UI responsive. The app now silently validates the 32k token limit in the background, uploading the PDF only if once the token gating is complete and the context is safe.

### 10. The Document Ingestion Timeout Problem
I initially tried to handle PDF extraction directly inside the chat stream. **Big mistake.** I quickly realized that fetching a raw PDF, generating signed Cloudinary URLs, and running `unpdf` was too much "heavy lifting" for a streaming request. Because the chatbot is deployed as a serverless function, the gateway has a hard response-initiation window — if nothing is written to the stream within that window, it kills the connection entirely. Meaning, large PDFs could cause the stream to time out before the LLM even had a chance to start streaming its first token.

To fix this, I figured out a way that **splits the operation into two** distinct requests. Now, the frontend hits an `/api/ingest` endpoint first to handle the "heavy lifting"—loading documents, extracting the text and saving it to the database—before sending back a "ready" signal.

Only after that signal is received does the frontend trigger the actual `/api/chat` request. Since the text is already sitting in the database, the **TTFB (Time-To-First-Byte)** is nearly instant. It’s a much cleaner architecture than trying to "stream" a file download and an AI response at the same time.

---

## 🤝 Contributing
Got something to add? Contributions are welcome! Fork the repo, make your changes, and open a PR.

**Thanks for checking out this project! Happy shipping! ☕️**


