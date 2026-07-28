import { Router } from "express";
import { PerformanceController } from "../controllers/performance.controller";
import { asyncHandler } from "../utils/response";
import { requireAuth, requirePermission } from "../middleware/auth.middleware";

const router = Router();

router.get("/metrics", requireAuth, requirePermission("performance:read"), asyncHandler(PerformanceController.getMetrics));
router.post("/metrics", requireAuth, requirePermission("performance:manage"), asyncHandler(PerformanceController.createMetric));
router.put("/metrics/:id", requireAuth, requirePermission("performance:manage"), asyncHandler(PerformanceController.updateMetric));
router.delete("/metrics/:id", requireAuth, requirePermission("performance:manage"), asyncHandler(PerformanceController.deleteMetric));

router.get("/metrics/scores", requireAuth, requirePermission("performance:read"), asyncHandler(PerformanceController.getAllScores));
router.get("/metrics/scores/user/:userId", requireAuth, requirePermission("performance:read"), asyncHandler(PerformanceController.getUserScores));
router.post("/metrics/scores", requireAuth, requirePermission("performance:evaluate"), asyncHandler(PerformanceController.addScore));
router.delete("/metrics/scores/:id", requireAuth, requirePermission("performance:evaluate"), asyncHandler(PerformanceController.deleteScore));

export default router;
