# Agent Guidelines

> This document provides comprehensive guidelines for AI coding agents working on this codebase. Follow these patterns and conventions to produce consistent, high-quality code.

---

## Project Overview

This is a **full-stack AI chatbot application** built as a monorepo with:

- **Frontend**: React 19 + Vite 7 + TailwindCSS v4 + shadcn/ui
- **Backend**: Express 5 + PostgreSQL (Supabase) + Sequelize ORM
- **Orchestration**: LangGraph with OpenAI GPT-4o-mini (via GitHub Models API)
- **Authentication**: Supabase Auth + Passport.js JWT + HTTP-only cookies
- **File Storage**: Cloudinary (signed uploads)
- **Usage Limits**: Upstash Redis (monthly query & upload quotas)

## Project Structure

```
chatbot/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx                  # Router configuration
│   │   ├── main.jsx                 # React entry point
│   │   ├── index.css                # TailwindCSS styles + Custom CSS styles + CSS variables
│   │   ├── components/ui/           # shadcn/ui primitives (button, input, sidebar, etc.)
│   │   ├── layouts/                 # Route layout wrappers (ProtectedLayout)
│   │   ├── pages/                   # Route-level components (ChatWindow, Login, etc.)
│   │   ├── hooks/                   # shadcn-specific hooks (use-mobile)
│   │   ├── lib/                     # Utility functions initialized by shadcn (includes utils.js with cn())
│   │   └── utils/
│   │       ├── actions/             # API action functions (chat.actions.js, upload.actions.js)
│   │       ├── components/          # Custom feature components (ChatSidebar, ChatInput)
│   │       ├── contexts/            # React contexts (AuthProvider)
│   │       ├── hooks/               # Custom hooks (useAuth, useLogout)
│   │       ├── workers/             # Web Workers (countTokensWorker.js)
│   │       └── ...                  # Other utility files (axios.jsx, toolParsing.js, indexedDB.js)
│   ├── public/
│   │   └── reset-rate-limit-storage.html  # Dev utility to wipe local caches
│   ├── package.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── components.json              # shadcn/ui configuration
│   └── jsconfig.json                # Path aliases (@/ ↔ ./src/)
│
├── server/                          # Express backend
│   ├── index.js                     # Entry point, middleware, route mounting
│   ├── package.json
│   ├── config/
│   │   ├── sequelize.config.js      # PostgreSQL + LangGraph checkpointer
│   │   ├── passport.config.js       # JWT strategy with Supabase JWKS
│   │   ├── workflow.config.js       # LangGraph StateGraph configuration
│   │   └── supermemory.config.js    # Supermemory client configuration
│   ├── routes/
│   │   ├── authorize.routes.js      # Public auth routes
│   │   ├── chat.routes.js           # Authenticated chat routes
│   │   └── upload.routes.js         # Cloudinary upload signature route
│   ├── controllers/
│   │   ├── authorize.controllers.js    # Auth logic
│   │   ├── chat.controllers.js         # Chat/thread logic
│   │   └── upload.controllers.js       # Cloudinary upload logic
│   ├── middlewares/                 
│   │   └── rateLimiter.middlewares.js  # Upstash Redis rate limiting
│   ├── models/
│   │   ├── user.models.js              # User Sequelize model
│   │   └── thread.models.js            # Thread model + associations
│   ├── clients/
│   │   ├── supabase.clients.js         # Supabase admin client
│   │   └── googleoauth2.clients.js     # Google OAuth client
│   ├── scripts/                        # One-time setup and maintenance scripts
│   │   ├── createPersistenceTables.js
│   │   └── resetUpstashRateLimits.js
│   └── tools/                          # Tools for AI agent
│
├── .gitignore
├── AGENTS.md                           # This file
└── README.md
```

## Build and Test Commands

### Client Commands

```bash
cd client

# Development
npm install              # Install dependencies
npm run dev              # Start dev server (http://localhost:3000)

# Production
npm run build            # Build for production (output: dist/)
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
```

### Server Commands

```bash
cd server

# Development
npm install              # Install dependencies
npm run dev              # Start with nodemon + dotenv (auto-reload)

# Production
npm run start            # Start production server

# Utilities
npm run persistence:init # Setup LangGraph persistence tables (checkpoints, writes)
npm run rateLimits:reset # Reset Upstash Redis rate limit cache
```

### Quick Start (Full Stack)

```bash
# Terminal 1 - Backend
cd server && npm install && npm run dev

# Terminal 2 - Frontend
cd client && npm install && npm run dev
```

### Environment Variables

