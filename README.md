# Chatbot

A project built to explore advanced agentic patterns, featuring **database persistence**, **conversational memory**, **autonomous tool calling**, and **real-time token streaming**.

---

<img width="1574" height="969" alt="Project Demo" src="https://github.com/user-attachments/assets/4806c3c8-0431-458e-a1d7-5fae37bbc24a" />

---

## 📦 How to setup locally

### Prerequisites
To get this running locally, you'll need a few standard tools:
- **Node.js & npm**
- **Supabase Project:** Authentication and PostgreSQL Database
- **Cloudinary:** Blob Storage for Document Ingestion
- **Google Cloud Project:** OAuth 2.0 Integration (Sign in with Google)
- **Upstash Redis Instance:** Rate Limiting and Caching

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

4. **Set up the persistence and memory tables (one-time only):** <br/>
    Before starting the server for the first time, run these scripts to create the LangGraph persistence tables (`checkpoints`, `writes`) and memory store tables in your Supabase database:
    ```bash
    npm run checkpoints:init
    npm run memory:init
    ```
    > You only need to do this once. It's safe to re-run — uses `CREATE TABLE IF NOT EXISTS`.

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

### Resetting Rate Limits
> For testing rate-limiting logic

**Server-Side:** Run `npm run rateLimits:reset` to flush the rate limiting cache from Upstash Redis.

**Client-Side:** Navigate to `http://localhost:3000/reset-rate-limit-storage.html` in your browser. It's a dedicated "System Purge" page that wipes local IndexedDB, cookies, and session storage in one click.

---

## 🤝 Contributing
Got something to add? Contributions are welcome! Fork the repo, make your changes, and open a PR.

**Thanks for checking out this project! Happy shipping! ☕️**


