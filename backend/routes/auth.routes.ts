import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/response.js";
import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", asyncHandler(AuthController.login));
router.get("/me", requireAuth, asyncHandler(AuthController.me));
router.post("/change-password", requireAuth, asyncHandler(AuthController.changePassword));
router.post(
  "/users/:id/reset-password",
  requireAuth,
  requirePermission("users:manage"),
  asyncHandler(AuthController.resetPassword),
);

export default router;
