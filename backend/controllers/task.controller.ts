import { Request, Response } from "express";
import { TaskModel } from "../models/task.model";
import { sendSuccess, AppError } from "../utils/response";

export class TaskController {
  static async getTasks(req: Request, res: Response) {
    const tasks = await TaskModel.findAllTasks();
    return sendSuccess(res, tasks);
  }

  static async getTaskById(req: Request, res: Response) {
    const id = req.params.id as string;
    const task = await TaskModel.findTaskById(id);
    if (!task) {
      throw new AppError("Task not found", 404);
    }
    return sendSuccess(res, task);
  }

  static async createTask(req: Request, res: Response) {
    const {
      title,
      description,
      sprint_id,
      epic_id,
      story_id,
      assignee_id,
      reporter_id,
      status,
      priority,
      points,
      due_date,
    } = req.body;
    if (!title) {
      throw new AppError("Task title is required", 400);
    }
    const task = await TaskModel.createTask({
      title,
      description: description || null,
      sprint_id: sprint_id || null,
      epic_id: epic_id || null,
      story_id: story_id || null,
      assignee_id: assignee_id || null,
      reporter_id: reporter_id || null,
      status: status || "backlog",
      priority: priority || "medium",
      points: Number(points) || 0,
      due_date: due_date || null,
    });
    return sendSuccess(res, task, "Task created", 201);
  }

  static async updateTask(req: Request, res: Response) {
    const id = req.params.id as string;
    const task = await TaskModel.updateTask(id, req.body);
    if (!task) {
      throw new AppError("Task not found", 404);
    }
    return sendSuccess(res, task, "Task updated");
  }

  static async deleteTask(req: Request, res: Response) {
    const id = req.params.id as string;
    const deleted = await TaskModel.deleteTask(id);
    if (!deleted) {
      throw new AppError("Task not found", 404);
    }
    return sendSuccess(res, { id }, "Task deleted");
  }

  static async bulkAssign(req: Request, res: Response) {
    const { ids, assignee_id, team_id } = req.body;
    if (!Array.isArray(ids)) {
      throw new AppError("Task IDs array is required", 400);
    }
    const count = await TaskModel.bulkAssign(ids, assignee_id, team_id);
    return sendSuccess(res, { count }, `${count} tasks updated`);
  }

  static async bulkUpdateStatus(req: Request, res: Response) {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !status) {
      throw new AppError("Task IDs array and status are required", 400);
    }
    const count = await TaskModel.bulkUpdateStatus(ids, status);
    return sendSuccess(res, { count }, `${count} tasks status updated`);
  }

  static async bulkDelete(req: Request, res: Response) {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      throw new AppError("Task IDs array is required", 400);
    }
    const count = await TaskModel.bulkDelete(ids);
    return sendSuccess(res, { count }, `${count} tasks deleted`);
  }

  static async getComments(req: Request, res: Response) {
    const id = req.params.id as string;
    const comments = await TaskModel.findCommentsByTaskId(id);
    return sendSuccess(res, comments);
  }

  static async addComment(req: Request, res: Response) {
    const id = req.params.id as string;
    const { body, user_id } = req.body;
    const authorId = req.user?.id || user_id || "anonymous";
    if (!body) {
      throw new AppError("Comment body is required", 400);
    }
    const comment = await TaskModel.addComment(id, authorId, body);
    return sendSuccess(res, comment, "Comment added", 201);
  }

  static async getSprints(req: Request, res: Response) {
    const sprints = await TaskModel.findAllSprints();
    return sendSuccess(res, sprints);
  }

  static async createSprint(req: Request, res: Response) {
    const { name, goal, start_date, end_date, status } = req.body;
    if (!name) {
      throw new AppError("Sprint name is required", 400);
    }
    const sprint = await TaskModel.createSprint({
      name,
      goal: goal || null,
      start_date: start_date || null,
      end_date: end_date || null,
      status: status || "planning",
    });
    return sendSuccess(res, sprint, "Sprint created", 201);
  }

  static async getEpics(req: Request, res: Response) {
    const epics = await TaskModel.findAllEpics();
    return sendSuccess(res, epics);
  }

  static async createEpic(req: Request, res: Response) {
    const { title, description, status } = req.body;
    if (!title) {
      throw new AppError("Epic title is required", 400);
    }
    const epic = await TaskModel.createEpic({
      title,
      description: description || null,
      status: status || "open",
    });
    return sendSuccess(res, epic, "Epic created", 201);
  }

  static async getStories(req: Request, res: Response) {
    const stories = await TaskModel.findAllStories();
    return sendSuccess(res, stories);
  }

  static async createStory(req: Request, res: Response) {
    const { epic_id, title, description, points, status } = req.body;
    if (!title) {
      throw new AppError("Story title is required", 400);
    }
    const story = await TaskModel.createStory({
      epic_id: epic_id || null,
      title,
      description: description || null,
      points: Number(points) || 0,
      status: status || "backlog",
    });
    return sendSuccess(res, story, "Story created", 201);
  }
}