**Client (.env)**:
```
VITE_BASE_API_ENDPOINT=http://localhost:4000/api
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_REDIRECT_URI=http://localhost:4000/api/authorize/google/callback
```

**Server (.env)**:
```
NODE_ENV=development
PORT=4000
CLIENT_APP_ORIGIN_URL=http://localhost:3000
SUPABASE_PG_URI=
SUPABASE_PROJECT_URL=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/authorize/google/callback
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY= 
CLOUDINARY_API_SECRET= 
GITHUB_TOKEN=
TAVILY_API_KEY=
SUPERMEMORY_API_KEY=
FIRECRAWL_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Frontend Code Guidelines

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Pages | PascalCase.jsx | `ChatWindow.jsx`, `Login.jsx` |
| UI Components (shadcn) | lowercase.jsx | `button.jsx`, `sidebar.jsx` |
| Custom Feature Components | PascalCase.jsx | `ChatSidebar.jsx`, `ChatInput.jsx` |
| Hooks | camelCase.jsx (custom) or kebab-case.js (shadcn) | `useAuth.jsx`, `use-mobile.js` |
| Actions | domain.actions.js | `chat.actions.js`, `authorize.actions.js` |
| Contexts | PascalCaseProvider.jsx | `AuthProvider.jsx` |

### Import Patterns

**Use absolute imports with `@/` alias:**

```jsx
// Good - Absolute imports
import { Button } from "@/components/ui/button"
import { useAuth } from "@/utils/hooks/useAuth"

// Acceptable: Relative imports within the same directory or one directory level up
// ./ for the same directory
// ../ for one directory level up

// Not acceptable:
// ../../ or deeper relative paths
```

### Export Patterns

```jsx
// Pages and custom feature components - default export
export default function ChatWindow() { }
export default ChatInput

// UI components (shadcn) - named exports
export { Button, buttonVariants }
export { Sidebar, SidebarContent, SidebarProvider, useSidebar }

// Action functions - named exports
export async function loadChatThreadsAction() { }

// Contexts - mixed exports
export const AuthContext = createContext(null)  // Named
export default AuthProvider                     // Default
```

### API Communication

**Create action functions in `utils/actions/`:**

```jsx
// chat.actions.js
import axios from "../axios"

export async function loadChatThreadsAction() {
  try {
    const response = await axios.get("/chat/threads");
    return response.data; 
  } catch (error) {
    console.error("Load Threads Error:", error);
    return handleAxiosError(error, "Failed to load chat threads!");
  }
}

function handleAxiosError(error, defaultMessage) {
  if (error?.response) {
    return { error: error.response.data?.message || defaultMessage }
  }
  if (error?.request) {
    return { error: "No response from server. Please check your connection." }
  }
  return { error: defaultMessage }
}
```

### Error Handling

**Return error objects from actions, handle in components:**

```jsx
// In component
const onSubmit = async (data) => {
  setLoading(true)
  try {
    const result = await loginAction(data)
    if (result.error) {
      setLoginError(result.error)
    } else {
      setAuth(result)
      navigate(from, { replace: true })
    }
  } catch (e) {
    setLoginError("Login failed! Please, try again.")
    console.error("Login failed: ", e)
  } finally {
    setLoading(false)
  }
}

// Display errors inline
{error && <span className="text-red-500">{error}</span>}
```

### Styling with Tailwind

**Use the `cn()` utility for conditional classes:**

```jsx
import { cn } from "@/lib/utils"

<button className={cn(
  "px-4 py-2 rounded-md",
  isActive && "bg-primary text-white",
  disabled && "opacity-50 cursor-not-allowed"
)}>
  Submit
</button>
```

## Backend Code Guidelines

### Express App Structure

**Entry point pattern (index.js):**

```javascript
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import passport from "passport"

const app = express()

// Constants
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";
const CLIENT_APP_ORIGIN_URL = process.env.CLIENT_APP_ORIGIN_URL || "http://localhost:3000"

// Configs
connectPostgres()
configPassport()

