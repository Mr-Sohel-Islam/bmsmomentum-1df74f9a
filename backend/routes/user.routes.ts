import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { asyncHandler } from "../utils/response";
import { requireAuth, requirePermission } from "../middleware/auth.middleware";

const router = Router();

router.get("/profiles", requireAuth, requirePermission("users:read"), asyncHandler(UserController.getProfiles));
router.get("/profiles/:id", requireAuth, requirePermission("users:read"), asyncHandler(UserController.getProfileById));
router.post("/profiles", requireAuth, requirePermission("users:manage"), asyncHandler(UserController.upsertProfile));
router.put("/profiles/:id", requireAuth, requirePermission("users:manage"), asyncHandler(UserController.updateProfile));
router.delete("/profiles/:id", requireAuth, requirePermission("users:manage"), asyncHandler(UserController.deleteUser));

router.put("/profiles/:id/roles", requireAuth, requirePermission("users:roles"), asyncHandler(UserController.setUserRoles));
router.post("/roles", requireAuth, requirePermission("users:roles"), asyncHandler(UserController.addRole));

router.put("/profiles/:id/permissions", requireAuth, requirePermission("users:roles"), asyncHandler(UserController.setUserPermissions));
router.post("/permissions", requireAuth, requirePermission("users:roles"), asyncHandler(UserController.addPermission));

export default router;
