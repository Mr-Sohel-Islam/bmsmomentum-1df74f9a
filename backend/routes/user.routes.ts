import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { asyncHandler } from "../utils/response";

const router = Router();

router.get("/profiles", asyncHandler(UserController.getProfiles));
router.get("/profiles/:id", asyncHandler(UserController.getProfileById));
router.post("/profiles", asyncHandler(UserController.upsertProfile));
router.put("/profiles/:id", asyncHandler(UserController.updateProfile));
router.delete("/profiles/:id", asyncHandler(UserController.deleteUser));

router.put("/profiles/:id/roles", asyncHandler(UserController.setUserRoles));
router.post("/roles", asyncHandler(UserController.addRole));

router.put("/profiles/:id/permissions", asyncHandler(UserController.setUserPermissions));
router.post("/permissions", asyncHandler(UserController.addPermission));

export default router;
