import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectPostgres } from "./config/sequelize.config.js";
import { authenticateJWT, configPassport } from "./config/passport.config.js";
import authorizeRoutes from "./routes/authorize.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import passport from "passport";

const app = express();

// Constants
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";
const CLIENT_APP_ORIGIN_URL = process.env.CLIENT_APP_ORIGIN_URL || "http://localhost:3000"

// Configs
connectPostgres();
configPassport();

// Middlewares
app.use(cors({
  origin: CLIENT_APP_ORIGIN_URL,
  methods: ["GET", "PUT", "POST", "PATCH", "DELETE"],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

if (NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`📍 ${req.method} ${req.url}`);
    console.log(`Cookies present:`, req.cookies ? Object.keys(req.cookies) : "None");
    next();
  });
}



// Root Route
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>chatbot</title>
      </head>
      <style>
        *, *::before, *::after{
          padding: 0;
          margin: 0;
          box-sizing: border-box;
        }
        ::selection {
          background-color: rgb(252, 181, 59, 0.05); 
          color: #FCB53B;
        }
        body{
          min-height: 100vh;
          background: #191919;
          font-family: "Lucida Console", Monaco, monospace;
        }
        h1{
          padding: 1rem;
          color: #FFF287;
        }
      </style>
      <body>
        <h1>Server is up and running!</h1>
      </body>
    </html>
  `);
});

// Actual Routes
app.use("/api/authorize", authorizeRoutes);
app.use(authenticateJWT);
app.use("/api/chat", chatRoutes);
app.use("/api/upload", uploadRoutes);

app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode at http://localhost:${PORT}`);
});