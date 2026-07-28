import { Request, Response } from "express";
import { ApprovalModel } from "../models/approval.model";
import { sendSuccess, AppError } from "../utils/response";

export class ApprovalController {
  static async getWorkflows(req: Request, res: Response) {
    const workflows = await ApprovalModel.findAllWorkflows();
    return sendSuccess(res, workflows);
  }

  static async createWorkflow(req: Request, res: Response) {
    const { name, description, entity_type, active } = req.body;
    if (!name) {
      throw new AppError("Workflow name is required", 400);
    }
    const workflow = await ApprovalModel.createWorkflow(
      name,
      description || null,
      entity_type || "task",
      active !== undefined ? Boolean(active) : true,
    );
    return sendSuccess(res, workflow, "Approval workflow created", 201);
  }

  static async updateWorkflow(req: Request, res: Response) {
    const { id } = req.params;
    const workflow = await ApprovalModel.updateWorkflow(id, req.body);
    if (!workflow) {
      throw new AppError("Workflow not found", 404);
    }
    return sendSuccess(res, workflow, "Workflow updated");
  }

  static async deleteWorkflow(req: Request, res: Response) {
    const { id } = req.params;
    const deleted = await ApprovalModel.deleteWorkflow(id);
    if (!deleted) {
      throw new AppError("Workflow not found", 404);
    }
    return sendSuccess(res, { id }, "Workflow deleted");
  }

  static async addStep(req: Request, res: Response) {
    const { id } = req.params;
    const { step_order, approver_type, approver_ref, approver_id } = req.body;
    if (!approver_type) {
      throw new AppError("approver_type is required", 400);
    }
    const stepOrderNum = step_order ? Number(step_order) : 1;
    const step = await ApprovalModel.addStep(
      id,
      stepOrderNum,
      approver_type,
      approver_ref || null,
      approver_id || null,
    );
    return sendSuccess(res, step, "Approval step added", 201);
  }

  static async deleteStep(req: Request, res: Response) {
    const { stepId } = req.params;
    const deleted = await ApprovalModel.deleteStep(stepId);
    if (!deleted) {
      throw new AppError("Step not found", 404);
    }
    return sendSuccess(res, { id: stepId }, "Step deleted");
  }

  static async getRequests(req: Request, res: Response) {
    const requests = await ApprovalModel.findAllRequests();
    return sendSuccess(res, requests);
  }

  static async createRequest(req: Request, res: Response) {
    const { workflow_id, requester_id, entity_type, entity_id, title, description } = req.body;
    const userId = req.user?.id || requester_id;
    if (!workflow_id) {
      throw new AppError("workflow_id is required", 400);
    }
    const requestRecord = await ApprovalModel.createRequest({
      workflow_id,
      requester_id: userId,
      entity_type,
      entity_id,
      title: title || "Approval Request",
      description: description || null,
    });
    return sendSuccess(res, requestRecord, "Approval request submitted", 201);
  }

  static async recordAction(req: Request, res: Response) {
    const { id } = req.params;
    const { approver_id, step_order, decision, note } = req.body;
    const userId = req.user?.id || approver_id;
    if (!decision || !["approved", "rejected"].includes(decision)) {
      throw new AppError("Valid decision ('approved' or 'rejected') is required", 400);
    }
    const action = await ApprovalModel.recordAction(
      id,
      userId,
      Number(step_order) || 1,
      decision,
      note || null,
    );
    return sendSuccess(res, action, `Request ${decision}`);
  }
}
