import { Router } from "express";

const router = Router();

const verifyRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles;
    if (!userRoles?.length) return res.sendStatus(401); // No roles assigned

    // Check if at least one role is allowed
    const hasRole = userRoles.some(role => allowedRoles.includes(role));
    if (!hasRole) return res.sendStatus(403); // Forbidden

    next();
  };
};

router.get("/blogs", verifyRoles("user", "admin", "moderator"), (req, res) => res.sendStatus(200));
router.get("/lounge", verifyRoles("admin", "moderator"), (req, res) => res.sendStatus(200));
router.get("/admin", verifyRoles("admin"), (req, res) => res.sendStatus(200));
router.get("/moderator", verifyRoles("moderator"), (req, res) => res.sendStatus(200));

export default router;
