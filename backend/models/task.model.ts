import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../db";
import { crypto } from "../utils";

export interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "planning" | "active" | "completed";
  created_at?: string;
}

export interface Epic {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "completed";
  created_at?: string;
}

export interface Story {
  id: string;
  epic_id: string | null;
  title: string;
  description: string | null;
  points: number;
  status: "backlog" | "todo" | "in_progress" | "done";
  created_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  sprint_id: string | null;
  epic_id: string | null;
  story_id: string | null;
  assignee_id: string | null;
  reporter_id: string | null;
  status: "backlog" | "todo" | "in_progress" | "in_review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  points: number;
  due_date: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at?: string;
}

export class TaskModel {
  static async findAllTasks(): Promise<Task[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM tasks ORDER BY created_at DESC",
    );
    return rows as Task[];
  }

  static async findTaskById(id: string): Promise<Task | null> {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM tasks WHERE id = ?", [id]);
    return (rows[0] as Task) || null;
  }

  static async createTask(data: Omit<Task, "id" | "created_at" | "updated_at">): Promise<Task> {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO tasks (id, title, description, sprint_id, epic_id, story_id, assignee_id, reporter_id, status, priority, points, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.title,
        data.description || null,
        data.sprint_id || null,
        data.epic_id || null,
        data.story_id || null,
        data.assignee_id || null,
        data.reporter_id || null,
        data.status || "backlog",
        data.priority || "medium",
        data.points || 0,
        data.due_date || null,
      ],
    );
    const task = await this.findTaskById(id);
    return task!;
  }

  static async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const current = await this.findTaskById(id);
    if (!current) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    const allowedKeys: (keyof Task)[] = [
      "title",
      "description",
      "sprint_id",
      "epic_id",
      "story_id",
      "assignee_id",
      "reporter_id",
      "status",
      "priority",
      "points",
      "due_date",
    ];

    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    if (updates.status === "done") {
      fields.push("completed_at = CURRENT_TIMESTAMP");
    }

    if (fields.length > 0) {
      values.push(id);
      await pool.query(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`, values);
    }

    return this.findTaskById(id);
  }

  static async deleteTask(id: string): Promise<boolean> {
    const [res] = await pool.query<ResultSetHeader>("DELETE FROM tasks WHERE id = ?", [id]);
    return res.affectedRows > 0;
  }

  static async bulkAssign(
    ids: string[],
    assigneeId?: string | null,
    teamId?: string | null,
  ): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    const fields: string[] = [];
    const values: unknown[] = [];
    if (assigneeId !== undefined) {
      fields.push("assignee_id = ?");
      values.push(assigneeId);
    }
    if (teamId !== undefined) {
      fields.push("team_id = ?");
      values.push(teamId);
    }
    if (fields.length === 0) return 0;

    const placeholders = ids.map(() => "?").join(", ");
    values.push(...ids);

    const [res] = await pool.query<ResultSetHeader>(
      `UPDATE tasks SET ${fields.join(", ")} WHERE id IN (${placeholders})`,
      values,
    );
    return res.affectedRows;
  }

  static async bulkUpdateStatus(ids: string[], status: string): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    const placeholders = ids.map(() => "?").join(", ");
    const isDone = status === "done";

    const [res] = await pool.query<ResultSetHeader>(
      `UPDATE tasks SET status = ? ${isDone ? ", completed_at = CURRENT_TIMESTAMP" : ""} WHERE id IN (${placeholders})`,
      [status, ...ids],
    );
    return res.affectedRows;
  }

  static async bulkDelete(ids: string[]): Promise<number> {
    if (!ids || ids.length === 0) return 0;
    const placeholders = ids.map(() => "?").join(", ");
    const [res] = await pool.query<ResultSetHeader>(
      `DELETE FROM tasks WHERE id IN (${placeholders})`,
      ids,
    );
    return res.affectedRows;
  }

  static async findCommentsByTaskId(
    taskId: string,
  ): Promise<(TaskComment & { author_name?: string })[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT c.id, c.task_id, COALESCE(c.author_id, c.user_id) as author_id, COALESCE(c.body, c.comment) as body, c.created_at, p.full_name as author_name
       FROM task_comments c
       LEFT JOIN profiles p ON p.id = COALESCE(c.author_id, c.user_id)
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC`,
      [taskId],
    );
    return rows as (TaskComment & { author_name?: string })[];
  }

  static async addComment(taskId: string, userId: string, body: string): Promise<TaskComment> {
    const id = crypto.randomUUID();
    await pool.query(
      "INSERT INTO task_comments (id, task_id, author_id, user_id, body, comment) VALUES (?, ?, ?, ?, ?, ?)",
      [id, taskId, userId, userId, body, body],
    );
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM task_comments WHERE id = ?", [
      id,
    ]);
    return rows[0] as TaskComment;
  }

  static async findAllSprints(): Promise<Sprint[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM sprints ORDER BY created_at DESC",
    );
    return rows as Sprint[];
  }

  static async createSprint(data: Omit<Sprint, "id" | "created_at">): Promise<Sprint> {
    const id = crypto.randomUUID();
    await pool.query(
      "INSERT INTO sprints (id, name, goal, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)",
      [
        id,
        data.name,
        data.goal || null,
        data.start_date || null,
        data.end_date || null,
        data.status || "planning",
      ],
    );
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM sprints WHERE id = ?", [id]);
    return rows[0] as Sprint;
  }

  static async findAllEpics(): Promise<Epic[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM epics ORDER BY created_at DESC",
    );
    return rows as Epic[];
  }

  static async createEpic(data: Omit<Epic, "id" | "created_at">): Promise<Epic> {
    const id = crypto.randomUUID();
    await pool.query("INSERT INTO epics (id, title, description, status) VALUES (?, ?, ?, ?)", [
      id,
      data.title,
      data.description || null,
      data.status || "open",
    ]);
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM epics WHERE id = ?", [id]);
    return rows[0] as Epic;
  }

  static async findAllStories(): Promise<Story[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM stories ORDER BY created_at DESC",
    );
    return rows as Story[];
  }

  static async createStory(data: Omit<Story, "id" | "created_at">): Promise<Story> {
    const id = crypto.randomUUID();
    await pool.query(
      "INSERT INTO stories (id, epic_id, title, description, points, status) VALUES (?, ?, ?, ?, ?, ?)",
      [
        id,
        data.epic_id || null,
        data.title,
        data.description || null,
        data.points || 0,
        data.status || "backlog",
      ],
    );
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM stories WHERE id = ?", [id]);
    return rows[0] as Story;
  }
}
