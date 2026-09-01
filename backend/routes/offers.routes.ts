import { Router } from "express";
import { OffersController, NotificationsController } from "../controllers/offers.controller";
import { asyncHandler } from "../utils/response";
import { requireAuth, requirePermission } from "../middleware/auth.middleware";

const router = Router();

const canRead = [requireAuth, requirePermission("offers:read")] as const;
const canCreate = [requireAuth, requirePermission("offers:create")] as const;
const canUpdate = [requireAuth, requirePermission("offers:update")] as const;
const canDelete = [requireAuth, requirePermission("offers:delete")] as const;
const canSend = [requireAuth, requirePermission("offers:send")] as const;
const canDispatch = [requireAuth, requirePermission("offers:dispatch")] as const;
const canViewLogs = [requireAuth, requirePermission("offers:logs", "offers:send")] as const;

router
  .route("/offers")
  .get(...canRead, asyncHandler(OffersController.list))
  .post(...canCreate, asyncHandler(OffersController.create));

router.get("/offers/recipients", ...canViewLogs, asyncHandler(OffersController.allRecipients));

router
  .route("/offers/:id")
  .get(...canRead, asyncHandler(OffersController.get))
  .put(...canUpdate, asyncHandler(OffersController.update))
  .delete(...canDelete, asyncHandler(OffersController.remove));

router.get("/offers/:id/recipients", ...canViewLogs, asyncHandler(OffersController.recipients));
router.post("/offers/:id/send", ...canSend, asyncHandler(OffersController.send));
router.post("/offers/:id/dispatch", ...canDispatch, asyncHandler(OffersController.dispatchNow));
router.delete(
  "/offers/:id/recipients/:recipientId",
  ...canSend,
  asyncHandler(OffersController.removeRecipient),
);

router.get("/notifications", requireAuth, asyncHandler(NotificationsController.list));
router.post(
  "/notifications/read-all",
  requireAuth,
  asyncHandler(NotificationsController.markAllRead),
);
router.delete("/notifications", requireAuth, asyncHandler(NotificationsController.clear));
router.put("/notifications/:id", requireAuth, asyncHandler(NotificationsController.markRead));

export default router;
