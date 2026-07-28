import { Router } from "express";
import { TeamController } from "../controllers/team.controller";
import { asyncHandler } from "../utils/response";

const router = Router();

router.get("/teams", asyncHandler(TeamController.getTeams));
router.post("/teams", asyncHandler(TeamController.createTeam));
router.put("/teams/:id", asyncHandler(TeamController.updateTeam));
router.delete("/teams/:id", asyncHandler(TeamController.deleteTeam));
router.get("/teams/:id/members", asyncHandler(TeamController.getTeamMembers));
router.post("/teams/:id/members", asyncHandler(TeamController.addTeamMember));
router.delete("/teams/:id/members/:userId", asyncHandler(TeamController.removeTeamMember));
router.get("/positions", asyncHandler(TeamController.getPositions));
router.post("/positions", asyncHandler(TeamController.createPosition));

export default router;