// Middlewares
app.use(cors({
  origin: CLIENT_APP_ORIGIN_URL,
  methods: ["GET", "PUT", "POST", "PATCH", "DELETE"],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.url}`);
  console.log(`Cookies present:`, req.cookies ? Object.keys(req.cookies) : "None");
  next();
});

// Routes
app.use("/api/authorize", authorizeRoutes)   // Public
app.use(authenticateJWT)                     // Auth middleware (applied to all routes below)
app.use("/api/chat", chatRoutes)             // Protected chat routes
app.use("/api/upload", uploadRoutes)         // Protected upload routes
```

### Route Organization

**Domain-based separation:**

```javascript
// authorize.routes.js - Public routes (/api/authorize/*)
const router = Router()
router.post("/login", login)
router.post("/register", register)
router.post("/logout", logout)
router.get("/me", authenticateJWT, (req, res) => {
  res.status(200).json({ isAuthenticated: true, user: req.user })
})

// chat.routes.js - Authenticated routes (/api/chat/*)
const router = express.Router()
router.get("/threads", loadChatThreads)              // GET  /api/chat/threads
router.get("/:threadId", loadChatHistory)            // GET  /api/chat/:threadId
router.post("/stream", chatWithModelStream)          // POST /api/chat/stream (SSE)
router.put("/pin/:threadId/:action", setPinStatus)   // PUT  /api/chat/pin/:threadId/:action
router.delete("/:threadId", deleteThread)            // DELETE /api/chat/:threadId
```

### Controller Patterns

**Async/await with try-catch and consistent responses:**

```javascript
export const loadChatThreads = async (req, res) => {
  try {
    // 1. Validate authentication
    const userId = req.user?.id
    if (!userId) 
      return res.status(401).json({ message: "Unauthorized" })

    // 2. Database operation
    const threads = await Thread.findAll({
      where: { userId },
      order: [['isPinned', 'DESC'], ['updatedAt', 'DESC']],
      attributes: ['threadId', 'title', 'updatedAt', 'isPinned']
    })

    // 3. Format response
    const formattedThreads = threads.map(t => ({
      threadId: t.threadId,
      threadName: t.title,
      updatedAt: t.updatedAt,
      isPinned: t.isPinned
    }))

    res.json({ threads: formattedThreads })
  } catch (error) {
    console.error("Error loading threads:", error.stack)
    res.status(500).json({ message: "Internal Server Error" })
  }
}
```

### Sequelize Model Patterns

**Model definition with validations:**

```javascript
export const User = sequelize.define(
  "User",
  {
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: { len: [3, 30] },
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: { isEmail: true },
    },
    roles: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: ["user"], 
      allowNull: false,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: [sequelize.fn("LOWER", sequelize.col("username"))],
        name: "users_username_lower_unique",
      },
    ],
  }
)
```

**Define associations directly in the related model files:**

```javascript
// In thread.models.js
User.hasMany(Thread, { foreignKey: "userId", as: "threads" })
Thread.belongsTo(User, { foreignKey: "userId", as: "user" })
```

### Database Query Patterns

```javascript
// Case-insensitive lookup
import { fn, col, where } from "sequelize"
const user = await User.findOne({
  where: where(fn("LOWER", col("username")), "=", username.toLowerCase()),
})

// Ordered query with attribute selection
const threads = await Thread.findAll({
  where: { userId },
  order: [['isPinned', 'DESC'], ['updatedAt', 'DESC']],
  attributes: ['threadId', 'title', 'updatedAt', 'isPinned']
})

// Force timestamp update
thread.changed('updatedAt', true)
await thread.save()
```

### Authentication Pattern

**JWT extraction from HTTP-only cookies:**

```javascript
const jwtOptions = {
  jwtFromRequest: (req) => req?.cookies?.authJwt || null,
  secretOrKeyProvider: passportJwtSecret({
    cache: true,
    rateLimit: true,
    jwksUri: `${process.env.SUPABASE_PROJECT_URL}/auth/v1/.well-known/jwks.json`
  }),
  algorithms: ['ES256'],
  issuer: `${process.env.SUPABASE_PROJECT_URL}/auth/v1`,
  audience: 'authenticated'
}
```

**Setting auth cookie:**

```javascript
res.cookie("authJwt", data.session?.access_token, {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? "None" : "Lax",
  maxAge: 60 * 60 * 1000, // 60 minutes
})
```

### External Client Pattern

**Singleton exports:**

```javascript
// supabase.clients.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
```

## Common Patterns Summary

### Do's

- Use `@/` absolute imports for cross-directory imports
- Return `{ error: string }` from action functions on failure
- Use `cn()` utility for conditional Tailwind classes
- Define Sequelize models with explicit table names and timestamps
- Memoize context values with `useMemo`
- Log errors with `console.error` before returning error responses

### Don'ts

- Design solutions such that they don't expose sensitive env variables
- Don't use class components
- Don't skip error handling in async functions
- Don't use `require()` syntax (use ES Modules)
- Don't create centralized error middleware (use inline try-catch)
- Don't skip authentication checks in protected controllers
