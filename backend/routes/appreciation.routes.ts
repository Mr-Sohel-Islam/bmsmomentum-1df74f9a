import { Router } from "express";
import { AppreciationController } from "../controllers/appreciation.controller";
import { asyncHandler } from "../utils/response";

const router = Router();

router.get("/appreciations", asyncHandler(AppreciationController.getAppreciations));
router.post("/appreciations", asyncHandler(AppreciationController.createAppreciation));

export default router;
