import { Router } from "express";
import { login, register, logout } from "../controllers/authorize.controllers.js";
import { authenticateJWT } from "../config/passport.config.js";

const router = Router();

/**
 * ⚠️ ALL auth endpoints MUST return identical user structure
 * Applies to: /login, /register, /me, /refresh
 * 
 * Why: Frontend auth context gets populated from different endpoints:
 *   - In signing in → /login response
 *   - In signing up → /register response  
 *   - On Page reload → /me response
 */

router.post("/login", login);
router.post("/register", register);
router.post("/logout", logout);
router.get("/me", authenticateJWT, (req, res) => {
  res.status(200).json({ isAuthenticated: true, user: req.user });
});

export default router;