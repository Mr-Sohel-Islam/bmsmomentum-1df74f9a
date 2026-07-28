import { Router } from "express";
import { ApprovalController } from "../controllers/approval.controller";
import { asyncHandler } from "../utils/response";
import { requireAuth, requirePermission } from "../middleware/auth.middleware";

const router = Router();

router.get("/workflows", requireAuth, requirePermission("approvals:read"), asyncHandler(ApprovalController.getWorkflows));
router.post("/workflows", requireAuth, requirePermission("approvals:manage"), asyncHandler(ApprovalController.createWorkflow));
router.put("/workflows/:id", requireAuth, requirePermission("approvals:manage"), asyncHandler(ApprovalController.updateWorkflow));
router.delete("/workflows/:id", requireAuth, requirePermission("approvals:manage"), asyncHandler(ApprovalController.deleteWorkflow));
router.post("/workflows/:id/steps", requireAuth, requirePermission("approvals:manage"), asyncHandler(ApprovalController.addStep));
router.delete("/steps/:stepId", requireAuth, requirePermission("approvals:manage"), asyncHandler(ApprovalController.deleteStep));

router.get("/requests", requireAuth, requirePermission("approvals:read"), asyncHandler(ApprovalController.getRequests));
router.post("/requests", requireAuth, requirePermission("approvals:create"), asyncHandler(ApprovalController.createRequest));
router.post("/requests/:id/action", requireAuth, requirePermission("approvals:action"), asyncHandler(ApprovalController.recordAction));

export default router;
