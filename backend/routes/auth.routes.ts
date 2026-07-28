import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { asyncHandler } from "../utils/response";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/login", asyncHandler(AuthController.login));
router.get("/me", requireAuth, asyncHandler(AuthController.me));

export default router;
