import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../db";
import { crypto } from "../utils";

export interface ApprovalWorkflow {
  id: string;
  name: string;
  entity_type?: string;
  description: string | null;
  active: boolean;
  created_at?: string;
  steps?: ApprovalStep[];
}

export interface ApprovalStep {
  id: string;
  workflow_id: string;
  step_order: number;
  approver_type: string;
  approver_role?: string | null;
  approver_ref?: string | null;
  approver_id: string | null;
  created_at?: string;
}

export interface ApprovalRequest {
  id: string;
  workflow_id: string;
  requester_id: string;
  entity_type?: string;
  entity_id?: string;
  title: string;
  description: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  current_step_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApprovalAction {
  id: string;
  request_id: string;
  approver_id: string;
  step_order: number;
  decision: "approved" | "rejected";
  note?: string | null;
  created_at?: string;
}

export class ApprovalModel {
  static async findAllWorkflows(): Promise<ApprovalWorkflow[]> {
    const [workflows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM approval_workflows ORDER BY created_at DESC",
    );
    const [steps] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM approval_steps ORDER BY step_order ASC",
    );

    return workflows.map((w) => ({
      ...w,
      active: Boolean(w.active),
      steps: (steps as ApprovalStep[]).filter((s) => s.workflow_id === w.id),
    })) as ApprovalWorkflow[];
  }

  static async findWorkflowById(id: string): Promise<ApprovalWorkflow | null> {
    const [workflows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM approval_workflows WHERE id = ?",
      [id],
    );
    if (!workflows[0]) return null;
    const [steps] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM approval_steps WHERE workflow_id = ? ORDER BY step_order ASC",
      [id],
    );
    return {
      ...workflows[0],
      active: Boolean(workflows[0].active),
      steps: steps as ApprovalStep[],
    } as ApprovalWorkflow;
  }

  static async createWorkflow(
    name: string,
    description: string | null,
    entityType = "task",
    active = true,
  ): Promise<ApprovalWorkflow> {
    const id = crypto.randomUUID();
    await pool.query(
      "INSERT INTO approval_workflows (id, name, description, entity_type, active) VALUES (?, ?, ?, ?, ?)",
      [id, name, description || null, entityType, active ? 1 : 0],
    );
    const workflow = await this.findWorkflowById(id);
    return workflow!;
  }

  static async updateWorkflow(
    id: string,
    updates: { name?: string; description?: string | null; active?: boolean },
  ): Promise<ApprovalWorkflow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push("description = ?");
      values.push(updates.description);
    }
    if (updates.active !== undefined) {
      fields.push("active = ?");
      values.push(updates.active ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(id);
      await pool.query(`UPDATE approval_workflows SET ${fields.join(", ")} WHERE id = ?`, values);
    }
    return this.findWorkflowById(id);
  }

  static async deleteWorkflow(id: string): Promise<boolean> {
    await pool.query("DELETE FROM approval_steps WHERE workflow_id = ?", [id]);
    const [res] = await pool.query<ResultSetHeader>("DELETE FROM approval_workflows WHERE id = ?", [
      id,
    ]);
    return res.affectedRows > 0;
  }

  static async addStep(
    workflowId: string,
    stepOrder: number,
    approverType: string,
    approverRef: string | null,
    approverId: string | null,
  ): Promise<ApprovalStep> {
    const id = crypto.randomUUID();
    await pool.query(
      "INSERT INTO approval_steps (id, workflow_id, step_order, approver_type, approver_ref, approver_id) VALUES (?, ?, ?, ?, ?, ?)",
      [id, workflowId, stepOrder, approverType, approverRef || null, approverId || null],
    );
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM approval_steps WHERE id = ?", [
      id,
    ]);
    return rows[0] as ApprovalStep;
  }

  static async deleteStep(stepId: string): Promise<boolean> {
    const [res] = await pool.query<ResultSetHeader>("DELETE FROM approval_steps WHERE id = ?", [
      stepId,
    ]);
    return res.affectedRows > 0;
  }

  static async findAllRequests(): Promise<ApprovalRequest[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM approval_requests ORDER BY created_at DESC",
    );
    return rows as ApprovalRequest[];
  }

  static async createRequest(
    data: Omit<
      ApprovalRequest,
      "id" | "status" | "current_step_order" | "created_at" | "updated_at"
    >,
  ): Promise<ApprovalRequest> {
    const id = crypto.randomUUID();
    await pool.query(
      "INSERT INTO approval_requests (id, workflow_id, requester_id, entity_type, entity_id, title, description, status, current_step, current_step_order) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1, 1)",
      [
        id,
        data.workflow_id,
        data.requester_id,
        data.entity_type || "task",
        data.entity_id || id,
        data.title || "Approval Request",
        data.description || null,
      ],
    );
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM approval_requests WHERE id = ?",
      [id],
    );
    return rows[0] as ApprovalRequest;
  }

  static async recordAction(
    requestId: string,
    approverId: string,
    stepOrder: number,
    decision: "approved" | "rejected",
    note?: string | null,
  ): Promise<ApprovalAction> {
    const id = crypto.randomUUID();
    await pool.query(
      "INSERT INTO approval_actions (id, request_id, approver_id, step_order, decision, note) VALUES (?, ?, ?, ?, ?, ?)",
      [id, requestId, approverId, stepOrder, decision, note || null],
    );
    if (decision === "rejected") {
      await pool.query("UPDATE approval_requests SET status = 'rejected' WHERE id = ?", [
        requestId,
      ]);
    } else {
      await pool.query(
        "UPDATE approval_requests SET current_step = current_step + 1, current_step_order = current_step_order + 1 WHERE id = ?",
        [requestId],
      );
    }
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM approval_actions WHERE id = ?",
      [id],
    );
    return rows[0] as ApprovalAction;
  }
}
