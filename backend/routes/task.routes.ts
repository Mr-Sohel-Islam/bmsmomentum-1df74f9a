import { Router } from "express";
import { TaskController } from "../controllers/task.controller";
import { asyncHandler } from "../utils/response";
import { requireAuth, requirePermission } from "../middleware/auth.middleware";

const router = Router();

router.get("/tasks", requireAuth, requirePermission("tasks:read"), asyncHandler(TaskController.getTasks));
router.get("/tasks/:id", requireAuth, requirePermission("tasks:read"), asyncHandler(TaskController.getTaskById));
router.post("/tasks", requireAuth, requirePermission("tasks:create"), asyncHandler(TaskController.createTask));
router.put("/tasks/:id", requireAuth, requirePermission("tasks:update"), asyncHandler(TaskController.updateTask));
router.delete("/tasks/:id", requireAuth, requirePermission("tasks:delete"), asyncHandler(TaskController.deleteTask));

router.post("/tasks/bulk-assign", requireAuth, requirePermission("tasks:bulk"), asyncHandler(TaskController.bulkAssign));
router.post("/tasks/bulk-status", requireAuth, requirePermission("tasks:bulk"), asyncHandler(TaskController.bulkUpdateStatus));
router.post("/tasks/bulk-delete", requireAuth, requirePermission("tasks:bulk"), asyncHandler(TaskController.bulkDelete));

router.get("/tasks/:id/comments", requireAuth, requirePermission("tasks:read"), asyncHandler(TaskController.getComments));
router.post("/tasks/:id/comments", requireAuth, requirePermission("tasks:create"), asyncHandler(TaskController.addComment));

router.get("/sprints", requireAuth, requirePermission("tasks:read"), asyncHandler(TaskController.getSprints));
router.post("/sprints", requireAuth, requirePermission("tasks:create"), asyncHandler(TaskController.createSprint));

router.get("/epics", requireAuth, requirePermission("tasks:read"), asyncHandler(TaskController.getEpics));
router.post("/epics", requireAuth, requirePermission("tasks:create"), asyncHandler(TaskController.createEpic));

router.get("/stories", requireAuth, requirePermission("tasks:read"), asyncHandler(TaskController.getStories));
router.post("/stories", requireAuth, requirePermission("tasks:create"), asyncHandler(TaskController.createStory));

export default router;
