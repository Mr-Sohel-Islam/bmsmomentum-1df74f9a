import { Router } from "express";
import { PerformanceController } from "../controllers/performance.controller";
import { asyncHandler } from "../utils/response";

const router = Router();

router.get("/metrics", asyncHandler(PerformanceController.getMetrics));
router.post("/metrics", asyncHandler(PerformanceController.createMetric));
router.put("/metrics/:id", asyncHandler(PerformanceController.updateMetric));
router.delete("/metrics/:id", asyncHandler(PerformanceController.deleteMetric));

router.get("/metrics/scores", asyncHandler(PerformanceController.getAllScores));
router.get("/metrics/scores/user/:userId", asyncHandler(PerformanceController.getUserScores));
router.post("/metrics/scores", asyncHandler(PerformanceController.addScore));
router.delete("/metrics/scores/:id", asyncHandler(PerformanceController.deleteScore));

export default router;
