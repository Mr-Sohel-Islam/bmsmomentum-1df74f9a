import { Router } from "express";
import { TeamController } from "../controllers/team.controller";
import { asyncHandler } from "../utils/response";
import { requireAuth, requirePermission } from "../middleware/auth.middleware";

const router = Router();

router.get("/teams", requireAuth, requirePermission("teams:read"), asyncHandler(TeamController.getTeams));
router.post("/teams", requireAuth, requirePermission("teams:manage"), asyncHandler(TeamController.createTeam));
router.put("/teams/:id", requireAuth, requirePermission("teams:manage"), asyncHandler(TeamController.updateTeam));
router.delete("/teams/:id", requireAuth, requirePermission("teams:manage"), asyncHandler(TeamController.deleteTeam));

router.get("/teams/:id/members", requireAuth, requirePermission("teams:read"), asyncHandler(TeamController.getTeamMembers));
router.post("/teams/:id/members", requireAuth, requirePermission("teams:members"), asyncHandler(TeamController.addTeamMember));
router.delete("/teams/:id/members/:userId", requireAuth, requirePermission("teams:members"), asyncHandler(TeamController.removeTeamMember));

router.get("/positions", requireAuth, requirePermission("teams:read"), asyncHandler(TeamController.getPositions));
router.post("/positions", requireAuth, requirePermission("teams:manage"), asyncHandler(TeamController.createPosition));
router.put("/positions/:id", requireAuth, requirePermission("teams:manage"), asyncHandler(TeamController.updatePosition));
router.delete("/positions/:id", requireAuth, requirePermission("teams:manage"), asyncHandler(TeamController.deletePosition));

export default router;
