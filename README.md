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
    Create a `.env` file in the `server` folder. You can copy the structure from `.env.example`:
    ```env
    PORT=4000
    NODE_ENV=development
    CLIENT_APP_ORIGIN_URL=http://localhost:3000
    
    # Supabase (Database & Auth)
    SUPABASE_PG_URI=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
    SUPABASE_PROJECT_URL=https://[PROJECT_ID].supabase.co
    SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
    
    # Google OAuth
    GOOGLE_CLIENT_ID=[YOUR_CLIENT_ID]
    GOOGLE_CLIENT_SECRET=[YOUR_CLIENT_SECRET]
    GOOGLE_REDIRECT_URI=http://localhost:4000/api/authorize/google/callback
    
    # Cloudinary
    CLOUDINARY_CLOUD_NAME=
    CLOUDINARY_API_KEY= 
    CLOUDINARY_API_SECRET= 

    # AI Providers
    TAVILY_API_KEY=[YOUR_TAVILY_KEY]
    GITHUB_TOKEN=[YOUR_GITHUB_TOKEN]
    SUPERMEMORY_API_KEY=[YOUR_SUPERMEMORY_API_KEY]
    ```

4. **Start the server application:**
    ```bash
    npm run dev
    ```

5. **Set up the client application:** <br/>
    Open a new terminal window:
    ```bash
    cd client
    npm install
    ```
    
4. **Configure your client environment:** <br/>
    Create a `.env` file in the `client` folder. You can copy the structure from `.env.example`:
    ```env
    # Google OAuth
    VITE_BASE_API_ENDPOINT=http://localhost:4000/api
    VITE_GOOGLE_CLIENT_ID=[YOUR_CLIENT_ID]
    VITE_GOOGLE_REDIRECT_URI=http://localhost:4000/api/authorize/google/callback
    ```
    
6. **Start the client application:**
    ```bash
    npm run dev
    ```
    **You're live!** Open [http://localhost:3000](http://localhost:3000) to see it in action.

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
  - I learned that building a memory layer isn't just about saving memories upfront. In reality, a memory layer requires to instruct the LLM to inspect the user's message, compare it against existing context, and extract only new facts.
  - For this, I found a **boolean deduplication method** that uses structured outputs (Zod models) to force the LLM to return an `isNew` boolean flag alongside the memory text. This ensures we only trigger a write only if the information is actually novel, preventing duplicate entries.

However, after learning the internals, I decided to simply use a **third-party memory layer solution named Supermemory** instead of reinventing the wheel.

While using it, I discovered that Supermemory has an **indexing delay of about 30 seconds**. Due this, if a user mentioned their name and immediately started a new session, the agent would have **temporary amnesia** as Supermemory hadn't finished indexing the new memories yet.

To solve this, I experimented with a **local Write-Through Buffer** with a custom **90-second TTL (Time-To-Live)** for caching recent interactions in memory. However, I eventually decided to rely solely on Supermemory, avoiding any memory overhead at scale.

---

## 🤝 Contributing
Got something to add? Contributions are welcome! Fork the repo, make your changes, and open a PR.

**Thanks for checking out this project! Happy shipping! ☕️**


