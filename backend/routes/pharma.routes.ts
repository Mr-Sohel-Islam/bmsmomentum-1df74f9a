import { Router } from "express";
import { PharmaController } from "../controllers/pharma.controller";
import { asyncHandler } from "../utils/response";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware";

const router = Router();

// Doctors Management Routes
router.get("/doctors", optionalAuth, asyncHandler(PharmaController.getDoctors));
router.post("/doctors", optionalAuth, asyncHandler(PharmaController.createDoctor));
router.put("/doctors/:id", requireAuth, asyncHandler(PharmaController.updateDoctor));

// Trade Entities Routes (Chemists, Wholesalers, Distributors)
router.get("/trade-entities", optionalAuth, asyncHandler(PharmaController.getTradeEntities));
router.post("/trade-entities", optionalAuth, asyncHandler(PharmaController.createTradeEntity));

// Work Station Daily Reports Routes
router.get("/daily-reports", optionalAuth, asyncHandler(PharmaController.getDailyReports));
router.post("/daily-reports", optionalAuth, asyncHandler(PharmaController.createDailyReport));

// 3D Detailing Pharma Products Routes
router.get("/pharma-products", optionalAuth, asyncHandler(PharmaController.getPharmaProducts));

export default router;
