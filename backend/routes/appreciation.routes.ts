import { Router } from "express";
import { AppreciationController } from "../controllers/appreciation.controller";
import { asyncHandler } from "../utils/response";
import { requireAuth, requirePermission } from "../middleware/auth.middleware";

const router = Router();

router.get("/appreciations", requireAuth, requirePermission("performance:read"), asyncHandler(AppreciationController.getAppreciations));
router.post("/appreciations", requireAuth, requirePermission("performance:read"), asyncHandler(AppreciationController.createAppreciation));

export default router;
