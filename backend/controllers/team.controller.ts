import { Request, Response } from "express";
import { TeamModel } from "../models/team.model";
import { sendSuccess, AppError } from "../utils/response";

export class TeamController {
  static async getTeams(req: Request, res: Response) {
    const teams = await TeamModel.findAllTeams();
    return sendSuccess(res, teams);
  }

  static async createTeam(req: Request, res: Response) {
    const { name, description, lead_id } = req.body;
    if (!name) {
      throw new AppError("Team name is required", 400);
    }
    const team = await TeamModel.createTeam(name, description || null, lead_id || null);
    return sendSuccess(res, team, "Team created", 201);
  }

  static async updateTeam(req: Request, res: Response) {
    const { id } = req.params;
    const team = await TeamModel.updateTeam(id, req.body);
    if (!team) {
      throw new AppError("Team not found", 404);
    }
    return sendSuccess(res, team, "Team updated");
  }

  static async deleteTeam(req: Request, res: Response) {
    const { id } = req.params;
    const deleted = await TeamModel.deleteTeam(id);
    if (!deleted) {
      throw new AppError("Team not found", 404);
    }
    return sendSuccess(res, { id }, "Team deleted");
  }

  static async getTeamMembers(req: Request, res: Response) {
    const { id } = req.params;
    const members = await TeamModel.getTeamMembers(id);
    return sendSuccess(res, members);
  }

  static async addTeamMember(req: Request, res: Response) {
    const { id } = req.params;
    const { user_id, role } = req.body;
    if (!user_id) {
      throw new AppError("user_id is required", 400);
    }
    const member = await TeamModel.addTeamMember(id, user_id, role || "member");
    return sendSuccess(res, member, "Team member added", 201);
  }

  static async removeTeamMember(req: Request, res: Response) {
    const { id, userId } = req.params;
    const removed = await TeamModel.removeTeamMember(id, userId);
    if (!removed) {
      throw new AppError("Member or team not found", 404);
    }
    return sendSuccess(res, { team_id: id, user_id: userId }, "Team member removed");
  }

  static async getPositions(req: Request, res: Response) {
    const positions = await TeamModel.findAllPositions();
    return sendSuccess(res, positions);
  }

  static async createPosition(req: Request, res: Response) {
    const { title, department, description } = req.body;
    if (!title) {
      throw new AppError("Position title is required", 400);
    }
    const position = await TeamModel.createPosition(title, department || null, description || null);
    return sendSuccess(res, position, "Position created", 201);
  }
}
