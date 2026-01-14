import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectPostgres } from "./config/sequelize.config.js";
import { authenticateJWT, configPassport } from "./config/passport.config.js";
import authorizeRoutes from "./routes/authorize.routes.js";
import protectedRoutes from "./routes/protected.routes.js";
import passport from "passport";

const app = express();

// Constants
const PORT = process.env.PORT || 4000;
const IS_PROD = process.env.NODE_ENV !== "development";

// Configs
connectPostgres();
configPassport();

// Middlewares
app.use(cors({
  origin: IS_PROD ? process.env.APP_ORIGIN : "http://localhost:3000",
  methods: ["GET", "PUT", "POST", "PATCH", "DELETE"],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Testing Routes
if (!IS_PROD){
  app.get("/api/ping", (req, res) => {
    res.send("pong");
  });
}

// Actual Routes
app.use("/api/authorize", authorizeRoutes);
app.use(authenticateJWT);
app.use("/api/protected", protectedRoutes);

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode at http://localhost:${PORT}`);
});