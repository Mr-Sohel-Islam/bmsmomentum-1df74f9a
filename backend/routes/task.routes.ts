import { Router } from "express";
import { TaskController } from "../controllers/task.controller";
import { asyncHandler } from "../utils/response";

const router = Router();

router.get("/tasks", asyncHandler(TaskController.getTasks));
router.get("/tasks/:id", asyncHandler(TaskController.getTaskById));
router.post("/tasks", asyncHandler(TaskController.createTask));
router.put("/tasks/:id", asyncHandler(TaskController.updateTask));
router.delete("/tasks/:id", asyncHandler(TaskController.deleteTask));

router.post("/tasks/bulk-assign", asyncHandler(TaskController.bulkAssign));
router.post("/tasks/bulk-status", asyncHandler(TaskController.bulkUpdateStatus));
router.post("/tasks/bulk-delete", asyncHandler(TaskController.bulkDelete));

router.get("/tasks/:id/comments", asyncHandler(TaskController.getComments));
router.post("/tasks/:id/comments", asyncHandler(TaskController.addComment));

router.get("/sprints", asyncHandler(TaskController.getSprints));
router.post("/sprints", asyncHandler(TaskController.createSprint));

router.get("/epics", asyncHandler(TaskController.getEpics));
router.post("/epics", asyncHandler(TaskController.createEpic));

router.get("/stories", asyncHandler(TaskController.getStories));
router.post("/stories", asyncHandler(TaskController.createStory));

export default router;
