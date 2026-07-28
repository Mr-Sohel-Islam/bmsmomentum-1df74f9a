import { Router } from "express";
import { ApprovalController } from "../controllers/approval.controller";
import { asyncHandler } from "../utils/response";

const router = Router();

router.get("/workflows", asyncHandler(ApprovalController.getWorkflows));
router.post("/workflows", asyncHandler(ApprovalController.createWorkflow));
router.put("/workflows/:id", asyncHandler(ApprovalController.updateWorkflow));
router.delete("/workflows/:id", asyncHandler(ApprovalController.deleteWorkflow));
router.post("/workflows/:id/steps", asyncHandler(ApprovalController.addStep));
router.delete("/steps/:stepId", asyncHandler(ApprovalController.deleteStep));
router.get("/requests", asyncHandler(ApprovalController.getRequests));
router.post("/requests", asyncHandler(ApprovalController.createRequest));
router.post("/requests/:id/action", asyncHandler(ApprovalController.recordAction));

export default router;
