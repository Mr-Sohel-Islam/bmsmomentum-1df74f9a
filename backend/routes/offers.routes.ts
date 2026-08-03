import { Router } from "express";
import { OffersController, NotificationsController } from "../controllers/offers.controller";
import { asyncHandler } from "../utils/response";
import { requireAuth, requirePermission } from "../middleware/auth.middleware";

const router = Router();

const read = [requireAuth, requirePermission("performance:read")] as const;

router
  .route("/offers")
  .get(...read, asyncHandler(OffersController.list))
  .post(...read, asyncHandler(OffersController.create));

router.get("/offers/recipients", ...read, asyncHandler(OffersController.allRecipients));

router
  .route("/offers/:id")
  .get(...read, asyncHandler(OffersController.get))
  .put(...read, asyncHandler(OffersController.update))
  .delete(...read, asyncHandler(OffersController.remove));

router.get("/offers/:id/recipients", ...read, asyncHandler(OffersController.recipients));
router.post("/offers/:id/send", ...read, asyncHandler(OffersController.send));
router.post("/offers/:id/dispatch", ...read, asyncHandler(OffersController.dispatchNow));
router.delete(
  "/offers/:id/recipients/:recipientId",
  ...read,
  asyncHandler(OffersController.removeRecipient),
);

router.get("/notifications", requireAuth, asyncHandler(NotificationsController.list));
router.post("/notifications/read-all", requireAuth, asyncHandler(NotificationsController.markAllRead));
router.delete("/notifications", requireAuth, asyncHandler(NotificationsController.clear));
router.put("/notifications/:id", requireAuth, asyncHandler(NotificationsController.markRead));

export default router;
