import { Router } from "express";
import { PharmaController } from "../controllers/pharma.controller";
import { asyncHandler } from "../utils/response";
import { requireAuth, requirePermission } from "../middleware/auth.middleware";

const router = Router();

const protect = (permission: string) => [requireAuth, requirePermission(permission)] as const;

router
  .route("/doctors")
  .get(...protect("pharma:read"), asyncHandler(PharmaController.getDoctors))
  .post(...protect("pharma:create"), asyncHandler(PharmaController.createDoctor));
router.put(
  "/doctors/:id",
  ...protect("pharma:create"),
  asyncHandler(PharmaController.updateDoctor),
);

router
  .route("/trade-entities")
  .get(...protect("trade:read"), asyncHandler(PharmaController.getTradeEntities))
  .post(...protect("trade:create"), asyncHandler(PharmaController.createTradeEntity));

router
  .route("/daily-reports")
  .get(...protect("reports:read"), asyncHandler(PharmaController.getDailyReports))
  .post(...protect("reports:create"), asyncHandler(PharmaController.createDailyReport));

router.get(
  "/pharma-products",
  ...protect("detailing:read"),
  asyncHandler(PharmaController.getPharmaProducts),
);

router.get(
  "/special-days",
  ...protect("pharma:read"),
  asyncHandler(PharmaController.getSpecialDays),
);

export default router;
