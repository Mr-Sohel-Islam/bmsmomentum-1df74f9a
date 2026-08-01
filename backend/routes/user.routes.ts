import { Router, Request, Response } from "express";
import { UserController } from "../controllers/user.controller.js";
import { AuthController } from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/response.js";
import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";
import { resetAndSeedDatabase } from "../db.js";

const router = Router();

// Reset and Seed complete application flows
router.post("/reset-seed", requireAuth, requirePermission("users:manage"), async (_req: Request, res: Response) => {
  try {
    await resetAndSeedDatabase();
    return res.json({
      success: true,
      message: "Database cleared and re-initialized with complete application flows (Sprints, Epics, Tasks, Products, Onboarding, Approvals, Hierarchy).",
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/profiles", requireAuth, requirePermission("users:read"), asyncHandler(UserController.getProfiles));
router.get("/profiles/:id", requireAuth, requirePermission("users:read"), asyncHandler(UserController.getProfileById));
router.post("/profiles", requireAuth, requirePermission("users:manage"), asyncHandler(UserController.upsertProfile));
router.put("/profiles/:id", requireAuth, requirePermission("users:manage"), asyncHandler(UserController.updateProfile));
router.delete("/profiles/:id", requireAuth, requirePermission("users:manage"), asyncHandler(UserController.deleteUser));

router.put("/profiles/:id/roles", requireAuth, requirePermission("users:manage"), asyncHandler(UserController.setUserRoles));
router.post("/roles", requireAuth, requirePermission("users:manage"), asyncHandler(UserController.addRole));

router.put("/profiles/:id/permissions", requireAuth, requirePermission("users:manage"), asyncHandler(UserController.setUserPermissions));
router.post("/permissions", requireAuth, requirePermission("users:manage"), asyncHandler(UserController.addPermission));

router.post("/profiles/:id/reset-password", requireAuth, requirePermission("users:manage"), asyncHandler(AuthController.resetPassword));

export default router;
